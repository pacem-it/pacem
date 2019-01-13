/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />

namespace Pacem.Components {

    export declare type ElementBounds = {
        left: number, top: number, width: number, height: number
    };

    export class AdjustEvent extends CustomTypedEvent<ElementBounds> {
        
        constructor(size: ElementBounds) {
            super('adjust', size )
        }
    }

    @CustomElement({ tagName: 'pacem-overlay' })
    export class PacemOverlayElement extends PacemEventTarget {

        constructor() {
            super();
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'target':
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
            let el = this.target;
            cancelAnimationFrame(this._timer);
            if (!this.disabled && !Utils.isNull(el)) {
                this._previousHeight = el.offsetHeight;
                this._previousWidth = el.offsetWidth;
                const offset = Utils.offset(el);
                this._previousLeft = offset.left;
                this._previousTop = offset.top;
                this._timer = requestAnimationFrame(this._check);
            }
        }

        private _check = (_?) => {
            let el = this.target;
            const offset = Utils.offset(el),
                width = offset.width,
                height = offset.height;
            if (height != this._previousHeight
                || width != this._previousWidth
                || offset.left != this._previousLeft
                || offset.top != this._previousTop) {
                this._previousHeight = height;
                this._previousWidth = width;
                this._previousLeft = offset.left;
                this._previousTop = offset.top;
                this._adjust();
            }
            this._timer = requestAnimationFrame(this._check);
        }

        @Watch({ emit: false, converter: PropertyConverters.Element }) target: HTMLElement;

        @Debounce()
        private _adjust() {
            this.dispatchEvent(new AdjustEvent({
                top: this._previousTop, left: this._previousLeft, width: this._previousWidth, height: this._previousHeight
            }));
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


