'use strict';

const fs = require('fs');
const path = require('path');

const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');
const INV_PATH = path.join(process.cwd(), 'lib', 'inventario.json');
const LOTERIA_PATH = path.join(process.cwd(), 'lib', 'loteria.json'); // 🎰 Nueva base de datos

if (!fs.existsSync(path.dirname(JAIL_PATH))) fs.mkdirSync(path.dirname(JAIL_PATH), { recursive: true });

function loadJail() { try { return JSON.parse(fs.readFileSync(JAIL_PATH, 'utf8') || '{"jailed":{}}'); } catch { return { jailed: {} }; } }
function saveJail(data) { try { fs.writeFileSync(JAIL_PATH, JSON.stringify(data, null, 2)); } catch {} }
function getInv() { try { return JSON.parse(fs.readFileSync(INV_PATH, 'utf8')); } catch { return {}; } }
function saveInv(data) { fs.writeFileSync(INV_PATH, JSON.stringify(data, null, 2)); }

const ITEMS = {
  ver: { key: 'verUses', name: '🎟️ Uso de .ver', price: 10000, desc: 'Permite usar .ver 1 vez' },
  spotify: { key: 'spotifyUses', name: '🎵 Uso de .spotify', price: 1500, desc: 'Permite usar .spotify 1 vez' },
  llave: { key: 'keys', name: '🔑 Llave de celda', price: 1000, desc: 'Permite salir de la cárcel 1 vez' },
  cana_pro: { key: 'cana_pro', name: '🎣 Caña Profesional', price: 30000, desc: 'Pesca con mayor éxito y más XP' },
  arma_pro: { key: 'arma_pro', name: '🏹 Arco de Cacería', price: 30000, desc: 'Caza con mayor éxito y más XP' },
  hacha_pro: { key: 'hacha_pro', name: '🪓 Hacha de Leñador', price: 30000, desc: 'Tala con mayor éxito y más XP' },
  pico_pro: { key: 'pico_pro', name: '⛏️ Pico de Diamante', price: 30000, desc: 'Mina con mayor éxito y más XP' },
  caja: { key: 'cajaUses', name: '📦 Caja Sorpresa XP', price: 2000, desc: 'Contiene XP aleatorio' },
  escudo: { key: 'shieldUses', name: '🛡️ Escudo Anti-Robo', price: 5000, desc: 'Te protege del próximo robo' },
  vip: { key: 'premium', name: '💎 Pase VIP (1 Día)', price: 50000, desc: 'Bono XP y cooldown reducido al trabajar' },
  mascota: { key: 'licencia_mascota', name: '🐶 Licencia de Mascota', price: 50000, desc: 'Permite adoptar un animal en el centro' },
  anillo: { key: 'anillo', name: '💍 Anillo de Bodas', price: 25000, desc: 'Requisito para casarte' },
  sobre: { key: 'sobre', name: '✉️ Sobre Gacha', price: 1500, desc: 'Contiene una carta al azar. Ábrelo con .abrirsobre' },
  boleto: { key: 'boleto', name: '🎫 Boleto de Lotería', price: 5000, desc: 'Participa en el sorteo millonario (.comprar boleto [1-100])' } // 🔥 NUEVO
};

module.exports = {
  name: 'tienda',
  aliases: ['comprar', 'shop', 'usar'],
  category: 'economía',
  desc: 'Compra ítems o usa los que ya tienes',

  execute: async ({ sock, msg, remoteJid, sender, args, commandName, db, reply }) => {
    const userData = await db.getUser(sender);
    const dbInv = getInv();
    if (!dbInv[sender]) dbInv[sender] = {};
    const myInv = dbInv[sender];

    const jailTimeLeft = Number(userData.jailUntil || 0) - Date.now();
    const isCommandComprar = ['tienda', 'comprar', 'shop'].includes(commandName.toLowerCase());

    if (isCommandComprar && jailTimeLeft > 0) {
      return reply('🚨 *ESTÁS ARRESTADO*\nNo puedes ir de compras mientras estás en la cárcel.\n\n📌 Para salir usa: *.usar llave*, *.fianza pagar* o *.sobornar pagar*');
    }

    if (commandName === 'usar') {
      const itemKey = (args[0] || '').toLowerCase();

      if (itemKey === 'llave') {
        if ((myInv.keys || 0) <= 0) return reply('❌ No tienes llaves en tu inventario.\nCómpralas con *.comprar llave*');
        
        const jailDB = loadJail();
        if (!jailDB.jailed[sender] && jailTimeLeft <= 0) return reply('✅ No estás arrestado.');
        
        myInv.keys -= 1;
        saveInv(dbInv);
        
        delete jailDB.jailed[sender];
        saveJail(jailDB);

        userData.jailUntil = 0;
        if (userData.save) await userData.save();

        return reply('🔑 Has deslizado la llave en la celda y escapaste de prisión en silencio. ¡Eres libre!');
      }

      if (itemKey === 'caja') {
        if (jailTimeLeft > 0) return reply('❌ Los guardias confiscaron tus cajas. Debes salir de prisión para abrirlas.');
        if ((myInv.cajaUses || 0) <= 0) return reply('❌ No tienes cajas sorpresa en tu mochila.');
        
        myInv.cajaUses -= 1;
        saveInv(dbInv);

        const ganar = Math.floor(Math.random() * 2000) + 500;
        userData.xp = (userData.xp || 0) + ganar;
        if (userData.save) await userData.save();
        
        return reply(`📦 Abriste la caja y ganaste *+${ganar} XP*`);
      }
      return reply('❌ Ítem desconocido o no utilizable (solo: llave, caja).');
    }

    if (!args.length) {
      let txt = `🛒 *TIENDA SIRIUSBOT*\n\n`;
      for (const [id, item] of Object.entries(ITEMS)) { txt += `▪️ *${id}* (${item.price} XP)\n📝 _${item.desc}_\n\n`; }
      txt += `💳 *Tu saldo:* ${userData.xp || 0} XP\n📦 *Comprar:* .comprar [item] [cant]\n🔓 *Usar:* .usar [llave/caja]`;
      return reply(txt);
    }

    const itemName = args[0].toLowerCase();

    // 🎰 LÓGICA ESPECIAL PARA EL BOLETO DE LOTERÍA
    if (itemName === 'boleto') {
      const numBoleto = parseInt(args[1]);
      if (isNaN(numBoleto) || numBoleto < 1 || numBoleto > 100) {
        return reply('❌ Debes elegir un número del 1 al 100.\n📌 Ejemplo: *.comprar boleto 14*');
      }

      let loteriaDB = { pozo: 0, tickets: {} };
      try { loteriaDB = JSON.parse(fs.readFileSync(LOTERIA_PATH, 'utf8')); } catch {}

      if (loteriaDB.tickets[sender]) {
        return reply(`❌ Ya tienes el boleto #${loteriaDB.tickets[sender]} para este sorteo.\nSolo se permite un boleto por persona.`);
      }

      if (Object.values(loteriaDB.tickets).includes(numBoleto.toString())) {
        return reply(`❌ El boleto #${numBoleto} ya fue comprado por otra persona. ¡Elige otro número!`);
      }

      const precioBoleto = ITEMS.boleto.price;
      if ((userData.xp || 0) < precioBoleto) return reply(`❌ No tienes XP suficiente.\nEl boleto cuesta *${precioBoleto} XP* y tienes *${userData.xp || 0} XP*.`);

      userData.xp -= precioBoleto;
      if (userData.save) await userData.save();

      loteriaDB.tickets[sender] = numBoleto.toString();
      loteriaDB.pozo += precioBoleto;
      fs.writeFileSync(LOTERIA_PATH, JSON.stringify(loteriaDB, null, 2));

      return reply(`🎫 *¡BOLETO COMPRADO!*\n\nHas adquirido el número *${numBoleto}*.\n💰 Todo tu XP fue inyectado al Pozo Acumulado que ahora tiene: *${loteriaDB.pozo} XP*.\n\n¡Usa *.sorteo* para ver los detalles!`);
    }

    // LÓGICA NORMAL PARA EL RESTO DE ÍTEMS
    const amount = Math.max(1, Math.min(10, Number(args[1]) || 1));
    const item = ITEMS[itemName];
    if (!item) return reply('❌ Producto no válido. Usa *.tienda* para ver el catálogo.');

    const total = item.price * amount;
    if ((userData.xp || 0) < total) return reply(`❌ No tienes suficiente XP.\nCuesta *${total} XP* pero tienes *${userData.xp || 0} XP*.`);

    userData.xp -= total;

    if (itemName === 'vip') {
      const now = Date.now();
      const currentPremium = Number(userData.premiumUntil || 0);
      userData.premiumUntil = (currentPremium > now ? currentPremium : now) + (amount * 24 * 60 * 60 * 1000);
      if (userData.save) await userData.save();
      return reply(`✅ Has adquirido *${amount} Día(s) VIP* por ${total} XP.`);
    } else {
      myInv[item.key] = (myInv[item.key] || 0) + amount;
      saveInv(dbInv); 
      if (userData.save) await userData.save(); 
      return reply(`✅ Compraste ${amount}x *${item.name}* por ${total} XP.\n🎒 Revisa tu mochila usando *.inventario*`);
    }
  }
};
