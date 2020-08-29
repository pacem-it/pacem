/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="char-counter.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {
    
    @CustomElement({ tagName: P + '-input-password', template: `<input type="password" class="${PCSS}-input ${PCSS}-viewfinder" />${ CHAR_COUNTER_CHILD }<span class="${PCSS}-readonly"><${ P }-text text="{{ :host.viewValue }}"></${ P }-text></span>`, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemPasswordInputElement extends PacemTextualInputElement {

        constructor() {
            super();
        }

        @ViewChild('input[type=password]') input: HTMLInputElement;
        @ViewChild(`span.${PCSS}-readonly`) span: HTMLSpanElement;

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