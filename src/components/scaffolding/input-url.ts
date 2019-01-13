/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
/// <reference path="char-counter.ts" />
namespace Pacem.Components.Scaffolding {
    
    @CustomElement({ tagName: 'pacem-input-url', template: `<input type="url" class="pacem-input" />${ CHAR_COUNTER_CHILD }<pacem-a class="pacem-readonly" href="{{ :host.value }}" target="\'_blank\'"><pacem-text text="{{ :host.viewValue }}"></pacem-text></pacem-a>`, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemUrlInputElement extends PacemTextualInputElement {

        constructor() {
            super();
        }

        @ViewChild('input[type=url]') input: HTMLInputElement;
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