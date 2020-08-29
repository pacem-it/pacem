/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Drawing {


    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-image' })
    export class PacemImageElement extends UiElement implements Pacem.Drawing.Image {

        @Watch({ emit: false, converter: PropertyConverters.String }) src: string;
        @Watch({ emit: false, converter: PropertyConverters.Number }) x: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) y: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) width: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) height: number;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            if (!first) {
                switch (name) {
                    case 'src':
                    case 'x':
                    case 'y':
                    case 'width':
                    case 'height':
                        if (!Utils.isNull(this.stage)) {
                            this.stage.draw(this);
                        }
                        break;
                }
            }
        }

    }

}