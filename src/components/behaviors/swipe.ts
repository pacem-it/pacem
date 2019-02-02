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
        SwipeRight = 'swiperight'
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
        threshold: number;

        addEventListener(evt: SwipeEventType, listener: (evt: SwipeEvent) => void, useCapture?: boolean): void;
        removeEventListener(evt: SwipeEventType, listener: (evt: SwipeEvent) => void, useCapture?: boolean): void;
        dispatchEvent(evt: SwipeEvent): boolean;
    }
}

namespace Pacem.Components {
    const GET_VAL = CustomElementUtils.getAttachedPropertyValue;
    const SET_VAL = CustomElementUtils.setAttachedPropertyValue;
    const DEL_VAL = CustomElementUtils.deleteAttachedPropertyValue;

    const MOUSEDOWN = 'pacem:swipe:mousedown';
    const SWIPE_DATA = 'pacem:swipe:data';
    const DELEGATE = 'pacem:swipe:delegate';

    const PI_HALF = Math.PI / 2;


    const TOUCH_OPTIONS: any = { capture: false, passive: false };

    class SwipeElementDelegate {

        constructor(private _element: HTMLElement | SVGElement, private _swiper: Pacem.UI.Swiper
            , private _logFn: (level: Logging.LogLevel, message: string, category?: string) => void) {

            Utils.addClass(_element, PCSS + '-swipe-lock');
            Utils.removeClass(_element, PCSS + '-swipe-back');
            this._originalTransform = Utils.deserializeTransform(getComputedStyle(_element));
            // clientWidth causes reflow: use it only once here in the constructor.
            this._halfElementWidth = .5 * _element.clientWidth;
            window.addEventListener('mouseup', this._endHandler, false);
            window.addEventListener('touchend', this._endHandler, false);
            window.addEventListener('mousemove', this._moveHandler, false);
            window.addEventListener('touchmove', this._moveHandler, TOUCH_OPTIONS);

        }

        dispose() {
            const el = this._element;
            DEL_VAL(el, MOUSEDOWN);
            DEL_VAL(el, SWIPE_DATA);
            DEL_VAL(el, DELEGATE);
            Utils.removeClass(el, PCSS + '-swipe-lock');
            window.removeEventListener('mouseup', this._endHandler, false);
            window.removeEventListener('touchend', this._endHandler, false);
            window.removeEventListener('mousemove', this._moveHandler, false);
            window.removeEventListener('touchmove', this._moveHandler, TOUCH_OPTIONS);
        }

        private _originalTransform: { a: number, b: number, c: number, d: number, x: number, y: number };
        private _halfElementWidth: number;

        private _getCurrentPosition(evt: TouchEvent | MouseEvent) {
            return (evt instanceof MouseEvent ? { x: evt.clientX, y: evt.clientY } : { x: evt.touches[0].clientX, y: evt.touches[0].clientY });
        }

        private _refreshValues(now: { position: Point, timestamp: number }, init: { position: Point, timestamp: number }): UI.SwipeEventArgs {
            const pos = now.position,
                deltaX = pos.x - init.position.x,
                deltaTime = (now.timestamp - init.timestamp) / 1000.0 /*secs*/;
            return {
                element: this._element,
                horizontalspeed: deltaX / deltaTime,
                verticalspeed: (pos.y - init.position.y) / deltaTime,
                timestamp: now.timestamp,
                position: pos,
                t0: init['t0'] /* keep the existing one if available */ || init
            }
        }

        @Throttle(200)
        private _updateState(args: { timestamp: number, position: Point }) {
            var args1 = this._getUpdatedState(args);
            SET_VAL(this._element, SWIPE_DATA, args1);
        }

        private _getUpdatedState(args: { timestamp: number, position: Point }) {
            const el = this._element, swipe = this._swiper;
            const args0: UI.SwipeEventArgs = GET_VAL(el, SWIPE_DATA);
            return this._refreshValues(args, args0);
        }

        private _endState(args: UI.SwipeEventArgs) {
            if (!Utils.isNull(args)) {
                const swipe = this._swiper;
                const el = this._element;

                const from = Math.abs(args.t0.position.x - args.position.x);
                const kinetic = .5 * Math.pow(args.horizontalspeed, 2);
                const elastic = .5 * k_swipe * (Math.pow(swipe.threshold, 2) - Math.pow(from, 2));

                if (kinetic >= elastic) {
                    const args2 = UI.SwipeEventArgsClass.fromArgs(args);
                    this._logFn(Logging.LogLevel.Debug, `Swiping ${args2.direction}! (speed: ${args2.speed}, kinetic ${kinetic}, elastic ${elastic})`);
                    swipe.dispatchEvent(new UI.SwipeEvent(UI.SwipeEventType.Swipe, args2));
                    swipe.dispatchEvent(new UI.SwipeEvent(args2.direction === 'left' ? UI.SwipeEventType.SwipeLeft : UI.SwipeEventType.SwipeRight, args2));
                } else {
                    this._logFn(Logging.LogLevel.Debug, `Rolling back: kinetic ${kinetic} < elastic ${elastic})`);
                    Utils.addClass(el, PCSS + '-swipe-back');
                }

                el.style.transform = '';
            }
            this.dispose();
        }

        private _moveHandler = (evt: TouchEvent | MouseEvent) => {
            //avoidHandler(evt);
            //
            function getProjectedDistance(xn: number, x0: number) {
                const x = xn - x0;
                const c = swiper.threshold - w_half;
                return c * Math.sin(PI_HALF * Math.max(-1, Math.min(1, x / swiper.threshold))) / k_pan;
            }
            const el = this._element,
                currentPosition: Point = this._getCurrentPosition(evt),
                swiper = this._swiper;
            var init: { position: Point, timestamp: number },
                args: UI.SwipeEventArgs;
            const w_half = this._halfElementWidth,
                now = Date.now();

            if (!Utils.isNull(init = GET_VAL(el, MOUSEDOWN))) {
                this._logFn(Logging.LogLevel.Debug, 'Swipe act started');

                DEL_VAL(el, MOUSEDOWN);
                SET_VAL(el, SWIPE_DATA, args = this._refreshValues({ position: currentPosition, timestamp: now }, init));

            } else if (!Utils.isNull(args = GET_VAL(el, SWIPE_DATA))) {

                this._updateState({ position: currentPosition, timestamp: now });
            }

            const scrolling = Math.abs(currentPosition.x - args.t0.position.x) < Math.abs(currentPosition.y - args.t0.position.y);
            if (!scrolling)
                // might be either for scrolling (vertical swipe) or browser history navigating (horizontal swipe),
                // prevent only the latter.
                avoidHandler(evt);

            const d = getProjectedDistance(currentPosition.x, args.t0.position.x);
            this._logFn(Logging.LogLevel.Debug, `Moving element to x: ${d} (x0: ${args.t0.position.x})`);

            const m = this._originalTransform;
            //const d_pct = d / (w_half * 2);
            el.style.transform = `matrix(${m.a},${m.b},${m.c},${m.d},${(m.x + d/*_pct*/)},${m.y})`;
        }

        private _endHandler = (evt: TouchEvent | MouseEvent) => {
            var args: UI.SwipeEventArgs = GET_VAL(this._element, SWIPE_DATA); //this._getUpdatedState({ position: this._getCurrentPosition(evt), timestamp: Date.now() });
            this._endState(args);
        }
    }

    /**
     * Elasticity characteristic
     */
    const k_swipe: number = 0.15;
    const k_pan: number = 20.0;

    @CustomElement({ tagName: P + '-swipe' })
    export class PacemSwipeElement extends Pacem.Behaviors.PacemBehavior implements Pacem.UI.Swiper {

        private _startHandler = (evt: TouchEvent | MouseEvent | PointerEvent) => {
            if (this.disabled)
                return;

            var el = evt.currentTarget,
                origin: Point;

            if (evt instanceof MouseEvent) {
                origin = { x: evt.clientX, y: evt.clientY };
            } else {
                if (evt.touches.length != 1)
                    return;
                origin = { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
            }

            SET_VAL(el, MOUSEDOWN, { position: origin, timestamp: Date.now() });
            SET_VAL(el, DELEGATE, new SwipeElementDelegate(<HTMLElement | SVGElement>el, this, (level, message, category) => this.log.apply(this, [level, message, category])));
        };

        /** No return point distance on the horizontal axis (defaults to half the device screen width). */
        @Watch({ emit: false, converter: PropertyConverters.Number })
        threshold: number = window.screen.availWidth / 2.0;

        protected decorate(element: Element) {
            // TODO: https://docs.microsoft.com/en-us/microsoft-edge/dev-guide/dom/pointer-events
            element.addEventListener('touchstart', this._startHandler, TOUCH_OPTIONS);
            element.addEventListener('mousedown', this._startHandler, false);
        }

        protected undecorate(element: Element) {
            element.removeEventListener('touchstart', this._startHandler, TOUCH_OPTIONS);
            element.removeEventListener('mousedown', this._startHandler, false);
        }



    }

}