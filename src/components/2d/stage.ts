/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Drawing {

    // group [1] := align x,[3] := align y,[6] := slice
    const ASPECTRATIO_PATTERN = /^\s*[xX]\s*([Mm](in|ax|id))\s*[yY]\s*([Mm](in|ax|id))(\s+(none|slice|meet))?\s*$/;
    const aspectRatioPropertyConverter: PropertyConverter = {
        convert: (attr) => {
            const regArr = ASPECTRATIO_PATTERN.exec(attr);
            if (regArr && regArr.length >= 4) {
                return {
                    x: regArr[1].toLowerCase(),
                    y: regArr[3].toLowerCase(),
                    slice: regArr[6] === 'slice'
                };
            }
            return 'none';
        },
        convertBack: (val: Pacem.Drawing.ViewBoxAspectRatio) => {
            if (Utils.isNull(val) || typeof val === 'string') {
                return 'none';
            }
            return `xM${(val.x.substr(1))}YM${(val.y.substr(1))} ${(val.slice ? 'slice' : 'meet')}`;
        }
    };
    const DEFAULT_STAGE_OPTIONS: StageOptions = {
        panControl: true,
        zoomControl: true,
        panModifiers: [EventKeyModifier.AltKey],
        zoomModifiers: [EventKeyModifier.AltKey]
    };

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME, shadow: Defaults.USE_SHADOW_ROOT, template: `<${P}-resize></${P}-resize><div class="${PCSS}-2d"></div><pacem-content></pacem-content>` })
    export class Pacem2DElement extends PacemItemsContainerElement<DrawableElement> implements Stage {

        get stage(): HTMLElement {
            return this._stage;
        }

        #trasformMatrix = Matrix2D.identity;
        get transformMatrix() {
            return this.#trasformMatrix;
        }

        validate(item: DrawableElement): boolean {
            return item instanceof DrawableElement && /* only direct items */ Utils.isNull(item.parent);
        }

        @Watch({ converter: PropertyConverters.Element }) adapter: Pacem2DAdapterElement;
        @Watch({ reflectBack: true, converter: PropertyConverters.Rect }) viewbox: Rect;
        @Watch({ emit: false, reflectBack: true, converter: aspectRatioPropertyConverter }) aspectRatio: Pacem.Drawing.ViewBoxAspectRatio;
        @Watch({ emit: false, converter: PropertyConverters.Json }) datasource: Pacem.Drawing.Drawable[];
        @Watch({ emit: false, converter: PropertyConverters.Json }) options: StageOptions;

        @ViewChild('.' + PCSS + '-2d') private _stage: HTMLElement;
        @ViewChild(P + '-resize') private _resize: Pacem.Components.PacemResizeElement;

        draw(item?: Pacem.Drawing.Drawable);
        draw(item: Pacem.Drawing.Group, redrawContent: boolean);
        draw(item?: Pacem.Drawing.Drawable, redraw = false) {
            const adapter = this.adapter;
            if (!this.disabled && !Utils.isNull(adapter)) {
                let cancelable = new CustomEvent('predraw', { cancelable: true });
                this.dispatchEvent(cancelable);
                if (!cancelable.defaultPrevented) {
                    adapter.draw(this, item, redraw);
                    this.dispatchEvent(new CustomEvent('draw'));
                }
            }
        }

        @Debounce(true)
        private _drawDebounced(item?: Pacem.Drawing.Drawable, force = false) {
            if (!Utils.isNull(item) && Pacem.Drawing.isGroup(item)) {
                this.draw(item, force);
            } else {
                this.draw(item);
            }
        }

        /** Debounced draw invocation. */
        requestDraw(item?: Pacem.Drawing.Drawable);
        requestDraw(item: Pacem.Drawing.Group, redrawContent: boolean);
        requestDraw(item?: Pacem.Drawing.Drawable, redraw = false) {
            this._drawDebounced(item, redraw);
        }

        private _buildUpDatasourceFromDOM() {
            this.datasource = (this.items || []).slice();
        }

        private _options = DEFAULT_STAGE_OPTIONS;
        private _size: Size;
        private _resizeHandler = (evt: ResizeEvent) => {
            this._size = { width: evt.detail.width, height: evt.detail.height };
            const adapter = this.adapter;
            if (!Utils.isNull(adapter)) {
                this._invalidateSize();
            }
        }

        private _zoomHandler = (evt: WheelEvent) => {
            const opts = this._options;
            if (opts.zoomControl && CustomEventUtils.matchModifiers(evt, opts.zoomModifiers)) {
                // prevent anything
                avoidHandler(evt);

                const size = this._size,
                    zoomingOut = evt.deltaY < 0,
                    vbox = this.viewbox || { x: 0, y: 0, width: size.width, height: size.height };
                // center change?
                const factor = .1,
                    sign = zoomingOut ? -1 : 1,
                    factorWSign = factor * sign,
                    scale = 1 + factorWSign;

                const vsize = Math.min(vbox.width, vbox.height),
                    targetWidth = vsize * scale,
                    targetHeight = vsize * scale;

                if (targetWidth > 0 && targetHeight > 0) {

                    // offset
                    const
                        //scale = targetWidth / dim,
                        stageRect = Utils.offsetRect(<Element>evt.currentTarget),
                        vboxRatio = vbox.width / vbox.height,
                        size = Math.min(stageRect.width, stageRect.height),
                        pt = { x: evt.clientX, y: evt.clientY },
                        adjX = (targetWidth - vbox.width) * (pt.x - stageRect.x - .5 * (stageRect.width - size)) / (size * vboxRatio),
                        adjY = (targetHeight - vbox.height) * (pt.y - stageRect.y - .5 * (stageRect.height - size)) / (size * vboxRatio);
                    ;

                    const targetX = vbox.x - adjX,
                        targetY = vbox.y - adjY;

                    this.viewbox = { x: targetX, y: targetY, width: targetWidth, height: targetHeight };

                }
            }
        };

        private _getPanPoint(evt: MouseEvent | TouchEvent): Point {
            const opts = this._options;
            if (evt instanceof MouseEvent && CustomEventUtils.matchModifiers(evt, opts.panModifiers)) {

                return CustomEventUtils.getEventCoordinates(evt).page;
            }
            return null;
        }

        private _panHandler = (evt: MouseEvent | TouchEvent) => {
            const state = this._panningStart,
                actual = this._getPanPoint(evt);
            if (!Utils.isNullOrEmpty(state && state.point) && !Utils.isNull(actual)) {
                const factor = state.factor,
                    vbox = state.box, start = state.point;
                this.viewbox = {
                    x: vbox.x - factor * (actual.x - start.x),
                    y: vbox.y - factor * (actual.y - start.y),
                    width: vbox.width,
                    height: vbox.height
                };
            }
        };

        private _panningStart: { point: Point, box: Rect, factor: number };
        private _panStartHandler = (evt: MouseEvent | TouchEvent) => {
            const opts = this._options;
            if (!opts.panControl) {
                return;
            }
            const size = this._size,
                vbox = this.viewbox || { x: 0, y: 0, width: size.width, height: size.height },
                start = this._getPanPoint(evt);
            if (start) {
                avoidHandler(evt);
                this._stage.style.pointerEvents = 'none';
                const factor = Math.max(vbox.width / size.width, vbox.height / size.height); // Math.max(vbox.height, vbox.width) / Math.max(size.height, size.width);
                this._panningStart = { point: start, box: vbox, factor };
            }
        };

        private _panEndHandler = (evt: MouseEvent | TouchEvent) => {
            this._stage.style.pointerEvents = '';
            this._panningStart = null;
        };

        private _invalidateSize() {
            this.adapter.invalidateSize(this, this._size);
            this.#trasformMatrix = this.adapter.getTransformMatrix(this);
            this.dispatchEvent(new ResizeEvent(this._size));
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            const adapter = this.adapter;
            if (!Utils.isNull(adapter)) {
                adapter.initialize(this);
                this._invalidateSize();
                // request draw right away
                this._drawDebounced();
            }

            const resize = this._resize;
            resize.addEventListener(Pacem.Components.ResizeEventName, this._resizeHandler, false);
            const stage = this._stage;
            resize.target = stage;
            const options: AddEventListenerOptions = { capture: false, passive: true };

            // zooming
            stage.addEventListener('wheel', this._zoomHandler, false);

            // panning
            stage.addEventListener('mousedown', this._panStartHandler, false);
            stage.addEventListener('touchstart', this._panStartHandler, options);
            window.addEventListener('mousemove', this._panHandler, false);
            window.addEventListener('mouseup', this._panEndHandler, false);
            window.addEventListener('touchmove', this._panHandler, options);
            window.addEventListener('touchend', this._panEndHandler, options);
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'adapter':
                    if (!Utils.isNull(old)) {
                        (<Pacem2DAdapterElement>val).dispose(this);
                    }
                    if (!Utils.isNull(val)) {
                        (<Pacem2DAdapterElement>val).initialize(this);
                        this._drawDebounced();
                    }
                    break;
                case 'aspectRatio':
                case 'viewbox':
                    if (!Utils.isNull(this.adapter)) {
                        this._invalidateSize();
                    }
                    break;
                case 'items':
                    this._buildUpDatasourceFromDOM();
                    break;
                case 'options':
                    this._options = Utils.extend({}, DEFAULT_STAGE_OPTIONS, val || {});
                    break;
                case 'disabled':
                case 'datasource':
                    this._drawDebounced();
                    break;
            }
        }

        disconnectedCallback() {
            const resizer = this._resize,
                stage = this._stage;
            if (!Utils.isNull(resizer)) {
                resizer.removeEventListener(Pacem.Components.ResizeEventName, this._resizeHandler, false);
            }
            if (!Utils.isNull(stage)) {

                // zooming
                stage.removeEventListener('wheel', this._zoomHandler, false);

                // panning
                stage.removeEventListener('mousedown', this._panStartHandler, false);
                stage.removeEventListener('touchstart', this._panStartHandler);
                window.removeEventListener('mousemove', this._panHandler, false);
                window.removeEventListener('mouseup', this._panEndHandler, false);
                window.removeEventListener('touchmove', this._panHandler);
                window.removeEventListener('touchend', this._panEndHandler);
            }
            if (!Utils.isNull(this.adapter)) {
                this.adapter.dispose(this);
            }
            super.disconnectedCallback();
        }

    }

}