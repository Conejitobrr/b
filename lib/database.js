'use strict';

const mongoose = require('mongoose');
const config = require('../config');
const chalk = require('chalk');

// Esquema de Usuario (Unifica exp, premium, shop y jail)
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
  inventory: {
    keys: { type: Number, default: 0 },
    spotifyUses: { type: Number, default: 0 }
  }
});

// Esquema de Grupo
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
    console.log(chalk.yellow('⚠️ MONGO_URI vacío en .env. El bot funcionará, pero los datos no se guardarán en la nube.'));
    return;
  }
  try {
    await mongoose.connect(config.mongoUri);
    console.log(chalk.green('📁 Base de datos MongoDB conectada exitosamente'));
  } catch (e) {
    console.log(chalk.red('❌ Error conectando a MongoDB:'), e.message);
  }
}

async function getUser(id) {
  if (!config.mongoUri) return { id, xp: 0, level: 1, inventory: {} }; // Fallback temporal
  let user = await User.findOne({ id });
  if (!user) user = await User.create({ id });
  return user;
}

async function getGroup(id) {
  if (!config.mongoUri) return { id, bot: true }; // Fallback temporal
  let group = await Group.findOne({ id });
  if (!group) group = await Group.create({ id });
  return group;
}

async function addXP(id, amount) {
  if (!config.mongoUri) return;
  const user = await getUser(id);
  user.xp += Math.max(0, amount);
  user.level = Math.floor(user.xp / 10000) + 1;
  await user.save();
  return user;
}

async function isBanned(id) {
  const user = await getUser(id);
  return user.banned === true;
}

module.exports = {
  init,
  getUser,
  getGroup,
  addXP,
  isBanned,
  User,
  Group
};
