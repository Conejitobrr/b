'use strict';

const axios = require('axios');

const busquedasActivas = new Map();

module.exports = {
  name: 'imagen',
  aliases: ['img', 'siguiente'],
  category: 'multimedia',
  desc: 'Buscador de imágenes con diagnóstico de errores en consola',

  execute: async ({ sock, msg, remoteJid, args, command, reply }) => {
    
    // ⏩ COMANDO: .siguiente
    if (command === 'siguiente') {
      if (!busquedasActivas.has(remoteJid)) {
        return reply('❌ No hay ninguna búsqueda activa. Usa *.imagen [texto]* primero.');
      }

      const sesion = busquedasActivas.get(remoteJid);
      sesion.currentIndex++; 

      if (sesion.currentIndex >= sesion.images.length) {
        clearTimeout(sesion.timer);
        busquedasActivas.delete(remoteJid);
        return reply('⚠️ Ya vimos todas las imágenes disponibles.');
      }

      clearTimeout(sesion.timer);
      sesion.timer = setTimeout(() => busquedasActivas.delete(remoteJid), 5 * 60 * 1000);

      const imageUrl = sesion.images[sesion.currentIndex];

      try {
        const imgDownload = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 8000 });
        return await sock.sendMessage(remoteJid, {
          image: Buffer.from(imgDownload.data),
          caption: `📸 *Resultado ${sesion.currentIndex + 1} de ${sesion.images.length}*\n🔍 *Búsqueda:* ${sesion.query}`
        }, { quoted: msg });
      } catch (err) {
        return reply('⚠️ La imagen falló al cargar. Escribe *.siguiente* de nuevo para saltarla.');
      }
    }

    // 🔍 COMANDO PRINCIPAL: .imagen / .img
    if (command === 'imagen' || command === 'img') {
      if (!args.length) {
        return reply('❌ Escribe qué imagen deseas buscar.\n📌 *Ejemplo:* .img dragones');
      }

      const query = args.join(' ');
      const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Buscando imágenes de "${query}"..._` }, { quoted: msg });

      try {
        // Conexión directa a una API pública que extrae resultados limpios en formato JSON
        const res = await axios.get(`https://deliriueapi.web.id/api/pinterest?query=${encodeURIComponent(query)}`, { timeout: 10000 });
        
        console.log("LOG API IMAGEN:", res.data); // <-- Esto te mostrará qué responde exactamente el servidor en tu Termux

        const results = res.data?.data || res.data?.resultado;

        if (!results || results.length === 0) {
          await sock.sendMessage(remoteJid, { delete: loadMsg.key });
          return reply('❌ El servidor no arrojó resultados para esta búsqueda.');
        }

        if (busquedasActivas.has(remoteJid)) {
          clearTimeout(busquedasActivas.get(remoteJid).timer);
        }

        const timerDestruccion = setTimeout(() => busquedasActivas.delete(remoteJid), 5 * 60 * 1000);

        busquedasActivas.set(remoteJid, {
          query: query,
          images: results,
          currentIndex: 0,
          timer: timerDestruccion
        });

        const imgDownload = await axios.get(results[0], { responseType: 'arraybuffer', timeout: 8000 });
        
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        await sock.sendMessage(remoteJid, {
          image: Buffer.from(imgDownload.data),
          caption: `📸 *Resultado 1 de ${results.length}*\n🔍 *Búsqueda:* ${query}\n\n💡 _Escribe *.siguiente* para ver otra opción._`
        }, { quoted: msg });

      } catch (err) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        // 🚨 AQUÍ VEREMOS EL ERROR REAL EN TU CONSOLA DE TERMUX
        console.error("❌ ERROR DETALLADO EN COMANDO IMAGEN:", err.message);
        return reply(`❌ Error de conexión: ${err.message}`);
      }
    }
  }
};
