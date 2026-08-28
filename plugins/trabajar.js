'use strict';

// ⏱️ Usamos la memoria RAM para los tiempos de espera
const cooldowns = new Map();
const COOLDOWN = 10 * 60 * 1000; // 10 minutos

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
  '🤦‍♂️ Te equivocaste de pedido y te descontaron de tu sueldo', '🐕 Un perro callejero te persiguió y perdiste la mercancía',
  '🌧️ Llovió fortísimo y se arruinó lo que estabas vendiendo', '📱 Te distrajiste viendo TikToks y tu jefe te despidió',
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
  desc: 'Trabaja para ganar o perder experiencia',

  execute: async ({ sock, msg, remoteJid, sender, db, reply }) => {
    const now = Date.now();
    const lastWork = cooldowns.get(sender) || 0;
    const remaining = COOLDOWN - (now - lastWork);

    if (remaining > 0) {
      return sock.sendMessage(remoteJid, {
        text: `⏳ Ya trabajaste hace poco.\nVuelve en *${formatTime(remaining)}*.`
      }, { quoted: msg });
    }

    const isFail = Math.random() < 0.12;

    if (isFail) {
      const lost = Math.floor(Math.random() * 301) + 200; 
      
      // Restamos XP manualmente y guardamos
      const user = await db.getUser(sender);
      user.xp -= lost;
      if (user.xp < 0) user.xp = 0;
      user.level = Math.floor(user.xp / 10000) + 1;
      if (user.save) await user.save(); // Guarda en MongoDB si está activo

      cooldowns.set(sender, now);

      return sock.sendMessage(remoteJid, {
        text: `╔══════════════╗\n║ 💼 TRABAJO\n╠══════════════╣\n\n${pick(fracasos)}\n\n💸 Perdiste: *-${lost} XP*\n\n╚══════════════╝`
      }, { quoted: msg });
    }

    const xp = Math.floor(Math.random() * 801) + 400; 
    await db.addXP(sender, xp);
    cooldowns.set(sender, now);

    await sock.sendMessage(remoteJid, {
      text: `╔══════════════╗\n║ 💼 TRABAJO\n╠══════════════╣\n\n${pick(trabajos)}\n\n⭐ Ganaste: *+${xp} XP*\n\n╚══════════════╝`
    }, { quoted: msg });
  }
};
