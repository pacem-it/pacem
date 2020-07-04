namespace Pacem {

    export interface Point { x: number, y: number }
    export interface Size { width: number, height: number }
    export interface Rect extends Point, Size { } // { x: number, y: number, width: number, height: number };

    // 1.7763568394002505e-15 -20.4551920341394 40 40
    const FLOAT_PATTERN = /[-+]?[\d]+(\.[\d]+(e-[\d]+)?)?/g;

    export class Size {
        static parse(pt: string): Size {
            let reg = pt.match(FLOAT_PATTERN);
            if (reg && reg.length === 2) {
                return { width: parseFloat(reg[0]), height: parseFloat(reg[1]) };
            }
            throw new Error(`Cannot parse "${pt}" as a valid Size.`);
        }

        static isSize(obj: any): obj is Size {
            return typeof obj === 'object'
                && 'width' in obj && typeof obj['width'] === 'number'
                && 'height' in obj && typeof obj['height'] === 'number';
        }
    }

    export class Point {
        static parse(pt: string): Point {
            let reg = pt.match(FLOAT_PATTERN);
            if (reg && reg.length === 2) {
                return { x: parseFloat(reg[0]), y: parseFloat(reg[1]) };
            }
            throw new Error(`Cannot parse "${pt}" as a valid Point.`);
        }

        static isPoint(obj: any): obj is Point {
            return typeof obj === 'object'
                && 'width' in obj && typeof obj['width'] === 'number'
                && 'height' in obj && typeof obj['height'] === 'number';
        }

        /**
         * Computes the distance between two points.
         * @param p1 Point 1
         * @param p2 Point 2
         */
        static distance(p1: Point, p2: Point): number {
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

    }

    export class Rect {

        static parse(rect: string): Rect {
            let reg = rect.match(FLOAT_PATTERN);
            if (reg && reg.length === 4) {
                return { x: parseFloat(reg[0]), y: parseFloat(reg[1]), width: parseFloat(reg[2]), height: parseFloat(reg[3]) };
            }
            throw new Error(`Cannot parse "${rect}" as a valid Rect.`);
        }

        static isRect(obj: any): obj is Rect {
            return Point.isPoint(obj) && Size.isSize(obj);
        }

        /**
         * Computes the intersection rect among a set of provided rects.
         * @param rects Rects to intersect
         */
        static intersect(...rects: Rect[]): Rect {
            const empty = { x: 0, y: 0, height: 0, width: 0 },
                arr = Array.from(rects || []);
            if (arr.length <= 0) {
                return empty;
            }
            var rect: Pacem.Rect = arr[0];
            for (var i = 1; i < arr.length; i++) {
                const r = arr[i];

                const x = Math.max(r.x, rect.x),
                    y = Math.max(r.y, rect.y),
                    xw = Math.min(r.x + r.width, rect.x + rect.width),
                    xh = Math.min(r.y + r.height, rect.y + rect.height),
                    w = xw - x,
                    h = xh - y;
                if (w < 0 || h <= 0) {

                    // no intersection
                    return empty;
                }

                rect = { x: x, y: y, width: w, height: h };
            }
            return rect;
        }

        /**
         * Returns a rect that contains all the provided points.
         * @param points Points to contain
         */
        static expand(...points: Point[]): Rect;
        /**
         * Returns a rect that contains all the provided points.
         * @param rect Starting rect
         * @param points Points to contain
         */
        static expand(rect: Rect, ...points: Point[]): Rect;
        static expand(rect: Rect | Point, ...args: Point[]): Rect {
            const arr = Array.from(args || []);
            let x0 = rect.x, y0 = rect.y, x1 = x0, y1 = y0;
            if (Rect.isRect(rect)) {
                x1 += rect.width; y1 += rect.height;
            }
            for (let p of arr) {
                x0 = Math.min(p.x, x0);
                y0 = Math.min(p.y, y0);
                x1 = Math.max(p.x, x1);
                y1 = Math.max(p.y, y1);
            }
            return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
        }
    }
}