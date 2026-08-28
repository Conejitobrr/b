'use strict';

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const pino = require('pino');
const chalk = require('chalk');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const config = require('./config');
const db = require('./lib/database');
let messageHandler; // Se cargará de forma dinámica para evitar errores circulares

const SESSION_DIR = path.resolve(config.sessionPath);

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

const logger = pino({ level: 'silent' });
const store = { contacts: {}, messages: {} };
const processedMessages = new Set();
let restarting = false;

function extractNumber(jid = '') {
  if (!jid) return '';
  try { jid = jidNormalizedUser(jid); } catch {}
  let number = jid.split('@')[0].split(':')[0].replace(/\D/g, '');
  return number.length > 15 ? number.slice(0, 15) : `+${number}`;
}

function getMessageText(msg) {
  const m = msg.message;
  if (!m) return '';
  return m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || m.documentMessage?.caption || '';
}

async function startBot(opts = {}) {
  await db.init();
  messageHandler = require('./handler').messageHandler; // Carga el manejador

  const useCode = opts.method === 'code';
  const phoneNum = opts.phone || null;

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    browser: useCode ? ['Ubuntu', 'Chrome', '20.0.04'] : [config.botName, 'Safari', config.botVersion],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    printQRInTerminal: false,
    emitOwnEvents: true,
    markOnlineOnConnect: false
  });

  if (useCode && phoneNum && !state.creds?.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNum);
        console.log(chalk.cyan('\nCódigo de vinculación:'));
        console.log(chalk.bgCyan.black(`   ${code}   \n`));
      } catch (e) {
        console.log(chalk.red('❌ Error generando código. Verifica el número.'));
      }
    }, 3000);
  }

  sock.ev.on('connection.update', update => {
    const { connection, qr, lastDisconnect } = update;

    if (qr && !useCode) {
      console.log(chalk.yellow('\nEscanea el código QR con tu WhatsApp:\n'));
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      restarting = false;
      console.log(chalk.green('\n✅ BOT CONECTADO EXITOSAMENTE'));
      console.log(chalk.green('📱 Número:'), extractNumber(sock.user?.id || ''));
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output?.statusCode : 0;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;

      if (shouldReconnect && config.autoReconnect) {
        if (restarting) return;
        restarting = true;
        console.log(chalk.yellow('⚠️ Reconectando en 3 segundos...'));
        setTimeout(() => startBot({ method: 'saved' }), config.reconnectDelay);
      } else {
        console.log(chalk.red('❌ Sesión cerrada permanentemente.'));
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('contacts.upsert', contacts => {
    for (const c of contacts || []) {
      if (!c.id) continue;
      const jid = jidNormalizedUser(c.id);
      store.contacts[jid] = { id: jid, name: c.name || c.notify || '', number: extractNumber(jid) };
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      const msgId = msg.key?.id;
      if (!msgId || processedMessages.has(msgId)) continue;
      
      processedMessages.add(msgId);
      setTimeout(() => processedMessages.delete(msgId), 60000); // Libera memoria al minuto

      try {
        if (!msg.message || !msg.key?.remoteJid || msg.key.remoteJid === 'status@broadcast') continue;

        msg.bodyText = getMessageText(msg);
        
        // Deriva el mensaje al handler principal
        if (messageHandler) {
          await messageHandler(sock, msg, store);
        }
      } catch (e) {
        console.log(chalk.red('❌ Error procesando mensaje:'), e);
      }
    }
  });

  return sock;
}

module.exports = { startBot };
