/// <reference path="types.ts" />
namespace Pacem.Components {

    @CustomElement({ tagName: P + '-span' })
    export class PacemSpanElement extends PacemSafeContentElement implements OnPropertyChanged {

        constructor() {
            super();
        }

        propertyChangedCallback(name: string, old: any, val: any, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name == 'text')
                this.textContent = val;
        }

        @Watch({ converter: PropertyConverters.String }) text: string;
    }

}