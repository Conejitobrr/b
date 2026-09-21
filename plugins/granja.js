'use strict';

const fs = require('fs');
const path = require('path');

// 📂 SISTEMA DE BASE DE DATOS LOCAL EXCLUSIVA PARA LA GRANJA
const DB_DIR = path.join(process.cwd(), 'database');
const DB_FILE = path.join(DB_DIR, 'granjas.json');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));

function cargarGranjas() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function guardarGranjas(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 🐓 CATÁLOGO DE ANIMALES Y ESTADÍSTICAS
const CATALOGO = {
  gallina: { emoji: '🐔', cria: '🐥', costo: 150, prod: '🥚', prodName: 'Huevos', prodTime: 60, growTime: 120, sellAdult: 200, tipo: 'productor' },
  vaca:    { emoji: '🐄', cria: '🐮', costo: 600, prod: '🥛', prodName: 'Leche', prodTime: 180, growTime: 300, sellAdult: 900, tipo: 'productor' },
  oveja:   { emoji: '🐑', cria: '🐏', costo: 400, prod: '🧶', prodName: 'Lana', prodTime: 120, growTime: 240, sellAdult: 600, tipo: 'productor' },
  cerdo:   { emoji: '🐖', cria: '🐷', costo: 350, prod: '🥓', prodName: 'Carne', prodTime: 0, growTime: 400, sellAdult: 1000, tipo: 'engorde' },
  gallo:   { emoji: '🐓', cria: '🐣', costo: 1000, tipo: 'especial', desc: 'Avisa cuando hay cosechas o animales listos.' },
  perro:   { emoji: '🐕', cria: '🐶', costo: 1500, tipo: 'especial', desc: 'Protege tu granja de robos al recolectar.' }
};

// PRECIOS DE VENTA DE PRODUCTOS EN EL MERCADO
const MERCADO = { '🥚': 20, '🥛': 80, '🧶': 50, '🥓': 0 };

module.exports = {
  name: 'granja',
  aliases: ['mi', 'tiendagranja', 'comprar', 'recolectar', 'vender', 'alquiler', 'ver'],
  category: 'juegos',
  desc: 'Simulador profesional de Granja RPG',

  // 🔥 CORRECCIÓN: Usamos commandName y sender tal como lo hace tu framework
  execute: async ({ sock, msg, remoteJid, args, commandName, sender, reply }) => {
    const cmd = commandName?.toLowerCase();
    let db = cargarGranjas();
    
    // Iniciar cuenta del usuario si no existe
    if (!db[sender]) {
      db[sender] = {
        monedas: 1000,
        terreno: 5, // Capacidad máxima inicial
        alquilerVence: Date.now() + (86400000 * 3), // 3 días gratis al iniciar
        animales: [],
        inventario: { '🥚': 0, '🥛': 0, '🧶': 0 }
      };
      guardarGranjas(db);
    }
    const miGranja = db[sender];

    // ==========================================
    // 🏪 COMANDO: .tiendagranja
    // ==========================================
    if (cmd === 'tiendagranja') {
      let txt = `🏪 *MERCADO AGRÍCOLA* 🏪\n_Monedas:_ 🪙 ${miGranja.monedas}\n\n`;
      for (const [key, data] of Object.entries(CATALOGO)) {
        txt += `*${data.emoji} ${key.toUpperCase()}* - 🪙 ${data.costo}\n`;
        if (data.tipo === 'productor') txt += `↳ Produce: ${data.prod} (Venta: 🪙${MERCADO[data.prod]})\n`;
        if (data.tipo === 'engorde') txt += `↳ Uso: Venta de adulto (🪙${data.sellAdult})\n`;
        if (data.tipo === 'especial') txt += `↳ Habilidad: ${data.desc}\n`;
      }
      txt += `\n📌 *Comprar:* .comprar [animal] [nombre]\n📌 *Mejorar Terreno:* .comprar terreno (Cuesta 🪙1000, +5 espacio)`;
      return reply(txt);
    }

    // ==========================================
    // 🛒 COMANDO: .comprar [animal] [nombre]
    // ==========================================
    if (cmd === 'comprar') {
      const tipo = args[0]?.toLowerCase();
      const nombre = args.slice(1).join(' ');

      if (tipo === 'terreno') {
        if (miGranja.monedas < 1000) return reply('❌ Necesitas 🪙 1000 para expandir el terreno.');
        miGranja.monedas -= 1000;
        miGranja.terreno += 5;
        guardarGranjas(db);
        return reply(`✅ Has expandido tu terreno. Capacidad actual: ${miGranja.terreno} animales.`);
      }

      if (!CATALOGO[tipo]) return reply('❌ Animal no encontrado. Usa *.tiendagranja*');
      if (!nombre) return reply('❌ Debes ponerle un nombre. Ejemplo: *.comprar vaca Lola*');
      if (miGranja.animales.length >= miGranja.terreno) return reply('❌ Terreno lleno. Debes *.comprar terreno* o vender un animal.');
      if (miGranja.monedas < CATALOGO[tipo].costo) return reply(`❌ Cuesta 🪙 ${CATALOGO[tipo].costo}. Te faltan monedas.`);

      const existe = miGranja.animales.find(a => a.nombre.toLowerCase() === nombre.toLowerCase());
      if (existe) return reply('❌ Ya tienes un animal con ese nombre.');

      miGranja.monedas -= CATALOGO[tipo].costo;
      miGranja.animales.push({
        tipo: tipo,
        nombre: nombre,
        nacio: Date.now(),
        ultimaCosecha: Date.now(),
        adulto: false
      });
      guardarGranjas(db);
      return reply(`🎉 ¡Bienvenido/a a la granja, *${nombre}* ${CATALOGO[tipo].cria}!\nCuidalo bien para que crezca.`);
    }

    // ==========================================
    // 🚜 COMANDO: .granja / .mi (Ver estado y Corral)
    // ==========================================
    if (cmd === 'granja' || cmd === 'mi') {
      const ahora = Date.now();
      const alquilerVencido = ahora > miGranja.alquilerVence;
      
      let reporteGallo = '';
      let tieneGallo = miGranja.animales.some(a => a.tipo === 'gallo' && a.adulto);
      let listosCosecha = 0;
      let recienAdultos = 0;

      // Actualizar crecimiento y cosechas
      miGranja.animales.forEach(a => {
        const spec = CATALOGO[a.tipo];
        if (!a.adulto && (ahora - a.nacio) >= (spec.growTime * 60 * 1000)) {
          a.adulto = true;
          recienAdultos++;
        }
        if (a.adulto && spec.prodTime > 0 && (ahora - a.ultimaCosecha) >= (spec.prodTime * 60 * 1000)) {
          listosCosecha++;
        }
      });
      guardarGranjas(db);

      // Habilidad del Gallo
      if (tieneGallo) {
        reporteGallo = `\n🐓 *Alerta del Gallo:* `;
        if (listosCosecha > 0 || recienAdultos > 0) {
          reporteGallo += `¡Kikiriki! Tienes ${listosCosecha} cosechas listas y ${recienAdultos} animales crecieron.\n`;
        } else {
          reporteGallo += `Todo tranquilo en la granja.\n`;
        }
      }

      // Generar corral visual aleatorio con ASCII
      const grid = Array(15).fill('  ');
      miGranja.animales.forEach(a => {
        let pos = Math.floor(Math.random() * 15);
        while (grid[pos] !== '  ') pos = Math.floor(Math.random() * 15);
        grid[pos] = a.adulto ? CATALOGO[a.tipo].emoji : CATALOGO[a.tipo].cria;
      });

      let corralASCII = `
╔═════════════════════════╗
║ ${grid[0]}  ${grid[1]}  ${grid[2]}  ${grid[3]}  ${grid[4]} ║
║ ${grid[5]}  ${grid[6]}  ${grid[7]}  ${grid[8]}  ${grid[9]} ║
║ ${grid[10]}  ${grid[11]}  ${grid[12]}  ${grid[13]}  ${grid[14]} ║
╚═════════════════════════╝`;

      let msgText = `🏡 *GRANJA DE @${sender.split('@')[0]}* 🏡\n${reporteGallo}${corralASCII}\n\n`;
      msgText += `🪙 *Monedas:* ${miGranja.monedas}\n`;
      msgText += `📦 *Capacidad:* ${miGranja.animales.length}/${miGranja.terreno}\n`;
      
      const diasAlquiler = Math.ceil((miGranja.alquilerVence - ahora) / 86400000);
      msgText += alquilerVencido 
        ? `⚠️ *ALQUILER VENCIDO:* Paga con .alquiler o no podrás cosechar.\n`
        : `📜 *Alquiler pagado por:* ${diasAlquiler} días\n`;
      
      msgText += `\n🎒 *Inventario:* 🥚${miGranja.inventario['🥚']} | 🥛${miGranja.inventario['🥛']} | 🧶${miGranja.inventario['🧶']}`;
      msgText += `\n📌 *Detalles:* .ver [nombre] | *Recoger:* .recolectar`;

      return sock.sendMessage(remoteJid, { text: msgText, mentions: [sender] }, { quoted: msg });
    }

    // ==========================================
    // 🔍 COMANDO: .ver [nombre]
    // ==========================================
    if (cmd === 'ver') {
      const nombre = args.join(' ');
      if (!nombre) return reply('❌ Escribe el nombre del animal. Ejemplo: *.ver Lola*');
      
      const animal = miGranja.animales.find(a => a.nombre.toLowerCase() === nombre.toLowerCase());
      if (!animal) return reply('❌ No tienes ningún animal con ese nombre.');

      const spec = CATALOGO[animal.tipo];
      const ahora = Date.now();
      const estado = animal.adulto ? 'Adulto' : 'Cría (Creciendo...)';
      const icono = animal.adulto ? spec.emoji : spec.cria;
      
      let info = `📋 *INFO DEL ANIMAL* 📋\n\n`;
      info += `${icono} *Nombre:* ${animal.nombre}\n`;
      info += `🏷️ *Tipo:* ${animal.tipo.toUpperCase()}\n`;
      info += `📈 *Estado:* ${estado}\n`;

      if (animal.adulto && spec.tipo === 'productor') {
        const tiempoFaltante = (spec.prodTime * 60 * 1000) - (ahora - animal.ultimaCosecha);
        if (tiempoFaltante <= 0) info += `✅ *Producción:* ¡Listo para recolectar!\n`;
        else info += `⏳ *Producción:* Faltan ${Math.ceil(tiempoFaltante / 60000)} minutos.\n`;
      }
      
      if (animal.adulto) info += `💰 *Valor de Venta:* 🪙 ${spec.sellAdult} (.vender ${animal.nombre})\n`;

      return reply(info);
    }

    // ==========================================
    // 🧺 COMANDO: .recolectar
    // ==========================================
    if (cmd === 'recolectar') {
      const ahora = Date.now();
      if (ahora > miGranja.alquilerVence) return reply('⚠️ El banco congeló tus bienes. Debes usar *.alquiler* para pagar tu deuda primero.');

      // Evento aleatorio de robo (15% probabilidad)
      const hayZorro = Math.random() < 0.15;
      const tienePerro = miGranja.animales.some(a => a.tipo === 'perro' && a.adulto);

      if (hayZorro) {
        if (tienePerro) {
          await reply('🦊 *¡Un zorro intentó robar tu cosecha!*\n🐕 Pero tu perro lo espantó a mordiscos. ¡Cosecha salvada!');
        } else {
          return reply('🦊 *¡ATAQUE DE ZORRO!*\nEntró a la granja y te robó lo que ibas a cosechar hoy. Necesitas *.comprar perro* para protegerte en el futuro.');
        }
      }

      let recolectado = {};
      let total = 0;

      miGranja.animales.forEach(a => {
        const spec = CATALOGO[a.tipo];
        if (a.adulto && spec.tipo === 'productor') {
          if ((ahora - a.ultimaCosecha) >= (spec.prodTime * 60 * 1000)) {
            miGranja.inventario[spec.prod] += 1;
            recolectado[spec.prod] = (recolectado[spec.prod] || 0) + 1;
            a.ultimaCosecha = ahora;
            total++;
          }
        }
      });

      guardarGranjas(db);

      if (total === 0) return reply('❌ No hay nada listo para recolectar aún. Usa *.ver [nombre]* para checar el tiempo.');
      let res = `🧺 *COSECHA EXITOSA* 🧺\nHas recogido:\n`;
      for (const [item, cant] of Object.entries(recolectado)) res += `${item} x${cant}\n`;
      res += `\nUsa *.vender productos* para ganar monedas.`;
      return reply(res);
    }

    // ==========================================
    // 💰 COMANDO: .vender [productos/nombreAnimal]
    // ==========================================
    if (cmd === 'vender') {
      const input = args.join(' ').toLowerCase();
      if (!input) return reply('❌ Escribe qué quieres vender. Ejemplo: *.vender productos* o *.vender Lola*');

      // Opción A: Vender lo recolectado
      if (input === 'productos') {
        let ganancia = 0;
        let resumen = '';
        for (const [item, cant] of Object.entries(miGranja.inventario)) {
          if (cant > 0) {
            const oro = cant * MERCADO[item];
            ganancia += oro;
            resumen += `${item} x${cant} = 🪙${oro}\n`;
            miGranja.inventario[item] = 0;
          }
        }
        if (ganancia === 0) return reply('❌ Tu inventario está vacío, no hay nada que vender.');
        miGranja.monedas += ganancia;
        guardarGranjas(db);
        return reply(`⚖️ *MERCADO* ⚖️\nVendiste tus productos:\n${resumen}\n✅ Ganancia total: 🪙 ${ganancia}`);
      }

      // Opción B: Vender un animal (Ej: el cerdo para engorde)
      const index = miGranja.animales.findIndex(a => a.nombre.toLowerCase() === input);
      if (index === -1) return reply('❌ No tienes un animal con ese nombre.');
      const animal = miGranja.animales[index];
      
      if (!animal.adulto) return reply(`❌ ${animal.nombre} aún es una cría, nadie lo quiere comprar. Espera a que crezca.`);
      
      const oro = CATALOGO[animal.tipo].sellAdult;
      miGranja.monedas += oro;
      miGranja.animales.splice(index, 1);
      guardarGranjas(db);
      return reply(`🚜 Un camión vino y se llevó a *${animal.nombre}*.\nHas ganado 🪙 ${oro} por la venta.`);
    }

    // ==========================================
    // 📝 COMANDO: .alquiler
    // ==========================================
    if (cmd === 'alquiler') {
      const costoDiario = 50 + (miGranja.animales.length * 20); // El alquiler sube si tienes más animales
      
      if (args[0] !== 'pagar') {
        const estado = Date.now() > miGranja.alquilerVence ? '🔴 VENCIDO' : '🟢 Al día';
        return reply(`📜 *CONTRATO DE TERRENO*\nEstado: ${estado}\nCosto por día: 🪙 ${costoDiario}\n\nPara pagar 1 día escribe: *.alquiler pagar*`);
      }

      if (miGranja.monedas < costoDiario) return reply(`❌ Necesitas 🪙 ${costoDiario} para pagar el alquiler de hoy.`);
      
      miGranja.monedas -= costoDiario;
      const ahora = Date.now();
      
      if (ahora > miGranja.alquilerVence) miGranja.alquilerVence = ahora + 86400000;
      else miGranja.alquilerVence += 86400000;
      
      guardarGranjas(db);
      return reply(`✅ Has pagado 🪙 ${costoDiario}. Tu alquiler se extendió 1 día más.`);
    }
  }
};
