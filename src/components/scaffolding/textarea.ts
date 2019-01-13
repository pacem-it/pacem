/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
/// <reference path="char-counter.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({ tagName: 'pacem-textarea', template: `<textarea class="pacem-input" pacem></textarea>${ CHAR_COUNTER_CHILD }<span class="pacem-readonly"><pacem-text text="{{ :host.viewValue }}"></pacem-text></span>`, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemTextAreaElement extends PacemTextualInputElement implements OnPropertyChanged {

        @Watch({ emit: false, converter: PropertyConverters.Number }) rows = 5;
        @Watch({ emit: false, converter: PropertyConverters.Number }) cols = 50;


        @ViewChild('textarea') private _input: HTMLTextAreaElement;
        @ViewChild('span.pacem-readonly') private _span: HTMLSpanElement;

        protected toggleReadonlyView(readonly: boolean) {
            this._span.hidden = !readonly;
            this._input.hidden = readonly;
        }

        protected get inputFields(): HTMLTextAreaElement[] {
            return [this._input];
        }

        propertyChangedCallback(name: string, old: any, val: any, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'rows'
                || name === 'cols') {
                this.inputField.setAttribute(name, val);
            }
        }

    }

}