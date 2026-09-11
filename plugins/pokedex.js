'use strict';

const axios = require('axios');

// 🌐 DICCIONARIO DE TRADUCCIÓN DE TIPOS
const tiposEs = {
  normal: 'Normal ⚪', fighting: 'Lucha 🥊', flying: 'Volador 🦅', poison: 'Veneno ☠️',
  ground: 'Tierra 🌍', rock: 'Roca 🪨', bug: 'Bicho 🐛', ghost: 'Fantasma 👻',
  steel: 'Acero ⚙️', fire: 'Fuego 🔥', water: 'Agua 💧', grass: 'Planta 🌿',
  electric: 'Eléctrico ⚡', psychic: 'Psíquico 🔮', ice: 'Hielo ❄️', dragon: 'Dragón 🐉',
  dark: 'Siniestro 🌑', fairy: 'Hada 🧚'
};

module.exports = {
  name: 'pokedex',
  aliases: ['pokemon', 'poke'],
  category: 'juegos',
  desc: 'Muestra información detallada de cualquier Pokémon',

  execute: async ({ sock, msg, remoteJid, args, reply }) => {
    if (args.length === 0) {
      return reply('❌ Escribe el nombre o el número de un Pokémon.\n📌 *Ejemplo:* .pokedex lucario');
    }

    const pokeName = args.join('-').toLowerCase();
    const loadMsg = await sock.sendMessage(remoteJid, { text: '🔍 _Buscando en la PokéDex Nacional..._' }, { quoted: msg });

    try {
      // 1️⃣ CONECTAR A LA POKÉAPI (100% Gratuita y sin límites)
      const res = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokeName}`);
      const data = res.data;

      // 2️⃣ EXTRAER Y FORMATEAR DATOS
      const nombre = data.name.charAt(0).toUpperCase() + data.name.slice(1);
      const id = data.id;
      const peso = (data.weight / 10).toFixed(1); // Convertir hectogramos a kg
      const altura = (data.height / 10).toFixed(1); // Convertir decímetros a metros
      
      const tipos = data.types.map(t => tiposEs[t.type.name] || t.type.name.toUpperCase()).join(' | ');
      const habilidades = data.abilities.map(a => a.ability.name).join(', ');

      // 3️⃣ ARMAR ESTADÍSTICAS
      let statsTxt = '';
      data.stats.forEach(s => {
        const statName = s.stat.name.toUpperCase().replace('-', ' ');
        statsTxt += `  ◦ *${statName}:* ${s.base_stat}\n`;
      });

      // 4️⃣ OBTENER IMAGEN EN ALTA CALIDAD (Artwork Oficial)
      const imageUrl = data.sprites.other['official-artwork'].front_default || data.sprites.front_default;

      // 5️⃣ DESCARGAR IMAGEN A LA MEMORIA RAM
      const imageDownload = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const bufferImagen = Buffer.from(imageDownload.data);

      const caption = `📱 *POKÉDEX NACIONAL* 📱\n\n🔖 *Nombre:* ${nombre} (#${id})\n🧬 *Tipo:* ${tipos}\n⚖️ *Peso:* ${peso} kg\n📏 *Altura:* ${altura} m\n\n✨ *Habilidades:* ${habilidades}\n\n📊 *ESTADÍSTICAS BASE:*\n${statsTxt}`;

      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // 6️⃣ ENVIAR FICHA TÉCNICA
      await sock.sendMessage(remoteJid, {
        image: bufferImagen,
        caption: caption
      }, { quoted: msg });

    } catch (err) {
      await sock.sendMessage(remoteJid, { delete: loadMsg.key });
      
      // Si la API devuelve Error 404, el Pokémon no existe
      if (err.response && err.response.status === 404) {
        return reply('❌ Pokémon no encontrado. Verifica que el nombre o número esté bien escrito.');
      }
      console.log('❌ Error en Pokedex:', err.message);
      return reply('❌ Ocurrió un error interno al conectar con la PokéDex.');
    }
  }
};
