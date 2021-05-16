/// <reference path="../../core/eventtarget.ts" />

namespace Pacem.Behaviors{

    export abstract class PacemBehavior extends Pacem.Components.PacemEventTarget {

        #items: Element[] = [];

        //protected get container() {
        //    return this._container;
        //}

        protected abstract decorate(element: Element);
        protected abstract undecorate(element: Element);

        register(element: Element): void {
            var container = this.#items;
            if (container.indexOf(element) === -1) {
                container.push(element);
                this.decorate(element);
            }
        }

        unregister(element: Element): void {
            var container = this.#items,
                ndx: number;
            if ((ndx = container.indexOf(element)) !== -1) {
                this.undecorate(element);
                container.splice(ndx, 1);
            }
        }
    }

}