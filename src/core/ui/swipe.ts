/// <reference path="../maths/geom.ts" />
/// <reference path="../types.ts" />
/// <reference path="../utils.ts" />
namespace Pacem.UI {

    export declare type SwipeEventArgs = {
        horizontalspeed: number,
        verticalspeed: number,
        timestamp: number,
        position: Point,
        element: HTMLElement | SVGElement,
        t0: {
            timestamp: number,
            position: Point
        }
    };

    export enum SwipeEventType {
        Swipe = 'swipe',
        SwipeLeft = 'swipeleft',
        SwipeRight = 'swiperight',
        // end of swipe animation
        SwipeAnimationEnd = 'swipeanimationend',
        SwipeLeftAnimationEnd = 'swipeleftanimationend',
        SwipeRightAnimationEnd = 'swiperightanimationend',
    }

    export class SwipeEventArgsClass {
        private constructor(private _builder: SwipeEventArgs) {
        }

        get direction() {
            return this._builder.horizontalspeed > 0 ? 'right' : 'left';
        }

        get speed() {
            return Math.abs(this._builder.horizontalspeed);
        }

        get element() {
            return this._builder.element;
        }

        static fromArgs(builder: SwipeEventArgs) {
            return new SwipeEventArgsClass(Utils.extend({}, builder));
        }
    }

    export class SwipeEvent extends CustomTypedEvent<SwipeEventArgsClass> {

        constructor(type: SwipeEventType, args: SwipeEventArgsClass, eventInit?: EventInit) {
            super(type, args, eventInit);
        }

    }

    export interface Swiper {
        readonly threshold: number;

        addEventListener(evt: SwipeEventType, listener: (evt: SwipeEvent) => void, useCapture?: boolean): void;
        removeEventListener(evt: SwipeEventType, listener: (evt: SwipeEvent) => void, useCapture?: boolean): void;
        dispatchEvent(evt: SwipeEvent): boolean;
    }
}