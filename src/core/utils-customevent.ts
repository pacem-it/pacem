/// <reference path="utils-customelement.ts" />

namespace Pacem {

    export interface EventCoordinates {
        readonly page: Point, readonly client: Point, readonly screen: Point
    }

    export interface KeyEventLike {
        readonly altKey: boolean;
        readonly ctrlKey: boolean;
        readonly shiftKey: boolean;
        readonly metaKey: boolean;
        readonly which?: number;
    }

    export interface UIEventLike extends KeyEventLike{
        readonly clientX: number;
        readonly clientY: number;
        readonly pageX: number;
        readonly pageY: number;
        readonly screenX: number;
        readonly screenY: number;
    }

    export interface EventKeyModifiers extends KeyEventLike {
    }

    export enum EventKeyModifier {
        AltKey =  "Alt",
        CtrlKey = "Ctrl",
        ShiftKey = "Shift",
        MetaKey = "Cmd"
    }

    export class CustomEventUtils {

        static isInstanceOf<TEvent extends Event>(evt: Event, type: Type<TEvent>): boolean {
            return evt instanceof type;
            // || CustomElementUtils.getAttachedPropertyValue(evt, 'pacem:custom-event') === evt.type;
        }

        static getEventCoordinates(evt: MouseEvent | TouchEvent | UIEventLike): EventCoordinates {
            var src: Touch | MouseEvent | UIEventLike;
            if ('touches' in evt) {
                src = evt.touches[0]
            } else {
                src = evt;
            }
            return {
                page: { x: src.pageX, y: src.pageY },
                screen: { x: src.screenX, y: src.screenY },
                client: { x: src.clientX, y: src.clientY }
            };
        }

        static getEventKeyModifiers(evt: KeyboardEvent | MouseEvent | TouchEvent | KeyEventLike): EventKeyModifiers {
            var which: number = evt.which;
            if (evt instanceof MouseEvent) {
                which = evt.button;
            }
            return {
                which: which, shiftKey: evt.shiftKey, altKey: evt.altKey, ctrlKey: evt.ctrlKey, metaKey: evt.metaKey
            };
        }

        /**
         * Matches the provided event against keyboard modifiers and returns 'true' if all the matches are satisfied.
         * @param evt Provided event
         * @param modifiers Array of stringified modifiers ("Ctrl", "Shift", "Alt", "Option", "Win", "Cmd")
         */
        static matchModifiers(evt: KeyboardEvent | MouseEvent | TouchEvent | KeyEventLike, modifiers: string[])
        static matchModifiers(evt: KeyboardEvent | MouseEvent | TouchEvent | KeyEventLike, ...modifiers: EventKeyModifier[])
        static matchModifiers(evt: KeyboardEvent | MouseEvent | TouchEvent | KeyEventLike, ...args: any[]) {
            const modifiers = !Utils.isNull(args) && (args.length === 1 && Utils.isArray(args[0]) ? args[0] : Array.from<string>(args).filter(i => !Utils.isNullOrEmpty(i))),
                lowerCaseModifiers = (modifiers || []).map(i => i.toLowerCase());
            const altKey = lowerCaseModifiers.indexOf('alt') >= 0 || lowerCaseModifiers.indexOf('option') >= 0,
                shiftKey = lowerCaseModifiers.indexOf('shift') >= 0,
                ctrlKey = lowerCaseModifiers.indexOf('ctrl') >= 0,
                metaKey = lowerCaseModifiers.indexOf('win') >= 0 || lowerCaseModifiers.indexOf('cmd') >= 0;
            if (altKey !== evt.altKey
                || shiftKey !== evt.shiftKey
                || metaKey !== evt.metaKey
                || ctrlKey !== evt.ctrlKey) {
                return false;
            }
            return true;
        }

        static fixEdgeCustomEventSubClassInstance<TEvent extends Event>(evt: TEvent, type: Function) {
            // this an optimistic BUGGED workaround due to a damn' Edge bug: https://github.com/Microsoft/ChakraCore/issues/3952
            if (!(evt instanceof type)) {
                Object.setPrototypeOf(evt, type);
            }
        }
    }
}