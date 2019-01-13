/// <reference path="utils.ts" />

namespace Pacem {


    export interface PropertyConverter {
        /** You can assume `attr` not null, cause it will be processed only in that case. */
        convert: (attr: string, element?: HTMLElement) => any,
        /** You can assume `prop` not null, cause it will be processed only in that case. */
        convertBack?: (prop: any, element?: HTMLElement) => string
    };

    export const PropertyConverters: { [name: string]: PropertyConverter } = {
        None: { convert: (attr: string) => undefined },
        String: { convert: (attr: string) => attr, convertBack: (prop: any) => prop },
        Number: { convert: (attr: string) => parseFloat(attr), convertBack: (prop: any) => prop.toString() },
        Boolean: {
            convert: (attr: string) => !Utils.isNullOrEmpty(attr) && (attr !== '0') && (attr !== 'false'),
            convertBack: (prop: any) => (!!prop).toString()
        },
        BooleanStrict: {
            convert: (attr: string) => attr === 'true' || attr === '1',
            convertBack: (prop: any) => (!!prop).toString()
        },
        Datetime: {
            convert: (attr: string) => Utils.parseDate(attr),
            convertBack: (prop: any) => Utils.parseDate(prop).toISOString()
        },
        Json: {
            convert: (attr: string) => JSON.parse(attr),
            convertBack: (prop: any) => JSON.stringify(prop)
        },
        Eval: {
            convert: (attr: string) => Function(`return ${attr};`).apply(null),
            convertBack: (prop: any) => JSON.stringify(prop)
        },
        Element: { convert: (attr: string) => document.querySelector(attr) }
    }
}