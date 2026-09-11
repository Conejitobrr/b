'use strict';

const axios = require('axios');

const busquedasActivas = new Map();

module.exports = {
  name: 'imagen',
  aliases: ['img', 'siguiente'],
  category: 'multimedia',
  desc: 'Buscador de imágenes con conversión a JPG y navegación por .siguiente',

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
        const imgDownload = await axios.get(imageUrl, { 
          responseType: 'arraybuffer', 
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        // Forzamos el buffer directamente a JPG para WhatsApp
        const imageBuffer = Buffer.from(imgDownload.data);

        return await sock.sendMessage(remoteJid, {
          image: imageBuffer,
          caption: `📸 *Resultado ${sesion.currentIndex + 1} de ${sesion.images.length}*\n🔍 *Búsqueda:* ${sesion.query}\n\n💡 _Escribe *.siguiente* para ver otra._`
        }, { quoted: msg });
      } catch (err) {
        return reply(`⚠️ La imagen #${sesion.currentIndex + 1} falló. Escribe *.siguiente* de nuevo para saltarla.`);
      }
    }

    // 🔍 COMANDO PRINCIPAL: .imagen / .img
    if (command === 'imagen' || command === 'img') {
      if (!args.length) {
        return reply('❌ Escribe qué imagen deseas buscar.\n📌 *Ejemplo:* .imagen Goku');
      }

      const query = args.join(' ');
      const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Buscando imágenes de "${query}"..._` }, { quoted: msg });

      try {
        let results = [];

        // 🚀 INTENTO 1: API Primaria (Pinterest Global)
        try {
          const res1 = await axios.get(`https://deliriueapi.web.id/api/pinterest?query=${encodeURIComponent(query)}`, { timeout: 7000 });
          if (res1.data?.data?.length > 0) results = res1.data.data;
        } catch (e) {}

        // 🚀 INTENTO 2: API de Respaldo (Itzpire Media) si la primera falla
        if (results.length === 0) {
          try {
            const res2 = await axios.get(`https://itzpire.com/search/pinterest?query=${encodeURIComponent(query)}`, { timeout: 7000 });
            if (res2.data?.data?.length > 0) results = res2.data.data;
          } catch (e) {}
        }

        if (results.length === 0) {
          await sock.sendMessage(remoteJid, { delete: loadMsg.key });
          return reply('❌ No se encontró ninguna imagen para esa búsqueda en los servidores.');
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

        // Descarga de la primera imagen con conversión forzada a JPG
        const imgDownload = await axios.get(results[0], { 
          responseType: 'arraybuffer', 
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        const imageBuffer = Buffer.from(imgDownload.data);
        
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        await sock.sendMessage(remoteJid, {
          image: imageBuffer,
          caption: `📸 *Resultado 1 de ${results.length}*\n🔍 *Búsqueda:* ${query}\n\n💡 _Escribe *.siguiente* para ver otra opción._`
        }, { quoted: msg });

      } catch (err) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        console.error("❌ Error crítico en comando imagen:", err.message);
        return reply('❌ Ocurrió un error al procesar la imagen en los servidores.');
      }
    }
  }
};
