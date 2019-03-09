/// <reference path="types.ts" />
namespace Pacem.Components {

    export abstract class PacemItemElement extends PacemElement {

        private _container: PacemItemsContainerElement<any>;

        protected get container() {
            return this._container;
        }

        /** @overridable */
        protected findContainer(): PacemItemsContainerElement<any> {
            return CustomElementUtils.findAncestor(this, n => n instanceof PacemItemsContainerElement);
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            let iter: PacemItemsContainerElement<any>
                = this._container = this.findContainer();
            if (!Utils.isNull(iter))
                iter.register(this);
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._container))
                this._container.unregister(this);
            super.disconnectedCallback();
        }
    }

    export const ItemRegisterEventName = "itemregister";
    export const ItemUnregisterEventName = "itemunregister";

    export class ItemRegisterEvent<TItem extends PacemItemElement> extends CustomTypedEvent<TItem>{

        constructor(item: TItem, eventInit?: EventInit) {
            super(ItemRegisterEventName, item, eventInit);
        }

    }

    export class ItemUnregisterEvent<TItem extends PacemItemElement> extends CustomTypedEvent<TItem>{

        constructor(item: TItem, eventInit?: EventInit) {
            super(ItemUnregisterEventName, item, eventInit);
        }

    }

    export abstract class PacemItemsContainerElement<TItem extends PacemItemElement> extends PacemElement
        implements ItemsContainer<TItem> {

        @Watch(/* can only be databound or assigned at runtime */) items: TItem[];

        abstract validate(item: TItem): boolean;

        /**
         * Registers a new item among the items.
         * @param item {TItem} Item to be enrolled
         */
        register(item: TItem) {
            if (!this.validate(item)) {
                this.log(Logging.LogLevel.Debug, `${(item && item.localName)} element couldn't be registered in a ${this.localName} element.`);
                return;
            }
            if (Utils.isNull(this.items)) {
                this.items = [item];
            } else if (this.items.indexOf(item) === -1) {
                this.items.push(item);
                this.dispatchEvent(new ItemRegisterEvent(item));
            }
        }

        /**
         * Removes an existing element from the items.
         * @param item {TItem} Item to be removed
         */
        unregister(item: TItem) {
            const ndx = !Utils.isNull(this.items) && this.items.indexOf(item);
            if (ndx >= 0) {
                let item = this.items.splice(ndx, 1);
                this.dispatchEvent(new ItemUnregisterEvent(item[0]));
            }
        }

    }
}