/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const geomTests = [{

        name: 'Geom Functionalities', test: function () {

            it('Distance between points', function () {

                var p1: Point = { x: 4, y: 0 };
                var p2: Point = { x: 0, y: 3 };
                const distance = Geom.distance(p1, p2);

                expect(distance).toEqual(5);

            });
            it('Segment slope', function () {

                var p1: Point = { x: 4, y: 0 };
                var p2: Point = { x: 0, y: 4 };

                const precision = 14;

                const slope = Geom.slopeDeg(p1, p2);
                expect(slope).toEqual(135);

                const slope0a = Geom.slopeDeg2(p1, p2);
                expect(slope0a).toEqual(slope);

                const slope1 = Geom.slopeRad(p1, p2);
                expect(slope1).toBeCloseTo(Math.PI * 3 / 4, precision);

                const slope1a = Geom.slopeRad2(p1, p2);
                expect(slope1a).toBeCloseTo(slope1, precision);

                const slope2 = Geom.slopeDeg(p2, p1);
                expect(slope2).toEqual(-45);

                const slope2a = Geom.slopeDeg2(p2, p1);
                expect(slope2a).toEqual(315);

                const slope3 = Geom.slopeRad(p2, p1);
                expect(slope3).toBeCloseTo(-Math.PI / 4, precision);

                const slope3a = Geom.slopeRad2(p2, p1);
                expect(slope3a).toBeCloseTo(Math.PI * 7 / 4, precision);

            });
            it('Segment slope vertical', function () {

                var p1: Point = { x: 0, y: 0 };
                var p2: Point = { x: 0, y: 4 };

                const slope = Geom.slopeDeg(p1, p2);
                expect(slope).toEqual(90);

                const slope2 = Geom.slopeDeg(p2, p1);
                expect(slope2).toEqual(-90);

            });
            it('Segment slope horizontal', function () {

                var p1: Point = { x: 0, y: 0 };
                var p2: Point = { x: -4, y: 0 };

                const slope = Geom.slopeDeg(p1, p2);
                expect(slope).toEqual(180);

                const slope2 = Geom.slopeDeg(p2, p1);
                expect(slope2).toEqual(0);

            });

        }
    },

        {
            name: 'Math algorithms', test: function () {

                function _normalizer(a0:number, a1:number) {
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
    ];

}