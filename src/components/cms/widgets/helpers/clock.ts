namespace Pacem.Components.Cms {

    const DATA_METADATA: Pacem.Scaffolding.TypeMetadata = {
        display: { icon: 'timer', name: 'Clock', description: 'Timer widget.' },
        props: [
            {
                prop: 'interval', type: EXPRESSION_METADATA_TYPE, display: {
                    name: 'Interval (msec)'
                }, extra: {
                    selector: '.' + PCSS + '-widget', step: 1000
                },
                validators: [{
                    type: 'range', errorMessage: 'Negative numbers not allowed', params: { min: 0 }
                }]
            }
        ]
    };

    @CustomElement({
        tagName: P + '-widget-clock', template: `<${P}-timer interval="{{ :host.interval }}" on-tick="{{ :host.time = Date.now() }}"></${P}-timer>`
    })
    export class PacemWidgetClockElement extends PacemWidgetElement {

        constructor() {
            super(buildWidgetMetadata(DATA_METADATA));
        }

        @Watch({ reflectBack: true, converter: PropertyConverters.Number }) interval: number = 0;
        @Watch({ converter: PropertyConverters.Number }) time: number;

    }

}