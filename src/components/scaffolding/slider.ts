/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: P + '-slider',
        template: `<${P}-text text="{{ :host._format(:host.min) }}" min></${P}-text>
    <div class="slider-track"><div class="slider-progress"></div></div>
    <${P}-panel class="${PCSS}-clickable slider-thumb" behaviors="{{ [::_dragger] }}">
        <div class="thumb-label"></div>
    </${P}-panel>
    <${P}-text text="{{ :host._format(:host.max) }}" max></${P}-text>
<${P}-drag-drop lock-timeout="0"></${P}-drag-drop><pacem-resize watch-position="true" on-${ResizeEventName}=":host._setTrackSize($event)" target="{{ ::_track }}"></pacem-resize>
<${P}-balloon class="text-center"><pacem-text text="{{ :host.viewValue }}"></pacem-text></${P}-balloon><${P}-body-proxy></${P}-body-proxy>
`,
        shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemSliderElement extends PacemBaseElement {

        protected inputFields: HTMLElement[] = [];

        protected onChange(evt?: Event): PromiseLike<any> {
            return new Promise((resolve, reject) => {
                if (evt.type === 'slide') {
                    resolve(this.value = (<CustomEvent<number>>evt).detail);
                }
                resolve(this.value);
            });
        }

        private _draw(val: any = this.value) {
            const trackSize = this._trackSize;
            if (Utils.isNull(trackSize)) {
                return;
            }
            let v = parseFloat(val) || this.min;
            let percentage = Math.min(1, Math.max(0, (v - this.min) / (this.max - this.min)));
            this._progress.style.transform = `scale(${(percentage)}, 1)`;
            this._thumb.style.transform = `translateX(${Math.round(percentage * trackSize.width)}px)`;
        }

        private _format(v: number): string {
            let sv: string = '-';
            if (!Utils.isNull(v)) {
                sv = v.toLocaleString();
            }
            let evt = new CustomEvent<{ value: number, output?: string }>("formatvalue", { detail: { value: v } });
            this.dispatchEvent(evt);
            return Utils.isNull(evt.detail.output) ? sv : evt.detail.output;
        }

        protected acceptValue(val: any) {
            this._draw(val);
        }

        protected getViewValue(value: any): string {
            return this._format(value);
        }

        protected convertValueAttributeToProperty(attr: string) {
            return parseFloat(attr);
        }

        @Watch({ emit: false, converter: PropertyConverters.Number }) min: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) max: number;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) thumbLabel: boolean;
        @Watch({
            emit: false, converter: {
                convert: (attr) => {
                    let v = parseFloat(attr);
                    if (isNaN(v)) {
                        return 'any';
                    }
                    return v;
                }, convertBack: (v) => (v || '').toString()
            }
        }) step: 'any' | number;


        @ViewChild(`.slider-track`) private _track: HTMLElement;
        @ViewChild(`.slider-progress`) private _progress: HTMLElement;
        @ViewChild(`.slider-thumb`) private _thumb: HTMLElement;
        @ViewChild(`${P}-text[min]`) private _min: PacemTextElement;
        @ViewChild(`${P}-text[max]`) private _max: PacemTextElement;
        @ViewChild(`${P}-drag-drop`) private _dragger: PacemDragDropElement;
        @ViewChild(`${P}-balloon`) private _balloon: UI.PacemBalloonElement;

        protected toggleReadonlyView(readonly: boolean) {
            this._thumb.hidden = readonly;
        }

        private _trackSize: Rect;
        private _setTrackSize(evt: ResizeEvent) {
            const size = evt.detail;
            this._trackSize = { x: size.left, y: size.top, width: size.width, height: size.height };
            this._draw(this.value);
        }

        private _computeAndAssignValue(x: number) {
            // constraint to track size to compute the slider value
            const constraint = this._trackSize,
                step = this.step;
            let perc = (x - constraint.x) / constraint.width;
            let v = (this.max - this.min) * perc + this.min;
            if (typeof step === 'number') {
                v = Math.round(v / step) * step;
            }
            this._setValue(v);
        }

        private _setValue(v: number) {
            v = Math.min(this.max, Math.max(this.min, v));
            this.changeHandler(new CustomEvent('slide', { detail: v }));
        }

        private _dragHandler = (evt: Pacem.UI.DragDropEvent) => {
            evt.preventDefault();
            this._computeAndAssignValue(evt.detail.currentPosition.x);
        }

        private _startHandler = (evt: Pacem.UI.DragDropEvent) => {
            this._thumb.focus();
        }

        private _downHandler = (evt: MouseEvent | TouchEvent) => {
            const x = evt instanceof MouseEvent ? evt.clientX : evt.touches && evt.touches.length && evt.touches[0].clientX,
                trackSize = this._trackSize;
            if (!Utils.isNullOrEmpty(trackSize)) {
                this._computeAndAssignValue(x);
            }
        };

        private _keydownHandler = (evt: KeyboardEvent) => {
            switch (evt.keyCode) {
                case 39: // right
                case 37: // left
                    avoidHandler(evt);
                    let forward = evt.keyCode === 39; // TODO: include rtl!
                    let step = (typeof this.step !== 'number' ? 1.0 : this.step) * (forward ? 1 : -1);
                    let cease = false;
                    let ceaseFn = (evt: KeyboardEvent) => {
                        cease = true;
                        window.removeEventListener('keyup', ceaseFn, false);
                        Utils.removeClass(this, 'slider-keydown');
                    }
                    window.addEventListener('keyup', ceaseFn, false);
                    Utils.addClass(this, 'slider-keydown');
                    Utils.accelerateCallback(token => {
                        if (!(token.cancel = cease)) {
                            this._setValue(this.value + step);
                        }
                    });
                    break;
            }
        };

        connectedCallback() {
            super.connectedCallback();
            this.addEventListener('mousedown', this._downHandler, false);
            this.addEventListener('touchstart', this._downHandler, false);
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._dragger.addEventListener(Pacem.UI.DragDropEventType.Lock, this._startHandler, false);
            this._dragger.addEventListener(Pacem.UI.DragDropEventType.Drag, this._dragHandler, false);
            this._thumb.addEventListener('keydown', this._keydownHandler, false);
            this._min.text = this._format(this.min);
            this._max.text = this._format(this.max);
            // balloon
            const balloon = this._balloon;
            balloon.target = this._thumb;
            balloon.options = {
                trigger: UI.BalloonTrigger.Focus,
                trackPosition: true,
                position: UI.BalloonPosition.Top,
                align: UI.BalloonAlignment.Center,
                behavior: UI.BalloonBehavior.Tooltip,
                hoverDelay: 0, hoverTimeout: 0
            };
            balloon.disabled = !this.thumbLabel;
            //
            this._thumb.tabIndex = 0;
        }

        disconnectedCallback() {
            this.removeEventListener('mousedown', this._downHandler, false);
            this.removeEventListener('touchstart', this._downHandler, false);
            if (!Utils.isNull(this._dragger)) {
                this._dragger.removeEventListener(Pacem.UI.DragDropEventType.Drag, this._dragHandler, false);
                this._dragger.removeEventListener(Pacem.UI.DragDropEventType.Lock, this._startHandler, false);
            }
            if (!Utils.isNull(this._thumb)) {
                this._thumb.removeEventListener('keydown', this._keydownHandler, false);
            }
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'thumbLabel':
                    (val ? Utils.addClass : Utils.removeClass).apply(this, [this, 'slider-thumblabel']);
                    this._balloon.disabled = !val;
                    break;
                case 'min':
                case 'max':
                    if (!Utils.isNull(this._max) && !Utils.isNull(this._min)) {
                        this._min.text = this._format(this.min);
                        this._max.text = this._format(this.max);
                    }
                    this._setValue(this.value);
                    this._draw();
                    break;
            }
        }

    }

}