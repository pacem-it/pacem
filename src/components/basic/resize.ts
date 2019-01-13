/// <reference path="../../core/decorators.ts" />
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

    @CustomElement({ tagName: 'pacem-resize' })
    export class PacemResizeElement extends PacemEventTarget implements OnConnected, OnDisconnected, OnPropertyChanged {

        constructor() {
            super();
        }

        @Watch({ emit: false, converter: PropertyConverters.Element }) target: Element;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) watchPosition: boolean;

        private get _target() {
            return this.target || this;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'disabled':
                    this.start();
                    break;
            }
        }

        private _timer: number;

        private _previousHeight: number;
        private _previousWidth: number;
        private _previousTop: number;
        private _previousLeft: number;

        private start() {
            let el = this._target;
            if (this.disabled) {
                cancelAnimationFrame(this._timer);
            } else {
                const rect = Utils.offset(el);
                this._previousHeight = rect.height;
                this._previousWidth = rect.width;
                this._previousTop = rect.top;
                this._previousLeft = rect.left;
                this._timer = requestAnimationFrame(this._check);
            }
        }

        private _check = (_?) => {
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
                this._resize();
            }
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

        //@Debounce()
        private _resize() {
            this.dispatchEvent(new ResizeEvent(this.currentSize));
        }

        connectedCallback() {
            super.connectedCallback();
            this.start();
        }

        disconnectedCallback() {
            cancelAnimationFrame(this._timer);
            super.disconnectedCallback();
        }

    }

}


