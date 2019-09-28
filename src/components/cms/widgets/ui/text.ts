/// <reference path="types.ts" />
namespace Pacem.Components.Cms {

    const TEXT_METADATA = buildWidgetMetadata({
        display: { icon: 'font_download', name: 'Text', description: 'Plain text widget.'},
        props: [{
            prop: 'text', type: 'string', display: { ui: 'expression', name: 'Text' }, extra: EXPRESSION_WIDGET_METADATA_EXTRA
        }]
    });

    @CustomElement({
        tagName: P + '-widget-text', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-text text="{{ :host.text }}"></${P}-text>`
    })
    export class PacemWidgetTextElement extends PacemUiWidgetElement {

        constructor() {
            super(TEXT_METADATA);
        }

        @Watch({ reflectBack: true, converter: PropertyConverters.String }) text: string;

    }

}