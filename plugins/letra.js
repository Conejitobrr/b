'use strict';

const axios = require('axios');

module.exports = {
  name: 'letra',
  aliases: ['lyrics', 'cancionletra'],
  category: 'multimedia',
  desc: 'Busca la letra de una canción usando el servidor ultra estable de Popcat',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (!args.length) {
      return reply('❌ Escribe el nombre de la canción.\n📌 *Ejemplo:* .letra baile inolvidable');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Buscando letra de: *${query}*..._` }, { quoted: msg });

    try {
      // 🚀 CONEXIÓN DIRECTA A POPCAT (Anti-bloqueos y sin límite de peticiones)
      const res = await axios.get(`https://api.popcat.xyz/lyrics?song=${encodeURIComponent(query)}`);
      const data = res.data;

      // Si la API responde bien pero no encuentra la letra
      if (!data || !data.lyrics) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ Encontré la canción, pero la letra aún no está transcrita.');
      }

      // Armamos la estructura de la respuesta
      const textoFinal = `🎤 *${data.title}*\n👤 *Artista:* ${data.artist}\n\n${data.lyrics}`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // Enviamos la imagen junto con la letra
      await sock.sendMessage(remoteJid, { 
        image: { url: data.image }, 
        caption: textoFinal 
      }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      console.error("❌ Error en comando letra:", error.message);
      
      // Manejo de errores específicos
      if (error.response && error.response.status === 404) {
        return reply('❌ No pude encontrar esa canción. Intenta escribir el nombre junto al del artista (Ej: .letra baile inolvidable bad bunny).');
      }
      
      return reply('❌ Ocurrió un error de conexión al intentar extraer la letra. Intenta de nuevo en unos minutos.');
    }
  }
};
