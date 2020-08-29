/// <reference path="types.ts" />
namespace Pacem.Components {

    @CustomElement({ tagName: P + '-webworker-proxy' })
    export class PacemWebWorkerProxyElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.String }) message: any;

        /** @readonly */
        @Watch({ converter: PropertyConverters.String }) result: any;
        @Watch({ emit: false, converter: PropertyConverters.String }) src: string;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Boolean }) autosend: boolean = true;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._initializeWorker();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'src':
                        this._disposeWorker();
                        this._initializeWorker(val);
                        break;
                    case 'autosend':
                    case 'disabled':
                    case 'message':
                        if (this.autosend) {
                            this.send(this.message);
                        }
                        break;
                }
            }
        }

        disconnectedCallback() {
            this._disposeWorker();
            super.disconnectedCallback();
        }

        send(message = this.message) {
            if (this.disabled) {
                return;
            }
            const worker = this._worker;
            if (!Utils.isNull(worker)) {
                worker.postMessage(message);
            }
        }

        private _messageHandler = (evt: MessageEvent) => {
            this.result = evt.data;
            this.dispatchEvent(new CustomEvent('receive', { detail: evt.data, bubbles: false, cancelable: false }));
        }

        private _errorHandler = (evt: ErrorEvent) => {
            this.dispatchEvent(new CustomEvent('error', { detail: evt.error, bubbles: false, cancelable: false }));
        }

        private _worker: Worker;
        private _initializeWorker(src = this.src) {
            if (!Utils.isNullOrEmpty(src)) {
                const worker = this._worker = new Worker(src);
                worker.addEventListener('message', this._messageHandler, false);
                worker.addEventListener('error', this._errorHandler, false);
            }
        }

        private _disposeWorker(worker = this._worker) {
            if (!Utils.isNull(worker)) {
                worker.removeEventListener('error', this._errorHandler, false);
                worker.removeEventListener('message', this._messageHandler, false);
                worker.terminate();
            }
        }
    }
}