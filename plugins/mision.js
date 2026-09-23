'use strict';

const fs = require('fs');
const path = require('path');

// ⏱️ CONTROL DE COOLDOWN EN MEMORIA RAM
const cooldowns = new Map();
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutos entre misiones

// 📦 RUTA AL INVENTARIO GLOBAL
const INV_PATH = path.join(process.cwd(), 'lib', 'inventario.json');
if (!fs.existsSync(path.dirname(INV_PATH))) fs.mkdirSync(path.dirname(INV_PATH), { recursive: true });

function getInv() { try { return JSON.parse(fs.readFileSync(INV_PATH, 'utf8')); } catch { return {}; } }
function saveInv(data) { fs.writeFileSync(INV_PATH, JSON.stringify(data, null, 2)); }
function cleanNumber(jid = '') { return String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 📜 BANCO NARRATIVO MASIVO (EXPEDICIONES)
// ==========================================

const LUGARES = [
  'Valle de las Sombras Olvidadas', 'Ruinas Malditas de Eldoria', 'Catacumbas del Rey Desollado',
  'Pico Nevado de los Titanes', 'Cueva de Amatista del Dragón Durmiente', 'Templo Hundido de Atlantis',
  'Bosque Prohibido de Aethelgard', 'Páramo de los Susurros Sangrientos', 'Fortaleza Abandonada de Krag',
  'Abismo de Obsidiana', 'Pantano de las Brujas Cenicientas', 'Laberinto Flotante de Chronos',
  'Minas Profundas de Mithril', 'Santuario del Fénix Solar', 'Isla Sepultada del Kraken'
];

const INTROS = [
  'empaca sus pociones, ajusta las correas de su armadura y desenfunda una espada rúnica rumbo a',
  'enciende una antorcha empapada en brea y avanza en solitario penetrando la niebla que rodea',
  'consulta un mapa agrietado con marcas de sangre seca antes de poner pie en el peligroso',
  'siente un escalofrío en la espalda mientras cruza el umbral de piedra ancestral que conduce a',
  'esquiva trampas de púas oxidadas en la entrada mientras se infiltra sigilosamente en',
  'avanza bajo una lluvia torrencial con el escudo en alto, abriéndose paso entre la maleza hacia',
  'desciende por una cuerda gastada hacia el abismo sin fondo que conecta directamente con',
  'recita una plegaria silenciosa al viento y cruza el puente de cadenas suspendido sobre',
  'desactiva runas mágicas arcaicas en el portón principal y se interna en las profundidades de',
  'sigue el rastro de huellas colosales cubiertas de ceniza volcánica que van directo a',
  'limpia el musgo de un monolito centenario y encuentra el pasaje oculto que desciende a',
  'ignora las advertencias talladas en cráneos humanos y entra decididamente en los confines de',
  'enciende un farol de luz espectral para disipar la oscuridad milenaria que reina en',
  'desliza sus dagas de caza entre la niebla venenosa al dar sus primeros pasos en',
  'escucha alaridos inhumanos que retumban en las paredes rocosas mientras investiga'
];

const SUSPENSOS = [
  '⚡ *¡CLAC!* Una losa de presión cede bajo sus pies. Dardos envenenados surcan el aire a milímetros de su rostro...',
  '👁️ Dos ojos carmesí del tamaño de escudos se abren en la pared rocosa. Algo gigantesco despierta...',
  '🧩 Frente a un portón de titanio, runas ancestrales exigen resolver un acertijo de muerte antes de que el techo de púas caiga...',
  '💨 Una ráfaga gélida apaga la antorcha. En la absoluta negrura, el crujido de garras afiladas se acerca por la espalda...',
  '🔥 El suelo se quiebra revelando un foso de magma hirviente. Hay que dar un salto de fe hacia la cornisa opuesta...',
  '🛡️ Tres caballeros esqueléticos con armaduras bendecidas bloquean el estrecho pasillo con sus mandobles levantados...',
  '🕸️ Hilos de seda tan gruesos como cables de acero atrapan sus botas. Una matriarca arácnida baja veloz desde el techo...',
  '🌀 Una distorsión temporal altera la gravedad de la sala. Los escombros y el aventurero comienzan a flotar sin control...',
  '💎 Un altar bañado en oro parece indefenso, pero una barrera de energía crepitante electrocuta el aire...',
  '🩸 Gotas de ácido caen del techo de estalagmitas derritiendo el suelo. El aire se vuelve tóxico e irrespirable...',
  '🏹 Silbidos en la penumbra. Una banda de goblins renegados con cerbatanas rodea la posición desde las alturas...',
  '🗝️ Encuentra un cofre ornamentado con cadenas de oricalco, pero el cofre pestañea... ¡un cofre mimético hambriento!',
  '🌪️ Se desata una tormenta de almas en pena que intenta arrancar la cordura y el espíritu del cuerpo de nuestro explorador...',
  '🗿 Dos estatuas de gárgolas cobran vida con un crujido estruendoso y se abalanzan con sus mazas de granito...',
  '🕯️ Una sombra idéntica a su reflejo empuña sus mismas armas y se prepara para un duelo a muerte...'
];

const FINALES_LEGENDARIOS = [
  { desc: '👑 ¡HAZAÑA HISTÓRICA! Decapitó al Señor de las Profundidades y saqueó su cámara del tesoro intacta.', minXP: 7000, maxXP: 10000, item: 'sobre', itemNombre: '✉️ Sobre Gacha' },
  { desc: '🐉 ¡GLORIA TOTAL! Domó temporalmente al Dragón Espectral, quien en agradecimiento le reveló un cofre mítico.', minXP: 8000, maxXP: 11000, item: 'cajaUses', itemNombre: '📦 Caja Sorpresa XP' },
  { desc: '💎 ¡SANTUARIO ANCESTRAL! Resolvió el enigma celestial y una lluvia de diamantes mágicos llenó sus bolsillos.', minXP: 7500, maxXP: 10500, item: 'keys', itemNombre: '🔑 Llave de Celda' },
  { desc: '✨ ¡BENDICIÓN DIVINA! Purificó el altar de los caídos y un ángel guerrero le otorgó reliquias legendarias.', minXP: 8500, maxXP: 12000, item: 'shieldUses', itemNombre: '🛡️ Escudo Anti-Robo' },
  { desc: '🏛️ ¡EL DORADO SUBTERRÁNEO! Encontró la tumba secreta del Primer Emperador y desvalijó sus sarcófagos de oro.', minXP: 9000, maxXP: 12500, item: 'sobre', itemNombre: '✉️ Sobre Gacha' },
  { desc: '⚔️ ¡MATAGIGANTES! Derribó al Coloso de Hielo de un solo impacto certero en su núcleo mágico desprendiendo gemas.', minXP: 7000, maxXP: 9800, item: 'cajaUses', itemNombre: '📦 Caja Sorpresa XP' },
  { desc: '🌌 ¡MAESTRÍA ARCANA! Cerró una brecha dimensional que amenazaba el mundo y absorbió la energía pura restante.', minXP: 8000, maxXP: 11500, item: 'keys', itemNombre: '🔑 Llave de Celda' },
  { desc: '🗝️ ¡LA LLAVE MAESTRA! Abrió el cofre que llevaba mil años sellado con sangre y reclamó riquezas prohibidas.', minXP: 7200, maxXP: 10200, item: 'shieldUses', itemNombre: '🛡️ Escudo Anti-Robo' },
  { desc: '🔥 ¡RENACIDO EN CENIZAS! Venció a la quimera infernal con una maniobra suicida y se bañó en su tesoro.', minXP: 8200, maxXP: 11800, item: 'cajaUses', itemNombre: '📦 Caja Sorpresa XP' },
  { desc: '🪐 ¡DESCUBRIMIENTO CÓSMICO! Desenterró un meteorito palpitante de energía que multiplicó su poder y fortuna.', minXP: 7800, maxXP: 10800, item: 'sobre', itemNombre: '✉️ Sobre Gacha' }
];

const FINALES_EPICOS = [
  { desc: '⚔️ ¡COMBATE MAGISTRAL! Destruyó al guardián de piedra partiéndolo en dos y desenterró su alijo oculto.', minXP: 3000, maxXP: 5000, item: 'keys', itemNombre: '🔑 Llave de Celda', probItem: 0.6 },
  { desc: '🏺 ¡RELICARIO RECUPERADO! Esquivó el colapso del templo llevando consigo un jarrón lleno de rubíes antiguos.', minXP: 3200, maxXP: 5200, item: 'cajaUses', itemNombre: '📦 Caja Sorpresa XP', probItem: 0.5 },
  { desc: '🏹 ¡EMBOSCADA FRUSTRADA! Cazó a los bandidos que intentaron asaltarlo y se quedó con todo su botín de semanas.', minXP: 3400, maxXP: 5500, item: 'shieldUses', itemNombre: '🛡️ Escudo Anti-Robo', probItem: 0.5 },
  { desc: '🧪 ¡ELIXIR DE PODER! Encontró el laboratorio de un viejo alquimista y bebió una infusión que potenció su aura.', minXP: 2800, maxXP: 4800, item: null },
  { desc: '📜 ¡GRIMORIO RESCATADO! Arrebató el libro de hechizos a los cultistas antes de que completaran el sacrificio.', minXP: 3100, maxXP: 5100, item: 'cajaUses', itemNombre: '📦 Caja Sorpresa XP', probItem: 0.5 },
  { desc: '🦇 ¡PURGA DE LA CRIPTA! Acabó con un nido entero de vampiros menores y recogió sus anillos nobiliarios.', minXP: 3300, maxXP: 5300, item: 'keys', itemNombre: '🔑 Llave de Celda', probItem: 0.5 },
  { desc: '💎 ¡VETA DE ESMERALDAS! Picó con su arma una fisura luminosa en la cueva antes de que se inundara por completo.', minXP: 2900, maxXP: 4900, item: null },
  { desc: '🪓 ¡DUELO DE TITANES! Derrotó al caudillo orco en combate de honor y la horda huyó dejando sus arcas.', minXP: 3500, maxXP: 5600, item: 'sobre', itemNombre: '✉️ Sobre Gacha', probItem: 0.4 },
  { desc: '🛡️ ¡ESCUDO QUEBRADO PERO VICTORIA! Aguantó la embestida de un minotauro ciego y lo empujó por el precipicio.', minXP: 3000, maxXP: 5000, item: 'shieldUses', itemNombre: '🛡️ Escudo Anti-Robo', probItem: 0.5 },
  { desc: '🧊 ¡EL CORAZÓN HELADO! Arrancó el cristal eterno del gólem de escarcha y lo cambió por una fortuna.', minXP: 3200, maxXP: 5400, item: null }
];

const FINALES_EXITOSOS = [
  '🍄 Recogió una canasta de hongos bioluminiscentes exóticos altamente cotizados por magos.',
  '🪙 Desarmó una trampa de pared y vació las bolsas de monedas que llevaban antiguos aventureros caídos.',
  '🦊 Ayudó a un zorro místico atrapado en un cepo y el animal lo guió hacia un alijo escondido bajo raíces.',
  '📜 Encontró fragmentos de pergaminos comerciales que vendió por una sólida suma en el mercado.',
  '⛏️ Picó con éxito pequeñas pepitas de oro puro incrustadas en el lecho del río subterráneo.',
  '🗡️ Recuperó armas intactas de soldados imperiales caídos para venderlas a los herreros locales.',
  '🪶 Cazó un ave de plumaje dorado y cobró la recompensa prometida por el gremio de exploradores.',
  '🗝️ Forzó un cofre común de madera reforzada y encontró sacos de monedas de plata bien conservadas.',
  '🕯️ Encontró un campamento minero abandonado con provisiones y bolsas de mineral sin reclamar.',
  '🌿 Recolectó hierbas curativas legendarias que crecen solo a la luz de la luna llena en la sima.',
  '🏺 Rescató cántaros de vino añejado por más de dos siglos de una bodega oculta entre ruinas.',
  '🐀 Exterminó una plaga de roedores mutantes y los campesinos del valle le pagaron con gratitud y oro.'
];

const FINALES_FALLIDOS = [
  '💨 Registró cada esquina durante horas, pero una partida de saqueadores ya se había llevado todo minutos antes.',
  '🦇 Entró en la cámara principal y perturbó a millones de murciélagos. Tuvo que correr a ciegas sin mirar atrás.',
  '🕳️ El mapa era una farsa vendida por un tabernero borracho: el camino terminaba en una pared lisa de granito.',
  '🌧️ Una inundación repentina anegó el túnel principal obligándolo a nadar contra la corriente con las manos vacías.',
  '🌫️ La niebla era tan espesa que dio vueltas en círculos durante tres horas y regresó exactamente al punto de partida.',
  '📦 Logró abrir un sarcófago monumental con gran esfuerzo... solo para encontrar polvo seco y telarañas.',
  '🐭 El único habitante de la fortaleza era un ratón que le mordió la bota. No había ni una sola moneda.',
  '💨 Accionó accidentalmente una compuerta de ventilación que expulsó todo el botín hacia un abismo inaccesible.',
  '⚠️ Las vibraciones del suelo amenazaban con derrumbar la bóveda entera; priorizó su vida y escapó con las manos vacías.',
  '🔒 El tesoro estaba sellado con un candado de magia negra indescifrable. Regresó sin botín y con dolor de cabeza.'
];

const FINALES_CASTIGO = [
  '🕷️ Fue mordido por una tarántula abisal. Gastó una pequeña fortuna en médicos y antídotos para salvar la pierna.',
  '🏹 Cayó en una trampa de foso con estacas de bambú. Los curanderos del pueblo le cobraron caro la cirugía.',
  '🦹‍♂️ Una emboscada de pícaros lo noqueó por la espalda. Despertó descalzo, sin su dinero de bolsillo y con chichones.',
  '🔥 Calculó mal el salto sobre el magma y se quemó media armadura. Repararla costó casi todo su patrimonio.',
  '🧪 Rompió por error un frasco con gas corrosivo que destruyó sus bolsas y fundió sus pertenencias.',
  '🐺 Una jauría de lobos infectados lo acorraló en un árbol; tuvo que lanzar su bolsa de monedas para distraerlos y huir.',
  '🕳️ La cuerda de descenso se cortó a medio camino. La caída le fracturó dos costillas y requirió rescate pagado.',
  '⚡ Tocó un artefacto maldito que drenó su energía vital y vació parte de su espíritu aventurero.',
  '🧌 Un trol de pantano lo utilizó como garrote improvisado contra un árbol antes de que lograra escabullirse magullado.',
  '🚁 Tuvo que activar la bengala de socorro de emergencia del gremio; los rescatistas le pasaron una factura brutal.'
];

module.exports = {
  name: 'mision',
  // 🔥 CORRECCIÓN: Se añade 'misión' con tilde para evitar fallos del autocorrector
  aliases: ['misión', 'misiones', 'expedicion', 'quest', 'aventura'],
  category: 'economía & rpg',
  desc: 'Envía a tu personaje a una expedición con historia en tiempo real, XP y objetos',

  execute: async ({ sock, msg, remoteJid, sender, db, fromGroup, reply }) => {
    if (!fromGroup) return reply('❌ Las expediciones de exploración solo se pueden realizar en grupos.');

    const now = Date.now();
    const lastTime = cooldowns.get(sender) || 0;
    const remaining = COOLDOWN_MS - (now - lastTime);

    if (remaining > 0) {
      const min = Math.floor(remaining / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      return reply(`⏳ *ESTÁS AGOTADO DE TU ÚLTIMA EXPEDICIÓN*\n\nDebes descansar y afilar tus armas.\nPodrás salir de nuevo en *${min}m ${sec}s*.`);
    }

    cooldowns.set(sender, now);

    const userNum = cleanNumber(sender);
    const userData = await db.getUser(sender);
    const dbInv = getInv();
    if (!dbInv[sender]) dbInv[sender] = {};
    const myInv = dbInv[sender];

    const lugar = pick(LUGARES);
    const introAccion = pick(INTROS);
    const suspenso = pick(SUSPENSOS);

    // 🚀 ETAPA 1: Partida hacia la misión
    const msgSent = await sock.sendMessage(remoteJid, {
      text: `🗺️ *EXPEDICIÓN EN MARCHA* 🗺️\n\n@${userNum} ${introAccion} *${lugar}*...\n_Avanzando con cautela entre la penumbra..._`,
      mentions: [sender]
    }, { quoted: msg });

    // 🔥 MODIFICADO: Añadidos 6 segundos adicionales (9.5 segundos en total)
    await esperar(9500);

    // ⚡ ETAPA 2: Edición - Evento de Tensión en directo
    try {
      await sock.sendMessage(remoteJid, {
        text: `🗺️ *EXPEDICIÓN EN MARCHA* 🗺️\n\n📍 *Lugar:* ${lugar}\n\n${suspenso}\n\n⏳ _Tomando una decisión crítica en el camino..._`,
        edit: msgSent.key,
        mentions: [sender]
      });
    } catch (e) {}

    // 🔥 MODIFICADO: Añadidos 6 segundos adicionales (10 segundos en total)
    await esperar(10000);

    // 🎲 ETAPA 3: Cálculo del Desenlace y Recompensas
    const dice = Math.random() * 100;
    let finalTitle = '';
    let relato = '';
    let xpCambio = 0;
    let itemObtenido = null;

    if (dice < 5) {
      // 🌟 TIER LEGENDARIO (5%)
      const evento = pick(FINALES_LEGENDARIOS);
      finalTitle = '🌟 *¡EXPEDICIÓN LEGENDARIA!* 🌟';
      xpCambio = rand(evento.minXP, evento.maxXP);
      relato = evento.desc;
      
      if (evento.item) {
        myInv[evento.item] = (myInv[evento.item] || 0) + 1;
        itemObtenido = evento.itemNombre;
      }

    } else if (dice < 25) {
      // ⚔️ TIER ÉPICO (20%)
      const evento = pick(FINALES_EPICOS);
      finalTitle = '⚔️ *¡VICTORIA ÉPICA!* ⚔️';
      xpCambio = rand(evento.minXP, evento.maxXP);
      relato = evento.desc;

      if (evento.item && Math.random() < (evento.probItem || 0.5)) {
        myInv[evento.item] = (myInv[evento.item] || 0) + 1;
        itemObtenido = evento.itemNombre;
      }

    } else if (dice < 70) {
      // 🛡️ TIER EXITOSO (45%)
      finalTitle = '🎒 *EXPEDICIÓN EXITOSA* 🎒';
      xpCambio = rand(800, 2000);
      relato = pick(FINALES_EXITOSOS);

      if (Math.random() < 0.10) {
        const bonusItem = Math.random() < 0.5 ? 'keys' : 'cajaUses';
        myInv[bonusItem] = (myInv[bonusItem] || 0) + 1;
        itemObtenido = bonusItem === 'keys' ? '🔑 Llave de Celda' : '📦 Caja Sorpresa XP';
      }

    } else if (dice < 85) {
      // 💨 TIER VACÍO / FALLIDO (15%)
      finalTitle = '💨 *EXPEDICIÓN INFRUCTUOSA* 💨';
      xpCambio = 0;
      relato = pick(FINALES_FALLIDOS);

    } else {
      // ☠️ TIER CASTIGO / EMBOSCADA (15%)
      finalTitle = '☠️ *EMBOSCADA Y DESASTRE* ☠️';
      const perdida = rand(600, 1500);
      const saldoActual = userData.xp || 0;
      xpCambio = -Math.min(saldoActual, perdida);
      relato = pick(FINALES_CASTIGO);
    }

    if (xpCambio !== 0) {
      userData.xp = Math.max(0, (userData.xp || 0) + xpCambio);
    }

    userData.level = Math.floor(0.1 * Math.sqrt(userData.xp || 0)) || 1;

    if (userData.save) {
      await userData.save();
    } else {
      await db.setUser(sender, userData);
    }

    if (itemObtenido) {
      saveInv(dbInv);
    }

    // 📝 Armar el mensaje final
    let resumenFin = `${finalTitle}\n\n`;
    resumenFin += `📍 *Ubicación:* ${lugar}\n`;
    resumenFin += `📖 ${relato}\n\n`;
    resumenFin += `━━━━━━━━━━━━━━━━━━━\n`;
    
    if (xpCambio > 0) resumenFin += `💰 *XP Ganada:* +${xpCambio} XP\n`;
    else if (xpCambio < 0) resumenFin += `❌ *Pérdida:* ${xpCambio} XP (Gastos médicos)\n`;
    else resumenFin += `⚖️ *XP Ganada:* 0 XP\n`;

    if (itemObtenido) {
      resumenFin += `🎁 *Objeto Encontrado:* ${itemObtenido}\n_(Guardado en tu .inventario)_\n`;
    }

    resumenFin += `⭐ *Saldo Total:* ${userData.xp} XP (Nivel ${userData.level})\n`;
    resumenFin += `👤 *Explorador:* @${userNum}`;

    // 📤 Edición final con el desenlace
    try {
      await sock.sendMessage(remoteJid, { text: resumenFin, edit: msgSent.key, mentions: [sender] });
    } catch (e) {
      await sock.sendMessage(remoteJid, { text: resumenFin, mentions: [sender] });
    }
  }
};
