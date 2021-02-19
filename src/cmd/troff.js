const spawn = require('child_process').spawn;
const fs = require('fs');
const { ConsoleTransportOptions } = require('winston/lib/winston/transports');

/*
\\"".fp - R cmunrm
\\"".fp - I cmunti
\\"".fp - B cmunrb
\\"".fp - BI cmunbi
*/

const prelude = `
.fp - CMEX CMEX10
.fp - CMSY CMSY10
.fp - CMMI CMMI10
.fp - CB CB
.fspecial R CMEX CMSY
.fspecial I CMMI

.EQ
define <=> %{vcenter roman " \\\\N'arrowdblboth' "}%
define appr %{vcenter roman "≈"}%
define intd %{vcenter roman "\\\\N'integraldisplay'"}%
delim $$
.EN

.LP
.ps +20
\\m[white]
`;

module.exports.loadModule = function loadModule(bot) {
    bot.handler.endpoint(/^tr(?:off)?!?(?: |\n)([\s\S]*)$/m, [], (match, message) => {
        ma = match[1].replace(/^\.sy\s.*$/gm, '');
		ma = ma.replace(/^sh\s.*$/gm, '');
		ma = ma.replace(/^\.?co\s.*$/gm, '');
		ma = ma.replace(/^\\X.*$/gm, '');
		if (ma !== match[1]) console.log('had to sanitize');
        const subprocess0 = spawn('pic');
        console.log(ma);
        subprocess0.stdin.write(prelude + '\n' + ma + '\n');
        subprocess0.stdin.end();
        const subprocess1 = spawn('eqn');
        subprocess0.stdout.pipe(subprocess1.stdin);
        const subprocess2 = spawn('roff', ['-ms']);
        subprocess1.stdout.pipe(subprocess2.stdin);
        const subprocess3 = spawn('pdf', ['-p', '10000x10000']);
        subprocess2.stdout.pipe(subprocess3.stdin);
        const subprocess4 = spawn('convert', ['-', '-trim', 'png:-']);
        subprocess3.stdout.pipe(subprocess4.stdin);
        let ch = Buffer.from("");
        subprocess4.stdout.on('data', (data) => {
            ch = Buffer.concat([ch, data]);
        });
        subprocess4.stdout.on('end', () => {
            message.channel.createMessage('', {name: 'troff.png', file: ch});
        });
    });
};
