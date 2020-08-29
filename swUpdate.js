"use strict";

const args = process.argv.splice(2);
const version = args[0],
    refresh = args[1];

// overwrite sw.js version
const fs = require('fs');
const swPath = './src/serviceWorker/sw.ts';

fs.readFile(swPath, 'utf8', function (err, data) {
    if (err) {
        return console.log(err);
    }

    // console.log(data);

    const pattern = /const VERSION[^;]+;/;
    var match = pattern.exec(data);

    var oldline = match[0];
    var newline = `const VERSION = '${version}.${refresh}';`;
    if (newline !== oldline) {

        var result = data.replace(pattern, newline);

        fs.writeFile(swPath, result, 'utf8', function (err) {
            if (err) return console.log(err);
        });

        console.log('replaced: ' + oldline);
        console.log(`\x1b[36m%s\x1b[0m`, '          ' + newline);
    }
});