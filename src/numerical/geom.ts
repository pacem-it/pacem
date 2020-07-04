/// <reference path="../../dist/js/pacem-foundation.d.ts" />
namespace Pacem {

    const RAD2DEG = 180.0 / Math.PI
    const RAD_ROUND = 2 * Math.PI

    export declare type Segment = [Point, Point];

    function isPoint(p: any): p is Point {
        return 'x' in p && typeof p.x === 'number'
            && 'y' in p && typeof p.y === 'number';
    }

    export class Geom {

        /**
         * Computes the slope (in radians) of the segment joining two points.
         * @param p1 Point 1
         * @param p2 Point 2
         */
        static slopeRad(p1: Point, p2: Point): number {
            return Math.atan2(p2.y - p1.y, p2.x - p1.x);
        }

        /**
         * Computes the slope (in radians) of the segment joining two points and returns a strictly positive value (0 to 2*pi).
         * @param p1 Point 1
         * @param p2 Point 2
         */
        static slopeRad2(p1: Point, p2: Point): number {
            return (RAD_ROUND + this.slopeRad(p1, p2)) % RAD_ROUND;
        }

        /**
         * Computes the slope (in degrees) of the segment joining two points.
         * @param p1 Point 1
         * @param p2 Point 2
         */
        static slopeDeg(p1: Point, p2: Point): number {
            return this.slopeRad(p1, p2) * RAD2DEG;
        }

        /**
         * Computes the slope (in degrees) of the segment joining two points and returns a strictly positive value (0 to 360).
         * @param p1 Point 1
         * @param p2 Point 2
         */
        static slopeDeg2(p1: Point, p2: Point): number {
            return (360 + this.slopeDeg(p1, p2)) % 360;
        }

        /**
         * Computes the intersection rect among a set of provided rects.
         * @param rects Rects to intersect
         */
        static intersect(...rects: Rect[]): Rect;
        /**
         * Computes the intersection point between two segments, if any.
         * @param segment1
         * @param segment2
         */
        static intersect(segment1: Segment, segment2: Segment): Point;
        static intersect(arg1: Segment | Rect, arg2: Segment | Rect, ...args: Rect[]): Rect | Point {
            if (Array.isArray(arg1) && Array.isArray(arg2)) {
                return this._intersectSegments(arg1, arg2, true);
            } else {
                return this._intersectRects.apply(this, arguments);
            }
        }

        /**
         * Computes the intersection point between the lines whose two provided segments belong to, if any.
         * @param segment1 First segment
         * @param segment2 Second segment
         */
        static intersectLines(segment1: Segment, segment2: Segment): Point;
        /**
         * Computes the intersection point between the lines having the respective 'm' and 'q'.
         * @param m1 First line's 'm'
         * @param q1 First line's 'q'
         * @param m2 Second line's 'm'
         * @param q2 Second line's 'q'
         */
        static intersectLines(m1: number, q1: number, m2: number, q2: number): Point;
        /**
         * Computes the intersection point between the lines having the respective 'm' and 'q'.
         * @param mq1 'm' and 'q' pair for line 1
         * @param mq2 'm' and 'q' pair for line 2
         */
        static intersectLines(mq1: [number, number], mq2: [number, number]): Point;
        static intersectLines(segment1: Segment | number | [number, number], segment2: Segment | number | [number, number], m2?: number, q2?: number): Point {
            let s1: Segment, s2: Segment;

            // overload 2 => m+q in pairs, reset as overload 1
            if (Array.isArray(segment1) && Array.isArray(segment2)
                && segment1.length === 2 && segment2.length === 2
                && typeof segment1[0] === 'number' && typeof segment2[0] === 'number' && typeof segment1[1] === 'number' && typeof segment2[1] === 'number') {

                // var type switch, instructions' order matter!
                m2 = segment2[0];
                q2 = segment2[1];
                segment2 = segment1[1];
                segment1 = segment1[0];
            }

            // overload 1?
            if (typeof segment1 === 'number' && typeof segment2 === 'number') {
                const m1 = segment1, q1 = segment2;
                // dummy segments
                s1 = [
                    { x: 0, y: q1 },
                    { x: 1, y: m1 + q1 }
                ];
                s2 = [
                    { x: 0, y: q2 },
                    { x: 1, y: m2 + q2 }
                ];
            }
            // overload 0
            else {
                s1 = <Segment>segment1; s2 = <Segment>segment2;
            }
            return this._intersectSegments(s1, s2, false);
        }

        /**
         * Returns the eigenvalue for two given linear equations of the form ax + by + c = 0.
         * @param l1
         * @param l2
         */
        static cramer(l1: [number, number, number], l2: [number, number, number]): Point;
        /**
         * Returns the eigenvalue for two given linear equations of the form ax + by + c = 0.
         * @param l1
         * @param l2
         */
        static cramer(l1: { a: number, b: number, c: number }, l2: { a: number, b: number, c: number }): Point;
        static cramer(l1: { a: number, b: number, c: number } | [number, number, number], l2: { a: number, b: number, c: number } | [number, number, number]): Point {
            if (Array.isArray(l1)) {
                l1 = { a: l1[0], b: l1[1], c: l1[2] };
            }
            if (Array.isArray(l2)) {
                l2 = { a: l2[0], b: l2[1], c: l2[2] };
            }
            let xP = (l1.b * l2.c - l1.c * l2.b) / (l1.b * l2.a - l1.a * l2.b),
                yP = (l1.c * l2.a - l1.a * l2.c) / (l1.b * l2.a - l1.a * l2.b);

            return { x: -xP.roundoff(), y: -yP.roundoff() };
        }

        /**
         * Returns the slope (m) and the y-axis intersection (q) of the line joining two given points.
         * @param p1
         * @param p2
         */
        static mq(p1: Point, p2: Point): [number, number] {
            const m = (p2.y - p1.y) / (p2.x - p1.x);
            const q = p1.y - m * p1.x;
            return [m, q];
        }

        private static _intersectSegments(segment1: Segment, segment2: Segment, excludeProjection: boolean): Point {
            // do bounding boxes intersect?
            const A = segment1[0], B = segment1[1],
                C = segment2[0], D = segment2[1],
                xAB = Math.min(A.x, B.x),
                yAB = Math.min(A.y, B.y),
                XAB = Math.max(A.x, B.x),
                wAB = XAB - xAB,
                YAB = Math.max(A.y, B.y),
                hAB = YAB - yAB,
                xCD = Math.min(C.x, D.x),
                yCD = Math.min(C.y, D.y),
                XCD = Math.max(C.x, D.x),
                wCD = XCD - xCD,
                YCD = Math.max(C.y, D.y),
                hCD = YCD - yCD;

            if (wAB === 0 && wCD === 0) {
                // both vertical segments (null or infinite intersections) return null
                return null;
            }

            if (hAB === 0 && hCD === 0) {
                // both horizontal segments (null or infinite intersections) return null
                return null;
            }

            // dry
            const outOfXBounds = (p: Point) => {
                return p.x < xCD || p.x > XCD || p.x < xAB || p.x > XAB;
            }
            const outOfYBounds = (p: Point) => {
                return p.y < yCD || p.y > YCD || p.y < yAB || p.y > YAB;
            }

            var retval: Point = null;
            if (wAB === 0) {
                if (excludeProjection && (xCD > xAB || XCD < XAB)) {
                    return null;
                }
                const mqCD = this.mq(C, D);
                retval = this.cramer([1, 0, -xAB], [mqCD[0], -1, mqCD[1]]);
                if (excludeProjection && outOfYBounds(retval)) {
                    retval = null;
                }
            } else if (wCD === 0) {
                if (excludeProjection && (xAB > xCD || XAB < XCD)) {
                    return null;
                }
                const mqAB = this.mq(A, B);
                retval = this.cramer([mqAB[0], -1, mqAB[1]], [1, 0, -xCD]);
                if (excludeProjection && outOfYBounds(retval)) {
                    retval = null;
                }
            } else if (hAB === 0) {
                if (excludeProjection && (yCD > yAB || YCD < YAB)) {
                    return null;
                }
                const mqCD = this.mq(C, D);
                retval = this.cramer([0, 1, -yAB], [mqCD[0], -1, mqCD[1]]);
                if (excludeProjection && outOfXBounds(retval)) {
                    retval = null;
                }
            } else if (hCD === 0) {
                if (excludeProjection && (yAB > yCD || YAB < YCD)) {
                    return null;
                }
                const mqAB = this.mq(A, B);
                retval = this.cramer([mqAB[0], -1, mqAB[1]], [0, 1, -yCD]);
                if (excludeProjection && outOfXBounds(retval)) {
                    retval = null;
                }
            } else {

                let intersection: Rect;
                if (!excludeProjection ||
                    ((intersection = this._intersectRects({ x: xAB, y: yAB, width: wAB, height: hAB }, { x: xCD, y: yCD, width: wCD, height: hCD }))
                        && intersection.width > 0
                        && intersection.height > 0)) {

                    // cramer's rule
                    const mqAB = this.mq(A, B),
                        mqCD = this.mq(C, D);
                    const mAB = mqAB[0],
                        mCD = mqCD[0],
                        qAB = mqAB[1],
                        qCD = mqCD[1];

                    // parallel os superposed segments yield null
                    if (mAB !== mCD) {
                        retval = this.cramer([mAB, -1, qAB], [mCD, -1, qCD]);

                        let xR = retval.x, yR = retval.y;
                        if (excludeProjection
                            && (xR < intersection.x || xR > (intersection.x + intersection.width)
                                || yR < intersection.y || yR > (intersection.y + intersection.height))) {
                            retval = null;
                        }
                    }
                }
            }

            if (retval === null) {
                return null;
            }

            return { x: retval.x, y: retval.y };
        }

        private static _intersectRects(...args: Rect[]): Rect {
            return Rect.intersect.apply(this, args);
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

        /**
         * Returns the distance between two given points.
         * @param p1
         * @param p2
         */
        static distance(p1: Point, p2: Point): number;
        /**
         * Returns the distance between a point and a line.
         * @param p
         * @param mq Line identified by a two-number array (slope and y-intercept).
         */
        static distance(p: Point, mq: [number, number]): number;
        static distance(p1: Point, arg2: Point | [number, number]): number {
            if (isPoint(arg2)) {
                return Point.distance(p1, arg2);
            } else {
                const m = arg2[0], q = arg2[1]
                return Math.abs(m * p1.x - p1.y + q) / Math.sqrt(Math.pow(m, 2) + 1);
            }
        }

        static inLine(p: Point, segment: Segment): boolean {
            const v1 = Point.subtract(segment[0], p),
                v2 = Point.subtract(p, segment[1]);
            const prod = this.cross(v1, v2);
            return prod.isCloseTo(0);
        }

        static inSegment(p: Point, segment: Segment): boolean {
            const minx = Math.min(segment[0].x, segment[1].x),
                maxx = Math.max(segment[0].x, segment[1].x),
                miny = Math.min(segment[0].y, segment[1].y),
                maxy = Math.max(segment[0].y, segment[1].y);
            return p.x >= minx && p.x <= maxx && p.y >= miny && p.y <= maxy && this.inLine(p, segment);
        }

        static inTriangle(p: Point, triangle: [Point, Point, Point]): boolean {

            let last: number;
            for (let j = 0; j < 3; j++) {
                const p1 = triangle[j], p2 = triangle[(j + 1) % 3],
                    v1 /* vector */ = Point.subtract(p2, p), v2 = Point.subtract(p1, p),
                    current = this.cross(v1, v2);
                if (j > 0 && (current * last) <= 0) {

                    // in the current 'triangle' we face a different direction,
                    // then exit (:=not in polygon)
                    return false;
                }
                last = current;
            }
            return true;
        }

        /**
         * Checks whether a given point lies inside a polygon in the 2d plane.
         * @param p
         * @param vertices Ordered polygon vertices
         */
        static inPolygon(p: Point, vertices: Point[]): boolean {

            if (!(vertices?.length >= 3)) {
                throw `Not enough vertices`;
            }

            const length = vertices.length;

            if (length === 3) {
                return this.inTriangle(p, [vertices[0], vertices[1], vertices[2]]);
            }

            // true polygon (might be concave, hulled, ...)
            // 1. preliminary bbox check
            let minx = Number.POSITIVE_INFINITY, miny = Number.POSITIVE_INFINITY, maxx = 0, maxy = 0;
            for (let j = 0; j < length; j++) {
                const v = vertices[j];
                minx = Math.min(minx, v.x);
                miny = Math.min(miny, v.y);
                maxx = Math.max(maxx, v.x);
                maxy = Math.max(maxy, v.y);
            }
            if (p.x < minx || p.x > maxx || p.y < miny || p.y > maxy) {
                return false;
            }

            // 2. intersections
            const /* dummy point 'left' to the left-most point of the shape and haivng the same 'y' of the target point */ outerPoint: Point = { x: minx - 1, y: p.y },
                /* horizontal segment that binds the provided point with the outside one */ test: Segment = [outerPoint, p];
            let intersections = 0;
            for (let j = 0; j < length; j++) {

                const p1 = vertices[j], p2 = vertices[(j + 1) % length],
                    side: Segment = [p1, p2];

                // edge case
                if (p1.y === p.y) {

                    const p0 = vertices[(j - 1 + length) % length];

                    // not on the same side (above or below)? then counts as an intersection
                    if (p.x > p1.x && (p0.y - p.y) * (p2.y - p.y) < 0) {
                        intersections++;
                    }
                } else if (p2.y === p.y) {

                    // already handled at previous statement one loop ago, skip
                    continue;

                } else {

                    // straddle testing
                    if (this.intersect(side, test) != null) {
                        intersections++;
                    }
                }
            }

            return intersections % 2 === 1;
        }
    }
}