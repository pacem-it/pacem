"use strict";

const pkg = require('./package.json');
const version = pkg.version;

// console.log(`\x1b[36m%s\x1b[0m`, 'pkgVersion: ' + version);

const fetch = require('node-fetch');
fetch('https://registry.npmjs.org/pacem')
    .then(r => r.json()).then(publicMetadata => {
        const spawn = require('child_process').spawn;
        var child = spawn('cmd', ['/c', 'echo invisible']);

        child.stderr.pipe(process.stdout);

        child.stdout.on('data', function (data) {
            console.log(data.toString());
        });

        child.on('error', function (data) {
            console.error('\x1b[31m%s\x1b[0m', 'error: ' + data.toString());
        });

        child.on('exit', function (code) {
            console.log('\x1b[36m%s\x1b[0m', '##vso[task.setvariable variable=pkgVersion]' + version);
        })
    });