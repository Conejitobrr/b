'use strict';

module.exports = {
  name: 'menu',
  aliases: ['help', 'ayuda', 'comandos'],
  category: 'utilidad',
  desc: 'Muestra el menú principal de comandos',
  
  execute: async ({ sock, msg, remoteJid, pushName, config }) => {
    const menuText = `╭─❖「 *SIRIUS BOT PRO* 」
│ 👋 Hola, *${pushName}*
│ ⚙️ Prefijo: [ *${config.prefix}* ]
╰─────────────────

*🛠️ UTILIDAD*
✦ ${config.prefix}ping - Ver latencia
✦ ${config.prefix}menu - Ver este menú

*⚙️ GRUPOS*
✦ ${config.prefix}enable - Activar bot
✦ ${config.prefix}disable - Apagar bot

_El bot está siendo refactorizado para máxima velocidad._ 🚀`;

    await sock.sendMessage(
      remoteJid, 
      { text: menuText }, 
      { quoted: msg }
    );
  }
};
