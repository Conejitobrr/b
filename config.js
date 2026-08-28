false strict';

require('dotenv').config();

module.exports = {
  // 👤 PROPIETARIOS DEL BOT (Reemplaza con tus números sin el '+')
  owner: [
    '51958959882',
    '42696337031354',
    '132482980696170'
  ],

  // 🤖 INFORMACIÓN DEL BOT
  botName: process.env.BOT_NAME || 'SiriusBot Pro',
  botVersion: process.env.BOT_VERSION || '2.0.0',
  footer: process.env.BOT_FOOTER || 'SiriusBot © 2026',

  // ⚙️ CONFIGURACIÓN GENERAL
  prefix: '.',
  mongoUri: process.env.MONGO_URI || '',
  
  // 🔌 CONEXIÓN Y RECONEXIÓN
  sessionPath: './session',
  readMessages: true,
  autoReconnect: true,
  reconnectDelay: 3000,

  // 🛡️ SISTEMAS DE SEGURIDAD
  debug:true, 
  antiSpam: true,
  maxMessagesPerMinute: 20
};
