/// <reference path="../../core/decorators.ts" />
/// <reference path="../../core/template.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {


    @CustomElement({ tagName: P + '-template-proxy' })
    export class PacemTemplateProxyElement extends Pacem.TemplateElement {

        @Watch({ emit: false, converter: PropertyConverters.Element }) target: HTMLTemplateElement;

    }

}