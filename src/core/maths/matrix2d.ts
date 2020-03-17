/// <reference path="geom.ts" />
namespace Pacem {

    /** Represents the typical matrix for 2D graphics (css, svg, ...) */
    export interface Matrix2D { readonly a: number, readonly b: number, readonly c: number, readonly d: number, readonly e: number, readonly f: number };

    export class Matrix2D {

        static get identity(): Matrix2D {
            return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
        }

        static copy(m: Matrix2D): Matrix2D {
            return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f };
        }

        static scale(m: Matrix2D, s: number);
        static scale(m: Matrix2D, sx: number, sy: number);
        static scale(m: Matrix2D, sx: number, sy: number = sx): Matrix2D {
            return { a: m.a * sx, b: m.b, c: m.c, d: m.d * sy, e: m.e, f: m.f };
        }

        static translate(m: Matrix2D, t: Point): Matrix2D {
            return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e + t.x, f: m.f + t.y };
        }

        static multiply(m: Matrix2D, f: number): Matrix2D;
        static multiply(p: Point, m: Matrix2D): Point;
        static multiply(m1: Matrix2D, m2: Matrix2D): Matrix2D;
        static multiply(m1: Matrix2D | Point, m2: Matrix2D | number): Matrix2D | Point {
            if ("x" in m1 && "y" in m1) {
                if (typeof m2 === 'number') {
                    return { x: m1.x * m2, y: m1.y * m2 };
                } else {
                    return { x: m1.x * m2.a + m1.y * m2.c + m2.e, y: m1.x * m2.b + m1.y * m2.d + m2.f };
                }
            }

            if (typeof m2 === 'number') {
                return {
                    a: m1.a * m2, b: m1.b * m2, c: m1.c * m2, d: m1.d * m2, e: m1.e * m2, f: m1.f * m2
                };
            }
            return {
                a: m1.a * m2.a + m1.b * m2.c,
                b: m1.a * m2.b + m1.b * m2.d,
                c: m1.c * m2.a + m1.d * m2.c,
                d: m1.c * m2.b + m1.d * m2.d,
                e: m1.e * m2.a + m1.f * m2.c + m2.e,
                f: m1.e * m2.b + m1.f * m2.d + m2.f
            };
        }

        static det(m: Matrix2D): number {
            return m.a * m.d - m.c * m.b;
        }

        static invert(m: Matrix2D): Matrix2D {
            const det = this.det(m);
            if (det === 0) {
                // NaM(2D) ? 
                return null;
            }
            const invdet = 1 / det;

            /*
             * found this shortcut:  
             * 1. swap a, d
             * 2. swap c, b and change signs
             * 3. e := -e*d + f*c
             * 4. f := -e*b + f*a
             * 5. divide everything by [det]
            */
            return this.multiply({
                a: m.d,
                b: -m.c,
                c: -m.b,
                d: m.a,
                e: -m.e * m.d + m.c * m.f,
                f: -m.e * m.b + m.a * m.f
            }, invdet);
        }

    }

}