/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="char-counter.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {
    
    @CustomElement({ tagName: 'pacem-input-password', template: `<input type="password" class="pacem-input pacem-viewfinder" />${ CHAR_COUNTER_CHILD }<span class="pacem-readonly"><pacem-text text="{{ :host.viewValue }}"></pacem-text></span>`, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemPasswordInputElement extends PacemTextualInputElement {

        constructor() {
            super();
        }

        @ViewChild('input[type=password]') input: HTMLInputElement;
        @ViewChild('span.pacem-readonly') span: HTMLSpanElement;

        protected get inputFields(): HTMLInputElement[] {
            return [this.input];
        }

        protected toggleReadonlyView(readonly: boolean) {
            this.input.hidden = readonly;
            this.span.hidden = !readonly;
        }

        protected getViewValue(val: any): string {
            return Utils.leftPad('', Math.floor(8 + 3 * Math.random()), '•');
        }

    }

}