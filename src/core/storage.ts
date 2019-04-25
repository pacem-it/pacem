type WindowStorage = Storage;

namespace Pacem {

    export class Storage {
        
        private getStorage(persistent?: boolean): WindowStorage {
            //TODO: if (mdz.localstorage)... cookies fallback
            return !!persistent ? window.localStorage : window.sessionStorage;
        }

        setPropertyValue(name: string, value: any, persistent?: boolean) {
            var storage = this.getStorage(persistent);
            storage.setItem(name, Utils.Json.stringify(value));
            // delete omonymy
            storage = this.getStorage(!persistent);
            storage.removeItem(name);
        }

        getPropertyValue(name: string) {
            var storage = this.getStorage(false);
            var retval;
            if ((retval = storage.getItem(name)) !== null) return Utils.Json.parse(retval);
            retval = this.getStorage(true).getItem(name);
            if (retval === null) return retval;
            return Utils.Json.parse(retval);
        }

        clear() {
            var storage = this.getStorage(true);
            storage.clear();
            storage = this.getStorage(false);
            storage.clear();
        };

        removeProperty(name: string) {
            var storage = this.getStorage(true);
            storage.removeItem(name);
            storage = this.getStorage(false);
            storage.removeItem(name);
        }

    }

}