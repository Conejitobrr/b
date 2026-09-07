'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// 🗄️ RUTAS LOCALES (Apuntan directo a la raíz de tu repositorio)
const MEDIA_DIR = path.join(process.cwd(), 'media');
const TEMP_DIR = path.join(process.cwd(), 'temp');

const AUDIO_EXTENSIONS = ['.mp3', '.ogg', '.opus', '.wav', '.m4a', '.aac', '.flac', '.webm', '.mp4', '.mpeg'];

// 🔥 NORMALIZAR TEXTO (quita tildes y mayúsculas)
function normalize(text = '') {
  return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeRegExp(text = '') {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeFileName(name = '') {
  return normalize(name).trim().replace(/\s+/g, ' ');
}

// 🔥 Buscar audio por nombre base sin importar su extensión original
function resolveAudioFile(file = '') {
  if (!file) return null;
  if (!fs.existsSync(MEDIA_DIR)) {
    console.log('❌ Carpeta media no encontrada en:', MEDIA_DIR);
    return null;
  }

  const directPath = path.resolve(MEDIA_DIR, file);
  if (fs.existsSync(directPath)) return directPath;

  const wantedExt = path.extname(file).toLowerCase();
  const wantedBase = normalizeFileName(wantedExt ? path.basename(file, wantedExt) : path.basename(file));
  const files = fs.readdirSync(MEDIA_DIR);

  for (const item of files) {
    const full = path.join(MEDIA_DIR, item);
    try { if (!fs.statSync(full).isFile()) continue; } catch { continue; }

    const ext = path.extname(item).toLowerCase();
    if (!AUDIO_EXTENSIONS.includes(ext)) continue;

    if (normalizeFileName(path.basename(item, ext)) === wantedBase) {
      return full;
    }
  }
  return null;
}

// 🔥 Convertir archivo a nota de voz para WhatsApp usando FFmpeg
async function convertToVoice(input, output) {
  await execFileAsync('ffmpeg', [
    '-y', '-i', input,
    '-vn', '-map', '0:a:0', '-af', 'aresample=async=1:first_pts=0',
    '-c:a', 'libopus', '-application', 'voip', '-b:a', '48k',
    '-ar', '48000', '-ac', '1', '-frame_duration', '20', '-f', 'ogg',
    output
  ], { timeout: 60000, maxBuffer: 1024 * 1024 * 10 });
}

module.exports = {
  name: 'audios_pasivos',
  desc: 'Escucha palabras clave y envía audios automáticamente',

  // ⚡ onMessage se ejecuta automáticamente cada vez que alguien escribe algo
  onMessage: async ({ sock, remoteJid, body, fromGroup, msg, groupData, userData }) => {
    if (!body) return;

    // 🔥 VERIFICAR CONFIGURACIÓN DE LA BASE DE DATOS
    // Si los audios están desactivados en el grupo o por el usuario, ignora el mensaje
    if (fromGroup && groupData && groupData.audios === false) return;
    if (!fromGroup && userData && userData.audios === false) return;

    const text = normalize(body);

    // 🎵 DICCIONARIO DE AUDIOS
    const audios = [
      { triggers: ['hola'], file: 'hola' },
      { triggers: ['autoestima'], file: 'Autoestima' },
      { triggers: ['tetas'], file: 'ATetas' },
      { triggers: ['añanin'], file: 'Añañin' },
      { triggers: ['chaoo'], file: 'Chaoo' },
      { triggers: ['coge'], file: 'Coger' },
      { triggers: ['viernes'], file: 'viernes' },
      { triggers: ['siu', 'siuu', 'siuuu', 'siuuuu', 'siuuuuu', 'siuuuuuu'], file: 'siu' },
      { triggers: ['noche de paz'], file: 'Noche' },
      { triggers: ['sexo'], file: 'S3x0g' },
      { triggers: ['mff'], file: 'Mff' },
      { triggers: ['linda'], file: 'Linda' },
      { triggers: ['chamba'], file: 'Chamba' },
      { triggers: ['uwu'], file: 'UwU' },
      { triggers: ['ag'], file: 'Asco' },

      // 💬 FRASES COMPLETAS
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

    // 🔥 BUSCAR MATCH CORRECTO
    let selected = null;

    for (const audio of audios) {
      for (const trigger of audio.triggers) {
        const t = normalize(trigger);

        if (t.includes(' ')) {
          if (text.includes(t)) {
            selected = audio;
            break;
          }
        } else {
          const regex = new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i');
          if (regex.test(text)) {
            selected = audio;
            break;
          }
        }
      }
      if (selected) break;
    }

    if (!selected) return;

    // Resolver ruta del archivo en la carpeta media/
    const input = resolveAudioFile(selected.file);
    if (!input || !fs.existsSync(input)) return;

    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

    const output = path.join(TEMP_DIR, `voice_${Date.now()}_${Math.floor(Math.random() * 9999)}.ogg`);

    try {
      // Convertir el MP3/M4A a nota de voz pura
      await convertToVoice(input, output);

      if (!fs.existsSync(output) || fs.statSync(output).size <= 0) return;

      // Enviar como Nota de Voz (ptt: true)
      await sock.sendMessage(
        remoteJid,
        { audio: fs.readFileSync(output), mimetype: 'audio/ogg; codecs=opus', ptt: true },
        { quoted: msg }
      );

    } catch (err) {
      console.log('❌ Error enviando audio pasivo:', err?.message || err);
    } finally {
      // 🧹 Limpiar archivo temporal
      try {
        if (fs.existsSync(output)) fs.unlinkSync(output);
      } catch {}
    }
  }
};
