      if (isSuccess) {
        const percentage = (Math.floor(Math.random() * 11) + 5) / 100;
        const stolenXP = Math.floor(targetXP * percentage);

        attackerData.xp = (attackerData.xp || 0) + stolenXP;
        targetData.xp -= stolenXP;

        if (attackerData.save) await attackerData.save();
        if (targetData.save) await targetData.save();

        // 🔥 REGISTRAR ROBO PARA EL PLUGIN POLICÍA
        const ROBOS_PATH = path.join(process.cwd(), 'lib', 'robos_recientes.json');
        let robosDB = {};
        try { robosDB = JSON.parse(fs.readFileSync(ROBOS_PATH, 'utf8')); } catch {}
        if (!robosDB[remoteJid]) robosDB[remoteJid] = [];
        robosDB[remoteJid].push({
          thief: attackerJid,
          victim: target,
          amount: stolenXP,
          time: Date.now(),
          caught: false
        });
        fs.writeFileSync(ROBOS_PATH, JSON.stringify(robosDB, null, 2));

        return sock.sendMessage(remoteJid, {
          text: `🥷 *ROBO EXITOSO*\n\n@${attackerNum} asaltó a @${targetNum} en un callejón oscuro.\n\n💰 Botín: *+${stolenXP} XP*`,
          mentions: [attackerJid, target]
        }, { quoted: msg });

      } else {
