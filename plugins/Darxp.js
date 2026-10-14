'use strict';

module.exports = {
  name: 'darxp',
  aliases: ['dar', 'transferir', 'donar'],
  category: 'economía',
  desc: 'Regala tu XP a otro usuario (o págale tus deudas)',

  execute: async ({ sock, msg, remoteJid, sender, args, reply, db }) => {
    try {
      // Verificar si la base de datos está activa
      if (!db) return reply('❌ Error: El banco central de SiriusBot está caído (No hay conexión a la base de datos).');

      // 1. Detección inteligente del objetivo (Mención o Mensaje Citado)
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const quoted = contextInfo?.participant;
      const mentioned = contextInfo?.mentionedJid?.[0];

      const target = mentioned || quoted;

      if (!target) {
        return reply('❌ Tienes que mencionar o responder al mensaje del que va a recibir la limosna, pe.\n\n📌 *Ejemplo:*\n.dar @usuario 500');
      }

      if (target === sender) {
        return reply('❌ No te puedes donar XP a ti mismo, no seas esquizofrénico 🤡.');
      }

      // 2. Extraer la cantidad (busca el primer número válido en todo tu texto)
      const amount = parseInt(args.find(a => /^\d+$/.test(a)));

      if (!amount || amount <= 0) {
        return reply('❌ ¿Cuánto vas a soltar? Ingresa una cantidad válida.\n\n📌 *Ejemplo:*\n.dar @usuario 500');
      }

      // 3. Consultar las cuentas en la Base de Datos
      const senderData = await db.getUser(sender);
      const targetData = await db.getUser(target);

      // Verificar si el que envía tiene suficiente saldo
      if (!senderData || (senderData.xp || 0) < amount) {
        return reply(`❌ ¡Estás recontra aguja, mano! No tienes *${amount} XP* para andar regalando. Anda a chambear primero 💀.`);
      }

      // 4. Realizar la transferencia
      senderData.xp -= amount;
      targetData.xp = (targetData.xp || 0) + amount;

      // Guardar los cambios (usamos el mismo método de guardado que tienes en otros plugins)
      if (typeof senderData.save === 'function') await senderData.save();
      if (typeof targetData.save === 'function') await targetData.save();

      // Si por alguna razón tu db usa un método global de transferXP, también lo intentamos como respaldo
      if (typeof db.transferXP === 'function') {
        try { await db.transferXP(sender, target, amount); } catch (e) {}
      }

      // 5. Confirmación visual con mención azul
      const number = target.split('@')[0];

      await sock.sendMessage(remoteJid, {
        text: `💸 *TRANSFERENCIA EXITOSA* 💸\n\nHas soltado *${amount} XP* a la cuenta de @${number}.\n\n_Ahora eres un poco más pobre._ 📉`,
        mentions: [target]
      }, { quoted: msg });

    } catch (error) {
      console.log('❌ Error en comando darxp:', error);
      return reply('❌ Ocurrió un error al intentar hacer la transferencia. El banco colapsó.');
    }
  }
};
