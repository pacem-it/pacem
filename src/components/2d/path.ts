/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Drawing {


    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-path' })
    export class PacemPathElement extends ShapeElement {

        @Watch({ converter: PropertyConverters.String }) d: string;
        @Watch({ converter: PropertyConverters.Json }) boundingRect: Rect;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'd') {
                this.data = this.getPathData();
            }
        }

        protected getPathData = () => this.d;

    }

}