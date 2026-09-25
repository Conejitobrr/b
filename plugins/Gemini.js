'use strict';

require('dotenv').config();
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

module.exports = {
  name: 'gemini', // 🔥 EL CAMBIO VITAL: Ahora es independiente de ai.js
  aliases: ['vision'],
  category: 'utilidad',
  desc: 'Analiza imágenes usando Gemini 1.5 Flash',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    try {
      if (!GEMINI_API_KEY) {
        return reply('❌ Falta la `GEMINI_API_KEY` en el archivo `.env`.');
      }

      // Desenvolver el mensaje (Por si es reenviado, temporal o modificado)
      let m = msg.message;
      if (m?.ephemeralMessage) m = m.ephemeralMessage.message;
      if (m?.viewOnceMessage) m = m.viewOnceMessage.message;
      if (m?.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
      if (m?.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;

      // Detectar si hay una imagen adjunta o citada
      const isImage = !!m?.imageMessage;
      const isQuotedImage = !!m?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      
      let prompt = args.join(' ').trim();
      
      // Si el texto vino pegado a la imagen en la descripción, sacamos el ".gemini"
      if (!prompt && isImage && m?.imageMessage?.caption) {
          prompt = m.imageMessage.caption.replace(/^[.\/#!]\w+\s*/, '').trim();
      }
      
      if (!prompt) {
          prompt = 'Describe esta imagen detalladamente.';
      }

      if (!isImage && !isQuotedImage && !args.length) {
        return reply('❌ Tienes que adjuntar o responder a una foto.\n📌 *Ejemplo:* .gemini ¿Qué anime es este? (adjuntando imagen)');
      }

      const msgEspera = await sock.sendMessage(remoteJid, { text: '👀 Analizando imagen...' }, { quoted: msg });

      let payload;

      if (isImage || isQuotedImage) {
        // Descargar la imagen
        const imageMessage = isImage ? m.imageMessage : m.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        
        let buffer = Buffer.from([]);
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        const base64Image = buffer.toString('base64');
        const mimeType = imageMessage.mimetype || 'image/jpeg';

        // Formato estricto de Google: inlineData y mimeType (camelCase)
        payload = {
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mimeType, data: base64Image } }
            ]
          }]
        };
      } else {
        payload = {
          contents: [{
            parts: [{ text: prompt }]
          }]
        };
      }

      // Conexión a Gemini 1.5 Flash
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await response.json();

      if (json.error) {
        console.log('Error Gemini:', json.error);
        return sock.sendMessage(remoteJid, { text: `❌ Error de API: ${json.error.message}`, edit: msgEspera.key });
      }

      const iaResponse = json.candidates[0].content.parts[0].text;

      // Entregar respuesta editando el mensaje
      try {
        await sock.sendMessage(remoteJid, { text: iaResponse, edit: msgEspera.key });
      } catch (e) {
        await sock.sendMessage(remoteJid, { text: iaResponse }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en gemini.js:', err);
      return reply('❌ Ocurrió un error al procesar la imagen. Intenta de nuevo.');
    }
  }
};
