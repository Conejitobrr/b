'use strict';

const FEATURES = ['bot', 'audios', 'welcome', 'antilink', 'antispam'];

module.exports = {
  name: 'config',
  aliases: ['activar', 'desactivar', 'on', 'off', 'enable', 'disable'],
  category: 'configuración',
  desc: 'Activa o desactiva funciones del grupo',
  
  execute: async ({ commandName, args, isOwner, isAdmin, fromGroup, groupData, db, remoteJid, reply }) => {
    if (!fromGroup) return reply('❌ Comando solo para grupos.');

    const feature = (args[0] || '').toLowerCase();
    
    if (!feature || !FEATURES.includes(feature)) {
      return reply(`📌 *Opciones válidas:*\n${FEATURES.map(f => `➤ ${f}`).join('\n')}\n\nEjemplo: .on antilink`);
    }

    // 🔥 Permisos: Owner puede todo. Admin solo audios y welcome.
    if (!isOwner) {
      if (!isAdmin || !['welcome', 'audios'].includes(feature)) {
        return reply('❌ Solo el Owner puede configurar esta opción.');
      }
    }

    const action = ['activar', 'on', 'enable'].includes(commandName);

    if (groupData[feature] === action) {
      return reply(`⚠️ La opción *${feature}* ya estaba ${action ? 'activada' : 'desactivada'}.`);
    }

    groupData[feature] = action;
    if (groupData.save) await groupData.save(); else await db.setGroup(remoteJid, groupData);

    return reply(`✅ Opción *${feature}* ${action ? 'ACTIVADA' : 'DESACTIVADA'} correctamente.`);
  }
};
