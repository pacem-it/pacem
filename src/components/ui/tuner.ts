/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {


    @CustomElement({
        tagName: P + '-tuner', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<canvas class="${PCSS}-tuner"></canvas><div class="${PCSS}-content"><${ P }-content></${ P }-content></div>
<${ P }-tween on-step=":host._draw($event.detail.value)" on-end="this.disabled = true" duration="500" to="{{ :host.value }}" from="{{ :host.min }}"></${ P }-tween>`
    })
    export class PacemTunerElement extends PacemElement {

        constructor() {
            super();
        }

        @ViewChild('canvas') private _canvas: HTMLCanvasElement;
        @ViewChild(P + '-tween') private _tween: PacemTweenElement;
        private _context2D: CanvasRenderingContext2D;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._canvas.addEventListener('mousedown', this.startDragHandler, false);
            window.addEventListener('mousemove', this.dragHandler, false);
            window.addEventListener('mouseup', this.dropHandler, false);

            this._context2D = this._canvas.getContext('2d');
            //
            requestAnimationFrame(() => this._draw(this.min));
            //
            this._tween.easing = Pacem.Animations.Easings.sineInOut;
            this._tween.delay = 500 + (Math.random() * 100 - 100);
            this._tween.start = this.value > this.min;
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._canvas))
                this._canvas.removeEventListener('mousedown', this.startDragHandler, false);
            window.removeEventListener('mousemove', this.dragHandler, false);
            window.removeEventListener('mouseup', this.dropHandler, false);
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'interactive':
                    if (!val) Utils.removeClass(this._canvas, PCSS + '-interactive');
                    else Utils.addClass(this._canvas, PCSS + '-interactive');
                    break;
                case 'round':
                    if (Math.round(val) != val || val < 0)
                        throw `${this.constructor.name}: round value must be an integer greater or equal to zero.`;
                    break;
                default:
                    // in any other case:
                    this._draw();
                    break;
            }
        }

        @Watch({ converter: PropertyConverters.Number }) value: number;

        //#region INTERACTIVE
        @Watch({ emit: false, converter: PropertyConverters.Number }) min: number = 0.0;
        @Watch({ emit: false, converter: PropertyConverters.Number }) max: number = 100.0;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) interactive: boolean;

        @Watch({ emit: false, converter: PropertyConverters.Number }) round: number;
        private pivotPoint: { x: number, y: number };

        //@Debounce(10)
        private _setValue(pt: { x: number, y: number }) {
            const roundAngle = 2 * Math.PI;
            var angle = Math.atan2(pt.x - this.pivotPoint.x, - pt.y + this.pivotPoint.y);
            const round = Math.pow(10, this.round || 0);
            const angleValue = this.min + ((roundAngle + angle) % roundAngle) * (this.max - this.min) / roundAngle;
            const value = Math.round(round * angleValue) / round;
            if (value != this.value) {
                this.value = value;
                this.dispatchEvent(new Event("change"));
            }
        }

        private startDragHandler = (evt: PointerEvent) => {
            if (!this.interactive) return;
            evt.stopPropagation();
            let offset = Utils.offset(this._canvas);
            this.pivotPoint = {
                x: offset.left + this._canvas.clientWidth * .5,
                y: offset.top + this._canvas.clientHeight * .5
            };
            this._setValue({ x: evt.pageX, y: evt.pageY });
        }

        private dragHandler = (evt: PointerEvent) => {
            if (!this.interactive || !this.pivotPoint) return;
            evt.preventDefault();
            evt.stopPropagation();
            var rect = this._canvas.getBoundingClientRect();
            /*let pt = {
                x: (evt.clientX - rect.left) / (rect.right - rect.left) * this.canvas.width,
                y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * this.canvas.height
            }*/
            let pt = { x: evt.pageX, y: evt.pageY };
            this._setValue({ x: evt.pageX, y: evt.pageY });
        }

        private dropHandler = (evt: PointerEvent) => {
            if (!this.interactive || !this.pivotPoint) return;
            evt.preventDefault();
            evt.stopPropagation();
            this.pivotPoint = null;
        }

        //#endregion

        private _draw(value: number = this.value) {
            if (this.disabled || Utils.isNull(this._context2D)) return;
            let angle = .0;
            if (value === this.max)
                angle = 1.0;
            else if (value !== this.min)
                angle /* fraction of the round angle */ = (Utils.isNullOrEmpty(value) ? .0 : value - this.min) / (this.max - this.min);
            const cnv = this._canvas,
                style = getComputedStyle(cnv),
                ctx = this._context2D,
                thickness = parseInt(style.strokeWidth || '10px'),
                maxDim = Math.min(cnv.offsetHeight, cnv.offsetHeight),
                dim = maxDim;
            if (dim <= 0) return;
            // sweep the stage
            cnv.width =     //dim; element.width();
                cnv.height = dim; //element.height();
            const color = style.stroke;
            const defaultBorderColor = 'rgba(255,255,255,.1)';
            const bgcolor = style.borderColor || defaultBorderColor;
            const x = cnv.width * .5;
            const y = cnv.height * .5;
            const r = Math.min(x, y) - thickness * .5;
            const mathPI2 = Math.PI * .5;
            const to = -mathPI2 + 2 * Math.PI * angle;

            ctx.beginPath();
            ctx.arc(x, y, r, -mathPI2, to, false);
            ctx.lineWidth = thickness;
            // line color
            ctx.strokeStyle = color;
            ctx.stroke();
            // filler
            ctx.beginPath();
            ctx.arc(x, y, r, to + Math.PI / 60.0, 1.5 * Math.PI, false);
            ctx.lineWidth = thickness;
            // line color
            ctx.strokeStyle = /* initial style retrieval sort-of fails */ color === 'none' ? defaultBorderColor : bgcolor;
            ctx.stroke();

        }
    }
}