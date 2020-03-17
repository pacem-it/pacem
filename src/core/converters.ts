/// <reference path="utils.ts" />

namespace Pacem {

    export declare type PropertyComparer = (old: any, val: any) => boolean;

    /**
     * Default, and essentially ONLY, property comparer for equalitycheck
     * @param old value 1
     * @param val value 2
     */
    export const DefaultComparer: PropertyComparer = (old, val) => Utils.areSemanticallyEqual(old, val);

    export interface PropertyConverter {
        /** You can assume `attr` not null, cause it will be processed only in that case. */
        readonly convert: (attr: string, element?: HTMLElement) => any,
        /** You can assume `prop` not null, cause it will be processed only in that case. */
        readonly convertBack?: (prop: any, element?: HTMLElement) => string
        /** Whether to retry, once more, the conversion attribute-to-property, if no results were yielded before the element was ready and the DOM loaded. */
        readonly retryConversionWhenReady?: boolean;
    };

    export const PropertyConverters: { [name: string]: PropertyConverter } = {
        None: { convert: (attr: string) => undefined },
        String: {
            convert: (attr: string) => attr, convertBack: (prop: any) => prop
        },
        Number: {
            convert: (attr: string) => parseFloat(attr), convertBack: (prop: any) => prop.toString()
        },
        Boolean: {
            convert: (attr: string) => !Utils.isNullOrEmpty(attr) && (attr !== '0') && (attr !== 'false'),
            convertBack: (prop: any) => (!!prop).toString()
        },
        BooleanStrict: {
            convert: (attr: string) => attr === 'true' || attr === '1',
            convertBack: (prop: any) => (!!prop).toString()
        },
        Date: {
            convert: (attr: string) => Utils.parseDate(attr),
            convertBack: (prop: any) => Utils.parseDate(prop).toISOString()
        },
        Datetime: {
            convert: (attr: string) => Utils.parseDate(attr),
            convertBack: (prop: any) => Utils.parseDate(prop).toISOString()
        },
        Json: {
            convert: (attr: string) => Utils.Json.parse(attr),
            convertBack: (prop: any) => Utils.Json.stringify(prop)
        },
        Eval: {
            convert: (attr: string) => Function(`return ${attr};`).apply(null),
            convertBack: (prop: any) => undefined //JSON.stringify(prop)
        },
        Element: {
            convert: (attr: string) => document.querySelector(attr),
            convertBack: (prop: any) => (prop instanceof Element && prop.id) ? ('#' + prop.id) : undefined,
            retryConversionWhenReady: true
        },

        // geom
        Point: {
            convert: (attr: string) => Geom.parsePoint(attr),
            convertBack: (prop: Point) => `${prop.x || 0} ${prop.y || 0}`
        },
        Rect: {
            convert: (attr: string) => Geom.parseRect(attr),
            convertBack: (prop: Rect) => `${prop.x || 0} ${prop.y || 0} ${prop.width || 0} ${prop.height || 0}`
        }
    }
}