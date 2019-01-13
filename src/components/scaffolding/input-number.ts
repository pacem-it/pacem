/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {
    
    @CustomElement({ tagName: 'pacem-input-number', template: '<input type="number" class="pacem-input pacem-viewfinder" /><span class="pacem-readonly"><pacem-text text="{{ :host.viewValue }}"></pacem-text></span>', shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemNumberInputElement extends PacemOrdinalInputElement {

        constructor() {
            super();
        }

        @ViewChild('input[type=number]') input: HTMLInputElement;
        @ViewChild('span.pacem-readonly') span: HTMLSpanElement;

        protected toggleReadonlyView(readonly: boolean) {
            this.span.hidden = !readonly;
            this.input.hidden = readonly;
        }

        protected get inputFields(): HTMLInputElement[] {
            return [this.input];
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