'use strict';

const cooldowns = new Map();

function cleanNumber(jid = '') { return String(jid).split('@')[0].replace(/\D/g, ''); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randXP(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const minaLegendaria = ['💎 ¡JACKPOT! Encontraste un gigantesco *Diamante Brillante*.', '🛸 ¡Increíble! Picaste un *Meteorito Alienígena* que vale una fortuna.', '🟢 Encontraste una *Esmeralda* del tamaño de un melón.', '🔴 Picaste la pared y descubriste la mítica *Gema del Infinito*.'];
const minaEpica = ['🥇 ¡Excelente! Rompiste la piedra y sacaste un *Lingote de Oro puro*.', '🔮 Encontraste una cueva oculta llena de *Zafiros Azules*.', '💎 Extraíste una hermosa *Geoda de Amatista*.', '🔥 Encontraste *Magma Cristalizada* súper rara.'];
const minaNormal = ['🪨 Trabajaste duro y recolectaste bastante *Carbón y Hierro*.', '🥉 Lograste extraer varios kilos de *Cobre*.', '✨ Encontraste polvo de *Redstone* luminoso.', '🔵 Extraíste un poco de *Lapislázuli* para encantamientos.', '🪨 Picaste un buen rato y sacaste mucha *Piedra y Cuarzo*.'];
const minaBasura = ['🕸️ Picaste en el lugar equivocado. Solo había *telarañas y polvo*.', '🦴 Desenterraste unos *huesos viejos* de perro.', '🪨 Picaste y picaste pero solo sacaste *grava inútil*.', '⛏️ Solo encontraste *tierra mojada* y gusanos.', '🦇 Te metiste a una cueva vacía que solo olía a *guano de murciélago*.'];
const minaCastigo = ['💥 ¡DERRUMBE! Un pedazo de techo te cayó en la cabeza. Pagaste el hospital.', '🧨 Picaste donde no debías y *explotó un Creeper* en tu cara.', '🌋 Resbalaste y *te caíste a un charco de lava*. Perdiste tus cosas.', '🐻 Despertaste a un *oso hibernando* en la cueva y tuviste que huir tirando tu dinero.', '⛏️ Rompiste tu *pico de diamante* contra una piedra indestructible.'];

module.exports = {
    name: 'minar',
    aliases: ['mine'],
    category: 'economía',
    desc: 'Mina en la cueva para ganar XP',
    
    execute: async ({ sock, remoteJid, sender, db, reply, fromGroup, userData }) => {
        if (!fromGroup) return reply('❌ Este comando es más divertido en grupos.');

        const now = Date.now();
        const cooldown = 5 * 60 * 1000;
        const lastAction = cooldowns.get(sender) || 0;
        const remaining = cooldown - (now - lastAction);

        if (remaining > 0) {
            const m = Math.floor(remaining / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            return reply(`⏳ Estás exhausto. Espera *${m}m ${s}s* para volver a la cueva.`);
        }

        cooldowns.set(sender, now);

        let multiplicador = (userData.inventory?.pico_pro || 0) > 0 ? 1.5 : 1;
        let aviso = multiplicador > 1 ? `\n⛏️ *¡Tu Pico de Diamante te da un bono de XP!*` : '';

        const msgSent = await sock.sendMessage(remoteJid, { text: `⛏️ @${cleanNumber(sender)} encendió su antorcha y entró a la cueva oscura...`, mentions: [sender] });
        await esperar(2000);
        try { await sock.sendMessage(remoteJid, { text: `⛏️ @${cleanNumber(sender)} está picando una pared de piedra...\n\n*¡Clank! ¡Clank! ¡Clank!*`, edit: msgSent.key, mentions: [sender] }); } catch(e){}
        await esperar(2000);

        let rand = Math.random() * 100;
        let critico = Math.random() < 0.10;
        let premio = 0, resTxt = '', txtCrit = critico ? `\n💥 *¡GOLPE CRÍTICO! Tu XP se ha duplicado.*` : '';

        if (rand < 5) { 
            premio = Math.floor(randXP(4000, 6000) * multiplicador); 
            if (critico) premio *= 2;
            resTxt = `${pick(minaLegendaria)}${aviso}${txtCrit}\n💰 Ganaste *${premio} XP*.`;
        } else if (rand < 20) { 
            premio = Math.floor(randXP(1500, 2500) * multiplicador); 
            if (critico) premio *= 2;
            resTxt = `${pick(minaEpica)}${aviso}${txtCrit}\n💰 Ganaste *${premio} XP*.`;
        } else if (rand < 70) { 
            premio = Math.floor(randXP(400, 1000) * multiplicador); 
            if (critico) premio *= 2;
            resTxt = `${pick(minaNormal)}${aviso}${txtCrit}\n💰 Ganaste *${premio} XP*.`;
        } else if (rand < 90) { 
            resTxt = `${pick(minaBasura)}\n💸 No ganas nada de XP.`;
        } else { 
            let castigo = randXP(500, 1000);
            // 🔥 Resta matemática segura de XP
            userData.xp = Math.max(0, (userData.xp || 0) - castigo);
            resTxt = `${pick(minaCastigo)}\n❌ Perdiste *${castigo} XP*.`;
        }

        if (premio > 0 && userData.pet && Math.random() < 0.25) {
            let bono = Math.floor(premio * 0.20);
            premio += bono;
            resTxt += `\n✨ ¡Tu mascota *${userData.pet.name}* te ayudó y encontró *+${bono} XP* extra!`;
        }

        if (premio > 0) {
            userData.xp = (userData.xp || 0) + premio;
        }

        // Recalcular nivel de forma segura
        userData.level = Math.floor((userData.xp || 0) / 10000) + 1;
        if (userData.level < 1) userData.level = 1;

        // Guardado seguro en base de datos
        if (userData.save) {
            await userData.save();
        } else {
            await db.setUser(sender, userData);
        }

        const fMsg = `*RESULTADO DE LA MINERÍA* ⛏️\n\n${resTxt}\n👤 Minero: @${cleanNumber(sender)}`;
        try { await sock.sendMessage(remoteJid, { text: fMsg, edit: msgSent.key, mentions: [sender] }); } 
        catch (e) { await sock.sendMessage(remoteJid, { text: fMsg, mentions: [sender] }); }
    }
};
