declare interface Number {
    toBase62(): string;
    toBase36(): string;
}

Number.prototype.toBase62 = function (this: number) {
    var alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    var temp = this;
    var sb = '';
    while (temp != 0) {
        var mod = temp % 62;
        sb = alphabet.charAt(mod) + sb;
        temp = Math.floor(temp / 62);
    }
    return sb;
};

Number.prototype.toBase36 = function (this: number) {
    return this.toString(36);
};