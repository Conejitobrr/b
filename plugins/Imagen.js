'use strict';

const axios = require('axios');

const busquedasActivas = new Map();

module.exports = {
  name: 'imagen',
  aliases: ['img', 'siguiente'],
  category: 'multimedia',
  desc: 'Busca imágenes en la web y permite navegar entre ellas con .siguiente',

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
        return reply('⚠️ Ya vimos todas las imágenes disponibles de esta búsqueda.');
      }

      clearTimeout(sesion.timer);
      sesion.timer = setTimeout(() => busquedasActivas.delete(remoteJid), 5 * 60 * 1000);

      const imageUrl = sesion.images[sesion.currentIndex];

      try {
        const imgDownload = await axios.get(imageUrl, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } });
        return await sock.sendMessage(remoteJid, {
          image: Buffer.from(imgDownload.data),
          caption: `📸 *Resultado ${sesion.currentIndex + 1} de ${sesion.images.length}*\n🔍 *Búsqueda:* ${sesion.query}\n\n💡 _Escribe *.siguiente* para ver otra._`
        }, { quoted: msg });
      } catch (err) {
        return reply(`⚠️ La imagen #${sesion.currentIndex + 1} falló al cargar.\n\nEscribe *.siguiente* de nuevo para saltarla.`);
      }
    }

    // 🔍 COMANDO PRINCIPAL: .imagen / .img
    if (command === 'imagen' || command === 'img') {
      if (!args.length) {
        return reply('❌ Escribe qué imagen deseas buscar.\n📌 *Ejemplo:* .img globo pop');
      }

      const query = args.join(' ');
      const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Buscando imágenes de "${query}"..._` }, { quoted: msg });

      try {
        // Usamos una API abierta ultra rápida para extraer enlaces directos de imágenes
        const res = await axios.get(`https://itzpire.com/search/google-image?query=${encodeURIComponent(query)}`);
        const results = res.data?.data;

        if (!results || results.length === 0) {
          await sock.sendMessage(remoteJid, { delete: loadMsg.key });
          return reply('❌ No se encontró ninguna imagen para esa búsqueda.');
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

        const imgDownload = await axios.get(results[0], { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } });
        
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        await sock.sendMessage(remoteJid, {
          image: Buffer.from(imgDownload.data),
          caption: `📸 *Resultado 1 de ${results.length}*\n🔍 *Búsqueda:* ${query}\n\n💡 _Escribe *.siguiente* para ver otra opción._`
        }, { quoted: msg });

      } catch (err) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ Ocurrió un error al conectar con el servidor de imágenes.');
      }
    }
  }
};
