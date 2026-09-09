'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

const execFileAsync = promisify(execFile);

// 🗄️ RUTAS LOCALES
const MEDIA_DIR = path.join(process.cwd(), 'media');
const TEMP_DIR = path.join(process.cwd(), 'temp');
const CUSTOM_DB = path.join(process.cwd(), 'lib', 'custom_audios.json');

const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.opus', '.wav', '.m4a', '.aac', '.flac', '.webm', '.mp4', '.mpeg'];

// 🧠 Memoria Anti-Spam
const cooldowns = new Map();
const COOLDOWN_TIME = 10000; // 10 segundos

// 🎵 AUDIOS BASE (Movidos aquí arriba para usarlos en el menú y en la escucha)
const BASE_AUDIOS = [
  { triggers: ['hola'], file: 'hola' },
  { triggers: ['autoestima'], file: 'Autoestima' },
  { triggers: ['tetas'], file: 'ATetas' },
  { triggers: ['añanin'], file: 'Añañin' },
  { triggers: ['chaoo'], file: 'Chaoo' },
  { triggers: ['coge'], file: 'Coger' },
  { triggers: ['viernes'], file: 'viernes' },
  { triggers: ['siu', 'siuu', 'siuuu', 'siuuuu'], file: 'siu' },
  { triggers: ['noche de paz'], file: 'Noche' },
  { triggers: ['sexo'], file: 'S3x0g' },
  { triggers: ['mff'], file: 'Mff' },
  { triggers: ['linda'], file: 'Linda' },
  { triggers: ['chamba'], file: 'Chamba' },
  { triggers: ['uwu'], file: 'UwU' },
  { triggers: ['ag'], file: 'Asco' },
  { triggers: ['tu no mete'], file: 'Tu no mete' },
  { triggers: ['telepatia', 'telepatía'], file: 'Telepatía' },
  { triggers: ['un pato'], file: 'pato' },
  { triggers: ['duermete alv', 'duérmete alv'], file: 'Duerme' },
  { triggers: ['bendicion', 'bendición'], file: 'Bendicion' },
  { triggers: ['compartan'], file: 'Compartan' },
  { triggers: ['brr'], file: 'Brr' },
  { triggers: ['llamaba charly'], file: 'Llamaba charly' },
  { triggers: ['mis ojos'], file: 'Mis ojos' },
  { triggers: ['pipipi'], file: 'Pipipi' },
  { triggers: ['epico','épico'], file: 'Épico' },
  { triggers: ['me voy'], file: 'Me voy' },
  { triggers: ['una basura'], file: 'Basura' },
  { triggers: ['cancer','cáncer'], file: 'Cáncer' },
  { triggers: ['doxean', 'me doxean'], file: 'Me doxean' },
  { triggers: ['no es jueves'], file: 'No es jueves' },
  { triggers: ['jejeje'], file: 'Jejeje' }
];

function ensureSetup() {
  if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
  const libDir = path.dirname(CUSTOM_DB);
  if (!fs.existsSync(libDir)) fs.mkdirSync(libDir, { recursive: true });
  if (!fs.existsSync(CUSTOM_DB)) fs.writeFileSync(CUSTOM_DB, '[]');
}

function normalize(text = '') {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeFileName(name = '') {
  return normalize(name).trim().replace(/\s+/g, ' ');
}

function resolveAudioFile(file = '') {
  if (!file) return null;
  const directPath = path.resolve(MEDIA_DIR, file);
  if (fs.existsSync(directPath)) return directPath;

  const wantedExt = path.extname(file).toLowerCase();
  const wantedBase = normalizeFileName(wantedExt ? path.basename(file, wantedExt) : path.basename(file));
  
  if (!fs.existsSync(MEDIA_DIR)) return null;
  const files = fs.readdirSync(MEDIA_DIR);

  for (const item of files) {
    const full = path.join(MEDIA_DIR, item);
    try { if (!fs.statSync(full).isFile()) continue; } catch { continue; }
    const ext = path.extname(item).toLowerCase();
    if (!AUDIO_EXTENSIONS.includes(ext)) continue;
    if (normalizeFileName(path.basename(item, ext)) === wantedBase) return full;
  }
  return null;
}

async function convertToVoice(input, output) {
  await execFileAsync('ffmpeg', [
    '-y', '-i', input,
    '-vn', '-map', '0:a:0', '-af', 'aresample=async=1:first_pts=0',
    '-c:a', 'libopus', '-application', 'voip', '-b:a', '48k',
    '-ar', '48000', '-ac', '1', '-frame_duration', '20', '-f', 'ogg',
    output
  ], { timeout: 60000 });
}

module.exports = {
  name: 'audios_pasivos',
  aliases: ['addaudio', 'añadiraudio', 'delaudio', 'borraraudio', 'audios', 'listaaudios'],
  category: 'multimedia',
  desc: 'Añade, elimina o mira la lista de audios automáticos',

  // 1️⃣ SISTEMA DE COMANDOS DIRECTOS
  execute: async ({ sock, msg, remoteJid, args, commandName, isAdmin, isOwner, reply }) => {
    ensureSetup();
    
    // 📋 LÓGICA PARA VER LA LISTA DE AUDIOS (Público para todos)
    if (commandName === 'audios' || commandName === 'listaaudios' || commandName === 'audios_pasivos') {
      let customAudios = [];
      try { customAudios = JSON.parse(fs.readFileSync(CUSTOM_DB, 'utf-8')); } catch {}

      let texto = `╔══════════════════════╗\n`;
      texto += `        🎵 *LISTA DE AUDIOS* 🎵\n`;
      texto += `╚══════════════════════╝\n\n`;

      texto += `📌 *Audios Predeterminados:*\n`;
      const baseTriggers = BASE_AUDIOS.map(a => a.triggers[0]).sort();
      texto += `_${baseTriggers.join(' • ')}_\n\n`;

      if (customAudios.length > 0) {
        texto += `💎 *Audios Personalizados:*\n`;
        const customTriggers = customAudios.map(a => a.triggers[0]).sort();
        texto += `_${customTriggers.join(' • ')}_\n`;
      } else {
        texto += `💎 *Audios Personalizados:*\n_Aún no hay audios añadidos por los administradores._\n`;
      }

      texto += `\n💡 _Escribe cualquiera de estas palabras en el chat y el bot enviará la nota de voz._`;
      return reply(texto);
    }

    // ⛔ RESTRICCIÓN DE ADMINISTRADOR PARA AGREGAR O BORRAR
    if (!isAdmin && !isOwner) {
      return reply('❌ Comando denegado. Solo los Administradores o el Creador del bot pueden añadir o borrar audios.');
    }

    const triggerWord = args.join(' ').trim().toLowerCase();

    // 🗑️ LÓGICA PARA ELIMINAR AUDIO
    if (commandName.startsWith('del') || commandName.startsWith('borrar')) {
      if (!triggerWord) return reply('❌ Escribe la palabra clave del audio que quieres eliminar.\n\n📌 *Ejemplo:*\n.delaudio ahhh');

      let customAudios = [];
      try { customAudios = JSON.parse(fs.readFileSync(CUSTOM_DB, 'utf-8')); } catch {}

      const index = customAudios.findIndex(a => a.triggers.includes(triggerWord));
      
      if (index === -1) {
        return reply(`❌ No encontré ningún audio guardado con la palabra "${triggerWord}".`);
      }

      const fileToDelete = path.join(MEDIA_DIR, customAudios[index].file);
      try { if (fs.existsSync(fileToDelete)) fs.unlinkSync(fileToDelete); } catch {}

      customAudios.splice(index, 1);
      fs.writeFileSync(CUSTOM_DB, JSON.stringify(customAudios, null, 2));

      return reply(`✅ *Audio eliminado con éxito.*\n\nYa no responderé cuando digan "${triggerWord}".`);
    }

    // ➕ LÓGICA PARA AGREGAR AUDIO
    if (commandName.startsWith('add') || commandName.startsWith('añadir')) {
      try {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const isVideo = quoted?.videoMessage;
        const isAudio = quoted?.audioMessage;
        const isDocument = quoted?.documentMessage;

        if (!isVideo && !isAudio && !isDocument) {
          return reply('❌ Debes responder a un *Video* o *Audio*.\n\n📌 *Ejemplo:* Responde al video y escribe:\n*.addaudio wazaa*');
        }

        if (!triggerWord) {
          return reply('❌ Escribe la palabra que activará el audio.\n\n📌 *Ejemplo:*\n.addaudio ahhh');
        }

        await sock.sendPresenceUpdate('composing', remoteJid);

        const id = `${Date.now()}`;
        const extIn = isVideo ? 'mp4' : 'ogg';
        const inputMedia = path.join(TEMP_DIR, `in_${id}.${extIn}`);
        
        const safeName = `custom_${triggerWord.replace(/[^a-z0-9]/gi, '')}_${id}.mp3`;
        const outputMp3 = path.join(MEDIA_DIR, safeName);

        let mediaType = 'video';
        let mediaContent = quoted.videoMessage;
        if (isAudio) { mediaType = 'audio'; mediaContent = quoted.audioMessage; }
        if (isDocument) { mediaType = 'document'; mediaContent = quoted.documentMessage; }
        
        const stream = await downloadContentFromMessage(mediaContent, mediaType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        fs.writeFileSync(inputMedia, buffer);

        await execFileAsync('ffmpeg', [
          '-y', '-i', inputMedia,
          '-vn', '-c:a', 'libmp3lame', '-b:a', '128k', 
          outputMp3
        ]);

        let customAudios = [];
        try { customAudios = JSON.parse(fs.readFileSync(CUSTOM_DB, 'utf-8')); } catch {}
        
        if (customAudios.some(a => a.triggers.includes(triggerWord)) || BASE_AUDIOS.some(a => a.triggers.includes(triggerWord))) {
           return reply(`⚠️ La palabra "${triggerWord}" ya tiene un audio asignado. Intenta con otra palabra o usa *.delaudio* primero.`);
        }

        customAudios.push({ triggers: [triggerWord], file: safeName });
        fs.writeFileSync(CUSTOM_DB, JSON.stringify(customAudios, null, 2));

        if (fs.existsSync(inputMedia)) fs.unlinkSync(inputMedia);

        await sock.sendMessage(remoteJid, { 
          text: `✅ *¡Audio registrado con éxito!*\n\n🎙️ Ahora, cuando alguien escriba *"${triggerWord}"*, enviaré la nota de voz.` 
        }, { quoted: msg });

      } catch (err) {
        console.log('❌ Error en addaudio:', err?.message || err);
        return reply('❌ Ocurrió un error al intentar guardar el nuevo audio.');
      }
    }
  },

  // 2️⃣ SISTEMA AUTOMÁTICO DE ESCUCHA
  onMessage: async ({ sock, remoteJid, body, fromGroup, msg, groupData, userData }) => {
    if (!body) return;

    if (fromGroup && groupData && groupData.audios === false) return;
    if (!fromGroup && userData && userData.audios === false) return;

    ensureSetup();
    const text = normalize(body);

    let customAudios = [];
    try { customAudios = JSON.parse(fs.readFileSync(CUSTOM_DB, 'utf-8')); } catch {}

    const allAudios = [...BASE_AUDIOS, ...customAudios];
    let selected = null;

    for (const audio of allAudios) {
      for (const trigger of audio.triggers) {
        const t = normalize(trigger);
        if (t.includes(' ')) {
          if (text.includes(t)) { selected = audio; break; }
        } else {
          const regex = new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i');
          if (regex.test(text)) { selected = audio; break; }
        }
      }
      if (selected) break;
    }

    if (!selected) return;

    // 🛡️ FILTRO ANTI-SPAM
    const lastUsed = cooldowns.get(remoteJid) || 0;
    if (Date.now() - lastUsed < COOLDOWN_TIME) return;

    const input = resolveAudioFile(selected.file);
    if (!input || !fs.existsSync(input)) return;

    const output = path.join(TEMP_DIR, `voice_${Date.now()}_${Math.floor(Math.random() * 9999)}.ogg`);

    try {
      cooldowns.set(remoteJid, Date.now()); 
      await sock.sendPresenceUpdate('recording', remoteJid);
      
      await convertToVoice(input, output);
      if (!fs.existsSync(output) || fs.statSync(output).size <= 0) return;

      await sock.sendMessage(
        remoteJid,
        { audio: fs.readFileSync(output), mimetype: 'audio/ogg; codecs=opus', ptt: true },
        { quoted: msg }
      );

    } catch (err) {
      console.log('❌ Error enviando audio pasivo:', err?.message || err);
    } finally {
      try { if (fs.existsSync(output)) fs.unlinkSync(output); } catch {}
    }
  }
};
