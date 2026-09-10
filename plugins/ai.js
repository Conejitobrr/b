'use strict';

// 🧠 Memoria RAM (Ultra rápida, no satura el disco de Termux)
const memoryCache = new Map();
const MAX_HISTORY = 10;

function cleanJid(jid = '') { return String(jid).split(':')[0]; }

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
    history.splice(0, 2); // Borra los más antiguos para no exceder el límite
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

  // Construir el historial de mensajes
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
        model: 'openai/gpt-oss-120b', // El modelo más inteligente y rápido de Groq
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

  // 1️⃣ EJECUCIÓN POR COMANDO DIRECTO (.bot hola)
  execute: async ({ sock, msg, remoteJid, args, pushName, sender, reply }) => {
    try {
      let text = args.join(' ').trim();

      // 🟢 NOVEDAD: Extraer mensaje citado si existe
      const quotedInfo = msg.message?.extendedTextMessage?.contextInfo;
      const quotedMsg = quotedInfo?.quotedMessage;
      let quotedText = '';

      if (quotedMsg) {
        // Puede ser un mensaje de texto normal o uno extendido
        quotedText = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
      }

      if (!text && !quotedText) {
        return reply('🤖 Habla causa 😹\n\n📌 *Ejemplos:*\n.bot hola\n.bot (respondiendo a un mensaje) resúmeme esto');
      }

      // 🟢 NOVEDAD: Si hay un mensaje citado, se lo inyectamos al cerebro de la IA
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

      // Guardar en la memoria
      saveToMemory(remoteJid, 'user', `${senderName} dice: ${promptFinal}`);
      saveToMemory(remoteJid, 'assistant', aiReply);

      await sock.sendMessage(remoteJid, { text: aiReply }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en comando IA:', err);
      return reply('❌ Ocurrió un error al procesar tu mensaje.');
    }
  },

  // 2️⃣ EJECUCIÓN AUTOMÁTICA (Detector de respuestas y menciones)
  onMessage: async ({ sock, msg, remoteJid, body, pushName, groupData, userData, isCommand }) => {
    if (isCommand || msg.key.fromMe || !body) return;

    const isChatbotEnabled = (groupData && groupData.chatbot) || (userData && userData.chatbot);

    const botJid = cleanJid(sock.user.id);
    const botFullJid = `${botJid}@s.whatsapp.net`;
    
    // Detectar menciones directas (@bot)
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const isMentioned = mentioned.includes(botFullJid);

    // 🟢 NOVEDAD: Detectar si están respondiendo directamente a un mensaje que envió el bot
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const isReplyToBot = (cleanJid(quotedParticipant) === botJid);

    // ¡Si el modo chatbot está on, O lo mencionan, O le responden, se activa!
    if (isChatbotEnabled || isMentioned || isReplyToBot) {
      let cleanText = body.replace(new RegExp(`@${botJid}`, 'g'), '').trim();
      if (!cleanText) cleanText = 'Hola';

      await sock.sendPresenceUpdate('composing', remoteJid);

      const senderName = pushName || 'Usuario';
      const history = getMemory(remoteJid);
      
      const aiReply = await askGroq(cleanText, senderName, history);

      saveToMemory(remoteJid, 'user', `${senderName} dice: ${cleanText}`);
      saveToMemory(remoteJid, 'assistant', aiReply);

      await sock.sendMessage(remoteJid, { text: aiReply }, { quoted: msg });
    }
  }
};
