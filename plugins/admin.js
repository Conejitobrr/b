'use strict';

function extractJid(text = '') {
  const num = String(text).replace(/\D/g, '');
  return num ? `${num}@s.whatsapp.net` : null;
}

module.exports = {
  name: 'admin',
  aliases: ['kick', 'promote', 'demote', 'revoke', 'abrirgrupo', 'cerrargrupo'],
  category: 'administración',
  desc: 'Comandos administrativos de grupo',

  execute: async ({ sock, msg, remoteJid, args, commandName, isOwner, isAdmin, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Comando exclusivo para grupos.');
    if (!isAdmin && !isOwner) return reply('❌ Solo los administradores pueden usar esto.');

    const botNumber = String(sock.user.id).split(':')[0].replace(/\D/g, '');

    try {
      // 🌐 ACCIONES GENERALES DEL GRUPO (Ejecutan directo, si falla salta al catch)
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

      // 🎯 OBTENER OBJETIVO (Responder, Mencionar o Escribir número)
      let targetRaw = msg.message?.extendedTextMessage?.contextInfo?.participant 
                   || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] 
                   || args.join('');

      const userJid = extractJid(targetRaw);

      if (!userJid) {
        return reply('❌ Debes mencionar, responder al mensaje o escribir el número del usuario.');
      }

      if (userJid.includes(botNumber)) {
        return reply('❌ No puedo aplicar comandos de administración en mí mismo.');
      }

      // 👤 ACCIONES SOBRE USUARIOS (Ejecutan directo)
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
      console.log(`❌ Error en comando ${commandName}:`, err);
      // 🔥 Si WhatsApp rechaza la petición por falta de permisos o error interno, salta este aviso al final:
      return reply('❌ La acción falló. Asegúrate de que el bot sea Administrador y que el usuario esté en el grupo.');
    }
  }
};
