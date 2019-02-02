/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {
    
    @CustomElement({ tagName: P + '-input-tel', template: `<input type="tel" class="pacem-input" /><${ P }-a class="pacem-readonly" href="{{ 'tel:'+ :host.value }}"><${ P }-text text="{{ :host.viewValue }}"></${ P }-text></${ P }-a>`, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemTelInputElement extends PacemTextualInputElement {

        constructor() {
            super();
        }

        @ViewChild('input[type=tel]') input: HTMLInputElement;
        @ViewChild(P + '-a') anchor: UI.PacemAnchorElement;

        protected toggleReadonlyView(readonly: boolean) {
            this.input.hidden = readonly;
            this.anchor.hidden = !readonly;
        }

        protected get inputFields(): HTMLInputElement[] {
            return [this.input];
        }

    }

}