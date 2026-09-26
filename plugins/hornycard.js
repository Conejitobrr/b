'use strict';

module.exports = {
  name: 'hornycard',
  aliases: ['horny', 'hornylicense', 'licenciapajero', 'enfermo'],
  category: 'diversión',
  desc: 'Genera una licencia oficial de pajero para ti o un amigo',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    try {
      // 1. Detección inteligente del objetivo
      // Prioridad: 1° Mención (@tag) -> 2° Cita (Responder mensaje) -> 3° El propio usuario
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = contextInfo?.mentionedJid?.[0];
      const quoted = contextInfo?.participant;
      const sender = msg.key.fromMe ? sock.user.id : (msg.key.participant || msg.key.remoteJid);

      const target = mentioned || quoted || sender;

      // 2. Obtener la foto de perfil de WhatsApp
      let avatarUrl;
      try {
        // Intentamos extraer su foto real
        avatarUrl = await sock.profilePictureUrl(target, 'image');
      } catch (err) {
        // Si no tiene foto, lo tiene privado, o es un error, usamos la de WhatsApp por defecto
        avatarUrl = 'https://telegra.ph/file/24fa902ead26340f3df2c.png';
      }

      // 3. Reacción para mostrar que está procesando
      await sock.sendMessage(remoteJid, { react: { text: '🔥', key: msg.key } });

      // 4. Generar la imagen usando la API externa
      const apiUrl = `https://some-random-api.com/canvas/horny?avatar=${encodeURIComponent(avatarUrl)}`;

      // 5. Enviar el resultado con su toque tóxico
      await sock.sendMessage(remoteJid, {
        image: { url: apiUrl },
        caption: '🥵 *LICENCIA OFICIAL DE PAJERO* 🔥\n\n_Este documento certifica legalmente que eres un enfermo mental. Más información al privado XD._'
      }, { quoted: msg });

    } catch (error) {
      console.log('❌ Error en hornycard:', error);
      return reply('❌ La máquina de licencias se atascó. Intenta de nuevo más tarde, pajero.');
    }
  }
};
