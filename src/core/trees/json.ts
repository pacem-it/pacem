/// <reference path="deepcloner.ts" />
namespace Pacem {

    const REF_ID = '$refId';

    export class Json {

        private constructor() {
        }

        static serialize(obj: any) {
            return new Json()._serialize(obj);
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
                const elPattern = /^\$<#(.+)>$/;
                let arr: RegExpExecArray;
                if (key === REF_ID) {
                    hasRefs = true;
                } else if (typeof value === 'string') {
                    if ((arr = elPattern.exec(value)) && arr.length > 1) {
                        return document.getElementById(arr[1]);
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