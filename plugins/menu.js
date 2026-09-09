'use strict';

const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'menu',
  aliases: ['help', 'ayuda', 'comandos', 'list'],
  category: 'utilidad',
  desc: 'Muestra este menú dinámico de comandos',
  
  execute: async ({ sock, msg, remoteJid, pushName, config, isOwner, reply }) => {
    try {
      const PLUGINS_DIR = path.join(process.cwd(), 'plugins');
      // Leer automáticamente todos los archivos .js en la carpeta plugins
      const files = fs.readdirSync(PLUGINS_DIR).filter(file => file.endsWith('.js'));
      
      const categories = {};
      let totalCommands = 0;

      for (const file of files) {
        try {
          const filepath = path.join(PLUGINS_DIR, file);
          const plugin = require(filepath); // Obtiene la info del comando
          
          if (plugin.name && typeof plugin.execute === 'function') {
            const category = plugin.category ? plugin.category.toUpperCase() : 'SIN CATEGORÍA';
            
            // 🔥 TRUCO: Ocultar los comandos del Owner a los usuarios normales
            if (category === 'OWNER' && !isOwner) continue;

            if (!categories[category]) {
              categories[category] = [];
            }
            
            categories[category].push({
              name: plugin.name,
              desc: plugin.desc || 'Sin descripción'
            });
            totalCommands++;
          }
        } catch (e) {
          // Ignorar archivos que no sean comandos válidos
        }
      }

      let menuText = `╭─❖「 *SIRIUS BOT PRO* 」
│ 👋 Hola, *${pushName}*
│ ⚙️ Prefijo: [ *${config.prefix}* ]
│ 📦 Comandos: *${totalCommands}*
╰─────────────────\n\n`;

      // Ordenar las categorías alfabéticamente
      const sortedCategories = Object.keys(categories).sort();

      for (const category of sortedCategories) {
        // Emojis dinámicos según la categoría
        let icon = '❖';
        if (category.includes('UTILIDAD') || category.includes('HERRAMIENTA')) icon = '🛠️';
        if (category.includes('ADMINISTRACIÓN') || category.includes('MODERACIÓN')) icon = '🛡️';
        if (category.includes('DIVERSIÓN') || category.includes('JUEGOS')) icon = '🎮';
        if (category.includes('MULTIMEDIA') || category.includes('DESCARGAS')) icon = '📥';
        if (category.includes('ECONOMÍA') || category.includes('RPG')) icon = '💰';
        if (category.includes('OWNER')) icon = '👑';
        if (category.includes('CONFIGURACIÓN')) icon = '⚙️';
        if (category.includes('INTELIGENCIA ARTIFICIAL')) icon = '🤖';

        menuText += `*${icon} ${category}*\n`;
        
        // Ordenar los comandos alfabéticamente dentro de cada categoría
        categories[category].sort((a, b) => a.name.localeCompare(b.name));

        for (const cmd of categories[category]) {
          menuText += ` ✦ ${config.prefix}${cmd.name} - _${cmd.desc}_\n`;
        }
        menuText += `\n`;
      }

      menuText += `_SiriusBot Pro - Refactorizado al 100%_ 🚀`;

      // Enviar el menú directamente
      await sock.sendMessage(
        remoteJid, 
        { text: menuText.trim() }, 
        { quoted: msg }
      );
      
    } catch (err) {
      console.log('❌ Error en menú:', err);
      return reply('❌ Ocurrió un error al generar el menú dinámico.');
    }
  }
};
