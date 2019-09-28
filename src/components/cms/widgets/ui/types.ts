/// <reference path="../types.ts" />
namespace Pacem.Components.Cms {

    export abstract class PacemUiWidgetElement extends PacemWidgetElement {

        constructor(metadata : Pacem.Scaffolding.TypeMetadata, colspan = 1, role?: string) {
            super(metadata, role);
            this.colspan = colspan;
            this.rowspan = 1;
        }

        // just a flag class
        connectedCallback() {
            super.connectedCallback();
            Utils.addClass(this, 'ui-widget ' + PCSS + '-cell cols-xs-start-1 cols-xs-12 rows-xs-start-auto');
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'row':
                    Utils.removeClass(this, `rows-start-${old + 1}`);
                    Utils.addClass(this, `rows-start-${val + 1}`);
                    break;
                case 'rowspan':
                    Utils.removeClass(this, `rows-${old}`);
                    Utils.addClass(this, `rows-${val}`);
                    break;
                case 'column':
                    Utils.removeClass(this, `cols-start-${old + 1}`);
                    Utils.addClass(this, `cols-start-${val + 1}`);
                    break;
                case 'colspan':
                    Utils.removeClass(this, `cols-${old}`);
                    Utils.addClass(this, `cols-${val}`);
                    break;
                case 'borders':
                    (this.borders ? Utils.addClass : Utils.removeClass).apply(this, [this, PCSS + '-border']);
                    break;
                case 'corners':
                    (this.borders ? Utils.addClass : Utils.removeClass).apply(this, [this, PCSS + '-corners']);
                    break;
            }
        }

        // #region CompositeWidget registration

        private _container: PacemCompositeWidgetElement;

        protected get container() {
            return this._container;
        }

        /** @overridable */
        protected findContainer(): PacemCompositeWidgetElement {
            return Pacem.CustomElementUtils.findAncestor(this, n => n instanceof PacemCompositeWidgetElement);
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            let iter: PacemCompositeWidgetElement
                = this._container = this.findContainer();
            if (!Utils.isNull(iter)) {
                iter.register(this);
            }
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._container)) {
                this._container.unregister(this);
            }
            super.disconnectedCallback();
        }

        // #endregion

        /** Default configuration (grid) */
        @Watch({ emit: true, reflectBack: true, converter: PropertyConverters.Number }) column: number;
        @Watch({ emit: true, reflectBack: true, converter: PropertyConverters.Number }) row: number;
        @Watch({ emit: true, reflectBack: true, converter: PropertyConverters.Number }) colspan: number;
        @Watch({ emit: true, reflectBack: true, converter: PropertyConverters.Number }) rowspan: number;
        @Watch({ emit: true, reflectBack: true, converter: PropertyConverters.Boolean }) borders: boolean;
        @Watch({ emit: true, reflectBack: true, converter: PropertyConverters.Boolean }) corners: boolean;

    }

    // #region COMPOSITE

    export interface CompositeWidget extends ItemsContainer<PacemUiWidgetElement> {

        readonly itemsElement: Element;
        register(item: PacemUiWidgetElement): boolean;
        unregister(item: PacemUiWidgetElement): boolean;
    } 

    export const WidgetRegisterEventName = "widgetregister";
    export const WidgetUnregisterEventName = "widgetunregister";
    export const LayoutChangeEventName = "layoutchange";

    export class WidgetRegisterEvent extends CustomEvent<PacemWidgetElement>{

        constructor(item: PacemWidgetElement, eventInit?: EventInit) {
            super(WidgetRegisterEventName, Utils.extend(eventInit || {}, { detail: item }));
        }

    }

    export class WidgetUnregisterEvent extends CustomEvent<PacemWidgetElement>{

        constructor(item: PacemWidgetElement, eventInit?: EventInit) {
            super(WidgetUnregisterEventName, Utils.extend(eventInit || {}, { detail: item }));
        }

    }

    export abstract class PacemCompositeWidgetElement extends PacemUiWidgetElement implements CompositeWidget {

        @Watch(/* can only be databound or assigned at runtime */) items: PacemUiWidgetElement[];

        get itemsElement() {
            return this;
        }

        protected validate(item: PacemUiWidgetElement): boolean {
            return item instanceof PacemUiWidgetElement;
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            Utils.addClass(this.itemsElement, PCSS+'-items-element');
        }

        /**
         * Appends a child Element to this CompositeWidget's itemsElement.
         * @param item New child element
         */
        appendItem(item: Element) {
            this.itemsElement.appendChild(item);
        }

        /**
         * Registers a new item among the items.
         * @param item {PacemUiWidgetElement} Item to be enrolled
         */
        register(item: PacemUiWidgetElement) {
            if (!this.validate(item)) {
                this.log(Pacem.Logging.LogLevel.Debug, `${(item && item.localName)} element couldn't be registered in a ${this.localName} element.`);
                return false;
            }

            let retval = false;
            const items = this.items = this.items || [];
            if (Utils.isNullOrEmpty(items)) {
                this.items = [item];
                retval = true;
            } else if (items.indexOf(item) === -1) {
                items.push(item);
                retval = true;
            }
            //
            if (retval) {
                this.dispatchEvent(new WidgetRegisterEvent(item));
            }
            return retval;
        }

        /**
         * Removes an existing element from the items.
         * @param item {PacemUiWidgetElement} Item to be removed
         */
        unregister(item: PacemUiWidgetElement) {
            const items = this.items,
                ndx = !Utils.isNullOrEmpty(items) && items.indexOf(item);
            if (ndx >= 0) {
                let item = items.splice(ndx, 1);
                this.dispatchEvent(new WidgetUnregisterEvent(item[0]));
                return true;
            }
            return false;
        }
    }

    //  #endregion COMPOSITE

}