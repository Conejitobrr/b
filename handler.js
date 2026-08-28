'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const config = require('./config');
const db = require('./lib/database');
const { getBody, normalizeJid, detectPrefix, cleanNumber, getGroupAdmins } = require('./lib/utils');

// ==========================================
// 🛡️ SISTEMA DE COLA ANTI-OVERLIMIT 
// ==========================================
const sendQueue = [];
let isSending = false;
const SEND_DELAY = 1000; // 1 segundo exacto de espera entre mensajes

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
            console.log(chalk.green('\n📤 BOT ENVÍA MENSAJE A:'), chalk.cyan(jid));
          }
          const result = await originalSend(jid, content, options);
          resolve(result);
        } catch (err) {
          console.log(chalk.red('❌ Error enviando:'), err?.message || err);
          reject(err);
        }
      });
      processSendQueue();
    });
  };
}

// ==========================================
// 🧩 CARGA DE PLUGINS PROFESIONAL
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
      delete require.cache[require.resolve(filepath)]; // Hot-reload manual
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
      console.log(chalk.red(`❌ Error cargando plugin ${file}:`), err?.message);
    }
  }
  console.log(chalk.green(`♻️ Plugins cargados: ${count} comandos estructurados listos`));
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

    if (config.debug) {
      console.log(chalk.gray('───────────────────────────────────────'));
      console.log(chalk.white('👤 De   :'), chalk.green(pushName), chalk.yellow(`(+${senderNumber})`));
      console.log(chalk.white('💬 Msg  :'), chalk.white(String(body).slice(0, 100)));
    }

    if (!body) return;

    const parsed = detectPrefix(body, config.prefix);
    if (!parsed) return;

    const args = parsed.body.trim().split(/\s+/).filter(Boolean);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    // Buscar comando por nombre o por alias
    const cmdKey = aliases.has(commandName) ? aliases.get(commandName) : commandName;
    const plugin = commands.get(cmdKey);
    
    if (!plugin) return;

    // Control de Base de Datos
    let groupData = null;
    if (fromGroup) {
      groupData = await db.getGroup(remoteJid);
      // Apagado absoluto del bot en grupos (excepto para dueños)
      if (groupData.bot === false && !isOwner && !['enable', 'disable'].includes(cmdKey)) return; 
    }

    const userData = await db.getUser(sender);
    if (userData.banned && !isOwner) return;

    // Ejecutar el Plugin
    try {
      await plugin.execute({
        sock, msg, remoteJid, sender, botJid, pushName, body, args, commandName, config, db,
        fromGroup, isOwner, groupData, userData,
        reply: (text) => sock.sendMessage(remoteJid, { text: String(text) }, { quoted: msg })
      });
      
      // Sumar XP automático por uso
      if (!isOwner) await db.addXP(sender, Math.floor(Math.random() * 10) + 5);
      
    } catch (e) {
      console.log(chalk.red(`❌ Error en comando ${commandName}:`), e);
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error al ejecutar este comando.' }, { quoted: msg });
    }

  } catch (err) {
    console.log(chalk.red('❌ Error crítico en handler:'), err);
  }
}

module.exports = { messageHandler, loadPlugins };
