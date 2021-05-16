/// <reference path="../../../../dist/js/pacem-core.d.ts" />
/// <reference path="../types.ts" />
/// <reference path="../materials/material.ts" />

namespace Pacem.Components.Drawing3D {

    function isMeshGeometry(obj: any): obj is Pacem.Drawing3D.MeshGeometry {
        return 'positions' in obj && Utils.isArray(obj.positions)
            && 'triangleIndices' in obj && Utils.isArray(obj.triangleIndices);
    }

    function isVector3D(obj: any): obj is Pacem.Drawing3D.Vector3D {

        return 'x' in obj && typeof obj.x === 'number'
            && 'y' in obj && typeof obj.y === 'number'
            && 'z' in obj && typeof obj.z === 'number';
    }

    function flattenVectorArray(array: Pacem.Drawing3D.Vector3D[] | Pacem.Drawing3D.UVMap): number[] {
        const retval: number[] = [];

        for (let v of array) {
            if (isVector3D(v)) {
                retval.push(v.x, v.y, v.z);
            } else {
                retval.push(v.x, v.y);
            }
        }

        return retval;
    }

    const threeJsVersion = '0.128.0';
    const consts = {
        VERSION: threeJsVersion,
        API_URI: `https://unpkg.com/three@${threeJsVersion}/build/three.js`,
        ORBIT_URI:
            `https://unpkg.com/three@${threeJsVersion}/examples/js/controls/OrbitControls.js`
        ,
        LOADERS: [
            //`https://unpkg.com/three@${threeJsVersion}/examples/js/loaders/OBJLoader.js`,
            //`https://unpkg.com/three@${threeJsVersion}/examples/js/loaders/MTLLoader.js`,
        ],
        DEFAULT_MATERIAL: function () {
            return new THREE.MeshStandardMaterial({ color: '#069', flatShading: true })
        }
    };

    function matrix3DToMatrix4(m: Pacem.Geometry.LinearAlgebra.Matrix3D): THREE.Matrix4 {
        const matrix = new THREE.Matrix4();
        matrix.set(
            m.m11, m.m12, m.m13, m.m14,
            m.m21, m.m22, m.m23, m.m24,
            m.m31, m.m32, m.m33, m.m34,
            m.offsetX, m.offsetY, m.offsetZ, m.m44,
        )
        return matrix;
    }

    function flattenMatrix3D(m: Pacem.Geometry.LinearAlgebra.Matrix3D): number[] {
        return [
            // right way to translate the matrix3D to matrix4
            m.m11, m.m21, m.m31, m.offsetX,
            m.m12, m.m22, m.m32, m.offsetY,
            m.m13, m.m23, m.m33, m.offsetZ,
            m.m14, m.m24, m.m34, m.m44,
        ];
    }

    function nodeGeometryToBufferGeometry(mesh: Pacem.Drawing3D.NodeGeometry): THREE.BufferGeometry {
        const geometry = new THREE.BufferGeometry();
        const vertices = flattenVectorArray(mesh.positions);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

        if (mesh instanceof Pacem.Drawing3D.MeshGeometry) {

            if (!Utils.isNullOrEmpty(mesh.triangleIndices)) {
                geometry.setIndex(mesh.triangleIndices);
            }
            const vertices = flattenVectorArray(mesh.positions);
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            const uvs = flattenVectorArray(mesh.textureCoordinates);
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
            if (Utils.isNullOrEmpty(mesh.normals)) {
                geometry.computeVertexNormals();
            } else {
                const normals = flattenVectorArray(mesh.normals);
                geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            }
        }

        return geometry;
    }

    function lightToLight(item: Pacem.Components.Drawing3D.Pacem3DLightElement): THREE.Light {
        var light: THREE.Light;
        switch (item.type) {
            case 'spot':
                const spotLight = new THREE.SpotLight();
                spotLight.target.position.set(item.target.x, item.target.y, item.target.z);
                light = spotLight;
                break;
            default:
                light = new THREE.PointLight();
                break;
        }

        return light;
    }

    function materialToMaterial(material: Pacem.Drawing3D.Material): THREE.Material {
        if (Utils.isNull(material)) {
            return null;
        }

        const base = {
            color: material.color,
            opacity: material.opacity,
            transparent: true,
            wireframe: material.wireframe,
            visible: material.visible
        };

        const mipMapMaterial: ((m: THREE.Material) => THREE.Material) = (m) => {
            if (material.map) {
                m['map'] = new THREE.TextureLoader().load(material.map, _ => {
                    // console.log('texture loaded!');
                    m.needsUpdate = true;
                });
            }
            return m;
        }


        if (Pacem.Drawing3D.isStandardMaterial(material)) {

            const std = mipMapMaterial(new THREE.MeshStandardMaterial(Utils.extend(base, {
                roughness: material.roughness,
                metalness: material.metalness,
                emissive: material.emissiveColor,
                flatShading: material.flatShading,
                refractionRatio: material.refractionRatio,
            })));
            return std;

        } else if (Pacem.Drawing3D.isPhongMaterial(material)) {

            const phong = mipMapMaterial(new THREE.MeshPhongMaterial(Utils.extend(base, {
                shininess: material.shininess,
                emissive: material.emissiveColor,
                flatShading: material.flatShading,
                specular: material.specularColor,
                reflectivity: material.reflectivity,
                refractionRatio: material.refractionRatio,
            })));
            return phong;

        } else if (Pacem.Drawing3D.isLambertMaterial(material)) {

            const lambert = mipMapMaterial(new THREE.MeshLambertMaterial(Utils.extend(base, {
                emissive: material.emissiveColor,
                reflectivity: material.reflectivity,
                refractionRatio: material.refractionRatio,
            })));
            return lambert;

        } else if (Pacem.Drawing3D.isLineMaterial(material)) {

            const dash = material.dashArray && material.dashArray[0] || null,
                gap = material.dashArray && material.dashArray.length > 1 && material.dashArray[1] || dash;

            const lineMatOptions: THREE.LineDashedMaterialParameters = Utils.extend(base, {
                linecap: material.lineCap,
                linejoin: material.lineJoin,
                linewidth: material.lineWidth
            });
            return Utils.isNullOrEmpty(material.dashArray) ?
                new THREE.LineBasicMaterial(lineMatOptions)
                : new THREE.LineDashedMaterial(Utils.extend({ dashSize: dash, gapSize: gap }, lineMatOptions));

        } else if (Pacem.Drawing3D.isMaterial(material)) {

            const basic = mipMapMaterial(new THREE.MeshBasicMaterial(base));
            return basic;

        } else {
            return null;
        }
    }

    function materialToMaterials(frontMaterial: Pacem.Drawing3D.Material, backMaterial?: Pacem.Drawing3D.Material, multiAllowed?: boolean) {
        // material
        const multi = multiAllowed;

        // composite
        const materials = [];

        // front mat
        const material = materialToMaterial(frontMaterial);
        if (!Utils.isNull(material)) {
            material.side = THREE.FrontSide;
            materials.push(material);
        }

        // back mat
        if (!Utils.isNull(backMaterial)) {

            if (backMaterial == frontMaterial) {

                material.side = THREE.DoubleSide;

            } else {

                // multi-material
                const backsideMaterial = materialToMaterial(backMaterial);
                if (!Utils.isNull(backsideMaterial)) {
                    backsideMaterial.side = THREE.BackSide;
                    materials.push(backsideMaterial);
                }
            }
        }

        return multi && materials.length > 1 ? materials : material;
    }

    function load(item: Pacem.Components.Drawing3D.Pacem3DObjectElement): THREE.Mesh {
        if (!Utils.isNullOrEmpty(item.content)) {
            const type = item.type?.toLowerCase();
            switch (type) {
                case 'obj':
                    const obj = new THREE['OBJLoader']();
                    return obj.parse<THREE.Mesh>(item.content);
                default:
                    const loader = new THREE.ObjectLoader();
                    return loader.parse<THREE.Mesh>(item.content);
            }
        } else {
            throw new Error('Missing content.');
        }
    }

    function meshType(geometry: Pacem.Drawing3D.NodeGeometry): Pacem.Type<THREE.Mesh | THREE.Line> {
        return geometry instanceof Pacem.Drawing3D.LineGeometry ? THREE.Line : THREE.Mesh;
    }

    function build(mesh: Pacem.Components.Drawing3D.Pacem3DMeshElement): THREE.Mesh | THREE.Line {
        if (Utils.isNullOrEmpty(mesh.geometry)) {
            return null;
        }

        const ctor = meshType(mesh.geometry);
        return new ctor();
    }

    function isTHREEAvailable() {
        return 'THREE' in window;
    }

    async function whenTHREEAvailable(...args: (() => boolean)[]): Promise<void> {
        const start = Date.now();
        var initialized = false;
        do {
            initialized = isTHREEAvailable();
            for (let pred of args) {
                initialized &&= pred();
            }
            if (!initialized) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

        } while (!initialized && (Date.now() - start) < 30000);

        if (!initialized) {
            throw new Error('The wait for THREE adapter initialization timed out.');
        }
    }

    @CustomElement({ tagName: P + '-3d-three-adapter' })
    export class Pacem3DThreeAdapterElement extends Pacem3DAdapterElement {

        dispose(scene: Pacem3DElement): void {
            // do nothing
        }

        project(point3D: Pacem.Drawing3D.Vector3D): Point {
            // check feasibility
            if (Utils.isNull(this._camera) || Utils.isNull(this._stage))
                return null;
            //
            const vector = new THREE.Vector3(point3D.x, point3D.y, point3D.z);

            const width = this._stage.width, height = this._stage.height;
            const widthHalf = width / 2, heightHalf = height / 2;

            const point = vector.project(this._camera);

            const x = (point.x * widthHalf) + widthHalf;
            const y = - (point.y * heightHalf) + heightHalf;
            return { x: x, y: y };
        }

        private _3d: Pacem3DElement;
        private _stage: HTMLCanvasElement;
        private _renderer: THREE.WebGLRenderer = null;
        private _camera: THREE.Camera = null;
        private _scene: THREE.Scene = null;
        private _orbitCtrls: /*THREE.OrbitControls*/any = null;
        private _objects = new WeakMap<RenderableElement, THREE.Object3D>();
        private _dict: { [key: number]: RenderableElement } = {};

        @Watch({ emit: false, converter: PropertyConverters.Boolean }) orbit: boolean;

        get scene(): any {
            return this._scene;
        }

        raycast(point: Point, size: Size): { object: RenderableElement, point: Pacem.Drawing3D.Vector3D } {
            if (isTHREEAvailable() && !Utils.isNull(this._camera)) {
                const camera = this._camera;
                const vector = new THREE.Vector2(
                    (point.x / size.width) * 2 - 1,
                    -(point.y / size.height) * 2 + 1);

                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(vector, camera);

                const intersects = raycaster.intersectObjects(this._scene.children, true);
                let obj: THREE.Object3D;
                let intersection: THREE.Intersection;
                let j = 0;
                while (intersects.length > j && (intersection = intersects[j++]) && (obj = intersection.object)) {
                    const item = this._dict[obj.id];
                    if (item.inert) {
                        continue;
                    }
                    const v = intersection.point,
                        x = v.x, y = v.y, z = v.z,
                        point: Pacem.Drawing3D.Vector3D = { x, y, z };
                    return { object: this._dict[obj.id], point };
                }
            }
            return null;
        }

        // #region ABSTRACT IMPLEMENTATION

        async initialize(container: Pacem3DElement): Promise<HTMLCanvasElement> {

            if (!Utils.isNull(this._stage)) {
                return this._stage;
            }

            this._3d = container;
            const wrapper = container.stage;
            const stage = this._stage = document.createElement('canvas');
            wrapper.innerHTML = '';
            wrapper.appendChild(stage);

            await CustomElementUtils.importjs(consts.API_URI);
            await whenTHREEAvailable();
            await Promise.all(
                [CustomElementUtils.importjs(consts.ORBIT_URI)]
                    .concat(consts.LOADERS.map(js => CustomElementUtils.importjs(js)))
            );

            // here comes THREE.js
            this._scene = new THREE.Scene();
            // this._scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), consts.DEFAULT_MATERIAL()));

            this.invalidateSize(container.size);

            let w = this._stage.width,
                h = this._stage.height;

            //if (!ctrl.renderer)
            let parameters: THREE.WebGLRendererParameters = {
                canvas: stage, antialias: true, stencil: false, alpha: true //, clearAlpha: 1
            };
            this._renderer = new THREE.WebGLRenderer(parameters);
            this._renderer.setSize(w, h);

            this.orbit = container.orbit;

            return stage;
        }

        private _setCamera(cam: THREE.Camera) {
            this._camera = cam;
            this.invalidateSize(this._3d.size);
            this._disposeOrbitControls();
            // re-init
            if (this.orbit) {
                this._initOrbitControls();
            }
        }

        private _orbitControlsDelegate = (_?: any) => {
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'orbit') {
                if (val === true)
                    this._initOrbitControls();
                else
                    this._disposeOrbitControls();
            }
        }

        private _initOrbitControls() {
            const cam = this._camera;
            if (Utils.isNull(this._3d) || Utils.isNull(cam)) {
                return;
            }

            const controls = this._orbitCtrls = new THREE['OrbitControls'](cam, this._3d.stage);

            controls.addEventListener('change', this._orbitControlsDelegate);
        }

        private _disposeOrbitControls() {
            const controls = this._orbitCtrls;
            if (Utils.isNull(controls)) {
                return;
            }
            controls.removeEventListener('change', this._orbitControlsDelegate);
            controls.dispose();
        }

        invalidateSize(size: Size) {

            if (!isTHREEAvailable() || Utils.isNull(size)) {
                return;
            }

            let w = size.width;
            let h = size.height;
            this._stage.width = w;
            this._stage.height = h;
            let camera = this._camera;
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            }
            if (this._renderer) {
                this._renderer.setSize(w, h);
            }

        }

        removeItem(item: RenderableElement): void {

            const bag = this._objects;
            const obj3d = bag.get(item);
            if (!Utils.isNull(obj3d)) {
                this._scene.remove(obj3d);
                delete this._dict[obj3d.id];
                bag.delete(item);
            }

        }

        updateItem(item: RenderableElement): void {
            this._addOrUpdateItem(item);
        }

        addItem(item: RenderableElement): void {
            this._addOrUpdateItem(item);
        }

        private _ensureAndRefresh = (item: RenderableElement, object3D: THREE.Object3D, parent: THREE.Object3D) => {

            object3D.matrixAutoUpdate = false;

            // choose whether to render the object or not
            if (object3D.visible = !item.hide) {

                // the modeling part

                // 1. pacem 3d mesh
                if (Pacem.Drawing3D.isMesh(item)) {
                    const mesh3D = object3D as THREE.Mesh | THREE.Line;
                    if (item.flags.indexOf(StalePropertyFlag.Geometry) >= 0) {
                        mesh3D.geometry.dispose();
                        mesh3D.geometry = nodeGeometryToBufferGeometry(item.geometry);
                    }

                    if (item.flags.indexOf(StalePropertyFlag.Material) >= 0) {
                        mesh3D.material = materialToMaterials(item.material) || consts.DEFAULT_MATERIAL();
                    }
                }
                // 2. 3d 'native' object
                else if (item instanceof Pacem3DObjectElement
                    && (item.flags.indexOf(StalePropertyFlag.Material) >= 0 || item.flags.indexOf(StalePropertyFlag.Geometry) >= 0)
                ) {
                    // swap reference
                    object3D.parent && object3D.parent.remove(object3D);
                    object3D = load(item);
                }
                // 3. grouping object
                else if (item instanceof Pacem3DGroupElement) {
                    if (item.flags.indexOf(StalePropertyFlag.Children) >= 0) {

                        // remove all children
                        for (let j = object3D.children.length - 1; j >= 0; j--) {
                            const child = object3D.children[j];
                            object3D.remove(child);
                        }

                        // re-create
                        for (let child of item.items) {
                            this._addOrUpdateItem(child, object3D);
                        }
                    }
                }
                // 4. light
                else if (item instanceof Pacem3DLightElement) {

                    const light = object3D as THREE.Light;
                    if (item.flags.indexOf(StalePropertyFlag.Light) >= 0) {
                        light.color = new THREE.Color(item.color);
                        light.intensity = item.intensity;
                    }
                }

                // the configuring part

                let posv = item.position;// || new THREE.Vector3(0, 0, 0);

                if (Pacem.Drawing3D.isUi3DObject(item)
                    && !Utils.isNull(item.transformMatrix)
                    && (item.flags.indexOf(StalePropertyFlag.Position) >= 0 || item.flags.indexOf(StalePropertyFlag.Transform) >= 0)
                ) {

                    const positionMatrix = Geometry.LinearAlgebra.Matrix3D.from(
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        posv.x, posv.y, posv.z, 1
                    );

                    // item.transformMatrix is a local matrix thus
                    // prepend in the multiplication (i.e. FIRST apply transform THEN apply positioning)
                    const transformMatrix = Geometry.LinearAlgebra.Matrix3D.multiply(
                        item.transformMatrix,
                        positionMatrix,
                    );

                    THREE.Matrix4.prototype.set.apply(object3D.matrix, flattenMatrix3D(transformMatrix));

                } else if (item.flags.indexOf(StalePropertyFlag.Position) >= 0) {
                    object3D.position.set(posv.x, posv.y, posv.z);
                    object3D.updateMatrix();
                }

            }

            object3D.userData = <any>item.tag;
            if (Utils.isNull(parent.getObjectById(object3D.id))) {
                parent.add(object3D);
                this._dict[object3D.id] = item;
            }

            // clear flags
            item.flags.splice(0);
        };

        private _addOrUpdateItem(item: RenderableElement, parent: THREE.Object3D = this._scene): void {

            if (!isTHREEAvailable() || Utils.isNull(parent)) {
                return;
            }

            if (item instanceof Pacem3DCameraElement) {

                if (item.type === 'perspective') {
                    var pcam: THREE.PerspectiveCamera;
                    if (this._camera instanceof THREE.PerspectiveCamera) {
                        var pcam = this._camera;
                    } else {
                        pcam = new THREE.PerspectiveCamera();
                    }

                    const lookAtVector = new THREE.Vector3(item.lookAt.x, item.lookAt.y, item.lookAt.z);
                    pcam.lookAt(lookAtVector);

                    pcam.fov = item.fov;
                    pcam.aspect = item.aspect;
                    pcam.near = item.near;
                    pcam.far = item.far;
                    pcam.position.set(item.position.x, item.position.y, item.position.z);
                    //
                    this._setCamera(pcam);
                    //
                    const orbit = this._orbitCtrls
                    if (!Utils.isNull(orbit) && orbit.object === pcam) {
                        orbit.target = lookAtVector;
                        orbit.update();
                    }
                } else {

                    // cam not supported

                }

            } else {

                if (!this._objects.has(item)) {

                    // adding
                    const then = (object3D: THREE.Object3D) => {

                        // clear flags
                        // item.flags.splice(0);

                        if (object3D) {

                            this._ensureAndRefresh(item, object3D, parent);
                            this._objects.set(item, object3D);

                        } else {

                            // object not built
                            // throw?

                        }
                    }

                    if (item instanceof Pacem3DObjectElement) {
                        const mesh = load(item);
                        then(mesh);
                    } else if (item instanceof Pacem3DMeshElement) {
                        // beware! a change in the geometry could cause a change in the object3D type
                        const mesh = build(item);
                        then(mesh);
                    } else if (item instanceof Pacem3DLightElement) {
                        const light = lightToLight(item);
                        then(light);
                    } else if (item instanceof Pacem3DGroupElement) {
                        const group = new THREE.Group();
                        then(group);
                    }

                } else {

                    // updating
                    const obj = this._objects.get(item);
                    this._ensureAndRefresh(item, obj, parent);

                }
            }

        }

        render() {
            if (this._camera) {
                this._renderer.render(this._scene, this._camera);
            }
        }

        //#endregion

    }

}