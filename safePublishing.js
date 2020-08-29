"use strict";

const pkg = require('./package.json');
const version = pkg.version;
process.stdout.write('##vso[task.setvariable variable=pkgVersion]' + version +'\n');
process.stdout.write('##vso[task.setvariable variable=pkgRefresh]' + Date.now() +'\n');

const fetch = require('node-fetch');
fetch('https://registry.npmjs.org/pacem')
    .then(r => r.json()).then(publicMetadata => {

        const publicVersions = publicMetadata['versions'];

        if (!publicVersions[version]) {

            const spawn = require('child_process').spawn;

            const next = /-[\w]+$/.test(version);
            const tag = next ? ' --tag next' : '';
            console.info(`\x1b[${(next ? '33' : '32')}m%s\x1b[0m`, `${next ? '--next' : '--stable'} version detected.`);

            var child = spawn('cmd', ['/c', 'npm run build-prod && npm publish' + tag + ' && cd src\\less && npm publish' + tag]);

            child.stderr.pipe(process.stdout);

            child.stdout.on('data', function (data) {
                console.log(data.toString());
            });

            child.on('error', function (data) {
                console.error('\x1b[31m%s\x1b[0m', 'error: ' + data.toString());
            });

            child.on('close', function (code) {

                if (code === 0) {
                    console.log(`\x1b[36m%s\x1b[0m`, 'process successfully completed.');
                    // set ${pkgVersion}
                    process.stdout.write('##vso[task.setvariable variable=pkgCdnVersion]' + version);
                } else {
                    console.log(`\x1b[31m%s\x1b[0m`, 'process exited with code ' + code.toString() + '.');
                }
            });

        } else {
            console.info(`\x1b[33m%s\x1b[0m`, `version '${version}' already published.`);
        }
    });