'use strict';

const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

module.exports = {
  name: 'juez',
  aliases: ['veredicto', 'pelea'],
  category: 'inteligencia artificial',
  desc: 'SiriusBot dicta un veredicto tóxico entre 2 personas',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    try {
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      
      if (mentioned.length < 2) {
        return reply('⚖️ Para dictar sentencia necesitas mencionar a los 2 implicados.\n\n📌 *Ejemplo:*\n.juez @user1 @user2 por el terreno de la abuela');
      }

      const u1 = `@${cleanJid(mentioned[0]).split('@')[0]}`;
      const u2 = `@${cleanJid(mentioned[1]).split('@')[0]}`;
      
      // Extraemos el motivo limpiando las menciones del texto
      const motivo = args.join(' ').replace(/@\+?\d+/g, '').replace(/\d{5,}/g, '').trim() || 'por existir y dar cringe en el grupo';

      await sock.sendPresenceUpdate('composing', remoteJid);

      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return reply('❌ Falta configurar GROQ_API_KEY en el archivo .env');

      const prompt = `Eres SiriusBot, el juez supremo, corrupto y tóxico de este grupo de WhatsApp.
Tu trabajo es resolver una disputa entre ${u1} y ${u2}.
Motivo de la pelea: ${motivo}.

REGLAS ESTRICTAS:
1. Toma una decisión totalmente parcial e injusta. Dale la razón a uno y humilla brutalmente al otro.
2. Usa jerga peruana (causa, pe, mano, gil, pavo, webada, etc).
3. Sé cruel, sarcástico y burlón.
4. Termina tu veredicto con un "Caso cerrado" o un martillazo verbal.
5. Sé breve, máximo 100 palabras. No te extiendas.`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.9,
          max_tokens: 150,
          messages: [
            { role: 'system', content: 'Eres un juez de WhatsApp muy tóxico.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Error en Groq');
      
      const respuesta = data.choices?.[0]?.message?.content || 'Mi mazo se rompió, arreglen sus problemas a golpes.';

      await sock.sendMessage(remoteJid, {
        text: `⚖️ *LA CORTE SUPREMA DE SIRIUSBOT* ⚖️\n\n${respuesta}`,
        mentions: mentioned
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en Juez:', err?.message || err);
      return reply('❌ Ocurrió un error en el juzgado. Intenta de nuevo.');
    }
  }
};
