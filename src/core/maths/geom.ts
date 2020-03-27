namespace Pacem {

    export declare type Point = { x: number, y: number };
    export declare type Size = { width: number, height: number };
    export declare type Rect = { x: number, y: number, width: number, height: number };

    const RAD2DEG = 180.0 / Math.PI
    const RAD_ROUND = 2 * Math.PI
    // 1.7763568394002505e-15 -20.4551920341394 40 40
    const FLOAT_PATTERN = /[-+]?[\d]+(\.[\d]+(e-[\d]+)?)?/g;

    export class Geom {

        static parseRect(rect: string): Rect {
            let reg = rect.match(FLOAT_PATTERN);
            if (reg && reg.length === 4) {
                return { x: parseFloat(reg[0]), y: parseFloat(reg[1]), width: parseFloat(reg[2]), height: parseFloat(reg[3]) };
            }
            throw new Error(`Cannot parse "${rect}" as a valid Rect.`);
        }

        static parsePoint(pt: string): Point {
            let reg = pt.match(FLOAT_PATTERN);
            if (reg && reg.length === 2) {
                return { x: parseFloat(reg[0]), y: parseFloat(reg[1]) };
            }
            throw new Error(`Cannot parse "${pt}" as a valid Point.`);
        }

        /**
         * Computes the distance between two points.
         * @param p1 Point 1
         * @param p2 Point 2
         */
        static distance(p1: Point, p2: Point):number {
            return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        }

        /**
         * Subtracts a point p from another and returns the resulting vector.
         * @param p Point to subtract
         * @param from Point to be subtracted from
         */
        static subtract(p: Point, from: Point): Point {
            return { x: from.x - p.x, y: from.y - p.y };
        }

        /**
         * Adds a set of points together and returns the resulting vector.
         * @param points Points to add
         */
        static add(...points: Point[]): Point {
            var point: Point = { x: 0, y: 0 };
            for (var p of points) {
                point.x += p.x;
                point.y += p.y;
            }
            return point;
        }

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
            return (RAD_ROUND + Geom.slopeRad(p1, p2)) % RAD_ROUND;
        }

        /**
         * Computes the slope (in degrees) of the segment joining two points.
         * @param p1 Point 1
         * @param p2 Point 2
         */
        static slopeDeg(p1: Point, p2: Point) :number{
            return Geom.slopeRad(p1, p2) * RAD2DEG;
        }

        /**
         * Computes the slope (in degrees) of the segment joining two points and returns a strictly positive value (0 to 360).
         * @param p1 Point 1
         * @param p2 Point 2
         */
        static slopeDeg2(p1: Point, p2: Point): number {
            return (360 + Geom.slopeDeg(p1, p2)) % 360;
        }
        
    }
}