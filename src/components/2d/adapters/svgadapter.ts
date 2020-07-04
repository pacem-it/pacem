namespace Pacem.Components.Drawing {

    const SVG_NS = 'http://www.w3.org/2000/svg',
        DRAWABLE_VAR = 'pacem:drawable';

    function fallback<T>(v: T, f: T): T {
        return Utils.isNull(v) ? f : v;
    }

    function replaceChildAt(parent: Element, newChild: Element, targetIndex: number): Element {
        if (targetIndex >= parent.children.length) {
            parent.appendChild(newChild);
            return null;
        } else {
            return parent.replaceChild(newChild, parent.children.item(targetIndex));
        }
    }

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-svg-adapter' })
    export class PacemSvgAdapterElement extends Pacem2DAdapterElement {

        snapshot(stage: Pacem.Drawing.Stage, background?: string): PromiseLike<Blob> {
            return new Promise((resolve, _) => {
                if (this._scenes.has(stage)) {
                    const svg = this._scenes.get(stage);
                    Utils.snapshotElement(svg, background).then(b => {
                        resolve(b);
                    });
                } else {
                    resolve(null);
                }
            });
        }

        getTransformMatrix(scene: Pacem2DElement): Matrix2D {
            const scenes = this._scenes;
            if (scenes.has(scene)) {
                return scenes.get(scene).getScreenCTM().inverse();
            }
            return Matrix2D.identity;
        }

        private _dragger: Pacem.Components.PacemDragDropElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();

            const dragDrop = this._dragger = document.createElement(P + '-drag-drop') as Pacem.Components.PacemDragDropElement;
            dragDrop.mode = UI.DragDataMode.Self;

            // append
            const shell = CustomElementUtils.findAncestorShell(this);
            shell.appendChild(dragDrop);

            dragDrop.addEventListener(UI.DragDropEventType.Init, this._dragInitHandler, false);
            dragDrop.addEventListener(UI.DragDropEventType.Drag, this._draggingHandler, false);
            dragDrop.addEventListener(UI.DragDropEventType.End, this._dragEndHandler, false);
        }

        disconnectedCallback() {
            const dragger = this._dragger;
            if (!Utils.isNull(dragger)) {
                dragger.removeEventListener(UI.DragDropEventType.Init, this._dragInitHandler, false);
                dragger.removeEventListener(UI.DragDropEventType.Drag, this._draggingHandler, false);
                dragger.removeEventListener(UI.DragDropEventType.End, this._dragEndHandler, false);
                dragger.remove();
            }
            super.disconnectedCallback();
        }

        invalidateSize(scene: Pacem2DElement, size: Size) {
            const scenes = this._scenes;
            if (!Utils.isNull(scene) && !Utils.isNullOrEmpty(size)) {

                if (scenes.has(scene)) {

                    var svg = scenes.get(scene);
                    svg.setAttribute('width', size.width + '');
                    svg.setAttribute('height', size.height + '');

                    const rect = scene.viewbox,
                        aspectRatio = scene.aspectRatio;
                    if (!Utils.isNullOrEmpty(rect)) {
                        svg.setAttribute('viewBox', `${rect.x} ${rect.y} ${rect.width} ${rect.height}`);
                    } else {
                        svg.removeAttribute('viewBox');
                    }

                    if (Utils.isNullOrEmpty(aspectRatio) || typeof aspectRatio === 'string') {
                        svg.removeAttribute('preserveAspectRatio');
                    } else {
                        svg.setAttribute('preserveAspectRatio', `xM${aspectRatio.x.substr(1)}YM${aspectRatio.y.substr(1)} ${(aspectRatio.slice ? 'slice' : 'meet')}`);
                    }
                }
            }
        }

        initialize(scene: Pacem2DElement): HTMLElement | SVGElement {
            if (Utils.isNull(scene)) {
                throw 'Provided scene is null or undefined.';
            }

            const scenes = this._scenes;

            // already in the store?
            if (scenes.has(scene)) {
                return scenes.get(scene);
            }

            const stage = scene.stage;

            // empty stage DOM and clear dictionary
            stage.innerHTML = '';
            this._items = new WeakMap();

            var svg = document.createElementNS(SVG_NS, 'svg');
            stage.appendChild(svg);
            scenes.set(scene, svg);

            const options: AddEventListenerOptions = { passive: false, capture: true };
            svg.addEventListener('mousemove', this._mousemoveHandler, false);
            svg.addEventListener('click', this._mouseDownUpHandler, false);
            svg.addEventListener('mousedown', this._mouseDownUpHandler, false);
            svg.addEventListener('mouseup', this._mouseDownUpHandler, false);

            // draw right away
            // this.draw(scene);

            return svg;
        }

        dispose(scene: Pacem2DElement): void {
            const scenes = this._scenes;
            if (scenes.has(scene)) {

                var svg = scenes.get(scene);
                svg.removeEventListener('mousemove', this._mousemoveHandler);
                svg.removeEventListener('click', this._mouseDownUpHandler);
                svg.removeEventListener('mousedown', this._mouseDownUpHandler);
                svg.removeEventListener('mouseup', this._mouseDownUpHandler);

                // remove
                svg.remove();
                scenes.delete(scene);
            }
        }

        private _hitTarget: Pacem.Drawing.Drawable = null;
        getHitTarget(scene: Pacem2DElement): Pacem.Drawing.Drawable {
            return this._hitTarget;
        }

        draw(scene: Pacem2DElement, item?: Pacem.Drawing.Drawable);
        draw(scene: Pacem2DElement, item: Pacem.Drawing.Group, deepRedraw: boolean);
        draw(scene: Pacem2DElement, item?: Pacem.Drawing.Drawable, deepRedraw = false) {

            const scenes = this._scenes,
                dict = this._items;

            if (!Utils.isNull(scene)) {

                if (scene.adapter === this) {
                    if (!scenes.has(scene)) {

                        // forgiving behavior (call initialize() if it's the case)
                        this.initialize(scene);
                    }
                } else {
                    if (scenes.has(scene)) {
                        scenes.delete(scene);
                    }
                    return
                }
            } else {
                return;
            }

            var items: Pacem.Drawing.Drawable[] = scene.datasource,
                flow = true,
                parent: SVGElement = scenes.get(scene);
            // item provided?
            if (!Utils.isNull(item)) {

                if (dict.has(item)) {
                    items = [item];
                    parent = dict.get(item).parentNode as SVGElement;
                    flow = false;
                }
            }

            if (flow) {
                // sweep everything, quick and dirty
                parent.innerHTML = '';
            }

            this._draw(parent, items || [], flow, deepRedraw);
        }

        private _dragging: boolean;
        private _dragInitHandler = (evt: UI.DragDropEvent) => {
            const args = evt.detail as UI.DragDropInitEventArgsClass,
                el = <SVGGraphicsElement>args.element,
                drawable: Pacem.Drawing.Drawable = CustomElementUtils.getAttachedPropertyValue(el, DRAWABLE_VAR),
                transformMatrix = drawable.stage.transformMatrix,
                initialMatrix = Utils.deserializeTransform(el.style);

            args.data = {
                transformMatrix: transformMatrix, item: drawable,
                initialTransformMatrix: initialMatrix
            };

            const reject = this._itemDispatch(drawable, evt, { x: 0, y: 0 });

            if (reject) {

                // reject dragging
                evt.preventDefault();
            }

        }

        private _draggingHandler = (evt: UI.DragDropEvent) => {

            avoidHandler(evt);

            this._dragging = true;
            const el = <SVGGraphicsElement>evt.detail.element;
            const data: { transformMatrix: DOMMatrix, item: Pacem.Drawing.Drawable, initialTransformMatrix: Matrix2D } = evt.detail.data;

            const args = evt.detail;
            const offset = {
                x: (args.currentPosition.x - args.origin.x) * data.transformMatrix.a + data.initialTransformMatrix.e,
                y: (args.currentPosition.y - args.origin.y) * data.transformMatrix.d + data.initialTransformMatrix.f
            };

            const rejected = this._itemDispatch(data.item, evt, offset);
            if (!rejected) {
                el.style.transform = `matrix(1,0,0,1,${offset.x},${offset.y})`;
            }
        };

        private _dragEndHandler = (evt: UI.DragDropEvent) => {
            this._dragging = false;
            const args = evt.detail,
                data: { transformMatrix: DOMMatrix, item: Pacem.Drawing.Drawable, initialTransformMatrix: Matrix2D } = args.data,
                transform = Utils.deserializeTransform(args.element.style);
            this._itemDispatch(data.item, evt, { x: transform.e, y: transform.f });
        }

        private _mousemoveHandler = (evt: MouseEvent | TouchEvent) => {
            var pt: Point = CustomEventUtils.getEventCoordinates(evt).client;

            if (!this._dragging) {

                // not dragging around
                var d: Pacem.Drawing.Drawable = null;
                var el = document.elementsFromPoint(pt.x, pt.y).find(i => {
                    d = CustomElementUtils.getAttachedPropertyValue(i, DRAWABLE_VAR);
                    return d && !d.inert;
                });

                var old = this._hitTarget,
                    val = d;

                if (Utils.isNull(d && d.stage) || !this._scenes.has(d.stage) || d.inert) {
                    val = null;
                }

                this._hitTarget = val;

                if (val !== old) {
                    if (!Utils.isNull(old)) {
                        this._dragger.unregister(this._items.get(old));
                        this._itemDispatch(old, 'out', evt);
                    }

                    if (!Utils.isNull(val)) {
                        if (val.draggable) {
                            this._dragger.register(this._items.get(val));
                        }
                        this._itemDispatch(val, 'over', evt);
                    }
                }
            }
        }

        private _mouseDownUpHandler = (evt: MouseEvent) => {
            if (!Utils.isNull(this._hitTarget)) {
                const type: 'down' | 'up' | 'click' = <any>evt.type.replace(/^mouse/, '');
                this._itemDispatch(this._hitTarget, type, evt);
            }
        }

        private _itemDispatch(target: Pacem.Drawing.Drawable, type: 'down' | 'up' | 'click' | 'over' | 'out', evt: MouseEvent | TouchEvent);
        private _itemDispatch(target: Pacem.Drawing.Drawable, type: UI.DragDropEvent, offset: Point);
        private _itemDispatch(target: Pacem.Drawing.Drawable, type: 'down' | 'up' | 'click' | 'over' | 'out' | UI.DragDropEvent, offset?: Point | MouseEvent | TouchEvent): boolean {
            if (!Utils.isNull(target)) {

                var dragArgs: Pacem.Drawing.DragEventArgs,
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

                const m = target.stage.transformMatrix;

                const evt = () => offset instanceof Event ? new Pacem.Drawing.DrawableEvent(evtType, target, originalEvent, m) : new Pacem.Drawing.DragEvent(evtType, { detail: dragArgs, cancelable: evtType === UI.DragDropEventType.Init || evtType === UI.DragDropEventType.Drag }, originalEvent, m),
                    itemevt = offset instanceof Event ? new Pacem.Drawing.DrawableEvent('item' + evtType, target, originalEvent, m) : new Pacem.Drawing.DragEvent('item' + evtType, { detail: dragArgs, cancelable: evtType === UI.DragDropEventType.Init || evtType === UI.DragDropEventType.Drag }, originalEvent, m);

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

        private _hasItems(object: any): object is { items: any[] } {
            return Pacem.Drawing.isGroup(object);
        }

        private _disposeSvg(el: Element) {
            if (!Utils.isNull(el)) {
                var drawable = CustomElementUtils.getAttachedPropertyValue(el, DRAWABLE_VAR);
                this._items.delete(drawable);
            }
        }

        private _draw(parent: SVGElement, items: Pacem.Drawing.Drawable[], flow: boolean, deepRedraw: boolean): void {
            const dict = this._items;
            // children counter
            let j = 0;
            if (!Utils.isNullOrEmpty(items)) {
                for (let item of items) {

                    let el: SVGElement;
                    if (!dict.has(item)) {

                        el = this._buildSVGElement(item);
                        CustomElementUtils.setAttachedPropertyValue(el, DRAWABLE_VAR, item);

                        this._disposeSvg(replaceChildAt(parent, el, j));
                        dict.set(item, el);
                    }
                    else {
                        el = dict.get(item);
                        if (el.parentNode !== parent) {
                            this._disposeSvg(replaceChildAt(parent, el, j));
                        }
                    }

                    if (Pacem.Drawing.isDrawable(item)) {
                        if (item.hide) {
                            el.setAttribute('display', 'none');
                        } else {
                            el.removeAttribute('display');
                        }
                        el.style.transform = 'none';
                    }

                    if (Pacem.Drawing.isShape(item)) {
                        const path = <SVGPathElement>el;
                        const defaults = this.DefaultShapeValues;
                        path.setAttribute('d', fallback(item.pathData, 'M0,0'));
                        path.setAttribute('fill', fallback(item.fill, defaults.fill));
                        path.setAttribute('stroke', fallback(item.stroke, defaults.stroke));
                        let css = '';
                        if (!Utils.isNullOrEmpty(item.dashArray)) {
                            css += `stroke-dasharray: ${item.dashArray.join(',')};`;
                        }
                        if (!Utils.isNullOrEmpty(item.lineCap)) {
                            css += `stroke-linecap: ${item.lineCap};`;
                        }
                        if (!Utils.isNullOrEmpty(item.lineJoin)) {
                            css += `stroke-linejoin: ${item.lineJoin};`;
                        }
                        path.style.cssText = css;
                        path.setAttribute('stroke-width', '' + fallback(item.lineWidth, defaults.lineWidth));
                    } else if (Pacem.Drawing.isText(item)) {
                        const text = <SVGTextElement>el;
                        text.textContent = item.text;
                        text.style.fill = Utils.isNullOrEmpty(item.color) ? '' : item.color;
                        text.style.fontFamily = Utils.isNullOrEmpty(item.fontFamily) ? '' : item.fontFamily;
                        text.style.fontSize = Utils.isNull(item.fontSize) ? '' : item.fontSize + 'px';
                        text.setAttribute('text-anchor', fallback(item.textAnchor, 'start'));
                        if (!Utils.isNull(item.anchor)) {
                            text.setAttribute('x', item.anchor.x.toString());
                            text.setAttribute('y', item.anchor.y.toString());
                        } else {
                            text.removeAttribute('x');
                            text.removeAttribute('y');
                        }
                    }

                    if (Pacem.Drawing.isUiObject(item)) {
                        const t = item.transformMatrix;
                        if (Utils.isNull(t) || Pacem.Matrix2D.isIdentity(t)) {
                            el.removeAttribute('transform');
                        } else {
                            el.setAttribute('transform', `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e} ${t.f})`);
                        }
                        const opacity = fallback(item.opacity, 1);
                        if (opacity === 1) {
                            el.removeAttribute('opacity');
                        } else {
                            el.setAttribute('opacity', '' + opacity);
                        }
                    }

                    if ((flow || deepRedraw) && this._hasItems(item)) {

                        // recursion
                        this._draw(el, item.items, true, deepRedraw);
                    }

                    j++;
                }
            }
            if (flow) {
                // remove exceeding children
                for (let k = parent.children.length - 1; k >= j; k--) {

                    const el = parent.children.item(k);
                    this._disposeSvg(el);
                    el.remove();
                }
            }
        }

        private _buildSVGElement(item: Pacem.Drawing.Drawable): SVGElement {
            if (Pacem.Drawing.isShape(item)) {
                return document.createElementNS(SVG_NS, 'path');
            }
            if (Pacem.Drawing.isText(item)) {
                return document.createElementNS(SVG_NS, 'text');
            }
            return document.createElementNS(SVG_NS, 'g');
        }

        private _scenes = new WeakMap<Pacem.Drawing.Stage, SVGSVGElement>();
        private _items = new WeakMap<Pacem.Drawing.Drawable, SVGElement>();

    }

}