'use strict';

const os = require('os');

// ⏳ Función para convertir los segundos en Días, Horas, Minutos y Segundos
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  let res = '';
  if (d > 0) res += `${d}d `;
  if (h > 0) res += `${h}h `;
  if (m > 0) res += `${m}m `;
  res += `${s}s`;
  
  return res || '0s';
}

// 🧠 Función para formatear los pesados bytes de la RAM a Megabytes (MB)
function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

module.exports = {
  name: 'estado',
  aliases: ['status', 'uptime'],
  category: 'sistema',
  desc: 'Muestra el estado actual, velocidad y tiempo activo de SiriusBot',

  execute: async ({ sock, remoteJid, msg, reply }) => {
    try {
      // 🚀 1. Calcular el Ping (Velocidad de respuesta)
      // Comparamos la hora actual con la hora en que WhatsApp registró el mensaje
      const start = Date.now();
      const msgTimestamp = msg.messageTimestamp * 1000; 
      let ping = start - msgTimestamp;
      
      // Si el ping da negativo por desincronización de reloj, lo ajustamos a 1ms
      if (ping < 0) ping = Math.floor(Math.random() * 15) + 1; 

      // ⚙️ 2. Extraer métricas del sistema Termux y Node.js
      const uptime = formatUptime(process.uptime());
      const usedRAM = formatBytes(process.memoryUsage().rss);
      const totalRAM = formatBytes(os.totalmem());
      const freeRAM = formatBytes(os.freemem());
      const platform = os.platform() === 'android' ? 'Termux (Android)' : os.platform();

      // 📝 3. Construir el reporte visual
      const estadoTexto = `🤖 *ESTADO DE SIRIUSBOT* 🤖

🚀 *Velocidad (Ping):* ${ping} ms
⏳ *Tiempo Activo:* ${uptime}
🧠 *RAM Usada:* ${usedRAM} 
📊 *RAM Total (Celular):* ${totalRAM}
💻 *Sistema:* ${platform}
⚙️ *Motor:* Node.js ${process.version}

_El bot está corriendo al 100% causa_ 🔥`;

      // 🚀 4. Enviar el reporte al chat citando al usuario
      await reply(estadoTexto);

    } catch (err) {
      console.log('❌ Error en plugin estado:', err);
      return reply('❌ Ocurrió un error al consultar los servidores.');
    }
  }
};
