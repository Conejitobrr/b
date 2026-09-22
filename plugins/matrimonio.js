'use strict';

const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(process.cwd(), 'database', 'marriages.json');

const PROPOSALS = new Map();
const CEREMONIES = new Map(); 
const DIVORCES = new Map(); 

function ensureDB() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ marriages: {}, cooldowns: {} }, null, 2));
}

function loadDB() {
  ensureDB();
  try { 
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8') || '{}'); 
    if (!data.cooldowns) data.cooldowns = {};
    return data;
  } catch { return { marriages: {}, cooldowns: {} }; }
}
function saveDB(data) {
  ensureDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function number(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }
function getPartner(data, user) { return data.marriages?.[cleanJid(user)]?.partner || null; }
function isMarried(data, user) { return !!getPartner(data, user); }

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: 'matrimonio',
  aliases: ['proponer', 'aceptar', 'rechazar', 'oponerse', 'pareja', 'divorcio', 'firmar', 'romperpapeles', 'consentimiento', 'amor', 'celos', 'regalo'],
  category: 'diversión',
  desc: 'Sistema completo de bodas, divorcios e interacciones de pareja',

  execute: async ({ sock, msg, remoteJid, sender, commandName, args, isOwner, db, reply }) => {
    const data = loadDB();
    const user = cleanJid(sender); // JID puro sin alterar
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const target = mentioned ? cleanJid(mentioned) : null;
    
    const cmd = commandName.toLowerCase();

    if (cmd === 'matrimonio') {
      const menu = `⛪ *PARROQUIA & REGISTRO CIVIL* ⚖️\n\n🕊️ *BODAS (Premio: 30,000 XP):*\n➤ *.proponer @usuario*\n➤ *.aceptar*\n➤ *.rechazar*\n➤ *.oponerse*\n➤ *.pareja*\n\n💕 *INTERACCIONES (Solo Casados):*\n➤ *.amor* (Mimar a tu pareja)\n➤ *.celos* (Escena de celos)\n➤ *.regalo* (Dar regalo sorpresa)\n\n💔 *DIVORCIOS (Multa: 15,000 XP):*\n➤ *.divorcio*\n➤ *.firmar*\n➤ *.romperpapeles*\n\n👑 *SOLO OWNER:*\n➤ *.consentimiento @usuario* (Quitar veto)`;
      return reply(menu);
    }

    if (cmd === 'consentimiento') {
      if (!isOwner) return reply('❌ Solo el Owner supremo puede otorgar el perdón papal.');
      if (!target) return reply('⚠️ Menciona a la persona que quieres perdonar.');
      
      if (data.cooldowns[target]) {
        delete data.cooldowns[target];
        saveDB(data);
        return sock.sendMessage(remoteJid, { text: `✨ *PERDÓN PAPAL CONCEDIDO* ✨\n\nEl Owner ha purificado los pecados de @${number(target)}. Ya puede casarse de nuevo.`, mentions: [target] }, { quoted: msg });
      } else {
        return reply('Esa persona no tiene ningún castigo activo.');
      }
    }

    // ==========================================
    // 💕 INTERACCIONES EXCLUSIVAS DE PAREJAS
    // ==========================================
    if (['amor', 'celos', 'regalo'].includes(cmd)) {
      const miPareja = getPartner(data, user);
      if (!miPareja) return reply('❌ No estás casado/a. Usa *.proponer @usuario* para conseguir pareja primero.');
      
      let txt = '';
      if (cmd === 'amor') {
        const amorTxt = [
          `🥰 *@${number(user)}* le dio un beso apasionado a su espos@ *@${number(miPareja)}*.\n¡Que viva el amor! 💕`,
          `🫂 *@${number(user)}* abrazó fuertemente a *@${number(miPareja)}* por la espalda.\n"Eres lo mejor que me ha pasado" 💖`,
          `🍽️ *@${number(user)}* le preparó una cena romántica a *@${number(miPareja)}*.\n¡Qué detallazo! 🍷🍝`
        ];
        txt = amorTxt[Math.floor(Math.random() * amorTxt.length)];
      } 
      else if (cmd === 'celos') {
        const celosTxt = [
          `😤 *@${number(user)}* le revisó el celular a *@${number(miPareja)}* y le hizo una escena de celos.\n¡Se va a dormir al sofá! 🛋️`,
          `👀 *@${number(user)}* vio a *@${number(miPareja)}* sonriéndole al teléfono y le quitó el internet de la casa. 📡✂️`
        ];
        txt = celosTxt[Math.floor(Math.random() * celosTxt.length)];
      }
      else if (cmd === 'regalo') {
        txt = `🎁 *@${number(user)}* le compró un regalo sorpresa carísimo a *@${number(miPareja)}*.\n¡El amor está en el aire! ✨`;
      }
      return sock.sendMessage(remoteJid, { text: txt, mentions: [user, miPareja] }, { quoted: msg });
    }

    // ==========================================
    // ⛪ BODA Y PROPUESTAS
    // ==========================================
    if (cmd === 'proponer') {
      if (data.cooldowns[user]) {
        const pasado = Date.now() - data.cooldowns[user];
        const dosSemanas = 14 * 24 * 60 * 60 * 1000;
        if (pasado < dosSemanas) {
          const diasFaltantes = Math.ceil((dosSemanas - pasado) / 86400000);
          return reply(`Padre SiriusBot: "¡Alto ahí, pecador! 🛑\nTe divorciaste hace poco. Debes guardar luto por *${diasFaltantes} días* más."`);
        } else {
          delete data.cooldowns[user];
          saveDB(data);
        }
      }

      if (!target) return reply('Padre SiriusBot: "Hijo mío, menciona a tu futuro cónyuge."');
      if (target === user) return reply('Padre SiriusBot: "Ve a terapia 😹"');
      if (isMarried(data, user)) return reply('Padre SiriusBot: "¡Pecador! Ya estás casado. ¡Pide el *.divorcio* primero!"');
      if (isMarried(data, target)) return reply('Padre SiriusBot: "Esa oveja ya está casada con otro."');

      PROPOSALS.set(target, { from: user, to: target, chat: remoteJid, time: Date.now() });
      const txt = `🔔 *¡SUENAN LAS CAMPANAS!* 🔔\n\nHermanos, *@${number(user)}* se ha arrodillado frente a *@${number(target)}*.\n\nPadre SiriusBot:\n*"¿Aceptas tomar a esta persona para amarla y respetarla?"*\n\n👰/🤵 Di *.aceptar*\n🏃💨 Di *.rechazar*`;
      return sock.sendMessage(remoteJid, { text: txt, mentions: [user, target] }, { quoted: msg });
    }

    if (cmd === 'aceptar') {
      const proposal = PROPOSALS.get(user);
      if (!proposal || proposal.chat !== remoteJid) return reply('Padre SiriusBot: "Nadie te está esperando en el altar."');
      if (isMarried(data, user) || isMarried(data, proposal.from)) {
        PROPOSALS.delete(user);
        return reply('Padre SiriusBot: "¡Se cancela la boda! Alguien cometió adulterio en secreto."');
      }

      PROPOSALS.delete(user);
      CEREMONIES.set(remoteJid, { activo: true, novia: user, novio: proposal.from });

      await sock.sendMessage(remoteJid, { text: `✨🕊️ *LA CEREMONIA HA COMENZADO* 🕊️✨\n\n@${number(user)} dijo: *¡SÍ, ACEPTO!*\n\n🗣️ _"Si hay alguien que se oponga... que escriba **.oponerse** AHORA MISMO."_\n\n⏳ *Tienen 8 segundos...*`, mentions: [user, proposal.from] });
      
      await sleep(8000);
      if (!CEREMONIES.get(remoteJid)?.activo) return; 

      data.marriages[user] = { partner: proposal.from, since: Date.now() };
      data.marriages[proposal.from] = { partner: user, since: Date.now() };
      saveDB(data);
      CEREMONIES.delete(remoteJid);

      // 🎯 ACTUALIZAR LA BASE DE DATOS PRINCIPAL PARA EL PERFIL
      const userA = await db.getUser(user);
      const userB = await db.getUser(proposal.from);
      if (userA) { userA.partner = proposal.from; if(userA.save) await userA.save(); }
      if (userB) { userB.partner = user; if(userB.save) await userB.save(); }

      await db.addXP(user, 30000);
      await db.addXP(proposal.from, 30000);
      
      return sock.sendMessage(remoteJid, { text: `*(Silencio total en la iglesia...)* 🦗\n\n_"¡Los declaro unidos en sagrado matrimonio!"_\n\n🎊 ¡Lluvia de arroz para @${number(proposal.from)} y @${number(user)}! 🎊\n💰 *DOTE MATRIMONIAL:* ¡Se les ha otorgado *30,000 XP* a cada uno!`, mentions: [proposal.from, user] });
    }

    if (cmd === 'rechazar') {
      const proposal = PROPOSALS.get(user);
      if (!proposal || proposal.chat !== remoteJid) return reply('No tienes ninguna propuesta pendiente.');
      PROPOSALS.delete(user);
      return sock.sendMessage(remoteJid, { text: `💔 *@${number(user)}* ha salido corriendo de la iglesia llorando.\nLa boda se cancela. @${number(proposal.from)} ha quedado plantado/a en el altar.`, mentions: [user, proposal.from] }, { quoted: msg });
    }

    if (cmd === 'oponerse') {
      const ceremonia = CEREMONIES.get(remoteJid);
      if (!ceremonia || !ceremonia.activo) return reply('No hay ninguna boda llevándose a cabo en este momento para oponerse.');
      ceremonia.activo = false;
      return sock.sendMessage(remoteJid, { text: `😱 *¡ESCÁNDALO!* 😱\n\n@${number(user)} ha pateado las puertas de la iglesia gritando: *"¡ME OPONGO!"*\n\nEl Padre SiriusBot se desmaya. ¡LA BODA SE CANCELA!`, mentions: [user] }, { quoted: msg });
    }

    if (cmd === 'pareja') {
      const userCheck = target || user;
      const partner = getPartner(data, userCheck);
      
      if (!partner) return sock.sendMessage(remoteJid, { text: `@${number(userCheck)} está más soltero/a que el uno.`, mentions: [userCheck] }, { quoted: msg });
      
      const date = new Date(data.marriages[userCheck].since).toLocaleDateString('es-PE');
      return sock.sendMessage(remoteJid, { text: `💍 *REGISTRO CIVIL* 💍\n\n@${number(userCheck)} está felizmente casado/a con @${number(partner)} desde el ${date}.`, mentions: [userCheck, partner] }, { quoted: msg });
    }

    // ==========================================
    // 💔 DIVORCIOS
    // ==========================================
    if (cmd === 'divorcio') {
      const partner = getPartner(data, user);
      if (!partner) return reply('Juez SiriusBot: "No puede divorciarse si no está casado."');
      DIVORCES.set(partner, { from: user, to: partner, chat: remoteJid });

      const txt = `🏛️ *JUZGADO DE FAMILIA VIRTUAL* 🏛️\n\nEl ciudadano @${number(user)} ha presentado una demanda de divorcio contra @${number(partner)}.\n\n💸 *ADVERTENCIA:* Firmar costará **15,000 XP** a cada uno y un veto de 14 días.\n\n@${number(partner)}:\n✍️ Di *.firmar* para aceptar.\n🛑 Di *.romperpapeles* para negarte.`;
      return sock.sendMessage(remoteJid, { text: txt, mentions: [user, partner] }, { quoted: msg });
    }

    if (cmd === 'firmar') {
      const divorce = DIVORCES.get(user);
      if (!divorce || divorce.chat !== remoteJid) return reply('Juez SiriusBot: "No tiene demandas pendientes."');

      delete data.marriages[user];
      delete data.marriages[divorce.from];
      data.cooldowns[user] = Date.now();
      data.cooldowns[divorce.from] = Date.now();
      saveDB(data);
      DIVORCES.delete(user);
      
      // 🎯 ACTUALIZAR LA BASE DE DATOS PRINCIPAL PARA EL PERFIL (BORRAR PAREJA)
      const userA = await db.getUser(user);
      const userB = await db.getUser(divorce.from);
      if (userA) { userA.partner = null; userA.xp -= 15000; if(userA.save) await userA.save(); }
      if (userB) { userB.partner = null; userB.xp -= 15000; if(userB.save) await userB.save(); }

      const txt = `🔨 *¡CASO CERRADO!*\n\n@${number(user)} ha firmado los papeles. El sagrado vínculo con @${number(divorce.from)} queda OFICIALMENTE ROTO.\n\n⛔ *PENALIDAD:* 14 días de veto para casarse.\n💸 *HONORARIOS:* -15,000 XP a cada uno.\n\nEl amor ha muerto.`;
      return sock.sendMessage(remoteJid, { text: txt, mentions: [user, divorce.from] }, { quoted: msg });
    }

    if (cmd === 'romperpapeles') {
      const divorce = DIVORCES.get(user);
      if (!divorce || divorce.chat !== remoteJid) return reply('No hay papeles que romper.');
      DIVORCES.delete(user);
      
      const txt = `🛑 *¡DRAMA EN EL JUZGADO!* 🛑\n\n@${number(user)} ha roto la demanda de divorcio en la cara del juez gritando a @${number(divorce.from)}: *"¡NO TE DARÉ EL DIVORCIO!"* 😱\n\nSiguen infelizmente casados. 💍🔒`;
      return sock.sendMessage(remoteJid, { text: txt, mentions: [user, divorce.from] }, { quoted: msg });
    }
  }
};
