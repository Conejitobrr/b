'use strict';

const mongoose = require('mongoose');
const config = require('../config');
const chalk = require('chalk');

// 🔥 Memoria Local (Se usa cuando MONGO_URI está vacío)
const localMemory = { users: {}, groups: {} };

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  banned: { type: Boolean, default: false },
  bot: { type: Boolean, default: true },
  audios: { type: Boolean, default: true },
  premium: { type: Boolean, default: false },
  premiumUntil: { type: Number, default: 0 },
  jailUntil: { type: Number, default: 0 },
  fame: { type: Number, default: 0 },
  partner: { type: String, default: '' },
  inventory: {
    keys: { type: Number, default: 0 },
    spotifyUses: { type: Number, default: 0 }
  }
});

const groupSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  welcome: { type: Boolean, default: false },
  bot: { type: Boolean, default: true },
  audios: { type: Boolean, default: true },
  antilink: { type: Boolean, default: false },
  antispam: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);
const Group = mongoose.model('Group', groupSchema);

async function init() {
  if (!config.mongoUri) {
    console.log(chalk.bgYellow.black('\n ⚠️ AVISO DE BASE DE DATOS '));
    console.log(chalk.yellow(' ℹ️ No se detectó un enlace MONGO_URI en tu archivo .env'));
    console.log(chalk.yellow(' ℹ️ Usando Memoria Local: La XP y datos se guardarán temporalmente.'));
    console.log(chalk.yellow(' ℹ️ Al apagar Termux, la memoria se limpiará.\n'));
    return;
  }
  try {
    await mongoose.connect(config.mongoUri);
    console.log(chalk.bgGreen.black('\n 📁 MONGODB CONECTADO '));
    console.log(chalk.green(' ✅ Base de datos sincronizada en la nube.\n'));
  } catch (e) {
    console.log(chalk.bgRed.white('\n ❌ ERROR MONGODB '), chalk.red(e.message));
  }
}

async function getUser(id) {
  // Modo Local
  if (!config.mongoUri) {
    if (!localMemory.users[id]) {
      localMemory.users[id] = { id, xp: 0, level: 1, banned: false, fame: 0, partner: '', jailUntil: 0 };
    }
    return localMemory.users[id];
  }
  // Modo Nube
  let user = await User.findOne({ id });
  if (!user) user = await User.create({ id });
  return user;
}

async function getGroup(id) {
  // Modo Local
  if (!config.mongoUri) {
    if (!localMemory.groups[id]) {
      localMemory.groups[id] = { id, bot: true, welcome: false, audios: true, antilink: false, antispam: false };
    }
    return localMemory.groups[id];
  }
  // Modo Nube
  let group = await Group.findOne({ id });
  if (!group) group = await Group.create({ id });
  return group;
}

async function addXP(id, amount) {
  const user = await getUser(id);
  user.xp += Math.max(0, amount);
  user.level = Math.floor(user.xp / 10000) + 1; // 10,000 XP por nivel
  
  if (config.mongoUri) {
    await user.save();
  }
  return user;
}

async function isBanned(id) {
  const user = await getUser(id);
  return user.banned === true;
}

module.exports = { init, getUser, getGroup, addXP, isBanned, User, Group };
