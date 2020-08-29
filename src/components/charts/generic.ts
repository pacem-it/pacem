/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.Charts {

    function logN(N, x) {
        return Math.log10(x) / Math.log10(N);
    }

    const MSECS_PER_DAY = 1000 * 60 * 60 * 24;

    function getEvenlySpaced(items: ChartDataItem[], type: 'string' | 'number' | 'date', min: number, max: number, lang: string, labels: number = MAX_X_LABELS): string[] {
        var length = items.length;
        const gaps = labels - 1;
        if (type === 'number' || type === 'date') {
            length = max - min;
        }
        var retval: string[] = [];
        var step = 1;
        for (var l = gaps; l > 1; l--) {
            if ((length % l) === 0) {
                step = length / l;
                break;
            }
        }
        if (step === 1 /* prime number? */ && length > labels)
            step = length;

        const fnDate: Function = step >= MSECS_PER_DAY ? Date.prototype.toLocaleDateString : Date.prototype.toLocaleTimeString;

        for (var j = 0; j <= length; j += step) {
            let label: string;
            switch (type) {
                case 'string':
                    label = items[j].label;
                    break;
                case 'number':
                    label = (min + j) + '';
                    break;
                case 'date':
                    let date = Utils.parseDate(min + j);
                    let fn: Function = (j == 0 && step < MSECS_PER_DAY) ? Date.prototype.toLocaleString : fnDate;
                    label = fn.apply(date, [lang]);
                    break;
                default:
                    throw 'Not supported.';
            }
            retval.push(label);
        }
        return retval;
    }

    function getRoundedBoundaries(a0: number, a1: number, step = MAX_Y_LABELS) {
        const magn = logN(step, a1 - a0),
            rounder = Math.pow(step, Math.floor(magn));
        return {
            min: Math.floor(a0 / rounder) * rounder,
            max: Math.ceil(a1 / rounder) * rounder,
            round: rounder
        };
    }

    /**
     * Returns the anchor points for a Bézier curve.
     * @param p The actual point.
     * @param p0 The previous point, if any.
     * @param p1 The next point, if any.
     */
    function getSplineCtrlPoints(p: Pacem.Point, p0?: Pacem.Point, p1?: Pacem.Point): { c0: Pacem.Point, c1: Pacem.Point } {
        let c0 = p, c1 = p;

        const p0Null = Utils.isNull(p0),
            p1Null = Utils.isNull(p1);

        if (!(p0Null && p1Null)) {
            const portion = 3;
            let m0: number, m1: number;
            if (!p0Null) {
                m0 = (p.y - p0.y) / (p.x - p0.x);
            }
            if (!p1Null) {
                m1 = (p1.y - p.y) / (p1.x - p.x);
            }

            // average slope
            const m = ((m1 || (m0 || 0)) + (m0 || (m1 || 0))) / 2;

            const dx0 = p0Null ? 0 : (p.x - p0.x) / portion;
            const dx1 = p1Null ? 0 : (p1.x - p.x) / portion;
            c0 = { x: p.x - dx0, y: p.y - dx0 * m };
            c1 = { x: p.x + dx1, y: p.y + dx1 * m };
        }

        return { c0: c0, c1: c1 };
    }

    export declare type ChartDataItem = { label: any, value: number };

    @CustomElement({ tagName: P + '-chart-series' })
    export class PacemChartSeriesElement extends PacemItemElement {

        /** Gets or sets the - already sorted - set of chart data items. */
        @Watch({ converter: PropertyConverters.Json }) datasource: ChartDataItem[];
        /** Gets or sets the series label */
        @Watch({ converter: PropertyConverters.String }) label: string;
        @Watch({ converter: PropertyConverters.String }) color: string;
    }

    const MAX_X_LABELS: number = 10;
    const MAX_Y_LABELS: number = 10;
    const PADDING_PIXELS: number = 24;
    const GET_VAL = CustomElementUtils.getAttachedPropertyValue;
    const SET_VAL = CustomElementUtils.setAttachedPropertyValue;
    const DEL_VAL = CustomElementUtils.deleteAttachedPropertyValue;
    const SERIES_MAGNITUDE = 'pacem:chart-series:area';
    const SVG_NS = "http://www.w3.org/2000/svg";

    @CustomElement({ tagName: P + '-chart' })
    export class PacemChartElement extends PacemItemsContainerElement<PacemChartSeriesElement> {

        constructor() {
            super();
            this._key = Utils.uniqueCode();
        }

        validate(item: PacemChartSeriesElement): boolean {
            return item instanceof PacemChartSeriesElement;
        }

        @Watch({ converter: PropertyConverters.String }) type: 'line' | 'spline' | 'area' | 'splinearea' | 'column';
        @Watch({ converter: PropertyConverters.Element }) target: HTMLElement;
        /** Gets or sets how aspect ratio between x- and y-axis must be handled (considered only when xAxisType is `numeric`). Default is `adapt`.  */
        @Watch({ converter: PropertyConverters.Boolean }) aspectRatio: 'adapt' | 'monometric' | 'logaritmic';
        /** 
         Gets or sets the x-axis type for sorting, measuring and labeling.
         */
        @Watch({ converter: PropertyConverters.String }) xAxisType: 'string' | 'date' | 'number';
        @Watch({ converter: PropertyConverters.String }) xAxisPosition: 'bottom' | 'top' | 'none';

        register(item: PacemChartSeriesElement) {
            if (super.register(item)) {
                item.addEventListener(PropertyChangeEventName, this._itemPropertyChangedCallback, false);
                return true;
            }
            return false;
        }

        unregister(item: PacemChartSeriesElement) {
            if (super.unregister(item)) {
                item.removeEventListener(PropertyChangeEventName, this._itemPropertyChangedCallback, false);
                return true;
            }
            return false;
        }

        private _itemPropertyChangedCallback = (evt: PropertyChangeEvent) => {
            const propName = evt.detail.propertyName;
            if (propName === 'datasource'
                || propName === 'label'
                || propName === 'cssClass'
                || propName === 'color') {
                this.draw();
            }
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'target') {

                if (this._div != old) {
                    this._div && this._div.remove();
                }

                // reset
                this._div = null;
                this._body = null; // <- get checked on next draw

                const eold = <HTMLElement>old;
                if (eold) {
                    eold.classList.remove(PCSS + '-chart-area');
                    eold.innerHTML = '';
                }

                this.draw();
            }
            else if (!first && (name === 'items' || name === 'xAxisLabels'))
                this.draw();
        }

        private _key: string;
        private _mask: SVGMaskElement;
        private _body: SVGSVGElement;
        private _div: HTMLElement;

        private _grid: SVGSVGElement;
        private _series: SVGSVGElement[] = [];

        disconnectedCallback() {
            this._div && this._div.remove();
            super.disconnectedCallback();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.draw();
        }

        private _ensureChartContainer() {
            if (Utils.isNull(this._div)) {

                let div = this._div = this.target || document.createElement('div');
                div.classList.add(PCSS + '-chart-area');

                if (div != this.target)
                    this.parentElement.insertBefore(div, this);
            }
            return this._div;
        }

        private _ensureChartBody(w: number, h: number) {

            if (Utils.isNull(this._body)) {

                let svg = this._body = document.createElementNS(SVG_NS, 'svg');
                svg.setAttribute('pacem', '');
                svg.setAttribute('class', PCSS + '-category-chart');
                svg.setAttribute('preserveAspectRatio', 'xMinYMax slice');

                const g = this._grid = document.createElementNS(SVG_NS, 'svg');
                g.setAttribute('pacem', '');
                g.setAttribute('class', 'chart-grid');

                // put mask on series
                let defs = document.createElementNS(SVG_NS, 'defs');
                let mask = this._mask = document.createElementNS(SVG_NS, 'mask');

                // black (hides)
                let rect = document.createElementNS(SVG_NS, 'rect');
                rect.setAttribute('x', '0');
                rect.setAttribute('y', '0');
                rect.setAttribute('width', '100%');
                rect.setAttribute('height', '100%');
                // white (shows)
                let rect0 = document.createElementNS(SVG_NS, 'rect');
                rect0.setAttribute('y', '0');
                rect0.setAttribute('width', '100%');
                rect0.setAttribute('fill', '#fff');

                mask.id = 'gnrc_mask_' + this._key;
                mask.appendChild(rect);
                mask.appendChild(rect0);
                // place mask on series so that lines won't be rendered outside the grid borders
                //g2.setAttribute('mask', 'url(#' + mask.id + ')');

                defs.appendChild(mask);
                svg.appendChild(defs);
                svg.appendChild(g);
                this._div.appendChild(svg);
            }
            return this._body;
        }

        private _chartDataItemToPoint(input: ChartDataItem, source?: ChartDataItem[]): Point {
            switch (this.xAxisType) {
                case 'number':
                    return { x: parseFloat(input.label), y: input.value };
                case 'date':
                    return { x: Utils.parseDate(input.label).valueOf(), y: input.value };
                case 'string':
                    throw { x: source.indexOf(input), y: input.value };
                default:
                    throw 'Not supported.';
            }
        }

        private _getVirtualGrid(items: ChartDataItem[], minX: number, maxX: number, minY: number, maxY: number, xAxisType = this.xAxisType, steps: number = MAX_Y_LABELS)
            : { x: string[], y: number[] } {
            const rangeY = getRoundedBoundaries(minY, maxY),
                stepY = rangeY.round;

            // fill y-axis array
            var y: number[] = [];
            for (let j = rangeY.min; j <= rangeY.max; j += stepY)
                y.push(Math.round(j * rangeY.round) / rangeY.round);

            // fill x-axis array;
            const x = getEvenlySpaced(this.items[0].datasource, xAxisType, minX, maxX, Utils.lang(this));
            return { x: x, y: y };
        }

        private _wipe() {
            const series = this._series;
            for (var j = series.length - 1; j >= 0; j--) {
                series[j].remove();
            }
            series.splice(0);
        }

        @Throttle()
        draw() {
            if (!this.isReady)
                return;

            const div = this._ensureChartContainer();
            const type = this.type || 'line';
            const padding = PADDING_PIXELS;
            // resize all
            var size = Utils.offset(div);
            if (size.height <= padding || size.width <= padding)
                return;
            // items && labels?
            if (!(this.items && this.items.length)) {
                this._wipe();
                return;
            }
            const body = this._ensureChartBody(size.width, size.height);

            // from now on, drawing...
            this.log(Logging.LogLevel.Debug, `Drawing ${type} chart.`);

            // #region computations
            const xAxisType = this.xAxisType || 'string';

            let minY = Number.NaN,
                maxY = Number.NaN,
                minX = Number.NaN,
                maxX = Number.NaN;

            let stretch = 1;
            // individuate the min/max x & y in order correctly apply aspect ratio...
            for (let series of this.items) {
                let data = series.datasource;
                if (data && data.length) {
                    let j = 0;
                    for (let item of data) {
                        let pt = this._chartDataItemToPoint(data[j]);
                        minY = isNaN(minY) ? pt.y : Math.min(minY, pt.y);
                        maxY = isNaN(maxY) ? pt.y : Math.max(maxY, pt.y);
                        if (j === 0)
                            minX = isNaN(minX) ? pt.x : Math.min(minX, pt.x);
                        else if (j === data.length - 1)
                            maxX = isNaN(maxX) ? pt.x : Math.max(maxX, pt.x);
                        j++;
                    }
                }
            }

            /** virtual grid made of x- and y-axis labels */
            const grid = this._getVirtualGrid(this.items[0].datasource, minX, maxX, minY, maxY, xAxisType);
            const topGrid = grid.y[grid.y.length - 1],
                bottomGrid = grid.y[0];

            if (topGrid === bottomGrid)
                return;

            /** width of the WHOLE series dedicated area */
            const seriesWidth = size.width - 2 * padding;
            /** height of the WHOLE series dedicated area */
            const gridHeight = (size.height - 2 * padding);
            const seriesHeight = gridHeight * (1 - (topGrid - bottomGrid - (maxY - minY)) / (topGrid - bottomGrid));
            const seriesY = gridHeight * (topGrid - maxY) / (topGrid - bottomGrid);
            const seriesY2 = gridHeight * (minY - bottomGrid) / (topGrid - bottomGrid);

            // if not a `graph`
            if (xAxisType !== 'number' || (this.aspectRatio !== 'monometric' && this.aspectRatio !== 'logaritmic')) {
                // consider padding
                stretch = seriesWidth / seriesHeight;
                body.setAttribute('height', size.height.toString());
                body.setAttribute('width', size.width.toString());
            }
            body.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);
            // #endregion

            // #region render series
            let iter = 0;
            // normalize
            const spanX = maxX - minX,
                spanY = maxY - minY;
            const normX = 100 * stretch / spanX,
                normY = 100 / spanY;
            const normPadding = 100 * padding / seriesHeight;

            const buildPoint = (it: ChartDataItem) => {
                let p = this._chartDataItemToPoint(it);
                //pt.x *= normX;
                p.y *= normY;
                // Limit as much as possible the magnitude of a number inclued in the svg.
                // Big numbers "overflow the renderer".
                p.x = (p.x - minX) * normX;
                //pt.y = (pt.y - minY) * normY;
                return p;
            }

            for (let series of this.items) {

                // does the series svg exist?
                let svg: SVGSVGElement;
                if (this._series.length > iter) {
                    svg = this._series[iter];
                } else {
                    svg = document.createElementNS(SVG_NS, 'svg');
                    svg.setAttribute('pacem', '');
                    this._grid.insertAdjacentElement('afterend', svg);
                    let p = document.createElementNS(SVG_NS, 'path');
                    svg.appendChild(document.createElementNS(SVG_NS, 'path'));
                    this._series.push(svg);
                }
                // series positioning:
                /*
                 --------------------------------------
                 |   |--------------------------------|
                 |pad|         series here            |
                 |   |--------------------------------|
                 --------------------------------------
                 |   |             pad                |
                 --------------------------------------
                 */
                var className = 'chart-series';
                var fill = type === 'area' || type === 'splinearea';
                if (fill) {
                    className += ' series-fill';
                };
                if (!Utils.isNullOrEmpty(series.className)) {
                    className += ' ' + series.className;
                }
                svg.setAttribute('class', className);
                svg.setAttribute('x', padding.toString());
                svg.setAttribute('y', seriesY.toString());
                svg.setAttribute('width', seriesWidth.toString());
                svg.setAttribute('height', (seriesHeight + 2 * padding).toString());

                // pick path as single child element for the series.
                let path: SVGPathElement = <SVGPathElement>svg.firstElementChild;
                path.style.stroke = series.color;
                if (fill) {
                    let css = getComputedStyle(path);
                    path.style.fill = series.color || css.fill;
                } else
                    path.style.fill = 'none';

                let d = '';
                let data = series.datasource;
                if (data && data.length) {

                    const splineHere = type === 'spline' || type === 'splinearea';

                    if (splineHere) {
                        // #region SPLINE
                        let pt0: Point, pt: Point, c0: Point;
                        for (let j = 0; j < data.length; j++) {
                            const item = data[j];
                            if (!pt) {
                                pt = buildPoint(item);
                            }
                            let pt1: Point;
                            if (splineHere && j < (data.length - 1)) {
                                pt1 = buildPoint(data[j + 1]);
                            }
                            // accumulate `area` for sorting
                            let areaSoFar = GET_VAL(series, SERIES_MAGNITUDE, 0);
                            areaSoFar += item.value;
                            SET_VAL(series, SERIES_MAGNITUDE, areaSoFar);
                            var c = getSplineCtrlPoints(pt, pt0, pt1);
                            d += Utils.isNullOrEmpty(d) ? `M${pt.x},${-pt.y} ` : `C${c0.x},${-c0.y} ${c.c0.x},${-c.c0.y} ${pt.x},${-pt.y} `;
                            // step next
                            pt0 = pt; pt = pt1, c0 = c.c1;
                        }
                        // #endregion
                    } else {
                        // #region LINE
                        for (let item of data) {
                            const pt = buildPoint(item);
                            // accumulate `area` for sorting
                            let areaSoFar = GET_VAL(series, SERIES_MAGNITUDE, 0);
                            areaSoFar += item.value;
                            SET_VAL(series, SERIES_MAGNITUDE, areaSoFar);
                            d += Utils.isNullOrEmpty(d) ? `M${pt.x},${-pt.y} ` : `L${pt.x},${-pt.y} `;
                        }
                        // #endregion
                    }

                    if (fill) {
                        d += `V${(-minY * normY)} H0 Z`;
                    }
                }
                path.setAttribute('d', d);

                // tick
                iter++;
            }

            // remove exceeding series
            for (let i = this._series.length - 1; i >= iter; i--) {
                let svg = this._series.splice(i, 1)[0];
                svg.remove();
            }

            const w0 = 100 * stretch,
                h0 = 100 + 2 * normPadding,
                x0 = 0, //minX * normX,
                y0 = maxY * normY + normPadding;

            const svbox = `${x0} ${-y0} ${w0} ${h0}`;
            for (var svg of this._series) {
                svg.setAttribute('viewBox', svbox);
            }

            let mask = <SVGRectElement>this._mask.children.item(1);
            mask.setAttribute('x', x0.toString());
            mask.setAttribute('height', (size.height - padding).toString());

            // #endregion

            // #region grid

            this._grid.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);

            if (grid.x.length <= 1 || grid.y.length <= 1) {
                for (let j = this._grid.children.length - 1; j >= 0; j--) {
                    this._grid.children.item(j).remove();
                }
                return;
            }

            let pgrid: SVGPathElement;
            if (this._grid.children.length > 0) {
                pgrid = <SVGPathElement>this._grid.children.item(0);
            } else {
                pgrid = document.createElementNS(SVG_NS, 'path');
                this._grid.appendChild(pgrid);
            }

            const tick = padding * .25;

            let lblCounter = 0;
            let ensureLabel = (index: number, x: number, y: number, txt: string) => {
                const ndx = index + /* <path> is the first child element */ 1;
                let lbl: SVGTextElement;
                if (this._grid.children.length <= ndx) {
                    lbl = document.createElementNS(SVG_NS, 'text');
                    this._grid.appendChild(lbl);
                } else {
                    lbl = <SVGTextElement>this._grid.children.item(ndx);
                }
                lbl.textContent = txt;
                lbl.setAttribute('x', x.toString());
                lbl.setAttribute('y', y.toString());
                return lbl;
            };

            let dgrid = `M${padding},${padding} v${gridHeight}`; //H${w}
            // x
            let j = 0;
            const xincr = seriesWidth / (grid.x.length - 1),
                yincr = gridHeight / (grid.y.length - 1);
            if (this.xAxisPosition !== 'none') {
                for (var x of grid.x) {
                    let xcoord = padding + j * xincr;
                    if (this.xAxisPosition === 'top') {
                        dgrid += ` M${xcoord},${padding} v${-tick}`;
                        let lbl = ensureLabel(lblCounter++, xcoord, 0, x);
                        lbl.setAttribute('text-anchor', 'middle');
                        lbl.setAttribute('alignment-baseline', 'hanging');
                    } else {
                        let ycoord = gridHeight + padding;
                        dgrid += ` M${xcoord},${ycoord} v${tick}`;
                        ensureLabel(lblCounter++, xcoord, ycoord + padding, x).setAttribute('text-anchor', 'middle');
                    }
                    j++;
                }
            }
            // y
            j = 0;
            for (var y of grid.y) {
                let ycoord = gridHeight + padding - j * yincr;
                dgrid += ` M${(padding - tick)},${ycoord} H${(seriesWidth + padding)}`;
                ensureLabel(lblCounter++, 0, ycoord, y.toString()).removeAttribute('text-anchor');
                j++;
            }
            pgrid.setAttribute('d', dgrid);
            // exceeding labels?
            for (let j = this._grid.children.length - 1; j > lblCounter; j--) {
                this._grid.children.item(j).remove();
            }

            // #endregion
        }

    }
}