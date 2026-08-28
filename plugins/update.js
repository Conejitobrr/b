'use strict';

const { exec } = require('child_process');

module.exports = {
  name: 'update',
  aliases: ['actualizar', 'pull'],
  category: 'owner',
  desc: 'Descarga los últimos cambios de GitHub y recarga comandos sin apagar el bot',
  
  execute: async ({ isOwner, reply }) => {
    if (!isOwner) return reply('❌ Comando exclusivo del dueño.');

    await reply('🔄 Sincronizando con GitHub...');

    exec('git pull origin main', async (error, stdout, stderr) => {
      if (error) {
        return reply(`❌ *Error al actualizar:*\n\n${error.message}`);
      }

      if (stdout.includes('Already up to date.') || stdout.includes('Ya está actualizado.')) {
        return reply('✅ El repositorio ya está en la última versión.');
      }

      let response = `✅ *Actualización descargada:*\n\n${stdout}`;
      
      try {
        // Recarga los plugins dinámicamente sin reiniciar la conexión de Baileys
        const { loadPlugins } = require('../handler');
        loadPlugins();
        response += '\n♻️ *Comandos recargados exitosamente.* Nuevos cambios aplicados en caliente.';
      } catch (e) {
        response += `\n⚠️ Error al recargar plugins en caliente: ${e.message}\nSe requiere reinicio manual para aplicar cambios.`;
      }

      await reply(response);
    });
  }
};
