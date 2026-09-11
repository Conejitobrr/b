'use strict';

const axios = require('axios');

module.exports = {
  name: 'edad',
  aliases: ['adivinaredad', 'cuantosanos'],
  category: 'diversión',
  desc: 'Adivina la edad de una persona basándose en su nombre',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (!args[0]) {
      return reply('❌ Escribe un solo nombre para adivinar.\n📌 *Ejemplo:* .edad Jose');
    }

    const nombre = args[0].toLowerCase().trim();

    try {
      // API libre y sin necesidad de Keys
      const res = await axios.get(`https://api.agify.io/?name=${nombre}`);
      const data = res.data;

      if (!data.age) {
        return reply(`🤔 Mi bola de cristal no tiene registros para el nombre "${nombre}".`);
      }

      const texto = `🔮 *ADIVINADOR MÍSTICO* 🔮\n\n👤 *Nombre:* ${data.name.charAt(0).toUpperCase() + data.name.slice(1)}\n🎂 *Edad calculada:* ${data.age} años\n📈 *Precisión:* Basado en ${data.count.toLocaleString()} personas con este nombre en el mundo.`;

      return reply(texto);

    } catch (err) {
      console.log('❌ Error en comando edad:', err.message);
      return reply('❌ Se me empañó la bola de cristal. Intenta de nuevo.');
    }
  }
};
