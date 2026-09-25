'use strict';

require('dotenv').config();
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

module.exports = {
  name: 'gemini',
  aliases: ['vision'], 
  category: 'utilidad',
  desc: 'Analiza imágenes y responde usando Gemini 1.5 Flash',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    try {
      if (!GEMINI_API_KEY) {
        return reply('❌ Mi creador olvidó ponerme mi cerebro visual. Falta la `GEMINI_API_KEY` en el archivo `.env`.');
      }

      // 🛡️ Desenvolver el mensaje (Por si es un mensaje reenviado, temporal o modificado)
      let m = msg.message;
      if (m?.ephemeralMessage) m = m.ephemeralMessage.message;
      if (m?.viewOnceMessage) m = m.viewOnceMessage.message;
      if (m?.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
      if (m?.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;

      // 🔍 Detectar si hay una imagen directa o si respondes (citas) a una imagen
      const isImage = !!m?.imageMessage;
      const isQuotedImage = !!m?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      
      // 📝 Extraer el texto (Garantiza que el texto de la imagen no se pierda)
      let prompt = args.join(' ').trim();
      if (!prompt && isImage && m?.imageMessage?.caption) {
          // Si el texto vino pegado a la imagen, sacamos el comando para que no lo lea la IA
          prompt = m.imageMessage.caption.replace(/^[.\/#!]\w+\s*/, '').trim();
      }
      
      // Prompt por defecto si mandan la imagen sin escribir nada
      if (!prompt) {
          prompt = 'Describe detalladamente esta imagen, dime de dónde es y usa tu tono sarcástico peruano.';
      }

      if (!isImage && !isQuotedImage && prompt.length === 0) {
        return reply('❌ Tienes que preguntarme algo o adjuntar una foto, pe.\n📌 *Ejemplo:* .gemini ¿De qué anime es esto? (adjuntando imagen)');
      }

      const msgEspera = await sock.sendMessage(remoteJid, { text: '👀 Escaneando con mi visión biónica...' }, { quoted: msg });

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

        // 🔥 FIX DEFINITIVO: inline_data correcto, Imagen primero y orden de Sistema estricta
        payload = {
          system_instruction: {
            parts: [{ text: "Eres SiriusBot, un asistente peruano sarcástico y divertido. Tienes visión artificial perfecta. Observa obligatoriamente la imagen adjunta, analízala a fondo y responde la consulta. PROHIBIDO decir que no puedes ver la imagen o que necesitas que te la envíen." }]
          },
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Image } },
              { text: prompt }
            ]
          }]
        };
      } else {
        payload = {
          system_instruction: {
            parts: [{ text: "Eres SiriusBot, un asistente peruano sarcástico y divertido." }]
          },
          contents: [{
            parts: [{ text: prompt }]
          }]
        };
      }

      // 🧠 Conexión a Gemini 1.5 Flash (URL Oficial y estable)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await response.json();

      if (json.error) {
        console.log('Error Gemini:', json.error);
        return sock.sendMessage(remoteJid, { text: `❌ Error en la Matrix: ${json.error.message}`, edit: msgEspera.key });
      }

      const iaResponse = json.candidates[0].content.parts[0].text;

      // 📤 Entregar respuesta editando el mensaje
      try {
        await sock.sendMessage(remoteJid, { text: `👁️ *SiriusBot Vision:*\n\n${iaResponse}`, edit: msgEspera.key, mentions: [msg.key.participant || msg.key.remoteJid] });
      } catch (e) {
        await sock.sendMessage(remoteJid, { text: `👁️ *SiriusBot Vision:*\n\n${iaResponse}` }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en gemini.js:', err);
      return reply('❌ Se me quemó una neurona. Asegúrate de que la foto cargó bien o intenta de nuevo.');
    }
  }
};
