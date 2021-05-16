/// <reference path="../../core/decorators.ts" />
/// <reference path="../../core/template.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    @CustomElement({ tagName: P + '-template-proxy' })
    export class PacemTemplateProxyElement extends /*PacemEventTarget*/ TemplateElement {

        @Watch({ emit: false, converter: PropertyConverters.Element }) target: HTMLTemplateElement;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            // super.propertyChangedCallback(name, old, val, first);
            if (name === 'target') {
                this.dispatchEvent(new Event('templatechange'));
            }
        }

        addEventListener(type: 'templatechange', listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
            super.addEventListener(type, listener, options);
        }

        removeEventListener(type: 'templatechange', listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) {
            super.removeEventListener(type, listener, options);
        }

    }

}