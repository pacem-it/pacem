﻿/// <reference path="../../../dist/js/pacem-foundation.d.ts" />
/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Charts {

    @CustomElement({ tagName: P + '-pie-slice' })
    export class PacemPieSliceElement extends PacemItemElement implements ChartDataItem {

        protected findContainer() {
            return CustomElementUtils.findAncestorOfType(this, PacemPieChartElement);
        }

        private get chart() {
            return <PacemPieChartElement>this.container;
        }

        @Watch({ converter: PropertyConverters.Number }) value: number;
        @Watch({ converter: PropertyConverters.String }) label: string;
        @Watch({ converter: PropertyConverters.String }) color: string;

        @Watch({ converter: PropertyConverters.Json }) normalizedPolarCoords: { radius: number, angle: number };

        /** Returns the center of mass (point) of this pie/doughnut slice, in absolute coords (pixels). */
        getCenterOfMass(): Point {
            const area = this.chart && this.chart.area;
            if (Utils.isNull(area)) {
                return null;
            }
            const rect = Utils.offset(area),
                center = { x: rect.width / 2 + rect.left, y: rect.top + rect.height / 2 },
                r = Math.min(rect.width, rect.height) * .5;
            const pos = this.normalizedPolarCoords,
                angle = PI1_2 - pos.angle;
            return {
                y: center.y - r * pos.radius * Math.sin(angle),
                x: center.x + r * pos.radius * Math.cos(angle)
            }
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first && this.chart && name != 'normalizedPolarCoords')
                this.chart.draw();
        }

        private _ui: Element;

        /** @internal */
        _assignUi(el: Element) {
            const ui = this._ui = el;
            MANAGED_EVENTS.forEach(type => {
                ui.addEventListener(type, this._broadcastHandler);
            });
        }

        /** @internal */
        _disposeUi() {
            if (!Utils.isNull(this._ui)) {
                MANAGED_EVENTS.forEach(type => {
                    this._ui.removeEventListener(type, this._broadcastHandler);
                });
            }
        }

        private _broadcastHandler = (e: Event) => {
            this.emit(e);
        };
    }

    const TWO_PI = Math.PI * 2;
    const PI1_2 = Math.PI * .5;

    @CustomElement({ tagName: P + '-pie-chart' })
    export class PacemPieChartElement extends PacemItemsContainerElement<PacemPieSliceElement> {

        constructor() {
            super();
            this._key = Utils.uniqueCode();
        }

        validate(item: PacemPieSliceElement): boolean {
            return item instanceof PacemPieSliceElement;
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.draw();
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'target') {
                this._g = null;
                this._div && this._div.remove();
                const eold = <HTMLElement>old;
                if (eold) {
                    eold.classList.remove(PCSS + '-chart-area');
                    eold.innerHTML = '';
                }
                this.draw();
            }
            else if (!first && (name === 'cutout' || name === 'items'))
                this.draw();
        }

        /** Set a value between 0 and 1, for doughnut appearance. */
        @Watch({ converter: PropertyConverters.Number }) cutout: number = .0;
        @Watch({ converter: PropertyConverters.Element }) target: HTMLElement;
        @Watch({ converter: PropertyConverters.Boolean }) maskBasedRendering: boolean;

        get area(): SVGSVGElement {
            return this._svg;
        }

        private _key: string;
        private _svg: SVGSVGElement;
        private _mask: SVGCircleElement;
        private _g: SVGGElement;
        private _div: HTMLElement;

        disconnectedCallback() {
            this._div && this._div.remove();
            super.disconnectedCallback();
        }

        private _ensureArea() {
            if (Utils.isNull(this._g)) {

                let div = this.target || (this._div = document.createElement('div'));
                div.classList.add(PCSS + '-chart-area');

                let svg = this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('pacem', '');
                svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                svg.setAttribute('viewBox', '0 0 100 100');
                //svg.style.height =
                //    svg.style.width = '100%';
                svg.classList.add(PCSS + '-pie-chart');

                let defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                let g = this._g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

                svg.appendChild(defs);
                svg.appendChild(g);

                div.appendChild(svg);
                this._div &&
                    this.parentElement.insertBefore(div, this);
            }
            if (this.maskBasedRendering) {
                if (Utils.isNull(this._mask)) {
                    let mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
                    mask.id = 'pie_mask_' + this._key;
                    let rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    rect.setAttribute('x', '0');
                    rect.setAttribute('y', '0');
                    rect.setAttribute('width', '100');
                    rect.setAttribute('height', '100');
                    rect.setAttribute('fill', '#fff');
                    let circle = this._mask = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', '50');
                    circle.setAttribute('cy', '50');

                    const defs = this._svg.firstElementChild;

                    mask.appendChild(rect);
                    mask.appendChild(circle);
                    defs.appendChild(mask);
                    this._g.setAttribute('mask', `url(#${mask.id})`);
                }
                const cutout = 50.0 * this._safeCutout;
                this._mask.setAttribute('r', `${cutout}`);
            } else {
                if (!Utils.isNull(this._mask)) {
                    this._svg.firstElementChild.innerHTML = '';
                    this._mask = null;
                    this._g.removeAttribute('mask');
                }
            }
            return this._g;
        }

        private get _safeCutout() {
            return Math.min(1, Math.max(0, this.cutout)) || .0;
        }

        private _drawSlice(path: SVGPathElement, slice: PacemPieSliceElement, whole: number, partial: number) {
            const largeFlag = slice.value > .5 * whole ? 1 : 0;
            const angle = TWO_PI * slice.value / whole;
            const rot = 360.0 * partial / whole;
            const x = (slice.value >= whole) ? /* handling single slice */ 49.9 : 50 * (1 + Math.sin(angle));
            const y = 50 * (1 - Math.cos(angle));

            // set geometry data
            const c = this._safeCutout,
                r = c * 50.0;

            path.style.fill = slice.color;//.setAttribute('fill', slice.color || (path.getAttribute('fill') || '#000'));
            //path.setAttribute('transform', `rotate(${rot} 50 50)`);
            path.style.transform = `rotate(${rot}deg)`;
            path.style.transformOrigin = '50% 50%';

            const d = this.maskBasedRendering ?
                `M50,50 V0 A50,50 0 ${largeFlag} 1 ${x} ${y} L50,50 Z` :
                `M50,0 A50,50 0 ${largeFlag} 1 ${x} ${y} l${(50 - x) * (1.0 - c)},${(50 - y) * (1.0 - c)} A${r},${r} 0 ${largeFlag} 0 50,${(50 - r)} Z`;
            path.setAttribute('d', d);

            slice.normalizedPolarCoords = { radius: c + Math.SQRT1_2 * (1.0 - c), angle: /* deg to rad */ Math.PI * rot / 180.0 + angle / 2 };
        }

        private _isSliceOk(slice: PacemPieSliceElement): boolean {
            return !slice.disabled //&& slice.value > 0
                ;
        }

        private _slices = new WeakMap<SVGGElement, PacemPieSliceElement>();

        @Debounce(true)
        draw() {
            const g = this._ensureArea(),
                pCount = g.children.length,
                chartArea = this._svg.parentElement;

            let ndx = 0, sum = .0, progress = .0;
            if (Utils.isNullOrEmpty(this.items)) {

                g.innerHTML = '';
                Utils.removeClass(chartArea, 'chart-has-data');
            } else {

                Utils.addClass(chartArea, 'chart-has-data');
                for (let slice of this.items) {
                    if (!this._isSliceOk(slice))
                        continue;
                    sum += slice.value;
                }

                if (sum <= 0) {
                    g.innerHTML = '';
                    Utils.removeClass(chartArea, 'chart-has-data');

                } else {

                    for (let slice of this.items) {
                        if (!this._isSliceOk(slice))
                            continue;
                        let p: SVGPathElement;
                        if (ndx >= pCount) {
                            const g_n = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                            g_n.setAttribute('class', 'chart-series ' + PCSS + '-pie-slice' + (Utils.isNullOrEmpty(slice.className) ? '' : (' ' + slice.className)));
                            p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                            g_n.appendChild(p);
                            g.appendChild(g_n);

                            // add listeners (click, mouse-..., touch-...)
                            slice._assignUi(g_n);
                            this._slices.set(g_n, slice);

                        } else {
                            p = <SVGPathElement>g.children.item(ndx).firstElementChild;
                        }

                        if (slice.value > 0) {
                            this._drawSlice(p, slice, sum, progress);
                            progress += slice.value;
                            p.removeAttribute('display');
                        } else {
                            p.setAttribute('display', 'none');
                        }
                        ndx++;
                    }
                }
            }
            while (ndx < g.children.length) {

                const slices = this._slices,
                    g_n = g.children.item(ndx) as SVGGElement;

                // remove listeners
                if (slices.has(g_n)) {
                    slices.get(g_n)._disposeUi();
                    slices.delete(g_n);
                }
                g.removeChild(g_n);
            }

        }
    }

}