'use strict';

// 🧠 Memoria RAM (Ultra rápida, no satura el disco)
const memoryCache = new Map();
const MAX_HISTORY = 10;

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

  // 1️⃣ EJECUCIÓN POR COMANDO DIRECTO (.ai)
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

  // 2️⃣ SISTEMA AUTOMÁTICO DE ESCUCHA (Conversación Fluida)
  // Utilizamos la misma estructura de tu plugin "audios_pasivos"
  onMessage: async ({ sock, remoteJid, body, msg, groupData, userData }) => {
    if (!body || msg.key.fromMe) return;

    // Si el mensaje empieza con un punto (.), dejamos que la función execute lo maneje
    if (body.startsWith('.')) return;

    // Obtener el ID del bot (ej. 51958959882) quitándole basura de WhatsApp
    const botId = sock.user.id.split(':')[0]; 

    // ¿El usuario mencionó al bot con @ ?
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const isMentioned = mentioned.some(jid => jid.includes(botId));

    // ¿El usuario respondió citando un mensaje del bot?
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant || '';
    const isReplyToBot = quotedParticipant.includes(botId);

    // ¿Tienen el modo chatbot prendido en todo el grupo?
    const isChatbotEnabled = (groupData && groupData.chatbot) || (userData && userData.chatbot);

    // Si ocurre CUALQUIERA de esas tres, la IA responde
    if (isMentioned || isReplyToBot || isChatbotEnabled) {
      // Limpiamos el texto por si tiene un "@Sirius" metido ahí
      let cleanText = body.replace(new RegExp(`@${botId}`, 'g'), '').trim();
      if (!cleanText) cleanText = 'Hola';

      await sock.sendPresenceUpdate('composing', remoteJid);

      const senderName = msg.pushName || 'Usuario';
      const history = getMemory(remoteJid);
      
      const aiReply = await askGroq(cleanText, senderName, history);

      saveToMemory(remoteJid, 'user', `${senderName} dice: ${cleanText}`);
      saveToMemory(remoteJid, 'assistant', aiReply);

      await sock.sendMessage(remoteJid, { text: aiReply }, { quoted: msg });
    }
  }
};
