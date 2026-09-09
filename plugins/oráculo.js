'use strict';

module.exports = {
  name: 'oraculo',
  aliases: ['consejo', 'psicologo', 'basado'],
  category: 'inteligencia artificial',
  desc: 'Recibe una cachetada de realidad sobre tus problemas',

  execute: async ({ sock, msg, remoteJid, args, pushName, reply }) => {
    try {
      const problema = args.join(' ').trim();
      
      if (!problema) {
        return reply('🔮 Dime tu problema para destruirte la autoestima (y de paso aconsejarte).\n\n📌 *Ejemplo:*\n.consejo mi ex me volvió a escribir');
      }

      await sock.sendPresenceUpdate('composing', remoteJid);

      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) return reply('❌ Falta configurar GROQ_API_KEY en el archivo .env');

      const prompt = `Eres SiriusBot, el oráculo y psicólogo más basado, tóxico y sin filtros del Perú.
El usuario ${pushName} te pide ayuda con este triste problema: "${problema}".

REGLAS ESTRICTAS:
1. NO seas empático. Dale una cachetada de realidad.
2. Búrlate de su miseria y de lo ingenuo/a que es antes de darle el "consejo".
3. Usa jerga peruana callejera pero inteligente (causa, mano, gil, pavo, tarao, ptm, etc).
4. El consejo final debe ser lógico pero dicho de la forma más cruda posible.
5. Sé conciso y directo, máximo 120 palabras.`;

      // 🤖 Conexión directa idéntica a tu ai.js
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b', // 🔥 Fijado directamente al modelo que funciona perfecto
          temperature: 0.9,
          max_tokens: 400, // 🔥 Aumentado para que no se corte a medias
          messages: [
            { role: 'system', content: 'Eres un psicólogo de WhatsApp sumamente crudo y sarcástico.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Error en Groq');
      
      const respuesta = data.choices[0].message.content.trim();

      await sock.sendMessage(remoteJid, {
        text: `🔮 *EL ORÁCULO BASADO RESPONDE* 🔮\n\n${respuesta}`
      }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en Oráculo:', err.message || err);
      return reply('❌ Ocurrió un error. Se me cruzaron los cables espirituales pe.');
    }
  }
};
