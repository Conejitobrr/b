'use strict';

const fs = require('fs');
const path = require('path');

// 🔄 ENRUTADOR INTELIGENTE (Asigna cada comando a su categoría ideal automáticamente)
const AUTO_ROUTER = {
  // 📥 DESCARGAS
  'play': 'DESCARGAS', 'spotify': 'DESCARGAS', 'facebook': 'DESCARGAS', 'instagram': 'DESCARGAS', 'tiktok': 'DESCARGAS', 'video': 'DESCARGAS',
  
  // 🔄 CONVERTIDORES & TOOLS
  'tomp3': 'CONVERTIDORES', 'tovideo': 'CONVERTIDORES', 'toimage': 'CONVERTIDORES', 'tovoz': 'CONVERTIDORES', 'sticker': 'CONVERTIDORES', 'sbg': 'CONVERTIDORES', 'attp': 'CONVERTIDORES', 'filtro': 'CONVERTIDORES',
  
  // 🎭 ROLEPLAY & SOCIAL
  'roleplay': 'ROLEPLAY & SOCIAL', 'matrimonio': 'ROLEPLAY & SOCIAL', 'formarpareja': 'ROLEPLAY & SOCIAL', 'formarparejas': 'ROLEPLAY & SOCIAL', 'piropo': 'ROLEPLAY & SOCIAL', 'insulto': 'ROLEPLAY & SOCIAL', 'gay': 'ROLEPLAY & SOCIAL', 'gay2': 'ROLEPLAY & SOCIAL', 'follar': 'ROLEPLAY & SOCIAL', 'fake': 'ROLEPLAY & SOCIAL', 'tweet': 'ROLEPLAY & SOCIAL', 'felizcumple': 'ROLEPLAY & SOCIAL',
  
  // 🤖 INTELIGENCIA ARTIFICIAL
  'ai': 'INTELIGENCIA ARTIFICIAL', 'clon': 'INTELIGENCIA ARTIFICIAL', 'acento': 'INTELIGENCIA ARTIFICIAL', 'resumen': 'INTELIGENCIA ARTIFICIAL', 'juez': 'INTELIGENCIA ARTIFICIAL', 'oraculo': 'INTELIGENCIA ARTIFICIAL',
  
  // 🎮 JUEGOS & CASINO
  'cartas': 'JUEGOS', 'granja': 'JUEGOS', 'mascotas': 'JUEGOS', 'trivia': 'JUEGOS', 'ruleta': 'JUEGOS', 'slot': 'JUEGOS', 'pokedex': 'JUEGOS', 'verdad': 'JUEGOS', 'reto': 'JUEGOS', 'pregunta': 'JUEGOS', 'edad': 'JUEGOS', 'nacionalidad': 'JUEGOS', 'explotar': 'JUEGOS', 'doxear': 'JUEGOS',
  
  // 💰 ECONOMÍA & RPG
  'policia': 'ECONOMÍA & RPG', 'robar': 'ECONOMÍA & RPG', 'tienda': 'ECONOMÍA & RPG', 'cazar': 'ECONOMÍA & RPG', 'minar': 'ECONOMÍA & RPG', 'pescar': 'ECONOMÍA & RPG', 'talar': 'ECONOMÍA & RPG', 'trabajar': 'ECONOMÍA & RPG', 'claim': 'ECONOMÍA & RPG', 'inventario': 'ECONOMÍA & RPG', 'perfil': 'ECONOMÍA & RPG', 'rank': 'ECONOMÍA & RPG', 'topxp': 'ECONOMÍA & RPG',
  
  // 🔎 UTILIDAD & BÚSQUEDA
  'letra': 'UTILIDAD & BÚSQUEDA', 'shazam': 'UTILIDAD & BÚSQUEDA', 'clima': 'UTILIDAD & BÚSQUEDA', 'ping': 'UTILIDAD & BÚSQUEDA', 'estado': 'UTILIDAD & BÚSQUEDA', 'ver': 'UTILIDAD & BÚSQUEDA', 'menu': 'UTILIDAD & BÚSQUEDA', 'donar': 'UTILIDAD & BÚSQUEDA', 'tts': 'UTILIDAD & BÚSQUEDA',
  
  // 🛡️ MODERACIÓN & GRUPO
  'mutear': 'MODERACIÓN & GRUPO', 'warns': 'MODERACIÓN & GRUPO', 'del': 'MODERACIÓN & GRUPO', 'antidelete': 'MODERACIÓN & GRUPO', 'admin': 'MODERACIÓN & GRUPO', 'config': 'MODERACIÓN & GRUPO', 'notify': 'MODERACIÓN & GRUPO', 'add': 'MODERACIÓN & GRUPO',
  
  // 👑 OWNER
  'ban': 'OWNER', 'addxp': 'OWNER', 'update': 'OWNER'
};

// 🎨 DICCIONARIO DE ICONOS MAESTROS
const MASTER_CATEGORIES = {
  'MODERACIÓN & GRUPO': '🛡️',
  'DESCARGAS': '📥',
  'CONVERTIDORES': '🔄',
  'ECONOMÍA & RPG': '💰',
  'JUEGOS': '🎮',
  'ROLEPLAY & SOCIAL': '🎭',
  'INTELIGENCIA ARTIFICIAL': '🤖',
  'UTILIDAD & BÚSQUEDA': '🔎',
  'OWNER': '👑'
};

function getMasterCategory(pluginName, pluginCat) {
  if (AUTO_ROUTER[pluginName]) return AUTO_ROUTER[pluginName];
  return (pluginCat || 'OTROS').toUpperCase();
}

module.exports = {
  name: 'menu',
  aliases: ['help', 'ayuda', 'comandos', 'list'],
  category: 'utilidad',
  desc: 'Muestra el menú principal de comandos organizados',
  
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
            const finalCategory = getMasterCategory(plugin.name.toLowerCase(), plugin.category);
            
            if (finalCategory === 'OWNER' && !isOwner) continue;

            if (!categories[finalCategory]) {
              categories[finalCategory] = [];
            }
            
            categories[finalCategory].push({
              name: plugin.name,
              aliases: (plugin.aliases && Array.isArray(plugin.aliases)) ? plugin.aliases.filter(a => a !== plugin.name) : [],
              desc: plugin.desc || 'Sin descripción'
            });
            totalCommands++;
          }
        } catch (e) {}
      }

      let menuText = `╔══════════════════════╗\n`;
      menuText += `        🌌 *SIRIUS BOT PRO* 🌌\n`;
      menuText += `╚══════════════════════╝\n\n`;
      menuText += `👤 Hola *${pushName || 'Usuario'}* ✨\n`;
      menuText += `⚙️ Prefijo: *${config.prefix}*\n`;
      menuText += `📦 Plugins Activos: *${totalCommands}*\n\n`;

      // Ordenar alfabéticamente, pero dejar OWNER al final
      const sortedCategories = Object.keys(categories).sort((a, b) => {
         if (a === 'OWNER') return 1;
         if (b === 'OWNER') return -1;
         return a.localeCompare(b);
      });

      for (const category of sortedCategories) {
        const icon = MASTER_CATEGORIES[category] || '📌';
        const cmds = categories[category];
        
        menuText += `━━━━━━━━━━━━━━━━━━━\n`;
        menuText += `${icon} *${category}* (${cmds.length})\n`;
        menuText += `━━━━━━━━━━━━━━━━━━━\n`;
        
        cmds.sort((a, b) => a.name.localeCompare(b.name));

        for (const cmd of cmds) {
          menuText += `✦ *${config.prefix}${cmd.name}*\n`;
          if (cmd.aliases && cmd.aliases.length > 0) {
            menuText += `  ├ ◦ _${cmd.desc}_\n`;
            menuText += `  ╰ ◦ 🔹 _${cmd.aliases.join(', ')}_\n\n`;
          } else {
            menuText += `  ╰ ◦ _${cmd.desc}_\n\n`;
          }
        }
      }

      menuText += `🚀 _Usa los comandos y sube de nivel_`;

      await sock.sendMessage(remoteJid, { text: menuText.trim() }, { quoted: msg });
      
    } catch (err) {
      console.log('❌ Error en menú:', err);
      return reply('❌ Ocurrió un error al generar el menú dinámico.');
    }
  }
};
