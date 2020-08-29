/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const mathTests = [{

        name: 'Gaussian', test: function () {

            it('Tables vs computed', function () {

                const normal = Pacem.Mathematics.DataAnalysis.Gaussian.normal;
                const percentile = normal.probability(1);
                const percentile_neg = normal.probability(-1);

                expect(percentile_neg.toFixed(4)).toEqual((1 - percentile).toFixed(4));
                expect(percentile.toFixed(4)).toEqual("0.8413");

                // from WHO height percentiles 0-5yrs
                const h0 = Pacem.Mathematics.DataAnalysis.Utils.gaussian(49.8842, 49.8842 * 0.03795 /*= 1.8931 */);
                expect(h0.probability(49.884).toFixed(2)).toEqual("0.50");

                const percentile0 = h0.probability(53.445);
                expect(percentile0.toFixed(3)).toEqual("0.970");
            });

        }
    },
    {
        name: 'LCD', test: function () {

            it('Should work', function () {

                const lcd = Pacem.Mathematics.NumberTheory.Utils.lcd(3, 4, 5, 6, 7, 13);
                expect(lcd).toEqual(13 * 7 * 12 * 5);
            });

        }
    },
    {
        name: 'Complex numbers', test: function () {

            it('Add and subtract', function () {

                const c1 = Pacem.Mathematics.Complex.build(2, 4),
                    c2 = 5;

                const c = Pacem.Mathematics.Complex.add(c1, c2);
                expect(c.real).toEqual(7);
                expect(c.img).toEqual(4);
                //
                const c3 = Pacem.Mathematics.Complex.build(2, 4),
                    c4 = 5;

                const d = Pacem.Mathematics.Complex.subtract(c4, c3);
                expect(d.real).toEqual(3);
                expect(d.img).toEqual(-4);
            });

            it('Multiply', function () {

                const c1 = Pacem.Mathematics.Complex.build(1, 0),
                    c2 = Pacem.Mathematics.Complex.build(0, 1);

                const c = Pacem.Mathematics.Complex.multiply(c1, c2);
                expect(c.real).toEqual(0);
                expect(c.img).toEqual(1);
            });

        }
    },
    {
        name: 'Fourier', test: function () {

            it('Discrete F. Transform', function () {

                const signal = [0, .99, 0.6, .99, 0, -.99, -.6, -.99];
                const output = Pacem.Mathematics.DataAnalysis.Fourier.transform(signal, false);
                expect(output.length).toEqual(8);

                expect(output[0].real).toBeCloseTo(0);
                expect(output[1].real).toBeCloseTo(0);
                expect(output[2].real).toBeCloseTo(0);
                expect(output[3].real).toBeCloseTo(0);
                expect(output[4].real).toBeCloseTo(0);
                expect(output[5].real).toBeCloseTo(0);
                expect(output[6].real).toBeCloseTo(0);
                expect(output[7].real).toBeCloseTo(0);

                expect(output[0].img).toBeCloseTo(0);
                expect(output[1].img).toBeCloseTo(4);
                expect(output[2].img).toBeCloseTo(0);
                expect(output[3].img).toBeCloseTo(1.6);
                expect(output[4].img).toBeCloseTo(0);
                expect(output[5].img).toBeCloseTo(-1.6);
                expect(output[6].img).toBeCloseTo(0);
                expect(output[7].img).toBeCloseTo(-4);

                const normalized = Pacem.Mathematics.DataAnalysis.Fourier.transform(signal, true);

                expect(normalized[0].real).toBeCloseTo(0);
                expect(normalized[1].real).toBeCloseTo(0);
                expect(normalized[2].real).toBeCloseTo(0);
                expect(normalized[3].real).toBeCloseTo(0);
                expect(normalized[4].real).toBeCloseTo(0);
                expect(normalized[5].real).toBeCloseTo(0);
                expect(normalized[6].real).toBeCloseTo(0);
                expect(normalized[7].real).toBeCloseTo(0);

                expect(normalized[0].img).toBeCloseTo(0);
                expect(normalized[1].img).toBeCloseTo(1.41426);
                expect(normalized[2].img).toBeCloseTo(0);
                expect(normalized[3].img).toBeCloseTo(0.565736);
                expect(normalized[4].img).toBeCloseTo(0);
                expect(normalized[5].img).toBeCloseTo(-0.565736);
                expect(normalized[6].img).toBeCloseTo(0);
                expect(normalized[7].img).toBeCloseTo(-1.41426);

                const inverse0 = Pacem.Mathematics.DataAnalysis.Fourier.invert(output);

                const inverse = Pacem.Mathematics.DataAnalysis.Fourier.invert(normalized);

                expect(inverse0[1].real).toBeCloseTo(2.8);

                expect(inverse[0].real).toBeCloseTo(0);
                expect(inverse[1].real).toBeCloseTo(0.99);
                expect(inverse[2].real).toBeCloseTo(0.6);
                expect(inverse[3].real).toBeCloseTo(0.99);
                expect(inverse[4].real).toBeCloseTo(0);
                expect(inverse[5].real).toBeCloseTo(-0.99);
                expect(inverse[6].real).toBeCloseTo(-0.6);
                expect(inverse[7].real).toBeCloseTo(-0.99);

                expect(inverse[0].img).toBeCloseTo(0);
                expect(inverse[1].img).toBeCloseTo(0);
                expect(inverse[2].img).toBeCloseTo(0);
                expect(inverse[3].img).toBeCloseTo(0);
                expect(inverse[4].img).toBeCloseTo(0);
                expect(inverse[5].img).toBeCloseTo(0);
                expect(inverse[6].img).toBeCloseTo(0);
                expect(inverse[7].img).toBeCloseTo(0);

            });

        }
    }
    ];

}