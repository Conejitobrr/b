'use strict';

module.exports = {
  name: 'config',
  aliases: ['activar', 'desactivar', 'on', 'off', 'enable', 'disable'],
  category: 'configuración',
  desc: 'Activa o desactiva funciones del grupo (bot, audios, antilink, welcome)',
  
  execute: async ({ commandName, args, isOwner, fromGroup, groupData, reply }) => {
    if (!fromGroup) return reply('❌ Comando solo para grupos.');
    if (!isOwner) return reply('❌ Solo el creador puede usar esto.'); // Puedes cambiarlo a isAdmin después

    const action = ['activar', 'on', 'enable'].includes(commandName);
    const option = args[0]?.toLowerCase();

    const validOptions = ['bot', 'audios', 'antilink', 'antispam', 'welcome'];

    if (!validOptions.includes(option)) {
      return reply(`⚠️ *Uso incorrecto*\n\nEjemplo: .${commandName} audios\n\nOpciones válidas:\n- ${validOptions.join('\n- ')}`);
    }

    if (groupData[option] === action) {
      return reply(`⚠️ La opción *${option}* ya estaba ${action ? 'activada' : 'desactivada'}.`);
    }

    groupData[option] = action;
    if (groupData.save) await groupData.save();

    await reply(`✅ Opción *${option}* ${action ? 'ACTIVADA' : 'DESACTIVADA'} correctamente.`);
  }
};
