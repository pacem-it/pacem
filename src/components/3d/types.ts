/// <reference path="converters.ts" />
/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-numerical.d.ts" />
namespace Pacem.Drawing3D {

    export declare type Vector3D = Pacem.Geometry.LinearAlgebra.Vector3D;
    export declare type Matrix3D = Pacem.Geometry.LinearAlgebra.Matrix3D;
    export declare type Quaternion = Pacem.Geometry.LinearAlgebra.Quaternion;
    export declare type UVMap = Pacem.Point[];

    export interface Stage extends EventTarget {
        render(item?: Renderable);

        readonly stage: HTMLElement;
        readonly scene: any;
        readonly size: Size;
    }

    export interface Renderable {
        readonly stage: Stage;
        position: Vector3D;
        /** Gets or sets whether the drawable is hit-testable. */
        inert?: boolean;
        hide?: boolean;

        /** @deprecated will be likely removed sooner or later to be handled outside the stage/adapter. */
        draggable?: boolean;
        tag?: string;
    }

    export function isStage(object: any): object is Stage {
        return !Utils.isNull(object) && 'render' in object && typeof object['render'] === 'function';
    }

    export function isRenderable(object: any): object is Renderable {
        return !Utils.isNull(object) && 'stage' in object && isStage(object['stage']);
    }

    export interface Ui3DObject extends Renderable {
        rotate: Quaternion;
        scaleX: number;
        scaleY: number;
        translateX: number;
        translateY: number;
        readonly transformMatrix: Matrix3D;
    }

    export function isUi3DObject(object: any): object is Ui3DObject {
        return 'transformMatrix' in object && isRenderable(object);
    }

    export interface Mesh extends Ui3DObject {
        geometry: NodeGeometry;
        material?: Material;
        backMaterial?: Material;
    }

    export function isMesh(object: any): object is Mesh {
        return isUi3DObject(object) && 'geometry' in object;
    }

    export interface Group extends Ui3DObject {
        items: Renderable[];
    }

    export function isGroup(object: any): object is Group {
        return isUi3DObject(object) && 'items' in object && !Utils.isNullOrEmpty(object['items']);
    }

    export interface DragEventArgs {
        readonly offset: Point;
        readonly item: Renderable;
    }

    /**
     * Sets the normals to a mesh geometry by computing each face's unit orthogonal vector.
     * @param geometry
     */
    export function computeSharpVertexNormals(geometry: MeshGeometry) {
        const normals: Pacem.Drawing3D.Vector3D[] = [];
        if (!Utils.isNullOrEmpty(geometry)) {
            const indices = geometry.triangleIndices;
            if (indices.length % 3 !== 0) {
                throw new RangeError(`Invalid mesh geometry: ${indices.length} is not multiple of 3.`);
            }
            for (let j = 2; j < indices.length; j += 3) {
                const u = indices[j - 2], v = indices[j - 1], w = indices[j];
                const a = geometry.positions[u],
                    b = geometry.positions[v],
                    c = geometry.positions[w];
                const vAB = Geometry.LinearAlgebra.Vector3D.subtract(a, b),
                    vAC = Geometry.LinearAlgebra.Vector3D.subtract(a, c);
                const orthogonal = Geometry.LinearAlgebra.Vector3D.cross(vAC, vAB),
                    normal = Geometry.LinearAlgebra.Vector3D.unit(orthogonal);
                normals.push(normal, normal, normal);
            }
        }
        geometry.normals = normals;
    }


    export abstract class UI3DEvent<T> extends CustomUIEvent<T>{
        constructor(type: string, eventInit: CustomEventInit<T>, originalEvent: MouseEvent | TouchEvent | KeyboardEvent, point: Vector3D) {
            super(type, eventInit, originalEvent);
            this.#point = point;
        }

        #point: Vector3D;
        /** Gets the event's source position in 3d coordinates. */
        get point(): Vector3D {
            return this.#point;
        }
    }

    export class DragEvent extends UI3DEvent<DragEventArgs> {
    }

    export class RenderableEvent extends UI3DEvent<Renderable> {

        constructor(type: string, args: Renderable, originalEvent: MouseEvent | TouchEvent | KeyboardEvent, p: Vector3D
        ) {
            super(type, { detail: args, bubbles: true, cancelable: true }, originalEvent, p);
        }

    }

    export declare type RaycastResult = {
        object: Renderable,
        point: Vector3D
    };
}

namespace Pacem.Components.Drawing3D {

    export const TAG_MIDDLE_NAME = "3d";
    export const DEG2RAD = Math.PI / 180;

    const ThreeDConsts = {
        OBJECT_SELECTOR: P + '-' + TAG_MIDDLE_NAME + '-object',
        LIGHT_SELECTOR: P + '-' + TAG_MIDDLE_NAME + '-light',
        CAMERA_SELECTOR: P + '-' + TAG_MIDDLE_NAME + '-camera',
        LINE_SELECTOR: P + '-' + TAG_MIDDLE_NAME + '-line',
        MESH_SELECTOR: P + '-' + TAG_MIDDLE_NAME + '-mesh',
        GROUP_SELECTOR: P + '-' + TAG_MIDDLE_NAME + '-group',
        DEFAULT_COORDS: { x: 0, y: 0, z: 0 }
    }

    export enum StalePropertyFlag {
        Position = 'position',
        Transform = 'transform',
        Geometry = 'geometry',
        Children = 'children',
        Material = 'material',
        Light = 'light',
        Camera = 'camera'
    };

    export abstract class RenderableElement extends PacemCrossItemsContainerElement<RenderableElement> implements Pacem.Drawing3D.Renderable {

        validate(_: RenderableElement): boolean {
            // by default no children allowed (Group will except)
            return false;
        }

        protected findContainer() {
            // override
            return this.parent || this.stage;
        }

        get stage(): Pacem3DElement {
            return this['_scene'] = this['_scene'] || CustomElementUtils.findAncestorOfType(this, Pacem3DElement);
        }

        get parent(): RenderableElement {
            return this['_drawableParent'] = this['_drawableParent'] || CustomElementUtils.findAncestor(this, i => i instanceof RenderableElement);
        }

        #staleFlags: StalePropertyFlag[] = [];
        get flags(): StalePropertyFlag[] {
            return this.#staleFlags;
        }

        @Watch({ emit: false, converter: Pacem.Drawing3D.Point3DConverter }) position: Pacem.Drawing3D.Vector3D = ThreeDConsts.DEFAULT_COORDS;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) tag: string;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) inert: boolean;

        disconnectedCallback() {
            delete this['_scene'];
            delete this['_drawableParent'];
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'hide':
                    this.setAsDirty();
                    break;
                case 'items':
                    this.setAsDirty(StalePropertyFlag.Children);
                    break;
                case 'position':
                    this.setAsDirty(StalePropertyFlag.Position);
                    break;
            }
        }

        /** Calls for a redraw of the current element in the next rendering process. */
        protected setAsDirty(...flags: StalePropertyFlag[]) {
            // set the flags that identify the stale part of the object to be updated.
            for (let flag of flags) {
                if (!this.flags.includes(flag)) {
                    this.flags.push(flag);
                }
            }
            this.stage?.render(this);
        }

    }

    export abstract class Ui3DElement extends RenderableElement implements Pacem.Drawing3D.Ui3DObject {
        @Watch({ emit: false, converter: Pacem.Drawing3D.QuaternionConverter }) rotate: Geometry.LinearAlgebra.Quaternion;
        @Watch({ emit: false, converter: PropertyConverters.Number }) scaleX: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) scaleY: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) scaleZ: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) translateX: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) translateY: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) translateZ: number;
        /** Gets the local transform 3D matrix (4x4). */
        @Watch({ emit: false }) transformMatrix: Geometry.LinearAlgebra.Matrix3D;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'transformMatrix':
                    this.setAsDirty(StalePropertyFlag.Transform);
                    break;
                case 'rotate':
                case 'scaleX':
                case 'scaleY':
                case 'translateX':
                case 'translateY':
                    this._computeTransformMatrix();
                    break;
            }
        }

        private _computeTransformMatrix() {
            const m = Utils.isNull(this.rotate) ?
                Geometry.LinearAlgebra.Matrix3D.identity() :
                Geometry.LinearAlgebra.Quaternion.toRotationMatrix(this.rotate)
                ;

            if (this.translateX) {
                m.offsetX = this.translateX;
            }
            if (this.translateY) {
                m.offsetY = this.translateY;
            }
            if (this.translateZ) {
                m.offsetZ = this.translateZ;
            }

            if (this.scaleX) {
                m.m11 = this.scaleX;
            }
            if (this.scaleY) {
                m.m22 = this.scaleY;
            }
            if (this.scaleZ) {
                m.m33 = this.scaleZ;
            }

            this.transformMatrix = m;
        }
    }

    @CustomElement({tagName: ThreeDConsts.GROUP_SELECTOR})
    export class Pacem3DGroupElement extends Ui3DElement {

        validate(child: RenderableElement): boolean {
            // overrides default denial
            return child instanceof RenderableElement;
        }

    }

    @CustomElement({ tagName: ThreeDConsts.MESH_SELECTOR })
    export class Pacem3DMeshElement extends Ui3DElement implements Pacem.Drawing3D.Mesh {

        @Watch({ emit: false, converter: PropertyConverters.Json }) geometry: Pacem.Drawing3D.NodeGeometry;
        @Watch({ emit: false, converter: PropertyConverters.Json }) material: Pacem.Drawing3D.Material;
        @Watch({ emit: false, converter: PropertyConverters.Json }) backMaterial: Pacem.Drawing3D.Material;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'geometry':
                    this.setAsDirty(StalePropertyFlag.Geometry);
                    break;
                case 'material':
                case 'backMaterial':
                    this.setAsDirty(StalePropertyFlag.Material);
                    break;
            }
        }
    }

    @CustomElement({ tagName: ThreeDConsts.OBJECT_SELECTOR })
    export class Pacem3DObjectElement extends Ui3DElement {
        @Watch({ emit: false }) content: any;
        @Watch({ emit: false, converter: PropertyConverters.String }) type: string | "obj" | "fbx" | "native";

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'content' || name === 'type') {
                this.setAsDirty(StalePropertyFlag.Geometry, StalePropertyFlag.Material);
            }
        }
    }

    @CustomElement({ tagName: ThreeDConsts.LIGHT_SELECTOR })
    export class Pacem3DLightElement extends RenderableElement {

        @Watch({ emit: false, converter: PropertyConverters.Number }) intensity: number = .25;
        @Watch({ emit: false, converter: Pacem.Drawing3D.Point3DConverter }) target: Pacem.Drawing3D.Vector3D = ThreeDConsts.DEFAULT_COORDS;
        @Watch({ emit: false, converter: PropertyConverters.String }) color: string = '#fff';
        @Watch({ emit: false, converter: PropertyConverters.String }) type: 'spot' | 'direction' | 'omni' = 'omni';

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'type':
                case 'color':
                case 'intensity':
                case 'target':
                    this.setAsDirty(StalePropertyFlag.Light);
                    break;
            }
        }
    }

    @CustomElement({ tagName: ThreeDConsts.CAMERA_SELECTOR })
    export class Pacem3DCameraElement extends RenderableElement {

        @Watch({ emit: false, converter: PropertyConverters.Number }) fov: number = 45;
        @Watch({ emit: false, converter: PropertyConverters.Number }) aspect: number = 1.78;
        @Watch({ emit: false, converter: PropertyConverters.Number }) near: number = 0.1;
        @Watch({ emit: false, converter: PropertyConverters.Number }) far: number = 1000.0;
        @Watch({ emit: false, converter: PropertyConverters.String }) type: 'perspective' | 'orthographic' = 'perspective';
        @Watch({ emit: false, converter: Pacem.Drawing3D.Point3DConverter }) lookAt: Pacem.Drawing3D.Vector3D = ThreeDConsts.DEFAULT_COORDS;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'fov':
                case 'aspect':
                case 'near':
                case 'far':
                case 'type':
                case 'lookAt':
                    this.setAsDirty(StalePropertyFlag.Camera);
                    break;
            }
        }
    }

    export abstract class Pacem3DAdapterElement extends PacemEventTarget {

        /**
         * When implemented in a derived class, resizes the stage.
         */
        abstract invalidateSize(size: Size): void;

        /**
         * Initializes the 3d scene and returns its corresponding DOM element.
         * @param scene {Pacem3DElement} Container for the stage/scene
         */
        abstract initialize(scene: Pacem3DElement): Promise<HTMLElement>;

        /**
         * When implemented in a derived class, renders the scene.
         */
        abstract render(): void;

        /**
         * When implemented in a derived class, retrieves the element casting the ray through the provided point (if any).
         * @param point {Object} 2D to check.
         */
        abstract raycast(point: Point, size: Size): Pacem.Drawing3D.RaycastResult;

        /**
         * When implemented in a derived class, adds a 3d element.
         * @param item {Pacem3DObject} item to be added
         */
        abstract addItem(item: Pacem.Drawing3D.Renderable): void;

        /**
         * When implemented in a derived class, removes a 3d element.
         * @param item {Pacem3DObject} item to be removed
         */
        abstract removeItem(item: Pacem.Drawing3D.Renderable): void;

        /**
         * Updates the object before the next rendering. 
         * @param item
         * @param redraw Whether to completely redraw the object (not just its 3d transform) or not
         */
        abstract updateItem(item: Pacem.Drawing3D.Renderable): void;

        abstract project(point3D: Pacem.Drawing3D.Vector3D): Point;

        /** Gets the native scene instance */
        abstract get scene(): any;

        /**
         * Disposes the 2d scene resources.
         * @param scene {Pacem3DElement} The stage/scene
         */
        abstract dispose(scene: Pacem3DElement): void;

    }

}