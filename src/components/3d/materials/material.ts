/// <reference path="../types.ts" />

namespace Pacem.Drawing3D {

    export enum KnownShader {
        Basic = 'basic',
        Lambert = 'lambert',
        Phong = 'phong',
        Standard = 'standard',
        Line = 'line'
    }

    export interface Material {
        opacity?: number;
        wireframe?: boolean;
        color?: string;
        visible?: boolean;
        map?: string;
        readonly shader: KnownShader
    }

    export function isMaterial(obj: any): obj is Material {
        return /*'color' in obj &&*/ 'shader' in obj;
    }

    export interface BasicMaterial extends Material {
    }

    export function isBasicMaterial(obj: any): obj is BasicMaterial {
        return isMaterial(obj) && obj.shader === KnownShader.Basic;
    }

    export interface LineMaterial extends Material {
        lineWidth: number;
        lineJoin?: CanvasLineJoin;
        lineCap?: CanvasLineCap;
        dashArray?: number[];
    }

    export function isLineMaterial(obj: any): obj is LineMaterial {
        return isMaterial(obj) && obj.shader === KnownShader.Line;
    }

    export interface LambertMaterial extends Material {
        emissiveColor?: string;
        reflectivity?: number;
        refractionRatio?: number;
    }

    export function isLambertMaterial(obj: any): obj is LambertMaterial {
        return isMaterial(obj) && obj.shader === KnownShader.Lambert;
    }

    export interface PhongMaterial extends Material {
        emissiveColor?: string;
        reflectivity?: number;
        refractionRatio?: number;

        specularColor?: string;
        shininess?: number;
        flatShading?: boolean;
    }

    export function isPhongMaterial(obj: any): obj is PhongMaterial {
        return isMaterial(obj) && obj.shader === KnownShader.Phong;
    }

    export interface StandardMaterial extends Material {
        emissiveColor?: string;
        refractionRatio?: number;

        roughness?: number;
        metalness?: number;
        flatShading?: boolean;
    }

    export function isStandardMaterial(obj: any): obj is StandardMaterial {
        return isMaterial(obj) && obj.shader === KnownShader.Standard;
    }

}

namespace Pacem.Components.Drawing3D {

    export abstract class MaterialElement extends PacemEventTarget {

        constructor(shader: Pacem.Drawing3D.KnownShader) {
            super();
            this.#shader = shader;
        }

        #shader: Pacem.Drawing3D.KnownShader;
        get shader() {
            return this.#shader;
        }

        @Watch() material: Pacem.Drawing3D.Material;

        @Watch({ emit: false, converter: PropertyConverters.Number }) opacity: number;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) wireframe: boolean;
        @Watch({ emit: false, converter: PropertyConverters.String }) color: string;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) visible: boolean;
        @Watch({ emit: false, converter: PropertyConverters.String }) map?: string;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'opacity':
                    case 'wireframe':
                    case 'color':
                    case 'visible':
                    case 'map':
                        this.updateMaterial();
                        break;
                }
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.updateMaterial();
        }

        protected updateMaterial() {
            this.material = this.createMaterial();
        }

        protected createMaterial(): Pacem.Drawing3D.Material {
            return {
                opacity: this.opacity ?? 1.0,
                wireframe: this.wireframe ?? false,
                color: this.color || Utils.Css.getVariableValue(`--${PCSS}-color-primary`),
                visible: this.visible ?? true,
                map: this.map,
                shader: this.shader
            };
        }
    }

}