/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {
    
    @CustomElement({ tagName: 'pacem-input-search', template: '<input type="search" class="pacem-input" />', shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemSearchInputElement extends PacemTextualInputElement {

        constructor() {
            super();
        }

        @ViewChild('input[type=search]') input: HTMLInputElement;

        protected get inputFields(): HTMLInputElement[] {
            return [this.input];
        }

        protected toggleReadonlyView(readonly: boolean) {
            // no readonly view provided.
        }

    }

}