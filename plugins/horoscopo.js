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

// 🛡️ Bóveda de emergencia por si TODAS las APIs de internet caen
const fallbackPredicciones = [
  "Los astros indican que hoy es un día de reflexión. Un cambio inesperado se acerca, mantente atento a las señales.",
  "Tu energía está en su punto máximo. Aprovecha para cerrar ese ciclo que dejaste pendiente.",
  "La alineación de los planetas te favorece en lo económico hoy, pero cuidado con las decisiones impulsivas.",
  "Hoy alguien intentará contactarte. Piensa bien si vale la pena abrir esa puerta nuevamente.",
  "No dejes que la frustración te domine. Respira hondo, la solución llegará al final del día.",
  "Estás en un momento de transición. Confía en tu intuición, te guiará al lugar correcto.",
  "Una pequeña sorpresa cambiará tu humor hoy. Mantén los ojos abiertos a los detalles."
];

// 🌐 Traductor en tiempo real usando la API pública de Google (Gratis)
async function traducir(texto) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(texto)}`;
    const res = await fetch(url);
    const json = await res.json();
    return json[0].map(item => item[0]).join('');
  } catch (err) {
    return texto; // Si falla el traductor, lo manda en inglés pero no crashea
  }
}

// 🧮 Generador de suerte basado en el DÍA y el USUARIO (Cambia a la medianoche)
function generarSuerteDiaria(sender, max) {
  const fecha = new Date();
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

    const inputSigno = args[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const dataSigno = signosValidos[inputSigno];

    if (!dataSigno) {
      return reply('❌ Ese signo no existe o está mal escrito. Intenta de nuevo.');
    }

    const msgEspera = await sock.sendMessage(remoteJid, { text: `⏳ Consultando a los astros para *${dataSigno.nombre}*...` }, { quoted: msg });

    let prediccionReal = "";

    try {
      // 📡 INTENTO 1: API de Ohmanda (Súper estable)
      const res1 = await fetch(`https://ohmanda.com/api/horoscope/${dataSigno.en}/`);
      const json1 = await res1.json();
      
      if (json1 && json1.horoscope) {
        prediccionReal = await traducir(json1.horoscope);
      } else {
        throw new Error("Ohmanda falló");
      }

    } catch (error1) {
      try {
        // 📡 INTENTO 2: API Secundaria (Fly.dev)
        const res2 = await fetch(`https://horoscope-api.fly.dev/api/horoscope/${dataSigno.en}`);
        const json2 = await res2.json();
        
        if (json2 && json2.horoscope) {
          prediccionReal = await traducir(json2.horoscope);
        } else {
          throw new Error("Fly.dev falló");
        }
      } catch (error2) {
        // 🛡️ FALLBACK: Si todo el internet colapsa, usamos la bóveda interna
        console.log(`⚠️ APIs de horóscopo caídas. Usando generador local para ${sender}`);
        prediccionReal = fallbackPredicciones[generarSuerteDiaria(sender + 'fallback', fallbackPredicciones.length)];
      }
    }

    // 🎲 Generar estadísticas de suerte
    const numSuerte = generarSuerteDiaria(sender + 'num', 100) + 1; 
    const colorHoy = colores[generarSuerteDiaria(sender + 'color', colores.length)];
    
    let compatibleHoy = signosArr[generarSuerteDiaria(sender + 'comp', signosArr.length)];
    if (compatibleHoy.includes(dataSigno.nombre)) {
       compatibleHoy = signosArr[(generarSuerteDiaria(sender + 'comp', signosArr.length) + 1) % signosArr.length];
    }

    // 📝 Armar el diseño
    const txt = `✨ *HORÓSCOPO DIARIO REAL* ✨\n\n` +
                `🔮 *Signo:* ${dataSigno.nombre}\n` +
                `👤 *Usuario:* @${cleanNumber(sender)}\n\n` +
                `📖 *Predicción de hoy:*\n_${prediccionReal}_\n\n` +
                `────────────────\n` +
                `🍀 *Número de la suerte:* ${numSuerte}\n` +
                `🎨 *Color del día:* ${colorHoy}\n` +
                `🤝 *Compatible con:* ${compatibleHoy}`;

    // 📤 Editar el mensaje
    try {
      return await sock.sendMessage(remoteJid, { text: txt, edit: msgEspera.key, mentions: [sender] });
    } catch (e) {
      return await sock.sendMessage(remoteJid, { text: txt, mentions: [sender] });
    }
  }
};
