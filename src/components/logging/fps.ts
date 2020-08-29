/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Logging {

    @CustomElement({
        tagName: P + '-fps'
    })
    export class PacemFpsElement extends PacemTrackerElement implements OnViewActivated, OnDisconnected {

        constructor() {
            super();
        }

        private _handle: number;

        private _start(t0 = Date.now()) {
            this._handle = requestAnimationFrame(() => {

                const t1 = Date.now(),
                    msecs = t1 - t0;
                // sets new entry
                this.entry = Math.min(60, 1000.0 / msecs);
                this._start(t1);
            });
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._start();
        }

        disconnectedCallback() {
            cancelAnimationFrame(this._handle);
            super.disconnectedCallback();
        }

    }

}