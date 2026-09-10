'use strict';

const axios = require('axios');

// 🌤️ Traductor de códigos de clima a texto y emojis
function getWeatherStatus(code) {
  if (code === 0) return '☀️ Despejado y soleado';
  if (code === 1 || code === 2 || code === 3) return '⛅ Parcialmente nublado';
  if (code >= 45 && code <= 48) return '🌫️ Con niebla';
  if (code >= 51 && code <= 55) return '🌦️ Llovizna ligera';
  if (code >= 61 && code <= 65) return '🌧️ Lluvia continua';
  if (code >= 71 && code <= 77) return '❄️ Cayendo nieve';
  if (code >= 80 && code <= 82) return '⛈️ Lluvia fuerte / Aguaceros';
  if (code >= 95) return '🌩️ Tormenta eléctrica';
  return '🌍 Clima inestable';
}

// ⏳ Primera letra en mayúscula
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  name: 'clima',
  aliases: ['tiempo', 'hora', 'climaen'],
  category: 'utilidad',
  desc: 'Muestra la hora, clima y ubicación exacta de cualquier lugar del mundo',

  execute: async ({ sock, remoteJid, msg, args, reply }) => {
    try {
      const query = args.join(' ');
      
      if (!query) {
        return reply('❌ *Falta el lugar.*\n📌 Ejemplo: *.clima Chilca, Cañete, Lima* o *.clima Monterrey*');
      }

      // ⏳ Mensaje de espera (Búsqueda satelital)
      const loadMsg = await sock.sendMessage(remoteJid, { text: '🌍 _Buscando coordenadas exactas en el mapa..._' }, { quoted: msg });

      // 📍 1. BÚSQUEDA AVANZADA CON OPENSTREETMAP
      // Este buscador sí entiende comas, provincias, departamentos y países exactos
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`;
      const geoRes = await axios.get(geoUrl, {
        headers: { 'User-Agent': 'SiriusBot/1.0 (NodeJS)' } // Requisito de OSM
      });
      
      if (!geoRes.data || geoRes.data.length === 0) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply(`❌ No encontré ningún lugar exacto para *"${query}"*.\nRevisa la ortografía o intenta usar comas (Ej: Ciudad, Provincia, País).`);
      }

      const location = geoRes.data[0];
      const lat = location.lat;
      const lon = location.lon;
      
      // display_name nos da el formato perfecto: "Chilca, Provincia de Cañete, Lima, Perú"
      const nombreCompleto = location.display_name; 

      // 🌡️ 2. OBTENER CLIMA EXACTO CON COORDENADAS (Open-Meteo)
      // timezone=auto hace que nos devuelva la zona horaria precisa de esas coordenadas
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`;
      const weatherRes = await axios.get(weatherUrl);
      const dataClima = weatherRes.data;
      const actual = dataClima.current;
      const zonaHoraria = dataClima.timezone;

      // ⏱️ 3. CALCULAR HORA Y FECHA CON PRECISIÓN
      const dateNow = new Date();
      const opcionesHora = { timeZone: zonaHoraria, hour: '2-digit', minute: '2-digit', hour12: true };
      const opcionesFecha = { timeZone: zonaHoraria, weekday: 'long', day: 'numeric', month: 'long' };
      
      const horaLocal = new Intl.DateTimeFormat('es-ES', opcionesHora).format(dateNow).toUpperCase();
      const fechaLocal = capitalize(new Intl.DateTimeFormat('es-ES', opcionesFecha).format(dateNow));

      // 🎨 4. DISEÑO VISUAL MEJORADO (Estilo Widget)
      const estadoClima = getWeatherStatus(actual.weather_code);
      const temperatura = actual.temperature_2m;
      const humedad = actual.relative_humidity_2m;
      const viento = actual.wind_speed_10m;

      const reporteTexto = `╭─── « 🌍 𝗦𝗜𝗥𝗜𝗨𝗦 𝗪𝗘𝗔𝗧𝗛𝗘𝗥 » ───
│
│ 📍 *Ubicación Exacta:* 
│ ${nombreCompleto}
│
├───────── ⏱️ *𝗛𝗢𝗥𝗔𝗥𝗜𝗢* ─────────
│
│ 🕒 *Hora Local:* ${horaLocal}
│ 📅 *Fecha:* ${fechaLocal}
│ 🌐 *Zona:* ${zonaHoraria}
│
├───────── 🌡️ *𝗖𝗟𝗜𝗠𝗔 𝗔𝗖𝗧𝗨𝗔𝗟* ─────────
│
│ ${estadoClima.split(' ')[0]} *Estado:* ${estadoClima.substring(2)}
│ 🌡️ *Temperatura:* ${temperatura} °C
│ 💧 *Humedad:* ${humedad}%
│ 💨 *Viento:* ${viento} km/h
│
╰──────────────────────────────
_SiriusBot Global Satellite_ 🛰️`;

      // 🚀 5. ENVIAR RESULTADO
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      await reply(reporteTexto);

    } catch (err) {
      console.log('❌ Error en plugin clima:', err);
      return reply('❌ Ocurrió un error de conexión con los satélites. Intenta más tarde.');
    }
  }
};
