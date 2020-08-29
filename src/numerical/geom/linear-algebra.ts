/// <reference path="../../../dist/js/pacem-foundation.d.ts" />
namespace Pacem.Geometry.LinearAlgebra {

    /** Represents a vector in the 2D space */
    export interface Vector extends Point { }

    /** 2D vector utils. */
    export class Vector {

        /**
         * Returns the unit (normalized) vector having the same direction and sense of the provided one.
         * @param v
         */
        static unit(v: Vector): Vector {
            const clone = { x: v.x, y: v.y };
            this.normalize(clone);
            return clone;
        }

        /**
         * Normalizes the provided vector in place.
         * @param v
         */
        static normalize(v: Vector): void {
            const l = Math.sqrt(v.x * v.x + v.y * v.y);
            if (l <= 0) {
                throw 'Cannot normalize a vector of length 0.';
            }
            const inv = 1 / l;
            v.x *= inv;
            v.y *= inv;
        }

        /**
         * Returns the vector joining two points.
         * @param p1 Start point
         * @param p2 End point
         */
        static from(p1: Point, p2: Point): Vector {
            return Point.subtract(p1, p2);
        }

        /**
         * Returns the dot product between two vectors/points.
         * @param v1
         * @param v2
         */
        static dot(v1: Point, v2: Point): number {
            return v1.x * v2.x + v1.y * v2.y;
        }

        /**
         * Returns the cross product between two vectors/points (magnitude along the z axis).
         * @param v1
         * @param v2
         */
        static cross(v1: Point, v2: Point): number {
            return v1.x * v2.y - v1.y * v2.x;
        }
    }

}