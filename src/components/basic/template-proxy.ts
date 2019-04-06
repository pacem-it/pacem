/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {


    @CustomElement({ tagName: P + '-template-proxy' })
    export class PacemTemplateProxyElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.Element }) target: HTMLTemplateElement;

    }

}