'use strict';

function extractJid(jid = '') {
  // Extrae el número puro ignorando el ID de dispositivo (:xx) y arma el JID limpio
  const num = String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
  return `${num}@s.whatsapp.net`;
}

module.exports = {
  name: 'admin',
  aliases: ['kick', 'promote', 'demote', 'revoke', 'abrirgrupo', 'cerrargrupo'],
  category: 'administración',
  desc: 'Comandos administrativos de grupo',

  execute: async ({ sock, msg, remoteJid, sender, commandName, isOwner, isAdmin, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Solo en grupos.');
    if (!isAdmin && !isOwner) return reply('❌ Solo admins pueden usar este comando.');

    // Validar si el bot es admin con el extractor corregido
    const groupMetadata = await sock.groupMetadata(remoteJid);
    const botJid = extractJid(sock.user.id);
    const botData = groupMetadata.participants.find(p => extractJid(p.id) === botJid);
    
    // Verificamos explícitamente si el rol es 'admin' o 'superadmin'
    const botIsAdmin = botData?.admin === 'admin' || botData?.admin === 'superadmin';

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

    // Comandos que requieren apuntar a un usuario
    const target = msg.message?.extendedTextMessage?.contextInfo?.participant 
                || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (!target) return reply('❌ Debes mencionar o responder al mensaje del usuario.');
    
    const userJid = extractJid(target);

    if (userJid === botJid) return reply('❌ No puedo aplicar eso en mí mismo.');

    try {
      if (commandName === 'kick') {
        await sock.groupParticipantsUpdate(remoteJid, [userJid], 'remove');
        return reply(`✅ Usuario expulsado exitosamente.`);
      }
      if (commandName === 'promote') {
        await sock.groupParticipantsUpdate(remoteJid, [userJid], 'promote');
        return sock.sendMessage(remoteJid, { 
          text: `✅ Rango de Administrador otorgado a @${userJid.split('@')[0]}`, 
          mentions: [userJid] 
        }, { quoted: msg });
      }
      if (commandName === 'demote') {
        await sock.groupParticipantsUpdate(remoteJid, [userJid], 'demote');
        return sock.sendMessage(remoteJid, { 
          text: `✅ Rango de Administrador removido a @${userJid.split('@')[0]}`, 
          mentions: [userJid] 
        }, { quoted: msg });
      }
    } catch (err) {
      console.log('❌ Error en comando de administración:', err);
      return reply('❌ Ocurrió un error ejecutando la acción. Verifica que mantenga mis permisos.');
    }
  }
};
