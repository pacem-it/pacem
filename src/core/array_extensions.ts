declare interface Array<T> {
    moveWithin(from: number, to: number): void;
}

Array.prototype.moveWithin = function (this: any[], from, to) {

    const OUT_OF_RANGE = 'Index must be greater or equal than 0 and less or equal than the length of the array.';
    var arr = this;
    if (from < 0 || from > arr.length)
        throw new Error(OUT_OF_RANGE);
    if (to < 0 || to > arr.length)
        throw new Error(OUT_OF_RANGE);
    // Allow splicing and joining even if from and to are equal.
    // For propertychange propagation sake.
    //if (from === to)
    //    return;
    //
    arr.splice(to, 0, arr.splice(from, 1)[0]);
};