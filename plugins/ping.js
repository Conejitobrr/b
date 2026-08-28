'use strict';

module.exports = {
  name: 'ping',
  aliases: ['p', 'pong'],
  category: 'utilidad',
  desc: 'Muestra la latencia y estado del bot',
  
  execute: async ({ sock, msg, remoteJid, reply }) => {
    const start = Date.now();
    await reply('Calculando latencia...');
    const end = Date.now();
    
    const ping = end - start;
    await sock.sendMessage(
      remoteJid, 
      { text: `🏓 *Pong!*\n\n⏱️ Latencia: *${ping}ms*` }, 
      { quoted: msg }
    );
  }
};
