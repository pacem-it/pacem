/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Charts {

    const SVG_NS = "http://www.w3.org/2000/svg";
    const PADDING_PIXELS = 24;

    @CustomElement({ tagName: P + '-column-chart' })
    export class PacemColumnChartElement extends PacemSeriesChartElement {

        @Watch({ converter: PropertyConverters.String }) type: 'cluster' | 'stack';
        /** Set a value between 0 and 1, for the columns' stack/cluster horizontal size (percentage of the available space). */
        @Watch({ converter: PropertyConverters.Number }) groupWidth: number = .0;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'type' || name === 'groupWidth') {
                this.draw();
            }
        }

        private _safen(w = this.groupWidth) {
            return Math.min(1, Math.max(w || .75, 0));
        }

        drawSeries(datasource: ChartDatasource) {
            if (!this.isReady || Utils.isNull(this.chartSize)) {
                return;
            }

            const div = this.ensureChartContainer();
            const type = this.type || 'cluster';
            const padding = PADDING_PIXELS;
            // resize all
            var size = this.chartSize;
            if (size.height <= padding || size.width <= padding) {
                return;
            }
            // items && labels?
            if (Utils.isNullOrEmpty(datasource) || datasource.every(i => Utils.isNullOrEmpty(i.values))) {
                this.wipeOut();
                return;
            }
            const body = this.ensureChartBody('column', size.width, size.height);

            // from now on, drawing...
            this.log(Logging.LogLevel.Debug, `Drawing ${type} chart.`);

            // #region computations
            const xAxisType = this.xAxisType || 'string';

            let minY = 0,
                maxY = 0,
                minX = 0,
                maxX = 0,
                maxCount = 0
                ;


            let stretch = 1;
            const accumulator: { negative: number[], positive: number[] } = { negative: [], positive: [] };
            // individuate the min/max x & y in order correctly apply aspect ratio...
            for (let series of datasource) {
                let data = series.values;
                if (!Utils.isNullOrEmpty(data)) {
                    let j = 0;
                    for (let item of data) {
                        accumulator.positive[j] = accumulator.positive[j] || 0;
                        accumulator.negative[j] = accumulator.negative[j] || 0;
                        let pt = this.chartDataItemToPoint(item, data);
                        minY = Math.min(minY, pt.y);
                        maxY = Math.max(maxY, pt.y);
                        minX = Math.min(minX, pt.x);
                        maxX = Math.max(maxX, pt.x);
                        if (pt.y > 0) {
                            accumulator.positive[j] += pt.y;
                        }
                        else if (pt.y < 0) {
                            accumulator.negative[j] += pt.y;
                        }

                        j++;
                    }
                    maxCount = Math.max(maxCount, data.length);
                }
            }

            const stacked = type === 'stack';
            if (stacked) {
                minY = Math.min.apply(null, accumulator.negative);
                maxY = Math.max.apply(null, accumulator.positive);
            }

            // estimate y-axis max width
            const paddingYAxis = Math.max(padding, this.estimateYAxisLabelWidth(maxY) + PADDING_PIXELS * .5);

            if (maxX === 0 && maxX === minX) {
                maxX = 1;
            }

            // add "1 slot" (half at the beginning and half after the end)
            const slot = (maxX - minX) / maxCount,
                halfSlot = slot * .5,
                // the following are usefule during the very rendering
                availSlot = slot * this._safen(this.groupWidth),
                halfAvailSlot = availSlot * .5;

            /** virtual grid made of x- and y-axis labels */
            const withValues = datasource.find(i => !Utils.isNullOrEmpty(i.values));
            const grid = this.getVirtualGrid(withValues.values, minX - halfSlot, maxX + halfSlot, minY, maxY, xAxisType, this.yAxisDensity);
            const topGrid = grid.y[grid.y.length - 1],
                bottomGrid = grid.y[0];

            if (topGrid === bottomGrid) {
                return;
            }

            /** width of the WHOLE series dedicated area */
            const seriesWidth = size.width - 2 * paddingYAxis;
            /** height of the WHOLE series dedicated area */
            const gridHeight = (size.height - 2 * padding);
            const seriesHeight = gridHeight * (1 - (topGrid - bottomGrid - (maxY - minY)) / (topGrid - bottomGrid));
            const seriesY = gridHeight * (topGrid - maxY) / (topGrid - bottomGrid);

            // consider padding
            stretch = seriesWidth / seriesHeight;
            body.setAttribute('height', size.height.toString());
            body.setAttribute('width', size.width.toString());

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

            const chartSeries = this.chartSeries;
            const chartGrid = this.chartGrid;

            const xPad = (halfSlot - minX) * normX;
            const buildPoint = (it: ChartDataItem, series: ChartDataItem[]) => {
                const p = this.chartDataItemToPoint(it, series);

                return {
                    x: xPad + p.x * 2 * xPad,
                    y: p.y * normY
                };
            }

            var accumulators = new Array<{ negative: number, positive: number }>(maxCount);
            for (let series of datasource) {

                // does the series svg exist?
                let svg: SVGSVGElement;
                let grad: SVGLinearGradientElement;
                let gradInv: SVGLinearGradientElement;
                let g: SVGGElement;
                if (chartSeries.length > iter) {
                    svg = chartSeries[iter];
                    grad = svg.firstElementChild.firstElementChild as SVGLinearGradientElement;
                    gradInv = svg.firstElementChild.lastElementChild as SVGLinearGradientElement;
                    g = svg.lastElementChild as SVGGElement;
                } else {
                    svg = document.createElementNS(SVG_NS, 'svg');
                    svg.setAttribute('pacem', '');
                    chartGrid.insertAdjacentElement('afterend', svg);
                    const defs = document.createElementNS(SVG_NS, 'defs');
                    defs.appendChild(grad = this.buildLinearGradient(iter));
                    defs.appendChild(gradInv = this.buildLinearGradient(iter, true));
                    svg.appendChild(defs);
                    svg.appendChild(g = document.createElementNS(SVG_NS, 'g'));
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
                var className = 'chart-series series-fill';
                if (!Utils.isNullOrEmpty(series.className)) {
                    className += ' ' + series.className;
                }
                svg.setAttribute('class', className);
                svg.setAttribute('x', paddingYAxis.toString());
                svg.setAttribute('y', seriesY.toString());
                svg.setAttribute('width', seriesWidth.toString());
                svg.setAttribute('height', (seriesHeight + 2 * padding).toString());

                const data = series.values;

                const spinRect = (index: number) => {
                    while (index >= g.children.length) {
                        g.appendChild(document.createElementNS(SVG_NS, 'rect'));
                    }
                    const rect = g.children.item(index) as SVGRectElement;
                    rect.style.stroke = series.color;
                    const gradient = data[index].value < 0 ? gradInv : grad;
                    this.setGradientColor(gradient, series.color);
                    rect.style.fill = `url(#${gradient.id})`;
                    return rect;
                }

                // fix 0 y
                const precision = 10
                const assignVerticalCoordsCoords = (rect: SVGRectElement, pt0: Point, pt: Point, pt0Start: Point = pt0) => {

                    const y = -Math.max(pt0.y, pt.y),
                        h = Math.abs(pt.y - pt0.y);

                    const fnAssign = () => {
                        rect.setAttribute('y', y.toFixed(precision));
                        rect.setAttribute('height', h.toFixed(precision));
                    };
                    if (!rect.hasAttribute('y')) {
                        // boostrap easing animated transition
                        rect.setAttribute('y', '-' + pt0Start.y.toFixed(precision));
                        rect.setAttribute('height', '0');
                        requestAnimationFrame(fnAssign);
                    } else {
                        fnAssign();
                    }
                }

                if (!Utils.isNullOrEmpty(data)) {
                    ;
                    const pt00 = buildPoint({ value: 0, label: data[0].label }, data);
                    if (stacked) {
                        // #region STACK
                        const iHalfAvailSlot = halfAvailSlot * normX,
                            iAvailSlotAttr = (availSlot * normX).toFixed(precision);
                        for (let j = 0; j < data.length; j++) {
                            const item = data[j];

                            if (Utils.isNullOrEmpty(accumulators[j])) {
                                accumulators[j] = { positive: 0, negative: 0 };
                            }
                            const accumulator = accumulators[j];
                            let posCursor = accumulator.positive, negCursor = accumulator.negative;

                            const neg = item.value < 0,
                                y = neg ? negCursor : (posCursor + item.value),
                                y0 = neg ? (negCursor + item.value) : posCursor;
                            const pt = buildPoint({ label: item.label, value: y }, data);
                            const pt0 = buildPoint({ label: item.label, value: y0 }, data);
                            const x = pt.x - iHalfAvailSlot;
                            const rect = spinRect(j);
                            this.assignUiBehaviors(rect, series, item);
                            rect.setAttribute('x', x.toFixed(precision));
                            rect.setAttribute('width', iAvailSlotAttr);
                            assignVerticalCoordsCoords(rect, pt0, pt, pt00);

                            if (neg) {
                                accumulator.negative = y0;
                            } else {
                                accumulator.positive = y;
                            }

                        }
                        // #endregion
                    } else {
                        // #region CLUSTER
                        const iHalfAvailSlot = halfAvailSlot * normX,
                            iSlot = (iHalfAvailSlot * 2) / datasource.length, //,
                            iSlotAttr = iSlot.toFixed(precision);

                        for (let j = 0; j < data.length; j++) {
                            // looping through the series-data
                            const item = data[j];
                            const pt = buildPoint(item, data);
                            const x = pt.x - iHalfAvailSlot + iSlot * iter;
                            const rect = spinRect(j);
                            this.assignUiBehaviors(rect, series, item);
                            rect.setAttribute('x', x.toFixed(precision));
                            rect.setAttribute('width', iSlotAttr);
                            assignVerticalCoordsCoords(rect, pt00, pt);
                        }
                        // #endregion
                    }
                }

                // cleanup exceeding rects
                for (let j = g.children.length - 1; j >= data?.length || 0; j--) {
                    const rect = g.children.item(j);
                    this.disposeUiBehaviors(rect);
                    rect.remove();
                }

                // tick
                iter++;
            }

            // remove exceeding series
            this.wipeOut(chartSeries, iter);

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

            if (grid.x.length < 1 || grid.y.length <= 1) {
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

            const tick = PADDING_PIXELS * .25;

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
            const xincr = seriesWidth / (grid.x.length /*- 1 consider the extra slot */),
                yincr = gridHeight / (grid.y.length - 1);
            if (this.xAxisPosition !== 'none') {
                const paddingX = xincr * .5 + paddingYAxis;
                for (var x of grid.x) {
                    let xcoord = paddingX + j * xincr;
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