namespace Pacem.Mathematics.DataAnalysis {

    // #region DFT utils

    /**
     * Unit circle Euler's formula
     * @param k partial 'slices'
     * @param N total 'slices'
     */
    function euler(k: number, N: number): Complex {
        const x = 2 * Math.PI * k / N;
        return Complex.build(Math.cos(x), Math.sin(x));
    }

    /** Unit circle memoizer */
    const unitCircle: { [N: number]: { [k: number]: Complex } } = {};
    function exp(k: number, N: number): Complex {
        const memN = unitCircle[N] = unitCircle[N] || {};
        return memN[k] = memN[k] || euler(k, N);
    }

    // #endregion

    function isPowerOfTwo(length: number) {
        return length > 0 && (length & (length - 1)) === 0;
    }

    /** Cooley-Tukey */
    function fftRec(data: (Complex | number)[]): Complex[] {
        const retval: Complex[] = [],
            N = data.length;

        if (N === 1) {
            return [Complex.build(data[0])];
        }

        // even/odds recursion
        const retval_2n = fftRec(data.filter((_, i) => i % 2 === 0)),
            retval_2n1 = fftRec(data.filter((_, i) => i % 2 === 1));

        for (var k = 0; k < N / 2; k++) {
            const t = retval_2n[k],
                e = Complex.multiply(exp(k, N), retval_2n1[k]);
            retval[k] = Complex.add(t, e);
            retval[k + (N / 2)] = Complex.subtract(t, e);
        }

        return retval;
    }

    export class Fourier {

        /**
         * Checks the input vector and outputs a frequency vector using the best performing algo.
         * @param data Input vector of any size
         * @param normalize Whether to normalize the signal or not (default true)
         */
        static transform(data: (Complex | number)[], normalize = true): Complex[] {
            data = data || [];
            if (isPowerOfTwo(data.length)) {
                return this.fft(data, normalize);
            }
            return this.dft(data, normalize);
        }

        /**
         * Checks the input vector and applies inverted fourier transform's best performing algo.
         * @param data Input frequency vector
         */
        static invert(data: Complex[], normalize = true): Complex[] {
            return this.idft(data || [], normalize);
        }

        /**
         * Naive Discrete Fourier Transform implementation (O(n^2) algo).
         * @param data Input vector of any size
         * @param normalize Whether to normalize the signal or not (default true)
         */
        static dft(data: (Complex | number)[], normalize = true): Complex[] {
            const N = (data || [])?.length,
                DEN = normalize ? 1 / Math.sqrt(N) : 1,
                retval: Complex[] = [];
            for (let k = 0; k < N; k++) {
                retval.push({ real: 0, img: 0 });
                for (let j = 0; j < N; j++) {
                    const e = exp(k * j, N),
                        item = Complex.multiply(data[j], e),
                        itemN = Complex.multiply(item, DEN);
                    retval[k] = Complex.add(retval[k], itemN);
                }
            }
            return retval;
        }

        /**
         * Inverse Discrete Fourier Transform.
         * @param data Input vector data of any size
         */
        static idft(data: Complex[], normalize = true) {
            const reversed = data.map(i => Complex.build(i.img, i.real)),
                temp = this.transform(reversed, normalize);
            return temp.map(c => Complex.build(c.img, c.real));
        }

        /**
         * FFT processing using Cooley-Tukey.
         * @param data Input vector (size MUST be power of 2)
         */
        static fft(data: (Complex | number)[], normalize = true): Complex[] {
            const retval = fftRec(data);
            if (!normalize) {
                return retval;
            }
            const DEN = 1 / Math.sqrt(data.length);
            return retval.map(i => Complex.multiply(i, DEN));
        }

    }

}