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
        model: 'llama-3.3-70b-versatile', // El modelo más inteligente y rápido
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
      const text = args.join(' ').trim();
      if (!text) {
        return reply('🤖 Habla causa 😹\n\n📌 *Ejemplos:*\n.bot hola\n.bot quién eres?\n.bot explícame qué es un agujero negro');
      }

      await sock.sendPresenceUpdate('composing', remoteJid); // Muestra "Escribiendo..."

      const senderName = pushName || 'Usuario';
      const history = getMemory(remoteJid);
      
      const aiReply = await askGroq(text, senderName, history);

      // Guardar en la memoria la interacción
      saveToMemory(remoteJid, 'user', `${senderName} dice: ${text}`);
      saveToMemory(remoteJid, 'assistant', aiReply);

      await sock.sendMessage(remoteJid, { text: aiReply }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en comando IA:', err);
      return reply('❌ Ocurrió un error al procesar tu mensaje.');
    }
  },

  // 2️⃣ EJECUCIÓN AUTOMÁTICA (Si el modo chatbot está activado en el grupo)
  onMessage: async ({ sock, msg, remoteJid, body, pushName, groupData, userData, isCommand }) => {
    // Si es un comando con prefijo (.bot) o fue enviado por el mismo bot, lo ignoramos para evitar duplicados
    if (isCommand || msg.key.fromMe || !body) return;

    // Verificamos si el modo chatbot está encendido en la base de datos para este grupo o usuario
    const isChatbotEnabled = (groupData && groupData.chatbot) || (userData && userData.chatbot);

    // Si también mencionaron al bot de forma natural (ej. "hola @bot")
    const botJid = cleanJid(sock.user.id);
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const isMentioned = mentioned.includes(`${botJid}@s.whatsapp.net`);

    if (isChatbotEnabled || isMentioned) {
      // Limpiar la etiqueta del texto para que la IA no se confunda
      let cleanText = body.replace(new RegExp(`@${botJid.split('@')[0]}`, 'g'), '').trim();
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
