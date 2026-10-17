'use strict';

const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(process.cwd(), 'temp');

function ensureTemp() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function cleanJid(jid = '') { return String(jid).split(':')[0]; }
function cleanNumber(jid = '') { return cleanJid(jid).split('@')[0].replace(/\D/g, ''); }

function safeText(text = '') {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

function safeFileName(text = '') {
  return String(text || 'Festival')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 35) || 'Festival';
}

function parseInput(args = [], pushName = '') {
  const raw = args.join(' ').replace(/@\d+/g, '').trim();
  if (!raw) return null;

  const parts = raw.split('|').map(v => v.trim());

  return {
    nombre: safeText(parts[0] || 'Persona Especial'),
    autor: safeText(parts[1] || pushName || 'Alguien que te aprecia'),
    frase: safeText(parts[2] || 'Cada farol en este lago lleva un deseo, y todos mis deseos tienen tu nombre 🏮✨'),
    titulo: safeText(parts[3] || '🏮 Nuestro Lago de los Deseos 🏮')
  };
}

function buildHtml({ nombre, autor, frase, titulo }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Festival de Faroles para ${nombre} 🏮</title>

  <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Dancing+Script:wght@700&family=Quicksand:wght@400;600;700&display=swap" rel="stylesheet">

  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
      }
    }
  </script>

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
    }

    html, body {
      overflow: hidden;
      height: 100%;
      width: 100%;
      background: #070b19;
      font-family: 'Quicksand', sans-serif;
    }

    .webgl {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100%;
      outline: none;
      z-index: 1;
    }

    /* 🏮 PANTALLA DE ENTRADA */
    .welcome-screen {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at 50% 35%, #2b1810 0%, #0d0914 60%, #05050a 100%);
      z-index: 100;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 24px;
      transition: opacity 1.1s ease, visibility 1.1s ease;
    }

    .welcome-screen.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .welcome-card {
      background: rgba(25, 18, 12, 0.72);
      border: 1px solid rgba(255, 183, 77, 0.45);
      backdrop-filter: blur(16px);
      padding: 36px 26px;
      border-radius: 28px;
      max-width: 410px;
      width: 100%;
      text-align: center;
      box-shadow: 0 0 55px rgba(255, 145, 0, 0.28);
      animation: floatBox 4s ease-in-out infinite;
    }

    @keyframes floatBox {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .lantern-icon {
      font-size: 58px;
      margin-bottom: 10px;
      display: inline-block;
      filter: drop-shadow(0 0 18px #ff9100);
      animation: sway 3s ease-in-out infinite;
    }

    @keyframes sway {
      0%, 100% { transform: rotate(-7deg) translateY(0); }
      50% { transform: rotate(7deg) translateY(-6px); }
    }

    .welcome-title {
      font-family: 'Dancing Script', cursive;
      color: #ffd584;
      font-size: 36px;
      margin-bottom: 10px;
      text-shadow: 0 0 15px rgba(255, 152, 0, 0.7);
    }

    .welcome-sub {
      color: rgba(255, 240, 220, 0.88);
      font-size: 15px;
      line-height: 1.55;
      margin-bottom: 26px;
    }

    .gold-btn {
      background: linear-gradient(135deg, #ffb300, #ff5722);
      color: #fff;
      border: none;
      padding: 14px 32px;
      font-size: 16px;
      font-weight: 700;
      border-radius: 50px;
      cursor: pointer;
      box-shadow: 0 0 25px rgba(255, 145, 0, 0.65);
      transition: transform 0.2s, box-shadow 0.2s;
      font-family: 'Quicksand', sans-serif;
    }

    .gold-btn:active {
      transform: scale(0.95);
    }

    /* 💬 CABECERA Y PIE */
    .top-banner {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      color: #ffe8c2;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      background: rgba(20, 14, 10, 0.62);
      border: 1px solid rgba(255, 183, 77, 0.35);
      padding: 9px 20px;
      border-radius: 30px;
      backdrop-filter: blur(8px);
      z-index: 10;
      max-width: 78%;
      pointer-events: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
    }

    .credits {
      position: fixed;
      bottom: 84px;
      left: 50%;
      transform: translateX(-50%);
      color: #fff5e4;
      font-family: 'Dancing Script', cursive;
      font-size: 26px;
      text-align: center;
      text-shadow: 0 0 8px #ff9100, 0 0 18px #ff5722;
      z-index: 10;
      pointer-events: none;
      width: 92%;
    }

    /* 🎛️ BARRA DE ACCIONES INFERIOR */
    .bottom-controls {
      position: fixed;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      z-index: 20;
      width: max-content;
      max-width: 96%;
      flex-wrap: wrap;
      justify-content: center;
    }

    .action-btn {
      background: rgba(22, 16, 12, 0.78);
      border: 1px solid rgba(255, 183, 77, 0.4);
      color: #ffe8c2;
      padding: 10px 14px;
      border-radius: 25px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.25s;
      font-family: 'Quicksand', sans-serif;
    }

    .action-btn:hover, .action-btn.active {
      background: rgba(255, 145, 0, 0.38);
      border-color: #ffc107;
      box-shadow: 0 0 16px rgba(255, 152, 0, 0.5);
      color: #fff;
    }

    /* 💌 MODALES (CARTA Y DESEO) */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.72);
      backdrop-filter: blur(8px);
      z-index: 50;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      opacity: 0;
      visibility: hidden;
      transition: all 0.35s ease;
    }

    .modal-backdrop.open {
      opacity: 1;
      visibility: visible;
    }

    .modal-box {
      background: linear-gradient(155deg, rgba(38, 24, 16, 0.96), rgba(16, 11, 18, 0.98));
      border: 1px solid rgba(255, 183, 77, 0.55);
      border-radius: 24px;
      padding: 28px 22px;
      max-width: 410px;
      width: 100%;
      text-align: center;
      color: #fff5e6;
      box-shadow: 0 0 40px rgba(255, 145, 0, 0.32);
    }

    .modal-box h2 {
      font-family: 'Dancing Script', cursive;
      color: #ffc966;
      font-size: 32px;
      margin-bottom: 14px;
    }

    .modal-box p {
      font-size: 15.5px;
      line-height: 1.65;
      color: rgba(255, 245, 230, 0.94);
      margin-bottom: 18px;
      min-height: 48px;
    }

    .wish-input {
      width: 100%;
      padding: 12px 15px;
      border-radius: 14px;
      border: 1px solid rgba(255, 183, 77, 0.5);
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      font-size: 15px;
      margin-bottom: 16px;
      outline: none;
      text-align: center;
      font-family: 'Quicksand', sans-serif;
    }

    .wish-input::placeholder {
      color: rgba(255, 230, 200, 0.5);
    }

    .letter-sign {
      font-family: 'Dancing Script', cursive;
      font-size: 24px;
      color: #ffab40;
      margin-bottom: 14px;
    }

    /* 🎆 NOTIFICACIÓN FLOTANTE */
    .toast {
      position: fixed;
      top: 72px;
      left: 50%;
      transform: translateX(-50%) translateY(-10px);
      background: rgba(255, 152, 0, 0.9);
      color: #1a0f00;
      font-weight: 700;
      font-size: 13px;
      padding: 8px 18px;
      border-radius: 20px;
      z-index: 40;
      opacity: 0;
      pointer-events: none;
      transition: all 0.35s ease;
      box-shadow: 0 0 20px rgba(255, 152, 0, 0.6);
    }

    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* ⚙️ MENÚ LATERAL */
    .menu-button {
      position: fixed;
      top: 15px;
      left: 15px;
      width: 42px;
      height: 42px;
      background: rgba(22, 16, 12, 0.72);
      border: 1px solid rgba(255, 183, 77, 0.4);
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 25;
      backdrop-filter: blur(6px);
    }

    .menu-button span {
      display: block;
      width: 20px;
      height: 2px;
      background: #ffc966;
      margin: 2px 0;
      border-radius: 2px;
    }

    .config-panel {
      position: fixed;
      top: 0;
      left: -320px;
      width: 300px;
      height: 100%;
      background: rgba(15, 11, 18, 0.96);
      backdrop-filter: blur(14px);
      z-index: 30;
      padding: 20px;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      transition: left 0.3s ease;
      border-right: 1px solid rgba(255, 183, 77, 0.35);
    }

    .config-panel.open { left: 0; }

    .config-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    }

    .config-title {
      color: #ffc966;
      font-family: 'Dancing Script', cursive;
      font-size: 28px;
    }

    .close-button {
      background: none;
      border: none;
      color: white;
      font-size: 22px;
      cursor: pointer;
    }

    .config-section {
      margin-bottom: 16px;
      padding: 14px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 15px;
    }

    .config-section h3 {
      color: #ffb74d;
      margin-bottom: 10px;
      font-size: 16px;
    }

    .config-option { margin-bottom: 12px; }
    .config-option label {
      display: block;
      color: #eee;
      margin-bottom: 6px;
      font-size: 13px;
    }

    .config-option input[type="range"] {
      width: 100%;
      accent-color: #ff9800;
    }

    .sky-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .sky-btn {
      padding: 8px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
      font-size: 12px;
      cursor: pointer;
      font-family: 'Quicksand', sans-serif;
    }

    .sky-btn.active {
      border-color: #ffb300;
      background: rgba(255, 179, 0, 0.28);
      font-weight: 700;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 28;
      display: none;
    }

    .overlay.active { display: block; }
  </style>
</head>

<body>
  <!-- 🏮 PANTALLA DE BIENVENIDA -->
  <div class="welcome-screen" id="welcomeScreen">
    <div class="welcome-card">
      <div class="lantern-icon">🏮</div>
      <div class="welcome-title">Para ${nombre}</div>
      <p class="welcome-sub">
        <b>${autor}</b> ha encendido el Lago de los Deseos para ti. Enciende las luces, pide un deseo y mira cómo se iluminan el agua y el cielo.
      </p>
      <button class="gold-btn" id="startBtn">🏮 Encender los Faroles 🏮</button>
    </div>
  </div>

  <canvas class="webgl"></canvas>

  <div class="top-banner">${titulo}</div>
  <div class="toast" id="toastMsg">🏮 ¡Tu deseo se está elevando al cielo!</div>
  <div class="credits">Con todo mi cariño: ${autor}</div>

  <!-- 🎛️ CONTROLES INFERIORES -->
  <div class="bottom-controls">
    <button class="action-btn" id="wishBtn">🏮 Pedir Deseo</button>
    <button class="action-btn" id="fireworkBtn">🎆 Fuegos</button>
    <button class="action-btn" id="letterBtn">💌 Carta</button>
    <button class="action-btn active" id="musicBtn">🎵 Música</button>
  </div>

  <!-- 💌 MODAL DE CARTA CON MÁQUINA DE ESCRIBIR -->
  <div class="modal-backdrop" id="letterModal">
    <div class="modal-box">
      <h2>Querida/o ${nombre} 🏮</h2>
      <p id="typewriterText"></p>
      <div class="letter-sign">— ${autor} ✨</div>
      <button class="gold-btn" id="closeLetterBtn" style="padding: 10px 26px; font-size: 14px;">Guardar en el corazón 💛</button>
    </div>
  </div>

  <!-- 🏮 MODAL PARA LANZAR UN DESEO PERSONALIZADO -->
  <div class="modal-backdrop" id="wishModal">
    <div class="modal-box">
      <h2>Pide un Deseo 🏮</h2>
      <p style="min-height: auto; font-size: 14px;">Escribe una palabra o deseo corto y suéltalo en un farol gigante hacia el cielo:</p>
      <input type="text" id="wishInput" class="wish-input" maxlength="28" placeholder="Ej: Siempre juntos ✨" />
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button class="gold-btn" id="launchWishBtn" style="padding: 10px 22px; font-size: 14px;">Soltar Farol 🏮</button>
        <button class="action-btn" id="closeWishBtn" style="padding: 10px 18px;">Cancelar</button>
      </div>
    </div>
  </div>

  <!-- ⚙️ MENÚ DE CONFIGURACIÓN -->
  <div class="menu-button" id="menuButton">
    <span></span>
    <span></span>
    <span></span>
  </div>

  <div class="overlay" id="overlay"></div>

  <div class="config-panel" id="configPanel">
    <div class="config-header">
      <div class="config-title">Ambiente del Lago</div>
      <button class="close-button" id="closeButton">✕</button>
    </div>

    <div class="config-section">
      <h3>🌅 Hora y Cielo</h3>
      <div class="sky-options">
        <button class="sky-btn active" data-sky="night">🌙 Noche Mágica</button>
        <button class="sky-btn" data-sky="sunset">🌇 Atardecer</button>
        <button class="sky-btn" data-sky="aurora">🌌 Aurora</button>
        <button class="sky-btn" data-sky="sakura">🌸 Amanecer</button>
      </div>
    </div>

    <div class="config-section">
      <h3>🌊 Agua y Faroles</h3>
      <div class="config-option">
        <label for="waveHeight">Olas del Lago</label>
        <input type="range" id="waveHeight" min="0.05" max="0.45" step="0.05" value="0.18">
      </div>
      <div class="config-option">
        <label for="riseSpeed">Velocidad de Ascenso</label>
        <input type="range" id="riseSpeed" min="0.2" max="2.0" step="0.1" value="0.7">
      </div>
      <div class="config-option">
        <label for="cameraRotate">Giro de Cámara</label>
        <input type="range" id="cameraRotate" min="0" max="1.2" step="0.05" value="0.25">
      </div>
    </div>
  </div>

  <audio id="bg-music" loop preload="auto">
    <source src="https://raw.githubusercontent.com/Conejitobrr/sbot/main/media/Golden.mp3" type="audio/mpeg">
  </audio>

  <script type="module">
    import * as THREE from "three";
    import { OrbitControls } from "three/addons/controls/OrbitControls.js";

    const RECIPIENT = "${nombre}";
    const FULL_QUOTE = "${frase}";

    // 🎹 Sintetizador Web Audio para campanillas mágicas y fuegos artificiales
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let soundCtx = null;

    function playChime(freq = 528) {
      try {
        if (!soundCtx) soundCtx = new AudioCtx();
        const osc = soundCtx.createOscillator();
        const gain = soundCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, soundCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, soundCtx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.12, soundCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, soundCtx.currentTime + 1.4);
        osc.connect(gain);
        gain.connect(soundCtx.destination);
        osc.start();
        osc.stop(soundCtx.currentTime + 1.4);
      } catch {}
    }

    const canvas = document.querySelector('canvas.webgl');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b19, 0.018);

    const sizes = { width: window.innerWidth, height: window.innerHeight };
    const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 250);
    camera.position.set(0, 3.8, 13.5);
    scene.add(camera);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * 0.485; // No atravesar el agua hacia abajo
    controls.minDistance = 4;
    controls.maxDistance = 26;
    controls.target.set(0, 2.2, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x070b19, 1);

    // 💡 ILUMINACIÓN CÁLIDA Y REFLEJOS EN EL AGUA
    const ambientLight = new THREE.AmbientLight(0x283566, 1.4);
    scene.add(ambientLight);

    const lanternCenterLight = new THREE.PointLight(0xff9100, 5, 35);
    lanternCenterLight.position.set(0, 3.5, 0);
    scene.add(lanternCenterLight);

    const moonLight = new THREE.DirectionalLight(0xffe0b2, 1.8);
    moonLight.position.set(0, 18, -45);
    scene.add(moonLight);

    // 🌕 LUNA GIGANTE EN EL HORIZONTE
    const moonGeo = new THREE.SphereGeometry(5.5, 32, 32);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xfff3d1 });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(0, 12, -55);
    scene.add(moonMesh);

    // Halo de la luna
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 256;
    haloCanvas.height = 256;
    const hCtx = haloCanvas.getContext('2d');
    const hGrad = hCtx.createRadialGradient(128, 128, 10, 128, 128, 128);
    hGrad.addColorStop(0, 'rgba(255, 225, 160, 0.9)');
    hGrad.addColorStop(0.4, 'rgba(255, 160, 60, 0.35)');
    hGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    hCtx.fillStyle = hGrad;
    hCtx.fillRect(0, 0, 256, 256);
    const haloTex = new THREE.CanvasTexture(haloCanvas);
    const moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTex,
      blending: THREE.AdditiveBlending,
      transparent: true
    }));
    moonHalo.scale.set(28, 28, 1);
    moonHalo.position.copy(moonMesh.position);
    scene.add(moonHalo);

    // 🌊 SUPERFICIE DEL LAGO 3D CON OLAS DINÁMICAS
    const waterGeo = new THREE.PlaneGeometry(140, 140, 95, 95);
    waterGeo.rotateX(-Math.PI * 0.5);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0c1938,
      roughness: 0.18,
      metalness: 0.85,
      flatShading: true
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = 0;
    scene.add(waterMesh);

    // Guardamos las coordenadas originales del agua para animar las olas
    const waterPos = waterGeo.attributes.position;
    const baseWaterCoords = [];
    for (let i = 0; i < waterPos.count; i++) {
      baseWaterCoords.push({
        x: waterPos.getX(i),
        z: waterPos.getZ(i)
      });
    }

    // ⛩️ SANTUARIO FLOTANTE CENTRAL Y LETRERO PRINCIPAL
    const createBannerSprite = (text, fontSize = 54, scaleX = 5.2, scaleY = 1.25) => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      c.width = 900;
      c.height = 220;

      ctx.font = \`Bold \${fontSize}px "Dancing Script", cursive\`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const grad = ctx.createLinearGradient(0, 0, c.width, 0);
      grad.addColorStop(0, '#ffcc80');
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, '#ffab40');

      ctx.fillStyle = grad;
      ctx.shadowColor = '#ff6d00';
      ctx.shadowBlur = 24;
      ctx.fillText(text, c.width / 2, c.height / 2);

      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(scaleX, scaleY, 1);
      return sprite;
    };

    const mainTitleSprite = createBannerSprite(\`🏮 \${RECIPIENT} 🏮\`, 76, 5.8, 1.4);
    mainTitleSprite.position.set(0, 3.8, 0);
    scene.add(mainTitleSprite);

    // Flor de Loto Real 3D bajo el nombre central sobre el agua
    const lotusGroup = new THREE.Group();
    const petalGeo = new THREE.ConeGeometry(0.45, 1.4, 5);
    petalGeo.rotateX(Math.PI * 0.38);
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xff80ab,
      emissive: 0x880e4f,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });
    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(petalGeo, petalMat);
      const a = (i / 12) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.9, 0.2, Math.sin(a) * 0.9);
      p.rotation.y = -a + Math.PI * 0.5;
      lotusGroup.add(p);
    }
    scene.add(lotusGroup);

    // 🏮 FÁBRICA DE FAROLES 3D (Geometría real de papel iluminado)
    const lanternPaperMat = new THREE.MeshBasicMaterial({ color: 0xffa726 });
    const lanternRimMat = new THREE.MeshBasicMaterial({ color: 0x3e2723 });
    const lanternBodyGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.68, 8);
    const lanternRimGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.06, 8);

    function createLanternMesh(scale = 1, customLabel = null) {
      const group = new THREE.Group();

      const body = new THREE.Mesh(lanternBodyGeo, lanternPaperMat);
      group.add(body);

      const topRim = new THREE.Mesh(lanternRimGeo, lanternRimMat);
      topRim.position.y = 0.34;
      group.add(topRim);

      const botRim = new THREE.Mesh(lanternRimGeo, lanternRimMat);
      botRim.position.y = -0.34;
      group.add(botRim);

      // Resplandor interno del farol
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: haloTex,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.85
      }));
      glow.scale.set(1.9, 1.9, 1);
      group.add(glow);

      if (customLabel) {
        const lbl = createBannerSprite(customLabel, 44, 2.8, 0.7);
        lbl.position.y = -0.72;
        group.add(lbl);
      }

      group.scale.set(scale, scale, scale);
      return group;
    }

    const wishesList = [
      "✨ Te quiero mucho ✨", "🏮 Mi deseo eres tú 🏮", "💛 Siempre juntos 💛",
      "🌙 Brillas como nadie 🌙", "💫 Gracias por existir 💫", "🌸 Mi lugar seguro 🌸",
      "🔥 Eres increíble 🔥", "🌊 Paz y felicidad 🌊", "👑 Mi persona favorita 👑",
      "💖 Amor infinito 💖", "🌟 Sueños cumplidos 🌟", "🥰 Eres magia pura 🥰"
    ];

    // 1. Faroles elevándose al cielo (85 faroles 3D)
    const skyLanterns = [];
    for (let i = 0; i < 85; i++) {
      const hasPhrase = i < 18;
      const phrase = hasPhrase ? wishesList[i % wishesList.length] : null;
      const scale = hasPhrase ? 1.05 : 0.45 + Math.random() * 0.55;
      const lantern = createLanternMesh(scale, phrase);

      const radius = 3.5 + Math.random() * 32;
      const angle = Math.random() * Math.PI * 2;
      lantern.position.set(
        Math.cos(angle) * radius,
        0.5 + Math.random() * 24,
        Math.sin(angle) * radius
      );

      lantern.userData = {
        speedY: 0.012 + Math.random() * 0.022,
        driftOffset: Math.random() * 100,
        rotSpeed: (Math.random() - 0.5) * 0.015
      };

      scene.add(lantern);
      skyLanterns.push(lantern);
    }

    // 2. Faroles flotando sobre el agua (24 faroles acuáticos)
    const waterLanterns = [];
    for (let i = 0; i < 24; i++) {
      const lantern = createLanternMesh(0.65);
      const radius = 2.8 + Math.random() * 18;
      const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.3;
      lantern.position.set(Math.cos(angle) * radius, 0.25, Math.sin(angle) * radius);
      lantern.userData = { phase: Math.random() * Math.PI * 2 };
      scene.add(lantern);
      waterLanterns.push(lantern);
    }

    // 🎆 SISTEMA DE FUEGOS ARTIFICIALES 3D
    const fireworks = [];
    function launchFirework() {
      playChime(320 + Math.random() * 280);
      const count = 140;
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocities = [];
      const colors = new Float32Array(count * 3);

      const originX = (Math.random() - 0.5) * 24;
      const originY = 9 + Math.random() * 8;
      const originZ = -6 - Math.random() * 18;

      const palette = [new THREE.Color('#ffeb3b'), new THREE.Color('#ff4081'), new THREE.Color('#00e5ff'), new THREE.Color('#ff9100')];
      const baseColor = palette[Math.floor(Math.random() * palette.length)];

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = originX;
        positions[i3 + 1] = originY;
        positions[i3 + 2] = originZ;

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 0.08 + Math.random() * 0.16;

        velocities.push({
          vx: speed * Math.sin(phi) * Math.cos(theta),
          vy: speed * Math.sin(phi) * Math.sin(theta),
          vz: speed * Math.cos(phi)
        });

        colors[i3] = baseColor.r;
        colors[i3 + 1] = baseColor.g;
        colors[i3 + 2] = baseColor.b;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.22,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const points = new THREE.Points(geo, mat);
      scene.add(points);
      fireworks.push({ points, velocities, age: 0 });
    }

    // 🏮 LANZAR UN FAROL PERSONALIZADO DEL USUARIO
    const toastMsg = document.getElementById('toastMsg');
    function showToast(txt) {
      toastMsg.textContent = txt;
      toastMsg.classList.add('show');
      setTimeout(() => toastMsg.classList.remove('show'), 3200);
    }

    function spawnUserWishLantern(wishText) {
      playChime(587.33);
      const specialLantern = createLanternMesh(1.45, \`✨ \${wishText} ✨\`);
      specialLantern.position.set(0, 0.6, 3.8);
      specialLantern.userData = {
        speedY: 0.018,
        driftOffset: Math.random() * 50,
        rotSpeed: 0.008
      };
      scene.add(specialLantern);
      skyLanterns.push(specialLantern);
      showToast(\`🏮 Deseo lanzado: "\${wishText}"\`);
    }

    // 🎛️ EVENTOS DE INTERFAZ Y AUDIO
    const audio = document.getElementById('bg-music');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const startBtn = document.getElementById('startBtn');
    const musicBtn = document.getElementById('musicBtn');
    const fireworkBtn = document.getElementById('fireworkBtn');

    audio.volume = 0.5;

    startBtn.addEventListener('click', () => {
      welcomeScreen.classList.add('hidden');
      audio.play().catch(() => {});
      playChime(440);
      setTimeout(() => launchFirework(), 700);
    });

    musicBtn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play().catch(() => {});
        musicBtn.classList.add('active');
        musicBtn.textContent = '🎵 Música';
      } else {
        audio.pause();
        musicBtn.classList.remove('active');
        musicBtn.textContent = '🔇 Silencio';
      }
    });

    fireworkBtn.addEventListener('click', () => {
      launchFirework();
      setTimeout(launchFirework, 300);
    });

    // 💌 CARTA CON EFECTO MÁQUINA DE ESCRIBIR
    const letterBtn = document.getElementById('letterBtn');
    const letterModal = document.getElementById('letterModal');
    const closeLetterBtn = document.getElementById('closeLetterBtn');
    const typewriterText = document.getElementById('typewriterText');
    let typingTimer = null;

    letterBtn.addEventListener('click', () => {
      letterModal.classList.add('open');
      typewriterText.textContent = '';
      clearInterval(typingTimer);
      let idx = 0;
      typingTimer = setInterval(() => {
        if (idx < FULL_QUOTE.length) {
          typewriterText.textContent += FULL_QUOTE.charAt(idx);
          idx++;
        } else {
          clearInterval(typingTimer);
        }
      }, 38);
    });

    closeLetterBtn.addEventListener('click', () => {
      letterModal.classList.remove('open');
      clearInterval(typingTimer);
    });

    // 🏮 MODAL DE DESEOS
    const wishBtn = document.getElementById('wishBtn');
    const wishModal = document.getElementById('wishModal');
    const closeWishBtn = document.getElementById('closeWishBtn');
    const launchWishBtn = document.getElementById('launchWishBtn');
    const wishInput = document.getElementById('wishInput');

    wishBtn.addEventListener('click', () => {
      wishModal.classList.add('open');
      wishInput.focus();
    });

    closeWishBtn.addEventListener('click', () => wishModal.classList.remove('open'));

    launchWishBtn.addEventListener('click', () => {
      const val = wishInput.value.trim() || 'Que seas muy feliz';
      wishModal.classList.remove('open');
      wishInput.value = '';
      spawnUserWishLantern(val);
    });

    // ⚙️ PANEL LATERAL Y TEMAS DE CIELO
    const menuButton = document.getElementById('menuButton');
    const configPanel = document.getElementById('configPanel');
    const closeButton = document.getElementById('closeButton');
    const overlay = document.getElementById('overlay');

    menuButton.addEventListener('click', () => {
      configPanel.classList.add('open');
      overlay.classList.add('active');
    });

    [closeButton, overlay].forEach(el => {
      el.addEventListener('click', () => {
        configPanel.classList.remove('open');
        overlay.classList.remove('active');
      });
    });

    let waveHeightParam = 0.18;
    let riseSpeedMultiplier = 0.7;

    document.getElementById('waveHeight').addEventListener('input', e => {
      waveHeightParam = parseFloat(e.target.value);
    });

    document.getElementById('riseSpeed').addEventListener('input', e => {
      riseSpeedMultiplier = parseFloat(e.target.value);
    });

    document.getElementById('cameraRotate').addEventListener('input', e => {
      controls.autoRotateSpeed = parseFloat(e.target.value);
    });

    const skyThemes = {
      night: { bg: 0x070b19, water: 0x0c1938, ambient: 0x283566 },
      sunset: { bg: 0x240b15, water: 0x381224, ambient: 0x8c3b2b },
      aurora: { bg: 0x041b1d, water: 0x072a2d, ambient: 0x1de9b6 },
      sakura: { bg: 0x1f0d1d, water: 0x2e152b, ambient: 0xff80ab }
    };

    document.querySelectorAll('.sky-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sky-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const theme = skyThemes[btn.dataset.sky];
        if (theme) {
          renderer.setClearColor(theme.bg, 1);
          scene.fog.color.setHex(theme.bg);
          waterMat.color.setHex(theme.water);
          ambientLight.color.setHex(theme.ambient);
        }
      });
    });

    window.addEventListener('resize', () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
    });

    const clock = new THREE.Clock();

    const tick = () => {
      const t = clock.getElapsedTime();
      controls.update();

      // 1. Animar olas del agua en 3D
      for (let i = 0; i < waterPos.count; i++) {
        const bx = baseWaterCoords[i].x;
        const bz = baseWaterCoords[i].z;
        const wave = Math.sin(bx * 0.35 + t * 1.6) * Math.cos(bz * 0.35 + t * 1.3) * waveHeightParam;
        waterPos.setY(i, wave);
      }
      waterPos.needsUpdate = true;

      // 2. Animar loto central sobre las olas
      lotusGroup.position.y = Math.sin(t * 1.8) * 0.08;
      lotusGroup.rotation.y = t * 0.2;

      // 3. Animar faroles que suben al cielo
      skyLanterns.forEach(l => {
        l.position.y += l.userData.speedY * riseSpeedMultiplier;
        l.position.x += Math.sin(t * 0.8 + l.userData.driftOffset) * 0.004;
        l.rotation.y += l.userData.rotSpeed;

        if (l.position.y > 28) {
          l.position.y = 0.2;
        }
      });

      // 4. Animar faroles flotando sobre el lago
      waterLanterns.forEach(wl => {
        wl.position.y = 0.24 + Math.sin(t * 2.0 + wl.userData.phase) * (waveHeightParam * 0.6);
      });

      // 5. Actualizar fuegos artificiales activos
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];
        fw.age += 1;
        const posAttr = fw.points.geometry.attributes.position;

        for (let j = 0; j < fw.velocities.length; j++) {
          const v = fw.velocities[j];
          v.vy -= 0.0022; // Gravedad
          posAttr.setXYZ(
            j,
            posAttr.getX(j) + v.vx,
            posAttr.getY(j) + v.vy,
            posAttr.getZ(j) + v.vz
          );
        }
        posAttr.needsUpdate = true;
        fw.points.material.opacity = Math.max(0, 1 - fw.age / 75);

        if (fw.age >= 75) {
          scene.remove(fw.points);
          fw.points.geometry.dispose();
          fw.points.material.dispose();
          fireworks.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
      window.requestAnimationFrame(tick);
    };

    tick();
  </script>
</body>
</html>`;
}

module.exports = {
  name: 'faroles',
  aliases: ['deseo', 'festival', 'lago3d', 'linternas'],
  category: 'roleplay & social',
  desc: 'Crea un Festival de Faroles Flotantes sobre un Lago 3D interactivo con fuegos artificiales y deseos',

  execute: async ({ sock, msg, remoteJid, args, pushName, reply }) => {
    let filePath = null;

    try {
      const data = parseInput(args, pushName);

      if (!data) {
        return reply(
`🏮 *FESTIVAL DE FAROLES EN EL LAGO 3D* 🌊

Regala un escenario 3D sobre el agua con faroles luminosos, fuegos artificiales y lanzador de deseos.

📌 *Formas de uso:*
▪️ *.faroles [Nombre]*
▪️ *.faroles [Nombre] | [Tu Nombre]*
▪️ *.faroles [Nombre] | [Tu Nombre] | [Dedicatoria]*
▪️ *.faroles [Nombre] | [Tu Nombre] | [Dedicatoria] | [Título]*

💡 *Ejemplo:*
*.faroles Valeria | Sirius | Cada farol lleva un deseo por ti | 🏮 Nuestro Festival 🏮*`
        );
      }

      ensureTemp();

      await sock.sendMessage(remoteJid, { react: { text: '🏮', key: msg.key } });

      const fileName = `Festival_Para_${safeFileName(data.nombre)}.html`;
      filePath = path.join(TEMP_DIR, fileName);

      fs.writeFileSync(filePath, buildHtml(data), 'utf8');

      // Detectar mención o respuesta para etiquetar y desviar la cita
      const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = contextInfo?.mentionedJid?.[0];
      const quotedParticipant = contextInfo?.participant;
      const targetUser = mentioned || quotedParticipant || null;

      let targetQuote = msg;
      if (contextInfo && contextInfo.stanzaId && contextInfo.participant) {
        targetQuote = {
          key: {
            remoteJid: msg.key.remoteJid,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant
          },
          message: contextInfo.quotedMessage || {}
        };
      }

      const mentions = targetUser ? [targetUser] : [];
      const tagText = targetUser ? `\n🎯 *Dedicado a:* @${cleanNumber(targetUser)}` : '';

      await sock.sendMessage(remoteJid, {
        document: fs.readFileSync(filePath),
        mimetype: 'text/html',
        fileName,
        caption:
`🏮 *FESTIVAL DE LOS DESEOS 3D* 🌊

👑 *Para:* ${data.nombre}
✍️ *De:* ${data.autor}${tagText}
💌 *Mensaje:* _"${data.frase}"_

📲 _Descarga el archivo y ábrelo en tu navegador para ver el lago en 3D, lanzar tu propio farol de los deseos y activar los fuegos artificiales._`,
        mentions
      }, { quoted: targetQuote });

    } catch (err) {
      console.log('❌ Error en faroles.js:', err?.message || err);
      return reply('❌ Ocurrió un error al construir el Festival de Faroles 3D.');
    } finally {
      try {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {}
    }
  }
};
