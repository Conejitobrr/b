'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const config = require('./config');
const db = require('./lib/database');
const { getBody, normalizeJid, detectPrefix, cleanNumber, getGroupAdmins } = require('./lib/utils');

// ⏱️ OBTENER HORA FORMATEADA
function getTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
}

// ==========================================
// 🛡️ SISTEMA DE COLA ANTI-OVERLIMIT 
// ==========================================
const sendQueue = [];
let isSending = false;
const SEND_DELAY = 1000; 

async function processSendQueue() {
  if (isSending || sendQueue.length === 0) return;
  isSending = true;

  while (sendQueue.length > 0) {
    const task = sendQueue.shift();
    try { await task(); } catch (err) {}
    await new Promise(resolve => setTimeout(resolve, SEND_DELAY));
  }
  isSending = false;
}

function attachSendLogger(sock) {
  if (sock._loggerAttached) return;
  sock._loggerAttached = true;
  
  const originalSend = sock.sendMessage.bind(sock);

  sock.sendMessage = async (jid, content = {}, options = {}) => {
    return new Promise((resolve, reject) => {
      sendQueue.push(async () => {
        try {
          if (config.debug) {
            const dest = jid.split('@')[0];
            const type = content.text ? 'Texto' : (content.image ? 'Imagen' : 'Multimedia');
            console.log(
              chalk.bgWhite.black(`[${getTime()}]`), 
              chalk.bgBlue.white(' 📤 ENVIANDO '), 
              chalk.cyan(`A: +${dest} | Tipo: ${type}`)
            );
          }
          const result = await originalSend(jid, content, options);
          resolve(result);
        } catch (err) {
          console.log(chalk.bgWhite.black(`[${getTime()}]`), chalk.bgRed.white(' ❌ ERROR ENVÍO '), chalk.red(err?.message || err));
          reject(err);
        }
      });
      processSendQueue();
    });
  };
}

// ==========================================
// 🧩 CARGA DE PLUGINS
// ==========================================
const PLUGINS_DIR = path.join(process.cwd(), 'plugins');
if (!fs.existsSync(PLUGINS_DIR)) fs.mkdirSync(PLUGINS_DIR, { recursive: true });

const commands = new Map();
const aliases = new Map();

function loadPlugins() {
  commands.clear();
  aliases.clear();
  
  const files = fs.readdirSync(PLUGINS_DIR).filter(file => file.endsWith('.js'));
  let count = 0;

  for (const file of files) {
    try {
      const filepath = path.join(PLUGINS_DIR, file);
      delete require.cache[require.resolve(filepath)];
      const plugin = require(filepath);

      if (plugin.name && typeof plugin.execute === 'function') {
        const cmdName = plugin.name.toLowerCase();
        commands.set(cmdName, plugin);
        
        if (Array.isArray(plugin.aliases)) {
          for (const alias of plugin.aliases) {
            aliases.set(alias.toLowerCase(), cmdName);
          }
        }
        count++;
      }
    } catch (err) {
      console.log(chalk.bgRed.white(' ❌ ERROR PLUGIN '), chalk.red(`Fallo en ${file}: ${err?.message}`));
    }
  }
  console.log(chalk.bgGreen.black('\n ♻️ PLUGINS LISTOS '), chalk.green(`${count} comandos estructurados cargados exitosamente.\n`));
}

loadPlugins();

// ==========================================
// ⚡ HANDLER PRINCIPAL
// ==========================================
async function messageHandler(sock, msg, store = {}) {
  try {
    attachSendLogger(sock);
    if (!msg?.message) return;

    const key = msg.key || {};
    const remoteJid = key.remoteJid;
    if (!remoteJid || remoteJid === 'status@broadcast') return;

    const fromGroup = remoteJid.endsWith('@g.us');
    let sender = fromGroup ? key.participant : remoteJid;
    sender = normalizeJid(sender || remoteJid);
    
    const botJid = normalizeJid(sock.user?.id || '');
    const body = getBody(msg);
    const pushName = msg.pushName || 'Usuario';
    const senderNumber = cleanNumber(sender);
    
    const ownerNumbers = Array.isArray(config.owner) ? config.owner.map(n => String(n).replace(/\D/g, '')) : [];
    const isOwner = !!key.fromMe || ownerNumbers.includes(senderNumber);

    // 📩 LOG DE MENSAJE ENTRANTE
    if (config.debug && body) {
      console.log(
        chalk.bgWhite.black(`\n[${getTime()}]`),
        chalk.bgGreen.black(' 📥 MENSAJE '),
        chalk.green(`De: ${pushName} (+${senderNumber})`),
        fromGroup ? chalk.magenta(`[Grupo]`) : chalk.blue(`[Privado]`)
      );
      console.log(chalk.gray(` ↳ 💬 ${String(body).slice(0, 80)}`));
    }

    if (!body) return;

    const parsed = detectPrefix(body, config.prefix);
    if (!parsed) return;

    const args = parsed.body.trim().split(/\s+/).filter(Boolean);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const cmdKey = aliases.has(commandName) ? aliases.get(commandName) : commandName;
    const plugin = commands.get(cmdKey);
    
    if (!plugin) return;

    // ⚡ LOG DE COMANDO DETECTADO
    if (config.debug) {
      console.log(
        chalk.bgWhite.black(`[${getTime()}]`),
        chalk.bgYellow.black(' ⚡ COMANDO '),
        chalk.yellow(`Procesando: ${config.prefix}${commandName}`)
      );
    }

    let groupData = null;
    if (fromGroup) {
      groupData = await db.getGroup(remoteJid);
      if (groupData.bot === false && !isOwner && !['enable', 'disable', 'config'].includes(cmdKey)) return; 
    }

    const userData = await db.getUser(sender);
    if (userData.banned && !isOwner) return;

    // EJECUCIÓN
    try {
      await plugin.execute({
        sock, msg, remoteJid, sender, botJid, pushName, body, args, commandName, config, db,
        fromGroup, isOwner, groupData, userData,
        reply: (text) => sock.sendMessage(remoteJid, { text: String(text) }, { quoted: msg })
      });
      
      if (!isOwner) await db.addXP(sender, Math.floor(Math.random() * 10) + 5);

      // ✅ LOG DE ÉXITO
      if (config.debug) {
        console.log(chalk.bgWhite.black(`[${getTime()}]`), chalk.bgGreen.white(' ✅ ÉXITO '), chalk.green(`Comando ejecutado.`));
      }
      
    } catch (e) {
      // ❌ LOG DE ERROR
      console.log(chalk.bgWhite.black(`[${getTime()}]`), chalk.bgRed.white(' ❌ ERROR COMANDO '), chalk.red(e.message || e));
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error interno al ejecutar este comando.' }, { quoted: msg });
    }

  } catch (err) {
    console.log(chalk.bgRed.white('\n ❌ ERROR CRÍTICO '), chalk.red(err.message || err));
  }
}

module.exports = { messageHandler, loadPlugins };
