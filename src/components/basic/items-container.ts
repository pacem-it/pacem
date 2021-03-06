﻿/// <reference path="types.ts" />
namespace Pacem.Components {

    export abstract class PacemItemElement extends PacemElement {

        private _container: ItemsContainer<any>;
        protected get container() {
            return this._container;
        }

        /** @overridable */
        protected findContainer(): ItemsContainer<any> {
            return CustomElementUtils.findAncestor(this, n => n instanceof PacemItemsContainerElement);
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            let iter = this._container = this.findContainer();
            if (!Utils.isNull(iter))
                iter.register(this);
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._container))
                this._container.unregister(this);
            super.disconnectedCallback();
        }
    }

    export function isItemsContainer(object: any): object is ItemsContainer<any> {
        return 'items' in object
            && (Utils.isNull(object.items) || Utils.isArray(object.items))
            && typeof object.register === 'function'
            && typeof object.unregister === 'function';
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

    class ItemsContainerRegistrar<TItem extends PacemItemElement> {

        constructor(private _container: PacemItemsContainerElement<TItem> | PacemCrossItemsContainerElement<TItem>) {
            if (_container == null || !(_container instanceof PacemItemsContainerElement || _container instanceof PacemCrossItemsContainerElement)) {
                throw `Must provide a valid itemscontainer.`;
            }
        }

        register(item: TItem) : boolean {
            const container = this._container;
            var retval = false;
            if (!container.validate(item)) {
                container.logger && container.logger.log(Pacem.Logging.LogLevel.Debug, `${(item && item.localName)} element couldn't be registered in a ${container.localName} element.`);
            } else {
                if (Utils.isNull(container.items)) {
                    container.items = [item];
                    retval = true;
                } else if (container.items.indexOf(item) === -1) {
                    container.items.push(item);
                    retval = true;
                }
            }
            if (retval) {
                container.dispatchEvent(new ItemRegisterEvent(item));
            }
            return retval;
        }

        unregister(item: TItem) : boolean {
            const container = this._container;
            const ndx = !Utils.isNull(container.items) && container.items.indexOf(item);
            if (ndx >= 0) {
                let item = container.items.splice(ndx, 1);
                container.dispatchEvent(new ItemUnregisterEvent(item[0]));
                return true;
            }
            return false;
        }
    }

    /** Element that can be used both as ItemElement and ItemsContainer. */
    export abstract class PacemCrossItemsContainerElement<TItem extends PacemItemElement>
        extends PacemItemElement
        implements ItemsContainer<TItem>{

        constructor(role?: string, aria?: { [name: string]: string }) {
            super(role, aria)
            this._registrar = new ItemsContainerRegistrar(this);
        }

        private _registrar: ItemsContainerRegistrar<TItem>;

        @Watch(/* can only be databound or assigned at runtime */) items: TItem[];

        abstract validate(item: TItem): boolean;

        /**
         * Registers a new item among the items.
         * @param item {TItem} Item to be enrolled
         */
        register(item: TItem) {
            return this._registrar.register(item);
        }

        /**
         * Removes an existing element from the items.
         * @param item {TItem} Item to be removed
         */
        unregister(item: TItem) {
            return this._registrar.unregister(item);
        }
    }

    export abstract class PacemItemsContainerElement<TItem extends PacemItemElement>
        extends PacemElement
        implements ItemsContainer<TItem> {

        constructor(role?: string, aria?: { [name: string]: string }) {
            super(role, aria);
            this._registrar = new ItemsContainerRegistrar(this);
        }

        private _registrar: ItemsContainerRegistrar<TItem>;

        @Watch(/* can only be databound or assigned at runtime */) items: TItem[];

        abstract validate(item: TItem): boolean;

        /**
         * Registers a new item among the items.
         * @param item {TItem} Item to be enrolled
         */
        register(item: TItem) {
            return this._registrar.register(item);
        }

        /**
         * Removes an existing element from the items.
         * @param item {TItem} Item to be removed
         */
        unregister(item: TItem) {
            return this._registrar.unregister(item);
        }

    }

}