/// <reference path="events.ts" />
namespace Pacem {

    export declare type PropertyDependency = {
        /** Element to depend upon */
        element: Node,
        /** Property of the element that is needed to observe  */
        property: string,
        /** Path to the value that carries the final piece of information */
        path: string,
        /** Is it a two way binding? or "bind just once" then forget?... */
        mode?: 'twoway'|'once'|'oneway'
        twowayAllowed: boolean
    };

    export declare type PropertyDependencies = { [name: string]: PropertyDependency };


    export declare type CustomElementConfig = {
        tagName: string,
        options?: {
            extends: string
        },
        /** textual templated content */
        template?: string,
        /** location of the templated content to fetch */
        templateUrl?: string,
        /** if `true` and shadow DOM is natively available then the templated content is hosted in a ShadowRoot  */
        shadow?: boolean
    };


    export declare type WatchConfig = {
        /** Whether to debounce the property change for a while or not (numeric to specify milliseconds) */
        debounce?: boolean | number,
        /** Whether to reflect the property value back to the element attribute, or not (default false) */
        reflectBack?: boolean,
        /** Whether to emit property change event or not (default true) */
        emit?: boolean,
        /** Alias property name */
        // alias?: string;
        /** Property converter */
        converter?: PropertyConverter;
    };


    export declare type TransformFunction = (value: any, ...args: any[]) => any;


    export interface OnConnected {
        connectedCallback(): void;
    }

    export interface OnDisconnected {
        disconnectedCallback(): void;
    }

    export interface OnPropertyChanged {
        propertyChangedCallback(name?: string, oldVal?: any, newVal?: any, firstChange?: boolean): void;
    }

    export interface OnAttributeChanged {
        attributeChangedCallback(attrName?: string, oldVal?: string, newVal?: string): void;
    }

    export interface OnAdopted {
        adoptedCallback(): void;
    }

    export interface OnViewActivated {
        viewActivatedCallback(): void;
    }

    export const Type = Function;

    export interface Type<T> extends Function { new(...args: any[]): T; }

    export interface CustomElementRegistry {
        define(name: string,
            type: Type<any>,
            options?: { [key: string]: string });

        get(name: string);
        whenDefined(name: string): PromiseLike<void>;
    };

    // #region CONSTS

    export const WATCH_PROPS_VAR: string = 'pacem:properties';
    export const INSTANCE_BINDINGS_VAR = 'pacem:custom-element:bindings';
    export const INSTANCE_HOST_VAR = 'pacem:custom-element:host';

    // #endregion

}