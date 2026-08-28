'use strict';

require('dotenv').config();

const chalk = require('chalk');
const figlet = require('figlet');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const config = require('./config');

function showBanner() {
  console.clear();
  const botName = config.botName;
  const lines = figlet.textSync(botName, { font: 'Big' }).split('\n');
  lines.forEach(line => console.log(chalk.cyan.bold(line)));

  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log(chalk.white('  🤖 Bot     : ') + chalk.green(botName));
  console.log(chalk.white('  📦 Versión : ') + chalk.yellow(config.botVersion));
  console.log(chalk.white('  ⚙️ Prefijo : ') + chalk.yellow(config.prefix));
  console.log(chalk.gray('  ─────────────────────────────────────────\n'));
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function hasSavedSession() {
  const sessionDir = path.resolve(process.cwd(), config.sessionPath);
  const credsFile = path.join(sessionDir, 'creds.json');
  return fs.existsSync(credsFile);
}

async function askConnectionMethod() {
  if (hasSavedSession()) {
    console.log(chalk.green('✅ Sesión encontrada. Conectando automáticamente...\n'));
    return { method: 'saved', phone: null };
  }

  console.log(chalk.cyan('¿Cómo deseas conectar WhatsApp?\n'));
  console.log(chalk.white('[1] Código QR'));
  console.log(chalk.white('[2] Código de 8 dígitos (Recomendado para Termux/VPS)\n'));

  let choice = '';
  while (!['1', '2'].includes(choice)) {
    choice = (await ask(chalk.yellow('→ Opción (1 o 2): '))).trim();
  }

  if (choice === '1') {
    return { method: 'qr', phone: null };
  }

  const defaultPhone = process.env.DEFAULT_PHONE || '';
  if (defaultPhone) {
    console.log(chalk.gray('\nNúmero por defecto detectado: ' + defaultPhone));
  }

  let phone = await ask(chalk.yellow('→ Ingresa el número con código de país (o presiona ENTER para usar el por defecto): '));
  phone = phone.trim() ? phone.replace(/\D/g, '') : defaultPhone;

  if (!phone) {
    console.log(chalk.red('\n❌ No ingresaste ningún número. Saliendo...'));
    process.exit(1);
  }

  return { method: 'code', phone };
}

async function main() {
  showBanner();
  
  try {
    const { method, phone } = await askConnectionMethod();
    rl.close();
    
    console.log(chalk.cyan('\n🚀 Iniciando conexión con WhatsApp...'));
    
    const { startBot } = require('./main');
    await startBot({ method, phone });
  } catch (error) {
    console.error(chalk.red('❌ Error fatal al iniciar:'), error);
    process.exit(1);
  }
}

// Prevenir que el bot se apague por errores no controlados
process.on('uncaughtException', err => {
  console.error(chalk.red('❌ Error no controlado (Uncaught Exception):'), err);
});

process.on('unhandledRejection', err => {
  console.error(chalk.red('❌ Promesa rechazada (Unhandled Rejection):'), err);
});

main();
