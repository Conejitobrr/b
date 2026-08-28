'use strict';

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function getNumber(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

function fixTextMentions(text = '', mentioned = []) {
  let result = String(text || '');
  for (const jid of mentioned) {
    const num = getNumber(jid);
    if (num) result = result.replace(/@\S+/, `@${num}`);
  }
  return result;
}

module.exports = {
  name: 'top',
  aliases: ['top10'],
  category: 'diversión',
  desc: 'Genera un top 10 aleatorio con los miembros del grupo',

  execute: async ({ sock, remoteJid, args, msg, fromGroup, reply }) => {
    if (!fromGroup) {
      return reply('❌ Este comando solo se puede usar en grupos.');
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let text = args.join(' ').trim();

    if (mentioned.length) text = fixTextMentions(text, mentioned);
    if (!text) return reply('❌ Ingresa una temática para el Top.\n\nEjemplo:\n.top más guapos del grupo');

    try {
      const metadata = await sock.groupMetadata(remoteJid);
      let participants = metadata.participants.map(v => cleanJid(v.id));

      if (participants.length < 2) {
        return reply('❌ No hay suficientes usuarios en el grupo para hacer un Top.');
      }

      // Mezclar aleatoriamente el array de participantes
      for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
      }

      const top10 = participants.slice(0, 10);
      const emojis = ['🤓','😅','😂','😳','😎','🥵','😱','🤑','🙄','💩','🍑','🤨','🥴','🔥','👇🏻','😔','👀','🌚'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

      let textTop = `*${randomEmoji} TOP 10 ${text.toUpperCase()} ${randomEmoji}*\n\n`;

      top10.forEach((user, i) => {
        const pos = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
        textTop += `${pos} @${getNumber(user)}\n`;
      });

      const mentions = [...new Set([...top10, ...mentioned])];

      await sock.sendMessage(remoteJid, { text: textTop, mentions }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en top:', e);
      await reply('❌ Ocurrió un error al intentar leer a los participantes del grupo.');
    }
  }
};
