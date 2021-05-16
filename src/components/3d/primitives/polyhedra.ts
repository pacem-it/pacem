/// <reference path="primitive.ts" />
/// <reference path="box.ts" />
namespace Pacem.Components.Drawing3D {

    const _utils = {
        parseFloats: function (input:string): number[] {
            const pattern = /([\d.-]+)/i;
            var match = pattern.exec(input);
            const ret: number[] = [];
            while (match != null) {
                const g = match[0];
                const j = parseFloat(g);
                ret.push(j);
                input = input.replace(g, '');
                match = pattern.exec(input);
            }
            return ret;
        }
    };

    const point3D = Pacem.Geometry.LinearAlgebra.Vector3D;

    export abstract class PolyhedronElement extends Pacem3DPrimitiveElement {

        @Watch({ emit: false, converter: PropertyConverters.Number }) radius: number;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'radius') {
                this._assignMeshGeometry(val);
            }
        }

        private _assignMeshGeometry(radius?: number) {
            this.geometry = this.createMeshGeometry(radius > .0 ? radius : 1.0);
        }

        protected createDefaultGeometry() {
            return this.createMeshGeometry(1.0);
        }

        protected abstract createMeshGeometry(radius: number): Pacem.Drawing3D.MeshGeometry;
    }

    // #region Tetrahedron

    @CustomElement({ tagName: P + '-'  + TAG_MIDDLE_NAME + '-primitive-tetrahedron' })
    export class PacemTetrahedronElement extends PolyhedronElement {

        static createMeshGeometry(radius?: number): Pacem.Drawing3D.MeshGeometry {
            radius ||= 1.0;
            const nodesCoordsString = "0 0.5774 -0.8165, 0 0.5774 0.8165, 0.8165 -0.5774 0, -0.8165 -0.5774 0";
            const nodesToParse = nodesCoordsString.split(',');
            const nodes = [];
            for (let i = 0; i < nodesToParse.length; i++) {
                const nodeToParse = nodesToParse[i];
                const pt3D = _utils.parseFloats(nodeToParse);
                nodes.push({ x: pt3D[0] * radius, y: pt3D[1] * radius, z: pt3D[2] * radius });
            }
            const indices = [1, 2, 0, 2, 3, 0, 3, 1, 0, 3, 2, 1];
            const textureCoordsString = "0.5 0.9995, 0.5 0.0004995, 0.0004995 0.5, 0.9995 0.5,  0.5 0.0004995, 0.9995 0.5, 0.5 0.9995, 0.0004995 0.5,  0.9995 0.5, 0.5 0.9995, 0.0004995 0.5, 0.5 0.0004995";
            const pointsToParse = textureCoordsString.split(',');
            const texIndices = [4, 5, 6, 7, 8, 9, 10, 11, 0, 3, 2, 1];
            const uv = [];
            for (let i = 0; i < texIndices.length; i++) {
                const ndx = texIndices[i];
                const uvCoords = _utils.parseFloats(pointsToParse[ndx]);
                uv.push({ x: uvCoords[0], y: uvCoords[1] });
            }
            const geom = new Pacem.Drawing3D.MeshGeometry(nodes, indices, uv);
            Pacem.Drawing3D.computeSharpVertexNormals(geom);
            return geom;
        }

        protected createMeshGeometry(radius: number = this.radius): Pacem.Drawing3D.MeshGeometry {
            return PacemTetrahedronElement.createMeshGeometry(radius);
        }

    }

    // #endregion

    // #region Octahedron

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-primitive-octahedron' })
    export class PacemOctahedronElement extends PolyhedronElement {

        static createMeshGeometry(radius?: number): Pacem.Drawing3D.MeshGeometry {
            radius ||= 1.0;
            // -------------------------------------------------------------------------------------------------
            const nodesCoordsString = "0 0.7071 -0.7071, 0 0.7071 0.7071, 1 0 0, 0 -0.7071 -0.7071, -1 0 0, 0 -0.7071 0.7071";
            const indices = [1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 0, 4, 5, 1, 5, 2, 1, 2, 5, 3, 4, 3, 5];
            const textureCoordsString = "0.5 0.9995, 0.5 0.9995, 0.0004995 0.5, 0.5 0.9995, 0.9995 0.5, 0.5 0.0004995, 0.5 0.0004995, 0.9995 0.5, 0.5 0.9995, 0.0004995 0.5, 0.5 0.0004995, 0.5 0.9995, 0.5 0.0004995, 0.9995 0.5, 0.5 0.9995, 0.0004995 0.5, 0.5 0.0004995, 0.0004995 0.5, 0.5 0.0004995, 0.5 0.9995, 0.5 0.0004995, 0.9995 0.5, 0.5 0.0004995, 0.5 0.9995";
            const texIndices = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 0, 17, 18, 19, 20, 21, 1, 2, 22, 23, 4, 3, 5];
            // -------------------------------------------------------------------------------------------------
            const nodesToParse = nodesCoordsString.split(',');
            const nodes = [];
            for (let i = 0; i < nodesToParse.length; i++) {
                const nodeToParse = nodesToParse[i];
                const pt3D = _utils.parseFloats(nodeToParse);
                nodes.push({ x: pt3D[0] * radius, y: pt3D[1] * radius, z: pt3D[2] * radius });
            }
            const pointsToParse = textureCoordsString.split(',');
            const uv = [];
            for (let i = 0; i < texIndices.length; i++) {
                const ndx = texIndices[i];
                const uvCoords = _utils.parseFloats(pointsToParse[ndx]);
                uv.push({ x: uvCoords[0], y: uvCoords[1] });
            }
            const geom = new Pacem.Drawing3D.MeshGeometry(nodes, indices, uv);
            Pacem.Drawing3D.computeSharpVertexNormals(geom);
            return geom;
        }

        protected createMeshGeometry(radius: number = this.radius): Pacem.Drawing3D.MeshGeometry {
            return PacemOctahedronElement.createMeshGeometry(radius);
        }
    }

    // #endregion

    // #region Hexahedron

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-primitive-hexahedron' })
    export class PacemHexahedronElement extends PolyhedronElement {

        static createMeshGeometry(radius?: number): Pacem.Drawing3D.MeshGeometry {
            radius ||= 1.0;
            const inv_sqrt3 = 1.0 / Math.sqrt(3.0);
            const w = 2.0 * radius * inv_sqrt3;
            return Pacem.Components.Drawing3D.PacemBoxElement.createMeshGeometry(w, w, w);
        }

        protected createMeshGeometry(radius: number = this.radius): Pacem.Drawing3D.MeshGeometry {
            return PacemHexahedronElement.createMeshGeometry(radius);
        }
    }

    // #endregion

    // #region Icosahedron

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-primitive-icosahedron' })
    export class PacemIcosahedronElement extends PolyhedronElement {

        static createMeshGeometry(radius?: number): Pacem.Drawing3D.MeshGeometry {
            radius ||= 1.0;
            const nodesCoordsString = "0 0.850651 -0.525731, 0 0.850651 0.525731, 0.850651 0.525731 0, 0.525731 0 -0.850651, -0.525731 0 -0.850651, -0.850651 0.525731 0, -0.525731 0 0.850651, 0.525731 0 0.850651, 0.850651 -0.525731 0, 0 -0.850651 0.525731, 0 -0.850651 -0.525731, -0.850651 -0.525731 0";
            const indices = [1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 1, 0,
                5, 6, 1, 6, 7, 1, 7, 2, 1, 2, 8, 3,
                2, 7, 8, 6, 9, 7, 9, 8, 7, 8, 10, 3,
                8, 9, 10, 6, 11, 9, 11, 10, 9, 10, 4, 3,
                10, 11, 4, 6, 5, 11, 5, 4, 11];
            const textureCoordsString = "0.5 0.808708, 0.5 0.999501, 0.5 0.808708, 0.191292 0.5,  " +
                "0.000499547 0.5, 0.5 0.808708, 0.9995 0.5, 0.808708 0.5," +
                "0.000499487 0.5, 0.5 0.191292, 0.5 0.000499487, 0.5 0.191292," +
                "0.5 0.191292, 0.999501 0.5, 0.5 0.808708, 0.5 0.808708," +
                "0.9995 0.5, 0.808708 0.999501, 0.191292 0.5, 0.808708 0.5," +
                "0.5 0.999501, 0.808708 0.5, 0.999501 0.808708, 0.5 0.999501," +
                "0.000499487 0.5, 0.5 0.191292, 0.5 0.808708, 0.9995 0.5," +
                "0.808708 0.999501, 0.191292 0.5, 0.808708 0.5, 0.5 0.999501," +
                "0.808708 0.5, 0.999501 0.808708, 0.5 0.808708, 0.5 0.191292," +
                "0.9995 0.5, 0.000499547 0.5, 0.5 0.191292, 0.191292 0.5," +
                "0.5 0.000499487, 0.808708 0.5, 0.5 0.000499487, 0.999501 0.191292," +
                "0.5 0.191292, 0.808708 0.000499487, 0.9995 0.5, 0.5 0.191292," +
                "0.5 0.808708, 0.9995 0.5, 0.5 0.191292, 0.808708 0.000499487," +
                "0.999501 0.5, 0.5 0.808708, 0.5 0.000499487, 0.808708 0.5," +
                "0.999501 0.191292, 0.808708 0.5, 0.5 0.808708, 0.5 0.191292";
            const texIndices = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
                24, 25, 0, 26, 27, 28, 29, 30, 31, 32, 33, 1,
                34, 35, 36, 2, 37, 38, 39, 40, 41, 42, 43, 7,
                44, 45, 46, 8, 47, 48, 49, 50, 51, 52, 53, 9,
                54, 55, 3, 10, 56, 57, 6, 58, 59, 5, 4, 11];
            // -------------------------------------------------------------------------------------------------
            const nodesToParse = nodesCoordsString.split(',');
            const nodes: Pacem.Drawing3D.Vector3D[] = [];
            for (let i = 0; i < nodesToParse.length; i++) {
                const nodeToParse = nodesToParse[i];
                const pt3D = _utils.parseFloats(nodeToParse);
                nodes.push({ x: pt3D[0] * radius, y: pt3D[1] * radius, z: pt3D[2] * radius });
            }
            const pointsToParse = textureCoordsString.split(',');
            const uv: Pacem.Drawing3D.UVMap = [];
            for (let i = 0; i < texIndices.length; i++) {
                const ndx = texIndices[i];
                const uvCoords = _utils.parseFloats(pointsToParse[ndx]);
                uv.push({ x: uvCoords[0], y: uvCoords[1] });
            }
            const geom = new Pacem.Drawing3D.MeshGeometry(nodes, indices, uv);
            Pacem.Drawing3D.computeSharpVertexNormals(geom);
            return geom;
        }

        protected createMeshGeometry(radius: number = this.radius): Pacem.Drawing3D.MeshGeometry {
            return PacemIcosahedronElement.createMeshGeometry(radius);
        }
    }

    // #endregion

    // #region Dodecahedron

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-primitive-dodecahedron' })
    export class PacemDodecahedronElement extends PolyhedronElement {

        static createMeshGeometry(radius?: number): Pacem.Drawing3D.MeshGeometry {
            radius ||= 1.0;
            const n1 = point3D.from(0.356822 * radius, 0.934172 * radius, 0 * radius);
            const n2 = point3D.from(-0.356822 * radius, 0.934172 * radius, 0 * radius);
            const n3 = point3D.from(0.57735 * radius, 0.57735 * radius, -0.57735 * radius);
            const n4 = point3D.from(0 * radius, 0.356822 * radius, -0.934172 * radius);

            const n5 = point3D.from(-0.57735 * radius, 0.57735 * radius, -0.57735 * radius);
            const n6 = point3D.from(-0.57735 * radius, 0.57735 * radius, 0.57735 * radius);
            const n7 = point3D.from(0 * radius, 0.356822 * radius, 0.934172 * radius);
            const n8 = point3D.from(0.57735 * radius, 0.57735 * radius, 0.57735 * radius);

            const n9 = point3D.from(0.934172 * radius, 0 * radius, -0.356822 * radius);
            const n10 = point3D.from(0.934172 * radius, 0 * radius, 0.356822 * radius);
            const n11 = point3D.from(0 * radius, -0.356822 * radius, 0.934172 * radius);
            const n12 = point3D.from(0.57735 * radius, -0.57735 * radius, 0.57735 * radius);

            const n13 = point3D.from(0.57735 * radius, -0.57735 * radius, -0.57735 * radius);
            const n14 = point3D.from(0.356822 * radius, -0.934172 * radius, 0 * radius);
            const n15 = point3D.from(-0.57735 * radius, -0.57735 * radius, 0.57735 * radius);
            const n16 = point3D.from(-0.356822 * radius, -0.934172 * radius, 0 * radius);

            const n17 = point3D.from(0 * radius, -0.356822 * radius, -0.934172 * radius);
            const n18 = point3D.from(-0.57735 * radius, -0.57735 * radius, -0.57735 * radius);
            const n19 = point3D.from(-0.934172 * radius, 0 * radius, 0.356822 * radius);
            const n20 = point3D.from(-0.934172 * radius, 0 * radius, -0.356822 * radius);

            const positions: Pacem.Drawing3D.Vector3D[] = [
                n1,
                n2,
                n3,
                n4,
                n5,
                n6,
                n7,
                n8,
                n9,
                n10,
                n11,
                n12,
                n13,
                n14,
                n15,
                n16,
                n17,
                n18,
                n19,
                n20
            ];

            const indices = [0, 2, 3, 0, 3, 4, 0, 4, 1, 1, 5, 6, 1, 6, 7,
                1, 7, 0, 7, 9, 8, 7, 8, 2, 7, 2, 0,
                7, 6, 10, 7, 10, 11, 7, 11, 9, 11, 13, 12,
                11, 12, 8, 11, 8, 9, 11, 10, 14, 11, 14, 15,
                11, 15, 13, 15, 17, 16, 15, 16, 12, 15, 12, 13,
                15, 14, 18, 15, 18, 19, 15, 19, 17, 19, 4, 3,
                19, 3, 16, 19, 16, 17, 19, 18, 5, 19, 5, 1,
                19, 1, 4, 18, 14, 10, 18, 10, 6, 18, 6, 5,
                3, 2, 8, 3, 8, 12, 3, 12, 16];
            const textureCoordsString = "0.5 0.999501, 0.5 0.999501, 0.191292 0.808708, 0.5 0.690792, " +
                "0.191292 0.808708, 0.191292 0.808708, 0.5 0.690792,                              " +
                "0.808708 0.808708, 0.000499517 0.5, 0.309208 0.5, 0.5 0.309208,                  " +
                "0.191292 0.191292, 0.191292 0.191292, 0.309208 0.5,                              " +
                "0.191292 0.191292, 0.5 0.000499517, 0.5 0.309208, 0.808708 0.191292,             " +
                "0.000499517 0.5, 0.309208 0.5, 0.690792 0.5, 0.808708 0.808708,                  " +
                "0.5 0.999501, 0.690792 0.5, 0.5 0.999501, 0.191292 0.808708,                     " +
                "0.690792 0.5, 0.191292 0.808708, 0.309208 0.5, 0.309208 0.5,                     " +
                "0.191292 0.191292, 0.5 0.000499517, 0.309208 0.5, 0.5 0.000499517,               " +
                "0.808708 0.191292, 0.309208 0.5, 0.808708 0.191292,                              " +
                "0.690792 0.5, 0.191292 0.808708, 0.309208 0.5, 0.690792 0.5,                     " +
                "0.191292 0.808708, 0.690792 0.5, 0.808708 0.808708,                              " +
                "0.191292 0.808708, 0.808708 0.808708, 0.808708 0.808708,                         " +
                "0.5 0.690792, 0.5 0.309208, 0.808708 0.808708, 0.5 0.309208,                     " +
                "0.808708 0.191292, 0.808708 0.191292, 0.9995 0.5, 0.191292 0.191292,             " +
                "0.5 0.000499517, 0.808708 0.191292, 0.191292 0.191292,                           " +
                "0.808708 0.191292, 0.690792 0.5, 0.191292 0.191292,                              " +
                "0.690792 0.5, 0.191292 0.191292, 0.5 0.000499517, 0.808708 0.191292,             " +
                "0.191292 0.191292, 0.808708 0.191292, 0.690792 0.5,                              " +
                "0.690792 0.5, 0.309208 0.5, 0.690792 0.5, 0.808708 0.808708,                     " +
                "0.5 0.999501, 0.690792 0.5, 0.5 0.999501, 0.191292 0.808708,                     " +
                "0.690792 0.5, 0.191292 0.808708, 0.5 0.000499517, 0.808708 0.191292,             " +
                "0.690792 0.5, 0.5 0.000499517, 0.690792 0.5, 0.309208 0.5,                       " +
                "0.309208 0.5, 0.191292 0.191292, 0.9995 0.5, 0.808708 0.808708,                  " +
                "0.5 0.690792, 0.9995 0.5, 0.5 0.690792, 0.5 0.309208,                            " +
                "0.9995 0.5, 0.5 0.309208, 0.309208 0.5, 0.690792 0.5,                            " +
                "0.808708 0.808708, 0.309208 0.5, 0.808708 0.808708,                              " +
                "0.5 0.999501, 0.000499517 0.5, 0.5 0.309208, 0.000499517 0.5,                    " +
                "0.5 0.690792, 0.5 0.690792, 0.000499517 0.5, 0.5 0.690792,                       " +
                "0.191292 0.191292";
            const texIndices = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
                32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
                44, 45, 0, 46, 47, 48, 49, 50, 51, 7, 52, 53,
                54, 55, 56, 57, 58, 59, 60, 61, 9, 62, 63, 64,
                65, 66, 67, 11, 68, 69, 70, 71, 72, 73, 74, 75,
                76, 77, 13, 78, 79, 80, 81, 82, 83, 15, 84, 85,
                86, 87, 88, 89, 90, 91, 92, 93, 17, 94, 95, 96,
                97, 98, 99, 19, 1, 4, 100, 14, 101, 102, 10, 103,
                18, 6, 5, 104, 2, 105, 106, 8, 107, 3, 12, 16];
            // -------------------------------------------------------------------------------------------------
            const pointsToParse = textureCoordsString.split(',');
            const uv: Pacem.Drawing3D.UVMap = [];
            for (let i = 0; i < texIndices.length; i++) {
                const ndx = texIndices[i];
                const uvCoords = _utils.parseFloats(pointsToParse[ndx]);
                uv.push({ x: uvCoords[0], y: uvCoords[1] });
            }
            const geom = new Pacem.Drawing3D.MeshGeometry(positions, indices, uv);
            Pacem.Drawing3D.computeSharpVertexNormals(geom);
            return geom;
        }

        protected createMeshGeometry(radius: number = this.radius): Pacem.Drawing3D.MeshGeometry {
            return PacemDodecahedronElement.createMeshGeometry(radius);
        }
    }

    // #endregion
}