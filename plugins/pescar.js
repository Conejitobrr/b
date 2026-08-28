'use strict';

const cooldowns = new Map();

function cleanNumber(jid = '') { return String(jid).split('@')[0].replace(/\D/g, ''); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randXP(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const pescaLegendaria = ['🦈 ¡INCREÍBLE! Pescaste un *Megalodón* y lo vendiste en el mercado negro.', '🏴‍☠️ ¡Pesca histórica! Enganchaste un *Cofre Pirata* lleno de joyas antiguas.', '🧜‍♀️ ¡Wow! Una *Sirena* se enredó en tu red y te pagó con perlas para que la liberes.', '🐉 Pescaste al mismísimo *Monstruo del Lago Ness* y los periódicos te pagaron millones.'];
const pescaEpica = ['🐡 ¡Genial! Pescaste un raro *Pez Globo Dorado*.', '🐟 ¡Qué fuerza! Lograste sacar un *Atún Aleta Amarilla* gigante.', '⚔️ Luchaste por horas y pescaste un enorme *Pez Espada*.', '🦑 Pescaste un *Calamar Gigante* que casi hunde tu bote.'];
const pescaNormal = ['🐟 Pescaste un hermoso *Salmón* para la cena.', '🐠 Conseguiste una buena *Corvina* fresca.', '🐟 Pescaste un *Bonito* de buen tamaño.', '🐡 Atrapaste un montón de *Pejerreyes*.', '🐟 Sacaste una *Trucha* de río muy apetitosa.', '🐠 Pescaste una *Tilapia* promedio.'];
const pescaBasura = ['🥾 Qué asco... Pescaste una *bota vieja y apestosa*.', '🛞 Enganchaste una *llanta pinchada* llena de lodo.', '🌿 Solo sacaste un montón de *algas enredadas*.', '🩲 Pescaste un *calzoncillo mojado* de alguien más... qué asco.', '🍾 Enganchaste una *botella de plástico* vacía. Al menos limpiaste el mar.'];
const pescaCastigo = ['🐊 ¡CUIDADO! Un *cocodrilo* salió del agua y te mordió. Pagaste medicinas.', '🦈 Un *tiburón* saltó, se comió tu pesca y rompió tu caña carísima.', '🌊 Te resbalaste, caíste al agua y *perdiste tu billetera*.', '🦅 Un *pelícano gigante* te atacó y se robó lo que habías pescado.', '👮‍♂️ La policía marítima te multó por *pescar sin licencia*.'];

module.exports = {
    name: 'pescar',
    aliases: ['fish'],
    category: 'economía',
    desc: 'Pesca en el lago para ganar XP',
    
    execute: async ({ sock, remoteJid, sender, db, reply, fromGroup, userData }) => {
        if (!fromGroup) return reply('❌ Este comando es más divertido en grupos.');

        const now = Date.now();
        const cooldown = 5 * 60 * 1000;
        const lastAction = cooldowns.get(sender) || 0;
        const remaining = cooldown - (now - lastAction);

        if (remaining > 0) {
            const m = Math.floor(remaining / 60000);
            const s = Math.floor((remaining % 60000) / 1000);
            return reply(`⏳ El lago está revuelto. Espera *${m}m ${s}s* para volver a pescar.`);
        }

        cooldowns.set(sender, now);

        let multiplicador = (userData.inventory?.cana_pro || 0) > 0 ? 1.5 : 1;
        let aviso = multiplicador > 1 ? `\n🎣 *¡Tu Caña Profesional te da un bono de XP!*` : '';

        const msgSent = await sock.sendMessage(remoteJid, { text: `🎣 @${cleanNumber(sender)} ha lanzado la caña al agua...`, mentions: [sender] });
        await esperar(2000);
        try { await sock.sendMessage(remoteJid, { text: `🎣 @${cleanNumber(sender)} siente un fuerte tirón... *¡Algo picó!*`, edit: msgSent.key, mentions: [sender] }); } catch(e){}
        await esperar(2000);

        let rand = Math.random() * 100;
        let critico = Math.random() < 0.10;
        let premio = 0, resTxt = '', txtCrit = critico ? `\n💥 *¡GOLPE CRÍTICO! Tu XP se ha duplicado.*` : '';

        if (rand < 5) { 
            premio = Math.floor(randXP(4000, 6000) * multiplicador); 
            if (critico) premio *= 2;
            resTxt = `${pick(pescaLegendaria)}${aviso}${txtCrit}\n💰 Ganaste *${premio} XP*.`;
        } else if (rand < 20) { 
            premio = Math.floor(randXP(1500, 2500) * multiplicador); 
            if (critico) premio *= 2;
            resTxt = `${pick(pescaEpica)}${aviso}${txtCrit}\n💰 Ganaste *${premio} XP*.`;
        } else if (rand < 70) { 
            premio = Math.floor(randXP(400, 1000) * multiplicador); 
            if (critico) premio *= 2;
            resTxt = `${pick(pescaNormal)}${aviso}${txtCrit}\n💰 Ganaste *${premio} XP*.`;
        } else if (rand < 90) { 
            resTxt = `${pick(pescaBasura)}\n💸 No ganas nada de XP.`;
        } else { 
            let castigo = randXP(500, 1000);
            await db.removeXP(sender, castigo); // 🔥 FIX APLICADO
            resTxt = `${pick(pescaCastigo)}\n❌ Perdiste *${castigo} XP*.`;
        }

        if (premio > 0 && userData.pet && Math.random() < 0.25) {
            let bono = Math.floor(premio * 0.20);
            premio += bono;
            resTxt += `\n✨ ¡Tu mascota *${userData.pet.name}* te ayudó y encontró *+${bono} XP* extra!`;
        }

        if (premio > 0) await db.addXP(sender, premio); // 🔥 FIX APLICADO

        const fMsg = `*RESULTADO DE LA PESCA* 🎣\n\n${resTxt}\n👤 Pescador: @${cleanNumber(sender)}`;
        try { await sock.sendMessage(remoteJid, { text: fMsg, edit: msgSent.key, mentions: [sender] }); } 
        catch (e) { await sock.sendMessage(remoteJid, { text: fMsg, mentions: [sender] }); }
    }
};
