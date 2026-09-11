'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const busquedasActivas = new Map();

async function buscarImagenes(query) {
  try {
    // Usamos la URL exacta de Bing con los parámetros de búsqueda
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&setmkt=es-US&setlang=es`;
    
    // Petición con User-Agent de PC para evitar restricciones móviles
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9'
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const resultados = [];

    $('.iusc').each((i, el) => {
      const m = $(el).attr('m');
      if (m) {
        try {
          const jsonData = JSON.parse(m);
          if (jsonData.murl) {
            resultados.push(jsonData.murl);
          }
        } catch (e) {}
      }
    });

    return [...new Set(resultados)];
  } catch (error) {
    console.error("Error en scraping de Bing:", error.message);
    return [];
  }
}

module.exports = {
  name: 'imagen',
  aliases: ['img', 'siguiente'],
  category: 'multimedia',
  desc: 'Buscador clásico de imágenes con navegación .siguiente',

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
          timeout: 8000, 
          headers: { 'User-Agent': 'Mozilla/5.0' } 
        });

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
        return reply('❌ Escribe qué imagen deseas buscar.\n📌 *Ejemplo:* .imagen bon o bon');
      }

      const query = args.join(' ');
      const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Buscando imágenes de "${query}"..._` }, { quoted: msg });

      const results = await buscarImagenes(query);

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

      try {
        const imgDownload = await axios.get(results[0], { 
          responseType: 'arraybuffer', 
          timeout: 8000, 
          headers: { 'User-Agent': 'Mozilla/5.0' } 
        });
        
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        await sock.sendMessage(remoteJid, {
          image: Buffer.from(imgDownload.data),
          caption: `📸 *Resultado 1 de ${results.length}*\n🔍 *Búsqueda:* ${query}\n\n💡 _Escribe *.siguiente* para ver otra opción._`
        }, { quoted: msg });

      } catch (err) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ Ocurrió un error al descargar la primera imagen. Escribe *.siguiente* para intentar con otra.');
      }
    }
  }
};
