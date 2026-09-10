'use strict';

const axios = require('axios');

// 🌤️ Función para traducir los códigos numéricos del clima a emojis y texto
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

// ⏳ Función para poner la primera letra en mayúscula
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  name: 'clima',
  aliases: ['tiempo', 'hora', 'climaen'],
  category: 'utilidad',
  desc: 'Muestra la hora local, temperatura y clima de cualquier ciudad o pueblo del mundo',

  execute: async ({ sock, remoteJid, msg, args, reply }) => {
    try {
      const query = args.join(' ');
      
      if (!query) {
        return reply('❌ *Te faltó la ciudad.*\n📌 Ejemplo: *.clima Chilca, Cañete* o *.clima Monterrey*');
      }

      // ⏳ Mensaje de espera mientras el bot viaja por el mundo
      const loadMsg = await sock.sendMessage(remoteJid, { text: '🌍 _Buscando satélites y calculando husos horarios..._' }, { quoted: msg });

      // 📍 1. Buscar las coordenadas y datos del lugar (Búsqueda Inteligente)
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=es`;
      const geoRes = await axios.get(geoUrl);
      
      if (!geoRes.data.results || geoRes.data.results.length === 0) {
        await sock.sendMessage(remoteJid, { delete: loadMsg.key });
        return reply(`❌ No encontré ningún lugar llamado *"${query}"*.\nIntenta ser un poco más específico (Ej: Ciudad, País).`);
      }

      const location = geoRes.data.results[0];
      const nombreLugar = location.name;
      const region = location.admin1 ? `${location.admin1}, ` : '';
      const pais = location.country;
      const zonaHoraria = location.timezone;

      // 🌡️ 2. Buscar el clima actual usando las coordenadas exactas
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&timezone=${encodeURIComponent(zonaHoraria)}`;
      const weatherRes = await axios.get(weatherUrl);
      const climaActual = weatherRes.data.current_weather;

      // ⏱️ 3. Calcular la hora exacta en ese lugar
      // Usamos la magia de JavaScript nativo sin librerías pesadas
      const opcionesFecha = { 
        timeZone: zonaHoraria, 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true, // Formato AM/PM
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
      };
      const horaLocalRaw = new Intl.DateTimeFormat('es-ES', opcionesFecha).format(new Date());
      const horaLocal = capitalize(horaLocalRaw); // Ej: "Jueves, 15 de agosto, 04:30 PM"

      // 🎨 4. Construir la tarjeta de reporte estilo SiriusBot
      const estadoClima = getWeatherStatus(climaActual.weathercode);
      const temperatura = climaActual.temperature;
      const viento = climaActual.windspeed;

      const reporteTexto = `╭─── « 🌍 *𝗥𝗘𝗣𝗢𝗥𝗧𝗘 𝗚𝗟𝗢𝗕𝗔𝗟* » ───
│
│ 📍 *Destino:* ${nombreLugar}
│ 🗺️ *Región:* ${region}${pais}
│
├───────── ⏱️ *𝗧𝗜𝗘𝗠𝗣𝗢* ─────────
│
│ 🕒 *Hora Local:* 
│ ${horaLocal}
│ 🌐 *Zona Horaria:* ${zonaHoraria}
│
├───────── 🌡️ *𝗖𝗟𝗜𝗠𝗔* ─────────
│
│ ${estadoClima.split(' ')[0]} *Estado:* ${estadoClima.substring(2)}
│ 🌡️ *Temperatura:* ${temperatura}°C
│ 💨 *Viento:* ${viento} km/h
│
╰────────────────────────────
_Reporte generado en tiempo real por SiriusBot_ 🛰️`;

      // 🚀 5. Enviar el resultado y borrar el mensaje de carga
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      await reply(reporteTexto);

    } catch (err) {
      console.log('❌ Error en plugin clima:', err);
      return reply('❌ Ocurrió un error al contactar con el satélite meteorológico. Intenta en unos minutos.');
    }
  }
};
