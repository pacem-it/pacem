/// <reference path="primitive.ts" />
namespace Pacem.Components.Drawing3D {

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-primitive-plane' })
    export class PacemPlaneElement extends Pacem3DPrimitiveElement {

        @Watch({ emit: false, converter: PropertyConverters.Number }) width: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) length: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) widthSegments: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) lengthSegments: number;

        static createMeshGeometry(width?: number, length?: number, widthSegments?: number, lengthSegments?: number): Pacem.Drawing3D.MeshGeometry {
            width ||= 1.0;
            length ||= 1.0;
            widthSegments ||= 4;
            lengthSegments ||= 4;
            const nodes: Pacem.Drawing3D.Vector3D[] = [];
            const uv: Pacem.Drawing3D.UVMap = [];
            const indices: number[] = [];
            const normals: Pacem.Drawing3D.Vector3D[] = [],
                normal = Pacem.Geometry.LinearAlgebra.Vector3D.from(0, 0, 1);

            for (let j = 0; j <= lengthSegments; j++) {
                for (let i = 0; i <= widthSegments; i++) {
                    const x = -width / 2.0 + i * width / (1.0 * widthSegments);
                    const y = .0;
                    const z = -length / 2.0 + j * length / (1.0 * lengthSegments);
                    nodes.push({ x, y, z });

                    if (j < lengthSegments && i < widthSegments) {
                        const rowPoints = widthSegments + 1;
                        // const colPoints = lengthSegments + 1;
                        const u_next = (i + 1.0) / (1.0 * widthSegments);
                        const u = (1.0 * i) / (1.0 * widthSegments);
                        const v_next = 1.0 - (j + 1.0) / (1.0 * lengthSegments);
                        const v = 1.0 - (1.0 * j) / (1.0 * lengthSegments);

                        indices.push((j + 1) * rowPoints + i);
                        indices.push((j + 1) * rowPoints + i + 1);
                        indices.push(j * rowPoints + i + 1);
                        indices.push((j + 1) * rowPoints + i);
                        indices.push(j * rowPoints + i + 1);
                        indices.push(j * rowPoints + i);
                        uv.push({ x: u, y: v_next });
                        uv.push({ x: u_next, y: v_next });
                        uv.push({ x: u_next, y: v });
                        uv.push({ x: u, y: v_next });
                        uv.push({ x: u_next, y: v });
                        uv.push({ x: u, y: v });

                        normals.push(normal, normal, normal, normal, normal, normal);
                    }

                }
            }

            return new Pacem.Drawing3D.MeshGeometry(nodes, indices, uv, normals);
        }

        protected createDefaultGeometry() {
            return PacemPlaneElement.createMeshGeometry();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'width':
                case 'length':
                case 'widthSegments':
                case 'lengthSegments':
                    this.geometry = PacemPlaneElement.createMeshGeometry(this.width, this.length, this.widthSegments, this.lengthSegments);
                    break;
            }
        }
    }

}