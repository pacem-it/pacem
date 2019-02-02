/// <reference path="items-container.ts" />
/// <reference path="types.ts" />

namespace Pacem.Components {

    @CustomElement({ tagName: P + '-hub-listener' })
    export class PacemHubListener extends PacemItemElement {

        @Watch({ emit: false, converter: PropertyConverters.String }) method: string;

        onreceive = (...args) => {
            this.dispatchEvent(new CustomEvent('receive', { detail: Array.from(args) }));
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (this.container instanceof PacemHubProxy && !Utils.isNull(this.container.connection)) {
                const conn = this.container.connection;
                switch (name) {
                    case 'method':
                        if (!Utils.isNullOrEmpty(old))
                            conn.off(old, this.onreceive);
                        if (!Utils.isNullOrEmpty(val))
                            conn.on(val, this.onreceive);
                        break;
                    case 'disabled':
                        if (!Utils.isNullOrEmpty(this.method)) {
                            let onoff = val ? conn.off : conn.on;
                            onoff(this.method, this.onreceive);
                        }
                        break;
                }
            }
        }
    }

    export declare type HubMethodCallback = (...args) => void;

    @CustomElement({ tagName: P + '-hub-proxy' })
    export class PacemHubProxy extends PacemItemsContainerElement<PacemHubListener> {

        validate(item: PacemHubListener): boolean {
            return item instanceof PacemHubListener;
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) url: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) accesstoken: string;
        @Watch({ converter: PropertyConverters.Boolean }) connected: boolean

        private _hub: signalR.HubConnection;
        get connection() {
            return this._hub;
        }

        invoke(method: string, ...args: any[]): PromiseLike<any> {
            if (this.connected)
                return this._hub.invoke.apply(this._hub, arguments);
            throw 'Hub is not connected. Cannot call `invoke` method.';
        }

        send(method: string, ...args: any[]): PromiseLike<void> {
            if (this.connected)
                return this._hub.send.apply(this._hub, arguments);
            throw 'Hub is not connected. Cannot call `send` method.';
        }

        start() {
            this._resetProxy();
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            //
            if (name === 'url' || name === 'disabled' || name === 'accesstoken') {
                this._resetProxy();
            }
        }

        disconnectedCallback() {
            if (this.connected) {
                this._hub.stop();
            }
            super.disconnectedCallback();
        }

        private async _resetProxy() {
            if (!Utils.isNull(this._hub)) {
                await this._hub.stop();
                this.connected = false;
                this._setupProxy();
            } else {
                this._setupProxy();
            }
        }

        private async _setupProxy() {
            if (!this.disabled && !Utils.isNullOrEmpty(this.url)) {
                const connBuilder = new signalR.HubConnectionBuilder();
                connBuilder.withUrl(this.url, {
                    accessTokenFactory: () => this.accesstoken
                });
                const h = this._hub = connBuilder.build();
                h.onclose(() => {
                    this.connected = false;
                    this._hub = null;
                });
                await h.start();
                this.connected = true;
                // on(...)
                for (var item of this.items) {
                    if (item.disabled || Utils.isNullOrEmpty(item.method))
                        continue;
                    h.on(item.method, item.onreceive);
                }
            }
        }
    }
}