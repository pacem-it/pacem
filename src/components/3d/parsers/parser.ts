namespace Pacem.Drawing3D {

    class OBJParser {

        static parse(content: string): MeshGeometry {

            // vertices
            const vertices: Vector3D[] = [];
            const vParser = /^v((\s+-?[\d\.]+){3})/gm;
            let arr = vParser.exec(content);
            while (arr && arr.length) {

                vertices.push(Point3DConverter.convert(arr[1]));
                arr = vParser.exec(content);
            }

            // uvmap
            const vt: UVMap = [];
            const tParser = /^vt((\s+-?[\d\.]+){2})/gm;
            arr = tParser.exec(content);
            while (arr && arr.length) {

                vt.push(Pacem.Point.parse(arr[1]));
                arr = tParser.exec(content);
            }

            const uv: UVMap = new Array<Point>(vt.length);

            // normals
            const vn: Vector3D[] = [];
            const nParser = /^vn((\s+-?[\d\.]+){3})/gm;
            arr = nParser.exec(content);
            while (arr && arr.length) {

                vn.push(Point3DConverter.convert(arr[1]));
                arr = nParser.exec(content);
            }

            const normals = new Array<Vector3D>(vn.length);

            const positions: Vector3D[] = [];
            const fParser = /^f((\s+([\d]+\/[\d]+\/[\d]+)){3,})/gm;
            arr = fParser.exec(content);
            while (arr && arr.length) {

                const fjParser = /([\d]+)\/([\d]+)\/([\d]+)/g;
                const face = arr[1];
                let jArr = fjParser.exec(face);
                let jIndex = 0;

                var vIndex0: number,
                    tIndex0: number,
                    nIndex0: number;
                var vIndex: number,
                    tIndex: number,
                    nIndex: number;

                var index = positions.length;

                while (jArr && jArr.length) {

                    if (jIndex > 2) {
                        // 4+ vertex-face
                        // but mesh only allows triangluar faces

                        // re-add(0)
                        positions.push(vertices[vIndex0]);
                        uv[index] = vt[tIndex0];
                        normals[index] = vn[nIndex0];

                        index++;

                        // re-add(last)
                        positions.push(vertices[vIndex]);
                        uv[index] = vt[tIndex];
                        normals[index] = vn[nIndex];

                        index++;
                    }

                    // OBJ indexes are 1-based
                    vIndex = parseInt(jArr[1]) - 1;
                    tIndex = parseInt(jArr[2]) - 1;
                    nIndex = parseInt(jArr[3]) - 1;

                    positions.push(vertices[vIndex]);
                    uv[index] = vt[tIndex];
                    normals[index] = vn[nIndex];

                    if (jIndex === 0) {
                        vIndex0 = vIndex;
                        tIndex0 = tIndex;
                        nIndex0 = nIndex;
                    }

                    jIndex++;
                    index++;

                    jArr = fjParser.exec(face);
                }

                // loop
                arr = fParser.exec(content);

            }

            // faces

            return new MeshGeometry(
                positions,
                [],
                uv,
                normals
            );
        }

    }

    class Parser3D {

        @Transformer('parse3D')
        static parseGeometry(content: string, type: 'obj' | 'mtl'): NodeGeometry | Material {

            switch (type.toLowerCase()) {
                case 'obj':
                    return OBJParser.parse(content);
                default:
                    throw new Error(`Type '${type}' is not supported.`);
            }

        }

    }
}