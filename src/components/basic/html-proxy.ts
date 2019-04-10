/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    @CustomElement({
        tagName: P + '-html-proxy'
    })
    export class PacemHtmlProxyElement extends PacemEventTarget {

        @Watch({emit: false, converter: PropertyConverters.String }) attr: string;
        @Watch({emit: false, converter: PropertyConverters.String }) value: string;

        private _html = document.documentElement;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'attr' && old) {
                this._html.removeAttribute(old);
            }
            this._update();
        }

        private _update() {
            const key = this.attr;
            if (Utils.isNullOrEmpty(key) || this.disabled) {
                // No key means do nothing
                return;
            }
            const value = this.value;
            const html = this._html;
            if (Utils.isNullOrEmpty(value)) {
                html.removeAttribute(key);
            } else {
                html.setAttribute(key, value);
            }
        }
    }
}