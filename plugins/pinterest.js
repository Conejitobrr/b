'use strict';

const axios = require('axios');

module.exports = {
  name: 'pinterest',
  aliases: ['pin'],
  category: 'multimedia',
  desc: 'Descarga imágenes de Pinterest mediante scraping directo (Anti-caídas)',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (!args.length) {
      return reply('❌ Escribe lo que deseas buscar.\n📌 *Ejemplo:* .pinterest perros');
    }

    const query = args.join(' ');
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🔍 _Extrayendo imágenes desde Pinterest: "${query}"..._` }, { quoted: msg });

    try {
      // 1️⃣ SCRAPING DIRECTO A LA PÁGINA OFICIAL DE PINTEREST
      const res = await axios.get(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9'
        }
      });

      // 2️⃣ FILTRAR SOLO LAS IMÁGENES EN ALTA CALIDAD (Originals)
      const regex = /"url":"(https:\/\/i\.pinimg\.com\/originals\/[^"]+)"/g;
      let matches = [];
      let match;
      
      while ((match = regex.exec(res.data)) !== null) {
        // Limpiamos los caracteres de escape JSON
        matches.push(match[1].replace(/\\/g, ''));
      }

      // Limpiar duplicados de la memoria
      matches = [...new Set(matches)];

      if (matches.length === 0) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply('❌ No se encontraron imágenes o Pinterest bloqueó la lectura.');
      }

      // 3️⃣ ESCOGER UNA IMAGEN ALEATORIA DE LOS RESULTADOS
      const imagenAleatoria = matches[Math.floor(Math.random() * matches.length)];

      // 4️⃣ DESCARGAR LA IMAGEN DE FORMA SEGURA (Evita Error 429 de Apple/WA)
      const imgDownload = await axios.get(imagenAleatoria, { 
        responseType: 'arraybuffer',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      const bufferImagen = Buffer.from(imgDownload.data);

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // 5️⃣ ENVIAR EL RESULTADO FINAL
      await sock.sendMessage(remoteJid, {
        image: bufferImagen,
        caption: `📌 *Pinterest:* ${query}`
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      console.error('❌ Error en Pinterest (Scraping):', err.message);
      return reply('❌ Ocurrió un error al extraer la imagen directamente de la fuente.');
    }
  }
};
