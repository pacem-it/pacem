"use strict";

var pkg = require('./package.json');
const spawn = require('child_process').spawn;

const next = /-[\w]+$/.test(pkg.version);
const tag = next ? ' --tag next' : '';
console.info(`\x1b[${ (next ? '33': '32') }m%s\x1b[0m`, `${next ? '--next' : '--stable'} version detected.`);

//var child = spawn('cmd', ['/c', 'npm run build-core'], { env: process.env });

var child = spawn('cmd', ['/c', 'npm run build-prod && npm publish' + tag + ' && cd src\\less && npm publish' + tag]);

child.stderr.pipe(process.stdout);

child.stdout.on('data', function (data) {
    console.log(data.toString());
});

child.on('error', function (data) {
    console.error('\x1b[31m%s\x1b[0m', 'error: ' + data.toString());
});

child.on('exit', function (code) {
    if (code === 0) {
        console.log(`\x1b[36m%s\x1b[0m`, 'process successfully completed.');
    } else {
        console.log(`\x1b[31m%s\x1b[0m`, 'process exited with code ' + code.toString() +'.');
    }
});
