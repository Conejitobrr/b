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
  return String(text || 'Jardin')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 35) || 'Jardin';
}

function parseInput(args = [], pushName = '', commandName = '') {
  const raw = args.join(' ').replace(/@\d+/g, '').trim();
  if (!raw) return null;

  const parts = raw.split('|').map(v => v.trim());
  const isYellowCmd = commandName.toLowerCase().includes('amarilla');

  return {
    nombre: safeText(parts[0] || 'Persona Especial'),
    autor: safeText(parts[1] || pushName || 'Alguien que te quiere'),
    frase: safeText(parts[2] || 'Para que nunca te falten flores que iluminen tus días 🌻✨'),
    apodo: safeText(parts[3] || (isYellowCmd ? '🌻 Tus Flores Amarillas 🌻' : '🌹 Mi Flor Favorita 🌹')),
    defaultTheme: isYellowCmd ? 'yellow' : 'gold'
  };
}

function buildHtml({ nombre, autor, frase, apodo }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Jardín Eterno para ${nombre} 🌻</title>

  <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@400;600;700&display=swap" rel="stylesheet">

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
      background: #030704;
      font-family: 'Quicksand', sans-serif;
    }

    .webgl {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      outline: none;
      z-index: 1;
    }

    /* 🌻 PANTALLA DE BIENVENIDA */
    .welcome-screen {
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at center, #1b2612 0%, #030603 100%);
      z-index: 100;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 25px;
      text-align: center;
      transition: opacity 1s ease, visibility 1s ease;
    }

    .welcome-screen.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .welcome-card {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 215, 0, 0.4);
      backdrop-filter: blur(15px);
      padding: 35px 28px;
      border-radius: 28px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 0 45px rgba(255, 200, 0, 0.22);
      animation: floatCard 4s ease-in-out infinite;
    }

    @keyframes floatCard {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .welcome-icon {
      font-size: 56px;
      margin-bottom: 12px;
      display: inline-block;
      animation: spinBloom 6s linear infinite;
    }

    @keyframes spinBloom {
      0%, 100% { transform: scale(1) rotate(-8deg); }
      50% { transform: scale(1.15) rotate(8deg); }
    }

    .welcome-title {
      font-family: 'Pacifico', cursive;
      color: #ffe600;
      font-size: 30px;
      margin-bottom: 8px;
      text-shadow: 0 0 14px rgba(255, 208, 0, 0.7);
    }

    .welcome-sub {
      color: rgba(255, 255, 255, 0.88);
      font-size: 15px;
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .start-btn {
      background: linear-gradient(135deg, #ffcc00, #ff6600);
      color: #1a1000;
      border: none;
      padding: 14px 30px;
      font-size: 16px;
      font-weight: 700;
      border-radius: 50px;
      cursor: pointer;
      box-shadow: 0 0 22px rgba(255, 204, 0, 0.6);
      transition: transform 0.2s;
      font-family: 'Quicksand', sans-serif;
    }

    .start-btn:active {
      transform: scale(0.95);
    }

    /* 🍃 PÉTALOS Y FLORES FLOTANTES */
    .floating-item {
      position: absolute;
      font-size: 20px;
      animation: floatPetal 16s infinite ease-in-out;
      z-index: 2;
      pointer-events: none;
      opacity: 0.28;
    }

    @keyframes floatPetal {
      0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.2; }
      50% { transform: translateY(-35px) rotate(20deg); opacity: 0.55; }
    }

    /* 💬 BARRA SUPERIOR Y CRÉDITOS */
    .top-banner {
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      background: rgba(15, 25, 12, 0.6);
      border: 1px solid rgba(255, 215, 0, 0.3);
      padding: 10px 20px;
      border-radius: 30px;
      backdrop-filter: blur(8px);
      z-index: 10;
      max-width: 82%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      pointer-events: none;
    }

    .credits {
      position: fixed;
      bottom: 85px;
      left: 50%;
      transform: translateX(-50%);
      color: #fff;
      font-family: 'Pacifico', cursive;
      font-size: 22px;
      text-align: center;
      text-shadow: 0 0 6px #fff, 0 0 14px #ffb700, 0 0 24px #ff8800;
      z-index: 10;
      pointer-events: none;
      width: 90%;
    }

    /* 🎛️ BOTONES INFERIORES */
    .bottom-controls {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      z-index: 20;
    }

    .action-btn {
      background: rgba(20, 28, 15, 0.75);
      border: 1px solid rgba(255, 215, 0, 0.35);
      color: white;
      padding: 10px 16px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.25s;
      font-family: 'Quicksand', sans-serif;
    }

    .action-btn:hover, .action-btn.active {
      background: rgba(255, 196, 0, 0.35);
      border-color: #ffd700;
      box-shadow: 0 0 15px rgba(255, 200, 0, 0.45);
    }

    /* 💌 MODAL DE DEDICATORIA */
    .letter-modal {
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

    .letter-modal.open {
      opacity: 1;
      visibility: visible;
    }

    .letter-box {
      background: linear-gradient(145deg, rgba(25, 35, 18, 0.96), rgba(10, 15, 8, 0.98));
      border: 1px solid rgba(255, 215, 0, 0.5);
      border-radius: 24px;
      padding: 30px 24px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      color: white;
      box-shadow: 0 0 35px rgba(255, 200, 0, 0.3);
    }

    .letter-box h2 {
      font-family: 'Pacifico', cursive;
      color: #ffd700;
      font-size: 28px;
      margin-bottom: 15px;
    }

    .letter-box p {
      font-size: 16px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.92);
      margin-bottom: 20px;
    }

    .letter-sign {
      font-family: 'Pacifico', cursive;
      font-size: 20px;
      color: #ff9900;
    }

    /* ⚙️ PANEL DE CONFIGURACIÓN */
    .menu-button {
      position: fixed;
      top: 15px;
      left: 15px;
      width: 42px;
      height: 42px;
      background: rgba(20, 28, 15, 0.65);
      border: 1px solid rgba(255, 215, 0, 0.3);
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
      background: #ffd700;
      margin: 2px 0;
      border-radius: 2px;
    }

    .config-panel {
      position: fixed;
      top: 0;
      left: -320px;
      width: 300px;
      height: 100%;
      background: rgba(10, 16, 8, 0.95);
      backdrop-filter: blur(12px);
      z-index: 30;
      padding: 20px;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      transition: left 0.3s ease;
      border-right: 1px solid rgba(255, 215, 0, 0.35);
    }

    .config-panel.open { left: 0; }

    .config-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    }

    .config-title {
      color: #ffd700;
      font-family: 'Pacifico', cursive;
      font-size: 24px;
    }

    .close-button {
      background: none;
      border: none;
      color: white;
      font-size: 22px;
      cursor: pointer;
    }

    .config-section {
      margin-bottom: 18px;
      padding: 14px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 15px;
    }

    .config-section h3 {
      color: #ffd700;
      margin-bottom: 12px;
      font-family: 'Pacifico', cursive;
      font-size: 19px;
    }

    .config-option { margin-bottom: 12px; }
    .config-option label {
      display: block;
      color: white;
      margin-bottom: 6px;
      font-size: 13px;
    }

    .config-option input[type="range"] {
      width: 100%;
      accent-color: #ffd700;
    }

    .color-options {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .color-option {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: transform 0.2s;
    }

    .color-option.active {
      border-color: white;
      transform: scale(1.18);
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
  <!-- 🌻 PANTALLA DE BIENVENIDA -->
  <div class="welcome-screen" id="welcomeScreen">
    <div class="welcome-card">
      <div class="welcome-icon">🌻</div>
      <div class="welcome-title">Para: ${nombre}</div>
      <p class="welcome-sub">
        <b>${autor}</b> te ha enviado un Jardín Mágico en 3D con flores que nunca se marchitan.
      </p>
      <button class="start-btn" id="startBtn">🌻 Recibir mis Flores 🌻</button>
    </div>
  </div>

  <canvas class="webgl"></canvas>

  <div class="top-banner">🌻 ${frase} 🌻</div>
  <div class="credits">De parte de: ${autor}</div>

  <!-- 🎛️ CONTROLES INFERIORES -->
  <div class="bottom-controls">
    <button class="action-btn" id="letterBtn">💌 Dedicatoria</button>
    <button class="action-btn" id="bloomBtn">✨ Destello</button>
    <button class="action-btn active" id="musicBtn">🎵 Música</button>
  </div>

  <!-- 💌 CARTA EMERGENTE -->
  <div class="letter-modal" id="letterModal">
    <div class="letter-box">
      <h2>Para ${nombre} 🌻</h2>
      <p>"${frase}"</p>
      <p style="font-size: 14px; opacity: 0.85;">${apodo}</p>
      <div class="letter-sign">— ${autor} 💛</div>
      <br>
      <button class="start-btn" id="closeLetterBtn" style="padding: 10px 24px; font-size: 14px;">Cerrar 🌻</button>
    </div>
  </div>

  <div class="menu-button" id="menuButton">
    <span></span>
    <span></span>
    <span></span>
  </div>

  <div class="overlay" id="overlay"></div>

  <div class="config-panel" id="configPanel">
    <div class="config-header">
      <div class="config-title">Jardín 3D 🌻</div>
      <button class="close-button" id="closeButton">✕</button>
    </div>

    <div class="config-section">
      <h3>Personalizar Flores</h3>
      <div class="config-option">
        <label for="petalsCount">Número de Pétalos</label>
        <input type="range" id="petalsCount" min="5" max="12" step="1" value="8">
      </div>
      <div class="config-option">
        <label for="centerFlowerSize">Tamaño Flor Central</label>
        <input type="range" id="centerFlowerSize" min="2.2" max="4.8" step="0.2" value="3.4">
      </div>
      <div class="config-option">
        <label for="rotateSpeed">Velocidad de Brisa</label>
        <input type="range" id="rotateSpeed" min="0" max="1.2" step="0.05" value="0.35">
      </div>
      <div class="config-option">
        <label>Especie de Flor</label>
        <div class="color-options">
          <div class="color-option active" title="Flores Amarillas" style="background: #ffcc00;" data-in="#ff6600" data-out="#ffee00"></div>
          <div class="color-option" title="Rosas Rojas" style="background: #ff0040;" data-in="#800020" data-out="#ff4d79"></div>
          <div class="color-option" title="Cerezo Sakura" style="background: #ff99cc;" data-in="#ff3385" data-out="#ffe6f2"></div>
          <div class="color-option" title="Orquídea Violeta" style="background: #9d4edd;" data-in="#5a189a" data-out="#e0aaff"></div>
          <div class="color-option" title="Flor de Loto Azul" style="background: #00d4ff;" data-in="#0055ff" data-out="#a8f5ff"></div>
        </div>
      </div>
    </div>
  </div>

  <audio id="bg-music" loop preload="auto">
    <source src="https://raw.githubusercontent.com/Conejitobrr/sbot/main/media/Golden.mp3" type="audio/mpeg">
  </audio>

  <script type="module">
    import * as THREE from "three";
    import { OrbitControls } from "three/addons/controls/OrbitControls.js";

    const CENTER_NAME = "🌻 ${nombre} 🌻";
    const SMALL_TEXT = "${apodo}";

    // Iconos flotantes suaves
    const symbols = ['🌻', '🌼', '🌷', '✨', '🦋', '💛', '🍃'];
    for (let i = 0; i < 22; i++) {
      const el = document.createElement('div');
      el.className = 'floating-item';
      el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
      el.style.left = \`\${Math.random() * 100}%\`;
      el.style.top = \`\${Math.random() * 100}%\`;
      el.style.fontSize = \`\${15 + Math.random() * 18}px\`;
      el.style.animationDelay = \`\${Math.random() * 12}s\`;
      document.body.appendChild(el);
    }

    const canvas = document.querySelector('canvas.webgl');
    const scene = new THREE.Scene();

    const gardenPhrases = [
      "🌻 Flores para ti 🌻", "💛 Te quiero 💛", "✨ Brillas hermoso ✨", "🌷 Eres especial 🌷",
      "🌼 Mi persona favorita 🌼", "🦋 Pura magia 🦋", "☀️ Mi alegría ☀️", "💫 Nunca cambies 💫",
      "🌹Siempre contigo 🌹", "👑 Reina del jardín 👑", "🍯 Dulzura 🍯", "🌟 Eres luz 🌟",
      "💐 Para alegrar tu día 💐", "🥰 Te adoro 🥰", "🍃 Paz y amor 🍃", "💝 Regalo eterno 💝"
    ];

    const parameters = {
      orbitFlowersCount: 12,
      particlesPerFlower: 1200,
      petals: 8,
      flowerSize: 0.95,
      centerFlowerSize: 3.4,
      centerFlowerParticles: 4500,
      insideColor: '#ff6600',
      outsideColor: '#ffee00',
      autoRotateSpeed: 0.35
    };

    let textSprites = [];
    let orbitFlowers = [];
    let orbitTexts = [];
    let centerFlower = null;
    let stemSystem = null;
    let fireflies = null;

    const createTextSprite = (text) => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      c.width = 380;
      c.height = 90;

      ctx.font = 'Bold 28px Quicksand, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const gradient = ctx.createLinearGradient(0, 0, c.width, 0);
      gradient.addColorStop(0, parameters.outsideColor);
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, parameters.insideColor);

      ctx.fillStyle = gradient;
      ctx.shadowColor = parameters.outsideColor;
      ctx.shadowBlur = 14;
      ctx.fillText(text, c.width / 2, c.height / 2);

      const texture = new THREE.CanvasTexture(c);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.92
      });

      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.7, 0.16, 1);
      return sprite;
    };

    const createCenterBanner = () => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      c.width = 768;
      c.height = 180;

      ctx.font = 'Bold 54px Pacifico, cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const gradient = ctx.createLinearGradient(0, 0, c.width, 0);
      gradient.addColorStop(0, '#ffee00');
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, '#ff8800');

      ctx.fillStyle = gradient;
      ctx.shadowColor = '#ffaa00';
      ctx.shadowBlur = 24;
      ctx.fillText(CENTER_NAME, c.width / 2, c.height / 2);

      const texture = new THREE.CanvasTexture(c);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(material);
      sprite.scale.set(2.5, 0.58, 1);
      return sprite;
    };

    const createSmallLabel = () => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      c.width = 380;
      c.height = 80;

      ctx.font = 'Bold 23px Pacifico, cursive';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = parameters.outsideColor;
      ctx.shadowBlur = 12;
      ctx.fillText(SMALL_TEXT, c.width / 2, c.height / 2);

      const texture = new THREE.CanvasTexture(c);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(material);
      sprite.scale.set(0.85, 0.18, 1);
      return sprite;
    };

    // 🌻 GEOMETRÍA MATEMÁTICA DE FLOR 3D (Curva Rhodonea + Pistilo Central)
    const createFlowerGeometry = (size = 1.0, particleCount = 1500, kPetals = 8) => {
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const colorCore = new THREE.Color(parameters.insideColor);
      const colorPetal = new THREE.Color(parameters.outsideColor);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const theta = Math.random() * Math.PI * 2;
        const isCenterCore = i < particleCount * 0.22;

        if (isCenterCore) {
          // Centro abultado de la flor (Semillas / Polen)
          const r = Math.random() * 0.22 * size;
          const phi = Math.random() * Math.PI * 2;
          positions[i3] = r * Math.cos(phi);
          positions[i3 + 1] = (Math.random() - 0.5) * 0.12 * size + 0.05;
          positions[i3 + 2] = r * Math.sin(phi);

          colors[i3] = colorCore.r;
          colors[i3 + 1] = colorCore.g * 0.65;
          colors[i3 + 2] = colorCore.b * 0.3;
        } else {
          // Pétalos curvados en 3D
          const petalShape = Math.abs(Math.cos((kPetals / 2) * theta));
          const fill = Math.pow(Math.random(), 0.45);
          const r = (0.18 + 0.65 * petalShape * fill) * size;

          const x = r * Math.cos(theta);
          const z = r * Math.sin(theta);
          // Curvatura natural de copa del pétalo
          const y = Math.sin(fill * Math.PI) * 0.18 * size - (r * 0.08);

          positions[i3] = x + (Math.random() - 0.5) * 0.04;
          positions[i3 + 1] = y + (Math.random() - 0.5) * 0.04;
          positions[i3 + 2] = z + (Math.random() - 0.5) * 0.04;

          const mixed = colorCore.clone().lerp(colorPetal, fill);
          colors[i3] = mixed.r;
          colors[i3 + 1] = mixed.g;
          colors[i3 + 2] = mixed.b;
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return geometry;
    };

    // 🌱 TALLO LUMINOSO VERDE CON HOJAS
    const createStemParticles = () => {
      const count = 900;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const green1 = new THREE.Color('#2dc653');
      const green2 = new THREE.Color('#b7efc5');

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const progress = Math.random();
        const y = -progress * 3.8;
        const curveX = Math.sin(progress * Math.PI) * 0.25;

        positions[i3] = curveX + (Math.random() - 0.5) * 0.12;
        positions[i3 + 1] = y;
        positions[i3 + 2] = (Math.random() - 0.5) * 0.12;

        const c = green1.clone().lerp(green2, Math.random());
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      return new THREE.Points(geo, mat);
    };

    // ✨ LUCIÉRNAGAS Y POLEN FLOTANTE
    const createFireflies = () => {
      const count = 4200;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      const gold = new THREE.Color('#ffe600');
      const warm = new THREE.Color('#ffffff');

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const radius = 5 + Math.random() * 85;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i3 + 2] = radius * Math.cos(phi);

        const c = gold.clone().lerp(warm, Math.random());
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.12,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      return new THREE.Points(geometry, material);
    };

    const generateGarden = () => {
      textSprites.forEach(s => scene.remove(s));
      textSprites = [];

      orbitTexts.forEach(t => scene.remove(t));
      orbitTexts = [];

      orbitFlowers.forEach(f => {
        f.geometry.dispose();
        f.material.dispose();
        scene.remove(f);
      });
      orbitFlowers = [];

      if (centerFlower) {
        centerFlower.geometry.dispose();
        centerFlower.material.dispose();
        scene.remove(centerFlower);
      }

      if (stemSystem) {
        stemSystem.geometry.dispose();
        stemSystem.material.dispose();
        scene.remove(stemSystem);
      }

      // Flores orbitales
      for (let i = 0; i < parameters.orbitFlowersCount; i++) {
        const geo = createFlowerGeometry(parameters.flowerSize, parameters.particlesPerFlower, parameters.petals);
        const mat = new THREE.PointsMaterial({
          size: 0.028,
          sizeAttenuation: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexColors: true,
          transparent: true,
          opacity: 0.95
        });

        const flower = new THREE.Points(geo, mat);
        const radius = 4.2;
        const angle = (i / parameters.orbitFlowersCount) * Math.PI * 2;

        flower.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 3) * 0.4,
          Math.sin(angle) * radius
        );
        flower.rotation.x = 0.45;

        scene.add(flower);
        orbitFlowers.push(flower);

        const label = createSmallLabel();
        label.position.set(flower.position.x, flower.position.y + 0.45, flower.position.z);
        scene.add(label);
        orbitTexts.push(label);
      }

      // Flor gigante central
      const centerGeo = createFlowerGeometry(parameters.centerFlowerSize, parameters.centerFlowerParticles, parameters.petals);
      const centerMat = new THREE.PointsMaterial({
        size: 0.036,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        opacity: 0.99
      });

      centerFlower = new THREE.Points(centerGeo, centerMat);
      centerFlower.rotation.x = 0.35;
      scene.add(centerFlower);

      stemSystem = createStemParticles();
      scene.add(stemSystem);

      const centerBanner = createCenterBanner();
      centerBanner.position.set(0, 1.15, 0);
      scene.add(centerBanner);
      textSprites.push(centerBanner);

      // Frases flotantes alrededor del jardín
      for (let i = 0; i < 110; i++) {
        const phrase = gardenPhrases[i % gardenPhrases.length];
        const radius = 2.0 + Math.random() * 4.8;
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.45) * 4.2;

        const sprite = createTextSprite(phrase);
        sprite.position.set(
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius
        );

        scene.add(sprite);
        textSprites.push(sprite);
      }
    };

    fireflies = createFireflies();
    scene.add(fireflies);
    generateGarden();

    const sizes = { width: window.innerWidth, height: window.innerHeight };
    const camera = new THREE.PerspectiveCamera(68, sizes.width / sizes.height, 0.1, 200);
    camera.position.set(7.5, 4.8, 7.5);
    scene.add(camera);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = parameters.autoRotateSpeed;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 20;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x030704, 1);

    window.addEventListener('resize', () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;
      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();
      renderer.setSize(sizes.width, sizes.height);
    });

    // 🎵 CONTROLES DE MÚSICA Y BIENVENIDA
    const audio = document.getElementById('bg-music');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const startBtn = document.getElementById('startBtn');
    const musicBtn = document.getElementById('musicBtn');
    const bloomBtn = document.getElementById('bloomBtn');

    audio.volume = 0.5;

    startBtn.addEventListener('click', () => {
      welcomeScreen.classList.add('hidden');
      audio.play().catch(() => {});
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

    // Botón de destello mágico
    let boostUntil = 0;
    bloomBtn.addEventListener('click', () => {
      boostUntil = performance.now() + 2200;
    });

    // 💌 MODAL DE CARTA
    const letterBtn = document.getElementById('letterBtn');
    const letterModal = document.getElementById('letterModal');
    const closeLetterBtn = document.getElementById('closeLetterBtn');

    letterBtn.addEventListener('click', () => letterModal.classList.add('open'));
    closeLetterBtn.addEventListener('click', () => letterModal.classList.remove('open'));

    // ⚙️ PANEL DE AJUSTES
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

    document.getElementById('petalsCount').addEventListener('input', (e) => {
      parameters.petals = parseInt(e.target.value) * 2;
      generateGarden();
    });

    document.getElementById('centerFlowerSize').addEventListener('input', (e) => {
      parameters.centerFlowerSize = parseFloat(e.target.value);
      generateGarden();
    });

    document.getElementById('rotateSpeed').addEventListener('input', (e) => {
      parameters.autoRotateSpeed = parseFloat(e.target.value);
      controls.autoRotateSpeed = parameters.autoRotateSpeed;
    });

    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        parameters.insideColor = option.dataset.in;
        parameters.outsideColor = option.dataset.out;
        generateGarden();
      });
    });

    const clock = new THREE.Clock();

    const tick = () => {
      const elapsedTime = clock.getElapsedTime();
      const isBoosted = performance.now() < boostUntil;

      controls.autoRotateSpeed = isBoosted ? 3.2 : parameters.autoRotateSpeed;
      controls.update();

      if (centerFlower) {
        const breathe = 1 + Math.sin(elapsedTime * 2.5) * 0.05 + (isBoosted ? 0.15 : 0);
        centerFlower.scale.set(breathe, breathe, breathe);
        centerFlower.rotation.z = elapsedTime * 0.25;
      }

      if (fireflies) {
        fireflies.rotation.y = elapsedTime * 0.05;
      }

      orbitFlowers.forEach((flower, idx) => {
        flower.rotation.z = -elapsedTime * 0.6 + idx;
        if (orbitTexts[idx]) {
          orbitTexts[idx].lookAt(camera.position);
        }
      });

      renderer.render(scene, camera);
      window.requestAnimationFrame(tick);
    };

    tick();
  </script>
</body>
</html>`;
}

module.exports = {
  name: 'flores',
  aliases: ['floresamarillas', 'ramo', 'jardin3d', 'rosa3d'],
  category: 'roleplay & social',
  desc: 'Regala un Jardín Mágico 3D interactivo de Flores Amarillas o Rosas en HTML',

  execute: async ({ sock, msg, remoteJid, args, pushName, commandName, reply }) => {
    let filePath = null;

    try {
      const data = parseInput(args, pushName, commandName);

      if (!data) {
        return reply(
`🌻 *JARDÍN MÁGICO DE FLORES 3D* 🌹

Regala un ramo eterno en 3D con luciérnagas, música y dedicatoria.

📌 *Formas de uso:*
▪️ *.flores [Nombre]*
▪️ *.flores [Nombre] | [Tu Nombre]*
▪️ *.flores [Nombre] | [Tu Nombre] | [Frase]*
▪️ *.floresamarillas [Nombre] | [Tu Nombre] | [Frase]*

💡 *Ejemplo:*
*.floresamarillas Camila | Sirius | Para que nunca te falten tus flores amarillas 🌻*`
        );
      }

      ensureTemp();

      await sock.sendMessage(remoteJid, { react: { text: '🌻', key: msg.key } });

      const fileName = `Flores_Para_${safeFileName(data.nombre)}.html`;
      filePath = path.join(TEMP_DIR, fileName);

      fs.writeFileSync(filePath, buildHtml(data), 'utf8');

      // Detectar si etiquetó o respondió a alguien para desviar la cita
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
      const tagText = targetUser ? `\n🎯 *Entregado a:* @${cleanNumber(targetUser)}` : '';

      await sock.sendMessage(remoteJid, {
        document: fs.readFileSync(filePath),
        mimetype: 'text/html',
        fileName,
        caption:
`🌻 *JARDÍN ETERNO EN 3D* ✨

🌷 *Para:* ${data.nombre}
✍️ *De:* ${data.autor}${tagText}
💌 *Dedicatoria:* _"${data.frase}"_

📲 _Descarga este archivo y ábrelo en tu navegador para ver tus flores en 3D con música._`,
        mentions
      }, { quoted: targetQuote });

    } catch (err) {
      console.log('❌ Error en flores.js:', err?.message || err);
      return reply('❌ Ocurrió un error al crear el jardín 3D.');
    } finally {
      try {
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {}
    }
  }
};
