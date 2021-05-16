/// <reference path="material.ts" />
namespace Pacem.Components.Drawing3D {

    @CustomElement({tagName: `${P}-${TAG_MIDDLE_NAME}-material-standard`})
    export class StandardMaterialElement extends MaterialElement {

        constructor() {
            super(Pacem.Drawing3D.KnownShader.Standard);
        }

        protected createMaterial(): Pacem.Drawing3D.PhongMaterial {
            return Utils.extend({
                emissiveColor: this.emissiveColor || '#000',
                refractionRatio: this.refractionRatio ?? 0,

                metalness: this.metalness ?? 0,
                roughness: this.roughness ?? 0,
                flatShading: this.flatShading ?? false
            }, super.createMaterial());
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'emissiveColor':
                    case 'roughness':
                    case 'metalness':
                    case 'refractionRatio':
                    case 'flatShading':
                        this.updateMaterial();
                        break;
                }
            }
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) emissiveColor: string;
        @Watch({ emit: false, converter: PropertyConverters.Number }) refractionRatio: number;

        @Watch({ emit: false, converter: PropertyConverters.Number }) roughness: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) metalness: number;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) flatShading: boolean;

    }


}