'use strict';

// 🛒 CATÁLOGO DE LA TIENDA
const TIENDA = {
  vip: {
    nombre: 'Pase Premium (1 Día)',
    precio: 50000,
    desc: 'Bono x1.5 de XP y tiempos de espera reducidos a la mitad',
    tipo: 'premium'
  },
  anillo: {
    nombre: 'Anillo de Compromiso',
    precio: 25000,
    desc: 'Útil para casarte con alguien del grupo (Próximamente)',
    tipo: 'item'
  },
  mascota: {
    nombre: 'Perrito Virtual',
    precio: 10000,
    desc: 'Un compañero fiel para lucir en tu perfil',
    tipo: 'item'
  },
  cafe: {
    nombre: 'Café Cargado',
    precio: 2000,
    desc: 'Un café caliente para tener energía',
    tipo: 'item'
  }
};

module.exports = {
  name: 'tienda',
  aliases: ['shop', 'comprar', 'buy'],
  category: 'economía',
  desc: 'Compra ítems y pases VIP con tu XP',

  execute: async ({ args, userData, reply }) => {
    // Si no escriben qué comprar, mostramos el catálogo
    if (!args.length) {
      let catalogo = `╭─❖「 *TIENDA SIRIUS* 」\n│ _Usa .comprar <ítem> para adquirir_\n│\n`;
      
      for (const [id, item] of Object.entries(TIENDA)) {
        catalogo += `│ 🛒 *${id}* - ${item.nombre}\n│ 💰 Precio: ${item.precio} XP\n│ 📝 ${item.desc}\n│\n`;
      }
      
      catalogo += `╰─────────────────\n💡 *Tu saldo actual:* ${userData.xp || 0} XP`;
      return reply(catalogo);
    }

    const compra = args[0].toLowerCase();
    const item = TIENDA[compra];

    if (!item) {
      return reply('❌ Ese ítem no existe en la tienda.\nUsa *.tienda* para ver el catálogo.');
    }

    // Verificar si tiene saldo suficiente
    if ((userData.xp || 0) < item.precio) {
      return reply(`❌ Fondos insuficientes.\nNecesitas *${item.precio} XP* pero solo tienes *${userData.xp || 0} XP*. ¡Ponte a *.chambear*!`);
    }

    // Descontar XP y recalcular el nivel
    userData.xp -= item.precio;
    userData.level = Math.floor(userData.xp / 10000) + 1;
    if (userData.level < 1) userData.level = 1;

    // Entregar la compra
    if (item.tipo === 'premium') {
      const now = Date.now();
      const currentPremium = Number(userData.premiumUntil || 0);
      const baseTime = currentPremium > now ? currentPremium : now;
      
      userData.premiumUntil = baseTime + (24 * 60 * 60 * 1000); // Añade 24 horas
      
      if (userData.save) await userData.save();
      return reply(`✅ ¡Compra exitosa!\nHas adquirido *${item.nombre}*.\n\n💎 Tu estado Premium ha sido activado/extendido por 24 horas.`);
    } 
    else if (item.tipo === 'item') {
      if (!userData.inventory) userData.inventory = {};
      userData.inventory[compra] = (userData.inventory[compra] || 0) + 1;
      
      if (userData.save) await userData.save();
      return reply(`✅ ¡Compra exitosa!\nHas adquirido *${item.nombre}* por ${item.precio} XP.\n\n🎒 Revisa tu mochila usando *.perfil*`);
    }
  }
};
