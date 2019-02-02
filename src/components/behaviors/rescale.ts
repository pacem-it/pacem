/// <reference path="../basic/types.ts" />
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

    export class RescaleEvent extends CustomTypedEvent<RescaleEventArgsClass> {

        constructor(type: RescaleEventType, args: RescaleEventArgsClass, eventInit?: EventInit) {
            super(type, args, eventInit);
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

namespace Pacem.Components {

    const handlesConverter: PropertyConverter = {
        convert: attr => {
            return attr && attr.trim().split(' ');
        },
        convertBack: prop => (prop && prop.join(' ')) || ''
    };

    class RescaleElementDelegate {
        constructor(private _element: HTMLElement, private _type: string, private _rescaler: Pacem.UI.Rescaler
            , private _logFn: (level: Logging.LogLevel, message: string, category?: string) => void) {
            window.addEventListener('mouseup', this._endHandler, false);
            window.addEventListener('touchend', this._endHandler, false);
            window.addEventListener('mousemove', this._moveHandler, false);
            window.addEventListener('touchmove', this._moveHandler, false);
            this._origin =
                this._position =
                GET_VAL(_element, MOUSE_DOWN);
            this._rect =
                this._targetRect =
                Utils.offsetRect(_element);
            //
            this._originalTransform = Utils.deserializeTransform(getComputedStyle(_element));
            // body
            Utils.addClass(document.body, PCSS + '-rescaling rescale-' + _type);
        }

        private _rect: Rect;
        private _targetRect: Rect;
        private _origin: Point;
        private _position: Point;
        private _startTime: number = Date.now();
        private _originalTransform: { a: number, b: number, c: number, d: number, x: number, y: number };

        private _moveHandler = (evt: MouseEvent | TouchEvent) => {
            evt.stopPropagation();
            var el = this._element,
                origin = this._origin,
                rescaler = this._rescaler,
                handle = this._type,
                minWidth = rescaler.minWidth || 0,
                minHeight = rescaler.minHeight || 0,
                maxWidth = rescaler.maxWidth || Number.MAX_SAFE_INTEGER,
                maxHeight = rescaler.maxHeight || Number.MAX_SAFE_INTEGER,
                currentPosition: Point = (evt instanceof MouseEvent ? { x: evt.clientX, y: evt.clientY } : { x: evt.touches[0].clientX, y: evt.touches[0].clientY }),
                position: Point = Utils.extend({}, currentPosition);
            switch (this._type) {
                case 'top':
                case 'bottom':
                    position.x = origin.x;
                    break;
                case 'left':
                case 'right':
                    position.y = origin.y;
                    break;
            }


            this._position = position;

            var delta: Point = { x: position.x - origin.x, y: position.y - origin.y },
                // bottonright as default
                desiredRect: Rect = { x: this._rect.x, y: this._rect.y, width: this._rect.width + delta.x, height: this._rect.height + delta.y };
            if (handle.startsWith('top')) {
                desiredRect.y = this._rect.y + delta.y;
                desiredRect.height = this._rect.height - delta.y;
            }
            if (handle.endsWith('left')) {
                desiredRect.x = this._rect.x + delta.x;
                desiredRect.width = this._rect.width - delta.x;
            }

            this._logFn(Logging.LogLevel.Log,`handle: ${ handle }, origin: ${ JSON.stringify(origin) }, currentPosition: ${ JSON.stringify(currentPosition) }`, `Rescaling`);
            this._logFn(Logging.LogLevel.Log, `delta: ${JSON.stringify(delta)}, position: ${JSON.stringify(position)}`, `Rescaling`);
            this._logFn(Logging.LogLevel.Log, `from: ${JSON.stringify(this._rect)}, to: ${JSON.stringify(desiredRect)}`, `Rescaling`);

            // check constraints
            const horizontally = desiredRect.width >= minWidth && desiredRect.width <= maxWidth,
                vertically = desiredRect.height >= minHeight && desiredRect.height <= maxHeight;

            if (!horizontally) {
                // reset to the last valid horizontal configuration
                desiredRect.x = this._targetRect.x;
                desiredRect.width = this._targetRect.width;
            }

            if (!vertically) {
                // reset to the last valid vertical configuration
                desiredRect.y = this._targetRect.y;
                desiredRect.height = this._targetRect.height;
            }

            if (horizontally || vertically) {

                // dispatch
                const args: UI.RescaleEventArgs = {
                    currentPosition: position, element: el,
                    handle: handle, origin: origin, targetRect: (this._targetRect = desiredRect), startTime: this._startTime
                };
                let evt = new UI.RescaleEvent(UI.RescaleEventType.Rescale, UI.RescaleEventArgsClass.fromArgs(args), { cancelable: true });
                rescaler.dispatchEvent(evt);
                if (!evt.defaultPrevented) {
                    // render resize
                    const m = this._originalTransform;
                    el.style.transform = `matrix(${m.a},${m.b},${m.c},${m.d},${(m.x + desiredRect.x - this._rect.x)},${(m.y + desiredRect.y - this._rect.y)})`;
                    el.style.width = desiredRect.width + 'px';
                    el.style.height = desiredRect.height + 'px';
                }
            }
        }

        private _endHandler = (e: MouseEvent | TouchEvent) => {
            e.stopPropagation();
            const handle = this._type;
            let evt = new UI.RescaleEvent(UI.RescaleEventType.End, UI.RescaleEventArgsClass.fromArgs({
                element: this._element, origin: this._origin,
                handle: handle, startTime: this._startTime, currentPosition: this._position, targetRect: this._targetRect
            }));
            // body
            Utils.removeClass(document.body, PCSS + '-rescaling rescale-' + handle);
            this._rescaler.dispatchEvent(evt);
            DEL_VAL(this._element, DELEGATE);
            window.removeEventListener('mouseup', this._endHandler, false);
            window.removeEventListener('touchend', this._endHandler, false);
            window.removeEventListener('mousemove', this._moveHandler, false);
            window.removeEventListener('touchmove', this._moveHandler, false);
        }
    }
    
    const GET_VAL = CustomElementUtils.getAttachedPropertyValue;
    const SET_VAL = CustomElementUtils.setAttachedPropertyValue;
    const DEL_VAL = CustomElementUtils.deleteAttachedPropertyValue;
    const HANDLES = 'top right bottom left topleft topright bottomright bottomleft'.split(' ');

    const RESCALE_FRAME = 'pacem:rescale:frame';
    const MOUSE_DOWN = 'pacem:rescale:origin';
    const DELEGATE = 'pacem:rescale:delegate';

    @CustomElement({ tagName: P + '-rescale' })
    export class PacemRescaleElement extends Pacem.Behaviors.PacemBehavior implements Pacem.UI.Rescaler {

        protected decorate(element: Element) {
            const el = <HTMLElement>element,
                css = getComputedStyle(el);
            Utils.addClass(el, PCSS + '-rescalable');
            this._setFrame(el);
        }

        protected undecorate(element: Element) {
            const el = <HTMLElement>element
            Utils.removeClass(el, PCSS + '-rescalable');
            //
            this._removeFrame(el);
        }

        @Watch({ emit: false, converter: handlesConverter }) handles: Pacem.UI.RescaleHandle[];
        @Watch({ emit: false, converter: PropertyConverters.Number }) minWidth: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) maxWidth: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) minHeight: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) maxHeight: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'disabled':
                case 'handles':
                    const handles = this.handles || [UI.RescaleHandle.All];
                    const all = handles.find(h => h === UI.RescaleHandle.All) != null;
                    const disabled = this.disabled;
                    for (let el of this._bag) {
                        let frame: { [name: string]: HTMLElement } = GET_VAL(el, RESCALE_FRAME);
                        frame.top.hidden = disabled || (!all && handles.find(h => h === UI.RescaleHandle.Top) == null);
                        frame.bottom.hidden = disabled || (!all && handles.find(h => h === UI.RescaleHandle.Bottom) == null);
                        frame.left.hidden = disabled || (!all && handles.find(h => h === UI.RescaleHandle.Left) == null);
                        frame.right.hidden = disabled || (!all && handles.find(h => h === UI.RescaleHandle.Right) == null);
                        frame.topleft.hidden = frame.top.hidden || frame.left.hidden;
                        frame.topright.hidden = frame.top.hidden ||  frame.right.hidden;
                        frame.bottomleft.hidden = frame.bottom.hidden || frame.left.hidden;
                        frame.bottomright.hidden = frame.bottom.hidden || frame.right.hidden;
                    }
                    break;
            }
        }

        private _bag: (HTMLElement)[] = [];

        private _setFrame(el: HTMLElement) {
            let frame: { [name: string]: HTMLElement } = {};
            for (let type of HANDLES) {
                const handle = frame[type] = document.createElement('div');
                Utils.addClass(handle, PCSS + '-rescale rescale-' + type);
                el.setAttribute('pacem', '');
                el.appendChild(handle);
                handle.addEventListener('mousedown', this._startHandler, false);
                handle.addEventListener('touchstart', this._startHandler, { capture: false, passive: true });
            }
            SET_VAL(el, RESCALE_FRAME, frame);
            this._bag.push(el);
        }

        private _removeFrame(el: HTMLElement) {
            const frame: { [name: string]: HTMLElement } = GET_VAL(el, RESCALE_FRAME);
            for (var type in frame) {
                const handle = frame[type];
                handle.removeEventListener('mousedown', this._startHandler, false);
                handle.removeEventListener('touchstart', this._startHandler, { capture: false });
                handle.remove();
            }
            DEL_VAL(el, RESCALE_FRAME);
            this._bag.splice(this._bag.indexOf(el), 1);
        }

        private _startHandler = (evt: MouseEvent | TouchEvent) => {
            evt.stopPropagation();
            var el = evt.currentTarget,
                origin: Point;

            if (evt instanceof MouseEvent) {
                origin = { x: evt.clientX, y: evt.clientY };
            } else {
                if (evt.touches.length != 1)
                    return;
                origin = { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
            }
            const type = /rescale-(.+)/.exec(el['className'])[1];

            // start
            const target = (<HTMLElement>el).parentElement;
            this.dispatchEvent(new UI.RescaleEvent(UI.RescaleEventType.Start, UI.RescaleEventArgsClass.fromArgs({
                currentPosition: origin,
                origin: origin, element: target, handle: type, startTime: Date.now()
            })));
            SET_VAL(target, MOUSE_DOWN, origin);
            SET_VAL(target, DELEGATE, new RescaleElementDelegate(target, type, this,
                /* logging */(level, message, category) => this.log.apply(this, [level, message, category])));

        }

    }

}