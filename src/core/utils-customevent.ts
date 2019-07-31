/// <reference path="utils-customelement.ts" />

namespace Pacem {


    export class CustomEventUtils {

        static isInstanceOf<TEvent extends Event>(evt: Event, type: Type<TEvent>): boolean {
            return evt instanceof type;
                // || CustomElementUtils.getAttachedPropertyValue(evt, 'pacem:custom-event') === evt.type;
        }

        static fixEdgeCustomEventSubClassInstance<TEvent extends Event>(evt: TEvent, type: Function) {
            // this an optimistic BUGGED workaround due to a damn' Edge bug: https://github.com/Microsoft/ChakraCore/issues/3952
            if (!(evt instanceof type)) {
                Object.setPrototypeOf(evt, type);
            }
        }
    }
}