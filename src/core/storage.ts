type WindowStorage = Storage;

namespace Pacem {

    const EXPIRATION_FIELD = '_exp';

    export class Storage {

        private _getStorage(persistent: boolean): WindowStorage {
            return !!persistent ? window.localStorage : window.sessionStorage;
        }

        private _parseValue(storage: WindowStorage, name: string): any {
            const value = storage.getItem(name);
            if (Utils.isNullOrEmpty(value)) {
                return null;
            }

            const output = Utils.Json.parse(value);
            if (!Object.hasOwnProperty(EXPIRATION_FIELD)) {
                return output;
            }

            const exp: number = output[EXPIRATION_FIELD];
            if (exp < Date.now()) {
                storage.removeItem(name);
                return null;
            }

            return output['value'];
        }

        /**
         * Keeps undefinitely the provided value in a storage.
         * @param name The unique key
         * @param value The value to store
         * @param persistent Whether to use a session `false` or local `true` storage
         */
        setPropertyValue(name: string, value: any, persistent?: boolean);
        /**
         * Stores persistently the provided value for the specified amount of seconds.
         * @param name The unique key
         * @param value The value to store
         * @param duration Storage timeout in seconds
         */
        setPropertyValue(name: string, value: any, duration:number);
        setPropertyValue(name: string, value: any, persistent?: boolean | number) {
            var storage = this._getStorage(persistent === true || persistent > 0);
            var storedValue = value;

            // set cache timeout
            if (typeof persistent === 'number' && persistent > 0) {
                const exp = Date.now() + 1000 * persistent;
                storedValue = { value: value };
                storedValue[EXPIRATION_FIELD] = exp;
            }

            storage.setItem(name, Utils.Json.stringify(storedValue));
            // delete omonymy
            storage = this._getStorage(!persistent);
            storage.removeItem(name);
        }

        getPropertyValue(name: string) {
            return this._parseValue(this._getStorage(false), name)
                || this._parseValue(this._getStorage(true), name);
        }

        clear() {
            var storage = this._getStorage(true);
            storage.clear();
            storage = this._getStorage(false);
            storage.clear();
        };

        removeProperty(name: string) {
            var storage = this._getStorage(true);
            storage.removeItem(name);
            storage = this._getStorage(false);
            storage.removeItem(name);
        }

    }

}