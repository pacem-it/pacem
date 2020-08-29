declare interface Number {
    isCloseTo(other: number, precision?: number): boolean;
    roundoff(precision?: number): number;
}

Number.prototype.isCloseTo = function (this: number, other: number, precision = 14) {
    return this.toFixed(precision) === other.toFixed(precision);  
};

Number.prototype.roundoff = function (this: number, precision = 14) {
    return parseFloat(this.toFixed(precision));
}