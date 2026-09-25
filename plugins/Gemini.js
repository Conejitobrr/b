'use strict';

require('dotenv').config();
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

module.exports = {
  name: 'gemini',
  aliases: ['vision'],
  category: 'utilidad',
  desc: 'Analiza imágenes usando Gemini 1.5 Flash',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    try {
      if (!GEMINI_API_KEY) {
        return reply('❌ Falta GEMINI_API_KEY en el archivo .env');
      }

      // Desenvolver el mensaje
      let m = msg.message;
      if (m?.ephemeralMessage) m = m.ephemeralMessage.message;
      if (m?.viewOnceMessage) m = m.viewOnceMessage.message;
      if (m?.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
      if (m?.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;

      // Detectar imagen
      const isImage = !!m?.imageMessage;
      const isQuotedImage = !!m?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      
      let prompt = args.join(' ').trim();
      
      if (!prompt && isImage && m?.imageMessage?.caption) {
          prompt = m.imageMessage.caption.replace(/^[.\/#!]\w+\s*/, '').trim();
      }
      
      if (!prompt) {
          prompt = 'Describe esta imagen detalladamente.';
      }

      if (!isImage && !isQuotedImage && !args.length) {
        return reply('❌ Envía un texto o responde a una imagen.\nEjemplo: .gemini ¿Qué es esto?');
      }

      const msgEspera = await sock.sendMessage(remoteJid, { text: '⏳ Analizando...' }, { quoted: msg });

      let payload;

      if (isImage || isQuotedImage) {
        const imageMessage = isImage ? m.imageMessage : m.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        
        let buffer = Buffer.from([]);
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        const base64Image = buffer.toString('base64');
        const mimeType = imageMessage.mimetype || 'image/jpeg';

        // Imagen obligatoriamente primero, variables en snake_case
        payload = {
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Image } },
              { text: prompt }
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

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await response.json();

      if (json.error) {
        return sock.sendMessage(remoteJid, { text: `❌ Error de API: ${json.error.message}`, edit: msgEspera.key });
      }

      const iaResponse = json.candidates[0].content.parts[0].text;

      try {
        await sock.sendMessage(remoteJid, { text: iaResponse, edit: msgEspera.key });
      } catch (e) {
        await sock.sendMessage(remoteJid, { text: iaResponse }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en gemini.js:', err);
      return reply('❌ Ocurrió un error al procesar la solicitud.');
    }
  }
};
