/// <reference path="utils-customelement.ts" />

namespace Pacem {


    export class CustomEventUtils {

        static isInstanceOf<TEvent extends CustomEvent>(evt: Event, type: Type<TEvent>): boolean {
            return evt instanceof type
                // this an optimistic BUGGED workaround due to a damn' Edge bug: https://github.com/Microsoft/ChakraCore/issues/3952
                || CustomElementUtils.getAttachedPropertyValue(evt, 'pacem:custom-event') === evt.type;
        }

        static fixEdgeCustomEventSubClassInstance<TEvent extends CustomEvent>(evt: TEvent, type: string) {
            CustomElementUtils.setAttachedPropertyValue(evt, 'pacem:custom-event', type);
        }
    }
}