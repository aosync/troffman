const fs = require('fs');

module.exports = function CommandLoader(bot) {
    fs.readdirSync('./src/cmd/').forEach(file => {
        if (file.endsWith('.js')) {
            let plugin = require(`./cmd/${file}`);
            if (plugin.loadModule) {
                plugin.loadModule(bot);
            }
        }
    });
};
