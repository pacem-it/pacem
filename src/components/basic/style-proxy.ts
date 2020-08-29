/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    @CustomElement({
        tagName: P + '-style-proxy'
    })
    export class PacemStyleProxyElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.String }) src: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) cssText: string;
        @Watch({ converter: PropertyConverters.Boolean }) cssReady: boolean;

        private _style: HTMLStyleElement;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'cssText':
                    if (!Utils.isNull(this._style)) {
                        this.cssReady = false;
                        this._style.textContent = val;
                        if (Utils.isNullOrEmpty(val)) {
                            this.cssReady = true;
                        } else {
                            this._idleWhileReady();
                        }
                    }
                    break;
                case 'disabled':
                case 'src':
                    this._fetch();
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            const style = this._style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            document.head.appendChild(style);
            this._fetch();
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._style)) {
                this._style.remove();
            }
            super.disconnectedCallback();
        }

        private _idleWhileReady() {
            let css = <CSSStyleSheet>this._style.sheet;
            let fn = () => {
                try {
                    if (css.cssRules.length > 0) {
                        clearInterval(handle);
                        this.cssReady = true;
                        this.dispatchEvent(new Event('cssready'));
                    }
                } catch (e) { }
            }
            let handle = setInterval(fn, 100);
        }

        private _fetch() {
            const src = this.src, style = this._style;
            if (this.disabled || Utils.isNull(style)) {
                return;
            }
            if (Utils.isNullOrEmpty(src)) {
                style.textContent = this.cssText || '';
            } else {

                // fetching
                this.cssReady = false;
                fetch(src).then(resp => {
                    resp.text().then(css => {
                        style.textContent = css;
                        this._idleWhileReady();
                    }, _ => {
                        // error
                        this.cssReady = true;
                    });
                }, _ => {
                    // error
                    this.cssReady = true;
                });
            }
        }
    }
}