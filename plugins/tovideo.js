'use strict';

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// 🌐 Scraper Interno: Sube el sticker a Ezgif y devuelve el link MP4
async function webp2mp4(buffer) {
  // 1. Construir archivo falso para engañar al servidor
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="new-image"; filename="sticker.webp"\r\nContent-Type: image/webp\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  // 2. Subir el archivo webp
  const res = await fetch('https://ezgif.com/webp-to-mp4', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    body: body
  });
  
  const html = await res.text();
  
  // 3. Extraer los tokens de seguridad ocultos en la página
  const fileMatch = html.match(/name="file" value="(.*?)"/);
  if (!fileMatch) throw new Error('No se pudo subir a Ezgif');
  const file = fileMatch[1];
  
  const tokenMatch = html.match(/name="token" value="(.*?)"/);
  const token = tokenMatch ? tokenMatch[1] : '';

  // 4. Solicitar la conversión a MP4
  const convertBody = new URLSearchParams({
    file: file,
    token: token,
    convert: 'Convert WebP to MP4!'
  });

  const res2 = await fetch(res.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    },
    body: convertBody.toString()
  });
  
  const html2 = await res2.text();
  
  // 5. Capturar el link final del video
  const vidMatch = html2.match(/<source src="(.*?)"/i);
  if (!vidMatch) throw new Error('No se pudo convertir el video');

  let finalUrl = vidMatch[1];
  if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;
  
  return finalUrl;
}

module.exports = {
  name: 'tovideo',
  aliases: ['tomp4', 'mp4'],
  category: 'multimedia',
  desc: 'Convierte un sticker animado a video MP4',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    try {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quoted || !quoted.stickerMessage) {
        return reply('❌ Debes responder a un sticker animado con este comando.');
      }

      if (!quoted.stickerMessage.isAnimated) {
        return reply('⚠️ Este sticker NO tiene movimiento. Usa *.toimage* para volverlo foto.');
      }

      await sock.sendPresenceUpdate('composing', remoteJid);
      
      // Enviamos un mensajito para que sepan que está procesando
      const loadMsg = await sock.sendMessage(remoteJid, { text: '⏳ _Procesando animación, dame un momento..._' }, { quoted: msg });

      // 📥 Descargar sticker de WhatsApp
      const stream = await downloadContentFromMessage(quoted.stickerMessage, 'sticker');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      // 🔄 Convertir usando el scraper web (Adiós error de FFmpeg)
      const mp4Url = await webp2mp4(buffer);

      // 📤 Enviar video final
      await sock.sendMessage(remoteJid, { 
        video: { url: mp4Url }, 
        caption: '🎬 *Sticker convertido a video*' 
      }, { quoted: msg });

      // Borrar el mensaje de "Procesando..."
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });

    } catch (err) {
      console.log('❌ Error en tovideo:', err?.message || err);
      return reply('❌ Ocurrió un error en los servidores al convertir el sticker animado. Intenta con otro.');
    }
  }
};
