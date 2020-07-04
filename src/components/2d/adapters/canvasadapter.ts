/// <reference path="../types.ts" />
namespace Pacem.Components.Drawing {

    // const TWO_PI = 2 * Math.PI;
    const DEG2RAD = Math.PI / 180.0;

    function isNone(fillOrStroke: string) {
        return fillOrStroke === 'none' || Utils.isNullOrEmpty(fillOrStroke);
    }

    function fallback<T>(v: T, f: T): T {
        return Utils.isNull(v) ? f : v;
    }

    /** Implementation postponed. Focus on SVG adapter. */
    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-canvas-adapter' })
    export class PacemCanvasAdapterElement extends Pacem2DAdapterElement {

        snapshot(stage: Pacem2DElement): PromiseLike<Blob> {
            return new Promise((resolve, _) => {
                const scenes = this._scenes;
                if (scenes.has(stage)) {
                    var ctx2d = scenes.get(stage).context;
                    ctx2d.canvas.toBlob((b) => {
                        resolve(b);
                    }, 'image/png');
                } else {
                    resolve(null);
                }
            });
        }

        getTransformMatrix(scene: Pacem2DElement): Matrix2D {
            const scenes = this._scenes;
            if (scenes.has(scene)) {
                return scenes.get(scene).transformMatrix;
            }
            return Matrix2D.identity;
        }

        invalidateSize(scene: Pacem2DElement, size: Size) {
            const scenes = this._scenes;
            if (!Utils.isNull(scene) && !Utils.isNullOrEmpty(size)) {

                if (scenes.has(scene)) {

                    var ctx = scenes.get(scene).context;
                    ctx.canvas.width = size.width;
                    ctx.canvas.height = size.height;

                    this._canvasOffset = Utils.offsetRect(ctx.canvas);
                }
            }
        }

        getHitTarget(stage: Pacem2DElement): Pacem.Drawing.Drawable {
            const target = this._hitTarget;
            if (!Utils.isNull(target) && target.stage === stage) {
                return target;
            }
            return null;
        }

        initialize(scene: Pacem2DElement): HTMLElement | SVGElement {
            if (Utils.isNull(scene)) {
                throw 'Provided scene is null or undefined.';
            }

            const scenes = this._scenes;

            // already in the store?
            if (scenes.has(scene)) {
                return scenes.get(scene).context.canvas;
            }

            const stage = scene.stage;

            // empty stage DOM
            stage.innerHTML = '';
            var canvas = document.createElement('canvas');
            var context = canvas.getContext('2d');
            canvas.addEventListener('mousemove', this._mousemoveHandler, false);
            canvas.addEventListener('touchstart', this._touchstartHandler, { passive: true });
            canvas.addEventListener('touchmove', this._touchstartHandler, { passive: true });
            canvas.addEventListener('touchend', this._clickHandler, { passive: true });
            canvas.addEventListener('click', this._clickHandler, false);

            stage.appendChild(canvas);
            scenes.set(scene, { context, transformMatrix: Matrix2D.identity });

            // this._requestDraw(scene);

            return canvas;
        }

        private _requestDraw(scene: Pacem2DElement) {
            const handles = this._handles;
            if (handles.has(scene)) {
                cancelAnimationFrame(handles.get(scene));
            }
            handles.set(scene, requestAnimationFrame(() => { this.draw(scene); }));
        }

        dispose(scene: Pacem2DElement) {
            const scenes = this._scenes;
            if (scenes.has(scene)) {

                var tuple = scenes.get(scene),
                    context = tuple.context;
                context.canvas.removeEventListener('click', this._clickHandler, false);
                context.canvas.removeEventListener('touchend', this._clickHandler, false);
                context.canvas.removeEventListener('touchmove', this._touchstartHandler);
                context.canvas.removeEventListener('touchstart', this._touchstartHandler);
                context.canvas.removeEventListener('mousemove', this._mousemoveHandler, false);

                // remove
                context.canvas.remove();
                scenes.delete(scene);
            }
        }

        draw(scene: Pacem2DElement) {
            const scenes = this._scenes, handles = this._handles;
            if (!Utils.isNull(scene)) {

                if (scene.adapter !== this) {

                    // not a pertinent stage anymore
                    if (scenes.has(scene)) {

                        scenes.delete(scene);
                        handles.get(scene);
                    }

                    return;
                }

                if (!scenes.has(scene)) {

                    // forgiving behavior (call initialize() if it's the case)
                    this.initialize(scene);
                    return;
                }

                if (handles.has(scene)) {

                    // already in the drawing loop, reset
                    cancelAnimationFrame(handles.get(scene));
                }

                const formerHitTarget = this._hitTarget;
                const items = scene.datasource || [];

                // reset hit target
                this._hitTarget = null;

                // clear stage
                const tuple = scenes.get(scene), context = tuple.context,
                    canvas = context.canvas;

                context.clearRect(0, 0, canvas.width, canvas.height);

                // viewbox
                const m = tuple.transformMatrix = this._resetTransform(scene.viewbox, context);

                // draw recursively
                for (let drawable of items) {
                    this._draw(context, drawable);
                }

                // check hit target
                const currentHitTarget = this._hitTarget;
                if (currentHitTarget != formerHitTarget) {
                    if (!Utils.isNull(formerHitTarget)) {

                        if (formerHitTarget instanceof Element) {
                            formerHitTarget.dispatchEvent(new Pacem.Drawing.DrawableEvent('out', formerHitTarget, this._scopeEvent, m));
                        }
                        scene.dispatchEvent(new Pacem.Drawing.DrawableEvent('itemout', formerHitTarget, this._scopeEvent, m));
                    }
                    if (!Utils.isNull(currentHitTarget)) {
                        if (currentHitTarget instanceof Element) {
                            currentHitTarget.dispatchEvent(new Pacem.Drawing.DrawableEvent('over', currentHitTarget, this._scopeEvent, m));
                        }
                        scene.dispatchEvent(new Pacem.Drawing.DrawableEvent('itemover', currentHitTarget, this._scopeEvent, m));
                    }
                }

                // loop
                this._requestDraw(scene);
            }
        }

        private _resetTransform(viewbox: Rect, context: CanvasRenderingContext2D): Matrix2D {

            context.resetTransform();
            const rect = viewbox, size = context.canvas;
            if (!Utils.isNull(rect)) {
                const w = size.width, h = size.height,
                    scale = 1 / Math.min(rect.width / w, rect.height / h),
                    a = scale,
                    b = 0,
                    c = 0,
                    d = scale,
                    e = w / 2 - scale * rect.x,
                    f = h / 2 - scale * rect.y;
                context.transform(a, b, c, d, e, f);
                return { a: a, b: b, c: c, d: d, e: e, f: f };
            }
        }

        private _hitTarget: Pacem.Drawing.Drawable;
        private _pointer: EventCoordinates = {
            page: { x: 0, y: 0 }, screen: { x: 0, y: 0 }, client: { x: 0, y: 0 }
        };
        //private _modifiers: EventKeyModifiers = {
        //    altKey: false, shiftKey: false, ctrlKey : false, metaKey: false
        //};
        private _scopeEvent: MouseEvent | TouchEvent;
        private _canvasOffset: Rect = { x: 0, y: 0, width: 0, height: 0 };

        private _clickHandler = (evt: MouseEvent) => {
            const currentHitTarget = this._hitTarget;
            if (!Utils.isNull(currentHitTarget)) {
                const m = currentHitTarget.stage.transformMatrix;
                if (currentHitTarget instanceof Element) {
                    currentHitTarget.dispatchEvent(new Pacem.Drawing.DrawableEvent('click', currentHitTarget, evt, m));
                }
                currentHitTarget.stage.dispatchEvent(new Pacem.Drawing.DrawableEvent('itemclick', currentHitTarget, evt, m));
            }
        }

        private _mousemoveHandler = (evt: MouseEvent) => {
            this._scopeEvent = evt;
            this._pointer = CustomEventUtils.getEventCoordinates(evt);
            // this._modifiers = CustomEventUtils.getEventKeyModifiers(evt);
        }

        private _touchstartHandler = (evt: TouchEvent) => {
            if (evt.touches.length === 1) {
                this._scopeEvent = evt;
                this._pointer = CustomEventUtils.getEventCoordinates(evt);
                // this._modifiers = CustomEventUtils.getEventKeyModifiers(evt);
            }
        }

        private _hasItems(object: any): object is { items: any[] } {
            return 'items' in object && Utils.isArray(object.items);
        }

        private _draw(ctx: CanvasRenderingContext2D, item: Pacem.Drawing.Drawable) {

            var data: string;
            const defaults = this.DefaultShapeValues;
            // draw

            if (Pacem.Drawing.isDrawable(item)) {
                if (item.hide) {
                    return;
                }
            }

            if (!Utils.isNull(ctx) && Pacem.Drawing.isShape(item) && !Utils.isNullOrEmpty(data = item.pathData)) {
                ctx.strokeStyle = fallback(item.stroke, defaults.stroke);
                ctx.lineWidth = fallback(item.lineWidth, defaults.lineWidth);
                if (!Utils.isNullOrEmpty(item.dashArray)) {
                    ctx.setLineDash(item.dashArray);
                }
                if (!Utils.isNullOrEmpty(item.lineCap)) {
                    ctx.lineCap = item.lineCap;
                }
                if (!Utils.isNullOrEmpty(item.lineJoin)) {
                    ctx.lineJoin = item.lineJoin;
                }
                ctx.lineWidth = fallback(item.lineWidth, defaults.lineWidth);
                ctx.fillStyle = fallback(item.fill, defaults.fill);
                ctx.globalAlpha = fallback(item.opacity, 1);

                let t = item.transformMatrix;
                if (!Utils.isNull(t) && !Pacem.Matrix2D.isIdentity(t)) {
                    ctx.transform(t.a, t.b, t.c, t.d, t.e, t.f);
                }

                ctx.beginPath();

                // Path2D
                const hasFill = !isNone(item.fill),
                    hasStroke = !isNone(item.stroke);

                var path2D = new Path2D(data);
                const pointer = this._pointer,
                    offset = this._canvasOffset,
                    point = { x: pointer.page.x - offset.x, y: pointer.page.y - offset.y };
                if (!item.inert /* is hit-test visible? */
                    && !Utils.isNull(pointer)) {
                    if ((hasFill && ctx.isPointInPath(path2D, point.x, point.y))
                        || (hasStroke && ctx.isPointInStroke(path2D, point.x, point.y))) {

                        // overwrite current hit-target (last one wins)
                        this._hitTarget = item;
                    }
                }

                if (hasStroke)
                    ctx.stroke(path2D);
                if (hasFill)
                    ctx.fill(path2D);

                // reset defaults
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#000';
                ctx.setLineDash([]);
                ctx.lineCap = 'butt';
                ctx.lineJoin = 'miter';

                // reset transform
                this._resetTransform(item.stage.viewbox, ctx);
            }

            if (Pacem.Drawing.isDrawable(item) && this._hasItems(item) && !item.hide) {

                if (Pacem.Drawing.isUiObject(item)) {

                    // TypeScript bug
                    const ui = <Pacem.Drawing.UiObject>item;
                    const t = ui.transformMatrix;
                    if (!Utils.isNull(t) && !Pacem.Matrix2D.isIdentity(t)) {
                        ctx.transform(t.a, t.b, t.c, t.d, t.e, t.f);
                    }
                }

                for (let child of item.items || []) {
                    this._draw(ctx, child);
                }
            }
        }

        private _scenes = new WeakMap<Pacem2DElement, { context: CanvasRenderingContext2D, transformMatrix: Matrix2D }>();
        private _handles = new WeakMap<Pacem2DElement, number>();

    }

}