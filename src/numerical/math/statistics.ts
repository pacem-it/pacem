namespace Pacem.Mathematics.DataAnalysis {

    function varNum(set: number[]): number {
        const mean = this.mean(set);
        return set.reduce((p, c) => Math.pow(c - mean, 2) + p, 0);
    }

    function stdev(set: number[], bessel = false) {
        const num = this._varNum(set);
        return Math.sqrt(num / (set.length + (bessel ? 1 : 0)));
    }

    /** Utility tools about statistics, probability, data analysis... */
    export class Utils {

        static sum(set: number[]): number {
            return set.reduce((p, c) => p + c, 0);
        }

        static mean(set: number[]): number {
            return this.sum(set) / set.length;
        }

        /**
         * Variance.
         * @param set
         */
        static var(set: number[]): number {
            return varNum(set) / set.length;
        }

        /**
         * Standard deviation of the population.
         * @param population
         */
        static pstdev(population: number[]) {
            return stdev(population, false);
        }

        /**
         * Standard deviation of a sample set.
         * @param sample
         */
        static sstdev(sample: number[]) {
            return stdev(sample, true);
        }

        /**
         * Returns a set of utilities for gaussian distribution computations.
         * @param mean
         * @param stdev
         */
        static gaussian(mean: number, stdev: number) {
            return new Gaussian(mean, stdev);
        }
    }
}