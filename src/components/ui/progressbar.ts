/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-progressbar', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${PCSS}-track"><div class="${PCSS}-bar"></div></div>
    <label class="${PCSS}-caption"></label>`
    })
    export class PacemProgressbarElement extends PacemElement {

        constructor() {
            super('progressbar', { 'valuemin': '0%', 'valuemax': '100%', 'valuenow': '0%' });
        }

        @ViewChild('.' + PCSS + '-bar') private _bar: HTMLDivElement;
        @ViewChild('.' + PCSS + '-caption') private _caption: HTMLSpanElement;
        @Watch({ emit: false, converter: PropertyConverters.String }) caption: string;
        @Watch({ converter: PropertyConverters.Number }) percentage: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'percentage':
                    this._bar.style.transform = `scaleX(${((val || 0) * .01)})`;
                    let perc = Utils.leftPad(Math.floor(val), 2, '0') + '%';
                    this.aria.attributes.set('valuenow', perc);
                    if (Utils.isNullOrEmpty(this.caption)) {
                        this.aria.attributes.set('valuetext', this._caption.textContent = perc);
                    }
                    break;
                case 'caption':
                    this.aria.attributes.set('valuetext',this._caption.textContent = val);
                    break;
            }
        }
    }

}