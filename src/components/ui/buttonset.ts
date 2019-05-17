/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P +'-buttonset'
    })
    export class PacemButtonsetElement extends PacemIterativeElement<PacemButtonElement> {
        
        connectedCallback() {
            super.connectedCallback();
            if (!('tabindex' in this.attributes))
                this.tabIndex = 0;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'index':
                    let ndx = 0;
                    for (var btn of this.items) {
                        if (ndx == val) {
                            btn.focus();
                            break;
                        }
                        ndx++;
                    }
                    break;
            }
        }

        validate(item) {
            return item instanceof PacemButtonElement;
        }

    }
}