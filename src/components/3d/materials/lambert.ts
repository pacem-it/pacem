/// <reference path="material.ts" />
namespace Pacem.Components.Drawing3D {

    @CustomElement({tagName: `${P}-${TAG_MIDDLE_NAME}-material-lambert`})
    export class LambertMaterialElement extends MaterialElement {

        constructor() {
            super(Pacem.Drawing3D.KnownShader.Lambert);
        }

        protected createMaterial(): Pacem.Drawing3D.LambertMaterial {
            return Utils.extend({
                emissiveColor: this.emissiveColor || '#000',
                reflectivity: this.reflectivity ?? 0,
                refractionRatio: this.refractionRatio ?? 0
            }, super.createMaterial());
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'emissiveColor':
                    case 'reflectivity':
                    case 'refractionRatio':
                        this.updateMaterial();
                        break;
                }
            }
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) emissiveColor: string;
        @Watch({ emit: false, converter: PropertyConverters.Number }) reflectivity: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) refractionRatio: number;
    }

}