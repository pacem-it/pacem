/// <reference path="../../scaffolding/types.ts" />
namespace Pacem.Components.Cms {

    const DATA_METADATA: Pacem.Scaffolding.TypeMetadata = {
        display: { icon: 'storage', name: 'Data', description: 'Data object widget.' },
        props: [
            {
                prop: 'model', type: EXPRESSION_METADATA_TYPE, display: {
                    name: 'Model'
                }, extra: {
                    selector: '.'+ PCSS + '-widget'
                }
            }
        ]
    };

    @CustomElement({
        tagName: P + '-widget-data'
    })
    export class PacemWidgetDataElement extends PacemWidgetElement {

        constructor() {
            super(buildWidgetMetadata(DATA_METADATA));
        }

        @Watch({ reflectBack: true, converter: PropertyConverters.Json }) model: any;

    }

}