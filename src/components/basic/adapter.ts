/// <reference path="../../core/types.ts" />
/// <reference path="./types.ts" />
namespace Pacem.Components {

    export interface OnInitialize {
        initializeCallback(): void;
    }

    export interface OnDestroy {
        destroyCallback(): void;
    }

    export abstract class PacemAdapter<TIterative extends Iterative<TItem>, TItem> extends PacemElement
        implements OnInitialize, OnDestroy {

        private _element: TIterative;
        /** Gets the adapted element. */
        protected get master(): TIterative {
            return this._element;
        }

        /** Gets whether this adapter has been initialized or not. */
        get initialized(): boolean {
            return !Utils.isNull(this._element);
        }

        private _propertyChangeHandler = (evt: PropertyChangeEvent) => {
            this.masterPropertyChangedCallback(evt.detail.propertyName, evt.detail.oldValue, evt.detail.currentValue, evt.detail.firstChange);
        };

        /**
         * Handles the property changes for the master element.
         * @param name Name of the property that has changed
         * @param old Previous value
         * @param val Current value
         * @param first Is it the startup change?
         */
        masterPropertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            switch (name) {
                case 'items':
                    this._adjustFocusIndex();
                    break;
                case 'index':
                    this._element.dispatchEvent(new CurrentIndexChangeEvent({ currentIndex: val, previousIndex: old }));
                    break;
            }
        }

        /**
         * Handles the property changes for item elements.
         * @param index Index of the element among the items
         * @param name Name of the property that has changed
         * @param old Previous value
         * @param val Current value
         * @param first Is it the startup change?
         */
        itemPropertyChangedCallback(index: number, name: string, old: any, val: any, first?: boolean) {
            // empty implementation
        }

        /** Called righat after the adapter 'initialize'. */
        initializeCallback() {
            // empty implementation
        }

        destroyCallback() {
            // empty implementation
        }

        initialize(adapted: TIterative): void {
            if (this._element != null) {
                this.destroy();
                //throw `Cannot initialize an adapter twice.`;
            }
            if (adapted != null) {
                this._element = adapted;
                this._element.addEventListener(PropertyChangeEventName, this._propertyChangeHandler, false);
            }
            this.initializeCallback();
        }

        destroy(): void {
            if (this._element != null)
                this._element.removeEventListener(PropertyChangeEventName, this._propertyChangeHandler, false);
            this.destroyCallback();
        }

        disconnectedCallback() {
            this.destroy();
            super.disconnectedCallback();
        }

        private _adjustFocusIndex() {
            let items = this._element.items;
            const index = this._element.index;
            const length = items && items.length;
            const ndxStart = length ? Math.max(0, Math.min(length - 1, index)) : -1;
            const ndx = this._getAvailable(ndxStart);
            this._element.index = ndx;
        }

        private _getNextAvailable(ndxStart: number) {
            return this._getAvailable(ndxStart, 1);
        }

        private _getPreviousAvailable(ndxStart: number) {
            return this._getAvailable(Math.max(0, ndxStart), -1);
        }

        private _getAvailable(ndxStart: number = this._element && this._element.index, step: number = 0) {
            let items = this._element.items,
                length: number;
            if (!(items && (length = items.length) > 0))
                return -1;
            ndxStart = ndxStart % length;
            let ndx = (ndxStart + step + length) % length;
            let item: any;
            step = step || -1;
            while ((item = items[ndx]) instanceof PacemEventTarget && item.disabled === true
                || (item instanceof PacemElement && item.hide === true)) {
                ndx = (ndx + step + length) % length;
                if (ndx == ndxStart) {
                    // loop completed
                    return -1;
                }
            }
            return ndx;
        }

        /**
         * Returns whether the provided index is close (adjacent or equal) to the current one in focus.
         * @param ndx index to be checked
         */
        isClose(ndx: number): boolean {
            const current = this._getAvailable();
            return ndx === current
                || ndx === this._getPreviousAvailable(current)
                || ndx === this._getNextAvailable(current);
        }

        /**
         * Returns whether the provided index is adjacent (previous on the list) to the current one in focus.
         * @param ndx index to be checked
         */
        isPrevious(ndx: number): boolean {
            const current = this._getAvailable();
            return ndx === this._getPreviousAvailable(current);
        }

        /**
         * Returns whether the provided index is adjacent (next on the list) to the current one in focus.
         * @param ndx index to be checked
         */
        isNext(ndx: number): boolean {
            const current = this._getAvailable();
            return ndx === this._getNextAvailable(current);
        }

        select(ndx: number) {
            this._element.index = this._getAvailable(ndx);
        }

        previous() {
            var prev = this._getPreviousAvailable(this._element.index);
            if (prev >= 0)
                this._element.index = prev;
        }

        next() {
            var next = this._getNextAvailable(this._element.index);
            if (next >= 0)
                this._element.index = next;
        }

    }

}