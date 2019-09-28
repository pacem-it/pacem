namespace Pacem {

    export abstract class CustomTypedEvent<TDetail> extends CustomEvent/* new v2.7.1 -> */<TDetail> {

        constructor(type: string, detail: TDetail, eventInit?: CustomEventInit<TDetail>) {
            super(type, Utils.extend({ detail: detail }, eventInit || {}));
            CustomEventUtils.fixEdgeCustomEventSubClassInstance(this, this.constructor);
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