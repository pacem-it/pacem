/// <reference path="primitive.ts" />
namespace Pacem.Components.Drawing3D {

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-primitive-cylinder' })
    export class PacemCylinderElement extends Pacem3DPrimitiveElement {

        @Watch({ emit: false, converter: PropertyConverters.Number }) radius: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) height: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) sides: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) heightSegments: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) capSegments: number;

        static createMeshGeometry(radius?: number, height?: number, sides?: number, heightSegments?: number, capSegments?: number): Pacem.Drawing3D.MeshGeometry {
            const r = radius || 1.0;
            height ||= 1.0;
            sides ||= 18;
            heightSegments ||= 5;
            capSegments ||= 1;

            const nodes: Pacem.Drawing3D.Vector3D[] = [],
                uv: Pacem.Drawing3D.UVMap = [],
                indices: number[] = [];

            const theta = DEG2RAD * (360.0 / sides);

            // top & bottom vertices (pivot @(0,0,0))
            nodes.push({ x: .0, y: height, z: .0 });
            nodes.push({ x: .0, y: .0, z: .0 });
            // ======================================
            // cap loops
            const capRadius = r / capSegments;
            for (let j = 1; j <= capSegments; j++) {
                //int j_prev = j - 1;
                var rho = capRadius * j;
                for (var i = 0; i < sides; i++) {
                    const startIndex = 2 + 2 * sides * (j - 1);
                    const A = i == 0 ? startIndex + 2 * (sides - 1) : startIndex + 2 * (i - 1);
                    const B = startIndex + 2 * i;
                    const u = Math.cos(theta * i);
                    const v = -Math.sin(theta * i);
                    const u_prev = Math.cos(theta * (i - 1.0));
                    const v_prev = -Math.sin(theta * (i - 1.0));
                    const x = rho * u;
                    const z = rho * v;
                    const topPoint = { x, y: height, z };
                    const bottomPoint = { x, y: .0, z };
                    // 
                    nodes.push(topPoint);
                    nodes.push(bottomPoint);
                    // coordinates & texture
                    const factor = .5 * rho / r;
                    const uB = u * factor;
                    const vB = v * factor;
                    const uA = u_prev * factor;
                    const vA = v_prev * factor;
                    if (j == 1) {
                        const faceIndicesTop = [0 /* top vertex*/, A, B];
                        const faceIndicesBottom = [1 /* bottom vertex*/, B + 1, A + 1];
                        // texture
                        const uvTop = [
                            { x: .5, y: .5 },
                            { x: .5 + uA, y: .5 - vA },
                            { x: 0.5 + uB, y: .5 - vB }];
                        const uvBottom = [
                            { x: .5, y: .5 },
                            { x: 0.5 + uB, y: .5 + vB },
                            { x: .5 + uA, y: .5 + vA }];

                        // faces
                        Array.prototype.push.apply(indices, faceIndicesTop);
                        Array.prototype.push.apply(indices, faceIndicesBottom);
                        // texture
                        for (let i = 0; i < uvTop.length; i++)
                            uv.push(uvTop[i]);
                        for (let i = 0; i < uvBottom.length; i++)
                            uv.push(uvBottom[i]);

                    }
                    else {
                        const startIndexPrevLoop = 2 + 2 * sides * (j - 2);

                        const D = i == 0 ? startIndexPrevLoop + 2 * (sides - 1) : startIndexPrevLoop + 2 * (i - 1);
                        const C = startIndexPrevLoop + 2 * i;
                        // coordinates & texture
                        const factor0 = .5 * ((j - 1.0) / capSegments);
                        const uC = u * factor0;
                        const vC = v * factor0;
                        const uD = u_prev * factor0;
                        const vD = v_prev * factor0;
                        const uvA = { x: .5 + uA, y: .5 - vA };
                        const uvB = { x: .5 + uB, y: .5 - vB };
                        const uvC = { x: .5 + uC, y: .5 - vC };
                        const uvD = { x: .5 + uD, y: .5 - vD };
                        const uvA2 = { x: .5 + uA, y: .5 + vA };
                        const uvB2 = { x: .5 + uB, y: .5 + vB };
                        const uvC2 = { x: .5 + uC, y: .5 + vC };
                        const uvD2 = { x: .5 + uD, y: .5 + vD };

                        // top
                        indices.push(A); indices.push(B); indices.push(D);
                        indices.push(D); indices.push(B); indices.push(C);
                        // bottom
                        indices.push(C + 1); indices.push(B + 1); indices.push(A + 1);
                        indices.push(C + 1); indices.push(A + 1); indices.push(D + 1);
                        // textures top
                        uv.push(uvA);
                        uv.push(uvB);
                        uv.push(uvD);
                        uv.push(uvD);
                        uv.push(uvB);
                        uv.push(uvC);
                        // texture bottom
                        uv.push(uvC2);
                        uv.push(uvB2);
                        uv.push(uvA2);
                        uv.push(uvC2);
                        uv.push(uvA2);
                        uv.push(uvD2);
                    }

                }
            }

            // ======================================
            // side loops
            const sideStartIndex = 2 + 2 * sides * (capSegments);
            const capLastIndex = 2 + 2 * sides * (capSegments - 1);
            const fU = 1.0 / sides;
            const fV = 1.0 / heightSegments;

            for (let j = 1; j <= heightSegments; j++) {
                for (let i = 0; i < sides; i++) {
                    if (j != heightSegments) {
                        var x = r * Math.cos(theta * i);
                        var z = -r * Math.sin(theta * i);
                        var y = (height * j) / heightSegments;
                        //
                        nodes.push({ x, y, z });
                    }
                    const i_prev = i == 0 ? sides - 1 : i - 1;
                    const A = j == 1 ? capLastIndex + 2 * i_prev + 1 : sideStartIndex + sides * (j - 2) + i_prev;
                    const B = j == 1 ? capLastIndex + 2 * i + 1 : sideStartIndex + sides * (j - 2) + i;
                    const C = j == heightSegments ? capLastIndex + 2 * i : sideStartIndex + sides * (j - 1) + i;
                    // const D = j == heightSegments ? capLastIndex + 2 * i_prev : sideStartIndex + sides * (j - 1) + i_prev;

                    const u_prev = i_prev * fU;
                    const v_prev = (j - 1) * fV;
                    const u = i == 0 ? 1.0 : i * fU;
                    const v = j * fV;

                    const uvA = { x: u_prev, y: v_prev };
                    const uvB = { x: u, y: v_prev };
                    const uvC = { x: u, y: v };
                    const uvD = { x: u_prev, y: v };

                    indices.push(A);
                    indices.push(B);
                    indices.push(C);
                    //
                    uv.push(uvA); uv.push(uvB); uv.push(uvC);
                    uv.push(uvA); uv.push(uvC); uv.push(uvD);

                }
            }

            // put the whole thing together
            return new Pacem.Drawing3D.MeshGeometry(nodes, indices, uv);
        }

        protected createDefaultGeometry() {
            return PacemCylinderElement.createMeshGeometry();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'radius':
                case 'height':
                case 'sides':
                case 'heightSegments':
                case 'capSegments':
                    this.geometry = PacemCylinderElement.createMeshGeometry(this.radius, this.height, this.sides, this.heightSegments, this.capSegments);
                    break;
            }
        }
    }

}