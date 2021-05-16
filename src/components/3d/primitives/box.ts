/// <reference path="primitive.ts" />
namespace Pacem.Components.Drawing3D {

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-primitive-box' })
    export class PacemBoxElement extends Pacem3DPrimitiveElement {

        @Watch({ emit: false, converter: PropertyConverters.Number }) width: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) height: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) depth: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) widthSegments: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) heightSegments: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) depthSegments: number;

        static createMeshGeometry(width?: number, height?: number, depth?: number, widthSegments?: number, heightSegments?: number, depthSegments?: number): Pacem.Drawing3D.MeshGeometry {
            const w = width || 1, h = height || 1, d = depth || 1,
                sw = widthSegments || 1, sh = heightSegments || 1, sd = depthSegments || 1;
            const positions: Pacem.Drawing3D.Vector3D[] = [];
            const uv: Pacem.Drawing3D.UVMap = [];
            const indices: number[] = [];
            // populationg positions
            for (var j = 0; j <= sh; j++) {
                var y = h / 2.0 - h * (1.0 * j) / (1.0 * sh);
                for (var k = 0; k <= sd; k++) {
                    var z = -d / 2.0 + d * (1.0 * k) / (1.0 * sd);
                    for (var i = 0; i <= sw; i++) {
                        var x = -w / 2.0 + w * (1.0 * i) / (1.0 * sw);
                        // add only surface nodes
                        if (i == 0 || i == sw || k == 0 || k == sd || j == 0 || j == sh)
                            positions.push({ x, y, z });
                    }
                }
            }
            var getPosIndex = function (x, y, z) {
                var epsilon = .00001;
                for (var i = 0; i < positions.length; i++) {
                    var pt = positions[i];
                    if (Math.abs(pt.x - x) < epsilon && Math.abs(pt.y - y) < epsilon && Math.abs(pt.z - z) < epsilon) return i;
                }
                return -1;
            }
            var appendFace = function (c_1, c_2, c_3, c_4, u, v, u_next, v_next) {
                indices.push(c_1);
                indices.push(c_2);
                indices.push(c_3);
                indices.push(c_1);
                indices.push(c_3);
                indices.push(c_4);
                uv.push({ x: u, y: v_next });
                uv.push({ x: u_next, y: v_next });
                uv.push({ x: u_next, y: v });
                uv.push({ x: u, y: v_next });
                uv.push({ x: u_next, y: v });
                uv.push({ x: u, y: v });
            }
            // top face (1)
            for (var k = 0; k < sd; k++) {
                var y = h / 2.0;
                var z = -d / 2.0 + d * (1.0 * k) / (1.0 * sd);
                var z_next = -d / 2.0 + d * (1.0 * (k + 1)) / (1.0 * sd);
                for (var i = 0; i < sw; i++) {
                    var x = -w / 2.0 + (1.0 * i) * w / (1.0 * sw);
                    var x_next = -w / 2.0 + (1.0 * (i + 1)) * w / (1.0 * sw);
                    // coord-indices + tex-coords
                    var c_1 = getPosIndex(x, y, z_next);
                    var c_2 = getPosIndex(x_next, y, z_next);
                    var c_3 = getPosIndex(x_next, y, z);
                    var c_4 = getPosIndex(x, y, z);
                    var u_next = (1.0 * (i + 1)) / (1.0 * sw);
                    var u = (1.0 * i) / (1.0 * sw);
                    var v_next = 1.0 - (1.0 * (k + 1)) / (1.0 * sd);
                    var v = 1.0 - (1.0 * k) / (1.0 * sd);
                    appendFace(c_1, c_2, c_3, c_4, u, v, u_next, v_next);
                }
            }
            // back face (2)
            for (var j = 0; j < sh; j++) {
                var y = h / 2.0 - (1.0 * j) * h / (1.0 * sh);
                var y_next = h / 2.0 - (j + 1.0) * h / (1.0 * sh);
                var z = -d / 2.0;
                for (var i = 0; i < sw; i++) {
                    var x = w / 2.0 - 1.0 * i * w / (1.0 * sw);
                    var x_next = w / 2.0 - (i + 1.0) * w / (1.0 * sw);
                    // coord-indices + tex-coords
                    var c_1 = getPosIndex(x, y_next, z);
                    var c_2 = getPosIndex(x_next, y_next, z);
                    var c_3 = getPosIndex(x_next, y, z);
                    var c_4 = getPosIndex(x, y, z);
                    var u_next = (i + 1.0) / (1.0 * sw);
                    var u = (1.0 * i) / (1.0 * sw);
                    var v_next = 1.0 - (j + 1.0) / (1.0 * sh);
                    var v = 1.0 - 1.0 * j / (1.0 * sh);
                    appendFace(c_1, c_2, c_3, c_4, u, v, u_next, v_next);
                }
            }
            // left face (3)
            for (var j = 0; j < sh; j++) {
                var y = h / 2.0 - (1.0 * j) * h / (1.0 * sh);
                var y_next = h / 2.0 - (j + 1.0) * h / (1.0 * sh);
                var x = -w / 2.0;
                for (var k = 0; k < sd; k++) {
                    var z = -d / 2.0 + k * d / (1.0 * sd);
                    var z_next = -d / 2.0 + (k + 1.0) * d / (1.0 * sd);
                    // coord-indices + tex-coords
                    var c_1 = getPosIndex(x, y_next, z);
                    var c_2 = getPosIndex(x, y_next, z_next);
                    var c_3 = getPosIndex(x, y, z_next);
                    var c_4 = getPosIndex(x, y, z);
                    var u_next = (k + 1.0) / (1.0 * sd);
                    var u = (1.0 * k) / (1.0 * sd);
                    var v_next = 1.0 - (j + 1.0) / (1.0 * sh);
                    var v = 1.0 - j / (1.0 * sh);
                    appendFace(c_1, c_2, c_3, c_4, u, v, u_next, v_next);
                }
            }
            // front face (4)
            for (var j = 0; j < sh; j++) {
                var y = h / 2.0 - j * h / (1.0 * sh);
                var y_next = h / 2.0 - (j + 1.0) * h / (1.0 * sh);
                var z = d / 2.0;
                for (var i = 0; i < sw; i++) {
                    var x = -w / 2.0 + i * w / (1.0 * sw);
                    var x_next = -w / 2.0 + (i + 1.0) * w / (1.0 * sw);
                    // coord-indices + tex-coords
                    var c_1 = getPosIndex(x, y_next, z);
                    var c_2 = getPosIndex(x_next, y_next, z);
                    var c_3 = getPosIndex(x_next, y, z);
                    var c_4 = getPosIndex(x, y, z);
                    var u_next = (i + 1.0) / (1.0 * sw);
                    var u = (1.0 * i) / (1.0 * sw);
                    var v_next = 1.0 - (j + 1.0) / (1.0 * sh);
                    var v = 1.0 - (1.0 * j) / (1.0 * sh);
                    appendFace(c_1, c_2, c_3, c_4, u, v, u_next, v_next);
                }
            }
            // right face (5)
            for (var j = 0; j < sh; j++) {
                var y = h / 2.0 - j * h / (1.0 * sh);
                var y_next = h / 2.0 - (j + 1.0) * h / (1.0 * sh);
                var x = w / 2.0;
                for (var k = 0; k < sd; k++) {
                    var z = d / 2.0 - k * d / (1.0 * sd);
                    var z_next = d / 2.0 - (k + 1.0) * d / (1.0 * sd);
                    // coord-indices + tex-coords
                    var c_1 = getPosIndex(x, y_next, z);
                    var c_2 = getPosIndex(x, y_next, z_next);
                    var c_3 = getPosIndex(x, y, z_next);
                    var c_4 = getPosIndex(x, y, z);
                    var u_next = (k + 1.0) / (1.0 * sd);
                    var u = (1.0 * k) / (1.0 * sd);
                    var v_next = 1.0 - (j + 1.0) / (1.0 * sh);
                    var v = 1.0 - (1.0 * j) / (1.0 * sh);
                    appendFace(c_1, c_2, c_3, c_4, u, v, u_next, v_next);
                }
            }
            // bottom face (6)
            for (var k = 0; k < sd; k++) {
                var y = -h / 2.0;
                var z = d / 2.0 - d * k / (1.0 * sd);
                var z_next = d / 2.0 - d * (k + 1.0) / (1.0 * sd);
                for (var i = 0; i < sw; i++) {
                    var x = -w / 2.0 + i * w / (1.0 * sw);
                    var x_next = -w / 2.0 + (i + 1.0) * w / (1.0 * sw);
                    // coord-indices + tex-coords
                    var c_1 = getPosIndex(x, y, z_next);
                    var c_2 = getPosIndex(x_next, y, z_next);
                    var c_3 = getPosIndex(x_next, y, z);
                    var c_4 = getPosIndex(x, y, z);
                    var u_next = (i + 1.0) / (1.0 * sw);
                    var u = (1.0 * i) / (1.0 * sw);
                    var v_next = 1.0 - (k + 1.0) / (1.0 * sd);
                    var v = 1.0 - (1.0 * k) / (1.0 * sd);
                    appendFace(c_1, c_2, c_3, c_4, u, v, u_next, v_next);
                }
            }
            const geom = new Pacem.Drawing3D.MeshGeometry(positions, indices, uv);
            Pacem.Drawing3D.computeSharpVertexNormals(geom);
            return geom;
        }

        protected createDefaultGeometry() {
            return PacemBoxElement.createMeshGeometry();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'width':
                case 'height':
                case 'depth':
                case 'widthSegments':
                case 'heightSegments':
                case 'depthSegments':
                    this.geometry = PacemBoxElement.createMeshGeometry(this.width, this.height, this.depth, this.widthSegments, this.heightSegments, this.depthSegments);
                    break;
            }
        }
    }

}