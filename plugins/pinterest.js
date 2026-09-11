'use strict';

const axios = require('axios');

module.exports = {
  name: 'pinterest',
  aliases: ['pin'],
  category: 'multimedia',
  desc: 'Busca y descarga imágenes en alta calidad de Pinterest',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (!args.length) {
      return reply('❌ Escribe lo que deseas buscar.\n📌 *Ejemplo:* .pinterest autos deportivos neon');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Buscando "${query}" en Pinterest..._` }, { quoted: msg });

    try {
      // Conexión a la API pública de Popcat
      const res = await axios.get(`https://api.popcat.xyz/pinterest?q=${encodeURIComponent(query)}`);
      
      if (!res.data || !res.data.image) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ No se encontraron resultados para esa búsqueda.');
      }

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // Enviar la imagen directamente desde la URL extraída
      await sock.sendMessage(remoteJid, {
        image: { url: res.data.image },
        caption: `📌 *Resultado para:* ${query}`
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      console.error('❌ Error en Pinterest:', err.message);
      return reply('❌ Ocurrió un error de red al conectar con Pinterest.');
    }
  }
};
