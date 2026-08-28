'use strict';

// ⏱️ Usamos la memoria RAM para los tiempos de espera (más rápido y no gasta base de datos)
const cooldowns = new Map();
const BASE_COOLDOWN = 10 * 60 * 1000; // 10 minutos

const trabajos = [
  '👨‍🍳 Trabajaste de chef preparando anticuchos', '🚕 Fuiste taxista toda la noche',
  '🧹 Limpiaste una mansión enorme', '📦 Repartiste paquetes bajo el sol',
  '🍕 Entregaste pizzas en moto', '🎮 Streameaste una partida épica',
  '🧑‍💻 Arreglaste una PC llena de virus', '🛵 Hiciste delivery de madrugada',
  '🐶 Paseaste perros finos', '🧽 Lavaste carros en la avenida',
  '🎤 Cantaste en un karaoke y te pagaron', '👷 Trabajaste en construcción',
  '🛒 Ayudaste en un mercado', '🧑‍🏫 Diste clases particulares',
  '📱 Reparaste celulares', '🧑‍🌾 Cosechaste papas', '🎨 Pintaste una casa completa',
  '🪛 Arreglaste una tubería', '💈 Cortaste cabello como barbero',
  '🕵️ Trabajaste de detective privado', '🧙 Vendiste pociones raras',
  '🛡️ Cuidaste una discoteca', '🎭 Actuaste en una novela turca',
  '🧃 Vendiste jugos en la esquina', '🌮 Preparaste tacos en un evento',
  '🧊 Vendiste hielo en pleno verano', '🎰 Trabajaste cuidando máquinas tragamonedas',
  '📸 Fuiste fotógrafo en una boda', '🪩 Animaste una fiesta patronal',
  '🐟 Vendiste pescado fresco', '🧱 Cargaste ladrillos todo el día',
  '🧑‍🚒 Apagaste un incendio pequeño', '🚚 Fuiste ayudante de mudanza',
  '🧼 Lavaste platos en un restaurante', '🧑‍⚖️ Ayudaste a organizar papeles legales',
  '🎧 Fuiste DJ en una fiesta', '🪴 Cuidaste plantas de una señora',
  '🦺 Trabajaste como seguridad', '🧑‍🍳 Vendiste salchipapas',
  '🛍️ Atendiste una tienda', '🧑‍🔬 Probaste experimentos raros',
  '🧟 Actuaste como zombie en una película', '🐔 Vendiste pollos a la brasa',
  '🪙 Buscaste monedas perdidas', '🏖️ Vendiste raspadillas en la playa',
  '🚿 Arreglaste una ducha eléctrica', '🚌 Fuiste cobrador de combi',
  '📚 Ordenaste libros en una biblioteca', '🧑‍🚀 Simulaste ser astronauta por TikTok',
  '🥑 Vendiste paltas carísimas en el mercado', '🥤 Preparaste emoliente en la esquina en pleno frío',
  '🛺 Manejaste mototaxi sorteando el tráfico', '🎤 Fuiste cómico ambulante en la plaza y diste risa',
  '💻 Programaste un bot para WhatsApp sin errores', '👻 Fuiste cazafantasmas en una casa abandonada',
  '🐕 Bañaste perros que no querían bañarse en una veterinaria', '🎸 Tocaste guitarra en los micros y te dieron propina',
  '👕 Vendiste ropa en Gamarra como todo un experto', '⚽ Fuiste árbitro en una pichanga de barrio picante',
  '🤡 Fuiste payaso en una fiesta infantil agotadora', '👨‍🔧 Arreglaste la licuadora de la vecina',
  '📱 Fuiste tiktoker por un día y tu video se hizo viral', '🛒 Fuiste jalador en el centro comercial a puro pulmón',
  '🚲 Repartiste comida en bicicleta bajo la lluvia'
];

const fracasos = [
  '💀 Te quedaste dormido en el trabajo', '😵 Rompiste algo caro sin querer',
  '🐀 Saliste corriendo por una rata gigante', '📉 Invertiste tu sueldo en una mala idea',
  '🫠 Te estafaron con un trabajo falso', '🚓 Te confundieron con el ladrón y perdiste tiempo',
  '🤦‍♂️ Te equivocaste de pedido y tu jefe te gritó', '🐕 Un perro callejero te persiguió y perdiste la mercancía',
  '🌧️ Llovió fortísimo y se arruinó lo que estabas vendiendo', '📱 Te distrajiste viendo TikToks y te despidieron',
  '💸 Te pagaron con billetes falsos y no te diste cuenta'
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime(ms) {
  const min = Math.ceil(ms / 60000);
  return `${min} minuto(s)`;
}

module.exports = {
  name: 'trabajar',
  aliases: ['work', 'chambear'],
  category: 'economía',
  desc: 'Trabaja para ganar experiencia y dinero',

  execute: async ({ sock, msg, remoteJid, sender, userData, db, reply }) => {
    const now = Date.now();
    const lastWork = cooldowns.get(sender) || 0;
    
    // 💎 Beneficio Premium: Tienen solo la mitad del tiempo de espera (5 mins)
    const isPremium = userData.premium === true || Number(userData.premiumUntil || 0) > now;
    const userCooldown = isPremium ? BASE_COOLDOWN / 2 : BASE_COOLDOWN;
    
    const remaining = userCooldown - (now - lastWork);

    if (remaining > 0) {
      return reply(`⏳ Estás cansado.\nVuelve a chambear en *${formatTime(remaining)}*.${isPremium ? '\n_(💎 Bono Premium: Tiempos de espera reducidos a la mitad)_' : ''}`);
    }

    // 12% de probabilidad de fracaso
    const isFail = Math.random() < 0.12;

    if (isFail) {
      // ⚠️ En lugar de quitar XP (lo cual rompe el cálculo de niveles), les damos una penalización de tiempo
      cooldowns.set(sender, now + (5 * 60 * 1000)); // +5 mins extra de penalización
      
      const textoFracaso = `╭─❖「 *DÍA DE MALA SUERTE* 」
│ ${pick(fracasos)}
│
│ 💸 Ganancia: *0 XP*
│ ⏳ Penalidad: *Has perdido 5 minutos extra recuperándote.*
╰─────────────────`;
      return sock.sendMessage(remoteJid, { text: textoFracaso }, { quoted: msg });
    }

    // ⭐ Ganancia base: 400 - 1200 XP
    let xp = Math.floor(Math.random() * 801) + 400; 

    // 📈 Beneficio por Nivel: Ganan 5% extra por cada nivel que tengan
    const levelBonusMultiplier = 1 + ((userData.level || 1) * 0.05);
    xp = Math.floor(xp * levelBonusMultiplier);

    // 💎 Beneficio Premium: 1.5x de XP
    if (isPremium) xp = Math.floor(xp * 1.5);

    // Guardar cooldown y otorgar XP
    cooldowns.set(sender, now);
    await db.addXP(sender, xp);

    const textoExito = `╭─❖「 *JORNADA LABORAL* 」
│ ${pick(trabajos)}
│
│ ⭐ Ganancia: *+${xp} XP*
│ 📈 Bono aplicado: *x${levelBonusMultiplier.toFixed(1)}* por Nivel ${userData.level || 1}
╰─────────────────`;

    await sock.sendMessage(remoteJid, { text: textoExito }, { quoted: msg });
  }
};
