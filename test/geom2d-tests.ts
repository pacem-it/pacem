/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    // aliases
    const Geom = Pacem.Geometry.Utils,
        Vector  = Pacem.Geometry.LinearAlgebra.Vector;

    export const geom2dTests = [{

        name: 'Geom', test: function () {
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

            it('Segment intersection (the "easy" way)', function () {

                const A: Point = { x: 0, y: 0 },
                    B: Point = { x: 1, y: 1 },
                    C: Point = { x: 0, y: 1 },
                    D: Point = { x: 1, y: 0 };
                const P1 = Geom.intersect([A, B], [C, D]);
                expect(P1).toBeTruthy();
                expect(P1.x).toEqual(.5);
                expect(P1.y).toEqual(.5);
                const P2 = Geom.intersect([C, D], [A, B]);
                expect(P2.x).toEqual(P1.x);
                expect(P2.y).toEqual(P1.y);
            });

            it('Segment intersection (the "not-that-easy" way)', function () {

                const A: Point = { x: 0, y: 0 },
                    B: Point = { x: 0, y: 1 },
                    C: Point = { x: -1, y: .5 },
                    D: Point = { x: 1, y: .5 };
                const P1 = Geom.intersect([A, B], [C, D]);
                expect(P1).toBeTruthy();
                expect(P1.x).toBeCloseTo(0);
                expect(P1.y).toEqual(.5);
                const P2 = Geom.intersect([C, D], [A, B]);
                expect(P2.x).toBeCloseTo(0);
                expect(P2.y).toEqual(P1.y);
            });

            it('No segment intersection (the "not-that-easy" way)', function () {

                const A: Point = { x: 0, y: 0 },
                    B: Point = { x: 0, y: 1 },
                    C: Point = { x: -1, y: 1.25 },
                    D: Point = { x: 1, y: 1.25 };
                const P = Geom.intersect([A, B], [C, D]);
                expect(P).toBeNull();
            });

            it('No segment intersection (general)', function () {

                const A: Point = { x: 1, y: 1 },
                    B: Point = { x: 2, y: 1.5 },
                    C: Point = { x: 1.75, y: 1.25 },
                    D: Point = { x: 2, y: 1 };
                const P = Geom.intersect([A, B], [C, D]);
                expect(P).toBeNull();

                const A1: Point = { x: 0, y: -1.1 },
                    B1: Point = { x: 1.1, y: -1.1 },
                    C1: Point = { x: 1.9, y: -1.1 },
                    D1: Point = { x: 1, y: -1 };
                const P1 = Geom.intersect([A1, B1], [C1, D1]);
                expect(P1).toBeNull();
            });

            it('Should intersect (real case vertical)', function () {

                const A: Point = { x: 14.652592108025424, y: 12.859884836852206 };
                const B: Point = { x: 8.424185198236557, y: 12.821497120921304 };
                const C: Point = { x: 9.972283, y: 13.21 };
                const D: Point = { x: 9.972283, y: 11.47 };
                const P1 = Geom.intersect([A, B], [C, D]);
                expect(P1).toBeTruthy();
                expect(Math.abs(P1.x)).toEqual(9.972283);
                const P2 = Geom.intersect([C, D], [A, B]);
                expect(P2.x).toEqual(P1.x);
                expect(P2.y).toEqual(P1.y);
            });

            it('Should intersect lines', function () {

                const A: Point = { x: 14, y: 12.8 };
                const B: Point = { x: 13, y: 12.7 };
                const C: Point = { x: 9, y: 13 };
                const D: Point = { x: 9, y: 11 };
                const P1 = Geom.intersectLines([A, B], [C, D]);
                expect(P1).toBeTruthy();
                expect(Math.abs(P1.x)).toEqual(9);
                const P2 = Geom.intersectLines([C, D], [A, B]);
                expect(P2.x).toEqual(P1.x);
                expect(P2.y).toEqual(P1.y);
            });

            it('Should intersect (horizontal)', function () {

                const A: Point = { x: 8.702496138735597, y: 18.2341650671785 };
                const B: Point = { x: 8.433782127219281, y: 16.852207293666023 };
                const C: Point = { x: 7.784982, y: 17.659981 };
                const D: Point = { x: 9.325153, y: 17.659981 };
                const P1 = Geom.intersect([A, B], [C, D]);
                expect(P1).toBeTruthy();
                expect(Math.abs(P1.y)).toEqual(17.659981);
                const P2 = Geom.intersect([C, D], [A, B]);
                expect(P2.x).toEqual(P1.x);
                expect(P2.y).toEqual(P1.y);

                // line intersection should be a super case.
                const P3 = Geom.intersectLines([C, D], [A, B]);
                expect(P3.x).toEqual(P1.x);
                expect(P3.y).toEqual(P1.y);

                const mq1 = Geom.mq(A, B),
                    mq2 = Geom.mq(C, D);
                const P4 = Geom.intersectLines(mq1, mq2);
                expect(P4.x).toBeCloseTo(P3.x);
                expect(P4.y).toBeCloseTo(P3.y);
            });

            it('Segment intersection (general)', function () {

                const A: Point = { x: 1, y: 1 },
                    B: Point = { x: 2, y: 1.5 },
                    C: Point = { x: 1.75, y: 1.6667 },
                    D: Point = { x: 2, y: 1 };
                const P1 = Geom.intersect([A, B], [C, D]);
                expect(P1).toBeTruthy();
                const P2 = Geom.intersect([C, D], [A, B]);
                expect(P2.x).toEqual(P1.x);
                expect(P2.y).toEqual(P1.y);
            });

            it('Superposition should return null', function () {

                const A: Point = { x: 1, y: 1 },
                    B: Point = { x: 0, y: 0 },
                    C: Point = { x: 1.75, y: 1.75 },
                    D: Point = { x: -1, y: -1 };
                const P = Geom.intersect([A, B], [C, D]);
                expect(P).toBeNull();
            });

            it('Point in triangle', function () {
                const P1 = { x: 1.1, y: -1.1 },
                    A1 = { x: 1, y: -1 },
                    B1 = { x: 2, y: -1 },
                    C1 = { x: 2, y: -1000 };
                const inside = Geom.inTriangle(P1, [A1, B1, C1]);
                expect(inside).toBeTruthy();
                const insideOverload = Geom.inPolygon(P1, [A1, B1, C1]);
                expect(insideOverload).toEqual(inside);

                const C2 = { x: 2, y: P1.y };
                const outside = Geom.inTriangle(P1, [A1, B1, C2]);
                expect(outside).toBeFalsy();
            });

            it('Point in polygon', function () {
                const P1 = { x: 1.1, y: -1.1 },
                    A1 = { x: 1, y: -1 },
                    B1 = { x: 2, y: -1 },
                    C1 = { x: 2, y: -1000 },
                    D1 = { x: 1.1, y: -1000 };
                const inside = Geom.inPolygon(P1, [A1, B1, C1, D1]);
                expect(inside).toBeTruthy();

                const D2 = { x: 1.9, y: P1.y };
                const outside = Geom.inPolygon(P1, [A1, B1, C1, D2]);
                expect(outside).toBeFalsy();

                // real case that let emerge bug
                const P = { x: 3.158, y: 6.047 },
                    A = { x: 2.84, y: 6.282 },
                    B = { x: 3.014, y: 6.384 },
                    C = { x: 3.461, y: 6.268 },
                    D = { x: 3.092, y: 5.574 };
                const inside1 = Geom.inPolygon(P, [A, B, C, D]);
                expect(inside1).toBeTruthy();
            });

            it('Opposite sides of a line', function () {
                const P1 = { x: 1, y:0 },
                    A = { x: 1.1, y: 1.1 },
                    B = { x: 2, y: 2 },
                    P2 = { x: 3, y: 2.1 };

                const vs = Vector.from(A, B),
                    v1 = Vector.from(A, P1),
                    v2 = Vector.from(A, P2);

                const cp1 = Geom.cross(vs, v1),
                    cp2 = Geom.cross(vs, v2);
                const oppositeSides = cp1 * cp2 < 0;

                expect(oppositeSides).toBeFalsy();

                const dp1 = Geom.dot(vs, v1),
                    dp2 = Geom.dot(vs, v2);

                const sameDirection = dp1 * dp2 > 0;

                expect(sameDirection).toBeFalsy();

            });
        }
    }
    ];

}