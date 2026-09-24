'use strict';

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// 🎭 BASE DE DATOS DE SITUACIONES RIDÍCULAS Y TÓXICAS
const ESCENARIOS = [
  "terminar en la cárcel por robarse un chicle en la tienda",
  "perder todo su XP apostando en el casino de SiriusBot",
  "tropezarse con el aire y romperse un pie",
  "sobrevivir a un apocalipsis zombie solo porque los zombies lo ignoraron",
  "casarse con un personaje de anime",
  "vender su riñón para comprarse un teléfono nuevo",
  "ser secuestrado por extraterrestres y que lo devuelvan por insoportable",
  "llorar porque se le cayó el pan con el lado de la mantequilla hacia abajo",
  "irse a dormir a las 8 PM un viernes mientras todos están de fiesta",
  "comer tierra pensando que era chocolate",
  "olvidar su propio nombre en un examen importante",
  "pelear con un perro callejero por un pedazo de pan y perder",
  "gastar todo su sueldo el mismo día que le pagan",
  "ser arrestado por faltarle el respeto a la policía",
  "terminar viviendo debajo de un puente por ludópata",
  "creer firmemente que la Tierra es plana",
  "escribirle a su ex a las 3 de la mañana llorando",
  "confundir el jabón con queso y darle una mordida",
  "ser el primero en morir si estuvieran en una película de terror",
  "quedarse atrapado en un baño público sin papel higiénico",
  "adoptar 15 gatos y quedarse soltero/a para toda la vida",
  "perder su celular mientras lo tiene en la mano",
  "llegar tarde a su propia boda",
  "enamorarse de alguien de otro país que resulta ser un perfil falso",
  "quemar la cocina intentando hacer cereal con leche"
];

module.exports = {
  name: 'probable',
  aliases: ['masprobable', 'quien', 'probabilidad'],
  category: 'diversión',
  desc: 'Descubre quién es más probable de hacer algo en el grupo',

  execute: async ({ sock, msg, remoteJid, args, fromGroup, reply }) => {
    // Validamos que solo se use en grupos para poder etiquetar a alguien
    if (!fromGroup) return reply('❌ Este juego no tiene sentido en privado. Úsalo en un grupo.');

    try {
      // 1️⃣ OBTENEMOS LA LISTA DE PARTICIPANTES DEL GRUPO
      const metadata = await sock.groupMetadata(remoteJid);
      const participants = metadata.participants.map(p => cleanJid(p.id));
      
      if (participants.length < 2) {
        return reply('❌ Necesito que haya más gente en el grupo para jugar a esto.');
      }

      // 2️⃣ ELEGIMOS LA VÍCTIMA AL AZAR
      const randomUser = pick(participants);
      const userNum = cleanNumber(randomUser);

      // 3️⃣ DETERMINAMOS EL ESCENARIO (Manual o Automático)
      let customText = args.join(' ').trim();
      let escenario = customText ? customText : pick(ESCENARIOS);

      // Pequeño filtro de gramática (si el usuario escribe ".probable de caerse", le quitamos el "de" para que no repita "De... de caerse")
      if (escenario.toLowerCase().startsWith('de ')) escenario = escenario.slice(3).trim();
      if (escenario.toLowerCase().startsWith('que ')) escenario = escenario.slice(4).trim();

      // 4️⃣ CONSTRUIMOS EL MENSAJE FINAL
      const txt = `🎯 *¿QUIÉN ES MÁS PROBABLE?* 🎯\n\n🤔 *De...* ${escenario}?\n\n👉 Definitivamente es @${userNum} 🤡`;

      return sock.sendMessage(remoteJid, { text: txt, mentions: [randomUser] }, { quoted: msg });

    } catch (e) {
      console.log('❌ Error en probable.js:', e);
      return reply('❌ Ocurrió un error al escanear a los miembros del grupo.');
    }
  }
};
