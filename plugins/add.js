'use strict';

module.exports = {
  name: 'add',
  aliases: ['agregar', 'añadir'],
  category: 'administración',
  desc: 'Agrega a un usuario al grupo mediante su número',

  execute: async ({ sock, msg, remoteJid, args, isOwner, isAdmin, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Comando exclusivo para grupos.');
    if (!isAdmin && !isOwner) return reply('❌ Solo los administradores pueden usar este comando.');

    // Purificación del número (elimina espacios, +, guiones y letras)
    const pureNumber = args.join('').replace(/\D/g, '');
    
    if (!pureNumber) {
      return reply('❌ Debes escribir el número del usuario.\n📌 Ejemplo: *.add 51987654321*');
    }

    const targetJid = `${pureNumber}@s.whatsapp.net`;

    try {
      // FUERZA BRUTA: Ejecutar adición sin consultar metadata inestable
      const res = await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add');
      
      // Control de privacidad (Error 403)
      if (res && res[0] && res[0].status === '403') {
        return reply(`⚠️ No se pudo añadir a @${pureNumber}.\n🔒 El usuario tiene activada la privacidad de grupos y no permite ser agregado por desconocidos.`, { mentions: [targetJid] });
      }

      return reply(`✅ @${pureNumber} ha sido añadido al grupo exitosamente.`, { mentions: [targetJid] });

    } catch (err) {
      console.log('Error en plugin add:', err?.message || err);
      return reply(`❌ Error al intentar agregar a @${pureNumber}.\n\nPosibles causas:\n* El bot no es administrador.\n* El número no tiene WhatsApp.`, { mentions: [targetJid] });
    }
  }
};
