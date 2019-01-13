/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {
    
    @CustomElement({
        tagName: 'pacem-input-color', template: `<div class="pacem-viewfinder">
<pacem-panel class="pacem-input-color" css="{{ { \'background-color\': :host.viewValue } }}"><input type="color" class="pacem-input" /></pacem-panel>
<input class="pacem-input" type="number" min="0" max="100" step="1" value="100" />
</div>
<pacem-span class="pacem-readonly" css="{{ { \'background-color\': :host.viewValue } }}"></pacem-span>`,
        shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemColorInputElement extends PacemBaseElement {

        protected acceptValue(val: any) {
            const parsed = this._parseValue(val);
            if (parsed != null) {
                this._tint.value = parsed.tint;
                this._alpha.value = parsed.alpha.toString();
            }
        }

        protected convertValueAttributeToProperty(attr: string) {
            return attr;
        }

        protected onChange(evt?: Event): PromiseLike<any> {
            // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/669685/ (bug open since Aug 2014!)
            const alpha = this._alpha.valueAsNumber || parseInt(this._alpha.value);
            const tint = this._tint.value;
            const value = this.value = this._getValue(tint, alpha);
            return Utils.fromResult(value);
        }

        constructor() {
            super();
        }

        @ViewChild('input[type=color]') _tint: HTMLInputElement;
        @ViewChild('input[type=number]') _alpha: HTMLInputElement;
        @ViewChild('.pacem-viewfinder') _wrapper: HTMLElement;
        @ViewChild('.pacem-readonly') _span: PacemSpanElement;

        protected toggleReadonlyView(readonly: boolean) {
            this._wrapper.hidden = readonly;
            this._span.hidden = !readonly;
        }

        private _getValue(tint: string, alpha: number) {
            // #rrggbb
            if (isNaN(alpha) || alpha === 100)  return tint;
            // rgba(r,g,b,a)
            const r = parseInt(tint.substr(1, 2), 16);
            const g = parseInt(tint.substr(3, 2), 16);
            const b = parseInt(tint.substr(5, 2), 16);
            return `rgba(${r},${g},${b},${ alpha * .01 })`;
        }

        private _parseValue(val: string): { tint: string, alpha: number } {
            var rgba: RegExpExecArray;
            if ((rgba = /^rgba?\(([\d,\s\.]+)\)$/.exec(val)) != null) {
                let core = rgba[1].split(',');
                if (core.length >= 3) {
                    const fn = (x) => Utils.leftPad(parseInt(x).toString(16), 2, '0');
                    const r = fn(core[0]);
                    const g = fn(core[1]);
                    const b = fn(core[2]);
                    const a = core.length > 3 ? parseFloat(core[3]) : 1;
                    return { tint: '#'+r+g+b, alpha: Math.round(Math.max(0, Math.min(1, (isNaN(a) ? 1 : a))) * 100) };
                }
            } else if (/^#[0-9a-fA-F]{3,6}/.test(val) === true) {
                let rgb = val.substr(1);
                if (rgb.length === 3) {
                    rgb = rgb.charAt(0) + rgb.charAt(0) + rgb.charAt(1) + rgb.charAt(1) + rgb.charAt(2) + rgb.charAt(2);
                }
                return { tint: '#' + rgb, alpha: 100 };
            }
            return null;
        }

        protected getViewValue(value: any): string {
            return value;
        }

        protected get inputFields(): HTMLInputElement[] {
            return [this._tint, this._alpha];
        }

    }

}