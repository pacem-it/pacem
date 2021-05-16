namespace Pacem.Drawing3D {

    export interface NodeGeometry {

        positions: Vector3D[];

    }

    export interface MeshGeometry extends NodeGeometry {
        triangleIndices: number[];
        textureCoordinates: UVMap;
        normals: Vector3D[];
    }

    export abstract class NodeGeometry {

        constructor(positions: Vector3D[] = []) {
            this.positions = positions;
        }

        barycenter(): Vector3D {
            const positions = this.positions;
            var bary = { x: 0, y: 0, z: 0 };
            if (!Utils.isNullOrEmpty(positions)) {
                var count = positions.length;
                for (var i = 0; i < positions.length; i++) {
                    var pt = positions[i];
                    bary.x += pt.x;
                    bary.y += pt.y;
                    bary.z += pt.z;
                }
                var countDbl = 1.0 * count;
                bary.x /= countDbl;
                bary.y /= countDbl;
                bary.z /= countDbl;
            }
            return bary;
        }
    }

    export class LineGeometry extends NodeGeometry {
    }

    export class MeshGeometry extends NodeGeometry {

        constructor(positions: Vector3D[], triangleIndices: number[], textureCoordinates: UVMap = [], normals: Vector3D[] = []) {
            super(positions);
            this.triangleIndices = triangleIndices;
            this.textureCoordinates = textureCoordinates;
            this.normals = normals;
        }

        triangleIndices: number[];
        textureCoordinates: UVMap;
        normals: Vector3D[];
    }

}