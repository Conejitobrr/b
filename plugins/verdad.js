'use strict';

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

const VERDADES = [
  '¿Cuál fue la última mentira que dijiste?',
  '¿Alguna vez hablaste mal de alguien de este grupo?',
  '¿Quién de este grupo te cae mejor?',
  '¿Quién de este grupo te parece más misterioso/a?',
  '¿Alguna vez te gustó alguien de este grupo?',
  '¿Qué es lo más vergonzoso que te ha pasado?',
  '¿Cuál fue tu peor cita?',
  '¿Has stalkeado a alguien recientemente?',
  '¿A quién le responderías más rápido un mensaje?',
  '¿Qué persona te pone nervioso/a?',
  '¿Qué secreto pequeño nunca has contado?',
  '¿Cuál fue tu peor excusa para no salir?',
  '¿Alguna vez fingiste estar ocupado/a para no responder?',
  '¿Quién crees que es más chismoso/a del grupo?',
  '¿Quién crees que es más dramático/a del grupo?',
  '¿A quién elegirías para contarle un secreto?',
  '¿Qué fue lo más raro que buscaste en internet?',
  '¿Has eliminado un mensaje por vergüenza?',
  '¿Qué cosa te da pena admitir?',
  '¿Cuál fue tu crush más raro?',
  '¿Alguna vez te gustó alguien que no debías?',
  '¿Quién de este grupo tiene mejor vibra?',
  '¿Quién de este grupo parece más coqueto/a?',
  '¿Quién de este grupo parece más tóxico/a?',
  '¿Cuál es tu mayor red flag?',
  '¿Cuál es tu green flag?',
  '¿Qué te da más celos?',
  '¿Perdonarías una mentira?',
  '¿Has revisado el perfil de alguien muchas veces?',
  '¿A quién extrañas pero no se lo dices?',
  '¿Cuál fue el último chat que borraste?',
  '¿Qué canción te da vergüenza que te guste?',
  '¿Qué es algo que haces cuando nadie te ve?',
  '¿Cuál fue tu peor oso en público?',
  '¿Alguna vez te arrepentiste de enviar un mensaje?',
  '¿A quién le mandarías un “te extraño”?',
  '¿Qué persona te parece difícil de olvidar?',
  '¿Qué es lo más impulsivo que hiciste?',
  '¿Qué es algo que nunca perdonarías?',
  '¿Te han gustado dos personas al mismo tiempo?',
  '¿Alguna vez fingiste que no te importaba alguien?',
  '¿Cuál fue tu mayor ridículo por amor?',
  '¿Qué es lo más raro que te han dicho por chat?',
  '¿Cuál es tu peor hábito?',
  '¿Qué es lo que más te molesta de la gente?',
  '¿Quién de este grupo parece más sincero/a?',
  '¿Quién de este grupo parece más mentiroso/a?',
  '¿Quién de este grupo sería buen/a novio/a?',
  '¿Quién de este grupo sería mala idea como pareja?',
  '¿Qué harías si tu crush te escribe ahora mismo?',
  '¿Alguna vez respondiste seco/a a propósito?',
  '¿Has dejado en visto a alguien que sí te importaba?',
  '¿Qué fue lo último que te dio vergüenza?',
  '¿Cuál es tu mayor miedo en una relación?',
  '¿Te consideras celoso/a?',
  '¿Te consideras orgulloso/a?',
  '¿Pedirías perdón aunque no tengas la culpa?',
  '¿Qué persona te hizo cambiar mucho?',
  '¿Qué es lo más bonito que te han dicho?',
  '¿Qué es lo más feo que te han dicho?',
  '¿Cuál fue tu peor etapa?',
  '¿Qué secreto te gustaría saber de alguien?',
  '¿Alguna vez ocultaste una conversación?',
  '¿A quién le tienes más confianza?',
  '¿Quién te parece más divertido/a del grupo?',
  '¿Quién te parece más serio/a del grupo?',
  '¿Quién te parece más intenso/a del grupo?',
  '¿Qué harías si te declaran su amor hoy?',
  '¿Qué cosa te ilusiona rápido?',
  '¿Cuál fue tu última decepción?',
  '¿Te gusta alguien actualmente?',
  '¿Has fingido que ya superaste a alguien?',
  '¿Qué persona no esperabas extrañar?',
  '¿Alguna vez hablaste con alguien solo por aburrimiento?',
  '¿Qué es algo que no soportas en WhatsApp?',
  '¿Cuál fue tu peor audio enviado?',
  '¿Alguna vez mandaste un mensaje al chat equivocado?',
  '¿Qué cosa te hace perder el interés rápido?',
  '¿Qué te enamora más rápido?',
  '¿Prefieres que te busquen o buscar tú?',
  '¿Has sentido celos sin ser nada?',
  '¿Cuál fue tu peor bloqueo emocional?',
  '¿Quién de este grupo parece más orgulloso/a?',
  '¿Quién de este grupo parece más sensible?',
  '¿Quién de este grupo parece más fiel?',
  '¿Quién de este grupo parece más infiel?',
  '¿Cuál fue tu última indirecta?',
  '¿Alguna vez subiste un estado para que alguien lo vea?',
  '¿A quién va dirigida tu última indirecta?',
  '¿Qué cosa nunca dirías en voz alta?',
  '¿Cuál es tu mayor inseguridad?',
  '¿Qué te cuesta admitir?',
  '¿Has llorado por alguien que no lo merecía?',
  '¿Cuál fue el mensaje que más esperaste?',
  '¿Qué persona te dejó pensando mucho?',
  '¿Alguna vez te arrepentiste de conocer a alguien?',
  '¿Qué es lo más inmaduro que has hecho?',
  '¿Qué es lo más maduro que has hecho?',
  '¿Qué harías si tu ex te escribe?',
  '¿Qué harías si tu crush te manda “hola”?',
  '¿Cuál fue la peor excusa que te dieron?',
  '¿Cuál fue la peor excusa que tú diste?',
  '¿A quién invitarías a salir de este grupo?',
  '¿Con quién tendrías una conversación seria?',
  '¿Quién crees que guarda más secretos?',
  '¿Cuál es una verdad que nadie sabe de ti?'
];

module.exports = {
  name: 'verdad',
  aliases: ['velda', 'verdad'],
  category: 'diversión',
  desc: 'Hazle una pregunta de verdad a alguien o a ti mismo',

  execute: async ({ sock, msg, remoteJid, sender, args, db, reply }) => {
    try {
      let targetText = '';
      let mentions = [];

      const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

      if (mentioned) {
        targetText = `@${cleanNumber(mentioned)}`;
        mentions = [cleanJid(mentioned)];
      } else if (quoted) {
        targetText = `@${cleanNumber(quoted)}`;
        mentions = [cleanJid(quoted)];
      } else if (args.length) {
        targetText = args.join(' ').trim();
      } else {
        targetText = `@${cleanNumber(sender)}`;
        mentions = [cleanJid(sender)];
      }

      const pregunta = VERDADES[Math.floor(Math.random() * VERDADES.length)];
      const textMsg = `🎭 *VERDAD*\n\n👤 Para: *${targetText}*\n\n❓ ${pregunta}`;

      await sock.sendMessage(remoteJid, { text: textMsg, mentions }, { quoted: msg });

      // Agrega una cantidad mínima aleatoria de XP por jugar
      try {
        const userData = await db.getUser(sender);
        userData.xp = (userData.xp || 0) + Math.floor(Math.random() * 16) + 10;
        if (userData.save) await userData.save();
      } catch (e) {}

    } catch (err) {
      console.log('❌ Error en verdad:', err);
      return reply('❌ Ocurrió un error al usar el comando verdad.');
    }
  }
};
