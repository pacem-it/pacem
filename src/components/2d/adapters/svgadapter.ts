namespace Pacem.Components.Drawing {

    const SVG_NS = 'http://www.w3.org/2000/svg',
        DRAWABLE_VAR = 'pacem:drawable';

    function fallback<T>(v: T, f: T): T {
        return Utils.isNull(v) ? f : v;
    }

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-svg-adapter' })
    export class PacemSvgAdapterElement extends Pacem2DAdapterElement {

        private _dragger: Pacem.Components.PacemDragDropElement;
        viewActivatedCallback() {
            super.viewActivatedCallback();

            const dragDrop = this._dragger = document.createElement(P + '-drag-drop') as Pacem.Components.PacemDragDropElement;
            // dragDrop.addEventListener(UI.DragDropEventType.Init, this._dragInitHandler, false);
            dragDrop.mode = UI.DragDataMode.Self;
            //const floater = document.createElement('div');
            //Utils.addClass(floater, PCSS + '-svg-adapter drag-floater');
            //dragDrop.floater = floater;

            // append
            const shell = CustomElementUtils.findAncestorShell(this);
            //shell.appendChild(floater);
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
                // dragger.floater.remove();
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
            svg.addEventListener('click', this._clickHandler, false);

            // draw right away
            this.draw(scene);

            return svg;
        }

        dispose(scene: Pacem2DElement): void {
            const scenes = this._scenes;
            if (scenes.has(scene)) {

                var svg = scenes.get(scene);

                // remove
                svg.remove();
                scenes.delete(scene);
            }
        }

        private _hitTarget: Pacem.Drawing.Drawable = null;
        getHitTarget(scene: Pacem2DElement): Pacem.Drawing.Drawable {
            return this._hitTarget;
        }

        draw(scene: Pacem2DElement, item?: Pacem.Drawing.Drawable) {

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

            this._draw(parent, items || [], flow);
        }

        private _dragging: boolean;
        private _dragInitHandler = (evt: UI.DragDropEvent) => {
            const args = evt.detail as UI.DragDropInitEventArgsClass,
                el = <SVGGraphicsElement>args.element,
                drawable: Pacem.Drawing.Drawable = CustomElementUtils.getAttachedPropertyValue(el, DRAWABLE_VAR),
                transformMatrix = el.getScreenCTM().inverse(),
                initialMatrix = Utils.deserializeTransform(el.style);

            args.data = {
                transformMatrix: transformMatrix, item: drawable,
                initialTransformMatrix: initialMatrix
            };

            this._itemDispatch(drawable, <UI.DragDropEventType>evt.type, { x: 0, y: 0 });
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
            el.style.transform = `matrix(1,0,0,1,${offset.x},${offset.y})`;
            this._itemDispatch(data.item, <UI.DragDropEventType>evt.type, offset);
        };

        private _dragEndHandler = (evt: UI.DragDropEvent) => {
            this._dragging = false;
            const args = evt.detail,
                data: { transformMatrix: DOMMatrix, item: Pacem.Drawing.Drawable, initialTransformMatrix: Matrix2D } = args.data,
                transform = Utils.deserializeTransform(args.element.style);
            this._itemDispatch(data.item, <UI.DragDropEventType>evt.type, { x: transform.e, y: transform.f });
        }

        private _mousemoveHandler = (evt: MouseEvent | TouchEvent) => {
            var pt: Point = null;
            if (evt instanceof TouchEvent) {
                const touch = evt.touches[0];
                pt = { x: touch.clientX, y: touch.clientY };
            } else {
                pt = { x: evt.clientX, y: evt.clientY };
            }

            if (!this._dragging) {

                // not dragging around
                var el = document.elementFromPoint(pt.x, pt.y);
                const t: Pacem.Drawing.Drawable = !Utils.isNull(el) ? CustomElementUtils.getAttachedPropertyValue(el, DRAWABLE_VAR) : null;

                var old = this._hitTarget,
                    val = t;

                if (Utils.isNull(t && t.stage) || !this._scenes.has(t.stage) || t.inert) {
                    val = null;
                }

                this._hitTarget = val;

                if (val !== old) {
                    if (!Utils.isNull(old)) {
                        this._dragger.unregister(this._items.get(old));
                        this._itemDispatch(old, 'out');
                    }

                    if (!Utils.isNull(val)) {
                        if (val.draggable) {
                            this._dragger.register(this._items.get(val));
                        }
                        this._itemDispatch(val, 'over');
                    }
                }
            }
        }

        private _clickHandler = (evt: Event) => {
            if (!Utils.isNull(this._hitTarget)) {
                this._itemDispatch(this._hitTarget, 'click');
            }
        }

        private _itemDispatch(target: Pacem.Drawing.Drawable, type: 'click' | 'over' | 'out');
        private _itemDispatch(target: Pacem.Drawing.Drawable, type: UI.DragDropEventType, offset: Point);
        private _itemDispatch(target: Pacem.Drawing.Drawable, type: 'click' | 'over' | 'out' | UI.DragDropEventType, offset?: Point) {
            if (!Utils.isNull(target)) {

                const dragArgs: Pacem.Drawing.DragEventArgs = { item: target, offset: offset };
                const evt = () => Utils.isNull(offset) ? new DrawableElementEvent(type, target) : new Pacem.Drawing.DragEvent(type, { detail: dragArgs }),
                    itemevt = Utils.isNull(offset) ? new DrawableElementEvent('item' + type, target) : new Pacem.Drawing.DragEvent('item' + type, { detail: dragArgs });

                if (target instanceof EventTarget) {
                    target.dispatchEvent(evt());
                }
                target.stage.dispatchEvent(itemevt);
            }
        }

        private _hasItems(object: any): object is { items: any[] } {
            return 'items' in object && Utils.isArray(object.items);
        }

        private _draw(parent: SVGElement, items: Pacem.Drawing.Drawable[], flow: boolean): void {
            const dict = this._items;
            // children counter
            let j = 0;
            if (!Utils.isNullOrEmpty(items)) {
                for (let item of items) {

                    let el: SVGElement;
                    if (!dict.has(item)) {

                        el = this._buildSVGElement(item);
                        CustomElementUtils.setAttachedPropertyValue(el, DRAWABLE_VAR, item);

                        parent.appendChild(el);
                        dict.set(item, el);

                        //// add handlers
                        //el.addEventListener('mouseover', this._itemOverHandler, false);
                        //el.addEventListener('mouseout', this._itemOutHandler, false);
                        //el.addEventListener('touchstart', this._itemOverHandler, { passive: true });
                        //el.addEventListener('touchmove', this._itemOverHandler, { passive: true });
                        //el.addEventListener('touchend', this._itemOutHandler, { passive: true });
                        //el.addEventListener('click', this._itemClickHandler, false);
                    }
                    else {
                        el = dict.get(item);
                        if (el.parentNode !== parent) {
                            parent.appendChild(el);
                        }
                    }

                    if (Pacem.Drawing.isDrawable(item)) {
                        el.setAttribute('visibility', item.hide ? 'collapsed' : 'visible');
                        el.style.transform = 'none';
                    }

                    if (Pacem.Drawing.isShape(item)) {
                        const path = <SVGPathElement>el;
                        const defaults = this.DefaultShapeValues;
                        path.setAttribute('d', fallback(item.pathData, 'M0,0'));
                        path.setAttribute('fill', fallback(item.fill, defaults.fill));
                        path.setAttribute('stroke', fallback(item.stroke, defaults.stroke));
                        path.setAttribute('stroke-width', '' + fallback(item.lineWidth, defaults.lineWidth));
                    }

                    if (Pacem.Drawing.isUiObject(item)) {
                        const t = item.transformMatrix;
                        if (Utils.isNull(t) || Pacem.Drawing.Matrix2D.isIdentity(t)) {
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

                    if (flow && this._hasItems(item)) {

                        // recursion
                        this._draw(el, item.items, flow);
                    }

                    j++;
                }
            }
            if (flow) {
                // remove exceeding children
                for (let k = parent.children.length - 1; k >= j; k--) {

                    const el = parent.children.item(k);

                    //// remove handlers
                    //el.removeEventListener('mouseover', this._itemOverHandler, false);
                    //el.removeEventListener('mouseout', this._itemOutHandler, false);
                    //el.removeEventListener('touchstart', this._itemOverHandler);
                    //el.removeEventListener('touchmove', this._itemOverHandler);
                    //el.removeEventListener('touchend', this._itemOutHandler);
                    //el.removeEventListener('click', this._itemClickHandler, false);

                    el.remove();
                }
            }
        }

        private _buildSVGElement(item: Pacem.Drawing.Drawable): SVGElement {
            if (Pacem.Drawing.isShape(item)) {
                return document.createElementNS(SVG_NS, 'path');
            }
            return document.createElementNS(SVG_NS, 'g');
        }

        private _scenes = new WeakMap<Pacem.Drawing.Stage, SVGSVGElement>();
        private _items = new WeakMap<Pacem.Drawing.Drawable, SVGElement>();

    }

}