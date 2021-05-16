/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const encodingTests = [{

        name: 'Back and forth', test: function () {

            it('UTF-8', function (done) {

                const blob = Utils.textToBlob('Così');
                Utils.blobToText(blob).then(o => {
                    expect(o).toEqual('Così');
                    done();
                });

            });

            it('ISO-8859-1', function (done) {

                const base64 = 'data:text/plain;base64,' + btoa('Così');
                const blob = Utils.dataURLToBlob(base64);
                const p1 = Utils.blobToText(blob, 'iso-8859-1');
                const p2 = Utils.blobToText(blob);
                Promise.all([p1, p2]).then(arr => {
                    const o1 = arr[0],
                        o2 = arr[1];
                    expect(o1).toEqual('Così');
                    expect(o2).not.toEqual(o1);
                    done();
                });

            });

            it('Blob vs Text via Base64', function (done) {

                const blob = Utils.textToBlob('Così', 'text/plain');
                Utils.blobToDataURL(blob).then(dataUrl => {

                    const blobBack = Utils.dataURLToBlob(dataUrl as string);
                    expect(blobBack.type).toEqual('text/plain');

                    Utils.blobToText(blobBack).then(textBack => {
                        expect(textBack).toEqual('Così');
                        done();
                    });

                });
            });

        }
    }
    ];

}