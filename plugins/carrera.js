'use strict';

// ⏱️ Guardamos las carreras activas en memoria RAM
const carreras = new Map();
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Catálogo de corredores salvajes
const ANIMALES = ['🐎', '🐢', '🐖', '🐕', '🐅', '🐉', '🦖', '🦘', '🦏', '🦍', '🐆', '🐏'];

// Frases de relleno para el narrador
const NARRADOR_IDLE = [
    "👀 El público observa con muchísima tensión...",
    "🔥 La pista está que arde, nadie quiere ceder.",
    "👟 Los corredores mantienen un ritmo constante...",
    "💨 ¡Qué velocidad la de estas bestias!",
    "📸 Se preparan para un final de fotografía..."
];

// ==========================================
// 🛠️ FUNCIONES DE UTILIDAD Y DISEÑO RÍGIDO
// ==========================================
function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function getAnimalAleatorio(usados) {
    let disponibles = ANIMALES.filter(a => !usados.includes(a));
    if (disponibles.length === 0) disponibles = ANIMALES; 
    return disponibles[Math.floor(Math.random() * disponibles.length)];
}

// 🎨 CONSTRUCTOR DE PISTA INQUEBRANTABLE
function renderTrack(animal, pos, maxPos = 16) {
    let p = Math.max(0, Math.min(pos, maxPos));
    let trail = '═'.repeat(p);
    let ahead = '═'.repeat(maxPos - p);
    // Resultado visual: ║ ════🐎══════════ 🏁 ║
    return `║ ${trail}${animal}${ahead} 🏁 ║`;
}

module.exports = {
    name: 'carrera',
    aliases: ['unirse', 'arrancar'],
    category: 'juegos',
    desc: 'Organiza una carrera de animales con apuestas',

    execute: async ({ sock, msg, remoteJid, sender, args, commandName, db, fromGroup, reply }) => {
        if (!fromGroup) return reply('❌ Las carreras ilegales solo se organizan en los grupos.');

        const action = commandName.toLowerCase();
        const userKey = sender;

        // ==========================================
        // 🟢 COMANDO: .carrera [apuesta]
        // ==========================================
        if (action === 'carrera') {
            if (carreras.has(remoteJid)) {
                return reply('⚠️ Ya hay una carrera organizándose o corriendo en este grupo. ¡Usa *.unirse*!');
            }

            let apuesta = parseInt(args.find(a => /^\d+$/.test(a))) || 0;

            const userData = await db.getUser(userKey);
            if (apuesta > 0) {
                if ((userData.xp || 0) < apuesta) {
                    return reply(`❌ No tienes XP suficiente. Intentas apostar *${apuesta}* pero tienes *${userData.xp || 0}*.`);
                }
                // Cobrar entrada
                userData.xp -= apuesta;
                if (userData.save) await userData.save();
            }

            const miAnimal = getAnimalAleatorio([]);

            const nuevaCarrera = {
                estado: 'esperando',
                creador: userKey,
                apuesta: apuesta,
                animalesUsados: [miAnimal],
                participantes: [{ id: userKey, animal: miAnimal, posicion: 0 }],
                longitudPista: 16, 
                timeoutId: null
            };

            carreras.set(remoteJid, nuevaCarrera);

            let msgInicial = `🏁 *¡SE ABRE LA PISTA!* 🏁\n\n`;
            msgInicial += apuesta > 0 ? `💰 Pozo Inicial: *${apuesta} XP*\n\n` : `🎮 *Carrera amistosa* (Sin apuestas)\n\n`;
            msgInicial += `Tu corredor será el: ${miAnimal} (@${cleanNumber(sender)})\n\n`;
            msgInicial += `👉 Escriban *.unirse* para entrar.\n_(El creador puede escribir *.arrancar* para iniciar ya)_`;

            await sock.sendMessage(remoteJid, { text: msgInicial, mentions: [sender] }, { quoted: msg });

            // Auto-arrancar en 60 segundos si nadie pone .arrancar
            nuevaCarrera.timeoutId = setTimeout(() => {
                if (carreras.has(remoteJid) && carreras.get(remoteJid).estado === 'esperando') {
                    iniciarCarrera(sock, remoteJid, db);
                }
            }, 60000);
            return;
        }

        // ==========================================
        // ➕ COMANDO: .unirse
        // ==========================================
        if (action === 'unirse') {
            let carrera = carreras.get(remoteJid);
            
            if (!carrera || carrera.estado !== 'esperando') {
                return reply('⚠️ No hay ninguna carrera en fase de inscripción ahora mismo.');
            }
            if (carrera.participantes.find(p => p.id === userKey)) {
                return reply('⚠️ Ya estás inscrito en esta carrera.');
            }
            if (carrera.participantes.length >= 6) {
                return reply('⚠️ La pista está llena (Máximo 6 corredores).');
            }

            const userData = await db.getUser(userKey);
            if (carrera.apuesta > 0) {
                if ((userData.xp || 0) < carrera.apuesta) {
                    return reply(`❌ Eres muy pobre. Necesitas *${carrera.apuesta} XP* para igualar la apuesta de esta carrera.`);
                }
                userData.xp -= carrera.apuesta;
                if (userData.save) await userData.save();
            }

            const nuevoAnimal = getAnimalAleatorio(carrera.animalesUsados);
            carrera.animalesUsados.push(nuevoAnimal);
            carrera.participantes.push({ id: userKey, animal: nuevoAnimal, posicion: 0 });

            return sock.sendMessage(remoteJid, {
                text: `🎟️ ¡El ${nuevoAnimal} de @${cleanNumber(sender)} ha entrado a la pista!`,
                mentions: [sender]
            }, { quoted: msg });
        }

        // ==========================================
        // 🏎️ COMANDO: .arrancar (Solo creador)
        // ==========================================
        if (action === 'arrancar') {
            let carrera = carreras.get(remoteJid);
            
            if (!carrera || carrera.estado !== 'esperando') {
                return reply('⚠️ No hay carreras pendientes de inicio.');
            }
            if (carrera.creador !== userKey) {
                return reply('❌ Solo el que creó la carrera puede arrancarla antes de tiempo.');
            }

            clearTimeout(carrera.timeoutId);
            iniciarCarrera(sock, remoteJid, db);
        }
    }
};

// ==========================================
// LÓGICA DE INICIO Y PERSONALIDAD DEL BOT
// ==========================================
async function iniciarCarrera(sock, remoteJid, db) {
    let carrera = carreras.get(remoteJid);
    if (!carrera || carrera.estado !== 'esperando') return;

    if (carrera.participantes.length === 1) {
        const frasesToxicas = [
            "🤖 ¿En serio nadie más se unió? Supongo que tendré que bajar de mi nube para humillarte yo mismo. ¡Prepárate para llorar! 💅",
            "🤖 Al parecer a nadie le sobra el valor aquí. Me toca ensuciarme las manos... Jugar contra mí es perder, pero dale. 🏎️💨",
            "🤖 Pff, te dejaron más solo que al admin. Ni modo, yo mismo te voy a dar una paliza en la pista. 💸",
            "🤖 ¿Nadie? Ok, veo que en este grupo hay puro miedoso. Calentando motores... Te voy a demostrar por qué soy el mejor. 😎"
        ];
        
        const fraseElegida = frasesToxicas[Math.floor(Math.random() * frasesToxicas.length)];
        await sock.sendMessage(remoteJid, { text: `*SiriusBot:* ${fraseElegida}` });
        
        const animalBot = getAnimalAleatorio(carrera.animalesUsados);
        carrera.participantes.push({ id: 'bot', animal: animalBot, posicion: 0 });
        await esperar(3000); 
    } else {
        await sock.sendMessage(remoteJid, { text: "🏁 *¡CERRANDO INSCRIPCIONES!* Que empiece el caos..." });
        await esperar(1500);
    }

    carrera.estado = 'corriendo';
    await animarCarrera(sock, remoteJid, db);
}

// ==========================================
// 🚀 MOTOR DE ANIMACIÓN Y RESULTADOS
// ==========================================
async function animarCarrera(sock, remoteJid, db) {
    let carrera = carreras.get(remoteJid);
    let hayGanador = false;
    let mensajeId = null;

    let pozoTotal = carrera.apuesta * carrera.participantes.length;
    let arrayMenciones = carrera.participantes.filter(p => p.id !== 'bot').map(p => p.id);

    while (!hayGanador) {
        let textoFrame = `🏁 *CARRERA EXTREMA* 🏁\n\n`;
        textoFrame += carrera.apuesta > 0 ? `💰 Pozo: *${pozoTotal} XP*\n\n` : `🎮 Amistosa\n\n`;

        // 🎨 CONSTRUIR LA CAJA RÍGIDA
        let bordeTop = `╔` + `═`.repeat(carrera.longitudPista + 7) + `╗\n`;
        let bordeBot = `╚` + `═`.repeat(carrera.longitudPista + 7) + `╝\n\n`;
        
        textoFrame += bordeTop;

        let eventosTexto = []; 
        let maxPosicionActual = Math.max(...carrera.participantes.map(c => c.posicion));

        for (let corredor of carrera.participantes) {
            let avance = Math.floor(Math.random() * 2) + 1; 
            let chance = Math.random();
            let atrasado = (maxPosicionActual - corredor.posicion) >= 3; 

            if (atrasado) chance -= 0.15; 

            if (chance < 0.12) { 
                avance += 3; 
                eventosTexto.push(`🚀 ¡El ${corredor.animal} tomó un atajo!`);
            } else if (chance < 0.25) { 
                avance += 2; 
                eventosTexto.push(`⚡ ¡El ${corredor.animal} pisó el acelerador!`);
            } else if (chance > 0.88 && corredor.posicion > 0 && !atrasado) { 
                avance = Math.max(0, avance - 2); 
                eventosTexto.push(`💥 ¡Oh no! El ${corredor.animal} tropezó.`);
            }

            corredor.posicion += avance;
            if (corredor.posicion >= carrera.longitudPista) {
                hayGanador = true;
            }
            
            // Renderizamos el carril perfecto e inquebrantable
            textoFrame += renderTrack(corredor.animal, corredor.posicion, carrera.longitudPista) + '\n';
        }

        textoFrame += bordeBot;

        // Lista de corredores debajo
        for (let corredor of carrera.participantes) {
            let tagNombre = corredor.id === 'bot' ? '*SiriusBot*' : `@${cleanNumber(corredor.id)}`;
            textoFrame += `↳ ${corredor.animal} ${tagNombre}\n`;
        }

        if (eventosTexto.length === 0) {
            eventosTexto.push(NARRADOR_IDLE[Math.floor(Math.random() * NARRADOR_IDLE.length)]);
        }

        textoFrame += `\n📢 *Narrador:*\n_${eventosTexto.join('\n')}_`;

        if (!mensajeId) {
            let msg = await sock.sendMessage(remoteJid, { text: textoFrame, mentions: arrayMenciones });
            mensajeId = msg.key;
        } else {
            try {
                await sock.sendMessage(remoteJid, { text: textoFrame, edit: mensajeId, mentions: arrayMenciones });
            } catch (err) {} 
        }

        await esperar(3500); // 3.5s para no saturar los límites de edición de WhatsApp
    }

    // ==========================================
    // 🏆 CIERRE Y PREMIACIÓN
    // ==========================================
    let maxPosicion = Math.max(...carrera.participantes.map(c => c.posicion));
    let ganadores = carrera.participantes.filter(c => c.posicion >= carrera.longitudPista);
    
    // Si varios cruzan la meta a la vez, gana el que llegó más lejos
    if (ganadores.length > 1) {
        ganadores = ganadores.filter(c => c.posicion === maxPosicion);
    }

    let textoFinal = "🏆 *¡CRUZARON LA META!*\n\n";

    if (carrera.apuesta > 0) {
        let premioPorGanador = Math.floor(pozoTotal / ganadores.length);

        if (ganadores.some(g => g.id === 'bot')) {
            textoFinal += `🤖 *SiriusBot:* ¡Se los dije! Los aplasté a todos y me llevo los *${pozoTotal} XP*. El casino siempre gana, novatos. 💅✨`;
        } else {
            let tagsGanadores = ganadores.map(g => `@${cleanNumber(g.id)}`).join(', ');
            textoFinal += `🎉 ¡Victoria para ${tagsGanadores}!\n💰 Has ganado *${premioPorGanador} XP*.`;
            
            for (let g of ganadores) {
                if (g.id !== 'bot') {
                    let wData = await db.getUser(g.id);
                    wData.xp = (wData.xp || 0) + premioPorGanador;
                    if (wData.save) await wData.save();
                }
            }
        }
    } else {
        if (ganadores.some(g => g.id === 'bot')) {
            textoFinal += `🤖 *SiriusBot:* ¿En serio pensaron que me iban a ganar? ¡Soy imparable! 😎`;
        } else {
            let tagsGanadores = ganadores.map(g => `@${cleanNumber(g.id)}`).join(', ');
            textoFinal += `🎉 ¡La gloria es para ${tagsGanadores}!`;
        }
    }

    let mencionesGanadores = ganadores.filter(g => g.id !== 'bot').map(g => g.id);
    await sock.sendMessage(remoteJid, { text: textoFinal, mentions: mencionesGanadores });
    
    carreras.delete(remoteJid);
}
