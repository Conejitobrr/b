'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'menu',
  aliases: ['help', 'ayuda', 'comandos', 'list'],
  category: 'utilidad',
  desc: 'Muestra el menú principal de comandos',
  
  execute: async ({ sock, msg, remoteJid, pushName, config, isOwner, reply }) => {
    try {
      const PLUGINS_DIR = path.join(process.cwd(), 'plugins');
      const files = fs.readdirSync(PLUGINS_DIR).filter(file => file.endsWith('.js'));
      
      const categories = {};
      let totalCommands = 0;

      for (const file of files) {
        try {
          const filepath = path.join(PLUGINS_DIR, file);
          const plugin = require(filepath); 
          
          if (plugin.name && typeof plugin.execute === 'function') {
            const category = plugin.category ? plugin.category.toUpperCase() : 'SIN CATEGORÍA';
            
            if (category === 'OWNER' && !isOwner) continue;

            if (!categories[category]) {
              categories[category] = [];
            }
            
            categories[category].push({
              name: plugin.name,
              // 🔥 AHORA CAPTURA LOS ALIASES
              aliases: (plugin.aliases && Array.isArray(plugin.aliases)) ? plugin.aliases.filter(a => a !== plugin.name) : [],
              desc: plugin.desc || 'Sin descripción'
            });
            totalCommands++;
          }
        } catch (e) {}
      }

      let menuText = `╔══════════════════════╗
        🌌 *SIRIUS BOT PRO* 🌌
╚══════════════════════╝

👤 Hola *${pushName || 'Usuario'}* ✨
⚙️ Prefijo: *${config.prefix}*
📦 Plugins Activos: *${totalCommands}*\n\n`;

      const sortedCategories = Object.keys(categories).sort();

      for (const category of sortedCategories) {
        let icon = '📌';
        if (category.includes('ADMINISTRACIÓN') || category.includes('MODERACIÓN')) icon = '🛡️';
        else if (category.includes('DIVERSIÓN') || category.includes('JUEGOS')) icon = '🎲';
        else if (category.includes('MULTIMEDIA') || category.includes('DESCARGAS')) icon = '🎵';
        else if (category.includes('ECONOMÍA') || category.includes('RPG')) icon = '💰';
        else if (category.includes('OWNER')) icon = '👑';
        else if (category.includes('INTELIGENCIA ARTIFICIAL') || category.includes('IA')) icon = '🤖';
        else if (category.includes('MASCOTA')) icon = '🐾';
        else if (category.includes('POLICÍA') || category.includes('CARCEL')) icon = '🚔';
        else if (category.includes('SOCIAL') || category.includes('ROMANCE')) icon = '💖';
        else if (category.includes('TOPS') || category.includes('RANKING')) icon = '🏆';
        else if (category.includes('BROMAS') || category.includes('CALCULADOR')) icon = '🤡';
        else if (category.includes('PREMIUM')) icon = '💎';

        menuText += `━━━━━━━━━━━━━━━━━━━\n`;
        menuText += `${icon} *${category}*\n`;
        menuText += `━━━━━━━━━━━━━━━━━━━\n`;
        
        categories[category].sort((a, b) => a.name.localeCompare(b.name));

        for (const cmd of categories[category]) {
          // 🔥 AHORA IMPRIME LOS ALIASES AL LADO DEL NOMBRE
          const aliasStr = cmd.aliases.length > 0 ? ` _[${cmd.aliases.join(', ')}]_` : '';
          menuText += `➤ *${config.prefix}${cmd.name}*${aliasStr} → ${cmd.desc}\n`;
        }
        menuText += `\n`;
      }

      menuText += `🚀 _Usa los comandos y sube de nivel_`;

      await sock.sendMessage(remoteJid, { text: menuText.trim() }, { quoted: msg });
      
    } catch (err) {
      console.log('❌ Error en menú:', err);
      return reply('❌ Ocurrió un error al generar el menú dinámico.');
    }
  }
};
