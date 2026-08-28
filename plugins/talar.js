'use strict';

const cooldowns = new Map();

function cleanNumber(jid = '') { return String(jid).split('@')[0].replace(/\D/g, ''); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randXP(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const talaLegendaria = ['🌳 ¡MÍTICO! Talaste una rama del mismísimo *Árbol del Mundo (Yggdrasil)*.', '✨ Encontraste un claro oculto y talaste *Madera Élfica Brillante*.', '🌌 Cortaste un árbol que cayó del cielo: *Madera de Estrella Fugaz*.', '🔥 Talaste un *Roble de Fuego* que nunca se apaga.'];
const talaEpica = ['🪵 ¡Qué fuerza! Talaste un gigantesco *Árbol de Caoba Antigua*.', '🌲 Conseguiste madera de un *Pino Milenario Místico*.', '🍂 Encontraste y cortaste un raro *Árbol de Arce Dorado*.', '🌳 Talaste madera de un *Roble Oscuro Encantado*.'];
const talaNormal = ['🪵 Talaste un montón de *Madera de Roble* estándar.', '🌲 Cortaste varios *Pinos* para hacer tablas.', '🪵 Conseguiste buena cantidad de *Madera de Abedul*.', '🌿 Cortaste bambú y *Madera de Jungla*.', '🪵 Trabajaste duro y apilaste mucha *Leña para el invierno*.'];
const talaBasura = ['🍂 Solo conseguiste un montón de *hojas secas*.', '🪵 Tu hacha resbaló y solo cortaste *ramas podridas*.', '🍄 Talaste un tronco que estaba lleno de *hongos venenosos*.', '🐦 Tiraste un árbol y solo había un *nido de pájaros vacío*.', '🪵 Cortaste la corteza y estaba llena de *termitas muertas*.'];
const talaCastigo = ['🐝 ¡GOLPEASTE UN PANAL! Un enjambre de *abejas asesinas* te atacó. Pagaste la clínica.', '🪵 ¡CUIDADO! El árbol cayó hacia el lado equivocado y *te aplastó la pierna*.', '🪓 Golpeaste una piedra escondida y *rompiste tu hacha*.', '🐻 El ruido despertó a un *Oso pardo* que te persiguió por el bosque.', '👮‍♂️ Un guardabosques te atrapó *talando en zona protegida* y te multó.'];

module.exports = {
    name: 'talar',
    aliases: ['chop'],
    category: 'economía',
    desc: 'Tala árboles para ganar XP',
    
    execute: async ({ sock, remoteJid, sender, db, reply, fromGroup, userData }) => {
        if (!fromGroup) return reply('❌ Este comando es más divertido en grupos.');

        const now = Date.now();
        const cooldown = 5 * 60 * 1000;
        const lastAction = cooldowns.get(sender) || 0;
        const remaining = cooldown - (now - lastAction);

        if (remaining > 0) {
            const m = Math.floor(remaining / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            return reply(`⏳ Tus brazos duelen. Espera *${m}m ${s}s* para volver a talar.`);
        }

        cooldowns.set(sender, now);

        let multiplicador = (userData.inventory?.arma_pro || 0) > 0 ? 1.5 : 1;
        let aviso = multiplicador > 1 ? `\n🪓 *¡Tu Hacha Profesional te da un bono de XP!*` : '';

        const msgSent = await sock.sendMessage(remoteJid, { text: `🪓 @${cleanNumber(sender)} camina hacia el espeso bosque buscando un buen árbol...`, mentions: [sender] });
        await esperar(2000);
        try { await sock.sendMessage(remoteJid, { text: `🪓 @${cleanNumber(sender)} levanta su hacha y comienza a golpear el tronco...\n\n*¡Chop! ¡Chop! ¡Chop!*`, edit: msgSent.key, mentions: [sender] }); } catch(e){}
        await esperar(2000);

        let rand = Math.random() * 100;
        let critico = Math.random() < 0.10;
        let premio = 0, resTxt = '', txtCrit = critico ? `\n💥 *¡GOLPE CRÍTICO! Tu XP se ha duplicado.*` : '';

        if (rand < 5) { 
            premio = Math.floor(randXP(4000, 6000) * multiplicador); 
            if (critico) premio *= 2;
            resTxt = `${pick(talaLegendaria)}${aviso}${txtCrit}\n💰 Ganaste *${premio} XP*.`;
        } else if (rand < 20) { 
            premio = Math.floor(randXP(1500, 2500) * multiplicador); 
            if (critico) premio *= 2;
            resTxt = `${pick(talaEpica)}${aviso}${txtCrit}\n💰 Ganaste *${premio} XP*.`;
        } else if (rand < 70) { 
            premio = Math.floor(randXP(400, 1000) * multiplicador); 
            if (critico) premio *= 2;
            resTxt = `${pick(talaNormal)}${aviso}${txtCrit}\n💰 Ganaste *${premio} XP*.`;
        } else if (rand < 90) { 
            resTxt = `${pick(talaBasura)}\n💸 No ganas nada de XP.`;
        } else { 
            let castigo = randXP(500, 1000);
            userData.xp = Math.max(0, (userData.xp || 0) - castigo); // Resta segura
            resTxt = `${pick(talaCastigo)}\n❌ Perdiste *${castigo} XP*.`;
        }

        if (premio > 0 && userData.pet && Math.random() < 0.25) {
            let bono = Math.floor(premio * 0.20);
            premio += bono;
            resTxt += `\n✨ ¡Tu mascota *${userData.pet.name}* te ayudó y encontró *+${bono} XP* extra!`;
        }

        if (premio > 0) userData.xp = (userData.xp || 0) + premio;

        // Guardado seguro
        if (userData.save) await userData.save(); else await db.setUser(sender, userData);

        const fMsg = `*RESULTADO DE LA TALA* 🪓\n\n${resTxt}\n👤 Leñador: @${cleanNumber(sender)}`;
        try { await sock.sendMessage(remoteJid, { text: fMsg, edit: msgSent.key, mentions: [sender] }); } 
        catch (e) { await sock.sendMessage(remoteJid, { text: fMsg, mentions: [sender] }); }
    }
};
