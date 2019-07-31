/// <reference path="../types.ts" />
namespace Pacem.Components.Drawing {

    // const TWO_PI = 2 * Math.PI;
    const DEG2RAD = Math.PI / 180.0;

    function isNone(fillOrStroke: string) {
        return fillOrStroke === 'none' || Utils.isNullOrEmpty(fillOrStroke);
    }

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-canvas-adapter' })
    export class PacemCanvasAdapterElement extends Pacem2DAdapterElement {

        invalidateSize(scene: Pacem2DElement, size: Size) {
            const scenes = this._scenes;
            if (!Utils.isNull(scene) && !Utils.isNullOrEmpty(size)) {

                if (scenes.has(scene)) {

                    var ctx = scenes.get(scene);
                    ctx.canvas.width = size.width;
                    ctx.canvas.height = size.height;

                    this.draw(scene);
                }
            }
        }

        getHitTarget(scene: Pacem2DElement): Drawable {
            const target = this._hitTarget;
            if (!Utils.isNull(target) && target.scene === scene) {
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

            return canvas;
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
                scenes.delete(scene);
            }
        }

        draw(scene: Pacem2DElement) {
            const scenes = this._scenes;
            if (!Utils.isNull(scene)) {

                if (!scenes.has(scene)) {

                    // forgiving behavior (call initialize() if it's the case)
                    this.initialize(scene);
                    return;
                }

                const handles = this._handles;
                if (handles.has(scene)) {

                    // already in the drawing loop, reset
                    cancelAnimationFrame(handles.get(scene));
                }

                const formerHitTarget = this._hitTarget;
                const items = scene.items || [];

                // reset hit target
                this._hitTarget = null;

                // clear stage
                const context = scenes.get(scene),
                    canvas = context.canvas;
                context.clearRect(0, 0, canvas.width, canvas.height);

                // draw recursively
                for (let drawable of items) {
                    this._draw(context, drawable);
                }

                // check hit target
                const currentHitTarget = this._hitTarget;
                if (currentHitTarget != formerHitTarget) {
                    if (!Utils.isNull(formerHitTarget)) {

                        if (formerHitTarget instanceof Element) {
                            formerHitTarget.dispatchEvent(new DrawableElementEvent('out', { element: formerHitTarget }));
                        }
                        scene.dispatchEvent(new DrawableElementEvent('itemout', { element: formerHitTarget }));
                    }
                    if (!Utils.isNull(currentHitTarget)) {
                        if (currentHitTarget instanceof Element) {
                            currentHitTarget.dispatchEvent(new DrawableElementEvent('over', { element: currentHitTarget }));
                        }
                        scene.dispatchEvent(new DrawableElementEvent('itemover', { element: currentHitTarget }));
                    }
                }

                // loop
                handles.set(scene, requestAnimationFrame(() => { this.draw(scene); }));
            }
        }

        private _hitTarget: Drawable;
        private _pointer: Point;

        private _clickHandler = (_: MouseEvent) => {
            const currentHitTarget = this._hitTarget;
            if (!Utils.isNull(currentHitTarget)) {
                if (currentHitTarget instanceof Element) {
                    currentHitTarget.dispatchEvent(new DrawableElementEvent('click', { element: currentHitTarget }));
                }
                currentHitTarget.scene.dispatchEvent(new DrawableElementEvent('itemclick', { element: currentHitTarget }));
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

        private _draw(ctx: CanvasRenderingContext2D, item: Drawable) {

            var data: string;
            // draw
            if (!Utils.isNull(ctx) && item instanceof ShapeElement && !Utils.isNullOrEmpty(data = item.getPathData())) {
                ctx.strokeStyle = item.stroke;
                ctx.fillStyle = item.fill;
                ctx.lineWidth = item.lineWidth;

                let rect = item.getBoundingRect();
                let center: Point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };

                // transform origin to center
                ctx.translate(center.x, center.y);

                let rotation = DEG2RAD * (item.rotate || 0),
                    cos = Math.cos(rotation),
                    sin = Math.sin(rotation),
                    a = item.scaleX * cos,
                    b = -sin,
                    c = sin,
                    d = item.scaleY * cos,
                    e = item.translateX,
                    f = item.translateY;

                ctx.transform(a, b, c, d, e, f);

                // reset transform origin
                ctx.translate(-center.x, -center.y);

                ctx.beginPath();

                // Path2D
                const hasFill = !isNone(item.fill),
                    hasStroke = !isNone(item.stroke);

                var path2D = new Path2D(data);
                const pointer = this._pointer;
                if (!Utils.isNull(pointer)) {
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

                ctx.resetTransform();
            }

            if (item instanceof DrawableElement) {
                for (let child of item.items || []) {
                    this._draw(ctx, child);
                }
            }
        }

        private _scenes = new WeakMap<Pacem2DElement, CanvasRenderingContext2D>();
        private _handles = new WeakMap<Pacem2DElement, number>();


    }

}