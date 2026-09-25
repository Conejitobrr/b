'use strict';

require('dotenv').config();
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

module.exports = {
  name: 'gemini',
  aliases: ['vision'],
  category: 'utilidad',
  desc: 'Analiza imágenes y texto usando Gemini (Múltiples modelos)',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    try {
      if (!GEMINI_API_KEY) {
        return reply('❌ Falta GEMINI_API_KEY en el archivo .env');
      }

      let m = msg.message;
      if (m?.ephemeralMessage) m = m.ephemeralMessage.message;
      if (m?.viewOnceMessage) m = m.viewOnceMessage.message;
      if (m?.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
      if (m?.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;

      const isImage = !!m?.imageMessage;
      const isQuotedImage = !!m?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      
      let prompt = args.join(' ').trim();
      
      if (!prompt && isImage && m?.imageMessage?.caption) {
          prompt = m.imageMessage.caption.replace(/^[.\/#!]\w+\s*/, '').trim();
      }
      
      if (!prompt && (isImage || isQuotedImage)) {
          prompt = 'Describe esta imagen detalladamente.';
      }

      if (!isImage && !isQuotedImage && !prompt) {
        return reply('❌ Envía un texto o responde a una imagen.\nEjemplo: .gemini hola');
      }

      const msgEspera = await sock.sendMessage(remoteJid, { text: (isImage || isQuotedImage) ? '⏳ Analizando imagen...' : '⏳ Conectando con Google...' }, { quoted: msg });

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

      // 🛡️ ESCUDO ANTI-SATURACIÓN: Lista de modelos extraída de tu cuenta oficial
      const modelosActivos = [
        'gemini-3.8-flash',         // El más nuevo, pero suele saturarse
        'gemini-flash-latest',      // Redirección automática de Google al más estable
        'gemini-3.5-flash',         // Respaldo súper rápido
        'gemini-2.5-flash-lite'     // Modelo ligero que casi nunca se satura
      ];

      let iaResponse = null;
      let ultimoError = null;

      // Intentará conectarse a cada modelo en orden hasta que uno responda
      for (const modelo of modelosActivos) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`;
        
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const json = await response.json();

          if (!json.error) {
            iaResponse = json.candidates[0].content.parts[0].text;
            break; // ¡Exito! Rompe el bucle y deja de buscar
          } else {
            ultimoError = json.error.message;
            console.log(`⚠️ Modelo ${modelo} falló o está saturado. Intentando el siguiente...`);
          }
        } catch (e) {
          ultimoError = e.message;
        }
      }

      // Si después de probar los 4 modelos todos fallan
      if (!iaResponse) {
        return sock.sendMessage(remoteJid, { text: `❌ Todos los servidores de Google están saturados ahora mismo.\nDetalle: ${ultimoError}`, edit: msgEspera.key });
      }

      // Entregar respuesta final
      try {
        await sock.sendMessage(remoteJid, { text: iaResponse, edit: msgEspera.key });
      } catch (e) {
        await sock.sendMessage(remoteJid, { text: iaResponse }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en gemini.js:', err);
      return reply('❌ Ocurrió un error crítico al procesar la solicitud.');
    }
  }
};
