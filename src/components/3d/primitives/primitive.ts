/// <reference path="../types.ts" />
namespace Pacem.Components.Drawing3D {

    export abstract class Pacem3DPrimitiveElement extends PacemEventTarget {
        @Watch({ converter: PropertyConverters.Json }) geometry: Pacem.Drawing3D.NodeGeometry;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (Utils.isNull(this.geometry)) {
                this.geometry = this.createDefaultGeometry();
            }
        }

        protected abstract createDefaultGeometry(): Pacem.Drawing3D.NodeGeometry;
    }

}