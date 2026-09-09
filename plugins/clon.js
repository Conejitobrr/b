'use strict';

const fs = require('fs');
const path = require('path');

const MEMORY_PATH = path.join(process.cwd(), 'lib', 'clon_memory.json');
const MAX_MESSAGES = 200; 
const GROQ_MODEL = 'openai/gpt-oss-120b'; // 🔥 Actualizado al modelo potente que sí funciona

function ensureMemory() {
  const dir = path.dirname(MEMORY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(MEMORY_PATH)) fs.writeFileSync(MEMORY_PATH, '{}');
}

function loadMemory() {
  ensureMemory();
  try { return JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8') || '{}'); } catch { return {}; }
}

function saveMemory(data) {
  ensureMemory();
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(data, null, 2));
}

function cleanText(text = '') { return String(text).replace(/\s+/g, ' ').trim(); }
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);

  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);

  if (args && args[0] && args[0].includes('@')) {
    const cleanArgs = args[0].replace(/\D/g, '');
    if (cleanArgs) return `${cleanArgs}@s.whatsapp.net`;
  }
  return null;
}

function removeTargetFromQuestion(args = []) {
  return args.join(' ').replace(/@\+?\d+/g, '').replace(/\d{5,}/g, '').trim();
}

function getStyleStats(messages = []) {
  const joined = messages.join(' ');
  
  const words = joined.toLowerCase().match(/\b[a-záéíóúñ]{4,}\b/g) || [];
  const wordFreq = {};
  words.forEach(w => wordFreq[w] = (wordFreq[w] || 0) + 1);
  const topWords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);

  const emojis = joined.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu) || [];
  const laughs = joined.match(/(ja+ja+|je+je+|js+js+|ks+ks+|xd+|lo+l)/ig) || [];
  
  const usesPunctuation = /[.,!?]/.test(joined) ? 'Usa signos de puntuación.' : 'Casi NO usa signos de puntuación (escribe de corrido).';
  const lowercaseRatio = (joined.match(/[a-z]/g) || []).length / (joined.match(/[A-Z]/g) || [1]).length;
  const letterCase = lowercaseRatio > 10 ? 'Escribe casi siempre en minúsculas ignorando las reglas ortográficas.' : 'Respeta mayúsculas y minúsculas.';

  const shortSamples = messages.filter(m => m.length <= 150).slice(-30);

  return {
    emojis: [...new Set(emojis)].slice(-10),
    laughs: [...new Set(laughs)].slice(-8),
    topWords: topWords,
    style: `${letterCase} ${usesPunctuation}`,
    samples: shortSamples
  };
}

// 🤖 Conexión directa idéntica a tu ai.js para evitar fallos de respuesta vacía
async function askGroq({ targetName, question, stats }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Falta GROQ_API_KEY en .env');

  const systemPrompt = `Eres un simulador avanzado de clones de chat en WhatsApp. Tu objetivo es responder imitando PERFECTAMENTE el estilo, ortografía, jerga, muletillas y risas de una persona específica.`;

  const userPrompt = `Imita a ${targetName} basándote en estos datos de su forma de escribir:
- Estilo: ${stats.style}
- Palabras frecuentes: ${stats.topWords.join(', ') || 'Ninguna'}
- Emojis: ${stats.emojis.join(' ') || 'Ninguno'}
- Risas: ${stats.laughs.join(', ') || 'Ninguna'}

MENSAJES REALES DE ESTA PERSONA:
${stats.samples.map(x => `- ${x}`).join('\n') || '- Aún no hay suficientes mensajes guardados.'}

PREGUNTA QUE TE HACEN: "${question}"

REGLAS ESTRICTAS:
1. Responde SOLO con lo que diría esta persona, imitando sus faltas o forma de redactar.
2. NUNCA digas que eres una IA.
3. Sé directo y natural, máximo 150 tokens.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.9,
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Error en Groq');
  
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function fallbackReply(question, samples = []) {
  const base = samples.length ? samples[Math.floor(Math.random() * samples.length)] : 'no sé causa jaja';
  if (question.includes('?')) return `mmm ${base}`;
  return base;
}

module.exports = {
  name: 'clon',
  aliases: ['clone', 'imitar'],
  category: 'diversión',
  desc: 'Clona la forma de hablar de un usuario usando IA',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    try {
      const target = getTarget(msg, args);

      if (!target) {
        return reply('❌ Menciona o responde al mensaje del usuario que quieres clonar.\n\n📌 *Ejemplo:*\n.clon @usuario ¿Qué opinas de este grupo?');
      }

      await sock.sendPresenceUpdate('composing', remoteJid);

      const pureNumber = cleanNumber(target);
      const targetName = `@${pureNumber}`; 
      const question = removeTargetFromQuestion(args) || 'Dime algo random como tú hablarías';

      const memory = loadMemory();
      const messages = memory[target]?.messages || [];
      const stats = getStyleStats(messages);

      let answer;
      try {
        answer = await askGroq({ targetName, question, stats });
      } catch (e) {
        console.log('❌ Error Groq clon:', e?.message || e);
        answer = fallbackReply(question, stats.samples);
      }

      if (!answer) {
        answer = fallbackReply(question, stats.samples);
      }

      await sock.sendMessage(remoteJid, {
        text: `🎭 *Clon de ${targetName}:*\n\n${answer}`,
        mentions: [target] 
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en comando clon:', err);
      return reply('❌ Ocurrió un error al intentar invocar al clon.');
    }
  },

  onMessage: async ({ msg, body, sender, isCommand }) => {
    if (!body || !sender || isCommand || msg.key.fromMe) return;

    const text = cleanText(body);
    if (!text || text.length < 3 || text.length > 250 || /https?:\/\//i.test(text)) return;

    const target = cleanJid(sender);
    const memory = loadMemory();

    if (!memory[target]) {
      memory[target] = { messages: [] };
    }

    memory[target].messages.push(text);

    if (memory[target].messages.length > MAX_MESSAGES) {
      memory[target].messages = memory[target].messages.slice(-MAX_MESSAGES);
    }

    saveMemory(memory);
  }
};
