'use strict';

module.exports = {
  name: 'contacto',
  aliases: ['creador', 'owner', 'soporte', 'staff'],
  category: 'información',
  desc: 'Muestra el contacto oficial del creador de SiriusBot',

  execute: async ({ sock, msg, remoteJid, reply }) => {
    try {
      // ✏️ Datos de tu número
      const ownerNumber = '51958959882';
      const ownerName = 'SiriuS - Creador'; 

      // 📇 Creamos la tarjeta de contacto oficial (vCard)
      const vcard = 'BEGIN:VCARD\n' +
                    'VERSION:3.0\n' +
                    `FN:${ownerName}\n` +
                    `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n` +
                    'END:VCARD';

      // 1️⃣ Enviamos la tarjeta de contacto interactiva para que puedan guardarte rápido
      await sock.sendMessage(remoteJid, {
        contacts: {
          displayName: ownerName,
          contacts: [{ vcard }]
        }
      }, { quoted: msg });

      // 2️⃣ Enviamos un mensajito extra con la personalidad de SiriusBot
      const texto = `👑 *EL CREADOR* 👑\n\n` +
                    `¿Encontraste un error en mi código perfecto? (Lo dudo mucho, seguro es tu internet). ¿Tienes alguna sugerencia o necesitas ayuda técnica?\n\n` +
                    `Puedes hablar directamente con mi desarrollador tocando el contacto de arriba o usando este enlace rápido:\n\n` +
                    `🔗 https://wa.me/${ownerNumber}`;

      await sock.sendMessage(remoteJid, { text: texto });

    } catch (err) {
      console.log('❌ Error en comando contacto:', err);
      // Respaldo de emergencia por si la tarjeta vCard falla en algún dispositivo
      return reply(`📞 *Contacto del Creador:*\n\nSi necesitas ayuda, escribe a: +51 958 959 882\n🔗 https://wa.me/51958959882`);
    }
  }
};
