/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    const REMOVE_VALUE = 'false';
    const EMPTY_VALUE = 'true';

    @CustomElement({
        tagName: P + '-layout-proxy'
    })
    export class PacemLayoutProxyElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.String }) attr: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) value: string;

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
            const layout = CustomElementUtils.findAncestorShell(this);
            if (Utils.isNullOrEmpty(value) || value === REMOVE_VALUE) {
                layout.removeAttribute(key);
            } else {
                layout.setAttribute(key, value === EMPTY_VALUE ? '' : value);
            }
        }
    }
}