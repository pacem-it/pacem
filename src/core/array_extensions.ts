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

    arr.splice(to, 0, /* avoid to trigger a double change on a single command */ Array.prototype.splice.apply(arr, [from, 1])[0]);
};