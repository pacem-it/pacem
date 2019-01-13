class PacemNodeList  {

    constructor() {
        this.__arr = [];
    }

    item(i) {
        return this.__arr[i];
    }

    get length() {
        return this.__arr.length;
    }
}
(function (frag) {

    var proto = frag.prototype;
    if (!('children' in proto)) {

        Object.defineProperty(proto, 'children', {
            get: function () {
                var arr = [];
                for (var j = 0; j < this.childNodes.length; j++) {
                    var node = this.childNodes[j];
                    if (node instanceof HTMLElement)
                        arr.push(node);
                }
                // NOT IDEM-POTENT
                var c = this['__fixed_children'] = this['__fixed_children'] || new PacemNodeList();
                c.__arr = arr;
                return c;
            }
        });

    }

})(DocumentFragment)