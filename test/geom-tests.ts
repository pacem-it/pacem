/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const geomTests = [{

        name: 'Point Functionalities', test: function () {

            it('Distance between points', function () {

                var p1: Point = { x: 4, y: 0 };
                var p2: Point = { x: 0, y: 3 };
                const distance = Point.distance(p1, p2);

                expect(distance).toEqual(5);

            });

        }
    },

    {
        name: 'Math algorithms', test: function () {

            function _normalizer(a0: number, a1: number) {
                const magn = Math.log10(a1 - a0),
                    rounder = Math.pow(10, Math.floor(magn));
                return {
                    min: Math.floor(a0 / rounder) * rounder,
                    max: Math.ceil(a1 / rounder) * rounder
                };
            }

            it('Log based', function () {
                const a1 = 980,
                    a0 = 54;
                const tuple = _normalizer(a0, a1);

                expect(tuple.min).toEqual(0);
                expect(tuple.max).toEqual(1000);

                const b1 = 10,
                    b0 = -4;
                const tuple1 = _normalizer(b0, b1);

                expect(tuple1.min).toEqual(-10);
                expect(tuple1.max).toEqual(10);

                const c1 = 1.6,
                    c0 = -.1;
                const tuple2 = _normalizer(c0, c1);

                expect(tuple2.min).toEqual(-1);
                expect(tuple2.max).toEqual(2);

                const d1 = 450,
                    d0 = -250;
                const tuple3 = _normalizer(d0, d1);

                expect(tuple3.min).toEqual(-300);
                expect(tuple3.max).toEqual(500);
            });

        }
    }
        ,
    {
        name: 'Numeric thresholds', test: function () {

            it('isCloseTo extension method', function () {

                const v1 = .3,
                    v2 = .1 + .2,
                    close = v2.isCloseTo(v1);
                expect(close).toBeTruthy(`${v2} is not close to ${v1}.`);
            });

        }
    }
    ];

}