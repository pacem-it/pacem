/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    @CustomElement({
        tagName: 'pacem-html'
    })
    export class PacemHtmlElement extends PacemEventTarget {

        @Watch({ converter: PropertyConverters.String }) attr: string;
        @Watch({ converter: PropertyConverters.String }) value: string;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            this._update();
        }

        private _update() {
            const key = this.attr;
            if (Utils.isNullOrEmpty(key) || this.disabled) {
                // No key means do nothing
                return;
            }
            const value = this.value;
            const html = document.documentElement;
            if (Utils.isNullOrEmpty(value)) {
                html.removeAttribute(key);
            } else {
                html.setAttribute(key, value);
            }
        }
    }
}