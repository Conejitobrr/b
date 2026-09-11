'use strict';

const axios = require('axios');

module.exports = {
  name: 'letra',
  aliases: ['lyrics', 'cancionletra'],
  category: 'multimedia',
  desc: 'Busca la letra completa de cualquier canción',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (args.length === 0) {
      return reply('❌ Escribe el nombre de la canción.\n📌 *Ejemplo:* .letra Ojitos Lindos');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: '🎶 _Buscando en los cancioneros..._' }, { quoted: msg });

    try {
      // API estable y gratuita para letras de canciones
      const res = await axios.get(`https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`);
      const data = res.data;

      const textoFinal = `🎤 *${data.title}*\n👤 *Artista:* ${data.author}\n\n${data.lyrics}`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      await sock.sendMessage(remoteJid, { text: textoFinal }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // Manejo de error si la canción no existe
      if (err.response && err.response.status === 404) {
        return reply(`❌ No pude encontrar la letra de "${query}". Intenta agregando el nombre del artista.`);
      }
      
      console.log('❌ Error en comando letra:', err.message);
      return reply('❌ Ocurrió un error al buscar la canción.');
    }
  }
};
