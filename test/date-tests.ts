/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const dateTests = [{

        name: 'Date Utils', test: function () {

            it('Date check', function () {

                const date = new Date(),
                    isDate = Utils.Dates.isDate(date),
                    isNotDate = Utils.Dates.isDate(new Date('foo'));
                expect(isDate).toBeTruthy();
                expect(isNotDate).toBeFalsy();

            });

        }
    }
    ];

}