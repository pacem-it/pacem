namespace Pacem {

    export class Maths {
        
        static lcd(...args: number[]): number {
            if (args.length <= 1) {
                throw 'Insufficient set of numbers.';
            }

            function ex9(x, y) {
                if (!y) return y === 0 ? x : NaN;
                return ex9(y, x % y);
            }

            function ex10(x, y) {
                return x * y / ex9(x, y);
            }

            let result = args[0];
            for (let j = 1; j < args.length; j ++) {
                result = ex10(result, args[j]);
            }
            return result;
        }

    }

}