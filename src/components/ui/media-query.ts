/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    const THRESHOLD_SM = 768;
    const THRESHOLD_MD = 992;
    const THRESHOLD_LG = 1200;
    const THRESHOLD_XL = 1824;
    const THRESHOLD_HD = 1920;
    const THRESHOLD_2K = 2048;
    const THRESHOLD_4K = 3840;
    export const MEDIAQUERY_XS = `(max-width: ${(THRESHOLD_SM-1)}px)`;
    export const MEDIAQUERY_SM = `(min-width: ${THRESHOLD_SM}px)`;
    export const MEDIAQUERY_MD = `(min-width: ${THRESHOLD_MD}px)`;
    export const MEDIAQUERY_LG = `(min-width: ${THRESHOLD_LG}px)`;
    export const MEDIAQUERY_XL = `(min-width: ${THRESHOLD_XL}px)`;
    export const MEDIAQUERY_HD = `(min-width: ${THRESHOLD_HD}px)`;
    export const MEDIAQUERY_2K = `(min-width: ${THRESHOLD_2K}px)`;
    export const MEDIAQUERY_4K = `(min-width: ${THRESHOLD_4K}px)`;
    export const MEDIAQUERY_PORTRAIT = `(orientation: portrait)`;
    export const MEDIAQUERY_LANDSCAPE = `(orientation: landscape)`;

    @CustomElement({
        tagName: P + '-media-query'
    })
    export class PacemMediaQueryElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.String }) query: string;

        /** @readonly */
        @Watch({ reflectBack: true, converter: PropertyConverters.Boolean }) isMatch: boolean;

        #mql: MediaQueryList;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._init();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'query':
                    if (!first) {
                        this._init();
                    }
                    break;
            }
        }

        disconnectedCallback() {
            this._init('');
            super.disconnectedCallback();
        }

        private _changeHandler = (evt: MediaQueryListEvent) => {

            const matches = this.isMatch = evt.matches;

            this.dispatchEvent(new Event('change'));
            this.dispatchEvent(new Event(matches ? 'match' : 'unmatch'));

        };

        private _init(q = this.query) {
            const old = this.#mql;
            if (!Utils.isNull(old)) {
                old.removeListener(this._changeHandler);
            }
            if (!Utils.isNullOrEmpty(q)) {
                const val = this.#mql = window.matchMedia(q);
                val.addListener(this._changeHandler);
                this.isMatch = val.matches;
            }
        }

    }

}