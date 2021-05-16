/// <reference path="material.ts" />
namespace Pacem.Components.Drawing3D {

    @CustomElement({tagName: `${P}-${TAG_MIDDLE_NAME}-material-phong`})
    export class PhongMaterialElement extends MaterialElement {

        constructor() {
            super(Pacem.Drawing3D.KnownShader.Phong);
        }

        protected createMaterial(): Pacem.Drawing3D.PhongMaterial {
            return Utils.extend({
                emissiveColor: this.emissiveColor || '#000',
                reflectivity: this.reflectivity ?? 0,
                refractionRatio: this.refractionRatio ?? 0,

                specularColor: this.specularColor || '#000',
                shininess: this.shininess ?? 0,
                flatShading: this.flatShading ?? true
            }, super.createMaterial());
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'emissiveColor':
                    case 'reflectivity':
                    case 'refractionRatio':
                    case 'specularColor':
                    case 'shininess':
                    case 'flatShading':
                        this.updateMaterial();
                        break;
                }
            }
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) emissiveColor: string;
        @Watch({ emit: false, converter: PropertyConverters.Number }) reflectivity: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) refractionRatio: number;

        @Watch({ emit: false, converter: PropertyConverters.String }) specularColor: string;
        @Watch({ emit: false, converter: PropertyConverters.Number }) shininess: number;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) flatShading: boolean;

    }


}