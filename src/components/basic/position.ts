/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />

namespace Pacem.Components {

    export const PositionChangeEventName = 'positionchange';

    export declare type PositionChangeEventArgs = {
        top: number,
        left: number
    };

    export class PositionChangeEvent extends CustomTypedEvent<PositionChangeEventArgs> {

        constructor(args: PositionChangeEventArgs) {
            super(PositionChangeEventName, args);
        }
    }

    @CustomElement({ tagName: 'pacem-position' })
    export class PacemPositionElement extends PacemEventTarget implements OnConnected, OnDisconnected, OnPropertyChanged {

        constructor() {
            super();
        }

        @Watch({ emit: false, converter: PropertyConverters.Element }) target: HTMLElement;

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

        private previousTop: number;
        private previousLeft: number;

        private start() {
            let el = this._target;
            if (this.disabled) {
                cancelAnimationFrame(this._timer);
            } else {
                var pos = Utils.offset(el);
                this.previousTop = pos.top;
                this.previousLeft = pos.left;
                this._timer = requestAnimationFrame(this._check);
            }
        }

        private _check = (_?) => {
            let el = this._target;
            var pos = Utils.offset(el);
            let top = pos.top;
            let left = pos.left;
            if (top != this.previousTop
                || left != this.previousLeft) {
                this.previousTop = top;
                this.previousLeft = left;
                this._change();
            }
            this._timer = requestAnimationFrame(this._check);
        }

        //@Debounce()
        private _change() {
            this.dispatchEvent(new PositionChangeEvent({ top: this.previousTop, left: this.previousLeft }));
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


