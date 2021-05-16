/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Charts {

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

    const GET_VAL = CustomElementUtils.getAttachedPropertyValue;
    const SET_VAL = CustomElementUtils.setAttachedPropertyValue;
    const DEL_VAL = CustomElementUtils.deleteAttachedPropertyValue;
    const PADDING_PIXELS = 24;
    const SERIES_MAGNITUDE = 'pacem:chart-series:area';
    const SVG_NS = "http://www.w3.org/2000/svg";

    @CustomElement({ tagName: P + '-chart' })
    export class PacemChartElement extends PacemSeriesChartElement {

        @Watch({ emit: false, converter: PropertyConverters.String }) type: 'line' | 'spline' | 'area' | 'splinearea';
        /** Gets or sets how aspect ratio between x- and y-axis must be handled (considered only when xAxisType is `numeric`). Default is `adapt`.  */
        @Watch({ converter: PropertyConverters.Boolean }) aspectRatio: 'adapt' | 'monometric' | 'logaritmic';

        private _getVirtualGrid(items: ChartDataItem[], minX: number, maxX: number, minY: number, maxY: number, xAxisType = this.xAxisType, steps?: number)
            : { x: string[], y: number[] } {
            return super.getVirtualGrid(items, minX, maxX, minY, maxY, xAxisType, steps);
        }

        private _wipe(series = this.chartSeries, startIndex = 0) {
            super.wipeOut(series, startIndex);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'type') {
                this.draw();
            }
        }

        private _buildLinearGradient(seriesIndex: number): SVGLinearGradientElement {
            return super.buildLinearGradient(seriesIndex);
        }

        private _setGradientColor(grad: SVGLinearGradientElement, color: string) {
            super.setGradientColor(grad, color);
        }

        protected drawSeries(datasource: ChartDatasource) {
            if (!this.isReady || Utils.isNull(this.chartSize)) {
                return;
            }

            this.ensureChartContainer();
            const type = this.type || 'line';
            const padding = PADDING_PIXELS;
            // resize all
            var size = this.chartSize;
            if (size.height <= padding || size.width <= padding) {
                return;
            }
            // items && labels?
            if (Utils.isNullOrEmpty(datasource) || datasource.every(i => Utils.isNullOrEmpty(i.values))) {
                this._wipe();
                return;
            }
            const body = this.ensureChartBody('line', size.width, size.height);

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
            for (let series of datasource) {
                let data = series.values;
                if (data && data.length) {
                    let j = 0;
                    for (let item of data) {
                        let pt = this.chartDataItemToPoint(item, data);
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

            // estimate y-axis max width
            const paddingYAxisEnd = Math.max(padding, this.estimateXAxisLabelWidth(minX) * .5 + PADDING_PIXELS),
                paddingYAxis = Math.max(paddingYAxisEnd, this.estimateYAxisLabelWidth(maxY) + PADDING_PIXELS * .5);


            /** virtual grid made of x- and y-axis labels */
            const withValues = datasource.find(i => !Utils.isNullOrEmpty(i.values));
            const grid = this._getVirtualGrid(withValues.values, minX, maxX, minY, maxY, xAxisType, this.yAxisDensity);
            const topGrid = grid.y[grid.y.length - 1],
                bottomGrid = grid.y[0];

            if (topGrid === bottomGrid)
                return;

            /** width of the WHOLE series dedicated area */
            const seriesWidth = size.width - paddingYAxis - paddingYAxisEnd;
            /** height of the WHOLE series dedicated area */
            const gridHeight = (size.height - 2 * padding);
            const seriesHeight = gridHeight * (1 - (topGrid - bottomGrid - (maxY - minY)) / (topGrid - bottomGrid));
            const seriesY = gridHeight * (topGrid - maxY) / (topGrid - bottomGrid);
            // const seriesY2 = gridHeight * (minY - bottomGrid) / (topGrid - bottomGrid);

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

            const buildPoint = (it: ChartDataItem, series: ChartDataItem[]) => {
                let p = this.chartDataItemToPoint(it, series);
                //pt.x *= normX;
                p.y *= normY;
                // Limit as much as possible the magnitude of a number inclued in the svg.
                // Big numbers "overflow the renderer".
                p.x = (p.x - minX) * normX;
                //pt.y = (pt.y - minY) * normY;
                return p;
            }

            const chartSeries = this.chartSeries;
            const chartGrid = this.chartGrid;

            const splineHere = type === 'spline' || type === 'splinearea';


            for (let series of datasource) {

                // does the series svg exist?
                let svg: SVGSVGElement;
                let grad: SVGLinearGradientElement;
                if (chartSeries.length > iter) {
                    svg = chartSeries[iter];
                    grad = svg.firstElementChild.firstElementChild as SVGLinearGradientElement;
                } else {
                    svg = document.createElementNS(SVG_NS, 'svg');
                    svg.setAttribute('pacem', '');
                    chartGrid.insertAdjacentElement('afterend', svg);
                    const defs = document.createElementNS(SVG_NS, 'defs');
                    defs.appendChild(grad = this._buildLinearGradient(iter));
                    svg.appendChild(defs);
                    // fill path
                    svg.appendChild(document.createElementNS(SVG_NS, 'path'));
                    // stroke path
                    svg.appendChild(document.createElementNS(SVG_NS, 'path'));
                    chartSeries.push(svg);
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
                if (!Utils.isNullOrEmpty(series.className)) {
                    className += ' ' + series.className;
                }
                svg.setAttribute('class', className);
                svg.setAttribute('x', paddingYAxis.toString());
                svg.setAttribute('y', seriesY.toString());
                svg.setAttribute('width', seriesWidth.toString());
                svg.setAttribute('height', (seriesHeight + 2 * padding).toString());

                // pick path as single child element for the series.
                let pathFill: SVGPathElement = <SVGPathElement>svg.children.item(1);
                let path: SVGPathElement = <SVGPathElement>svg.lastElementChild;
                path.style.stroke = series.color;
                pathFill.style.stroke =
                    path.style.fill = 'none';
                this._setGradientColor(grad, series.color);
                pathFill.style.fill = `url(#${grad.id})`;
                pathFill.style.display = fill ? '' : 'none';

                let d = '';
                let data = series.values;
                if (data && data.length) {

                    if (splineHere) {
                        // #region SPLINE
                        let pt0: Point, pt: Point, c0: Point;
                        for (let j = 0; j < data.length; j++) {
                            const item = data[j];
                            if (isNaN(item.value)) {
                                continue;
                            }
                            if (!pt) {
                                pt = buildPoint(item, data);
                            }
                            let pt1: Point;
                            if (splineHere && j < (data.length - 1)) {
                                pt1 = buildPoint(data[j + 1], data);
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
                            if (isNaN(item.value)) {
                                continue;
                            }
                            const pt = buildPoint(item, data);
                            // accumulate `area` for sorting
                            let areaSoFar = GET_VAL(series, SERIES_MAGNITUDE, 0);
                            areaSoFar += item.value;
                            SET_VAL(series, SERIES_MAGNITUDE, areaSoFar);
                            d += Utils.isNullOrEmpty(d) ? `M${pt.x},${-pt.y} ` : `L${pt.x},${-pt.y} `;
                        }
                        // #endregion
                    }
                }
                path.setAttribute('d', d);
                pathFill.setAttribute('d', d + `V${(-minY * normY)} H0 Z`);

                // tick
                iter++;
            }

            // remove exceeding series
            this._wipe(chartSeries, iter);

            const w0 = 100 * stretch,
                h0 = 100 + 2 * normPadding,
                x0 = 0, //minX * normX,
                y0 = maxY * normY + normPadding;

            const svbox = `${x0} ${-y0} ${w0} ${h0}`;
            for (var svg of chartSeries) {
                svg.setAttribute('viewBox', svbox);
            }

            const chartMask = this.chartMask;
            let mask = <SVGRectElement>chartMask.children.item(1);
            mask.setAttribute('x', x0.toString());
            mask.setAttribute('height', (size.height - padding).toString());

            // #endregion

            // #region grid

            chartGrid.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`);

            if (grid.x.length <= 1 || grid.y.length <= 1) {
                for (let j = chartGrid.children.length - 1; j >= 0; j--) {
                    chartGrid.children.item(j).remove();
                }
                return;
            }

            let pgrid: SVGPathElement;
            if (chartGrid.children.length > 0) {
                pgrid = <SVGPathElement>chartGrid.children.item(0);
            } else {
                pgrid = document.createElementNS(SVG_NS, 'path');
                chartGrid.appendChild(pgrid);
            }

            const tick = padding * .25;

            let lblCounter = 0;
            let ensureLabel = (index: number, x: number, y: number, txt: string) => {
                const ndx = index + /* <path> is the first child element */ 1;
                let lbl: SVGTextElement;
                if (chartGrid.children.length <= ndx) {
                    lbl = document.createElementNS(SVG_NS, 'text');
                    chartGrid.appendChild(lbl);
                } else {
                    lbl = <SVGTextElement>chartGrid.children.item(ndx);
                }
                lbl.textContent = txt;
                lbl.setAttribute('x', x.toString());
                lbl.setAttribute('y', y.toString());
                return lbl;
            };

            let dgrid = `M${paddingYAxis},${padding} v${gridHeight}`; //H${w}
            // x
            let j = 0;
            const xincr = seriesWidth / (grid.x.length - 1),
                yincr = gridHeight / (grid.y.length - 1);
            if (this.xAxisPosition !== 'none') {
                for (var x of grid.x) {
                    let xcoord = paddingYAxis + j * xincr;
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
                const ycoord = gridHeight + padding - j * yincr,
                    xcoord = paddingYAxis - tick;
                dgrid += ` M${xcoord},${ycoord} H${(seriesWidth + paddingYAxis)}`;
                let txt = this.formatYAxisLabel(y);
                ensureLabel(lblCounter++, xcoord - tick, ycoord, txt).setAttribute('text-anchor', 'end');
                j++;
            }
            pgrid.setAttribute('d', dgrid);
            // exceeding labels?
            for (let j = chartGrid.children.length - 1; j > lblCounter; j--) {
                chartGrid.children.item(j).remove();
            }

            // #endregion
        }

    }
}