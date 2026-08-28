'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const config = require('./config');
const db = require('./lib/database');
const { getBody, normalizeJid, detectPrefix, cleanNumber, getReadableType } = require('./lib/utils');

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
            const isGroup = jid.endsWith('@g.us');
            let type = '📝 Texto';
            let preview = content.text || '';

            if (content.image) { type = '📸 Imagen'; preview = content.caption || '[Imagen]'; }
            else if (content.video) { type = '🎥 Video'; preview = content.caption || '[Video]'; }
            else if (content.audio) { type = '🎵 Audio'; preview = '[Audio]'; }
            else if (content.sticker) { type = '🧩 Sticker'; preview = '[Sticker]'; }
            else if (content.document) { type = '📄 Documento'; preview = content.fileName || '[Documento]'; }

            const labelType = isGroup ? chalk.magenta('👥 GRUPO') : chalk.blue('👤 PRIVADO');

            console.log(chalk.gray(`╭─── 📤 `) + chalk.cyan.bold(`BOT ENVÍA`) + chalk.gray(` ─────────────────────────`));
            console.log(chalk.gray(`│ 🏷️  Destino : `) + labelType + chalk.yellow(` (+${cleanNumber(jid)})`));
            console.log(chalk.gray(`│ 📦  Tipo    : `) + chalk.white(type));
            if (preview) console.log(chalk.gray(`│ 💬  Msg     : `) + chalk.green(String(preview).slice(0, 60).replace(/\n/g, ' ')));
            console.log(chalk.gray(`╰──────────────────────────────────────────\n`));
          }
          const result = await originalSend(jid, content, options);
          resolve(result);
        } catch (err) {
          console.log(chalk.gray(`╭─── ❌ `) + chalk.red.bold(`ERROR ENVÍO`) + chalk.gray(` ───────────────────────`));
          console.log(chalk.gray(`│ ⚠️  Detalle : `) + chalk.red(err?.message || err));
          console.log(chalk.gray(`╰──────────────────────────────────────────\n`));
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

    // 🕵️‍♂️ RECOPILAR METADATOS DEL CHAT Y USUARIO
    let groupName = 'Privado';
    let chatLabel = chalk.blue('👤 PRIVADO');
    let roleLabel = chalk.gray('👤 Usuario');
    let isAdmin = false;

    if (fromGroup) {
      chatLabel = chalk.magenta('👥 GRUPO');
      try {
        const metadata = await sock.groupMetadata(remoteJid);
        groupName = metadata.subject || 'Grupo';
        const admins = metadata.participants
          .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
          .map(p => normalizeJid(p.id));
        isAdmin = admins.includes(sender);
      } catch (e) {
        groupName = 'Grupo Desconocido';
      }
    }

    if (isOwner) roleLabel = chalk.yellow('👑 Owner');
    else if (isAdmin) roleLabel = chalk.cyan('🛡️ Admin');

    const msgType = getReadableType(msg);

    // 📩 LOG DE MENSAJE ENTRANTE
    if (config.debug) {
      console.log(chalk.gray(`╭─── 📥 `) + chalk.green.bold(`MENSAJE ENTRANTE`) + chalk.gray(` ──────────────────`));
      console.log(chalk.gray(`│ 🏷️  Chat    : `) + chatLabel + (fromGroup ? chalk.white(` ${groupName}`) : ''));
      console.log(chalk.gray(`│ 👤  De      : `) + chalk.white(pushName) + chalk.yellow(` (+${senderNumber}) `) + roleLabel);
      console.log(chalk.gray(`│ 📦  Tipo    : `) + chalk.white(msgType));
      if (body) console.log(chalk.gray(`│ 💬  Texto   : `) + chalk.white(String(body).slice(0, 80).replace(/\n/g, ' ')));
      console.log(chalk.gray(`╰──────────────────────────────────────────`));
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
      console.log(chalk.gray(`╭─── ⚡ `) + chalk.yellow.bold(`EJECUTANDO COMANDO`) + chalk.gray(` ────────────────`));
      console.log(chalk.gray(`│ 🚀  Cmd     : `) + chalk.yellow(`${config.prefix}${commandName}`));
      console.log(chalk.gray(`│ 👤  Por     : `) + chalk.white(pushName));
      console.log(chalk.gray(`╰──────────────────────────────────────────`));
    }

    let groupData = null;
    if (fromGroup) {
      groupData = await db.getGroup(remoteJid);
      if (groupData.bot === false && !isOwner && !['config'].includes(cmdKey)) return; 
    }

    const userData = await db.getUser(sender);
    if (userData.banned && !isOwner) return;

    // EJECUCIÓN
    try {
      await plugin.execute({
        sock, msg, remoteJid, sender, botJid, pushName, body, args, commandName, config, db,
        fromGroup, isOwner, isAdmin, groupData, userData,
        reply: (text) => sock.sendMessage(remoteJid, { text: String(text) }, { quoted: msg })
      });
      
      if (!isOwner) await db.addXP(sender, Math.floor(Math.random() * 10) + 5);

      // ✅ LOG DE ÉXITO
      if (config.debug) {
        console.log(chalk.gray(`╭─── ✅ `) + chalk.green.bold(`ÉXITO`) + chalk.gray(` ─────────────────────────────`));
        console.log(chalk.gray(`│ ⚙️  Comando completado sin errores.`));
        console.log(chalk.gray(`╰──────────────────────────────────────────\n`));
      }
      
    } catch (e) {
      // ❌ LOG DE ERROR
      console.log(chalk.gray(`╭─── ❌ `) + chalk.red.bold(`ERROR EN COMANDO`) + chalk.gray(` ──────────────────`));
      console.log(chalk.gray(`│ ⚠️  Detalle : `) + chalk.red(e.message || e));
      console.log(chalk.gray(`╰──────────────────────────────────────────\n`));
      await sock.sendMessage(remoteJid, { text: '❌ Ocurrió un error interno al ejecutar este comando.' }, { quoted: msg });
    }

  } catch (err) {
    console.log(chalk.bgRed.white('\n ❌ ERROR CRÍTICO '), chalk.red(err.message || err));
  }
}

module.exports = { messageHandler, loadPlugins };
