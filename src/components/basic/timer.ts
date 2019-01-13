/// <reference path="../../core/types.ts" />
/// <reference path="../../core/eventtarget.ts" />
namespace Pacem.Components {

    @CustomElement({ tagName: 'pacem-timer' })
    export class PacemTimerElement extends PacemEventTarget {

        constructor() {
            super();
        }

        @Watch({ emit: false, converter: PropertyConverters.Number }) interval: number;

        private _handle: number = 0;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'interval':
                case 'disabled':
                    this._restart();
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._restart();
        }

        disconnectedCallback() {
            window.clearInterval(this._handle);
            super.disconnectedCallback();
        }

        private _restart() {
            clearInterval(this._handle);
            if (!this.disabled && this.interval > 0) {
                this._handle = window.setInterval(() => {
                    this.dispatchEvent(new Event("tick", { bubbles: false, cancelable: false }));
                }, this.interval);
            }
        }

    }

}