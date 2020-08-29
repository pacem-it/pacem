namespace Pacem {

    export class DeepCloner {

        private constructor() {
        }

        static clone(obj: any) {
            return new DeepCloner()._clone(obj);
        }

        private _clone(obj: any) {

            let seen = new WeakMap();

            function clone(obj) {
                if (typeof obj === 'object' && obj !== null
                    &&/* DOM elements won't be deep-cloned */ !(obj instanceof Element)) {
                    if (Array.isArray(obj)) {
                        return obj.map(clone);
                    } else if (obj instanceof Date) {
                        return new Date(obj.valueOf());
                    } else {
                        if (seen.has(obj)) {
                            return seen.get(obj);
                        } else {
                            let shallow2Deep = Object.assign({}, obj);
                            seen.set(obj, shallow2Deep);
                            Object.keys(shallow2Deep).forEach(k => { shallow2Deep[k] = clone(obj[k]); });
                            return shallow2Deep;
                        }
                    }
                }
                return obj;
            }

            return clone(obj);
        }

    }

}