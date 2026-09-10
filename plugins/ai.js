'use strict';

// 🧠 Memoria RAM (Ultra rápida, no satura el disco)
const memoryCache = new Map();
const MAX_HISTORY = 10;

// 🟢 EL FIX: Extraer el número real sin importar si tiene ":" o "@s.whatsapp.net"
function getNumber(jid = '') { 
  return String(jid).split('@')[0].split(':')[0]; 
}

function getMemory(chatId) {
  if (!memoryCache.has(chatId)) {
    memoryCache.set(chatId, []);
  }
  return memoryCache.get(chatId);
}

function saveToMemory(chatId, role, content) {
  const history = getMemory(chatId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY * 2) {
    history.splice(0, 2); 
  }
}

// 🤖 Conexión directa a la API de Groq
async function askGroq(text, senderName, chatHistory) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return '❌ *ERROR:* El creador aún no ha configurado la API Key de Groq en el archivo .env';

  const systemPrompt = `Eres SiriusBot, un bot de WhatsApp peruano creado por Jose Velazco.
Tu personalidad es divertida, natural, algo troll, sarcástica y muy sociable. 
Hablas con jerga peruana moderna (pe, causa, mano, webada, etc.) pero sin exagerar para que se sienta natural.
Usas emojis naturalmente 😹😎🔥.
REGLAS ESTRICTAS:
- NUNCA hables de forma formal o robótica.
- NUNCA digas que eres una IA, un modelo de lenguaje o un asistente virtual. Eres SiriusBot.
- Responde como si fueras un amigo más del grupo de WhatsApp.
- Si te preguntan algo serio o te piden información/resúmenes, responde de forma útil y clara, pero mantén tu toque relajado.
- Haz respuestas cortas y directas, a menos que te pidan explicaciones largas.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: `${senderName} dice: ${text}` }
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b', 
        temperature: 0.8,
        max_tokens: 500,
        messages: messages
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Error en Groq');

    return data.choices[0].message.content.trim();
  } catch (err) {
    console.log('❌ Error en IA:', err.message);
    return 'Tmr mi cerebro de silicio se acaba de saturar 😹, pregúntame de nuevo en un ratito.';
  }
}

module.exports = {
  name: 'ai',
  aliases: ['bot', 'ia', 'sirius', 'chatgpt'],
  category: 'inteligencia artificial',
  desc: 'Habla con la IA de SiriusBot (Con memoria de contexto)',

  // 1️⃣ EJECUCIÓN POR COMANDO DIRECTO (.ai hola)
  execute: async ({ sock, msg, remoteJid, args, pushName, sender, reply }) => {
    try {
      let text = args.join(' ').trim();

      const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
      const quotedMsg = quotedInfo?.quotedMessage;
      let quotedText = '';

      if (quotedMsg) {
        quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
      }

      if (!text && !quotedText) {
        return reply('🤖 Habla causa 😹\n\n📌 *Ejemplos:*\n.ai hola\n.ai (respondiendo a un mensaje) resúmeme esto');
      }

      let promptFinal = text;
      if (quotedText) {
        promptFinal = text 
          ? `[El usuario citó este mensaje: "${quotedText}"]\n\nResponde a esto: ${text}` 
          : `[El usuario citó este mensaje: "${quotedText}"]\n\n¿Qué opinas o qué me dices de esto?`;
      }

      await sock.sendPresenceUpdate('composing', remoteJid); 

      const senderName = pushName || 'Usuario';
      const history = getMemory(remoteJid);
      
      const aiReply = await askGroq(promptFinal, senderName, history);

      saveToMemory(remoteJid, 'user', `${senderName} dice: ${promptFinal}`);
      saveToMemory(remoteJid, 'assistant', aiReply);

      await sock.sendMessage(remoteJid, { text: aiReply }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en comando IA:', err);
      return reply('❌ Ocurrió un error al procesar tu mensaje.');
    }
  },

  // 2️⃣ EJECUCIÓN AUTOMÁTICA (Responde si citas uno de sus mensajes)
  onMessage: async ({ sock, msg, remoteJid, body, pushName, isCommand }) => {
    // Si es un comando (ya lo maneja execute), o lo envió el bot, lo ignoramos
    if (isCommand || msg.key.fromMe || !body) return;

    // 🟢 MAGIA: Comparación exacta de números de teléfono
    const botNumber = getNumber(sock.user.id);
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    
    // ¿El mensaje que el usuario está respondiendo es del bot?
    const isReplyToBot = quotedParticipant ? (getNumber(quotedParticipant) === botNumber) : false;

    // Si efectivamente citaste al bot, responde sin necesidad del .ai
    if (isReplyToBot) {
      await sock.sendPresenceUpdate('composing', remoteJid);

      const senderName = pushName || 'Usuario';
      const history = getMemory(remoteJid);
      
      const aiReply = await askGroq(body, senderName, history);

      saveToMemory(remoteJid, 'user', `${senderName} dice: ${body}`);
      saveToMemory(remoteJid, 'assistant', aiReply);

      await sock.sendMessage(remoteJid, { text: aiReply }, { quoted: msg });
    }
  }
};
