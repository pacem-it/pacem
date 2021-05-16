/// <reference path="primitive.ts" />
namespace Pacem.Components.Drawing3D {

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-primitive-torus' })
    export class PacemTorusElement extends Pacem3DPrimitiveElement {

        @Watch({ emit: false, converter: PropertyConverters.Number }) radius: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) innerRadius: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) segments: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) sides: number;

        static createMeshGeometry(radius?: number, innerRadius?: number, segments?: number, sides?: number): Pacem.Drawing3D.MeshGeometry {
            //
            const nodes: Pacem.Drawing3D.Vector3D[] = [];
            const uv: Pacem.Drawing3D.UVMap = []
            const coords: number[] = [];
            //
            segments ||= 24;
            sides ||= 12;

            const theta = DEG2RAD * (360.0 / segments);
            const phi = DEG2RAD * (360.0 / sides);
            const r1 = radius || 1.0;
            const r2 = innerRadius || .25;

            for (let j = 0; j < segments; j++) {
                // Math.PI/2 adjustement (useful for UV mapping)
                const angle1 = theta * j - Math.PI / 2.0;
                const sin_angle1 = Math.sin(angle1);
                const cos_angle1 = Math.cos(angle1);
                for (let i = 0; i < sides; i++) {
                    // Math.PI adjustement (useful for UV mapping)
                    const angle2 = phi * i + Math.PI;
                    const cos_angle2 = Math.cos(angle2);
                    const x = r1 * cos_angle1 + r2 * cos_angle2 * cos_angle1;
                    const y = r2 * Math.sin(angle2);
                    const z = r1 * sin_angle1 + r2 * cos_angle2 * sin_angle1;
                    nodes.push({ x, y, z });

                    const prev_j = j > 0 ? j - 1 : segments - 1;
                    const prev_i = i > 0 ? i - 1 : sides - 1;
                    const u = j == 0 ? .0 : 1.0 - 1.0 * j / segments;
                    const v = i > 0 ? 1.0 * i / sides : 1.0;
                    const u_prev = j > 0 ? 1.0 - (j - 1.0) / segments : 1.0 / segments;
                    const v_prev = i > 0 ? (i - 1.0) / sides : 1.0 - 1.0 / sides;

                    // triangles <=> Int32Collection
                    //           <=> PointCollection
                    coords.push(j * sides + prev_i);
                    coords.push(prev_j * sides + prev_i);
                    coords.push(prev_j * sides + i);
                    coords.push(j * sides + prev_i);
                    coords.push(prev_j * sides + i);
                    coords.push(j * sides + i);
                    //
                    uv.push({ x: u, y: v_prev });
                    uv.push({ x: u_prev, y: v_prev });
                    uv.push({ x: u_prev, y: v });
                    uv.push({ x: u, y: v_prev });
                    uv.push({ x: u_prev, y: v });
                    uv.push({ x: u, y: v });
                }
            }

            return new Pacem.Drawing3D.MeshGeometry(nodes, coords, uv);
        }

        protected createDefaultGeometry() {
            return PacemTorusElement.createMeshGeometry();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'radius':
                case 'innerRadius':
                case 'segments':
                case 'sides':
                    this.geometry = PacemTorusElement.createMeshGeometry(this.radius, this.innerRadius, this.segments, this.sides);
                    break;
            }
        }
    }

}