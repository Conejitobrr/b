'use strict';

module.exports = {
  name: 'add',
  aliases: ['agregar', 'añadir'],
  category: 'administración',
  desc: 'Agrega a un usuario al grupo mediante su número',

  execute: async ({ sock, msg, remoteJid, args, isOwner, isAdmin, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Comando exclusivo para grupos.');
    if (!isAdmin && !isOwner) return reply('❌ Solo los administradores pueden usar este comando.');

    // Purificación absoluta del número (elimina espacios, +, guiones y letras)
    const pureNumber = args.join('').replace(/\D/g, '');
    
    if (!pureNumber) {
      return reply('❌ Debes escribir el número del usuario.\n📌 Ejemplo: *.add 51987654321*');
    }

    // Creación del JID perfecto
    const targetJid = `${pureNumber}@s.whatsapp.net`;

    try {
      // 1. Verificación obligatoria: ¿El bot es admin?
      const groupMetadata = await sock.groupMetadata(remoteJid);
      const botJid = String(sock.user.id).split(':')[0] + '@s.whatsapp.net';
      const isBotAdmin = groupMetadata.participants.some(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'));

      if (!isBotAdmin) {
        return reply('❌ El bot necesita ser administrador del grupo para poder agregar personas.');
      }

      // 2. Ejecutar adición
      const res = await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add');
      
      // 3. Control de privacidad de WhatsApp
      // Si el usuario configuró "Mis contactos excepto..." o "Nadie puede agregarme a grupos", WhatsApp arroja el error 403
      if (res && res[0] && res[0].status === '403') {
        return reply(`⚠️ No se pudo añadir a @${pureNumber}.\n🔒 El usuario tiene activada la privacidad de grupos y no permite ser agregado por desconocidos.`, { mentions: [targetJid] });
      }

      return reply(`✅ @${pureNumber} ha sido añadido al grupo exitosamente.`, { mentions: [targetJid] });

    } catch (err) {
      console.log('Error en plugin add:', err?.message || err);
      return reply(`❌ Error al intentar agregar a @${pureNumber}. Verifica que el número sea correcto y tenga WhatsApp activo.`, { mentions: [targetJid] });
    }
  }
};
