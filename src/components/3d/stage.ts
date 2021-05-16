/// <reference path="types.ts" />

namespace Pacem.Components.Drawing3D {

    @CustomElement({
        tagName: P + '-' + TAG_MIDDLE_NAME, shadow: Defaults.USE_SHADOW_ROOT, template: `<${P}-resize watch-position="true"></${P}-resize><div class="${PCSS}-3d"></div><${P}-content></${P}-content>`
    })
    export class Pacem3DElement extends PacemItemsContainerElement<RenderableElement> implements Pacem.Drawing3D.Stage {

        validate(item: RenderableElement): boolean {
            return item instanceof RenderableElement;
        }

        @Watch({ emit: false, converter: PropertyConverters.Boolean }) interactive: boolean;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) orbit: boolean;
        @Watch({ emit: false, converter: PropertyConverters.Element }) adapter: Pacem3DAdapterElement;

        get stage() {
            return this._container;
        }

        get scene() {
            return this.adapter && this.adapter.scene;
        }

        register(item: RenderableElement) {
            const retval = super.register(item);
            if (retval) {
                this._add(item);
                item.addEventListener(PropertyChangeEventName, this._addHandler, false);
            }
            return retval;
        }

        unregister(item: RenderableElement) {
            const retval = super.unregister(item);
            if (retval) {
                item.removeEventListener(PropertyChangeEventName, this._addHandler, false);
                this._erase(item);
            }
            return retval;
        }

        private _addHandler = (evt: Event) => {
            this._add(<RenderableElement>evt.target);
        }

        private _add(item: RenderableElement) {
            this.adapter &&
                this.adapter.addItem(item);
        }

        private _erase(item: RenderableElement) {
            this.adapter &&
                this.adapter.removeItem(item);
        }

        private _initializeAdapter(old: Pacem3DAdapterElement, val: Pacem3DAdapterElement) {
            return new Promise<void>((resolve, _) => {

                if (!Utils.isNull(old)) {
                    this.items.forEach(i => old.removeItem(i));
                }
                if (!Utils.isNull(this._container) && !Utils.isNull(val)) {
                    val.initialize(this).then(_ => {
                        this.items.forEach(i => this._add(i));
                    }, e => {
                        this.log(Logging.LogLevel.Error, e?.toString());
                    });
                }

                resolve();
            });
        }

        //#region lifecycle

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (Utils.isNull(this._container)) {
                return;
            }

            if (name === 'adapter' && !first) {
                this._initializeAdapter(old, val);
            }
        }

        @ViewChild(`.${PCSS}-3d`) private _container: HTMLElement;
        @ViewChild(P + '-resize') private _resizer: PacemResizeElement;

        private _lastHitResult: Pacem.Drawing3D.RaycastResult;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            // stage
            const container = this._container
            // resizer
            const resizer = this._resizer;
            resizer.addEventListener('resize', this._resizeHandler, false);
            resizer.target = container;
            // adapter
            this._initializeAdapter(null, this.adapter).then(_ => {

                container.addEventListener('mousemove', this._moveHandler, false);
                container.addEventListener('click', this._clickHandler, false);
                container.addEventListener('mouseup', this._clickHandler, false);
                container.addEventListener('mousedown', this._clickHandler, false);

                this.render();

            });
        }

        private _itemDispatch(target: Pacem.Drawing3D.Renderable, point: Pacem.Drawing3D.Vector3D, type: 'down' | 'up' | 'click' | 'over' | 'out', evt: MouseEvent | TouchEvent);
        private _itemDispatch(target: Pacem.Drawing3D.Renderable, point: Pacem.Drawing3D.Vector3D, type: UI.DragDropEvent, offset: Point);
        private _itemDispatch(target: Pacem.Drawing3D.Renderable, point: Pacem.Drawing3D.Vector3D, type: 'down' | 'up' | 'click' | 'over' | 'out' | UI.DragDropEvent, offset?: Point | MouseEvent | TouchEvent): boolean {
            if (!Utils.isNull(target)) {

                var dragArgs: Pacem.Drawing3D.DragEventArgs,
                    originalEvent: MouseEvent | TouchEvent,
                    evtType: string;

                if (offset instanceof Event) {
                    originalEvent = offset;
                } else {
                    dragArgs = { item: target, offset: offset };
                }

                if (typeof type === 'string') {
                    evtType = type;
                } else {
                    evtType = type.type;
                    originalEvent = type.originalEvent as MouseEvent;
                }

                const m = point;
                const evt = () => offset instanceof Event ? new Pacem.Drawing3D.RenderableEvent(evtType, target, originalEvent, m) : new Pacem.Drawing3D.DragEvent(evtType, { detail: dragArgs, cancelable: evtType === UI.DragDropEventType.Init || evtType === UI.DragDropEventType.Drag }, originalEvent, m),
                    itemevt = offset instanceof Event ? new Pacem.Drawing3D.RenderableEvent('item' + evtType, target, originalEvent, m) : new Pacem.Drawing3D.DragEvent('item' + evtType, { detail: dragArgs, cancelable: evtType === UI.DragDropEventType.Init || evtType === UI.DragDropEventType.Drag }, originalEvent, m);

                var prevent = false;
                if (target instanceof EventTarget) {

                    const evnt = evt();
                    target.dispatchEvent(evnt);
                    prevent = evnt.defaultPrevented;
                }

                target.stage.dispatchEvent(itemevt)

                // was the event (in one of its forms) rejected?
                return prevent || itemevt.defaultPrevented;
            }

            return false;
        }

        private _clickHandler = (evt: PointerEvent) => {
            let me = this;
            if (!me.interactive || Utils.isNull(me._lastHitResult)) {
                return;
            }
            const type: 'down' | 'up' | 'click' = <any>evt.type.replace(/^mouse/, '');
            const hit = me._lastHitResult,
                object = hit.object,
                point = hit.point;
            this._itemDispatch(object, point, type, evt);
        };

        private _moveHandler = (evt: PointerEvent) => {

            let me = this;
            if (!me.adapter || !me.interactive) {
                return;
            }

            // what's really needed:
            const rect = me._resizer.currentSize;
            let result = me.adapter.raycast({ x: evt.pageX - rect.left, y: evt.pageY - rect.top }, rect);

            // TODO: handle dragging

            if (result != me._lastHitResult) {

                if (result?.object != me._lastHitResult?.object) {
                    const obj = result?.object,
                        last = me._lastHitResult?.object,
                        pt = result?.point;
                    if (!Utils.isNull(last)) {
                        this._itemDispatch(last, pt, 'out', evt);
                    }
                    if (!Utils.isNull(obj)) {
                        this._itemDispatch(obj, pt, 'over', evt);
                    }
                }
                me._lastHitResult = result;
            }
        };

        disconnectedCallback() {
            const resizer = this._resizer,
                container = this._container;
            if (!Utils.isNull(container)) {
                container.removeEventListener('click', this._clickHandler, false);
                container.removeEventListener('mouseup', this._clickHandler, false);
                container.removeEventListener('mousedown', this._clickHandler, false);
                container.removeEventListener('mousemove', this._moveHandler, false);
            }
            if (!Utils.isNull(resizer)) {
                resizer.removeEventListener('resize', this._resizeHandler, false);
            }
            super.disconnectedCallback();
        }

        get size() {
            return this.#size;
        }

        #size: Size;
        private _resizeHandler = (evt: ResizeEvent) => {
            const size = this.#size = evt.detail;// { width: evt.detail.width, height: evt.detail.height };
            const adapter = this.adapter;
            if (!Utils.isNull(adapter)) {
                this.adapter.invalidateSize(size);
                this.dispatchEvent(new ResizeEvent(size));
            }   
        }

        render(item?: Pacem.Drawing3D.Renderable, deepUpdate?: boolean) {
            if (!Utils.isNull(item)) {

                const adapter = this.adapter;
                if (!Utils.isNull(adapter)) {
                    adapter.updateItem(item);
                }

            } else {

                requestAnimationFrame(() => this.render());
                if (!this.disabled && !Utils.isNull(this.adapter)) {
                    let cancelable = new CustomEvent('prerender', { detail: { scene: this.adapter.scene }, cancelable: true });
                    this.dispatchEvent(cancelable);
                    if (!cancelable.defaultPrevented) {
                        this.adapter.render();
                        this.dispatchEvent(new CustomEvent('render', { detail: { scene: this.adapter.scene } }));
                    }
                }

            }
        }

        //#endregion
    }
}