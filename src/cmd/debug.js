module.exports.loadModule = function loadModule(bot) {
    bot.handler.endpoint('^ping$', [], (match, message) => {
        bot.createMessage(message.channel.id, 'Pong').catch(Logger.error);
    });
};
