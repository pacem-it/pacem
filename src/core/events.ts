namespace Pacem {

    export abstract class CustomTypedEvent<TDetail> extends CustomEvent/* new v2.7.1 -> */<TDetail> {

        constructor(type: string, detail: TDetail, eventInit?: CustomEventInit<TDetail>) {
            super(type, Utils.extend({ detail: detail }, eventInit || {}));
            CustomEventUtils.fixEdgeCustomEventSubClassInstance(this, this.constructor);
        }

        //get detail(): TDetail {
        //    return super.detail;
        //}
    }
    
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

    export interface NotifyPropertyChange extends EventTarget {
    }

}