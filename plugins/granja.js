'use strict';

const fs = require('fs');
const path = require('path');

// 📂 SISTEMA DE BASE DE DATOS LOCAL EXCLUSIVA
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

// 🐓 CATÁLOGO EXTENDIDO PRO
const CATALOGO = {
  gallina: { emoji: '🐔', cria: '🐥', costo: 150, prod: '🥚', prodName: 'Huevos', prodTime: 60, growTime: 120, sellAdult: 200, tipo: 'productor' },
  vaca:    { emoji: '🐄', cria: '🐮', costo: 600, prod: '🥛', prodName: 'Leche', prodTime: 180, growTime: 300, sellAdult: 900, tipo: 'productor' },
  oveja:   { emoji: '🐑', cria: '🐏', costo: 400, prod: '🧶', prodName: 'Lana', prodTime: 120, growTime: 240, sellAdult: 600, tipo: 'productor' },
  cerdo:   { emoji: '🐖', cria: '🐷', costo: 350, prod: '🥓', prodName: 'Carne', prodTime: 0, growTime: 400, sellAdult: 1000, tipo: 'engorde' },
  pato:    { emoji: '🦆', cria: '🐤', costo: 250, prod: '🪶', prodName: 'Plumas', prodTime: 90, growTime: 180, sellAdult: 400, tipo: 'productor' },
  abeja:   { emoji: '🐝', cria: '🐛', costo: 500, prod: '🍯', prodName: 'Miel', prodTime: 150, growTime: 200, sellAdult: 800, tipo: 'productor' },
  gallo:   { emoji: '🐓', cria: '🐣', costo: 1000, tipo: 'especial', desc: 'Escanea la granja y avisa de cosechas listas.' },
  perro:   { emoji: '🐕', cria: '🐶', costo: 1500, tipo: 'especial', desc: 'Evita que los zorros roben tu cosecha.' },
  gato:    { emoji: '🐈', cria: '🐱', costo: 1200, tipo: 'especial', desc: 'Evita que los ratones se coman tu inventario.' }
};

const MERCADO = { '🥚': 20, '🥛': 80, '🧶': 50, '🪶': 35, '🍯': 100, '🥓': 0 };

module.exports = {
  name: 'granja',
  aliases: ['farm', 'agro'],
  category: 'juegos',
  desc: 'Simulador profesional de Granja RPG con subcomandos anti-conflictos',

  execute: async ({ sock, msg, remoteJid, args, commandName, sender, reply }) => {
    let db = cargarGranjas();
    
    if (!db[sender]) {
      db[sender] = {
        monedas: 1000,
        terreno: 10,
        alquilerVence: Date.now() + (86400000 * 3), // 3 días gratis
        animales: [],
        inventario: { '🥚': 0, '🥛': 0, '🧶': 0, '🪶': 0, '🍯': 0 }
      };
      guardarGranjas(db);
    }
    const miGranja = db[sender];
    const action = args[0]?.toLowerCase();

    // ==========================================
    // 🏪 SUBCOMANDO: tienda
    // ==========================================
    if (action === 'tienda' || action === 'mercado') {
      let txt = `🏪 *AGRO MERCADO* 🏪\n_Monedas:_ 🪙 ${miGranja.monedas}\n\n`;
      for (const [key, data] of Object.entries(CATALOGO)) {
        txt += `*${data.emoji} ${key.toUpperCase()}* - 🪙 ${data.costo}\n`;
        if (data.tipo === 'productor') txt += `↳ Produce: ${data.prod} (Venta: 🪙${MERCADO[data.prod]})\n`;
        if (data.tipo === 'engorde') txt += `↳ Uso: Engordar y vender (🪙${data.sellAdult})\n`;
        if (data.tipo === 'especial') txt += `↳ Pasiva: ${data.desc}\n`;
      }
      txt += `\n📌 *Comprar animal:* .granja comprar [animal] [nombre]\n📌 *Comprar terreno:* .granja comprar terreno (🪙1000, +5 espacios)`;
      return reply(txt);
    }

    // ==========================================
    // 🛒 SUBCOMANDO: comprar
    // ==========================================
    if (action === 'comprar') {
      const tipo = args[1]?.toLowerCase();
      const nombre = args.slice(2).join(' ');

      if (tipo === 'terreno') {
        if (miGranja.monedas < 1000) return reply('❌ Necesitas 🪙 1000 para comprar más terreno.');
        miGranja.monedas -= 1000;
        miGranja.terreno += 5;
        guardarGranjas(db);
        return reply(`✅ Has expandido tu terreno. Capacidad actual: ${miGranja.terreno} espacios.`);
      }

      if (!CATALOGO[tipo]) return reply('❌ Animal no válido. Usa *.granja tienda*');
      if (!nombre) return reply('❌ Ponle un nombre a tu animal. Ejemplo: *.granja comprar vaca Lola*');
      if (miGranja.animales.length >= miGranja.terreno) return reply('❌ Terreno lleno. Expande tu granja o vende animales.');
      if (miGranja.monedas < CATALOGO[tipo].costo) return reply(`❌ Cuesta 🪙 ${CATALOGO[tipo].costo}. Te faltan monedas.`);

      if (miGranja.animales.some(a => a.nombre.toLowerCase() === nombre.toLowerCase())) {
        return reply('❌ Ya tienes un animal con ese nombre.');
      }

      miGranja.monedas -= CATALOGO[tipo].costo;
      miGranja.animales.push({
        tipo: tipo,
        nombre: nombre,
        nacio: Date.now(),
        ultimaCosecha: Date.now(),
        adulto: false,
        enfermo: false
      });
      guardarGranjas(db);
      return reply(`🎉 ¡Has comprado a *${nombre}* ${CATALOGO[tipo].cria}!\nRecuerda cuidarlo hasta que crezca.`);
    }

    // ==========================================
    // 🔍 SUBCOMANDO: ver
    // ==========================================
    if (action === 'ver') {
      const nombre = args.slice(1).join(' ');
      if (!nombre) return reply('❌ Escribe el nombre. Ejemplo: *.granja ver Lola*');
      
      const animal = miGranja.animales.find(a => a.nombre.toLowerCase() === nombre.toLowerCase());
      if (!animal) return reply('❌ No tienes ningún animal con ese nombre.');

      const spec = CATALOGO[animal.tipo];
      const ahora = Date.now();
      const estado = animal.adulto ? 'Adulto' : 'Cría (Creciendo...)';
      const icono = animal.adulto ? spec.emoji : spec.cria;
      const salud = animal.enfermo ? '🤒 Enfermo (Usa .granja curar)' : '💚 Sano';
      
      let info = `📋 *REGISTRO VETERINARIO* 📋\n\n`;
      info += `${icono} *Nombre:* ${animal.nombre}\n`;
      info += `🏷️ *Especie:* ${animal.tipo.toUpperCase()}\n`;
      info += `📈 *Estado:* ${estado}\n`;
      info += `⚕️ *Salud:* ${salud}\n`;

      if (animal.adulto && spec.tipo === 'productor' && !animal.enfermo) {
        const tiempoFaltante = (spec.prodTime * 60 * 1000) - (ahora - animal.ultimaCosecha);
        if (tiempoFaltante <= 0) info += `✅ *Producción:* ¡Lista para recolectar!\n`;
        else info += `⏳ *Producción:* Faltan ${Math.ceil(tiempoFaltante / 60000)} minutos.\n`;
      }
      
      if (animal.adulto) info += `💰 *Valor en Mercado:* 🪙 ${spec.sellAdult}\n`;
      return reply(info);
    }

    // ==========================================
    // 💉 SUBCOMANDO: curar
    // ==========================================
    if (action === 'curar') {
      const nombre = args.slice(1).join(' ');
      if (!nombre) return reply('❌ Escribe a quién curar. Ejemplo: *.granja curar Lola*');
      
      const animal = miGranja.animales.find(a => a.nombre.toLowerCase() === nombre.toLowerCase());
      if (!animal) return reply('❌ Animal no encontrado.');
      if (!animal.enfermo) return reply(`✅ *${animal.nombre}* ya está perfectamente sano.`);
      if (miGranja.monedas < 100) return reply('❌ El veterinario cobra 🪙 100. No tienes suficiente.');

      miGranja.monedas -= 100;
      animal.enfermo = false;
      guardarGranjas(db);
      return reply(`⚕️ Has pagado 🪙 100 al veterinario. ¡*${animal.nombre}* ha sido curado y volverá a producir!`);
    }

    // ==========================================
    // 🧺 SUBCOMANDO: cosechar
    // ==========================================
    if (action === 'cosechar' || action === 'recolectar') {
      const ahora = Date.now();
      if (ahora > miGranja.alquilerVence) return reply('⚠️ El banco congeló tus bienes por falta de pago. Usa *.granja alquiler* primero.');

      const tienePerro = miGranja.animales.some(a => a.tipo === 'perro' && a.adulto);
      const tieneGato = miGranja.animales.some(a => a.tipo === 'gato' && a.adulto);

      // Eventos Aleatorios Pro
      if (Math.random() < 0.15) {
        if (tienePerro) await reply('🦊 *¡Un zorro intentó atacar la granja!*\n🐕 Tu perro lo espantó a mordiscos. ¡Cosecha salvada!');
        else return reply('🦊 *¡ATAQUE DE ZORRO!*\nEl zorro asustó a los animales y arruinó la cosecha de hoy. Necesitas un perro.');
      }
      
      if (Math.random() < 0.10) {
        if (tieneGato) await reply('🐁 *¡Plaga de ratones en el silo!*\n🐈 Tu gato cazó a los intrusos protegiendo tu inventario.');
        else {
          miGranja.inventario['🥚'] = Math.floor(miGranja.inventario['🥚'] * 0.8);
          await reply('🐁 *¡PLAGA DE RATONES!*\nSe comieron parte de tus productos guardados. Necesitas un gato.');
        }
      }

      let recolectado = {};
      let total = 0;

      miGranja.animales.forEach(a => {
        const spec = CATALOGO[a.tipo];
        if (a.adulto && spec.tipo === 'productor') {
          if (!a.enfermo && (ahora - a.ultimaCosecha) >= (spec.prodTime * 60 * 1000)) {
            // 10% de probabilidad de enfermarse al cosechar
            if (Math.random() < 0.10) a.enfermo = true;
            
            miGranja.inventario[spec.prod] = (miGranja.inventario[spec.prod] || 0) + 1;
            recolectado[spec.prod] = (recolectado[spec.prod] || 0) + 1;
            a.ultimaCosecha = ahora;
            total++;
          }
        }
      });
      guardarGranjas(db);

      if (total === 0) return reply('❌ No hay nada listo o tus animales están enfermos. Usa *.granja ver [nombre]*');
      
      let res = `🧺 *COSECHA EXITOSA* 🧺\nHas recogido:\n`;
      for (const [item, cant] of Object.entries(recolectado)) res += `${item} x${cant}\n`;
      res += `\nUsa *.granja vender productos* para ganar oro.`;
      return reply(res);
    }

    // ==========================================
    // 💰 SUBCOMANDO: vender
    // ==========================================
    if (action === 'vender') {
      const input = args.slice(1).join(' ').toLowerCase();
      if (!input) return reply('❌ Escribe qué quieres vender. Ejemplo: *.granja vender productos* o *.granja vender Lola*');

      if (input === 'productos') {
        let ganancia = 0;
        let resumen = '';
        for (const [item, cant] of Object.entries(miGranja.inventario)) {
          if (cant > 0 && MERCADO[item]) {
            const oro = cant * MERCADO[item];
            ganancia += oro;
            resumen += `${item} x${cant} = 🪙${oro}\n`;
            miGranja.inventario[item] = 0;
          }
        }
        if (ganancia === 0) return reply('❌ Tu inventario está vacío.');
        miGranja.monedas += ganancia;
        guardarGranjas(db);
        return reply(`⚖️ *MERCADO DE EXPORTACIÓN* ⚖️\nVendiste tus productos:\n${resumen}\n✅ Ganancia total: 🪙 ${ganancia}`);
      }

      const index = miGranja.animales.findIndex(a => a.nombre.toLowerCase() === input);
      if (index === -1) return reply('❌ No tienes un animal con ese nombre.');
      const animal = miGranja.animales[index];
      
      if (!animal.adulto) return reply(`❌ ${animal.nombre} aún es una cría. El mercado solo compra adultos.`);
      
      const oro = CATALOGO[animal.tipo].sellAdult;
      miGranja.monedas += oro;
      miGranja.animales.splice(index, 1);
      guardarGranjas(db);
      return reply(`🚜 Un camión vino y se llevó a *${animal.nombre}* al matadero.\nHas ganado 🪙 ${oro} por la venta.`);
    }

    // ==========================================
    // 📝 SUBCOMANDO: alquiler
    // ==========================================
    if (action === 'alquiler' || action === 'pagar') {
      const costoDiario = 50 + (miGranja.animales.length * 20);
      
      if (args[1] !== 'pagar' && action !== 'pagar') {
        const estado = Date.now() > miGranja.alquilerVence ? '🔴 VENCIDO' : '🟢 AL DÍA';
        return reply(`📜 *BIENES RAÍCES*\nEstado: ${estado}\nCosto por día: 🪙 ${costoDiario}\n\nPara pagar 1 día escribe: *.granja alquiler pagar*`);
      }

      if (miGranja.monedas < costoDiario) return reply(`❌ Necesitas 🪙 ${costoDiario} para el alquiler. Vende productos o animales.`);
      
      miGranja.monedas -= costoDiario;
      const ahora = Date.now();
      if (ahora > miGranja.alquilerVence) miGranja.alquilerVence = ahora + 86400000;
      else miGranja.alquilerVence += 86400000;
      
      guardarGranjas(db);
      return reply(`✅ Has pagado 🪙 ${costoDiario}. Contrato extendido por 24 horas.`);
    }

    // ==========================================
    // 🚜 COMANDO PRINCIPAL: .granja (Ver Tablero)
    // ==========================================
    const ahora = Date.now();
    const alquilerVencido = ahora > miGranja.alquilerVence;
    
    let reporteGallo = '';
    let animalesEnfermos = 0;
    let listosCosecha = 0;
    let recienAdultos = 0;

    miGranja.animales.forEach(a => {
      const spec = CATALOGO[a.tipo];
      if (!a.adulto && (ahora - a.nacio) >= (spec.growTime * 60 * 1000)) {
        a.adulto = true;
        recienAdultos++;
      }
      if (a.adulto && spec.tipo === 'productor' && !a.enfermo && (ahora - a.ultimaCosecha) >= (spec.prodTime * 60 * 1000)) {
        listosCosecha++;
      }
      if (a.enfermo) animalesEnfermos++;
    });
    guardarGranjas(db);

    if (miGranja.animales.some(a => a.tipo === 'gallo' && a.adulto)) {
      reporteGallo = `\n🐓 *Alerta de Gallo:* `;
      if (listosCosecha > 0 || recienAdultos > 0 || animalesEnfermos > 0) {
        reporteGallo += `¡Hay ${listosCosecha} cosechas listas, ${recienAdultos} crecieron y ${animalesEnfermos} están enfermos!\n`;
      } else {
        reporteGallo += `Todo tranquilo.\n`;
      }
    }

    // Generador Dinámico de Corral ASCII
    let slots = Array(15).fill('  ');
    let displayAnimals = miGranja.animales.slice(0, 15); // Mostrar máx 15 visualmente
    
    // Posicionar animales al azar en el corral
    displayAnimals.forEach(a => {
      let pos = Math.floor(Math.random() * 15);
      while (slots[pos] !== '  ') pos = Math.floor(Math.random() * 15);
      slots[pos] = a.enfermo ? '🤒' : (a.adulto ? CATALOGO[a.tipo].emoji : CATALOGO[a.tipo].cria);
    });

    let corralASCII = `
╔═════════════════════════╗
║ ${slots[0]}  ${slots[1]}  ${slots[2]}  ${slots[3]}  ${slots[4]} ║
║ ${slots[5]}  ${slots[6]}  ${slots[7]}  ${slots[8]}  ${slots[9]} ║
║ ${slots[10]}  ${slots[11]}  ${slots[12]}  ${slots[13]}  ${slots[14]} ║
╚═════════════════════════╝`;

    let msgText = `🏡 *GRANJA DE @${sender.split('@')[0]}* 🏡\n${reporteGallo}${corralASCII}\n\n`;
    msgText += `🪙 *Bóveda:* ${miGranja.monedas} Monedas\n`;
    msgText += `📦 *Terreno:* ${miGranja.animales.length}/${miGranja.terreno} ocupado\n`;
    
    const diasAlquiler = Math.ceil((miGranja.alquilerVence - ahora) / 86400000);
    msgText += alquilerVencido 
      ? `⚠️ *ALQUILER VENCIDO* (.granja alquiler)\n`
      : `📜 *Contrato Vigente:* ${diasAlquiler} días\n`;
    
    msgText += `\n🎒 *Silo:* 🥚${miGranja.inventario['🥚'] || 0} | 🥛${miGranja.inventario['🥛'] || 0} | 🧶${miGranja.inventario['🧶'] || 0} | 🪶${miGranja.inventario['🪶'] || 0} | 🍯${miGranja.inventario['🍯'] || 0}\n`;
    msgText += `\n📌 *Comandos:* .granja tienda | comprar | ver | cosechar | vender | curar`;

    return sock.sendMessage(remoteJid, { text: msgText, mentions: [sender] }, { quoted: msg });
  }
};
