namespace Pacem.Components.UI {

    export declare type ElementOrPoint = Element | Point;

    export const ElementOrPointPropertyConverter: PropertyConverter = {
        convert: (attr: string) => {
            let el = document.querySelector(attr);
            return el || JSON.parse(attr);
        }
    };

}