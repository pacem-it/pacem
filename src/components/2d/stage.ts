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
            return `xM${(val.x.substr(1))}YM${(val.y.substr(1) )} ${( val.slice ? 'slice': 'meet' )}`;
        }
    };

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME, shadow: Defaults.USE_SHADOW_ROOT, template: `<${P}-resize target="{{ ::_stage }}" on-${ResizeEventName}=":host._resize($event)"></${P}-resize><div class="${PCSS}-2d"></div><pacem-content></pacem-content>` })
    export class Pacem2DElement extends PacemItemsContainerElement<DrawableElement> implements Stage {

        get stage(): HTMLElement {
            return this._stage;
        }

        validate(item: DrawableElement): boolean {
            return item instanceof DrawableElement && /* only direct items */ Utils.isNull(item.parent);
        }

        @Watch({ converter: PropertyConverters.Element }) adapter: Pacem2DAdapterElement;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Rect }) viewbox: Rect;
        @Watch({ emit: false, reflectBack: true, converter: aspectRatioPropertyConverter }) aspectRatio: Pacem.Drawing.ViewBoxAspectRatio;
        @Watch({ emit: false, converter: PropertyConverters.Json }) datasource: Pacem.Drawing.Drawable[];

        @ViewChild('.' + PCSS + '-2d') private _stage: HTMLElement;

        // @Throttle(true)
        draw(item?: Pacem.Drawing.Drawable) {
            const adapter = this.adapter;
            if (!this.disabled && !Utils.isNull(adapter)) {
                let cancelable = new CustomEvent('predraw', { cancelable: true });
                this.dispatchEvent(cancelable);
                if (!cancelable.defaultPrevented) {
                    adapter.draw(this, item);
                    this.dispatchEvent(new CustomEvent('draw'));
                }
            }
            // requestAnimationFrame(() => this.draw());
        }

        @Debounce(true)
        private _drawDebounced() {
            this.draw();
        }

        /** Debounced draw invocation. */
        requestDraw(item?: Pacem.Drawing.Drawable) {
            this._drawDebounced();
        }

        private _buildUpDatasourceFromDOM() {
            this.datasource = (this.items || []).slice();
        }

        private _size: Size;
        private _resize = (evt: ResizeEvent) => {
            const size = this._size = { width: evt.detail.width, height: evt.detail.height };
            const adapter = this.adapter;
            if (!Utils.isNull(adapter)) {
                adapter.invalidateSize(this, size);
            }
        }

        private _zoomHandler = (evt: WheelEvent) => {
            if (evt.altKey) {
                // prevent anything
                avoidHandler(evt);

                const size = this._size,
                    zoomingOut = evt.deltaY < 0,
                    vbox = this.viewbox || { x: 0, y: 0, width: size.width, height: size.height };
                // center change?
                const factor = .1,
                    absAmountX = vbox.width * factor,
                    absAmountY = vbox.height * factor;

                vbox.width += absAmountX * (zoomingOut ? -1 : 1);
                vbox.height += absAmountY * (zoomingOut ? -1 : 1);

                if (vbox.width > 0 && vbox.height > 0) {

                    // offset
                    const
                        stageRect = Utils.offsetRect(<Element>evt.srcElement),
                        pt = { x: evt.clientX, y: evt.clientY },
                        adjX = (pt.x - stageRect.x) / (stageRect.width / 2),
                        adjY = (pt.y - stageRect.y) / (stageRect.height / 2)
                        ;

                    vbox.x += /*adjX * */absAmountX * (zoomingOut ? 1 : -1);
                    vbox.y += /*adjY * */absAmountY * (zoomingOut ? 1 : -1);

                    this.viewbox = { x: vbox.x, y: vbox.y, width: vbox.width, height: vbox.height };

                }
            }
        };

        private _getPoint(evt: MouseEvent | TouchEvent): Point {
            if (evt instanceof MouseEvent && evt.altKey) {
                return { x: evt.pageX, y: evt.pageY };
            } else if (evt instanceof TouchEvent && evt.touches.length > 0) {
                let pt = evt.touches[0];
                return { x: pt.pageX, y: pt.pageY };
            }
            return null;
        }

        private _panHandler = (evt: MouseEvent | TouchEvent) => {
            const state = this._panningStart,
                actual = this._getPoint(evt);
            if (!Utils.isNullOrEmpty(state) && !Utils.isNull(actual)) {
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
            const size = this._size,
                vbox = this.viewbox || { x: 0, y: 0, width: size.width, height: size.height };
            this._panningStart = { point: this._getPoint(evt), box: vbox, factor: vbox.width / size.width };
        };

        private _panEndHandler = (evt: MouseEvent | TouchEvent) => {
            this._panningStart = null;
        };

        viewActivatedCallback() {
            super.viewActivatedCallback();
            const adapter = this.adapter;
            if (!Utils.isNull(adapter)) {
                adapter.initialize(this);
                adapter.invalidateSize(this, this._size);
            }

            const stage = this._stage;
            const options: AddEventListenerOptions = { capture: false, passive: true };

            // zooming
            stage.addEventListener('wheel', this._zoomHandler, false);

            // panning
            stage.addEventListener('mousedown', this._panStartHandler, false);
            stage.addEventListener('mousemove', this._panHandler, false);
            stage.addEventListener('mouseup', this._panEndHandler, false);
            stage.addEventListener('touchstart', this._panStartHandler, options);
            stage.addEventListener('touchmove', this._panHandler, options);
            stage.addEventListener('touchend', this._panEndHandler, options);
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
                    }
                    break;
                case 'aspectRatio':
                case 'viewbox':
                    if (!Utils.isNull(this.adapter)) {
                        this.adapter.invalidateSize(this, this._size);
                    }
                    break;
                case 'items':
                    this._buildUpDatasourceFromDOM();
                    break;
                case 'datasource':
                    this._drawDebounced();
                    break;
            }
        }

        disconnectedCallback() {
            const stage = this._stage;
            if (!Utils.isNull(stage)) {

                // zooming
                stage.removeEventListener('wheel', this._zoomHandler, false);

                // panning
                stage.removeEventListener('mousedown', this._panStartHandler, false);
                stage.removeEventListener('mousemove', this._panHandler, false);
                stage.removeEventListener('mouseup', this._panEndHandler, false);
                stage.removeEventListener('touchstart', this._panStartHandler);
                stage.removeEventListener('touchmove', this._panHandler);
                stage.removeEventListener('touchend', this._panEndHandler);
            }
            if (!Utils.isNull(this.adapter)) {
                this.adapter.dispose(this);
            }
            super.disconnectedCallback();
        }

    }

}