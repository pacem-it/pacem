/// <reference path="primitive.ts" />
namespace Pacem.Components.Drawing3D {

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-primitive-sphere' })
    export class PacemSphereElement extends Pacem3DPrimitiveElement {

        @Watch({ emit: false, converter: PropertyConverters.Number }) radius: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) segments: number;

        static createMeshGeometry(radius?: number, segs?: number): Pacem.Drawing3D.MeshGeometry {
            //
            const nodes: Pacem.Drawing3D.Vector3D[] = [];
            const uv: Pacem.Drawing3D.UVMap = []
            const indices: number[] = [];
            //
            const r = radius || 1,
                tessellation = segs || 8;
            const theta = DEG2RAD * (360.0 / tessellation);

            const segments = tessellation % 2 == 0 ? tessellation / 2 : (tessellation - 1) / 2;
            // top vertex
            nodes.push({ x: .0, y: r, z: .0 });
            for (let j = 1; j < segments; j++) {
                // loop "latitude"
                const angle1 = theta * j;
                const cos_angle1 = Math.cos(angle1);
                const sin_angle1 = Math.sin(angle1);
                const v = 1.0 - 1.0 * j / segments;
                for (let i = 0; i < tessellation; i++) {
                    // loop "longitude"
                    const angle2 = theta * i - Math.PI / 2.0;
                    const cos_angle2 = Math.cos(angle2);
                    const sin_angle2 = Math.sin(angle2);
                    const x = r * sin_angle1 * cos_angle2;
                    const y = r * cos_angle1;
                    const z = r * sin_angle1 * sin_angle2;
                    nodes.push({ x, y, z });
                    // coordinates & texture
                    const i_prev = i == 0 ? tessellation - 1 : i - 1;
                    const u = i == 0 ? .0 : 1.0 - 1.0 * i / tessellation;
                    const u_prev = 1.0 - 1.0 * i_prev / tessellation;

                    // triangles
                    if (j == 1) {
                        indices.push(1 + i);
                        indices.push(1 + i_prev);
                        indices.push(0);
                        //
                        uv.push({ x: u, y: v });
                        uv.push({ x: u_prev, y: v });
                        uv.push({ x: .5, y: 1.0 });
                    }
                    else {
                        indices.push((j - 1) * tessellation + i + 1);
                        indices.push((j - 1) * tessellation + i_prev + 1);
                        indices.push((j - 2) * tessellation + i_prev + 1);
                        indices.push((j - 1) * tessellation + i + 1);
                        indices.push((j - 2) * tessellation + i_prev + 1);
                        indices.push((j - 2) * tessellation + i + 1);
                        //
                        const v_prev = 1.0 - (j - 1.0) / segments;
                        //var faceUV = [];
                        uv.push({ x: u, y: v });
                        uv.push({ x: u_prev, y: v });
                        uv.push({ x: u_prev, y: v_prev });
                        uv.push({ x: u, y: v });
                        uv.push({ x: u_prev, y: v_prev });
                        uv.push({ x: u, y: v_prev });
                    }
                }
            }
            // bottom vertex
            nodes.push({ x: .0, y: -r, z: .0 });
            const last = nodes.length - 1;
            for (let i = 0; i < tessellation; i++) {
                const j = segments - 2;
                const i_prev = i == 0 ? tessellation - 1 : i - 1;
                const u = i == 0 ? .0 : 1.0 - 1.0 * i / tessellation;
                const u_prev = 1.0 - 1.0 * i_prev / tessellation;
                const v = 1.0 - (j + 1.0) / segments;

                // triangles
                indices.push(last);
                indices.push(j * tessellation + 1 + i_prev);
                indices.push(j * tessellation + 1 + i);
                uv.push({ x: .5, y: 0 });
                uv.push({ x: u_prev, y: v });
                uv.push({ x: u, y: v });

            }
            return  new Pacem.Drawing3D.MeshGeometry(nodes, indices, uv);
        }

        protected createDefaultGeometry() {
            return PacemSphereElement.createMeshGeometry();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'radius':
                case 'segments':
                    this.geometry = PacemSphereElement.createMeshGeometry(this.radius, this.segments);
                    break;
            }
        }
    }

}