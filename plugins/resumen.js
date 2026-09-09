'use strict';

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

// 🧠 Memoria RAM independiente para los chismes del grupo
// (Usamos RAM para no gastar la memoria del celular escribiendo archivos a cada rato)
const chatHistory = new Map();
const MAX_HISTORY = 60; // Cantidad de mensajes que va a recordar para el resumen

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
      // 🛡️ Solo tiene sentido en grupos
      if (!remoteJid.endsWith('@g.us')) {
        return reply('❌ Este comando es exclusivo para grupos, chismoso.');
      }

      const history = chatHistory.get(remoteJid) || [];
      
      // Si el bot acaba de prenderse o no han hablado mucho
      if (history.length < 10) {
        return reply('🤷‍♂️ Aún no hay suficiente chisme para resumir. El grupo está más muerto que mi abuela. Hablen un poco más primero.');
      }

      await sock.sendPresenceUpdate('composing', remoteJid);

      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return reply('❌ Falta configurar GROQ_API_KEY en el archivo .env');

      // 📜 Formatear el historial para que Groq lo entienda ("Usuario: Mensaje")
      const formattedHistory = history.map(h => `${h.user}: ${h.text}`).join('\n');

      const prompt = `Eres SiriusBot, el bot más chismoso, tóxico y sarcástico del Perú.
Tu tarea es leer los últimos ${history.length} mensajes de este grupo de WhatsApp y hacer un resumen entretenido de lo que ha pasado.

REGLAS ESTRICTAS:
1. Resalta quién dijo la mayor tontería, quién estuvo peleando o de qué tema absurdo estuvieron hablando.
2. Usa jerga peruana (causa, pe, mano, gil, palta, chisme, pavo, etc) para que suene como un pata del barrio contando un chisme.
3. Escribe TODO en un solo párrafo corto, fluido y muy burlón.
4. Si solo dijeron "hola" o cosas aburridas, búrlate de lo muerto y aburrido que está el grupo.
5. NO inventes cosas que no están en el historial.

HISTORIAL DEL CHAT RECIENTE:
${formattedHistory}`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.8, // Un poco más bajo para que no alucine cosas que no pasaron
          max_tokens: 250,
          messages: [
            { role: 'system', content: 'Eres el reportero de chismes más sarcástico de WhatsApp.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Error en Groq');
      
      const respuesta = data.choices?.[0]?.message?.content || 'Se me borró el casete, pregúntame luego.';

      await sock.sendMessage(remoteJid, {
        text: `📰 *EL CHISME DEL GRUPO* 📰\n\n${respuesta.trim()}`
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en Resumen:', err?.message || err);
      return reply('❌ Ocurrió un error. Parece que los chismes estaban tan fuertes que me saturaron.');
    }
  },

  // 📝 Escucha silenciosa: El bot guarda todo lo que dicen en el grupo temporalmente
  onMessage: async ({ msg, body, pushName, remoteJid, isCommand }) => {
    // Solo guardamos si es un grupo, si no es comando, si no es el bot mismo y si hay texto
    if (!remoteJid.endsWith('@g.us') || isCommand || msg.key.fromMe || !body) return;

    const text = cleanText(body);
    
    // Ignoramos mensajes larguísimos para no saturar la memoria de la IA
    if (!text || text.length > 300) return;

    if (!chatHistory.has(remoteJid)) {
      chatHistory.set(remoteJid, []);
    }

    const history = chatHistory.get(remoteJid);
    const userName = pushName || 'Alguien';
    
    // Añadimos el nuevo mensaje al registro
    history.push({ user: userName, text });

    // Si pasamos el límite de 60 mensajes, borramos el más viejo (FIFO)
    if (history.length > MAX_HISTORY) {
      history.shift(); 
    }
  }
};
