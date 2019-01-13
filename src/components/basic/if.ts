/// <reference path="../../core/decorators.ts" />

namespace Pacem.Components {

    @CustomElement({ tagName: 'pacem-if' })
    export class PacemIfElement extends HTMLElement implements OnPropertyChanged {

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