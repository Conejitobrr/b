'use strict';

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }
function pickRandom(list = []) { return list[Math.floor(Math.random() * list.length)]; }

const RETOS = [
  // 🔥 ORIGINALES
  'Envía una nota de voz diciendo “soy el más humilde del grupo”.',
  'Escribe un halago para la última persona que habló.',
  'Manda un emoji que describa tu vida amorosa.',
  'Di quién del grupo te cae mejor y por qué.',
  'Escribe “te extraño” sin contexto y no expliques nada por 5 minutos.',
  'Manda el último sticker que guardaste.',
  'Cambia tu nombre de WhatsApp por algo gracioso durante 10 minutos.',
  'Responde con solo emojis durante los próximos 5 mensajes.',
  'Manda una foto de algo que tengas cerca.',
  'Haz una confesión pequeña.',
  'Dile algo bonito a alguien del grupo.',
  'Escribe una indirecta random.',
  'Manda un audio riéndote falso.',
  'Di quién crees que es más dramático/a del grupo.',
  'Di quién crees que es más coqueto/a del grupo.',
  'Haz como que estás vendiendo algo inútil del cuarto.',
  'Escribe una frase motivacional falsa.',
  'Manda tu emoji más usado.',
  'Escribe “necesito hablar contigo” y no expliques por 3 minutos.',
  'Di tu peor excusa para no salir.',
  'Manda un mensaje como si fueras narrador de novela.',
  'Escribe una dedicatoria exagerada para alguien del grupo.',
  'Di quién sería el/la protagonista de una novela del grupo.',
  'Manda una palabra que describa tu humor actual.',
  'Escribe algo como si estuvieras celoso/a.',
  'Hazle una pregunta incómoda a alguien del grupo.',
  'Di quién parece más misterioso/a.',
  'Escribe “yo no fui” y no expliques nada.',
  'Manda un sticker que represente tu día.',
  'Di algo que nunca dirías en persona.',
  'Haz un mini poema de 2 líneas.',
  'Escribe como si estuvieras enamorado/a.',
  'Escribe como si fueras villano de novela.',
  'Dile “perdón por ser tan irresistible” a alguien.',
  'Manda una canción que describa tu mood.',
  'Di quién del grupo parece más inocente.',
  'Di quién del grupo parece más peligroso/a.',
  'Escribe un chisme inventado sin mencionar nombres.',
  'Manda el primer emoji que te salga.',
  'Di una red flag tuya.',
  'Di una green flag tuya.',
  'Escribe una frase de despechado/a.',
  'Haz una declaración falsa de amor.',
  'Manda un audio diciendo “me arrepiento de todo”.',
  'Etiqueta a alguien y dile “tenemos que hablar”.',
  'Di quién del grupo sería buen/a detective.',
  'Di quién del grupo sería el/la más infiel en una novela.',
  'Di quién del grupo parece más fiel.',
  'Manda un mensaje usando solo mayúsculas.',
  'Escribe una frase como si estuvieras en una pelea.',
  'Confiesa algo que te dé un poco de vergüenza.',
  'Di cuál fue tu último antojo.',
  'Manda un sticker sin contexto.',
  'Di quién del grupo parece más serio/a.',
  'Di quién del grupo parece más chismoso/a.',
  'Di quién del grupo parece más sensible.',
  'Escribe una carta de renuncia al amor.',
  'Escribe una frase como mamá molesta.',
  'Manda un audio diciendo una frase dramática.',
  'Di una mentira obvia.',
  'Escribe “ya me enteré de todo” y espera reacciones.',
  'Dile a alguien “te tengo en la mira”.',
  'Di qué emoji representa a la persona mencionada.',
  'Manda un mensaje como si fueras influencer.',
  'Di quién del grupo debería casarse primero.',
  'Di quién del grupo sería famoso/a.',
  'Di quién del grupo sobreviviría a una película de terror.',
  'Haz una pregunta random al grupo.',
  'Di algo que te haga reír siempre.',
  'Manda una frase de telenovela.',
  'Di tu palabra favorita del momento.',
  'Etiqueta a alguien y dile “confiesa”.',
  'Manda un audio diciendo “qué bendición”.',
  'Escribe una frase como si estuvieras dolido/a.',
  'Di quién del grupo sería buen/a psicólogo/a.',
  'Di quién del grupo parece más orgulloso/a.',
  'Di quién del grupo parece más intenso/a.',
  'Escribe “no estoy celoso/a” de forma sospechosa.',
  'Haz una mini historia de amor de 3 líneas.',
  'Manda un mensaje como robot.',
  'Dile a alguien “te perdono, pero no olvido”.',
  'Di una opinión polémica pero suave.',
  'Escribe una frase como si fueras millonario/a.',
  'Manda una reacción exagerada a cualquier mensaje.',
  'Di quién del grupo parece más romántico/a.',
  'Di quién del grupo parece más frío/a.',
  'Dile a alguien “eres mi personaje favorito”.',
  'Manda una frase cringe a propósito.',
  'Escribe una excusa para llegar tarde.',
  'Di quién del grupo parece más dormilón/a.',
  'Di quién del grupo parece más fiestero/a.',
  'Escribe un mensaje como si estuvieras enojado/a pero con cariño.',
  'Manda un emoji y que el grupo adivine qué significa.',
  'Di quién del grupo sería buen/a jefe/a.',
  'Di quién del grupo sería pésimo/a guardando secretos.',
  'Dile a alguien “yo confiaba en ti”.',
  'Haz una confesión falsa y dramática.',
  'Escribe una frase como si fueras cantante triste.',
  'Manda un audio diciendo “se tenía que decir y se dijo”.',
  'Di quién del grupo tiene más pinta de protagonista.',
  'Di quién del grupo tiene más pinta de villano/a.',
  'Escribe “finjo demencia” y no expliques nada.',
  
  // 💥 NUEVOS RETOS AÑADIDOS
  'Manda un audio cantando a todo pulmón el coro de tu canción favorita.',
  'Cambia tu foto de perfil por la de un mono durante 1 hora.',
  'Escribe un párrafo de 3 líneas sin usar la vocal "A".',
  'Pide un consejo amoroso inventado al grupo y finge llorar.',
  'Dile a la segunda persona que habló hoy que te debe dinero.',
  'Envía tu historial de búsqueda más reciente (sin borrar nada).',
  'Escribe un mensaje dramático despidiéndote del grupo y vuelve en 2 minutos como si nada.',
  'Imita el sonido de un animal extraño en un audio de 5 segundos.',
  'Cuenta un chiste malísimo e insiste en que es el mejor del mundo.',
  'Decláratele en broma a SiriusBot.',
  'Escribe "Creo que estoy enamorado/a de alguien de este grupo" y no respondas por 10 minutos.',
  'Manda una captura de tu galería de fotos (lo que salga).',
  'Di quién del grupo crees que tiene los peores gustos musicales.',
  'Escribe el nombre de tu crush pero con los ojos vendados.',
  'Finge que le enviaste un mensaje a tu ex por accidente al grupo.',
  'Di algo que odies de tu mejor amigo/a.',
  'Califica del 1 al 10 la foto de perfil de la última persona que escribió.',
  'Habla como si fueras un alienígena intentando comunicarse con la Tierra.',
  'Manda un audio contando el sueño más raro que has tenido.',
  'Menciona a alguien al azar y dile "Sabes lo que hiciste".',
  'Escribe todo tu próximo mensaje al revés.',
  'Finge ser el administrador del grupo y pon una regla absurda.',
  'Manda el quinto meme de tu sección de favoritos.',
  'Confiesa a qué edad dejaste de creer en Papá Noel/Santa Claus.',
  'Di cuál ha sido tu peor "oso" (vergüenza) en público.'
];

module.exports = {
  name: 'reto',
  aliases: ['dare'],
  category: 'diversión',
  desc: 'Envía un reto aleatorio a ti o a otra persona',

  execute: async ({ sock, msg, remoteJid, sender, args, db, reply }) => {
    try {
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const mentioned = mentionedJid.map(cleanJid);

      let targetText = '';
      let mentions = [];

      // Evaluar quién recibe el reto (mención, texto directo o uno mismo)
      if (mentioned.length > 0) {
        const target = mentioned[0];
        targetText = `@${cleanNumber(target)}`;
        mentions = [target];
      } else if (args.length > 0) {
        targetText = args.join(' ').trim();
      } else {
        targetText = `@${cleanNumber(sender)}`;
        mentions = [cleanJid(sender)];
      }

      const reto = pickRandom(RETOS);

      const mensaje = `🎲 *RETO*\n\n👤 Para: *${targetText}*\n\n🔥 ${reto}`;

      await sock.sendMessage(remoteJid, { text: mensaje, mentions }, { quoted: msg });

      // ⭐ Recompensa oculta: Ganan entre 10 y 25 XP solo por jugar
      try {
        if (db && typeof db.addXP === 'function') {
          await db.addXP(sender, Math.floor(Math.random() * 16) + 10);
        }
      } catch {}

    } catch (err) {
      console.log('❌ Error en reto:', err?.message || err);
      return reply('❌ Ocurrió un error al intentar generar el reto.');
    }
  }
};
