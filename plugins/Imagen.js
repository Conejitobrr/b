'use strict';

const axios = require('axios');

const busquedasActivas = new Map();

async function buscarImagenes(query) {
  try {
    // Usamos una ruta alternativa basada en DuckDuckGo Images (Cero bloqueos, ultra rápido)
    const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const matches = response.data.match(/vurl=([^"&]+)/g);
    if (!matches) return [];

    let urls = matches.map(val => decodeURIComponent(val.replace('vurl=', '')));
    // Filtramos solo enlaces directos de imágenes comunes (.jpg, .png, etc.) o proxies seguros
    urls = urls.filter(u => u.includes('.jpg') || u.includes('.png') || u.includes('image'));

    return [...new Set(urls)];
  } catch (error) {
    return [];
  }
}

module.exports = {
  name: 'imagen',
  aliases: ['img', 'siguiente'],
  category: 'multimedia',
  desc: 'Buscador de imágenes optimizado para Termux',

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
        const imgDownload = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        return await sock.sendMessage(remoteJid, {
          image: Buffer.from(imgDownload.data),
          caption: `📸 *Resultado ${sesion.currentIndex + 1} de ${sesion.images.length}*\n🔍 *Búsqueda:* ${sesion.query}\n\n💡 _Escribe *.siguiente* para ver otra._`
        }, { quoted: msg });
      } catch (err) {
        // Si una imagen falla, pasa automáticamente a la siguiente sin trabar el bot
        return sock.sendMessage(remoteJid, { text: '⚠️ La imagen anterior falló al descargar. Escribe *.siguiente* otra vez para saltarla.' });
      }
    }

    // 🔍 COMANDO PRINCIPAL: .imagen / .img
    if (command === 'imagen' || command === 'img') {
      if (!args.length) {
        return reply('❌ Escribe qué imagen deseas buscar.\n📌 *Ejemplo:* .img bon o bon');
      }

      const query = args.join(' ');
      const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Buscando imágenes de "${query}"..._` }, { quoted: msg });

      try {
        // Motor de respaldo ultra seguro: Usamos una API pública estables de Pinterest/Google directa
        let results = [];
        
        try {
          const resApi = await axios.get(`https://deliriueapi.web.id/api/pinterest?query=${encodeURIComponent(query)}`, { timeout: 7000 });
          if (resApi.data && resApi.data.data) {
            results = resApi.data.data;
          }
        } catch (e) {
          // Si la API falla, usamos el buscador alternativo web
          results = await buscarImagenes(query);
        }

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

        const imgDownload = await axios.get(results[0], { responseType: 'arraybuffer', timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        await sock.sendMessage(remoteJid, {
          image: Buffer.from(imgDownload.data),
          caption: `📸 *Resultado 1 de ${results.length}*\n🔍 *Búsqueda:* ${query}\n\n💡 _Escribe *.siguiente* para ver otra opción._`
        }, { quoted: msg });

      } catch (err) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ Ocurrió un error de conexión al procesar la imagen.');
      }
    }
  }
};
