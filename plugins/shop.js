'use strict';

const fs = require('fs');
const path = path.join(process.cwd(), 'lib', 'jail.json');
if (!fs.existsSync(path.dirname(path))) fs.mkdirSync(path.dirname(path), { recursive: true });

const ITEMS = {
  ver: { key: 'verUses', name: '🎟️ Uso de .ver', price: 10000, desc: 'Permite usar .ver 1 vez' },
  spotify: { key: 'spotifyUses', name: '🎵 Uso de .spotify', price: 1500, desc: 'Permite usar .spotify 1 vez' },
  llave: { key: 'keys', name: '🔑 Llave de celda', price: 1000, desc: 'Permite salir de la cárcel 1 vez' },
  cana_pro: { key: 'cana_pro', name: '🎣 Caña Profesional', price: 30000, desc: 'Pesca con mayor éxito y más XP' },
  arma_pro: { key: 'arma_pro', name: '🏹 Arco de Cacería', price: 30000, desc: 'Caza con mayor éxito y más XP' },
  pico_pro: { key: 'pico_pro', name: '⛏️ Pico de Diamante', price: 30000, desc: 'Mina con mayor éxito y más XP' },
  caja: { key: 'cajaUses', name: '📦 Caja Sorpresa XP', price: 2000, desc: 'Contiene XP aleatorio' },
  escudo: { key: 'shieldUses', name: '🛡️ Escudo Anti-Robo', price: 5000, desc: 'Te protege del próximo robo' },
  vip: { key: 'premium', name: '💎 Pase VIP (1 Día)', price: 100000, desc: 'Bono XP y cooldown reducido al trabajar' },
  anillo: { key: 'anillo', name: '💍 Anillo de Bodas', price: 25000, desc: 'Requisito para casarte' }
};

module.exports = {
  name: 'tienda',
  aliases: ['comprar', 'shop', 'usar'],
  category: 'economía',
  desc: 'Compra ítems o usa los que ya tienes',

  execute: async ({ sock, msg, remoteJid, sender, args, commandName, db, userData, reply }) => {
    
    if (commandName === 'usar') {
      const itemKey = (args[0] || '').toLowerCase();
      const inv = userData.inventory || {};

      if (itemKey === 'llave') {
        if ((inv.keys || 0) <= 0) return reply('❌ No tienes llaves en tu inventario.');
        
        userData.inventory.keys -= 1;
        if (userData.save) await userData.save(); else await db.setUser(sender, userData);
        
        return reply('🔑 Has usado una llave de celda.');
      }

      if (itemKey === 'caja') {
        if ((inv.cajaUses || 0) <= 0) return reply('❌ No tienes cajas sorpresa.');
        userData.inventory.cajaUses -= 1;
        
        const ganar = Math.floor(Math.random() * 2000) + 500;
        userData.xp = (userData.xp || 0) + ganar;
        
        if (userData.save) await userData.save(); else await db.setUser(sender, userData);
        
        return reply(`📦 Abriste la caja y ganaste *+${ganar} XP*`);
      }
      return reply('❌ Ítem desconocido o no utilizable (solo: llave, caja).');
    }

    if (!args.length) {
      let txt = `🛒 *TIENDA SIRIUSBOT*\n\n`;
      for (const [id, item] of Object.entries(ITEMS)) {
        txt += `▪️ *${id}* (${item.price} XP)\n📝 _${item.desc}_\n\n`;
      }
      txt += `💳 *Tu saldo:* ${userData.xp || 0} XP\n📦 *Comprar:* .comprar [item] [cant]\n🔓 *Usar:* .usar [llave/caja]`;
      return reply(txt);
    }

    const itemName = args[0].toLowerCase();
    const amount = Math.max(1, Math.min(10, Number(args[1]) || 1));
    const item = ITEMS[itemName];
    
    if (!item) return reply('❌ Producto no válido. Usa *.tienda* para ver el catálogo.');

    const total = item.price * amount;
    if ((userData.xp || 0) < total) {
      return reply(`❌ No tienes suficiente XP.\nCuesta *${total} XP* pero tienes *${userData.xp || 0} XP*.`);
    }

    userData.xp -= total;
    if (!userData.inventory) userData.inventory = {};

    if (itemName === 'vip') {
      const now = Date.now();
      const currentPremium = Number(userData.premiumUntil || 0);
      const baseTime = currentPremium > now ? currentPremium : now;
      userData.premiumUntil = baseTime + (amount * 24 * 60 * 60 * 1000);
      
      if (userData.save) await userData.save(); else await db.setUser(sender, userData);
      return reply(`✅ Has adquirido *${amount} Día(s) VIP* por ${total} XP.`);
    } else {
      userData.inventory[item.key] = (userData.inventory[item.key] || 0) + amount;
      
      if (userData.save) await userData.save(); else await db.setUser(sender, userData);
      return reply(`✅ Compraste ${amount}x *${item.name}* por ${total} XP.\n🎒 Revisa tu mochila usando *.perfil*`);
    }
  }
};
