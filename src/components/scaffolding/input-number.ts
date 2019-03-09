/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {
    
    @CustomElement({ tagName: P + '-input-number', template: `<input type="number" class="${PCSS}-input ${PCSS}-viewfinder" /><span class="${PCSS}-readonly"><${ P }-text text="{{ :host.viewValue }}"></${ P }-text></span>`, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemNumberInputElement extends PacemOrdinalInputElement {

        constructor() {
            super();
        }

        @ViewChild('input[type=number]') private _input: HTMLInputElement;
        @ViewChild(`span.${PCSS}-readonly`) private _span: HTMLSpanElement;

        protected toggleReadonlyView(readonly: boolean) {
            this._span.hidden = !readonly;
            this._input.hidden = readonly;
        }

        protected get inputFields(): HTMLInputElement[] {
            return [this._input];
        }

        getViewValue(val: any): string {
            return this.value != null ? this.value.toString() : undefined;
        }

        getValue(val: string): number {
            // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/669685/ (bug open since Aug 2014!)
            const v = this.inputField.valueAsNumber || parseFloat(this.inputField.value);
            return isNaN(v) ? undefined : v;
        }

    }

}