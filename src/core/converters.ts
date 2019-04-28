/// <reference path="utils.ts" />

namespace Pacem {

    export declare type PropertyComparer = (old: any, val: any) => boolean;

    export const DefaultComparer: PropertyComparer = (old, val) => old === val;

    const DatetimeComparer: PropertyComparer = (old, val) => {
        const oldDate = Utils.parseDate(old),
            newDate = Utils.parseDate(val);
        return (newDate && newDate.valueOf()) === (oldDate && oldDate.valueOf());
    };

    const DateComparer: PropertyComparer = (old, val) => {
        const oldDate = Utils.parseDate(old),
            newDate = Utils.parseDate(val);
        if (Utils.Dates.isDate(oldDate) && Utils.Dates.isDate(newDate)) {
            return oldDate.getFullYear() === newDate.getFullYear()
                && oldDate.getMonth() === newDate.getMonth()
                && oldDate.getDate() === newDate.getDate();
        }
        return false;
    };

    const JsonComparer: PropertyComparer = (old, val) => {
        const oldJson = Utils.jsonSortStringify(old),
            newJson = Utils.jsonSortStringify(val);
        return oldJson === newJson;
    };

    export interface PropertyConverter {
        /** You can assume `attr` not null, cause it will be processed only in that case. */
        readonly convert: (attr: string, element?: HTMLElement) => any,
        /** You can assume `prop` not null, cause it will be processed only in that case. */
        readonly convertBack?: (prop: any, element?: HTMLElement) => string
        /** An equality comparison function that overrides the default one */
        // readonly compare?: PropertyComparer;
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
            convertBack: (prop: any) => Utils.parseDate(prop).toISOString(),
            //compare: DateComparer
        },
        Datetime: {
            convert: (attr: string) => Utils.parseDate(attr),
            convertBack: (prop: any) => Utils.parseDate(prop).toISOString(),
            //compare: DatetimeComparer
        },
        Json: {
            convert: (attr: string) => Utils.Json.parse(attr),
            convertBack: (prop: any) => Utils.Json.stringify(prop),
            //compare: JsonComparer,
            //store: JsonStorer
        },
        Eval: {
            convert: (attr: string) => Function(`return ${attr};`).apply(null),
            convertBack: (prop: any) => undefined //JSON.stringify(prop)
        },
        Element: {
            convert: (attr: string) => document.querySelector(attr),
            convertBack: (prop: any) => (prop instanceof Element && prop.id) ? ('#' + prop.id) : undefined,
            retryConversionWhenReady: true
        }
    }
}