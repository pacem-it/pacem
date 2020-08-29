namespace Pacem {

    const RGB_PATTERN = /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
    const RGBA_PATTERN = /^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\)$/;
    const HEX_PATTERN = /^#[a-f0-9]{6}$/;
    const HEX_SHORT_PATTERN = /^#[a-f0-9]{3}$/;

    export interface Rgba { readonly r: number, readonly g: number, readonly b: number, a?: number };
    export interface Hsla { readonly h: number, readonly s: number, readonly l: number, a?: number };

    export class Colors {

        private static _clampRGB(rgb: [number, number, number, number]): Rgba {
            const clmp = (n: number) => Math.min(1.0, Math.max(0, n));
            if (rgb[3] == null) {
                rgb[3] = 1.0;
            }
            return { r: clmp(rgb[0]), g: clmp(rgb[1]), b: clmp(rgb[2]), a: Math.min(1, Math.max(0, rgb[3])) };
        }

        private static _normalize(rgb: [number, number, number, number]): [number,number,number,number] {
            return [rgb[0] / 255.0, rgb[1] / 255.0, rgb[2] / 255.0, rgb[3]];
        }

        static parse(clr: string): Rgba {

            clr = (clr || '').toLowerCase();

            /* rgb(255,255,255) */
            if (RGB_PATTERN.test(clr)) {
                let rgbArr = RGB_PATTERN.exec(clr);
                return this._clampRGB(this._normalize([parseInt(rgbArr[1]), parseInt(rgbArr[2]), parseInt(rgbArr[3]), 1]));
            }
            /* rgba(255,255,255,.5) */
            if (RGBA_PATTERN.test(clr)) {
                let rgbArr = RGBA_PATTERN.exec(clr);
                return this._clampRGB(this._normalize([parseInt(rgbArr[1]), parseInt(rgbArr[2]), parseInt(rgbArr[3]), parseFloat(rgbArr[4])]));
            }
            /* #ffffff */
            if (HEX_PATTERN.test(clr)) {
                let hex = HEX_PATTERN.exec(clr)[0];
                return this._clampRGB(this._normalize([parseInt('0x' + hex.substr(1, 2)), parseInt('0x' + hex.substr(3, 2)), parseInt('0x' + hex.substr(5, 2)), 1]));
            }
            /* #fff */
            if (HEX_SHORT_PATTERN.test(clr)) {
                let hex = HEX_SHORT_PATTERN.exec(clr)[0];
                let r = hex.substr(1, 1), g = hex.substr(2, 1), b = hex.substr(3, 1);
                return this._clampRGB(this._normalize([parseInt('0x' + r + r), parseInt('0x' + g + g), parseInt('0x' + b + b), 1]));
            }
        }

        static hue(rgb: Rgba) {
            const r = rgb.r, g = rgb.g, b = rgb.b;
            return Math.round(
                Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI
            );
        }

        static luminance(rgb: Rgba) {
            const r = rgb.r, g = rgb.g, b = rgb.b;
            return .5 * (Math.max(r, g, b) + Math.min(r, g, b));
        }

        static saturation(rgb: Rgba) {
            const l = this.luminance(rgb);
            const r = rgb.r, g = rgb.g, b = rgb.b;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            return (l === 0 || l === 1) ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
        }

        static hsl(rgb: Rgba): Hsla {
            return { h: this.hue(rgb), s: this.saturation(rgb), l: this.luminance(rgb), a: rgb.a };
        }

        static rgb(hsl: Hsla): Rgba {
            const h = hsl.h, s = hsl.s, l = hsl.l,
                h6 = h / 60.0;
            const C = (1 - Math.abs(2 * l - 1)) * s;
            const X = C * (1 - Math.abs(h6 % 2 - 1));
            const m = l - C / 2;
            const compose = (r, g, b) => this._clampRGB([r + m, g + m, b + m, hsl.a]);
            if (h6 <= 1) { return compose(C, X, 0); }
            else if (h6 <= 2) { return compose(X, C, 0); }
            else if (h6 <= 3) { return compose(0, C, X); }
            else if (h6 <= 4) { return compose(0, X, C); }
            else if (h6 <= 5) { return compose(X, 0, C); }
            else if (h6 <= 6) { return compose(C, 0, X); }
        }

    }

}