/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {
    
    @CustomElement({ tagName: 'pacem-input-hidden', template: '<input type="hidden" />', shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemHiddenInputElement extends PacemTextualInputElement {

        constructor() {
            super();
        }

        @ViewChild('input[type=hidden]') input: HTMLInputElement;

        protected toggleReadonlyView(readonly: boolean) { /*...doh!*/ }

        protected get inputFields(): HTMLInputElement[] {
            return [this.input];
        }

    }

}