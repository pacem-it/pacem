/// <reference path="primitive.ts" />
namespace Pacem.Components.Drawing3D {

    const DEFAULT_LINE: Pacem.Drawing3D.Vector3D[] = [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }];

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-primitive-line' })
    export class PacemLineElement extends Pacem3DPrimitiveElement {

        @Watch({ emit: false, converter: PropertyConverters.Json }) positions: Pacem.Drawing3D.Vector3D[];

        static createLineGeometry(positions?: Pacem.Drawing3D.Vector3D[] ): Pacem.Drawing3D.LineGeometry {
            return new Pacem.Drawing3D.LineGeometry(positions || DEFAULT_LINE);
        }

        protected createDefaultGeometry() {
            return PacemLineElement.createLineGeometry();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'positions':
                    this.geometry = PacemLineElement.createLineGeometry(val);
                    break;
            }
        }
    }

}