'use strict';

const { performance } = require('perf_hooks');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randIP() {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

function getRandomValue(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTarget(msg, sender) {
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const quotedSender = msg.message?.extendedTextMessage?.contextInfo?.participant || null;
  
  if (mentioned[0]) return mentioned[0];
  if (quotedSender) return quotedSender;
  return sender;
}

module.exports = {
  name: 'doxear',
  aliases: ['doxxeo', 'doxeo', 'dox'],
  category: 'diversión',
  desc: 'Simula un doxeo falso con datos aleatorios y barra de carga',

  execute: async ({ sock, msg, remoteJid, sender, db, reply }) => {
    try {
      const start = performance.now();

      // 🎯 Obtener objetivo (Mención > Reply > Uno mismo)
      const target = getTarget(msg, sender);
      const nameTag = target ? `@${target.split('@')[0]}` : 'Desconocido';

      const ipAddress = randIP();
      const fakeData = {
        ip: ipAddress,
        isp: getRandomValue(['Ucom Universal', 'ISP Co', 'Internet Solutions Inc', 'Movistar Fiber', 'Claro Peru']),
        mac: Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).toUpperCase()).join(':'),
        dns: randIP(),
        wan: randIP(),
        gateway: `192.${Math.floor(Math.random() * 256)}.0.1`,
        deviceVendor: getRandomValue(['WIN32-X', 'SecureTech Device', 'Android Mobile', 'Apple iPhone']),
        connectionType: getRandomValue(['TPLINK COMPANY', 'ISP Connect', 'Home Fiber Network']),
        http: `192.168.${Math.floor(Math.random() * 256)}.1:433-->92.28.211.234:80`,
        tcp1: `192.168.${Math.floor(Math.random() * 256)}.682-->92.28.211.62227.7`,
        externalMac: Array.from({ length: 6 }, () => Math.floor(Math.random() * 256).toString(16).toUpperCase()).join(':'),
        modemJumps: Math.floor(Math.random() * 90) + 10
      };

      const end = performance.now();
      const executionTime = (end - start > 1000 ? (end - start) / 1000 : 0.42).toFixed(2);

      const doxeoText = `*[ ✔ ] Persona doxxeada con éxito.*

*—◉ Doxxeo realizado en:*
*◉ ${executionTime} segundos.*

*—◉ Resultados obtenidos:*

*Nombre:* ${nameTag}
*Ip:* ${fakeData.ip}
*ISP:* ${fakeData.isp}
*MAC:* ${fakeData.mac}
*DNS:* ${fakeData.dns}
*WAN:* ${fakeData.wan}
*GATEWAY:* ${fakeData.gateway}
*DEVICE:* ${fakeData.deviceVendor}
*CONNECTION:* ${fakeData.connectionType}
*HTTP:* ${fakeData.http}
*TCP:* ${fakeData.tcp1}
*MAC EXT:* ${fakeData.externalMac}
*MODEM JUMPS:* ${fakeData.modemJumps}`;

      const loading = [
        "《 █▒▒▒▒▒▒▒▒▒▒▒》10%",
        "《 ████▒▒▒▒▒▒▒▒》30%",
        "《 ███████▒▒▒▒▒》50%",
        "《 ██████████▒▒》80%",
        "《 ████████████》100%"
      ];

      // 🚀 Enviar mensaje inicial
      const sent = await sock.sendMessage(remoteJid, {
        text: '*☠ ¡¡INICIANDO DOXXEO!! ☠*'
      }, { quoted: msg });

      // ⏳ Animación de barra de carga fluida
      for (let i = 0; i < loading.length; i++) {
        await sleep(800);
        await sock.sendMessage(remoteJid, {
          text: loading[i],
          edit: sent.key
        });
      }

      // 🎯 Enviar resultado final editando el mensaje con mención azul real
      await sock.sendMessage(remoteJid, {
        text: doxeoText,
        edit: sent.key,
        mentions: [target]
      });

      // ⭐ Bono de XP al usuario que ejecuta la broma
      if (db && typeof db.getUser === 'function') {
        const userData = await db.getUser(sender);
        if (userData) {
          userData.xp = (userData.xp || 0) + Math.floor(Math.random() * 11) + 5;
          if (userData.save) await userData.save();
        }
      }

    } catch (err) {
      console.log('❌ Error en plugin doxear:', err?.message || err);
      return reply('❌ Ocurrió un error al ejecutar el simulador de doxeo.');
    }
  }
};
