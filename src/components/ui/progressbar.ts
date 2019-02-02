/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-progressbar', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${PCSS}-progressbar">
    <div class="${PCSS}-bar"></div>
    <span class="${PCSS}-caption"></span>
</div>`
    })
    export class PacemProgressbarElement extends PacemElement implements OnPropertyChanged {

        constructor() {
            super('progressbar');
        }

        @ViewChild('.'+ PCSS +'-bar') private _bar: HTMLDivElement;
        @ViewChild('.'+ PCSS +'-caption') private _caption: HTMLSpanElement;
        @Watch({ emit: false, converter: PropertyConverters.String }) caption: string;
        @Watch({ converter: PropertyConverters.Number }) percentage: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'percentage':
                    this._bar.style.transform = `translateX(${(-100 + (val || 0))}%)`;
                    if (Utils.isNullOrEmpty(this.caption))
                        this._caption.textContent = Utils.leftPad(Math.floor(val), 2, '0') + '%';
                    break;
                case 'caption':
                    this._caption.textContent = val;
                    break;
            }
        }
    }

}