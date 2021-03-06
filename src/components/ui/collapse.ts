﻿/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-collapse', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${PCSS}-collapse"><${P}-resize on-${ResizeEventName}=":host._resize($event)"><${P}-content></${P}-content></${P}-resize></div>`
    })
    export class PacemCollapseElement extends PacemEventTarget implements OnPropertyChanged, OnViewActivated {

        @ViewChild(`.${PCSS}-collapse`) private _container: HTMLDivElement;
        @ViewChild(P + '-resize') private _resizer: PacemResizeElement;
        @Watch({ converter: PropertyConverters.Boolean }) collapse: boolean;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) horizontal: boolean;
        private _state: ResizeEventArgs;

        private _resize(evt: ResizeEvent) {
            this._state = evt.detail;
            this._toggle();
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'collapse':
                    this._toggle();
                    break;
                case 'disabled':
                    this._resizer.disabled = val;
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._state = this._resizer.currentSize;
            this._toggle();
        }

        private _toggle() {
            const div = this._container,
                collapse = this.collapse,
                state = this._state;
            if (this.disabled || Utils.isNull(div)) return;
            //
            div.style.height = collapse ? '0' : (state && state.height + 'px') || '';
            if (this.horizontal) {
                Utils.addClass(div, PCSS + '-horizontal');
                div.style.width = collapse ? '0' : (state && state.width + 'px') || '';
            } else {
                Utils.removeClass(div, PCSS + '-horizontal');
            }
        }
    }

}