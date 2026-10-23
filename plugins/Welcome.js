'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DEFAULT_PROFILE = path.join(process.cwd(), 'assets', 'Sinperfil.jpg');
const FALLBACK_URL = 'https://telegra.ph/file/24fa902ead26340f3df2c.png';

function cleanJid(jid = '') {
  return String(jid).split(':')[0];
}

function cleanNumber(jid = '') {
  return cleanJid(jid).split('@')[0].replace(/\D/g, '');
}

async function getProfileBuffer(sock, userJid, groupJid) {
  // 1. Intentar descargar la foto del usuario
  try {
    const url = await sock.profilePictureUrl(userJid, 'image');
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
    return Buffer.from(res.data);
  } catch {}

  // 2. Si tiene la foto privada, intentar usar tu imagen local Sinperfil.jpg
  try {
    if (fs.existsSync(DEFAULT_PROFILE)) {
      return fs.readFileSync(DEFAULT_PROFILE);
    }
  } catch {}

  // 3. Intentar con la foto del grupo
  try {
    const groupUrl = await sock.profilePictureUrl(groupJid, 'image');
    const res = await axios.get(groupUrl, { responseType: 'arraybuffer', timeout: 8000 });
    return Buffer.from(res.data);
  } catch {}

  // 4. Respaldo final en línea
  try {
    const res = await axios.get(FALLBACK_URL, { responseType: 'arraybuffer', timeout: 8000 });
    return Buffer.from(res.data);
  } catch {
    return null;
  }
}

module.exports = {
  name: 'testwelcome',
  aliases: ['welcometest', 'probarwelcome'],
  category: 'moderación & grupo',
  desc: 'Prueba cómo se ve el mensaje de bienvenida en el grupo',

  // 🧪 Comando manual para probar la bienvenida cuando quieras
  execute: async ({ sock, remoteJid, sender, fromGroup, isAdmin, isOwner, groupData, reply }) => {
    if (!fromGroup) return reply('❌ Este comando solo funciona en grupos.');
    if (!isAdmin && !isOwner) return reply('❌ Solo los administradores pueden probar la bienvenida.');

    const estado = groupData?.welcome ? '✅ ACTIVADO' : '❌ DESACTIVADO (Usa *.on welcome* para activarlo)';
    await reply(`🧪 *Generando vista previa de bienvenida...*\n📌 Estado actual en este grupo: ${estado}`);

    await module.exports.onGroupUpdate({
      sock,
      id: remoteJid,
      participants: [sender],
      action: 'add',
      forceTest: true
    });
  },

  // 🔔 Detector automático cuando alguien entra o sale del grupo
  onGroupUpdate: async ({ sock, id, participants, action, db, forceTest = false }) => {
    try {
      if (!id || !id.endsWith('@g.us')) return;

      if (!forceTest) {
        const groupData = await db.getGroup(id);
        if (!groupData || !groupData.welcome) return;
      }

      let groupName = 'el grupo';
      let memberCount = 'varios';
      let groupDesc = '';

      try {
        const metadata = await sock.groupMetadata(id);
        groupName = metadata.subject || 'el grupo';
        memberCount = metadata.participants?.length || 'varios';
        groupDesc = metadata.desc ? String(metadata.desc).trim() : '';
      } catch {}

      for (const p of participants) {
        const rawParticipant = typeof p === 'string' ? p : (p?.id || p?.jid || '');
        if (!rawParticipant) continue;

        const userJid = cleanJid(rawParticipant);
        const userNum = cleanNumber(userJid);
        if (!userNum) continue;

        const imgBuffer = await getProfileBuffer(sock, userJid, id);

        if (action === 'add') {
          let texto = `╔══════════════════════╗\n`;
          texto += `      🎉 *¡BIENVENIDO/A!* 🎉\n`;
          texto += `╚══════════════════════╝\n\n`;
          texto += `👋 Hola @${userNum}, bienvenido/a a *${groupName}* ✨\n\n`;
          texto += `👥 *Miembros ahora:* ${memberCount}\n`;
          if (groupDesc) {
            texto += `\n📜 *Reglas / Descripción:*\n${groupDesc.slice(0, 300)}\n`;
          }
          texto += `\n💡 _Usa *.menu* para ver todos los comandos de SiriusBot._`;

          if (imgBuffer) {
            await sock.sendMessage(id, {
              image: imgBuffer,
              caption: texto,
              mentions: [userJid]
            });
          } else {
            await sock.sendMessage(id, {
              text: texto,
              mentions: [userJid]
            });
          }
        } else if (action === 'remove') {
          let texto = `╔══════════════════════╗\n`;
          texto += `        👋 *¡ADIÓS!* 👋\n`;
          texto += `╚══════════════════════╝\n\n`;
          texto += `💨 @${userNum} ha salido de *${groupName}*.\n`;
          texto += `👥 *Quedamos:* ${memberCount} miembros.\n\n`;
          texto += `_Ojalá no vuelva (broma... o tal vez no) XD._`;

          if (imgBuffer) {
            await sock.sendMessage(id, {
              image: imgBuffer,
              caption: texto,
              mentions: [userJid]
            });
          } else {
            await sock.sendMessage(id, {
              text: texto,
              mentions: [userJid]
            });
          }
        }
      }
    } catch (err) {
      console.log('❌ Error en welcome.js:', err?.message || err);
    }
  }
};
