'use strict';

// 🧠 Memoria RAM independiente para los chismes del grupo
const chatHistory = new Map();
const MAX_HISTORY = 60; 

function cleanText(text = '') { 
  return String(text).replace(/\s+/g, ' ').trim(); 
}

module.exports = {
  name: 'resumen',
  aliases: ['chisme', 'resumir', 'contexto'],
  category: 'inteligencia artificial',
  desc: 'SiriusBot te resume de qué diablos están hablando en el grupo',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    try {
      if (!remoteJid.endsWith('@g.us')) {
        return reply('❌ Este comando es exclusivo para grupos, chismoso.');
      }

      const history = chatHistory.get(remoteJid) || [];
      
      if (history.length < 10) {
        return reply('🤷‍♂️ Aún no hay suficiente chisme para resumir. El grupo está muy muerto, hablen un poco más primero.');
      }

      await sock.sendPresenceUpdate('composing', remoteJid);

      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return reply('❌ Falta configurar GROQ_API_KEY en el archivo .env');

      const formattedHistory = history.map(h => `${h.user} dijo: ${h.text}`).join('\n');

      const prompt = `Eres SiriusBot, el bot más chismoso y sarcástico del Perú.
Tu tarea es leer los últimos mensajes de este grupo y hacer un resumen entretenido.

REGLAS ESTRICTAS:
1. Menciona de qué tema absurdo estuvieron hablando o si hubo debate.
2. Usa jerga peruana (causa, pe, mano, gil, palta, chisme).
3. Escribe TODO en un solo párrafo corto y fluido. NUNCA dejes oraciones a la mitad.
4. SIEMPRE debes generar un texto de respuesta.
5. Si hablaron cosas aburridas, búrlate de ellos.

HISTORIAL RECIENTE DEL CHAT:
${formattedHistory}`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          temperature: 0.8,
          max_tokens: 800, // 🔥 Aumentado masivamente para que NUNCA corte el texto a la mitad
          messages: [
            { role: 'system', content: 'Eres el reportero de chismes más sarcástico de WhatsApp.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error?.message || 'Error en Groq');
      
      let respuesta = data.choices?.[0]?.message?.content?.trim();

      if (!respuesta) {
        respuesta = 'Los chismes estaban tan aburridos que me quedé dormido procesándolos. Hablen de algo más interesante pe 😹';
      }

      // ⏱️ Pausa artificial de 2.5 segundos para procesar con calma y dar naturalidad
      await new Promise(resolve => setTimeout(resolve, 2500));

      await sock.sendMessage(remoteJid, {
        text: `📰 *EL CHISME DEL GRUPO* 📰\n\n${respuesta}`
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en Resumen:', err.message || err);
      return reply('❌ Ocurrió un error. Parece que los chismes estaban tan fuertes que me saturaron el procesador.');
    }
  },

  onMessage: async ({ msg, body, pushName, remoteJid, isCommand }) => {
    if (!remoteJid.endsWith('@g.us') || isCommand || msg.key.fromMe || !body) return;

    const text = cleanText(body);
    if (!text || text.length > 300) return;

    if (!chatHistory.has(remoteJid)) {
      chatHistory.set(remoteJid, []);
    }

    const history = chatHistory.get(remoteJid);
    const userName = pushName || 'Alguien';
    
    history.push({ user: userName, text });

    if (history.length > MAX_HISTORY) {
      history.shift(); 
    }
  }
};
