/// <reference path="dates.ts" />
namespace Pacem {

    export class NullChecker {

        static isNull(o: any): o is null | undefined {
            return o === null || o === void 0;
        }

        static isEmpty(o: any): boolean {
            try {
                return (Array.isArray(o) && o.length === 0)
                    || (typeof o === 'string' && o === '')
                    || (typeof o === 'object' && Object.keys(o).length === 0 && !Dates.isDate(o) && !(o instanceof RegExp));
            } catch (e) {
                // Object.keys(null) would throw...
                return false;
            }
        }

        static isNullOrEmpty(o: any): boolean {
            return NullChecker.isNull(o) || NullChecker.isEmpty(o);
        }
    }
}
