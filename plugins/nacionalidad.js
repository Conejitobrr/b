'use strict';

const axios = require('axios');

// 🏳️ FUNCIÓN LIGERA: Convierte códigos de país (Ej: PE, MX) en Emojis de Bandera reales
const getFlag = (countryCode) => {
  return countryCode
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
};

module.exports = {
  name: 'nacionalidad',
  aliases: ['origen', 'pais'],
  category: 'diversión',
  desc: 'Calcula el país de origen de un nombre basándose en censos globales',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (!args[0]) {
      return reply('❌ Escribe un solo nombre para escanear.\n📌 *Ejemplo:* .nacionalidad Akira');
    }

    const nombre = args[0].toLowerCase().trim();
    const loadMsg = await sock.sendMessage(remoteJid, { text: `🌍 _Escaneando bases de datos globales para "${nombre}"..._` }, { quoted: msg });

    try {
      // 1️⃣ CONEXIÓN A LA API (Totalmente gratuita y sin llaves)
      const res = await axios.get(`https://api.nationalize.io/?name=${encodeURIComponent(nombre)}`);
      const data = res.data;

      if (!data.country || data.country.length === 0) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply(`🤔 No hay suficientes registros en el mundo para rastrear el nombre "${nombre}".`);
      }

      // 2️⃣ TRADUCTOR NATIVO (Convierte 'US' a 'Estados Unidos' sin gastar RAM)
      const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });

      let resultadosTxt = '';
      
      // Tomamos solo los 3 países con mayor probabilidad para no saturar el mensaje
      const topPaises = data.country.slice(0, 3);

      topPaises.forEach((c, index) => {
        const probabilidad = (c.probability * 100).toFixed(1);
        let nombrePais = c.country_id;
        
        try {
          nombrePais = regionNames.of(c.country_id); // Traduce al español
        } catch (e) {
          // Fallback silencioso si el país es demasiado raro
        }
        
        const bandera = getFlag(c.country_id);
        const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        
        resultadosTxt += `${medalla} *${nombrePais}* ${bandera}\n   └ Probabilidad: ${probabilidad}%\n\n`;
      });

      const nombreLimpio = data.name.charAt(0).toUpperCase() + data.name.slice(1);
      const textoFinal = `🧬 *ESCÁNER DE ORIGEN* 🧬\n\n👤 *Nombre:* ${nombreLimpio}\n\n${resultadosTxt}📈 *Datos analizados:* ${data.count.toLocaleString()} personas.`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // 3️⃣ ENVÍO DEL REPORTE
      return reply(textoFinal);

    } catch (err) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      console.log('❌ Error en comando nacionalidad:', err.message);
      return reply('❌ Ocurrió un error al conectar con los servidores del censo. Intenta de nuevo.');
    }
  }
};
