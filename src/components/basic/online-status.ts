/// <reference path="../../core/types.ts" />
/// <reference path="../../core/eventtarget.ts" />
namespace Pacem.Components {

    @CustomElement({ tagName: P + '-online-status' })
    export class PacemOnlineStatusElement extends PacemEventTarget {

        @Watch({ converter: PropertyConverters.Boolean }) online: boolean;

        connectedCallback() {
            super.connectedCallback();
            window.addEventListener('online', this._onlineHandler, false);
            window.addEventListener('offline', this._onlineHandler, false);
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._onlineHandler();
        }

        disconnectedCallback() {
            window.removeEventListener('online', this._onlineHandler, false);
            window.removeEventListener('offline', this._onlineHandler, false);
            super.connectedCallback();
        }

        private _onlineHandler = (evt?: Event) => {
            if (!Utils.isNull(evt)) {
                this.online = evt.type === 'online';
            } else {
                this.online = navigator.onLine || false;
            }
        }

    }

}