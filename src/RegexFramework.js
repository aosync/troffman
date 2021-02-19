const CommandHandler = require('dbot-regex-handler');


module.exports = class RegexFramework extends CommandHandler {
    endpoint(r, perms, cb) {
        super.endpoint(r, cb);
        this.commands[this.commands.length - 1].p = perms;
    }

    apply(str, context) {
        for (let i = 0; i < this.commands.length; i++) {
            let match = str.match(this.commands[i].regex);
            if (match) {
                let missingPerms = [];
                this.commands[i].p.forEach(name => {
                    if (!context.member.permission.has(name)) {
                        missingPerms.push(name);
                    }
                });
                if (missingPerms.length === 0) {
                    this.commands[i].callback(match, context);
                    return true;
                }
                else {
                    return missingPerms;
                }
            }
        }
        return false;
    }
};
