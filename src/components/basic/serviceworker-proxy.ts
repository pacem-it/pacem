/// <reference path="types.ts" />
namespace Pacem.Components {

    function base64ToUint8Array(base64: string) {
        const padding = '='.repeat((4 - base64.length % 4) % 4);
        base64 = (base64 + /*ensure correct length*/ padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const output = new Uint8Array(rawData.length);

        for (var i = 0; i < rawData.length; i++) {
            output[i] = rawData.charCodeAt(i);
        }
        return output;
    }

    @CustomElement({ tagName: P + '-serviceworker-proxy' })
    export class PacemServiceWorkerProxyElement extends PacemEventTarget {

        /** @readonly */
        @Watch() registration: ServiceWorkerRegistration;
        /** @readonly */
        @Watch() pushSubscription: PushSubscription;
        @Watch({ emit: false, converter: PropertyConverters.String }) src: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) publicKey: string;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._tryRegister();
        }

        disconnectedCallback() {
            this._tryUnregister();
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'pushSubscription':
                    if (!Utils.isNull(old)) {
                        this.dispatchEvent(new CustomEvent('unsubscribe', { detail: old }));
                    }
                    if (!Utils.isNull(val)) {
                        this.dispatchEvent(new CustomEvent('subscribe', { detail: val }));
                    }
                    break;
                case 'registration':
                    if (!Utils.isNull(old)) {
                        this.dispatchEvent(new CustomEvent('unregister', { detail: old }));
                    }
                    if (!Utils.isNull(val)) {
                        this.dispatchEvent(new CustomEvent('register', { detail: val }));
                    }
                    break;
            }
        }

        private _tryUnregister(reg = this.registration): Promise<boolean> {
            if (!Utils.isNull(reg)) {
                return reg.unregister();
            }
            return Promise.resolve(true);
        }

        private _tryRegister(src = this.src) {
            this._tryUnregister().then(_ => {

                // register new sw
                if (!Utils.isNullOrEmpty(src) && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.register(src)
                        .then(reg => {
                            this.registration = reg;

                            if ('PushManager' in window) {
                                reg.pushManager.getSubscription().then(sub => {
                                    this.pushSubscription = sub;
                                });
                            }

                        });
                }
            });
        }

        unsubscribe(subscription: PushSubscription = this.pushSubscription): Promise<boolean> {

            return new Promise((resolve, reject) => {

                if (!Utils.isNull(subscription)) {

                    const refresh = subscription === this.pushSubscription;
                    subscription.unsubscribe().then(result => {

                        if (refresh) {
                            // triggers 'unsubscribe' event
                            this.pushSubscription = null;
                        }

                        resolve(result);
                    });
                } else {

                    resolve(false);
                }
            });
        }

        subscribe(publicKey: string | Uint8Array = this.publicKey): Promise<PushSubscription> {
            return new Promise((resolve, reject) => {

                if (typeof publicKey === 'string') {
                    publicKey = base64ToUint8Array(publicKey);
                }

                const push = this.registration?.pushManager;
                if (!Utils.isNull(push)) {
                    push.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: publicKey
                    }).then(subscription => {
                        if (Notification.permission === 'denied') {
                            resolve(this.pushSubscription = null);
                        } else {
                            resolve(/* triggers 'subscribe' event */
                                this.pushSubscription = subscription
                            );
                        }
                    });
                } else {

                    // no PushManager available
                    resolve(null);
                }
            });
        }
    }
}