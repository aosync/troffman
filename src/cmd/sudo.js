const { inspect } = require('util');
const vm = require('vm');

module.exports.loadModule = function loadModule(bot) {
    bot.handler.endpoint('^guilds$', [], (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        bot.createMessage(message.channel.id, `\`${bot.guilds.size}\``).catch(Logger.error);
    });
    bot.handler.endpoint('^is-sudoer$', [], (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        bot.createMessage(message.channel.id, 'true').catch(Logger.error);
    });
    bot.handler.endpoint('^sudoers$', [], (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        bot.createMessage(message.channel.id, `\`\`\`\n[ ${bot.config.sudoers.join(',\n  ')} ]\n\`\`\``).catch(Logger.error);
    });
    bot.handler.endpoint('^addsudo (.+)$', [], (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        bot.config.sudoers.push(match[1]);
        bot.createMessage(message.channel.id, `${match[1]} temporarily added to the sudoers list`).catch(Logger.error);
    });
    bot.handler.endpoint('^resetsudo$', [], (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        bot.config.sudoers = Array.from(bot._ds);
        bot.createMessage(message.channel.id, `Sudoers list reset`).catch(Logger.error);
    });
    bot.handler.endpoint('^removesudo (.+)$', [], (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        let i = bot.config.sudoers.indexOf(match[1]);
        if (i >= 0) {
            bot.config.sudoers.splice(i, 1);
            bot.createMessage(message.channel.id, `${match[1]} removed from sudoers list`).catch(Logger.error);
        }
        else {
            bot.createMessage(message.channel.id, `${match[1]} was not sudoer`).catch(Logger.error);
        }
    });
    bot.handler.endpoint('^e ?```(?:.*\n)?(.*)\n?```$', [], (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        try {
            let evaled = vm.runInNewContext(match[1], {
                ctx: {
                    bot: bot,
                    message: message,
                    match: match,
                },
                require: require,
            });

            if (typeof evaled !== 'string') {
                evaled = inspect(evaled);
            }
            evaled = evaled.replace(bot.config.token, 'ツ');
            bot.createMessage(message.channel.id, `\`\`\`${evaled}\`\`\``).catch(Logger.error);
        }
        catch (e) {
            bot.createMessage(message.channel.id, `Error:\n\`\`\`\n${e}\`\`\``).catch(Logger.error);
        }
    });
    bot.handler.endpoint('^aguilds$', [], async (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        let aguilds = await bot.db.Aguild.findAll({ attributes: ['guildId'] });
        let buff = '```\nAuthorized guilds:\n\n';
        aguilds.forEach(g => {
            buff += `- ${g.guildId}\n`;
        });
        buff += '```';
        bot.createMessage(message.channel.id, buff).catch(Logger.error);
    });
    bot.handler.endpoint('^ausers$', [], async (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        let ausers = await bot.db.Auser.findAll({ attributes: ['userId'] });
        let buff = '```\nAuthorized users:\n\n';
        ausers.forEach(u => {
            buff += `- ${u.userId}\n`;
        });
        buff += '```';
        bot.createMessage(message.channel.id, buff).catch(Logger.error);
    });
    bot.handler.endpoint('^aguild ([0-9]+)$', [], async (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        if (!match[1]) return;
        try {
            await bot.db.Aguild.create({
                guildId: match[1],
            });
            bot.createMessage(message.channel.id, `Guild \`${match[1]}\` successfully authorized!`).catch(Logger.error);
        }
        catch (e) {
            bot.createMessage(message.channel.id, 'Guild was already authorized.').catch(Logger.error);
        }
    });
    bot.handler.endpoint('^auser ([0-9]+)$', [], async (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        if (!match[1]) return;
        try {
            await bot.db.Auser.create({
                userId: match[1],
            });
            bot.createMessage(message.channel.id, `User \`${match[1]}\` successfully authorized!`).catch(Logger.error);
        }
        catch (e) {
            bot.createMessage(message.channel.id, 'User was already authorized.').catch(Logger.error);
        }
    });
    bot.handler.endpoint('^rguild ([0-9]+)$', [], async (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        if (!match[1]) return;
        await bot.db.Aguild.destroy({
            where: {
                guildId: match[1],
            }
        });
        bot.createMessage(message.channel.id, `Guild \`${match[1]}\` successfully removed!`).catch(Logger.error);
    });
    bot.handler.endpoint('^ruser ([0-9]+)$', [], async (match, message) => {
        if (!bot.config.sudoers) return;
        if (bot.config.sudoers.indexOf(message.author.id) <= -1) return;
        if (!match[1]) return;
        await bot.db.Auser.destroy({
            where: {
                userId: match[1],
            }
        });
        bot.createMessage(message.channel.id, `User \`${match[1]}\` successfully removed!`).catch(Logger.error);
    });
};
