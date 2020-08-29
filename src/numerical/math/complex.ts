namespace Pacem.Mathematics {

    export interface Complex {
        readonly real: number;
        readonly img: number;
    }

    function complex(c: Complex | number): Complex {
        if (typeof c === 'number') {
            c = { real: c, img: 0 };
        }
        return c;
    }

    var NOT_A_COMPLEX: Complex;
    function buildComplex(real: number, img: number): Complex {
        const c: any = {};
        Object.defineProperty(c, 'real', { value: real, writable: false });
        Object.defineProperty(c, 'img', { value: img, writable: false });
        return c as Complex;
    }
    function nac() {
        return NOT_A_COMPLEX || (NOT_A_COMPLEX = buildComplex(Number.NaN, Number.NaN));
    }

    export class Complex {

        static build(z: Complex | number): Complex
        static build(real: number, img: number): Complex
        static build(real: number | Complex, img?: number): Complex {
            if (this.isComplex(real)) {
                return real;
            }
            return buildComplex(real, img || 0);
        }

        static add(a: Complex | number, b: Complex | number): Complex {
            const ac = complex(a),
                bc = complex(b);
            return buildComplex(ac.real + bc.real, ac.img + bc.img);
        }

        static subtract(from: Complex | number, what: Complex | number): Complex {
            const ac = complex(from),
                bc = complex(what);
            return buildComplex(ac.real - bc.real, ac.img - bc.img);
        }

        static multiply(a: Complex | number, b: Complex | number): Complex {
            const ac = complex(a),
                bc = complex(b);
            return buildComplex(
                /* real*/ac.real * bc.real - ac.img * bc.img,
                /* img */ac.real * bc.img + ac.img * bc.real
            );
        }

        static divide(a: Complex | number, b: Complex | number): Complex {
            const ac = complex(a),
                bc = complex(b);
            const div = this.absSquare(bc).roundoff();

            if (div === 0) {
                return nac();
            }

            const inv_div = 1 / div;

            return buildComplex(
                /* real*/inv_div * (ac.real * bc.real + ac.img * bc.img),
                /* img */inv_div * (ac.img * bc.real - ac.real * bc.img)
            );
        }

        static absSquare(c: Complex | number): number {
            const ac = complex(c);
            return Math.pow(ac.real, 2) + Math.pow(ac.img, 2);
        }

        static modulus(c: Complex | number): number {
            return Math.sqrt(this.absSquare(c));
        }

        static isComplex(c: any): c is Complex {
            return c != null && typeof c === 'object' && 'real' in c && 'img' in c && typeof c.real === 'number' && typeof c.img === 'number';
        }

        static conjugate(a: Complex | number): Complex {
            a = complex(a);
            return buildComplex(a.real, Math.abs(a.img) == 0 ? 0 : -a.img);
        }

        //static isNaN(c: Complex | number): boolean {
        //    switch (c) {
        //        case undefined:
        //            // doh!
        //            return true;
        //        case null:
        //            // doh!
        //            return false;
        //        default:
        //            if (!this.isComplex(  c)
        //    }
        //}

        static get NaC() { return nac(); }

    }

}