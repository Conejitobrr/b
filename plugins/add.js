'use strict';

module.exports = {
  name: 'add',
  aliases: ['agregar', 'añadir'],
  category: 'administración',
  desc: 'Agrega a un usuario al grupo mediante su número',

  execute: async ({ sock, msg, remoteJid, args, isOwner, isAdmin, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Comando exclusivo para grupos.');
    if (!isAdmin && !isOwner) return reply('❌ Solo los administradores pueden usar este comando.');

    // 🔥 Limpieza total automática: Elimina el signo +, espacios, guiones y cualquier carácter que no sea número
    const fullInput = args.join(' ');
    const pureNumber = fullInput.replace(/\D/g, '');
    
    if (!pureNumber || pureNumber.length < 7) {
      return reply('❌ Debes escribir un número válido.\n📌 Ejemplo: *.add +52 81 1030 3920* o *.add 51963845173*');
    }

    const targetJid = `${pureNumber}@s.whatsapp.net`;

    try {
      // Intentar agregar directamente al usuario sin rodeos
      const res = await sock.groupParticipantsUpdate(remoteJid, [targetJid], 'add');
      
      if (res && res[0]) {
        const status = String(res[0].status);
        
        if (status === '403') {
          return reply(`⚠️ @${pureNumber} tiene la privacidad de su cuenta configurada para no ser agregado por bots o desconocidos, a pesar de que manualmente sí te permita por tu agenda.`, { mentions: [targetJid] });
        }
        if (status === '408') {
          return reply(`❌ @${pureNumber} salió recientemente del grupo y WhatsApp bloquea su reingreso temporalmente.`, { mentions: [targetJid] });
        }
        if (status === '409') {
          return reply(`⚠️ @${pureNumber} ya se encuentra dentro de este grupo.`, { mentions: [targetJid] });
        }
      }

      return reply(`✅ @${pureNumber} ha sido añadido al grupo exitosamente.`, { mentions: [targetJid] });

    } catch (err) {
      console.log('Error en plugin add:', err?.message || err);
      return reply(`❌ No se pudo agregar a @${pureNumber}. Comprueba que el número esté escrito correctamente con su código de país.`, { mentions: [targetJid] });
    }
  }
};
