/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
/// <reference path="char-counter.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: 'pacem-input-text',
        template: `<input type="text" class="pacem-input" />${ CHAR_COUNTER_CHILD }<span class="pacem-readonly"><pacem-text text="{{ :host.viewValue }}"></pacem-text></span>`,
        shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemTextInputElement extends PacemTextualInputElement {

        constructor() {
            super();
        }

        @ViewChild('input[type=text]') private _input: HTMLInputElement;
        @ViewChild('span.pacem-readonly') private _span: HTMLSpanElement;

        protected toggleReadonlyView(readonly: boolean) {
            this._span.hidden = !readonly;
            this._input.hidden = readonly;
        }

        protected get inputFields(): HTMLInputElement[] {
            return [this._input];
        }

    }

}