declare interface Array<T> {
    moveWithin(from: number, to: number): void;
    equalsContent(other: T[]): boolean;
    cloneFrom(other: T[]): void;
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

Array.prototype.equalsContent = function (this: any[], other: any[]) {
    if (other == null || this.length !== other.length) {
        return false;
    }
    for (let j = 0; j < this.length; j++) {
        if (this[j] !== other[j]) {
            return false;
        }
    }
    return true;
};

Array.prototype.cloneFrom = function (this: any[], other: any[]) {
    if (other == null) {
        throw 'Cannot clone array from null object.';
    }

    var changes = false;
    const length = other.length;
    for (let j = 0; j < length; j++) {

        const item = other[j];
        if (this.length > j) {
            if (this[j] !== item) {
                this[j] = item;
                changes = true;
            }
        } else {
            Array.prototype.push.apply(this, [item]);
            changes = true;
        }
    }

    if (changes) {
        // trigger change just in case
        this.splice(length);
    }
}