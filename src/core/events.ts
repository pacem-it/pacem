/// <reference path="utils-customevent.ts" />
namespace Pacem {

    export abstract class CustomTypedEvent<TDetail> extends CustomEvent/* new in TypeScript v2.7.1 -> */<TDetail> {

        constructor(type: string, detail: TDetail, eventInit?: CustomEventInit<TDetail>) {
            super(type, Utils.extend({ detail: detail }, eventInit || {}));
            CustomEventUtils.fixEdgeCustomEventSubClassInstance(this, this.constructor);
        }
    }

    function isEventInit(obj: any): obj is CustomEventInit {
        if ('detail' in obj) {
            // must provide a detail
            for (let prop in obj) {
                if (prop !== 'bubbles' && prop !== 'cancelable' && prop !== 'composed' && prop !== 'detail') {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    // TODO: make inherit from CustomTypedEvent
    export abstract class CustomUIEvent<TDetail> extends CustomEvent<TDetail> implements UIEventLike {

        constructor(type: string, detail: TDetail)
        constructor(type: string, eventInit: CustomEventInit<TDetail>)
        constructor(type: string, detail: TDetail, orig: MouseEvent | TouchEvent | KeyboardEvent)
        constructor(type: string, eventInit: CustomEventInit<TDetail>, orig: MouseEvent | TouchEvent | KeyboardEvent)
        constructor(type: string, detail: TDetail, eventInit: CustomEventInit<TDetail>)
        constructor(type: string, detail: TDetail, eventInit: CustomEventInit<TDetail>, orig: MouseEvent | TouchEvent | KeyboardEvent)
        constructor(type: string, detail: TDetail | CustomEventInit<TDetail>, eventInit?: CustomEventInit<TDetail> | MouseEvent | TouchEvent | KeyboardEvent, orig?: MouseEvent | TouchEvent | KeyboardEvent) {
            super(type, Utils.extend((isEventInit(detail) ? detail : { detail: detail }), (!(eventInit instanceof Event) && eventInit) || {}));
            const originalEvent = orig || eventInit;
            if (originalEvent instanceof Event) {
                this.#originalEvent = originalEvent;
                this.#modifiers = CustomEventUtils.getEventKeyModifiers(originalEvent);
                if (originalEvent instanceof MouseEvent || originalEvent instanceof TouchEvent) {
                    this.#coords = CustomEventUtils.getEventCoordinates(originalEvent);
                }
            }
            CustomEventUtils.fixEdgeCustomEventSubClassInstance(this, this.constructor);
        }

        #originalEvent: Event;
        #modifiers: EventKeyModifiers;
        #coords: EventCoordinates;
        get originalEvent(): Event {
            return this.#originalEvent;
        }
        get which(): number {
            return this.#modifiers?.which;
        }
        get altKey(): boolean {
            return this.#modifiers?.altKey;
        }
        get shiftKey(): boolean {
            return this.#modifiers?.shiftKey;
        }
        get ctrlKey(): boolean {
            return this.#modifiers?.ctrlKey;
        }
        get metaKey(): boolean {
            return this.#modifiers?.metaKey;
        }

        get pageX(): number {
            return this.#coords?.page.x;
        }
        get pageY(): number {
            return this.#coords?.page.y;
        }
        get clientX(): number {
            return this.#coords?.client.x;
        }
        get clientY(): number {
            return this.#coords?.client.y;
        }
        get screenX(): number {
            return this.#coords?.screen.x;
        }
        get screenY(): number {
            return this.#coords?.screen.y;
        }
    }

    // #region ATTRIBUTE CHANGE

    export interface AttributeChangeEventArgs {

        attributeName: string;
        oldValue?: string;
        currentValue: string;
        firstChange?: boolean;
    }

    export const AttributeChangeEventName: string = 'attributechange';

    export class AttributeChangeEvent extends CustomTypedEvent<AttributeChangeEventArgs> {

        constructor(args: AttributeChangeEventArgs) {
            super(AttributeChangeEventName, args);
        }

    }

    // #endregion

    // #region PROPERTY CHANGE

    export interface PropertyChangeEventArgs {

        propertyName: string;
        oldValue?: any;
        currentValue: any;
        firstChange?: boolean;
    }

    export const PropertyChangeEventName: string = 'propertychange';

    export class PropertyChangeEvent extends CustomTypedEvent<PropertyChangeEventArgs> {

        constructor(args: PropertyChangeEventArgs) {
            super(PropertyChangeEventName, args);
        }

    }

    // #endregion

    export interface NotifyPropertyChange extends EventTarget {
    }

}