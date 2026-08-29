'use strict';

// 🔥 FUNCIONES EXACTAS PARA MENCIONES AZULES
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTargetInfo(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  
  const rawJid = quoted || mentioned;
  
  if (rawJid) {
    const target = cleanJid(rawJid);
    const pureNumber = cleanNumber(target);
    return { isMention: true, target, visualText: `@${pureNumber}` };
  }

  const text = args.join(' ').trim();
  if (text) {
    return { isMention: false, target: null, visualText: text };
  }

  return null;
}

function getPercent(max = 500) {
  return Math.floor(Math.random() * (max + 1));
}

function upperText(text = '') {
  return String(text || '').toUpperCase();
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function barra(percent = 0) {
  const total = 16;
  const filled = Math.round((percent / 100) * total);
  const empty = Math.max(0, total - filled);
  return `《${'█'.repeat(filled)}${'░'.repeat(empty)}》 ${percent}%`;
}

function loadingText(command, percent) {
  return `${barra(percent)}\n\n_Calculando porcentaje de ${command}..._`;
}

const RESPONSES = {
  gay: target => `_*${upperText(target)}* *ES 🏳️‍🌈* *${getPercent()}%* *GAY, QUE PUTAZOOO*_`,
  lesbiana: target => `_*${upperText(target)}* *ES 🏳️‍🌈* *${getPercent()}%* *DE ENERGÍA ARCOÍRIS, QUE LESBIANA*_`,
  pajero: target => `_*${upperText(target)}* *ES 😏💦* *${getPercent()}%* *PAJERO*_`,
  pajera: target => `_*${upperText(target)}* *ES 😏💦* *${getPercent()}%* *PAJERA*_`,
  puto: target => `_*${upperText(target)}* *ES 🔥* *${getPercent()}%* *PUTO, MÁS INFORMACIÓN A SU PRIVADO 🔥🥵 XD*_`,
  puta: target => `_*${upperText(target)}* *ES 🔥* *${getPercent()}%* *PUTA, MÁS INFORMACIÓN A SU PRIVADO 🔥🥵 XD*_`,
  manco: target => `_*${upperText(target)}* *ES* *${getPercent()}%* *MANCO 💩*_`,
  manca: target => `_*${upperText(target)}* *ES* *${getPercent()}%* *MANCA 💩*_`,
  rata: target => `_*${upperText(target)}* *ES* *${getPercent()}%* *RATA 🐁 COME QUESO 🧀*_`,
  prostituto: target => `_*${upperText(target)}* *ES 🫦* *${getPercent()}%* *🫦👅, QUIEN QUIERE DE SUS SERVICIOS? XD*_`,
  prostituta: target => `_*${upperText(target)}* *ES 🫦* *${getPercent()}%* *🫦👅, QUIEN QUIERE DE SUS SERVICIOS? XD*_`
};

module.exports = {
  name: 'gay', 
  aliases: [
    'lesbiana', 'pajero', 'pajera', 'puto', 'puta', 
    'manco', 'manca', 'rata', 'prostituta', 'prostituto'
  ],
  category: 'diversión',
  desc: 'Calcula tu porcentaje en diferentes categorías',

  execute: async ({ sock, remoteJid, msg, args, commandName, reply }) => {
    try {
      // 1. Obtener la información separada y blindada de la mención o texto
      const targetInfo = getTargetInfo(msg, args);

      if (!targetInfo) {
        return reply(`❌ Ingresa el @tag de alguien o su nombre.\n\nEjemplo:\n.${commandName} @usuario\n.${commandName} Sirius`);
      }

      // Validar comando
      const cmdKey = RESPONSES[commandName] ? commandName : 'gay';
      const responseFn = RESPONSES[cmdKey];

      // Mención separada: Solo se usa en el array interno de WhatsApp si es un @tag
      const mentionsArr = targetInfo.isMention ? [targetInfo.target] : [];
      
      // ✅ 25%
      const sent = await sock.sendMessage(remoteJid, {
        text: loadingText(cmdKey, 25),
        mentions: mentionsArr
      }, { quoted: msg });

      await sleep(1200);

      // ✅ 50%
      await sock.sendMessage(remoteJid, {
        text: loadingText(cmdKey, 50),
        edit: sent.key,
        mentions: mentionsArr
      });

      await sleep(1200);

      // ✅ 75%
      await sock.sendMessage(remoteJid, {
        text: loadingText(cmdKey, 75),
        edit: sent.key,
        mentions: mentionsArr
      });

      await sleep(1200);

      // ✅ RESULTADO FINAL (Con la mención azul real)
      await sock.sendMessage(remoteJid, {
        text: responseFn(targetInfo.visualText),
        edit: sent.key,
        mentions: mentionsArr
      });

    } catch (err) {
      console.log('❌ Error en bromas:', err?.message || err);
      return reply('❌ Ocurrió un error al ejecutar la animación.');
    }
  }
};
