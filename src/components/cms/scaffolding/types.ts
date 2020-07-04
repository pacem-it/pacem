namespace Pacem.Components.Cms {

    /** Function container proxy (used in metadata) */
    export const Functions: { [key: string]: Function } = {
        'dismiss': (...args: string[]) => {
            for (let name of args || []) {
                delete Functions[name];
            }
        },
        'handleExpressionValueChange': (evt: PropertyChangeEvent, prop: string, entity: any) => {
            if (evt.detail.propertyName === 'value' && !Utils.isNull(entity)) {
                const value = evt.detail.currentValue;
                if (entity instanceof HTMLElement) {

                    // handle the entity as an element and modify the attribute
                    let attr = CustomElementUtils.camelToKebab(prop);
                    if (Utils.isNullOrEmpty(value)) {
                        entity.removeAttribute(attr);
                    } else {
                        entity.setAttribute(attr, value.toString());
                    }

                } else {
                    entity[prop] = value;
                }
            }
        }
    };

    /** Default metadata ('expression' field) 'type' factory. */
    export const EXPRESSION_METADATA_TYPE = (host: Pacem.Components.Scaffolding.PacemFormFieldElement, hostRef = ':host', hostEntityRef = ':host.entity') => {
        const attrs: { [name: string]: string } = {},
            meta = host.metadata,
            fns = Pacem.Components.Cms.Functions,
            fnKeys: string[] = [];
        attrs['value'] = `{{ ${hostEntityRef} instanceof HTMLElement && ${hostEntityRef}.getAttribute('${CustomElementUtils.camelToKebab(meta.prop)}') }}`;
        attrs['on-' + PropertyChangeEventName] = `Pacem.Components.Cms.Functions.handleExpressionValueChange($event, '${meta.prop}', ${hostEntityRef})`;
        attrs['converter'] = `{{ Pacem.CustomElementUtils.getWatchedProperty(${hostEntityRef}, '${meta.prop}').config.converter }}`;
        const tagName = P + '-expression';
        let extra = <{ selector: string, filter?: string | ((e: Element) => boolean), labeler?: (e: Element) => string }>(meta.extra || {});

        // selector
        if (!Utils.isNullOrEmpty(extra.selector)) {
            attrs['selector'] = extra.selector;
        }

        // filters to the selector
        if (!Utils.isNullOrEmpty(extra.filter)) {
            switch (typeof extra.filter) {
                case 'string':
                    attrs['filter'] = `{{ (e) => e.constructor.name === "${extra.filter}" || e.localName === "${extra.filter.toLowerCase()}" }}`;
                    break;
                case 'function':
                    const fnKey = 'fn' + Utils.uniqueCode();
                    fns[fnKey] = extra.filter;
                    attrs['filter'] = `{{ Pacem.Components.Cms.Functions.${fnKey}, once }}`;

                    // tidy-up memento
                    fnKeys.push(fnKey);
                    break;
            }
        }

        // labeler
        if (typeof extra.labeler === 'function') {
            const fnKey = 'fn' + Utils.uniqueCode();
            fns[fnKey] = extra.labeler;
            attrs['labeler'] = `{{ Pacem.Components.Cms.Functions.${fnKey}, once }}`;

            // tidy-up memento
            fnKeys.push(fnKey);
        }

        if (fnKeys.length > 0) {

            // tidy-up
            attrs['on-unload'] = `{{ Pacem.Components.Cms.Functions.dismiss('${fnKeys.join('\',\'')}') }}`
        }

        return { tagName: tagName, attrs: attrs };
    };

}