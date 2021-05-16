namespace Pacem.Components.Charts {

    export const MANAGED_EVENTS = ['keydown', 'keyup', 'click', 'dblclick', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'mousedown', 'mouseup', 'mousemove', 'contextmenu'];

    export declare type ChartDataItem = { label: any, value: number };

    export interface ChartDataSeries {
        readonly values: ChartDataItem[];
        readonly label: any;
        readonly color?: string;
        readonly className?: string;
    }

    export declare type ChartDatasource = ChartDataSeries[];

    export declare type ChartDataSeriesItem = { series: any, label: any, color: string, value: number };

    function logN(N, x) {
        return Math.log10(x) / Math.log10(N);
    }

    const MSECS_PER_DAY = 1000 * 60 * 60 * 24;
    const MAX_X_LABELS: number = 10;
    const MAX_Y_LABELS: number = 10;
    const SERIES_DATAITEM = 'pacem:chart-series:dataitem';

    function getEvenlySpaced(items: ChartDataItem[], type: 'string' | 'number' | 'date', min: number, max: number, formatOrLang: string | ((input: string | number | Date) => string), labels: number = MAX_X_LABELS): string[] {
        const length = (type === 'number' || type === 'date') ? (max - min) : Math.max(1, items.length - 1);
        const gaps = labels - 1;
        var retval: string[] = [];
        var step = 1;
        for (var l = gaps; l > 1; l--) {
            if ((length % l) === 0) {
                step = length / l;
                break;
            }
        }
        if (step === 1 /* coprime number? */ && length > labels) {
            step = length;
        }

        const fnDate = typeof formatOrLang === 'function' ? formatOrLang : (step >= MSECS_PER_DAY ? ((d: Date) => d.toLocaleDateString(formatOrLang)) : ((d: Date) => d.toLocaleTimeString(formatOrLang)));
        const fnDateFirst = typeof formatOrLang === 'function' ? formatOrLang : (step < MSECS_PER_DAY ? ((d: Date) => d.toLocaleString(formatOrLang)) : fnDate);
        const fnNum = typeof formatOrLang === 'function' ? formatOrLang : (n: number) => n.toLocaleString(formatOrLang);

        for (var j = 0; j <= length; j += step) {
            let label: string;
            switch (type) {
                case 'string':
                    if (j >= items.length) {
                        continue;
                    }
                    label = items[j].label;
                    break;
                case 'number':
                    label = fnNum(min + j);
                    break;
                case 'date':
                    let date = Utils.parseDate(min + j);
                    let fn = (j == 0) ? fnDateFirst : fnDate;
                    label = fn(date);
                    break;
                default:
                    throw 'Not supported.';
            }
            retval.push(label);
        }
        return retval;
    }

    function getRoundedBoundaries(a0: number, a1: number, step?: number) {

        if (!(step > 0)) {
            step = bestGuessedDensity(a0, a1);
        }

        const magn = logN(step, a1 - a0),
            rounder = Math.pow(step, Math.floor(magn));
        return {
            min: Math.floor(a0 / rounder) * rounder,
            max: Math.ceil(a1 / rounder) * rounder,
            round: rounder
        };
    }

    function bestGuessedDensity(min: number, max: number): number {
        const delta = max - min;
        if (!(delta > 0)) {
            return 2;
        }
        const oom = Math.floor(Math.log10(delta));
        const exp = Math.pow(10, -oom);

        // bring everything to a single digit format
        if (oom != 0) {
            return bestGuessedDensity(min * exp, max * exp);
        }

        const capFn = (n) => {
            const norm = Math.floor(Math.abs(n) * 10),
                limit = norm + 10 - (norm % 10);
            return limit.roundoff();
        }

        const b = capFn(delta);
        let a = 10;
        if (min !== 0) {
            a = capFn(Math.abs(max));
        }
        const ret = gcd(a, b);
        return ret === 1 ? b : Math.max(ret, 10 - ret);
    }

    function gcd(a: number, b: number) {
        if (a <= 0) {
            return b;
        }
        return gcd(b % a, a);
    }

    export interface ChartEventArgs {
        readonly dataItem: ChartDataSeriesItem;
        readonly anchorPoint: Point;
    }

    export class ChartEvent extends CustomUIEvent<ChartEventArgs>{
        constructor(type: string, eventInit: CustomEventInit<ChartEventArgs>, originalEvent: MouseEvent | TouchEvent | KeyboardEvent) {
            super(type, eventInit, originalEvent);
        }
    }

    @CustomElement({ tagName: P + '-chart-series' })
    export class PacemChartSeriesElement extends PacemItemElement implements ChartDataSeries {

        /** Gets or sets the - already sorted - set of chart data items. */
        @Watch({ converter: PropertyConverters.Json }) datasource: ChartDataItem[];
        /** Gets or sets the series label. */
        @Watch({ converter: PropertyConverters.String }) label: string;
        @Watch({ converter: PropertyConverters.String }) color: string;

        get values() {
            return this.datasource;
        }

        /** @internal
         *  The elements that visually 'reflect' each ChartDataItem. */
        @Watch(/* to be set programmatically (internally) */) _uiElements: Element[];

    }

    const SVG_NS = "http://www.w3.org/2000/svg";

    export abstract class PacemSeriesChartElement extends PacemItemsContainerElement<PacemChartSeriesElement> {

        constructor() {
            super();
            this._key = Utils.uniqueCode();
        }

        validate(item: PacemChartSeriesElement): boolean {
            return item instanceof PacemChartSeriesElement;
        }

        @Watch({ converter: PropertyConverters.Element }) target: HTMLElement;
        /** 
         Gets or sets the x-axis type for sorting, measuring and labeling.
         */
        @Watch({ emit: false, converter: PropertyConverters.String }) xAxisType: 'string' | 'date' | 'number';
        @Watch({ emit: false, converter: PropertyConverters.String }) xAxisPosition: 'bottom' | 'top' | 'none';
        @Watch({ emit: false, converter: PropertyConverters.Json }) datasource: ChartDatasource;
        /** Gets or sets the maximum number of horizontal grid lines. */
        @Watch({ emit: false, converter: PropertyConverters.Number }) yAxisDensity: number;
        @Watch({ emit: false, converter: PropertyConverters.Json }) yAxisFormat: Intl.NumberFormatOptions;
        @Watch({ emit: false, converter: PropertyConverters.Json }) xAxisFormat: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions;


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

                this._ensureResizer();
                this.draw();
            }
            else if (!first) {
                switch (name) {
                    case 'items':
                        this._databindAndDrawDebounced();
                        break;
                    case 'datasource':
                        this._databind();
                    // fall down to draw() call.
                    case 'yAxisDensity':
                    case 'xAxisType':
                    case 'xAxisPosition':
                    case 'yAxisFormat':
                        this.draw();
                        break;
                }
            }
        }

        private _handle: number;
        private _databindAndDrawDebounced() {
            cancelAnimationFrame(this._handle);
            this._handle = requestAnimationFrame(() => {
                this._databind();
                this.draw();
            });
        }

        private _databind() {
            this._datasource = Utils.isNullOrEmpty(this.datasource) ? this.items : this.datasource;
        }

        private _key: string;
        private _mask: SVGMaskElement;
        private _body: SVGSVGElement;
        private _div: HTMLElement;
        private _datasource: ChartDatasource;

        private _grid: SVGSVGElement;
        private _series: SVGSVGElement[] = [];
        private _resizer: PacemResizeElement;
        private _size: Size;

        disconnectedCallback() {
            this._div && this._div.remove();
            const resizer = this._resizer;
            if (!Utils.isNull(resizer)) {
                resizer.removeEventListener('resize', this._resizeHandler, false);
                resizer.remove();
            }
            super.disconnectedCallback();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._ensureResizer();
            this._databind();
            this.draw();
        }

        private _ensureResizer(target = this.target || this._div) {
            if (Utils.isNull(this._resizer)) {
                const resizer = this._resizer = this.parentElement.insertBefore(new PacemResizeElement(), this);
                resizer.addEventListener('resize', this._resizeHandler, false);
            }
            this._resizer.target = target;

        }

        private _resizeHandler = (evt: ResizeEvent) => {
            this._size = evt.detail;
            this.draw();
        }

        // #region OO-scoped props

        protected get chartSize() {
            return this._size;
        }

        protected get chartSeries() {
            return this._series;
        }

        protected get chartBody() {
            return this._body;
        }

        protected get chartGrid() {
            return this._grid;
        }

        protected get chartMask() {
            return this._mask;
        }

        protected get chartKey() {
            return this._key;
        }

        protected get chartContainer() {
            return this._div;
        }

        // #endregion

        private _broadcastHandler = (e: MouseEvent | TouchEvent | KeyboardEvent) => {
            /* Don't mess with the events:
             * keep the original (trusted) events with their well-known names
             * and provide a method to retrieve the 'ChartDataItem' based on the the eventTarget. */
            const element = e.currentTarget as Element;
            const dataItem = CustomElementUtils.getAttachedPropertyValue(element, SERIES_DATAITEM) as ChartDataSeriesItem;
            if (Utils.isNull(dataItem)) {
                return;
            }

            const chart = this,
                anchorPoint = chart.getAnchorPoint(element);
            const evt = new ChartEvent('item' + e.type, { detail: { dataItem, anchorPoint } }, e);
            chart.dispatchEvent(evt);

        };

        protected assignUiBehaviors(ui: Element, series: ChartDataSeries, data: ChartDataItem, color?: string) {
            const alreadyRegistered = !Utils.isNull(CustomElementUtils.getAttachedPropertyValue(ui, SERIES_DATAITEM));
            const item: ChartDataSeriesItem = { series: series.label, label: data.label, value: data.value, color: color || series.color };
            CustomElementUtils.setAttachedPropertyValue(ui, SERIES_DATAITEM, item);
            if (!alreadyRegistered) {
                MANAGED_EVENTS.forEach(type => {
                    ui.addEventListener(type, this._broadcastHandler)
                });
            }
        }

        protected disposeUiBehaviors(ui: Element) {
            CustomElementUtils.deleteAttachedPropertyValue(ui, SERIES_DATAITEM);
            MANAGED_EVENTS.forEach(type => {
                ui.removeEventListener(type, this._broadcastHandler)
            });
        }

        protected ensureChartContainer() {
            if (Utils.isNull(this._div)) {

                let div = this._div = this.target || document.createElement('div');
                div.classList.add(PCSS + '-chart-area');

                if (div != this.target) {
                    this.parentElement.insertBefore(div, this);
                }
            }
            return this._div;
        }

        protected ensureChartBody(type: string, w?: number, h?: number) {

            if (Utils.isNull(this._body)) {

                let svg = this._body = document.createElementNS(SVG_NS, 'svg');
                svg.setAttribute('pacem', '');
                svg.setAttribute('class', PCSS + '-' + type + '-chart');
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

        protected chartDataItemToPoint(input: ChartDataItem, source: ChartDataItem[]): Point {
            switch (this.xAxisType || 'string') {
                case 'number':
                    return { x: parseFloat(input.label), y: input.value };
                case 'date':
                    return { x: Utils.parseDate(input.label).valueOf(), y: input.value };
                case 'string':
                    return { x: source.findIndex(e => e.label == input.label), y: input.value };
                default:
                    throw 'Not supported.';
            }
        }

        protected getVirtualGrid(items: ChartDataItem[], minX: number, maxX: number, minY: number, maxY: number, xAxisType = this.xAxisType, steps?: number)
            : { x: string[], y: number[] } {
            const rangeY = getRoundedBoundaries(minY, maxY, steps),
                stepY = rangeY.round;

            // fill y-axis array
            var y: number[] = [];
            for (let j = rangeY.min; j <= rangeY.max; j += stepY) {
                y.push(j.roundoff());
            }

            // fill x-axis array;
            let lang = Utils.lang(this);
            let format: (n: number | string | Date) => string = null;
            const intl = this.xAxisFormat;
            if (!Utils.isNullOrEmpty(intl)) {
                switch (xAxisType) {
                    case 'number':
                        format = (n: number) => Intl.NumberFormat(lang, intl).format(n);
                        break;
                    case 'date':
                        format = (n: number | string | Date) => Intl.DateTimeFormat(lang, <Intl.DateTimeFormatOptions>intl).format(Utils.parseDate(n));
                        break;
                }
            }
            const x = getEvenlySpaced(items, xAxisType, minX, maxX, format ?? lang);
            return { x: x, y: y };
        }

        protected wipeOut(series = this._series, startIndex = 0) {
            for (var j = series.length - 1; j >= startIndex; j--) {
                series[j].remove();
            }
            series.splice(startIndex);
        }

        protected buildLinearGradient(seriesIndex: number, invert = false): SVGLinearGradientElement {
            const grad = document.createElementNS(SVG_NS, 'linearGradient');
            grad.id = this.chartKey + '_grad' + seriesIndex + (invert ? '_inverted' : '');
            if (invert) {
                Utils.addClass(grad, 'bottom-up');
            }
            grad.setAttribute('x1', '0%');
            grad.setAttribute('x2', '0%');
            grad.setAttribute('y1', '0%');
            grad.setAttribute('y2', '100%');
            grad.setAttribute('spreadMethod', 'pad');

            const stop1 = document.createElementNS(SVG_NS, 'stop');
            stop1.setAttribute('offset', '0%');

            const stop2 = document.createElementNS(SVG_NS, 'stop');
            stop2.setAttribute('offset', '100%');

            grad.appendChild(stop1);
            grad.appendChild(stop2);

            return grad;
        }

        protected setGradientColor(grad: SVGLinearGradientElement, color: string) {
            for (let j = 0; j < grad.children.length; j++) {
                const stop = grad.children.item(j);
                if (stop instanceof SVGStopElement) {
                    stop.style.stopColor = color;
                }
            }
        }

        protected estimateYAxisLabelWidth(max: number): number {
            const txt = this.formatYAxisLabel(max);
            return this.estimateLabelWidth(txt);
        }

        protected estimateLabelWidth(txt: string): number {
            const grid = this._grid;
            if (Utils.isNull(grid)) {
                throw new Error('Unable to estimate label without an underlying grid available.');
            }
            const lbl = document.createElementNS(SVG_NS, 'text');
            lbl.textContent = txt;
            grid.appendChild(lbl);
            const size = Utils.offset(lbl);
            lbl.remove();
            return size.width;
        }

        protected formatYAxisLabel(y: number): string {
            const intl = this.yAxisFormat;
            return Utils.isNullOrEmpty(intl) ? y.toString() : Intl.NumberFormat(Utils.lang(this), intl).format(y);
        }

        protected estimateXAxisLabelWidth(max: number | Date | string): number {
            const txt = this.formatXAxisLabel(max);
            return this.estimateLabelWidth(txt);
        }

        protected formatXAxisLabel(x: number | Date | string): string {
            const intl = this.xAxisFormat,
                lang = Utils.lang(this);
            switch (this.xAxisType) {
                case 'date':
                    const date = Utils.Dates.parse(x);
                    return Utils.isNullOrEmpty(intl) ? date.toLocaleString(lang) : Intl.DateTimeFormat(lang, <Intl.DateTimeFormatOptions>intl).format(date);
                case 'number':
                    const num = <number>x;
                    return Utils.isNullOrEmpty(intl) ? num.toLocaleString(lang) : Intl.NumberFormat(lang, intl).format(num);
                default:
                    return <string>x;
            }
        }

        draw() {
            this.drawSeries(this._datasource);
        }

        protected abstract drawSeries(datasource: ChartDatasource);

        /**
         * Default implementation.
         * @param element
         */
        getAnchorPoint(element: Element): Point {
            const rect = Utils.offset(element);
            return { x: rect.left + rect.width * .5, y: rect.top + rect.height * .5 };

        }
    }
}