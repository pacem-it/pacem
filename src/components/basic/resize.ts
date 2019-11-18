/// <reference path="../../core/decorators.ts" />
/// <reference path="../../../dist/js/resize-observer.d.ts" />
/// <reference path="types.ts" />

namespace Pacem.Components {

    export const ResizeEventName = 'resize';

    export declare type ResizeEventArgs = {
        width: number,
        height: number,
        top?: number,
        left?: number
    };

    export class ResizeEvent extends CustomTypedEvent<ResizeEventArgs> {

        constructor(args: ResizeEventArgs) {
            super(ResizeEventName, args);
        }
    }

    /** Might be not the case to switch to native due to the lacks of their APIs */
    const GO_NATIVE_WHEN_AVAIL = false;
    const RESIZEOBSERVER_POLYFILLED = !('ResizeObserver' in window) || !GO_NATIVE_WHEN_AVAIL;
    const BORDER_BOX: { box: 'border-box' | 'content-box' } = { box: 'border-box' };

    @CustomElement({ tagName: P + '-resize' })
    export class PacemResizeElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.Element }) target: Element;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) watchPosition: boolean;

        private get _target() {
            return this.target || this;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'disabled':
                    this._start();
                    break;
                case 'target':
                    if (!Utils.isNull(this._observer)) {
                        var oldTarget = old || this;
                        this._observer.unobserve(oldTarget);
                    }
                case 'watchPosition':
                    if (!this._usePolyfill) {
                        var newTarget = val || this;
                        this._observer.observe(newTarget, BORDER_BOX);
                    }
                    break;
            }
        }

        private get _usePolyfill(): boolean {
            return RESIZEOBSERVER_POLYFILLED || this.watchPosition;
        }

        private _timer: number;

        private _previousHeight: number;
        private _previousWidth: number;
        private _previousTop: number;
        private _previousLeft: number;
        private _observer: ResizeObserver;

        private _start() {

            // disabled? switch to stop
            if (this.disabled) {
                this._stop();
                return;
            }

            let el = this._target;

            if (RESIZEOBSERVER_POLYFILLED) {

                // polyfill
                const rect = Utils.offset(el);
                this._previousHeight = rect.height;
                this._previousWidth = rect.width;
                this._previousTop = rect.top;
                this._previousLeft = rect.left;
                this._timer = requestAnimationFrame(this._check);


            } else {

                // native ResizeObserver
                if (Utils.isNull(this._observer)) {
                    this._observer = new ResizeObserver(entries => {

                        var changed = false;
                        for (let entry of entries) {
                            if (entry.target !== this.target) {
                                continue;
                            }
                            if (entry.contentRect) {
                                changed = true;
                                break;
                            }
                        }
                        if (changed) {
                            // ResizeObserverEntry pieces of info aren't accurate,
                            // but useful enough to let punctually debounce
                            // the expensive request
                            this._assignSizeDebounced();
                        }

                    });
                    this._observer.observe(this._target, BORDER_BOX);
                    window.addEventListener('resize', this._checkSizeHandler, false);
                }
            }
        }

        private _stop() {
            if (RESIZEOBSERVER_POLYFILLED) {
                cancelAnimationFrame(this._timer);
            } else if (!Utils.isNull(this._observer)) {
                window.removeEventListener('resize', this._checkSizeHandler, false);
                this._observer.disconnect();
                this._observer = null;
            }
        }

        private _checkSizeHandler = (e) => {
            this._assignSizeDebounced();
        }

        @Debounce(25)
        private _assignSizeDebounced() {
            this._checkSize();
        }

        private _checkSize() {
            let el = this._target;
            const rect = Utils.offset(el);
            let height = rect.height;
            let width = rect.width;
            if (height != this._previousHeight
                || width != this._previousWidth
                || (this.watchPosition &&
                    (rect.left != this._previousLeft
                        || rect.top != this._previousTop))) {
                this._previousHeight = height;
                this._previousWidth = width;
                this._previousLeft = rect.left;
                this._previousTop = rect.top;
                this._dispatchResize();
            }
        }

        private _check = (_?) => {
            this._checkSize();
            if (!this.disabled)
                this._timer = requestAnimationFrame(this._check);
        }

        get currentSize() {
            var args: ResizeEventArgs = { height: this._previousHeight, width: this._previousWidth };
            if (this.watchPosition) {
                args.left = this._previousLeft;
                args.top = this._previousTop;
            }
            return args;
        }

        private _dispatchResize() {
            this.dispatchEvent(new ResizeEvent(this.currentSize));
        }

        connectedCallback() {
            super.connectedCallback();
            this._start();
        }

        disconnectedCallback() {
            this._stop();
            super.disconnectedCallback();
        }

    }

}


