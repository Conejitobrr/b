'use strict';

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getTarget(msg, args) {
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return cleanJid(quoted);
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (mentioned) return cleanJid(mentioned);
  if (args && args[0]) {
    const cleanArgs = args[0].replace(/\D/g, '');
    if (cleanArgs) return `${cleanArgs}@s.whatsapp.net`;
  }
  return null;
}

const emojis = ['💀', '🤡', '🗑️', '🚮', '💩', '📉', '🐒', '🐷', '🐀', '🤓', '🦠', '🤮', '🤧', '🤢'];

const insultos = [
  'eres la razón por la que el champú tiene instrucciones 🧴🤓',
  'si la estupidez volara, serías un aeropuerto internacional ✈️🤡',
  'no eres feo/a, solo tienes una cara difícil de mirar 🫣💀',
  'tu árbol genealógico debe ser un círculo ⭕🐒',
  'aportas a la sociedad lo mismo que la "h" en "hueso" 🦴🗑️',
  'si el cerebro fuera de algodón, no tendrías ni para un hisopo 🧠📉',
  'me encantaría insultarte, pero no lo haría tan bien como la naturaleza lo hizo contigo 🌿💩',
  '¿te caíste de la cuna de pequeño/a o naciste así de especial? 👶🥴',
  'tienes menos luces que un barco pirata 🏴‍☠️🕯️',
  'no eres inútil, sirves de mal ejemplo 📉🚮',
  'la envidia te mata, pero tu cara te remata 🤢💀',
  'eres el error 404 de la evolución humana 💻🐒',
  'tienes la misma utilidad que un semáforo en el GTA 🚦🚗',
  'si el sarcasmo engordara, tú serías talla XS de cerebro 🧠🤡',
  'tu coeficiente intelectual tiene temperatura ambiente 🌡️📉',
  'eres tan brillante como un agujero negro 🕳️🤓',
  'ojalá tuvieras la mitad de neuronas que de excusas 🦠🧠',
  'si fueras un premio, serías de consolación 🏅🗑️',
  'eres como un dolor de muelas: molesto y nadie te quiere 🦷🤕',
  '¿tu mamá te castigaba mirándote al espejo? 🪞💀',
  'tienes el encanto de una piedra mojada 🪨💧',
  'si la fealdad pagara impuestos, estarías en quiebra absoluta 💸🤡',
  'cada vez que hablas, un diccionario se suicida 📖🔫',
  'eres la prueba viviente de que Dios tiene un humor muy oscuro ✝️🌚',
  'no te insulto, solo describo tu triste y cruda realidad 📉🤧',
  'eres como la primera rebanada de pan bimbo, todos te ignoran 🍞🚮',
  'tu cara es la mejor campaña a favor del uso obligatorio de mascarillas 😷🗑️',
  'si fueras un software, serías Internet Explorer 🌐🐌',
  'tienes menos futuro que un submarino con puertas de madera 🚤🪵',
  'me gustaría darte la razón, pero entonces ambos seríamos idiotas 🤝🤡',
  'no sé qué me da más pereza, si escucharte o mirarte 🥱💀',
  'eres como una nube, cuando desapareces el día se pone hermoso ☁️☀️',
  'si la ignorancia diera dinero, serías billonario/a 💰🤓',
  'tu nivel de inteligencia me hace dudar de la teoría de la evolución 🦍📉',
  'eres la respuesta incorrecta a una pregunta que nadie hizo ❌🚮',
  'tienes menos carisma que una pared sin pintar 🧱🥱',
  'hasta mi WiFi tiene mejor conexión con la realidad que tú 📶🥴',
  'eres el botón de "saltar anuncio" de la vida real ⏭️🗑️',
  'si ser pesado/a fuera deporte olímpico, ya tendrías el oro 🥇🪨',
  'eres como un mosquito en la madrugada: solo sirves para molestar 🦟😡',
  'tu sola presencia es el mejor método anticonceptivo del mercado 💊💀',
  'ni el mejor filtro de Instagram puede arreglar ese desastre visual 📸🤡',
  'eres el ejemplo perfecto de lo que no quiero ser en mi vida 📉🚮',
  'tienes el atractivo visual de una pantalla rota 📱💥',
  'eres la versión humana de pisar caca descalzo 💩🦶',
  'si fueras un meme, serías de los que dan cringe en Facebook 👴🥴',
  'tienes menos gracia que un chiste contado en un funeral ⚰️📉',
  'eres como una actualización de Windows: tardas horas y lo arruinas todo 💻🤬',
  'me pregunto si respirar es automático o te cuesta concentrarte en hacerlo 🫁🐒',
  'eres la personificación exacta de un lunes por la mañana a las 6 AM ⏰💀'
];

module.exports = {
  name: 'insulto',
  aliases: ['roast', 'funar', 'quemar', 'insultar', 'basar'],
  category: 'diversión',
  desc: 'Lanza un insulto o roast aleatorio a otro usuario',

  execute: async ({ sock, msg, remoteJid, sender, args, db, reply }) => {
    try {
      const target = getTarget(msg, args);
      
      if (!target) {
        return reply('❌ Debes mencionar o responder al mensaje de quien quieres funar.\n📌 Ejemplo: *.funar @usuario*');
      }

      const me = cleanJid(sender);
      if (target === me) {
        return reply('😂 ¿Insultándote a ti mismo? Eso es caer muy bajo. Busca un psicólogo.');
      }

      const botJid = cleanJid(sock.user.id) + '@s.whatsapp.net';
      if (target === botJid) {
        return reply('🤬 ¿Me estás buscando pleito a mí? Soy un bot, tengo acceso a tu base de datos y te puedo borrar si quiero, cuidadito.');
      }

      const randomInsulto = insultos[Math.floor(Math.random() * insultos.length)];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const targetNum = cleanNumber(target);

      await sock.sendMessage(remoteJid, {
        text: `${emoji} @${targetNum}, ${randomInsulto}`,
        mentions: [target]
      }, { quoted: msg });

      // ⭐ Bono extra de XP por usar el comando
      if (db && typeof db.getUser === 'function') {
        const userData = await db.getUser(me);
        if (userData) {
          const bonusXP = Math.floor(Math.random() * 21) + 10;
          userData.xp = (userData.xp || 0) + bonusXP;
          if (userData.save) await userData.save();
        }
      }

    } catch (err) {
      console.log('❌ Error en plugin insulto:', err);
      return reply('❌ Ocurrió un error al intentar funar a ese usuario.');
    }
  }
};
