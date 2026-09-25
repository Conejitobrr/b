'use strict';

// Cargamos el archivo oculto .env
require('dotenv').config();
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

// La llave ahora está protegida y se extrae automáticamente
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

module.exports = {
  name: 'ai',
  aliases: ['ia', 'gemini', 'vision', 'bot'],
  category: 'utilidad',
  desc: 'Habla con la IA o haz que analice cualquier imagen',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    try {
      if (!GEMINI_API_KEY) {
        return reply('❌ Mi creador olvidó ponerme mi cerebro. Falta la `GEMINI_API_KEY` en el archivo `.env`.');
      }

      // 🔍 Detectar si hay una imagen adjunta o citada
      const isImage = msg.message?.imageMessage;
      const isQuotedImage = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
      
      const prompt = args.length > 0 ? args.join(' ') : 'Describe esta imagen con mucho detalle, con un tono divertido, sarcástico y usando jerga peruana suave.';

      if (!isImage && !isQuotedImage && !args.length) {
        return reply('❌ Tienes que preguntarme algo o adjuntar una foto, pe.\n📌 *Ejemplo:* .ai ¿De qué anime es esto? (adjuntando imagen)');
      }

      const msgEspera = await sock.sendMessage(remoteJid, { text: '👀 A ver, déjame escanear esto...' }, { quoted: msg });

      let payload;

      if (isImage || isQuotedImage) {
        // 📥 Descargar la imagen de WhatsApp
        const imageMessage = isImage ? msg.message.imageMessage : msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage;
        const stream = await downloadContentFromMessage(imageMessage, 'image');
        
        let buffer = Buffer.from([]);
        for await(const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        // 🔄 Convertir a Base64
        const base64Image = buffer.toString('base64');

        payload = {
          contents: [{
            parts: [
              { text: prompt },
              // 🔥 EL ÚNICO ARREGLO ESTÁ AQUÍ: inlineData y mimeType (sin guiones bajos)
              { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ]
          }]
        };
      } else {
        // 📝 Procesar solo texto
        payload = {
          contents: [{
            parts: [{ text: prompt }]
          }]
        };
      }

      // 🧠 Conexión directa a Gemini 1.5 Flash
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

      // 📤 Entregar la respuesta editando el mensaje
      try {
        await sock.sendMessage(remoteJid, { text: `🧠 *SiriusBot AI:*\n\n${iaResponse}`, edit: msgEspera.key, mentions: [msg.key.participant || msg.key.remoteJid] });
      } catch (e) {
        await sock.sendMessage(remoteJid, { text: `🧠 *SiriusBot AI:*\n\n${iaResponse}` }, { quoted: msg });
      }

    } catch (err) {
      console.log('❌ Error en ia.js:', err);
      return reply('❌ Se me quemó una neurona procesando esto. Asegúrate de haber enviado una imagen válida o un buen texto.');
    }
  }
};
