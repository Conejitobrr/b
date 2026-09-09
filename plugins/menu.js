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
      // Leer automáticamente todos los archivos .js en la carpeta plugins
      const files = fs.readdirSync(PLUGINS_DIR).filter(file => file.endsWith('.js'));
      
      const categories = {};
      let totalCommands = 0;

      for (const file of files) {
        try {
          const filepath = path.join(PLUGINS_DIR, file);
          const plugin = require(filepath); 
          
          if (plugin.name && typeof plugin.execute === 'function') {
            const category = plugin.category ? plugin.category.toUpperCase() : 'SIN CATEGORÍA';
            
            // 🚫 Ocultar los comandos del Owner a los usuarios normales
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
          // Ignorar archivos que tengan errores o no sean comandos válidos
        }
      }

      // 🎨 ENCABEZADO CON ESTILO CLÁSICO
      let menuText = `╔══════════════════════╗
        🌌 *SIRIUS BOT PRO* 🌌
╚══════════════════════╝

👤 Hola *${pushName || 'Usuario'}* ✨
⚙️ Prefijo: *${config.prefix}*
📦 Comandos Activos: *${totalCommands}*\n\n`;

      // Ordenar las categorías alfabéticamente
      const sortedCategories = Object.keys(categories).sort();

      for (const category of sortedCategories) {
        // 🔥 Emojis dinámicos ampliados basados en tu menú antiguo
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

        // 🎨 SEPARADORES CLÁSICOS
        menuText += `━━━━━━━━━━━━━━━━━━━\n`;
        menuText += `${icon} *${category}*\n`;
        menuText += `━━━━━━━━━━━━━━━━━━━\n`;
        
        // Ordenar los comandos alfabéticamente dentro de cada categoría
        categories[category].sort((a, b) => a.name.localeCompare(b.name));

        for (const cmd of categories[category]) {
          // 🎨 FORMATO DE ITEMS CLÁSICO CON FLECHITA
          menuText += `➤ *${config.prefix}${cmd.name}* → ${cmd.desc}\n`;
        }
        menuText += `\n`;
      }

      // 🎨 PIE DE PÁGINA
      menuText += `🚀 _Usa los comandos y sube de nivel_`;

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
