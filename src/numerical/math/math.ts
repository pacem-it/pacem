namespace Pacem.Mathematics.NumberTheory {

    /** Utility tools about number theory, 'diophantine' stuff... */
    export class Utils {

        static lcd(...args: number[]): number {
            if (NullChecker.isNullOrEmpty(args) || args.length <= 1) {
                throw 'Insufficient set of numbers.';
            }

            function ex9(x, y) {
                if (!y) return y === 0 ? x : NaN;
                return ex9(y, x % y);
            }

            function ex10(x, y) {
                return x * y / ex9(x, y);
            }

            let result = Math.round(args[0]);
            for (let j = 1; j < args.length; j++) {
                result = ex10(result, Math.round(args[j]));
            }
            return result;
        }

        static gcd(a: number, b: number) {
            // force integers
            a = Math.round(a),
                b = Math.round(b);
            if (a === 0) {
                return b;
            }
            return Utils.gcd(b % a, a);
        }

    }

}