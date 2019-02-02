/// <reference path="../../core/decorators.ts" />

namespace Pacem.Components {

    @CustomElement({ tagName: P + '-if' })
    export class PacemIfElement extends HTMLElement {

        private _innerHTML: string;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            if (Utils.isNullOrEmpty(this._innerHTML))
                this._innerHTML = this.innerHTML;
            if (!val)
                this.innerHTML = '';
            else
                this.innerHTML = this._innerHTML;
        }

        @Watch({ emit: false, converter: PropertyConverters.Boolean }) match: boolean;

    }

}