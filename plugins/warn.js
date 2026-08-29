'use strict';

const fs = require('fs');
const path = require('path');

// 🗄️ BÓVEDA LOCAL PARA WARNS (Compartida con el antilink)
const WARNS_PATH = path.join(process.cwd(), 'lib', 'warns.json');
if (!fs.existsSync(path.dirname(WARNS_PATH))) fs.mkdirSync(path.dirname(WARNS_PATH), { recursive: true });
if (!fs.existsSync(WARNS_PATH)) fs.writeFileSync(WARNS_PATH, '{}');

function getWarns() { try { return JSON.parse(fs.readFileSync(WARNS_PATH, 'utf8')); } catch { return {}; } }
function saveWarns(data) { fs.writeFileSync(WARNS_PATH, JSON.stringify(data, null, 2)); }

// 🔥 MISMA EXTRACCIÓN DEL RETO.JS Y ANTILINK PARA MENCIONES REALES
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

const MAX_WARN = 3;

module.exports = {
  name: 'warns',
  aliases: ['warn', 'unwarn', 'resetwarn', 'warnings'],
  category: 'administración',
  desc: 'Sistema manual de advertencias',

  execute: async ({ sock, msg, remoteJid, commandName, args, isOwner, isAdmin, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Comando exclusivo para grupos.');

    const dbWarns = getWarns();
    if (!dbWarns[remoteJid]) dbWarns[remoteJid] = {};
    const groupWarns = dbWarns[remoteJid];

    // 1. COMANDO: VER TODOS LOS WARNS DEL GRUPO
    if (commandName === 'warnings') {
      const entries = Object.entries(groupWarns).filter(([_, count]) => count > 0);
      if (!entries.length) return reply('✅ No hay usuarios con advertencias en este grupo.');
      
      let list = '⚠️ *WARNINGS DEL GRUPO*\n\n';
      const mentions = [];
      
      entries.forEach(([jid, count], i) => { 
        const pureNum = cleanNumber(jid);
        const formatJid = `${pureNum}@s.whatsapp.net`;
        list += `${i + 1}. @${pureNum} — *${count}/${MAX_WARN}*\n`; 
        mentions.push(formatJid);
      });
      
      return sock.sendMessage(remoteJid, { text: list, mentions }, { quoted: msg });
    }

    // 🛡️ Filtro de permisos para agregar/quitar warns
    if (!isAdmin && !isOwner) return reply('❌ Solo los administradores pueden usar este comando.');

    // Capturar al objetivo (mención o respuesta al mensaje)
    const targetRaw = msg.message?.extendedTextMessage?.contextInfo?.participant || msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!targetRaw) return reply('❌ Debes mencionar o responder al mensaje del usuario.');
    
    // Generación de ID y número puro
    const pureNumber = cleanNumber(targetRaw);
    const userJid = `${pureNumber}@s.whatsapp.net`;

    // 2. COMANDO: REINICIAR WARNS (0/3)
    if (commandName === 'resetwarn') {
      delete groupWarns[userJid];
      saveWarns(dbWarns);
      return sock.sendMessage(remoteJid, { 
        text: `✅ Warns reiniciados a 0 para @${pureNumber}.`, 
        mentions: [userJid] 
      }, { quoted: msg });
    }

    // 3. COMANDO: QUITAR 1 WARN (-1)
    if (commandName === 'unwarn') {
      const current = groupWarns[userJid] || 0;
      groupWarns[userJid] = Math.max(0, current - 1);
      saveWarns(dbWarns);
      return sock.sendMessage(remoteJid, { 
        text: `✅ Se quitó 1 warn a @${pureNumber}.\n🚨 Warns actuales: *${groupWarns[userJid]}/${MAX_WARN}*`, 
        mentions: [userJid] 
      }, { quoted: msg });
    }

    // 4. COMANDO: AGREGAR WARN (+1)
    if (commandName === 'warn') {
      const reason = args.join(' ').replace(/@\d+/g, '').trim() || 'Advertencia manual';
      
      const current = (groupWarns[userJid] || 0) + 1;
      groupWarns[userJid] = current;
      saveWarns(dbWarns);

      await sock.sendMessage(remoteJid, { 
        text: `⚠️ *ADVERTENCIA MANUAL*\n\n👤 Usuario: @${pureNumber}\n📌 Motivo: ${reason}\n🚨 Warns: *${current}/${MAX_WARN}*`, 
        mentions: [userJid] 
      }, { quoted: msg });

      // Expulsión si llega al máximo
      if (current >= MAX_WARN) {
        groupWarns[userJid] = 0; // Se reinicia para el futuro
        saveWarns(dbWarns);

        await sock.sendMessage(remoteJid, { 
          text: `🚫 *LÍMITE ALCANZADO*\n\n@${pureNumber} ha sido expulsado por llegar a *${MAX_WARN}* advertencias.`, 
          mentions: [userJid] 
        });

        // Retraso de 1 segundo para evitar crasheos de Baileys al expulsar
        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(remoteJid, [userJid], 'remove');
          } catch (err) {
            console.log('No se pudo expulsar manualmente:', err.message);
          }
        }, 1000);
      }
    }
  }
};
