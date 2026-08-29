'use strict';

const fs = require('fs');
const path = require('path');

const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');
if (!fs.existsSync(path.dirname(JAIL_PATH))) fs.mkdirSync(path.dirname(JAIL_PATH), { recursive: true });

function loadJail() {
  try { return JSON.parse(fs.readFileSync(JAIL_PATH, 'utf8') || '{"jailed":{}}'); } catch { return { jailed: {} }; }
}
function saveJail(data) {
  try { fs.writeFileSync(JAIL_PATH, JSON.stringify(data, null, 2)); } catch {}
}

const ITEMS = {
  ver: { key: 'verUses', name: '🎟️ Uso de .ver', price: 10000, desc: 'Permite usar .ver 1 vez' },
  spotify: { key: 'spotifyUses', name: '🎵 Uso de .spotify', price: 1500, desc: 'Permite usar .spotify 1 vez' },
  llave: { key: 'keys', name: '🔑 Llave de celda', price: 1000, desc: 'Permite salir de la cárcel 1 vez' },
  cana_pro: { key: 'cana_pro', name: '🎣 Caña Profesional', price: 30000, desc: 'Pesca con mayor éxito y más XP' },
  arma_pro: { key: 'arma_pro', name: '🏹 Arco de Cacería', price: 30000, desc: 'Caza con mayor éxito y más XP' },
  hacha_pro: { key: 'hacha_pro', name: '🪓 Hacha de Leñador', price: 30000, desc: 'Tala con mayor éxito y más XP' },
  pico_pro: { key: 'pico_pro', name: '⛏️ Pico de Diamante', price: 30000, desc: 'Mina con mayor éxito y más XP' },
  caja: { key: 'cajaUses', name: '📦 Caja Sorpresa XP', price: 2000, desc: 'Contiene XP aleatorio' },
  escudo: { key: 'shieldUses', name: '🛡️ Escudo Anti-Robo', price: 2500, desc: 'Te protege del próximo robo' },
  vip: { key: 'premium', name: '💎 Pase VIP (1 Día)', price: 50000, desc: 'Bono XP y cooldown reducido al trabajar' },
  mascota: { key: 'mascota', name: '🐶 Licencia de Mascota', price: 50000, desc: 'Permite adoptar un animal en el centro' },
  anillo: { key: 'anillo', name: '💍 Anillo de Bodas', price: 25000, desc: 'Requisito para casarte' }
};

module.exports = {
  name: 'tienda',
  aliases: ['comprar', 'shop', 'usar'],
  category: 'economía',
  desc: 'Compra ítems o usa los que ya tienes',

  execute: async ({ sock, msg, remoteJid, sender, args, commandName, db, reply }) => {
    
    // 🔥 PASO 1: LEER DIRECTAMENTE DESDE LA BASE DE DATOS
    const user = await db.getUser(sender);
    if (!user.inventory) user.inventory = {};

    if (commandName === 'usar') {
      const itemKey = (args[0] || '').toLowerCase();

      if (itemKey === 'llave') {
        if ((user.inventory.keys || 0) <= 0) return reply('❌ No tienes llaves en tu inventario.');
        
        const jailDB = loadJail();
        if (!jailDB.jailed[sender]) return reply('✅ No estás arrestado.');
        
        user.inventory.keys -= 1;
        await db.setUser(sender, user); // 🔥 GUARDAR
        
        delete jailDB.jailed[sender];
        saveJail(jailDB);
        return reply('🔑 Has usado una llave de celda y escapaste de prisión.');
      }

      if (itemKey === 'caja') {
        if ((user.inventory.cajaUses || 0) <= 0) return reply('❌ No tienes cajas sorpresa.');
        
        user.inventory.cajaUses -= 1;
        const ganar = Math.floor(Math.random() * 2000) + 500;
        user.xp = (user.xp || 0) + ganar;
        
        await db.setUser(sender, user); // 🔥 GUARDAR
        
        return reply(`📦 Abriste la caja y ganaste *+${ganar} XP*`);
      }
      return reply('❌ Ítem desconocido o no utilizable (solo: llave, caja).');
    }

    if (!args.length) {
      let txt = `🛒 *TIENDA SIRIUSBOT*\n\n`;
      for (const [id, item] of Object.entries(ITEMS)) {
        txt += `▪️ *${id}* (${item.price} XP)\n📝 _${item.desc}_\n\n`;
      }
      txt += `💳 *Tu saldo:* ${user.xp || 0} XP\n📦 *Comprar:* .comprar [item] [cant]\n🔓 *Usar:* .usar [llave/caja]`;
      return reply(txt);
    }

    const itemName = args[0].toLowerCase();
    const amount = Math.max(1, Math.min(10, Number(args[1]) || 1));
    const item = ITEMS[itemName];
    
    if (!item) return reply('❌ Producto no válido. Usa *.tienda* para ver el catálogo.');

    const total = item.price * amount;
    if ((user.xp || 0) < total) {
      return reply(`❌ No tienes suficiente XP.\nCuesta *${total} XP* pero tienes *${user.xp || 0} XP*.`);
    }

    // Descontar pago
    user.xp -= total;

    if (itemName === 'vip') {
      const now = Date.now();
      const currentPremium = Number(user.premiumUntil || 0);
      const baseTime = currentPremium > now ? currentPremium : now;
      user.premiumUntil = baseTime + (amount * 24 * 60 * 60 * 1000);
      
      await db.setUser(sender, user); // 🔥 GUARDAR
      return reply(`✅ Has adquirido *${amount} Día(s) VIP* por ${total} XP.`);
    } else {
      user.inventory[item.key] = (user.inventory[item.key] || 0) + amount;
      
      await db.setUser(sender, user); // 🔥 GUARDAR
      return reply(`✅ Compraste ${amount}x *${item.name}* por ${total} XP.\n🎒 Revisa tu mochila usando *.inventario*`);
    }
  }
};
