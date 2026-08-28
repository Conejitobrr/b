'use strict';

module.exports = {
  name: 'admin',
  aliases: ['kick', 'promote', 'demote', 'revoke', 'abrirgrupo', 'cerrargrupo'],
  category: 'administración',
  desc: 'Comandos administrativos de grupo',

  execute: async ({ sock, msg, remoteJid, args, commandName, isAdmin, isOwner, reply }) => {
    if (!remoteJid.endsWith('@g.us')) return reply('❌ Este comando solo funciona en grupos.');
    if (!isAdmin && !isOwner) return reply('❌ Solo los administradores pueden usar esto.');

    try {
      // 🌐 ACCIONES GENERALES (No requieren usuario)
      if (commandName === 'cerrargrupo') {
        await sock.groupSettingUpdate(remoteJid, 'announcement');
        return reply('🔒 Grupo cerrado. Solo los administradores pueden enviar mensajes.');
      }

      if (commandName === 'abrirgrupo') {
        await sock.groupSettingUpdate(remoteJid, 'not_announcement');
        return reply('🔓 Grupo abierto. Todos los participantes pueden enviar mensajes.');
      }

      if (commandName === 'revoke') {
        await sock.groupRevokeInvite(remoteJid);
        const code = await sock.groupInviteCode(remoteJid);
        return reply(`✅ *Enlace de invitación restablecido*\n\n🔗 Nuevo enlace:\nhttps://chat.whatsapp.com/${code}`);
      }

      // 🎯 EXTRACCIÓN SEGURA DEL OBJETIVO (Mención, Respuesta o Texto)
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      let targetJid = contextInfo?.participant || contextInfo?.mentionedJid?.[0];

      if (!targetJid && args.length > 0) {
        const cleanArg = args.join('').replace(/\D/g, '');
        if (cleanArg) targetJid = `${cleanArg}@s.whatsapp.net`;
      }

      if (!targetJid) {
        return reply('❌ Debes mencionar, responder al mensaje o escribir el número de la persona.');
      }

      // Normalizar el JID a formato estándar @s.whatsapp.net para evitar el error 500 de Baileys
      const cleanNum = String(targetJid).split('@')[0].split(':')[0].replace(/\D/g, '');
      const finalUserJid = `${cleanNum}@s.whatsapp.net`;

      const botNum = String(sock.user.id).split(':')[0].replace(/\D/g, '');
      if (cleanNum === botNum) {
        return reply('❌ No puedes aplicar esta acción en el bot.');
      }

      // 👤 ACCIONES SOBRE PARTICIPANTES
      if (commandName === 'kick') {
        await sock.groupParticipantsUpdate(remoteJid, [finalUserJid], 'remove');
        return reply(`✅ Usuario expulsado correctamente del grupo.`);
      }

      if (commandName === 'promote') {
        await sock.groupParticipantsUpdate(remoteJid, [finalUserJid], 'promote');
        return sock.sendMessage(remoteJid, {
          text: `✅ Se ha concedido el rango de Administrador a @${cleanNum}`,
          mentions: [finalUserJid]
        }, { quoted: msg });
      }

      if (commandName === 'demote') {
        await sock.groupParticipantsUpdate(remoteJid, [finalUserJid], 'demote');
        return sock.sendMessage(remoteJid, {
          text: `✅ Se ha retirado el rango de Administrador a @${cleanNum}`,
          mentions: [finalUserJid]
        }, { quoted: msg });
      }

    } catch (err) {
      console.log(`❌ Error en comando administrativo (${commandName}):`, err);
      return reply('❌ La acción falló en los servidores de WhatsApp. Asegúrate de que el bot tenga el rol de Administrador en el grupo.');
    }
  }
};
