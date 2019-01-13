/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.ThreeD {

    export declare type Vector3D = { x: number, y: number, z: number };

    const ThreeDConsts = {
        OBJECT_SELECTOR: 'pacem-3d-object',
        LIGHT_SELECTOR: 'pacem-3d-light',
        CAMERA_SELECTOR: 'pacem-3d-camera',
        SCENE_SELECTOR: 'pacem-3d',
        DEFAULT_COORDS: { x: 0, y: 0, z: 0 }
    }

    export declare type ThreeDRelevantElementEventArgs = {
        element: ThreeDRelevantElement
    };

    export class ThreeDRelevantElementEvent extends Pacem.CustomTypedEvent<ThreeDRelevantElementEventArgs> {

        constructor(type: string, args: ThreeDRelevantElementEventArgs) {
            super(type, args);
        }
    }

    export abstract class ThreeDRelevantElement extends PacemEventTarget implements OnViewActivated, OnDisconnected {

        get scene(): Pacem3DElement {
            return this['_scene'] = this['_scene'] || CustomElementUtils.findAncestorOfType(this, Pacem3DElement);
        }

        @Watch({ converter: PropertyConverters.Json }) position: Vector3D = ThreeDConsts.DEFAULT_COORDS;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) tag: string;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.scene && this.scene.register(this);
        }

        disconnectedCallback() {
            super.viewActivatedCallback();
            this.scene && this.scene.unregister(this);
        }
    }

    @CustomElement({ tagName: ThreeDConsts.OBJECT_SELECTOR })
    export class Pacem3DObjectElement extends ThreeDRelevantElement {

        @Watch() mesh: any;
        @Watch({ converter: PropertyConverters.String }) url: string;
        @Watch({ converter: PropertyConverters.String }) format: string = 'json';
    }

    @CustomElement({ tagName: ThreeDConsts.LIGHT_SELECTOR })
    export class Pacem3DLightElement extends ThreeDRelevantElement {

        @Watch({ converter: PropertyConverters.Number }) intensity: number = .25;
        @Watch({ converter: PropertyConverters.Json }) target: Vector3D = ThreeDConsts.DEFAULT_COORDS;
        @Watch({ converter: PropertyConverters.String }) color: string = '#fff';
        @Watch({ converter: PropertyConverters.String }) type: 'spot' | 'direction' | 'omni' = 'omni';
    }

    @CustomElement({ tagName: ThreeDConsts.CAMERA_SELECTOR })
    export class Pacem3DCameraElement extends ThreeDRelevantElement {

        @Watch({ converter: PropertyConverters.Number }) fov: number = 45;
        @Watch({ converter: PropertyConverters.Number }) aspect: number = 1.78;
        @Watch({ converter: PropertyConverters.Number }) near: number = 0.1;
        @Watch({ converter: PropertyConverters.Number }) far: number = 1000.0;
        @Watch({ converter: PropertyConverters.String }) type: 'perspective' | 'orthographic' = 'perspective';
        @Watch({ converter: PropertyConverters.Json }) lookAt: Vector3D = ThreeDConsts.DEFAULT_COORDS;
    }

    export abstract class Pacem3DAdapterElement extends PacemEventTarget {

        /**
         * When implemented in a derived class, resizes the stage.
         */
        abstract invalidateSize(): void;

        /**
         * Initializes the 3d scene and returns its corresponding DOM element.
         * @param scene {Pacem3DElement} Container for the stage/scene
         */
        abstract initialize(scene: Pacem3DElement): HTMLElement;

        /**
         * When implemented in a derived class, renders the scene.
         */
        abstract render();

        /**
         * When implemented in a derived class, retrieves the element casting the ray through the provided point (if any).
         * @param point {Object} 2D to check.
         */
        abstract raycast(point: { x: number, y: number }): ThreeDRelevantElement;

        /**
         * When implemented in a derived class, adds a 3d element.
         * @param item {ThreeDRelevantElement} item to be added
         */
        abstract addItem(item: ThreeDRelevantElement): PromiseLike<{}>;

        /**
         * When implemented in a derived class, removes a 3d element.
         * @param item {ThreeDRelevantElement} item to be removed
         */
        abstract removeItem(item: ThreeDRelevantElement): PromiseLike<{}>;

        abstract project(point3D: Vector3D): Point;

        /** Gets the native map instance */
        abstract get scene(): any;
    }

    @CustomElement({
        tagName: ThreeDConsts.SCENE_SELECTOR
    })
    export class Pacem3DElement extends PacemEventTarget implements OnViewActivated, OnDisconnected, OnPropertyChanged {

        @Watch({ converter: PropertyConverters.Boolean }) interactive: boolean = false;
        @Watch({ converter: PropertyConverters.Boolean }) orbit: boolean = false;

        private _bag = new Set<ThreeDRelevantElement>();

        @Watch({ emit: false }) adapter: Pacem3DAdapterElement;

        get stage() {
            return this._container;
        }

        register(item: ThreeDRelevantElement) {
            if (!this._bag.has(item)) {
                this._bag.add(item);
                this.add(item);
                item.addEventListener(PropertyChangeEventName, this.addHandler, false);
            }
        }

        unregister(item: ThreeDRelevantElement) {
            if (this._bag.has(item)) {
                this._bag.delete(item);
                item.removeEventListener(PropertyChangeEventName, this.addHandler, false);
                this.erase(item);
            }
        }

        private addHandler = (evt: Event) => {
            this.add(<ThreeDRelevantElement>evt.target);
        }

        private add(item: ThreeDRelevantElement) {
            this.adapter &&
                this.adapter.addItem(item);
        }

        private erase(item: ThreeDRelevantElement) {
            this.adapter &&
                this.adapter.removeItem(item);
        }

        private initializeAdapter(old: Pacem3DAdapterElement, val: Pacem3DAdapterElement) {
            if (!Utils.isNull(old)) {
                this._bag.forEach(i => old.removeItem(i));
            }
            if (!Utils.isNull(this._container) && !Utils.isNull(val)) {
                val.initialize(this);
                this._bag.forEach(i => this.add(i));
                this.render();
            }
        }

        //#region lifecycle

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (Utils.isNull(this._container))
                return;
            if (name === 'adapter') {
                this.initializeAdapter(old, val);
            } else if (name === 'disabled') {
                this.render();
            }
        }

        private _container: HTMLElement;
        private _resizer: PacemResizeElement;
        private _lastHover: ThreeDRelevantElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            // stage
            const container = this._container = document.createElement('div');
            Utils.addClass(container, 'pacem-3d-stage');
            this.insertAdjacentElement('afterend', container);
            // resizer
            const resizer = this._resizer = <PacemResizeElement>document.createElement('pacem-resize');
            resizer.addEventListener('resize', this._resizeHandler, false);
            resizer.target = container;
            container.insertAdjacentElement('afterend', resizer);
            // adapter
            this.initializeAdapter(null, this.adapter);
            //
            container.addEventListener('mousemove', this._moveHandler, false);
            container.addEventListener('click', this._clickHandler, false);
        }

        private _clickHandler = (evt: PointerEvent) => {
            let me = this;
            if (!me.interactive || Utils.isNull(me._lastHover)) return;
            me._lastHover.dispatchEvent(new ThreeDRelevantElementEvent('click', { element: me._lastHover }));
            me.dispatchEvent(new ThreeDRelevantElementEvent('itemclick', { element: me._lastHover }));
        };

        private _moveHandler = (evt: PointerEvent) => {
            let me = this;
            if (!me.adapter || !me.interactive) return;

            // what's really needed:
            let obj = me.adapter.raycast({ x: evt.clientX, y: evt.clientY });
            if (obj != me._lastHover) {
                if (!Utils.isNull(me._lastHover)) {
                    me._lastHover.dispatchEvent(new ThreeDRelevantElementEvent('out', { element: me._lastHover }));
                    me.dispatchEvent(new ThreeDRelevantElementEvent('itemout', { element: me._lastHover }));
                }
                if (!Utils.isNull(obj)) {
                    obj.dispatchEvent(new ThreeDRelevantElementEvent('over', { element: obj }));
                    me.dispatchEvent(new ThreeDRelevantElementEvent('itemover', { element: obj }));
                }
                me._lastHover = obj;
            }
        };

        disconnectedCallback() {
            const resizer = this._resizer,
                container = this._container;
            if (!Utils.isNull(container)) {
                container.removeEventListener('click', this._clickHandler, false);
                container.removeEventListener('mousemove', this._moveHandler, false);
            }
            if (!Utils.isNull(resizer)) {
                resizer.removeEventListener('resize', this._resizeHandler, false);
                resizer.remove();
            }
            super.disconnectedCallback();
        }

        private _resizeHandler = (e: Event) => {
            this._onResize(e);
        }

        private _onResize(e?: Event) {
            this.adapter && this.adapter.invalidateSize();
        }

        render() {
            if (!this.disabled) {
                let cancelable = new CustomEvent('prerender', { detail: { cancel: false, scene: this.adapter.scene }, cancelable: true });
                this.dispatchEvent(cancelable);
                if (!cancelable.defaultPrevented) {
                    this.adapter.render();
                    this.dispatchEvent(new CustomEvent('render', { detail: { scene: this.adapter.scene } }));
                }
            }
            requestAnimationFrame(() => this.render());
        }

        //#endregion
    }

}