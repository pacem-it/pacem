/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    export enum LoaderType {
        Spinner = 'spin',
        Pacem = 'pacem',
        Custom = 'custom'
    };

    @CustomElement({
        tagName: P + '-loader', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${PCSS}-loader" pacem>
            <div class="${PCSS}-spinner" pacem>
                <div></div>
                <div></div>
            </div>
            <svg class="${PCSS}-spinner" pacem hidden xmlns="http://www.w3.org/2000/svg" 
                 xmlns:xlink="http://www.w3.org/1999/xlink"
                 viewBox="-18,-18,108,108" preserveAspectRatio="xMidYMid">
            </svg>
        </div>`
    })
    export class PacemLoaderElement extends PacemElement {

        @ViewChild('div.' + PCSS + '-spinner') private _spinner: HTMLElement;
        @ViewChild('div.' + PCSS + '-loader') private _container: HTMLElement;
        @ViewChild('svg') private _svgSpinner: SVGSVGElement;

        @Watch({ converter: PropertyConverters.Boolean }) active: boolean;
        @Watch({ converter: PropertyConverters.String }) type: LoaderType;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            var id = '_' + Utils.uniqueCode();
            this._svgSpinner.innerHTML = `<defs>
                    <mask id="hole${id}">
                        <rect width="100%" height="100%" fill="white" />
                        <circle cx="36" cy="36" r="12"></circle>
                        <path d="M18,0 L32,16 H40 L54,0 Z" fill="#000"></path>
                        <g transform="rotate(120,36,36)">
                            <path d="M18,0 L32,16 H40 L54,0 Z" fill="#000"></path>
                        </g>
                    </mask>
                </defs>

                <circle class="circle1" cx="36" cy="36" r="34" stroke-width="4" fill="none"></circle>
                <g class="gear">
                    <circle cx="36" cy="36" r="25" mask="url(#hole${id})"></circle>
                </g>
                <circle class="circle2" cx="36" cy="36" r="8" stroke-width="2" fill="none"></circle>

                <g class="bounds">
                    <path d="M8,0 H0 V8 M64,0 H71 V8 M71,63 V71 H64 M8,71 H0 V63" stroke-width="2"></path>
                </g>`;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!Utils.isNull(this._container)) {
                switch (name) {
                    case 'active':
                    case 'disabled':
                        if (this.active === true && !this.disabled) {
                            Utils.addClass(this._container, 'active');
                        } else {
                            Utils.removeClass(this._container, 'active');
                        }
                        break;
                    case 'type':
                        this._svgSpinner.setAttribute('hidden', 'hidden');
                        this._spinner.setAttribute('hidden', 'hidden');
                        switch (val) {
                            case LoaderType.Pacem:
                                this._svgSpinner.removeAttribute('hidden');
                                break;
                            default:
                                this._spinner.removeAttribute('hidden');
                                break;
                        }
                        break;
                }
            }
        }

    }

}