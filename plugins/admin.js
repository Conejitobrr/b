'use strict';

function cleanJid(jid = '') { return String(jid).split(':')[0]; }

module.exports = {
  name: 'admin',
  aliases: ['kick', 'promote', 'demote', 'revoke', 'abrirgrupo', 'cerrargrupo'],
  category: 'administración',
  desc: 'Comandos administrativos de grupo',

  execute: async ({ sock, msg, remoteJid, sender, commandName, isOwner, isAdmin, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Solo en grupos.');
    if (!isAdmin && !isOwner) return reply('❌ Solo admins pueden usar este comando.');

    // Validar si el bot es admin
    const groupMetadata = await sock.groupMetadata(remoteJid);
    const botJid = cleanJid(sock.user.id);
    const botIsAdmin = groupMetadata.participants.find(p => cleanJid(p.id) === botJid)?.admin;

    if (['kick', 'promote', 'demote', 'abrirgrupo', 'cerrargrupo'].includes(commandName) && !botIsAdmin) {
      return reply('❌ El bot necesita ser Administrador para hacer esto.');
    }

    if (commandName === 'cerrargrupo') {
      await sock.groupSettingUpdate(remoteJid, 'announcement');
      return reply('🔒 Grupo cerrado. Solo admins pueden escribir.');
    }

    if (commandName === 'abrirgrupo') {
      await sock.groupSettingUpdate(remoteJid, 'not_announcement');
      return reply('🔓 Grupo abierto. Todos pueden escribir.');
    }

    if (commandName === 'revoke') {
      await sock.groupRevokeInvite(remoteJid);
      const code = await sock.groupInviteCode(remoteJid);
      return reply(`✅ *Link del grupo reiniciado*\n🔗 Nuevo link: https://chat.whatsapp.com/${code}`);
    }

    // Comandos que requieren un objetivo (kick, promote, demote)
    const target = msg.message?.extendedTextMessage?.contextInfo?.participant 
                || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (!target) return reply('❌ Debes mencionar o responder al mensaje del usuario.');
    const userJid = cleanJid(target);

    if (userJid === botJid) return reply('❌ No me puedo hacer eso a mí mismo.');

    try {
      if (commandName === 'kick') {
        await sock.groupParticipantsUpdate(remoteJid, [userJid], 'remove');
        return reply(`✅ Usuario expulsado.`);
      }
      if (commandName === 'promote') {
        await sock.groupParticipantsUpdate(remoteJid, [userJid], 'promote');
        return reply(`✅ Admin otorgado a @${userJid.split('@')[0]}`, { mentions: [userJid] });
      }
      if (commandName === 'demote') {
        await sock.groupParticipantsUpdate(remoteJid, [userJid], 'demote');
        return reply(`✅ Admin removido a @${userJid.split('@')[0]}`, { mentions: [userJid] });
      }
    } catch (err) {
      return reply('❌ Ocurrió un error ejecutando la acción.');
    }
  }
};
