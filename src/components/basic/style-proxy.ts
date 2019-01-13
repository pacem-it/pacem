/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    @CustomElement({
        tagName: 'pacem-style'
    })
    export class PacemStyleElement extends PacemEventTarget {

        @Watch({ converter: PropertyConverters.String }) src: string;

        private _style: HTMLStyleElement;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            this._update();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            const style = this._style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            document.head.appendChild(style);
            this._update();
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._style)) {
                this._style.remove();
            }
            super.disconnectedCallback();
        }

        private _update() {
            const src = this.src, style = this._style;
            if (this.disabled || Utils.isNull(style)) {
                return;
            }
            if (Utils.isNullOrEmpty(src)) {
                style.textContent = '';
            } else {
                fetch(src).then(resp => {
                    resp.text().then(css => {
                        style.textContent = css;
                    }, _ => {
                        // error
                    });
                }, _ => {
                    // error
                });
            }
        }
    }
}