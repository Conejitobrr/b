'use strict';

module.exports = {
  name: 'donar',
  aliases: ['apoyar', 'donate', 'dona'],
  category: 'información',
  desc: 'Muestra la información para apoyar al creador del bot',

  execute: async ({ sock, msg, remoteJid, pushName, reply }) => {
    try {
      const nombre = pushName || 'Aventurero';

      const texto = `💙 *¡APOYA AL PROYECTO!* 🐾\n\n¡Hola, *${nombre}*! 👋\n\n¿Te gusta cómo funciona el bot, los comandos rápidos y todo el nuevo ecosistema que trae? ✨\n\nMantener este proyecto en línea 24/7, libre de caídas y en constante desarrollo tiene sus costos (y lamentablemente, los proveedores de servidores aún no aceptan el XP de la mina como método de pago 😅).\n\nSi te nace de corazón apoyar el desarrollo y quieres que el bot siga evolucionando a pasos agigantados, puedes invitarme un aporte por aquí:\n\n💳 *Mi PayPal:*\n👉 https://www.paypal.com/paypalme/Josevelazc0\n👤 *Jose Velazco*\n\n✨ _PD: Tu apoyo va directo a pagar el hosting, mi café para programar en las madrugadas y, sobre todo, la comida de mis wawas (que sinceramente gastan más en mantenimiento que el mismísimo servidor)._ 🐶🐾\n\n¡Mil gracias por ser parte de esta comunidad y hacer esto posible!`;

      // 🐶 Reacción automática al mensaje del usuario
      try {
        await sock.sendMessage(remoteJid, { react: { text: '🐶', key: msg.key } });
      } catch (reactError) {
        console.log('⚠️ No se pudo reaccionar al mensaje de donación:', reactError?.message);
      }

      // 📩 Envío del mensaje
      await sock.sendMessage(remoteJid, { text: texto }, { quoted: msg });

    } catch (err) {
      console.log('❌ Error en plugin donar:', err);
      return reply('❌ Ocurrió un error mostrando la información de donación. (Pero la intención de apoyar cuenta muchísimo 🐶)');
    }
  }
};
