/// <reference path="./types.ts" />
/// <reference path="router.ts" />
namespace Pacem.Components {

    @CustomElement({ tagName: P + '-beforeunload' })
    export class PacemBeforeunloadElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.String }) message: string;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) active: boolean;

        private _unloadingHandler = (evt: RouterNavigatingEvent | BeforeUnloadEvent) => {
            const msg = this.message;
            if (!this.active || this.disabled) {
                return;
            }

            if (evt.type === 'beforeunload') {
                evt.preventDefault();
                evt.returnValue = msg || '';
            } else if (!confirm(msg || 'Leave page?')) {
                evt.preventDefault();
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            window.addEventListener('navigating', this._unloadingHandler, false);
            window.addEventListener('beforeunload', this._unloadingHandler, false);
        }

        disconnectedCallback() {
            window.removeEventListener('navigating', this._unloadingHandler, false);
            window.removeEventListener('beforeunload', this._unloadingHandler, false);
            super.disconnectedCallback();
        }


    }

}