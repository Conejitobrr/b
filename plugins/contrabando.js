'use strict';

const fs = require('fs');
const path = require('path');

// ⏱️ CONTROL DE COOLDOWN EN MEMORIA RAM
const cooldowns = new Map();
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hora de cooldown por ser de alto valor

// 🚔 RUTA A LA PRISIÓN GLOBAL
const JAIL_PATH = path.join(process.cwd(), 'lib', 'jail.json');
if (!fs.existsSync(path.dirname(JAIL_PATH))) fs.mkdirSync(path.dirname(JAIL_PATH), { recursive: true });

function loadJail() { try { return JSON.parse(fs.readFileSync(JAIL_PATH, 'utf8') || '{"jailed":{}}'); } catch { return { jailed: {} }; } }
function saveJail(data) { try { fs.writeFileSync(JAIL_PATH, JSON.stringify(data, null, 2)); } catch {} }

function cleanNumber(jid = '') { return String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); }
function randXP(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: 'contrabando',
  aliases: ['traficar', 'ilegal'],
  category: 'economía & rpg',
  desc: 'Arriésgate a traficar bienes en el mercado negro (40% de ir preso)',

  execute: async ({ sock, msg, remoteJid, sender, db, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Los tratos turbios solo se hacen en los callejones de los grupos.');

    const userData = await db.getUser(sender);
    const jailTimeLeft = Number(userData.jailUntil || 0) - Date.now();

    // Validar si ya está preso
    if (jailTimeLeft > 0) {
      return reply('🚨 *¡YA ESTÁS EN LA CÁRCEL!*\n\nNo puedes organizar contrabandos desde tu celda.');
    }

    // Validar Cooldown
    const now = Date.now();
    const lastTime = cooldowns.get(sender) || 0;
    const remaining = COOLDOWN_MS - (now - lastTime);

    if (remaining > 0) {
      const min = Math.floor(remaining / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      return reply(`⏳ *DEMASIADO CALIENTE*\n\nLa policía está patrullando tus rutas. Tienes que esconderte por *${min}m ${sec}s* antes de volver a traficar.`);
    }

    // Activar cooldown al intentar
    cooldowns.set(sender, now);

    const userNum = cleanNumber(sender);

    // 🚀 ETAPA 1: Preparación del Golpe
    const msgSent = await sock.sendMessage(remoteJid, {
      text: `💼 *OPERACIÓN DE CONTRABANDO* 💼\n\n@${userNum} ha cargado un maletín sospechoso y se dirige a la zona de intercambio en el puerto...\n_Mirando a ambos lados para evitar soplones..._`,
      mentions: [sender]
    }, { quoted: msg });

    await esperar(3500);

    // ⚡ ETAPA 2: Tensión en la entrega
    try {
      await sock.sendMessage(remoteJid, {
        text: `💼 *OPERACIÓN DE CONTRABANDO* 💼\n\nEl comprador llega en una camioneta negra blindada. Intercambian miradas frías y proceden a abrir los maletines...\n\n⏳ _Esperando la transferencia del dinero..._`,
        edit: msgSent.key,
        mentions: [sender]
      });
    } catch (e) {}

    await esperar(4500);

    // 🎲 ETAPA 3: Resolución (60% Éxito / 40% Cárcel)
    const dice = Math.random() * 100;
    
    if (dice <= 40) {
      // 🚨 40%: REDADA POLICIAL (A LA CÁRCEL)
      const multa = randXP(3000, 7000); // Pierde XP
      const condenaMinutos = Math.floor(Math.random() * 60) + 60; // Entre 1 y 2 horas preso
      
      // Aplicar multa
      userData.xp = Math.max(0, (userData.xp || 0) - multa);
      
      // Aplicar condena
      userData.jailUntil = Date.now() + (condenaMinutos * 60 * 1000);
      userData.fame = (userData.fame || 0) + 1; // Le subimos su nivel de criminal
      
      if (userData.save) await userData.save();

      // Guardarlo en el archivo global de cárcel
      const jailDB = loadJail();
      if (!jailDB.jailed) jailDB.jailed = {};
      jailDB.jailed[sender] = true;
      saveJail(jailDB);

      const textoFinal = `🚨 *¡EMBOSCADA DE LA SWAT!* 🚨\n\n¡Era una trampa de la policía! Las sirenas suenan por todos lados y el comprador huye dejándote tirado.\n\n🚔 @${userNum} ha sido arrestado y golpeado brutalmente.\n\n❌ *Multa Pagada:* -${multa} XP\n⏳ *Condena en Prisión:* ${condenaMinutos} Minutos\n\n_(Para salir, compra una llave, paga tu fianza o espera)_`;
      
      try { await sock.sendMessage(remoteJid, { text: textoFinal, edit: msgSent.key, mentions: [sender] }); } 
      catch (e) { await sock.sendMessage(remoteJid, { text: textoFinal, mentions: [sender] }); }
      
    } else {
      // 💰 60%: ÉXITO ROTUNDO (PAGO MASIVO)
      const pagoMasivo = randXP(8000, 16000); // Mucha más XP que minar/trabajar normal
      
      userData.xp = (userData.xp || 0) + pagoMasivo;
      
      // Sincronizar nivel
      userData.level = Math.floor(0.1 * Math.sqrt(userData.xp || 0)) || 1;
      if (userData.save) await userData.save();

      const textoFinal = `💼 *TRATO CERRADO CON ÉXITO* 💼\n\nEl intercambio fue impecable. El comprador se pierde entre la niebla del muelle mientras cuentas los billetes...\n\n💰 *Ganancias de Contrabando:* +${pagoMasivo} XP\n⭐ *Saldo Total:* ${userData.xp} XP\n\n🎉 ¡Bien hecho, @${userNum}! Corriste un gran riesgo y la recompensa valió la pena.`;
      
      try { await sock.sendMessage(remoteJid, { text: textoFinal, edit: msgSent.key, mentions: [sender] }); } 
      catch (e) { await sock.sendMessage(remoteJid, { text: textoFinal, mentions: [sender] }); }
    }
  }
};
