'use strict';

const signosValidos = {
  'aries': { nombre: 'Aries ♈', en: 'aries' },
  'tauro': { nombre: 'Tauro ♉', en: 'taurus' },
  'geminis': { nombre: 'Géminis ♊', en: 'gemini' },
  'cancer': { nombre: 'Cáncer ♋', en: 'cancer' },
  'leo': { nombre: 'Leo ♌', en: 'leo' },
  'virgo': { nombre: 'Virgo ♍', en: 'virgo' },
  'libra': { nombre: 'Libra ♎', en: 'libra' },
  'escorpio': { nombre: 'Escorpio ♏', en: 'scorpio' },
  'sagitario': { nombre: 'Sagitario ♐', en: 'sagittarius' },
  'capricornio': { nombre: 'Capricornio ♑', en: 'capricorn' },
  'acuario': { nombre: 'Acuario ♒', en: 'aquarius' },
  'piscis': { nombre: 'Piscis ♓', en: 'pisces' }
};

const colores = [
  "🔴 Rojo Pasión", "🔵 Azul Profundo", "🟢 Verde Esmeralda", "🟡 Amarillo Oro", 
  "⚫ Negro Misterio", "⚪ Blanco Paz", "🟣 Morado Místico", "🟠 Naranja Fuego", 
  "🟤 Marrón Tierra", "🩷 Rosa Pastel", "🔘 Gris Plata", "🩵 Cian Claro"
];

const signosArr = [
  "Aries ♈", "Tauro ♉", "Géminis ♊", "Cáncer ♋", "Leo ♌", "Virgo ♍", 
  "Libra ♎", "Escorpio ♏", "Sagitario ♐", "Capricornio ♑", "Acuario ♒", "Piscis ♓"
];

// 🌐 Traductor en tiempo real usando la API pública de Google (Gratis y sin keys)
async function traducir(texto) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(texto)}`;
    const res = await fetch(url);
    const json = await res.json();
    return json[0].map(item => item[0]).join('');
  } catch (err) {
    return "Los astros están un poco nublados hoy, pero grandes cambios se acercan a tu vida. Mantén la mente positiva y no te rindas.";
  }
}

// 🧮 Generador de suerte basado en el DÍA y el USUARIO (No cambia si preguntas 2 veces el mismo día)
function generarSuerteDiaria(sender, max) {
  const fecha = new Date();
  // Crea una "semilla" única juntando el año, mes, día y el número del usuario
  const semilla = `${fecha.getFullYear()}${fecha.getMonth()}${fecha.getDate()}${sender}`;
  
  let hash = 0;
  for (let i = 0; i < semilla.length; i++) {
    hash = semilla.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % max);
}

function cleanNumber(jid = '') { 
  return String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); 
}

module.exports = {
  name: 'horoscopo',
  aliases: ['zodiaco', 'suerte', 'horóscopo'],
  category: 'diversión',
  desc: 'Mira tu horóscopo real y actualizado del día',

  execute: async ({ sock, msg, remoteJid, sender, args, reply }) => {
    if (!args.length) {
      return reply('❌ Te faltó poner tu signo.\n📌 *Ejemplo:* .horoscopo aries\n\n*Signos:* Aries, Tauro, Géminis, Cáncer, Leo, Virgo, Libra, Escorpio, Sagitario, Capricornio, Acuario, Piscis.');
    }

    // Limpiamos tildes para que reconozca "géminis" o "geminis" por igual
    const inputSigno = args[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const dataSigno = signosValidos[inputSigno];

    if (!dataSigno) {
      return reply('❌ Ese signo no existe o está mal escrito. Intenta de nuevo.');
    }

    // Mensaje de espera porque la consulta a la API y la traducción toman un par de segundos
    const msgEspera = await sock.sendMessage(remoteJid, { text: `⏳ Consultando a los astros para *${dataSigno.nombre}*...` }, { quoted: msg });

    try {
      // 📡 Consultar API real de horóscopos diarios
      const apiUrl = `https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${dataSigno.en}&day=today`;
      const res = await fetch(apiUrl);
      const json = await res.json();
      
      let prediccionReal = "";
      
      if (json && json.data && json.data.horoscope_data) {
         // 🇪🇸 Traducir la predicción al español
         prediccionReal = await traducir(json.data.horoscope_data);
      } else {
         throw new Error("No hay datos de la API");
      }

      // 🎲 Generar estadísticas de suerte diarias fijas para el usuario
      const numSuerte = generarSuerteDiaria(sender + 'num', 100) + 1; // Número del 1 al 100
      const colorHoy = colores[generarSuerteDiaria(sender + 'color', colores.length)];
      
      let compatibleHoy = signosArr[generarSuerteDiaria(sender + 'comp', signosArr.length)];
      // Si por azar le sale su mismo signo como compatible, le damos el siguiente
      if (compatibleHoy.includes(dataSigno.nombre)) {
         compatibleHoy = signosArr[(generarSuerteDiaria(sender + 'comp', signosArr.length) + 1) % signosArr.length];
      }

      // 📝 Armar el diseño del mensaje
      const txt = `✨ *HORÓSCOPO DIARIO REAL* ✨\n\n` +
                  `🔮 *Signo:* ${dataSigno.nombre}\n` +
                  `👤 *Usuario:* @${cleanNumber(sender)}\n\n` +
                  `📖 *Predicción de hoy:*\n_${prediccionReal}_\n\n` +
                  `────────────────\n` +
                  `🍀 *Número de la suerte:* ${numSuerte}\n` +
                  `🎨 *Color del día:* ${colorHoy}\n` +
                  `🤝 *Compatible con:* ${compatibleHoy}`;

      // 📤 Editar el mensaje de "Espera" con el resultado final
      try {
        return await sock.sendMessage(remoteJid, { text: txt, edit: msgEspera.key, mentions: [sender] });
      } catch (e) {
        return await sock.sendMessage(remoteJid, { text: txt, mentions: [sender] });
      }

    } catch (e) {
      console.log('❌ Error en horóscopo API:', e);
      return sock.sendMessage(remoteJid, { text: '❌ Los astros están fuera de mi alcance en este momento. Inténtalo más tarde.', edit: msgEspera.key });
    }
  }
};
