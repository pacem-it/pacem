/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    const ANIM_TIMEOUT = 500;

    @CustomElement({
        tagName: P + '-view'
    })
    export class PacemViewElement extends PacemEventTarget implements OnPropertyChanged, OnViewActivated {

        @Watch({ reflectBack: true, converter: PropertyConverters.String }) url: string;
        @Watch({ converter: PropertyConverters.Boolean }) fetching: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) renderErrors: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) followRedirects: boolean;
        /** use it to ensure animation */
        @Watch({ converter: PropertyConverters.Number }) debounce: number;


        private _fetchHandle: number;
        private _renderHandle: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            // url
            if (name === 'url') {
                this._manage();
            } else if (name === 'fetching') {
                (val ? Utils.addClass : Utils.removeClass)(this, 'view-fetching');
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (this._isReference(this.url))
                this._manageRef();
        }

        private _isReference(url: string): boolean {
            return !Utils.isNullOrEmpty(url) && url.trim().startsWith('#');
        }

        private _manage() {
            const debounce = this.debounce || 0;
            if (this._isReference(this.url)) {
                // <template>-based
                clearTimeout(this._fetchHandle);
                this._fetchHandle = setTimeout(<TimerHandler>(() => this._manageRef()), debounce);

            } else if (!Utils.isNullOrEmpty(this.url)) {
                // url-based
                this.fetching = true;
                clearTimeout(this._fetchHandle);
                this._fetchHandle = setTimeout(<TimerHandler>(() => this._manageUrl()), debounce);
            } else /* might be a reset */ {
                this.innerHTML = '';
            }
        }

        private _manageRef() {
            const url = this.url,
                tmpl = <HTMLTemplateElement>document.querySelector('template' + url);
            // this way, `this._container.innerHTML = ''` instruction will eventually let the page "scroll up"...
            this.innerHTML = '';
            cancelAnimationFrame(this._renderHandle);
            this._renderHandle = requestAnimationFrame(() => {
                if (Utils.isNull(tmpl)) {
                    this.log(Logging.LogLevel.Error, `Cannot find template ${url.substr(1)}`);
                    return;
                }
                this.appendChild((<HTMLTemplateElement>tmpl.cloneNode(true)).content);
                this._dispatchRender();
            });
        }

        private _manageUrl(url = this.url) {
            fetch(url, { credentials: 'same-origin' }).then(r => {
                if ((r.status === 301 || r.status === 302) && this.followRedirects) {
                    this._manageUrl(r.headers.get("Location"));
                } else if (r.ok || this.renderErrors) {
                    r.text().then((html) => Utils.addAnimationEndCallback(this, () => this._manageResult(html), ANIM_TIMEOUT));
                }
                // fallback to empty content.
                else this._manageResult('');
            })
        }

        private _manageResult(result: string) {
            // this way, `this._container.innerHTML = ''` instruction will eventually let the page "scroll up"...
            this.innerHTML = '';
            cancelAnimationFrame(this._renderHandle);
            this._renderHandle = requestAnimationFrame(() => {
                this.innerHTML = result;
                this.fetching = false;
                // setting fetching to `false` triggers a css class change that could/should cause a css transition to happen
                Utils.addAnimationEndCallback(this, () => {
                    this._dispatchRender();
                }, ANIM_TIMEOUT);
            });
        }

        private _dispatchRender() {
            this.dispatchEvent(new CustomEvent("render"));
        }
    }

}