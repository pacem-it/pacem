/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {
    
    @CustomElement({ tagName: 'pacem-input-tel', template: '<input type="tel" class="pacem-input" /><pacem-a class="pacem-readonly" href="{{ \'tel:\'+ :host.value }}"><pacem-text text="{{ :host.viewValue }}"></pacem-text></pacem-a>', shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemTelInputElement extends PacemTextualInputElement {

        constructor() {
            super();
        }

        @ViewChild('input[type=tel]') input: HTMLInputElement;
        @ViewChild('pacem-a') anchor: UI.PacemAnchorElement;

        protected toggleReadonlyView(readonly: boolean) {
            this.input.hidden = readonly;
            this.anchor.hidden = !readonly;
        }

        protected get inputFields(): HTMLInputElement[] {
            return [this.input];
        }

    }

}