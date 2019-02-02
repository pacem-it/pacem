/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const mathTests = [{

        name: 'Gaussian', test: function () {

            it('Tables vs computed', function () {

                const normal = Pacem.Gaussian.normal;
                const percentile = normal.probability(1);
                const percentile_neg = normal.probability(-1);

                expect(percentile_neg.toFixed(4)).toEqual((1 - percentile).toFixed(4));
                expect(percentile.toFixed(4)).toEqual("0.8413");

                // from WHO height percentiles 0-5yrs
                const h0 = new Pacem.Gaussian(49.8842, 49.8842 * 0.03795 /*= 1.8931 */);
                expect(h0.probability(49.884).toFixed(2)).toEqual("0.50");

                const percentile0 = h0.probability(53.445);
                expect(percentile0.toFixed(3)).toEqual("0.970");
            });

        }
    },
    {
        name: 'LCD', test: function () {

            it('Should work', function () {

                const lcd = Pacem.Maths.lcd(3, 4, 5, 6, 7, 13);
                expect(lcd).toEqual(13 * 7 * 12 * 5);
            });

        }
    }
    ];

}