'use strict';

const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

module.exports = {
  name: 'botones',
  aliases: ['panel', 'testbotones', 'menu2'],
  category: 'utilidad & búsqueda',
  desc: 'Abre el panel de botones interactivos y lista desplegable de SiriusBot',

  execute: async ({ sock, msg, remoteJid, sender, args, pushName, db, reply }) => {
    try {
      const userNum = cleanNumber(sender);
      const userData = await db.getUser(sender);
      const subCmd = (args[0] || '').toLowerCase();

      // 🎁 ACCIÓN INTERNA SI TOCAN EL BOTÓN DE "CAJA RÁPIDA"
      if (subCmd === 'premio') {
        const ganado = Math.floor(Math.random() * 400) + 100;
        userData.xp = (userData.xp || 0) + ganado;
        if (userData.save) await userData.save();

        return reply(`🎁 *¡BOTÓN DE LA SUERTE ACTIVADO!*\n\n✨ Has recibido *+${ganado} XP* al instante.\n💳 *Tu saldo actual:* ${userData.xp} XP`);
      }

      // 🎛️ CONSTRUCCIÓN DE BOTONES INTERACTIVOS (Protocolo NativeFlow 2026)
      const interactiveButtons = [
        // 1️⃣ Botón de Lista Desplegable (Abre menú flotante en WhatsApp)
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: '📂 Abrir Menú Rápido',
            sections: [
              {
                title: '💰 ECONOMÍA Y RPG',
                highlight_label: 'Popular',
                rows: [
                  { header: '🎁 Recompensa Diaria', title: 'Reclamar tu XP del día', description: 'Ejecuta .claim automáticamente', id: '.claim' },
                  { header: '🏦 Banco Central', title: 'Ver tu bóveda de XP', description: 'Ejecuta .banco automáticamente', id: '.banco' },
                  { header: '🛒 Tienda Oficial', title: 'Ver catálogo de ítems', description: 'Ejecuta .tienda automáticamente', id: '.tienda' },
                  { header: '🎒 Tu Mochila', title: 'Revisar tus objetos', description: 'Ejecuta .inventario automáticamente', id: '.inventario' }
                ]
              },
              {
                title: '🎮 JUEGOS GRUPALES',
                rows: [
                  { header: '🪢 Juego del Ahorcado', title: 'Iniciar o ver partida', description: 'Ejecuta .ahorcado', id: '.ahorcado' },
                  { header: '🧩 Anagrama Veloz', title: 'Ordena la palabra oculta', description: 'Ejecuta .anagrama', id: '.anagrama' },
                  { header: '🪂 Battle Royale', title: 'Iniciar Juegos del Hambre', description: 'Ejecuta .royale', id: '.royale' }
                ]
              },
              {
                title: '⚙️ SISTEMA',
                rows: [
                  { header: '📜 Menú Completo', title: 'Ver los +100 comandos', description: 'Ejecuta .menu', id: '.menu' },
                  { header: '📊 Estado del Bot', title: 'Ver rendimiento y RAM', description: 'Ejecuta .estado', id: '.estado' }
                ]
              }
            ]
          })
        },
        // 2️⃣ Botones de toque directo (Quick Reply)
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '🎲 Ganar XP Rápido',
            id: '.botones premio'
          })
        },
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '👤 Ver Mi Perfil',
            id: '.perfil'
          })
        },
        // 3️⃣ Botón de copiar al portapapeles
        {
          name: 'cta_copy',
          buttonParamsJson: JSON.stringify({
            display_text: '📋 Copiar Mi ID',
            id: 'copy_id',
            copy_code: userNum
          })
        }
      ];

      const messageContent = generateWAMessageFromContent(remoteJid, {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({
                text: `🌌 *PANEL INTERACTIVO SIRIUSBOT* 🌌\n\nHola *${pushName}* ✨\n💳 *Tu XP actual:* ${userData?.xp || 0} XP\n\nSelecciona una opción tocando los botones de abajo o abre la lista desplegable:`
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: '⚡ Sirius Bot Pro • Botones Interactivos'
              }),
              header: proto.Message.InteractiveMessage.Header.create({
                title: '🎛️ *CONTROL RÁPIDO*',
                subtitle: 'SiriusBot',
                hasMediaAttachment: false
              }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                buttons: interactiveButtons
              })
            })
          }
        }
      }, { userJid: sock.user.id, quoted: msg });

      // 🚀 Envío con nodo 'biz' requerido por WhatsApp en 2026 para renderizar botones en grupos y privado
      await sock.relayMessage(remoteJid, messageContent.message, {
        messageId: messageContent.key.id,
        additionalNodes: [
          {
            tag: 'biz',
            attrs: {},
            content: [
              {
                tag: 'interactive',
                attrs: { type: 'native_flow', v: '1' },
                content: [
                  {
                    tag: 'native_flow',
                    attrs: { v: '9', name: 'mixed' }
                  }
                ]
              }
            ]
          }
        ]
      });

    } catch (err) {
      console.log('❌ Error enviando botones:', err?.message || err);
      return reply('❌ Error al renderizar los botones interactivos en esta versión de Baileys.');
    }
  }
};
