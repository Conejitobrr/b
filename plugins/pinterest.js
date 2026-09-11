'use strict';

const axios = require('axios');

module.exports = {
  name: 'pinterest',
  aliases: ['pin'],
  category: 'multimedia',
  desc: 'Buscador de Pinterest con doble motor API',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (!args.length) {
      return reply('❌ Escribe lo que deseas buscar.\n📌 *Ejemplo:* .pinterest perros');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Extrayendo resultados: "${query}"..._` }, { quoted: msg });

    try {
      let imagenes = [];

      // 🚀 MOTOR 1: Itzpire (Especializado en bots de WhatsApp)
      try {
        const res1 = await axios.get(`https://itzpire.com/search/pinterest?query=${encodeURIComponent(query)}`);
        if (res1.data?.data?.length > 0) imagenes = res1.data.data;
      } catch (e) {
        console.log('⚠️ Motor 1 bloqueado. Activando Motor 2...');
      }

      // 🚀 MOTOR 2: Siputzx (Respaldo en caso de caída)
      if (imagenes.length === 0) {
        const res2 = await axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`);
        if (res2.data?.data?.length > 0) imagenes = res2.data.data;
      }

      if (imagenes.length === 0) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ No se encontraron resultados o los servidores están saturados.');
      }

      // Escoger imagen aleatoria y descargar a RAM
      const imagenElegida = imagenes[Math.floor(Math.random() * imagenes.length)];
      const imgDownload = await axios.get(imagenElegida, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      await sock.sendMessage(remoteJid, {
        image: Buffer.from(imgDownload.data),
        caption: `📌 *Pinterest:* ${query}`
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      return reply('❌ Ocurrió un error al descargar la imagen de Pinterest.');
    }
  }
};
