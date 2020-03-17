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

        invalidateSize(scene: Pacem2DElement, size: Size) {
            const scenes = this._scenes;
            if (!Utils.isNull(scene) && !Utils.isNullOrEmpty(size)) {

                if (scenes.has(scene)) {

                    var ctx = scenes.get(scene);
                    ctx.canvas.width = size.width;
                    ctx.canvas.height = size.height;
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
                return scenes.get(scene).canvas;
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
            scenes.set(scene, context);

            this._requestDraw(scene);

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

                var context = scenes.get(scene);
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
                const context = scenes.get(scene),
                    canvas = context.canvas;

                context.clearRect(0, 0, canvas.width, canvas.height);

                // viewbox
                this._resetTransform(scene.viewbox, context);

                // draw recursively
                for (let drawable of items) {
                    this._draw(context, drawable);
                }

                // check hit target
                const currentHitTarget = this._hitTarget;
                if (currentHitTarget != formerHitTarget) {
                    if (!Utils.isNull(formerHitTarget)) {

                        if (formerHitTarget instanceof Element) {
                            formerHitTarget.dispatchEvent(new DrawableElementEvent('out', formerHitTarget));
                        }
                        scene.dispatchEvent(new DrawableElementEvent('itemout', formerHitTarget));
                    }
                    if (!Utils.isNull(currentHitTarget)) {
                        if (currentHitTarget instanceof Element) {
                            currentHitTarget.dispatchEvent(new DrawableElementEvent('over', currentHitTarget));
                        }
                        scene.dispatchEvent(new DrawableElementEvent('itemover', currentHitTarget));
                    }
                }

                // loop
                this._requestDraw(scene);
            }
        }

        private _resetTransform(viewbox: Rect, context: CanvasRenderingContext2D) {

            context.resetTransform();
            const rect = viewbox, size = context.canvas;
            if (!Utils.isNull(rect)) {
                const w = size.width, h = size.height,
                    scale = 1 / Math.min(rect.width / w, rect.height / h);
                context.transform(scale, 0, 0, scale, w / 2 - scale * rect.x, h / 2 - scale * rect.y);
            }
        }

        private _hitTarget: Pacem.Drawing.Drawable;
        private _pointer: Point;

        private _clickHandler = (_: MouseEvent) => {
            const currentHitTarget = this._hitTarget;
            if (!Utils.isNull(currentHitTarget)) {
                if (currentHitTarget instanceof Element) {
                    currentHitTarget.dispatchEvent(new DrawableElementEvent('click', currentHitTarget));
                }
                currentHitTarget.stage.dispatchEvent(new DrawableElementEvent('itemclick', currentHitTarget));
            }
        }

        private _mousemoveHandler = (evt: MouseEvent) => {
            this._pointer = { x: evt.offsetX, y: evt.offsetY };
        }

        private _touchstartHandler = (evt: TouchEvent) => {
            if (evt.touches.length === 1) {
                const touch = evt.touches[0],
                    pageX = touch.pageX, pageY = touch.pageY,
                    offset = Utils.offset(evt.target as Element);
                this._pointer = { x: pageX - offset.left, y: pageY - offset.top };
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
                ctx.fillStyle = fallback(item.fill, defaults.fill);
                ctx.lineWidth = fallback(item.lineWidth, defaults.lineWidth);
                ctx.globalAlpha = fallback(item.opacity, 1);

                let t = item.transformMatrix;
                if (!Utils.isNull(t) && !Pacem.Drawing.Matrix2D.isIdentity(t)) {
                    ctx.transform(t.a, t.b, t.c, t.d, t.e, t.f);
                }

                ctx.beginPath();

                // Path2D
                const hasFill = !isNone(item.fill),
                    hasStroke = !isNone(item.stroke);

                var path2D = new Path2D(data);
                const pointer = this._pointer;
                if (!item.inert /* is hit-test visible? */
                    && !Utils.isNull(pointer)) {
                    if ((hasFill && ctx.isPointInPath(path2D, pointer.x, pointer.y))
                        || (hasStroke && ctx.isPointInStroke(path2D, pointer.x, pointer.y))) {

                        // overwrite current hit-target (last one wins)
                        this._hitTarget = item;
                    }
                }

                if (hasStroke)
                    ctx.stroke(path2D);
                if (hasFill)
                    ctx.fill(path2D);

                this._resetTransform(item.stage.viewbox, ctx);
            }

            if (Pacem.Drawing.isDrawable(item) && this._hasItems(item) && !item.hide) {

                if (Pacem.Drawing.isUiObject(item)) {

                    // TypeScript bug
                    const ui = <Pacem.Drawing.UiObject>item;
                    const t = ui.transformMatrix;
                    if (!Utils.isNull(t) && !Pacem.Drawing.Matrix2D.isIdentity(t)) {
                        ctx.transform(t.a, t.b, t.c, t.d, t.e, t.f);
                    }
                }

                for (let child of item.items || []) {
                    this._draw(ctx, child);
                }
            }
        }

        private _scenes = new WeakMap<Pacem2DElement, CanvasRenderingContext2D>();
        private _handles = new WeakMap<Pacem2DElement, number>();

    }

}