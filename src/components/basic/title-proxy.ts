/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    @CustomElement({
        tagName: P + '-title-proxy'
    })
    export class PacemTitleProxyElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.String }) value: string; 

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            this._update();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._update();
        }

        private _update() {
            const value = this.value;
            if (Utils.isNullOrEmpty(value) || this.disabled) {
                // No key means do nothing
                return;
            }
            document.title = value;
        }
    }
}