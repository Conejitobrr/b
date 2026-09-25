'use strict';

require('dotenv').config();
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

module.exports = {
  name: 'gemini',
  aliases: ['vision'], // 🛑 Alias limpios: solo funciona con .gemini o .vision
  category: 'utilidad',
  desc: 'Analiza imágenes y responde usando Gemini 1.5 Flash',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    try {
      if (!GEMINI_API_KEY) {
        return reply('❌ Mi creador olvidó ponerme mi cerebro visual. Falta la `GEMINI_API_KEY` en el archivo `.env`.');
      }

      // 🛡️ Desenvolver el mensaje (Por si es reenviado o temporal)
      let m = msg.message;
      if (m?.ephemeralMessage) m = m.ephemeralMessage.message;
      if (m?.viewOnceMessage) m = m.viewOnceMessage.message;
      if (m?.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
      if (m?.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;

      // 🔍 Detectar si hay imagen directa o citada
      const isImage = !!m?.imageMessage;
      const isQuotedImage = !!m?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      
      let prompt = args.join(' ').trim();
      
      // Si mandaron la foto con el comando en la descripción
      if (!prompt && isImage && m?.imageMessage?.caption) {
          prompt = m.imageMessage.caption.replace(/^[.\/#!]\w+\s*/, '').trim();
      }
      
      if (!prompt) {
          prompt = 'Describe esta imagen detalladamente y dime de qué trata.';
      }

      if (!isImage && !isQuotedImage && !args.length) {
        return reply('❌ Tienes que preguntarme algo o adjuntar una foto.\n📌 *Ejemplo:* .gemini ¿De qué anime es esto? (adjuntando imagen)');
      }

      // 🧠 Inyectamos la personalidad de forma oculta en el texto (así Google no da error)
      const finalPrompt = prompt + "\n\n[Regla: Eres SiriusBot, un asistente peruano sarcástico y divertido. Si te envié una imagen, analízala a la perfección y responde basándote en ella].";

      const msgEspera = await sock.sendMessage(remoteJid, { text: '👀 A ver, déjame escanear esto con mis propios ojos...' }, { quoted: msg });

      let payload;

      if (isImage || isQuotedImage) {
        // 📥 Descargar la imagen
        const imageMessage = isImage ? m.imageMessage : m.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        
        let buffer = Buffer.from([]);
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        const base64Image = buffer.toString('base64');
        const mimeType = imageMessage.mimetype || 'image/jpeg';

        // ⚠️ ESTRUCTURA PERFECTA: inlineData y mimeType (camelCase)
        payload = {
          contents: [{
            parts: [
              { text: finalPrompt },
              { inlineData: { mimeType: mimeType, data: base64Image } }
            ]
          }]
        };
      } else {
        payload = {
          contents: [{
            parts: [{ text: finalPrompt }]
          }]
        };
      }

      // 🌐 URL Oficial comprobada por tu código base
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await response.json();

      if (json.error) {
        console.log('Error Gemini:', json.error);
        return sock.sendMessage(remoteJid, { text: `❌ Error en mis circuitos: ${json.error.message}`, edit: msgEspera.key });
      }

      const iaResponse = json.candidates[0].content.parts[0].text;

      // 📤 Entregar la respuesta
      try {
        await sock.sendMessage(remoteJid, { text: `👁️ *SiriusBot Vision:*\n\n${iaResponse}`, edit: msgEspera.key, mentions: [msg.key.participant || msg.key.remoteJid] });
      } catch (e) {
        await sock.sendMessage(remoteJid, { text: `👁️ *SiriusBot Vision:*\n\n${iaResponse}` }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en gemini.js:', err);
      return reply('❌ Se me quemó una neurona procesando esto. Asegúrate de haber enviado una imagen válida.');
    }
  }
};
