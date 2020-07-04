
namespace Pacem.UI {

    export enum RescaleHandle {
        All = 'all',
        Top = 'top',
        Left = 'left',
        Right = 'right',
        Bottom = 'bottom'
    }

    export declare type RescaleEventArgs = {
        element: HTMLElement,
        origin: Point,
        currentPosition: Point,
        startTime: number,
        handle: string,
        targetRect?: Rect
    };

    export enum RescaleEventType {
        Start = 'rescalestart',
        Rescale = 'rescale',
        End = 'rescaleend',
    }

    export class RescaleEventArgsClass {

        private constructor(private _builder: RescaleEventArgs) {
        }

        get currentPosition() {
            return this._builder.currentPosition;
        }

        get targetRect() {
            return this._builder.targetRect;
        }

        get element() {
            return this._builder.element;
        }

        get handle() {
            return this._builder.handle;
        }

        static fromArgs(builder: RescaleEventArgs) {
            return new RescaleEventArgsClass(Utils.extend({}, builder));
        }
    }

    export class RescaleEvent extends CustomUIEvent<RescaleEventArgsClass> {

        constructor(type: RescaleEventType, args: RescaleEventArgsClass, eventInit?: EventInit, evt?: MouseEvent | TouchEvent) {
            super(type, args, eventInit, evt);
        }

    }

    export interface Rescaler {

        handles: RescaleHandle[];
        minWidth: number;
        maxWidth: number;
        maxHeight: number;
        minHeight: number;

        addEventListener(evt: RescaleEventType, listener: (evt: SwipeEvent) => void, useCapture?: boolean): void;
        removeEventListener(evt: RescaleEventType, listener: (evt: SwipeEvent) => void, useCapture?: boolean): void;
        dispatchEvent(evt: RescaleEvent): boolean;
    }
}