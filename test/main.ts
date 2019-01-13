﻿/// <reference path="markdown-tests.ts" />
/// <reference path="core-tests.ts" />
/// <reference path="math-tests.ts" />
/// <reference path="geom-tests.ts" />
/// <reference path="transformer-tests.ts" />

namespace Pacem.Tests {

    tests.forEach(test => {

        describe(test.name, test.test); 

    });

    tTests.forEach(test => {

        describe(test.name, test.test);

    });

    mathTests.forEach(test => {

        describe(test.name, test.test);

    });

    geomTests.forEach(test => {

        describe(test.name, test.test);

    });

    mdTests.forEach(test => {

        describe(test.name, test.test); 

    });

}