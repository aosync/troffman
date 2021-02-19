const { PlayerManager } = require('eris-lavalink');
const { Op } = require('sequelize');

module.exports = function Events(bot) {
    let r;

    bot.on('ready', async () => {
        Logger.info(`Successfully connected as user ${bot.user.username}#${bot.user.discriminator}`);
        r = new RegExp(`^(?:<@!?${bot.user.id}> +|-)\\b`);

        bot.editStatus('online', {
            name: `watching LaTeX.`,
            type: 3,
        });
    });

    bot.on('error', (err, id) => {
        Logger.error(`Error encountered on shard ${id}`);
        Logger.error(err);
    });

    bot.on('messageCreate', async (msg) => {
        if (!r) {
            Logger.error('Some real shit hapened : message matching regex hasn\'t been defined for some reason.');
            process.exit();
        }

        let content = msg.content.replace(r, '');

        if (content === msg.content) return;
        if (msg.author.bot) return;
        if (msg.author === bot.user) return;
        if (msg.channel.type !== 0) return;

        /*
        let important = msg.channel.guild.members.filter(m => m.permission.has('administrator')).map(m => m.id);

        important.push(msg.author.id);

        let user = await bot.db.Auser.findOne({
            where: {
                userId: important,
            },
        });
        let guild = await bot.db.Aguild.findOne({ where: { guildId: msg.channel.guild.id } });

        if ((bot.config.sudoers && bot.config.sudoers.indexOf(msg.author.id) <= -1) && !user && !guild) return; */

        Logger.debug(`Command '${msg.content}' issued`);

        let trimmedContent = content.trim();
        let result = bot.handler.apply(trimmedContent, msg);
        if (Array.isArray(result)) {
            bot.createMessage(msg.channel.id, `Missing permissions : ${result.join(', ')}`).catch(Logger.error);
        }
    });
};
