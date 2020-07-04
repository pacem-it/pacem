/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Drawing {


    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-text' })
    export class PacemTextElement extends UiElement implements Pacem.Drawing.Text {

        validate(_: DrawableElement): boolean {
            return false;
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) text: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) color: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) fontFamily: string;
        @Watch({ emit: false, converter: PropertyConverters.Number }) fontSize: number;
        @Watch({ emit: false, converter: PropertyConverters.Json }) anchor: Point;
        @Watch({ emit: false, converter: PropertyConverters.String }) textAnchor: 'start'|'middle'|'end';

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            if (!first) {
                switch (name) {
                    case 'text':
                    case 'color':
                    case 'fontFamily':
                    case 'fontSize':
                    case 'anchor':
                        if (!Utils.isNull(this.stage)) {
                            this.stage.draw(this);
                        }
                        break;
                }
            }
        }

    }

}