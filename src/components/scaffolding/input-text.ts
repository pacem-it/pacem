/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
/// <reference path="char-counter.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: P + '-input-text',
        template: `<input type="text" class="${PCSS}-input" />${CHAR_COUNTER_CHILD}<span class="${PCSS}-readonly"><${P}-text text="{{ :host.viewValue }}"></${P}-text></span>`,
        shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemTextInputElement extends PacemTextualInputElement {

        constructor() {
            super();
        }

        @ViewChild('input[type=text]') private _input: HTMLInputElement;
        @ViewChild('span.' + PCSS + '-readonly') private _span: HTMLSpanElement;

        protected toggleReadonlyView(readonly: boolean) {
            this._span.hidden = !readonly;
            this._input.hidden = readonly;
        }

        protected get inputFields(): HTMLInputElement[] {
            return [this._input];
        }

    }

}