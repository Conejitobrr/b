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

    try {
      // 1️⃣ PRIMERO: Obtenemos los datos del grupo para verificar si somos admins ANTES de hacer nada
      const groupMetadata = await sock.groupMetadata(remoteJid);
      
      // Extraemos el número del bot de forma segura
      const botNumber = String(sock.user.id).split(':')[0].replace(/\D/g, '');
      const botJid = `${botNumber}@s.whatsapp.net`;

      // Buscamos al bot en la lista de participantes
      const botParticipant = groupMetadata.participants.find(p => p.id === botJid || String(p.id).includes(botNumber));
      const botIsAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';

      // 🌐 ACCIONES GENERALES DEL GRUPO
      if (commandName === 'cerrargrupo') {
        if (!botIsAdmin) return reply('❌ El bot necesita ser Administrador para hacer esto.');
        await sock.groupSettingUpdate(remoteJid, 'announcement');
        return reply('🔒 Grupo cerrado. Solo admins pueden escribir.');
      }

      if (commandName === 'abrirgrupo') {
        if (!botIsAdmin) return reply('❌ El bot necesita ser Administrador para hacer esto.');
        await sock.groupSettingUpdate(remoteJid, 'not_announcement');
        return reply('🔓 Grupo abierto. Todos pueden escribir.');
      }

      if (commandName === 'revoke') {
        if (!botIsAdmin) return reply('❌ El bot necesita ser Administrador para hacer esto.');
        await sock.groupRevokeInvite(remoteJid);
        const code = await sock.groupInviteCode(remoteJid);
        return reply(`✅ *Link del grupo reiniciado*\n🔗 Nuevo link: https://chat.whatsapp.com/${code}`);
      }

      // 2️⃣ SEGUNDO: Obtener al usuario objetivo (Responder, Mencionar o Escribir número)
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

      // 3️⃣ TERCERO: Verificar si el usuario realmente está en el grupo
      const targetParticipant = groupMetadata.participants.find(p => p.id === userJid);
      if (!targetParticipant) {
        return reply('❌ El usuario especificado no está en este grupo.');
      }

      // Si llegamos hasta aquí, exigimos ser admins para interactuar con el usuario
      if (!botIsAdmin) return reply('❌ El bot necesita ser Administrador para hacer esto.');

      // 👤 ACCIONES SOBRE USUARIOS
      if (commandName === 'kick') {
        await sock.groupParticipantsUpdate(remoteJid, [userJid], 'remove');
        return reply(`✅ Usuario expulsado exitosamente.`);
      }
      
      if (commandName === 'promote') {
        // 🔥 FIX 500 ERROR: Evita promover a alguien que ya es admin
        if (targetParticipant.admin === 'admin' || targetParticipant.admin === 'superadmin') {
          return reply('⚠️ Este usuario ya es administrador.');
        }
        await sock.groupParticipantsUpdate(remoteJid, [userJid], 'promote');
        return sock.sendMessage(remoteJid, { 
          text: `✅ Rango de Administrador otorgado a @${userJid.split('@')[0]}`, 
          mentions: [userJid] 
        }, { quoted: msg });
      }
      
      if (commandName === 'demote') {
        // 🔥 FIX 500 ERROR: Evita degradar a alguien que no es admin
        if (!targetParticipant.admin) {
          return reply('⚠️ Este usuario no tiene rango de administrador.');
        }
        await sock.groupParticipantsUpdate(remoteJid, [userJid], 'demote');
        return sock.sendMessage(remoteJid, { 
          text: `✅ Rango de Administrador removido a @${userJid.split('@')[0]}`, 
          mentions: [userJid] 
        }, { quoted: msg });
      }

    } catch (err) {
      console.log(`❌ Error en comando ${commandName}:`, err);
      return reply('❌ Ocurrió un error en los servidores de WhatsApp al intentar ejecutar esta acción.');
    }
  }
};
