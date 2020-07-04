namespace Pacem {

    const SQRT_PI = Math.sqrt(Math.PI);

    /**
     * Complementary Error Function as of Numerical Recipes in C (p.221).
     * @param x Input
     */
    const erfc = function (x: number)
    //Returns the complementary error function erfc(x) with fractional error everywhere less than
    //1.2 × 10−7.
    {
        let t, z, ans;
        z = Math.abs(x);
        t = 1.0 / (1.0 + 0.5 * z);
        ans = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
            t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 +
                t * (-0.82215223 + t * 0.17087277)))))))));
        return x >= 0.0 ? ans : 2.0 - ans;
    }

    /**
     * Error Function.
     * @param x
     */
    const erf = function (x: number) {
        return 1 - erfc(x);
    }

    export class Gaussian {
        constructor(mean: number, stdev: number) {
            this.mean = mean;
            this.stdev = Math.abs(stdev);
            this.variance = Math.pow(stdev, 2);
        }

        readonly mean: number;
        readonly stdev: number;
        readonly variance: number;

        static get normal() {
            return _normal;
        }

        /**
         * Probability density function
         * @param x Input value
         */
        probabilityDensity(x: number) {
            // 1/(σ √2π) * e^(.5 *(-Z^2))
            const inv_coeff = this.stdev * Math.SQRT2 * SQRT_PI,
                exp_part = Math.exp(-0.5 * Math.pow(this._z(x), 2));
            return exp_part / inv_coeff;
        }

        private _z(x: number) {
            // Z = (x - μ)/σ
            return (x - this.mean) / this.stdev;
        }

        /**
         * Returns the area under the PDF from -∞ to x
         * @param x Input value
         */
        probability(x: number) {
            return 0.5 * erfc(-this._z(x) / Math.SQRT2);
        }
    }

    const _normal = new Gaussian(0, 1);

}