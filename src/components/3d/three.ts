/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.ThreeD {

    @CustomElement({ tagName: P + '-3d-adapter-three' })
    export class PacemThreeAdapterElement extends Pacem3DAdapterElement {

        project(point3D: Vector3D): Point {
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
        private _orbitCtrls: THREE.OrbitControls = null;
        private _objects = new Map<Pacem3DObjectElement, THREE.Object3D>();
        private _lights = new Map<Pacem3DLightElement, THREE.Light>();
        private _dict: { [key: number]: ThreeDRelevantElement } = {};

        @Watch({ converter: PropertyConverters.Boolean }) orbit: boolean;

        get scene(): any {
            return this._scene;
        }

        raycast(point: { x: number, y: number }): ThreeDRelevantElement {
            let containerEl = this._3d.stage, camera = this._camera;
            let offs = Utils.offset(containerEl);
            let vector = new THREE.Vector2(
                ((point.x - offs.left) / containerEl.clientWidth) * 2 - 1,
                -((point.y - offs.top) / containerEl.clientHeight) * 2 + 1);

            let raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(vector, camera);

            let intersects = raycaster.intersectObjects(this._scene.children);
            let obj: THREE.Object3D;
            if (intersects.length > 0 && (obj = intersects[0].object)) {
                return this._dict[obj.id];
            }
            return null;
        }

        // #region ABSTRACT IMPLEMENTATION

        initialize(container: Pacem3DElement): HTMLCanvasElement {
            this._3d = container;
            const wrapper = container.stage;
            const stage = this._stage = document.createElement('canvas');
            wrapper.innerHTML = '';
            wrapper.appendChild(stage);

            this._scene = new THREE.Scene();

            this.invalidateSize();

            let w = this._stage.width,
                h = this._stage.height;

            //if (!ctrl.renderer)
            let parameters: THREE.WebGLRendererParameters = {
                canvas: stage, antialias: true, stencil: false, alpha: true, clearAlpha: 1
            };
            this._renderer = new THREE.WebGLRenderer(parameters);
            this._renderer.setSize(w, h);

            return stage;
        }

        private _setCamera(cam: THREE.Camera) {
            this._camera = cam;
            this.invalidateSize();
            this._disposeOrbitControls();
            // re-init
            if (this.orbit) this._initOrbitControls();
        }

        private _orbitControlsDelegate = (evt?: any) => {

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
            if (Utils.isNull(this._3d)) return;
            var controls = this._orbitCtrls = new THREE.OrbitControls(this._camera, this._3d.stage);
            controls.addEventListener('change', this._orbitControlsDelegate);
        }

        private _disposeOrbitControls() {
            if (Utils.isNull(this._orbitCtrls)) return;
            this._orbitCtrls.removeEventListener('change', this._orbitControlsDelegate);
            this._orbitCtrls.dispose();
        }

        invalidateSize() {
            if (!this._3d)
                return;
            let w = this._3d.stage.clientWidth;
            let h = this._3d.stage.clientHeight;
            this._stage.width = w;
            this._stage.height = h;
            let camera = this._camera;
            if (camera instanceof THREE.PerspectiveCamera) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
            }
            if (this._renderer)
                this._renderer.setSize(w, h);
        }

        removeItem(item: ThreeDRelevantElement): PromiseLike<{}> {

            var bag: Map<ThreeDRelevantElement, THREE.Object3D> = this._objects;
            if (item instanceof Pacem3DLightElement)
                bag = this._lights;

            var obj3d = bag.get(item);
            if (!Utils.isNull(obj3d)) {
                this._scene.remove(obj3d);
                delete this._dict[obj3d.id];
                bag.delete(item);
            }

            return Utils.fromResult({});
        }

        addItem(item: ThreeDRelevantElement): PromiseLike<{}> {

            var deferred = DeferPromise.defer();

            if (item instanceof Pacem3DObjectElement) {

                const ensure = (object3D: THREE.Object3D) => {
                    let posv = item.position;// || new THREE.Vector3(0, 0, 0);
                    object3D.position.x = posv.x; object3D.position.y = posv.y; object3D.position.z = posv.z;
                    object3D.userData = <any>item.tag;
                    if (Utils.isNull(this._scene.getObjectById(object3D.id))) {
                        this._scene.add(object3D);
                        this._dict[object3D.id] = item;
                    }

                    deferred.resolve();
                };

                if (!this._objects.has(item)) {

                    const then = (object3D: THREE.Object3D) => {
                        if (object3D) {
                            ensure(object3D);
                            this._objects.set(item, object3D);
                        } else
                            deferred.reject();
                    }

                    switch (item.format) {
                        case 'json':
                            let loader = new THREE.JSONLoader();
                            if (!Utils.isNullOrEmpty(item.mesh)) {
                                let tuple = loader.parse(JSON.parse(<string>item.mesh)),
                                    m = tuple.materials;
                                then(new THREE.Mesh(tuple.geometry, (m && m.length && m[0]) || new THREE.MeshLambertMaterial()));
                            }
                            else if (!Utils.isNullOrEmpty(item.url)) {
                                loader.load(item.url, (g, m: THREE.Material[]) => {

                                    then(new THREE.Mesh(g, (m && m.length && m[0]) || new THREE.MeshLambertMaterial()));

                                });
                            } else
                                deferred.reject();
                            break;
                        case 'native':
                            then(<THREE.Object3D>item.mesh);
                            break;
                    }
                }
                else
                    ensure(this._objects.get(item));
            }
            else if (item instanceof Pacem3DLightElement) {

                const ensure = (light: THREE.Light) => {
                    let posv = item.position;// || new THREE.Vector3(0, 0, 0);
                    light.position.set(posv.x, posv.y, posv.z);
                    light.userData = <any>item.tag;
                    if (Utils.isNull(this._scene.getObjectById(light.id))) {
                        this._scene.add(light);
                        this._lights.set(item, light);
                    }

                    deferred.resolve();
                };

                var light: THREE.Light = this._lights.get(item);
                switch (item.type) {
                    case 'spot':
                        if (!(light instanceof THREE.SpotLight)) {
                            this._scene.remove(light);
                            light = new THREE.SpotLight();
                        }
                        (<THREE.SpotLight>light).target.position.set(item.target.x, item.target.y, item.target.z);
                        break;
                    default:
                        if (!(light instanceof THREE.PointLight)) {
                            this._scene.remove(light);
                            light = new THREE.PointLight();
                        }
                        break;
                }

                light.position.set(item.position.x, item.position.y, item.position.z);
                light.color = new THREE.Color(item.color);
                light.visible = !item.disabled;
                light.intensity = item.intensity;

                ensure(light);
            }
            else if (item instanceof Pacem3DCameraElement) {

                if (item.type === 'perspective') {
                    var pcam: THREE.PerspectiveCamera;
                    if (this._camera instanceof THREE.PerspectiveCamera)
                        var pcam = this._camera;
                    else
                        pcam = new THREE.PerspectiveCamera();
                    pcam.lookAt(new THREE.Vector3(item.lookAt.x, item.lookAt.y, item.lookAt.z));
                    pcam.fov = item.fov;
                    pcam.aspect = item.aspect;
                    pcam.near = item.near;
                    pcam.far = item.far;
                    pcam.position.set(item.position.x, item.position.y, item.position.z);
                    //
                    this._setCamera(pcam);
                }

                deferred.resolve();

            }

            return <PromiseLike<{}>>deferred.promise;
        }

        render() {
            if (this._camera)
                this._renderer.render(this.scene, this._camera);
        }

        //#endregion

    }

}