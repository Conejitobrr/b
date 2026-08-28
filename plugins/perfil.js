'use strict';

module.exports = {
  name: 'perfil',
  aliases: ['xp', 'nivel', 'bal', 'balance', 'stats'],
  category: 'economía',
  desc: 'Muestra tu nivel y experiencia actual',
  
  execute: async ({ pushName, userData, reply }) => {
    const xp = userData.xp || 0;
    const level = userData.level || 1;
    
    // Calcula cuánta XP falta para el siguiente nivel
    const xpParaSiguiente = level * 10000;

    const texto = `╭─❖「 *PERFIL DE USUARIO* 」
│ 👤 Nombre: *${pushName}*
│ 💠 Nivel: *${level}*
│ ⚡ XP: *${xp}* / ${xpParaSiguiente}
╰─────────────────`;

    await reply(texto);
  }
};
