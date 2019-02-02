/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    const PACEM_TOAST_POPS = "pacem:toast:pops";

    @CustomElement({
        tagName: P + '-toast'
    })
    export class PacemToastElement extends PacemElement implements OnPropertyChanged {

        @Watch({ emit: false, converter: PropertyConverters.Boolean }) autohide: boolean = true;
        @Watch({ emit: false, converter: PropertyConverters.Number }) timeout: number = 3000;
        @Watch({ converter: PropertyConverters.Boolean }) show: boolean;

        connectedCallback() {
            super.connectedCallback();
            this.addEventListener('click', this._doHide, false);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'show') {
                if (val !== true) {
                    Utils.removeClass(this, 'toast-show');
                    this.dispatchEvent(new CustomEvent('close'));
                } else {
                    let order: number = CustomElementUtils.getAttachedPropertyValue(PacemToastElement, PACEM_TOAST_POPS, 0) - 1;
                    CustomElementUtils.setAttachedPropertyValue(PacemToastElement, PACEM_TOAST_POPS, order);
                    this.style.order = ''+order;
                    Utils.addClass(this, 'toast-show');
                    this._show();
                }
            }
        }

        disconnectedCallback() {
            this.removeEventListener('click', this._doHide, false);
            super.disconnectedCallback();
        }

        private _handle: number;
        private _doHide = (evt?) => {
            window.clearTimeout(this._handle);
            this.show = false;
        }

        private _show() {
            window.clearTimeout(this._handle);
            if (this.disabled)
                return;
            if (this.autohide)
                this._handle = window.setTimeout(() => { this.show = false; }, this.timeout);
        }
    }

}