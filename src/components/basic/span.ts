/// <reference path="types.ts" />
namespace Pacem.Components {

    @CustomElement({ tagName: P + '-span' })
    export class PacemSpanElement extends PacemSafeContentElement {

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'text' && !first) {
                this.textContent = val;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (!Utils.isNull(this.text)) {
                this.textContent = this.text;
            }
        }

        @Watch({ converter: PropertyConverters.String }) text: string;
    }

}