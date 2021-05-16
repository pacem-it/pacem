/// <reference path="material.ts" />
/// <reference path="../types.ts" />
namespace Pacem.Components.Drawing3D {

    @CustomElement({ tagName: `${P}-${TAG_MIDDLE_NAME}-material-line` })
    export class LineMaterialElement extends MaterialElement {

        constructor() {
            super(Pacem.Drawing3D.KnownShader.Line);
        }

        @Watch({ emit: false, converter: PropertyConverters.Number }) lineWidth: number;
        @Watch({ emit: false, converter: PropertyConverters.String }) lineJoin?: CanvasLineJoin;
        @Watch({ emit: false, converter: PropertyConverters.String }) lineCap?: CanvasLineCap;
        @Watch({
            emit: false, converter: {
                convert: (attr) => attr?.split(',').map(i => parseInt(i)).filter(i => !Number.isNaN(i)),
                convertBack: (prop) => prop?.join(',')
            }
        }) dashArray?: number[];

        protected createMaterial() : Pacem.Drawing3D.LineMaterial {
            return Utils.extend( {
                lineWidth: this.lineWidth ?? 1,
                lineJoin: this.lineJoin ?? 'round',
                lineCap: this.lineCap ?? 'round',
                dashArray: this.dashArray,
            }, super.createMaterial());
        }
    }

}