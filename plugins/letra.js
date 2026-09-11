'use strict';

const { Client } = require("genius-lyrics");
const axios = require("axios");

// Inicializamos el cliente principal de Genius
const genius = new Client();

module.exports = {
  name: 'letra',
  aliases: ['lyrics', 'cancionletra'],
  category: 'multimedia',
  desc: 'Busca la letra completa usando un motor híbrido',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (!args.length) {
      return reply('❌ *Uso correcto:* .letra [nombre de la canción]\n📌 *Ejemplo:* .letra baile inolvidable');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Buscando en los servidores: *${query}*..._` }, { quoted: msg });

    try {
      // 🔥 MOTOR PRINCIPAL (Tu código original de genius-lyrics)
      const searches = await genius.songs.search(query);
      
      if (!searches || searches.length === 0) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ No pude encontrar esa canción en los registros de Genius.');
      }

      const mejorResultado = searches[0];
      const lyrics = await mejorResultado.lyrics();
      
      if (!lyrics) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ Encontré la canción, pero la letra aún no ha sido transcrita.');
      }

      const textoFinal = `🎤 *${mejorResultado.title}*\n👤 *Artista:* ${mejorResultado.artist.name}\n\n${lyrics}`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      await sock.sendMessage(remoteJid, { 
        image: { url: mejorResultado.image }, 
        caption: textoFinal 
      }, { quoted: msg });

    } catch (error) {
      console.log("⚠️ Motor 1 (Genius) bloqueado por red local. Activando Motor 2...");

      // 🛡️ MOTOR SECUNDARIO DE RESPALDO (Anti-Bloqueos para Termux)
      try {
        const { data } = await axios.get(`https://lyrist.vercel.app/api/${encodeURIComponent(query)}`);

        if (!data || !data.lyrics) {
           await sock.sendMessage(remoteJid, { delete: loadMsg.key });
           return reply('❌ Ninguno de los dos motores pudo encontrar la letra.');
        }

        const textoFallback = `🎤 *${data.title}*\n👤 *Artista:* ${data.artist}\n\n${data.lyrics}`;
        
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        
        await sock.sendMessage(remoteJid, { 
          image: { url: data.image }, 
          caption: textoFallback 
        }, { quoted: msg });

      } catch (fallbackError) {
        console.error("❌ Error en Motor 2:", fallbackError.message);
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ Los servidores de letras rechazaron la conexión. Intenta de nuevo más tarde.');
      }
    }
  }
};
