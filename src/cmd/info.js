const exec = require('child_process').exec;

module.exports.loadModule = function loadModule(bot) {
    bot.handler.endpoint('^v(?:ersion)?$', [], (match, message) => {
        exec('git rev-list --count HEAD', (error, stdout) => {
            if (error) {
                bot.createMessage(message.channel.id, 'An error has occured').catch(Logger.error);
                return;
            }
            exec('git log -1 --pretty=%B', (error2, stdout2) => {
                let msg = `Commit number ${stdout}`;
                if (!error2) {
                    msg += `\n\`\`\`\n${stdout2}\`\`\``;
                }
                bot.createMessage(message.channel.id, msg).catch(Logger.error);
            });
        });
    });
};
