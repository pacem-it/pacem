/// <reference path="deepcloner.ts" />
namespace Pacem {

    const REF_ID = '$refId';

    /** How functions get serialized. */
    export enum JsonFunctionConversion {
        /** Skip functions (default). */
        Ignore,
        /** Functions get referenced from a state in the current DOM. Not suitable for backups or long-term dehydrations. */
        Reference = 'reference',
        /** Function gets stringified and then eval(uated) while dehydrating. Functions with a state (impure) might not working properly when used on the dehydrated side. */
        Plain = 'plain'
    };

    export interface JsonSerializationOptions {
        functions?: JsonFunctionConversion
    }

    class JsonFnStore {
        private static _jsonFnWeakMap = new WeakMap<Function, string>();
        private static _jsonFnMap = new Map<string, Function>();
        static store(fn: Function): string {
            const weak = this._jsonFnWeakMap;
            if (!weak.has(fn)) {
                const key = Utils.uniqueCode();
                weak.set(fn, key);
                this._jsonFnMap.set(key, fn);
            }
            return weak.get(fn);
        }
        static retrieve(key: string) {
            return this._jsonFnMap.get(key);
        }
        static remove(key: string) {
            const fn = this.retrieve(key);
            this._jsonFnMap.delete(key);
            this._jsonFnWeakMap.delete(fn);
        }
    }

    export class Json {

        private constructor(private _options?: JsonSerializationOptions) {
        }

        static serialize(obj: any, options?: JsonSerializationOptions) {
            return new Json(options)._serialize(obj);
        }

        static deserialize(json: string) {
            return new Json()._deserialize(json);
        }

        private _serialize(obj: any) {
            let clone = DeepCloner.clone(obj);
            let keys = [REF_ID];
            let flat = this._flatten(clone, 0, null, keys);
            return JSON.stringify(flat, keys.sort());
        }

        private _deserialize(json: string) {
            let hasRefs = false;
            let obj = JSON.parse(json, (key, value) => {
                const elPattern = /^\$<#(.+)>$/,
                    fnPattern = /^\$<fn:([^\x05]+)>$/, // <- Firefox workaround for missing 's' flag implementation
                    // fnPattern = /^\$<fn:(.+)>$/s,
                    fnRefPattern = /^\$<fn#(.+)>$/;
                let arr: RegExpExecArray;
                if (key === REF_ID) {
                    hasRefs = true;
                } else if (typeof value === 'string') {

                    // element?
                    if ((arr = elPattern.exec(value)) && arr.length > 1) {
                        return document.getElementById(arr[1]);
                    } else
                        // function (flat)
                        if ((arr = fnPattern.exec(value)) && arr.length > 1) {
                            return eval(arr[1]);
                        } else
                            // function (ref)
                            if ((arr = fnRefPattern.exec(value)) && arr.length > 1) {
                                return JsonFnStore.retrieve(arr[1]);
                            }
                }
                return value;
            });

            if (hasRefs) {
                return this._revive(obj);
            }
            return obj;
        }

        private _flatten(obj, increment = 0, seen?: WeakSet<any>, keys?: Array<string>): any {
            seen = seen || new WeakSet<any>();
            keys = keys || [];
            if (obj instanceof Element) {
                if (!obj.id) {
                    return;
                }
                return `$<#${obj.id}>`;
            }
            else if (typeof obj === 'object' && obj != null && !(obj instanceof Date)) {
                if (Array.isArray(obj)) {
                    return obj.map(i => this._flatten(i, increment, seen, keys));
                }
                else {
                    // very object
                    if (seen.has(obj)) {
                        return (obj[REF_ID] = obj[REF_ID] || ('$#ref_' + (increment++)));
                    }
                    else {
                        seen.add(obj);
                        Object.keys(obj).forEach(k => {
                            if (keys.indexOf(k) === -1) {
                                keys.push(k);
                            }
                            obj[k] = this._flatten(obj[k], increment, seen, keys);
                        });
                        return obj;
                    }
                }
            } else if (typeof obj === 'function') {
                switch (this._options?.functions) {
                    case JsonFunctionConversion.Reference:
                        const key = JsonFnStore.store(obj);
                        return '$<fn#' + key + '>';
                    case JsonFunctionConversion.Plain:
                        return '$<fn:' + obj + '>';
                    default:
                        return undefined;
                }
            }
            return obj;
        }

        private _revive(obj: any) {

            let hashTable: { [name: string]: any } = {};
            const refPattern = /^\$#ref_(.+)$/;
            function revive(entity) {

                if (typeof entity === 'object' && entity !== null) {
                    if (Array.isArray(entity)) {
                        return entity.map(revive);
                    } else {
                        if (REF_ID in entity) {
                            hashTable[entity[REF_ID]] = entity;
                            delete entity[REF_ID];
                        }
                        Object.keys(entity).forEach(k => {
                            entity[k] = revive(entity[k]);
                        });
                    }
                } else if (typeof entity === 'string' && refPattern.test(entity)) {
                    let arr = refPattern.exec(entity);
                    return hashTable[arr[0]];
                }
                return entity;
            }

            return revive(obj);
        }

    }

}