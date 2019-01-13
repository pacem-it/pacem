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
    
}