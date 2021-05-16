namespace Pacem.Components.Cms {

    function createSvgGridBox() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '1000';
        svg.setAttribute('height', '100%');
        svg.setAttribute('width', '100%');
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.setAttribute('class', 'grid-cell-wrapper');
        //svg.style.padding = '2px';
        //svg.style.boxSizing = 'border-box';
        svg.innerHTML = `<rect class="grid-cell" width="100%" height="100%"></rect>`;
        return svg;
    }

    export const GRID_COLUMNS = 12;
    const FALLBACK_COLUMNS = GRID_COLUMNS;
    const FALLBACK_ROWS = 1;
    const GRID_METADATA: Pacem.Scaffolding.TypeMetadata = {
        display: {
            icon: 'grid_on',
            name: 'Grid',
            description: 'Composition Widget that lays out child-widgets in a grid container.'
        },
        props: [
            {
                prop: 'rows', type: 'int', display: {
                    name: 'Rows', cssClass: ['cols-lg-4']
                }, validators: [
                    { type: 'required', errorMessage: '' },
                    {
                        type: 'range', errorMessage: '', params: {
                            min: 1, max: 24
                        }
                    }
                ]
            }, {
                prop: 'rowGap', type: 'int', display: {
                    //ui: 'slider',
                    name: 'Row gap', cssClass: ['cols-lg-4']
                }, validators: [
                    // { type: 'required', errorMessage: '' },
                    {
                        type: 'range', errorMessage: '', params: {
                            min: 0, max: 3, step: .25
                        }
                    }
                ]
            }, {
                prop: 'columnGap', type: 'int', display: {
                    //ui: 'slider',
                    name: 'Column gap', cssClass: ['cols-lg-4']
                }, validators: [
                    // { type: 'required', errorMessage: '' },
                    {
                        type: 'range', errorMessage: '', params: {
                            min: 0, max: 3, step: .25
                        }
                    }
                ]
            }
        ]
    };

    @CustomElement({ tagName: P + '-widget-grid' })
    export class PacemGridWidgetElement extends PacemCompositeWidgetElement {

        constructor() {
            super(buildWidgetMetadata(GRID_METADATA), FALLBACK_COLUMNS, "grid");
        }

        register(item: PacemUiWidgetElement) {
            let retval = super.register(item);
            if (retval) {

                const row = item.row || 0,
                    column = item.column || 0,
                    colspan = item.colspan || 2,
                    rowspan = item.rowspan || 1;

                let foundspot = !this._intersects(item, column, row, colspan, rowspan);
                if (foundspot) {
                    item.row = row;
                    item.column = column;
                    item.colspan = colspan;
                    item.rowspan = rowspan;
                } else {
                    if (!foundspot) {
                        // select a spot or create a new row
                        let check = (elasticOnColspan = false) => {

                            let maxColIndex = this.columns - 1;
                            if (!elasticOnColspan) {
                                maxColIndex = maxColIndex - colspan + 1;
                            }

                            for (let j = 0; j < this.rows; j++) {
                                for (let i = 0; i <= maxColIndex; i++) {
                                    if (!this._intersects(item, i, j, colspan, rowspan)) {
                                        item.column = i;
                                        item.row = j;
                                        item.colspan = Math.min(maxColIndex + 1 - i, colspan);
                                        item.rowspan = rowspan;
                                        foundspot = true;
                                        break;
                                    }
                                }
                                if (foundspot) break;
                            }
                        }
                        check();
                        if (!foundspot && colspan > 1) {

                            // find first avail slot conceding less colspan
                            check(true);
                        }
                    }

                    // okay, surrender and create a new row
                    if (!foundspot) {
                        this.rows++;
                        item.row = this.rows - 1;
                        item.column = 0;
                    }
                }
                //
                // item.behaviors.push(this._dragDrop, this._rescaler);
                item.behaviors = [this._dragDrop, this._rescaler];
                item.addEventListener(Pacem.PropertyChangeEventName, this._widgetPropertyChange, false);
            }
            //
            return retval;
        }

        unregister(item: PacemUiWidgetElement) {
            let retval = super.unregister(item);
            if (retval) {
                item.removeEventListener(Pacem.PropertyChangeEventName, this._widgetPropertyChange, false);
                const ndx = item.behaviors.indexOf(this._dragDrop);
                if (ndx >= 0)
                    item.behaviors.splice(ndx, 1);
                const ndx1 = item.behaviors.indexOf(this._rescaler);
                if (ndx1 >= 0)
                    item.behaviors.splice(ndx1, 1);
            }
            return retval;
        }

        private _widgetPropertyChange = (evt: Pacem.PropertyChangeEvent) => {
            if (evt.detail.propertyName === 'row' || evt.detail.propertyName === 'rowspan') {
                const widget = <PacemUiWidgetElement>evt.target;
                this.rows = Math.max(this.rows, widget.row + widget.rowspan);
            }
        };

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) unit: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) marginTop: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) marginBottom: number;

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) columns: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) rows: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) minRowheight: number | 'string';
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) rowheight: number | 'string';
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) rowGap: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) columnGap: number;

        private _dragDrop: Pacem.Components.PacemDragDropElement;
        private _rescaler: Pacem.Components.PacemRescaleElement;
        private _initState: { colspan: number, rowspan: number; col: number, row: number };
        private _dragDropHandler = (evt: Pacem.UI.DragDropEvent) => {
            const args = evt.detail,
                el = <PacemUiWidgetElement>args.element;
            switch (evt.type) {
                case Pacem.UI.DragDropEventType.Start:
                    this._gridBoxes.forEach(svg => { svg.style.pointerEvents = 'auto'; });
                    this._initState = {
                        colspan: el.colspan,
                        rowspan: el.rowspan,
                        col: el.column,
                        row: el.row
                    };
                    break;
                case Pacem.UI.DragDropEventType.End:
                    this._gridBoxes.forEach(svg => { svg.style.pointerEvents = 'none'; });
                    break;
                case Pacem.UI.DragDropEventType.Over:
                    var dropTarget = <SVGSVGElement>args.target;
                    var col = +dropTarget.style.gridColumnStart - 1;
                    var row = +dropTarget.style.gridRowStart - 1;
                    const farRight = col + this._initState.colspan,
                        farBottom = row + this._initState.rowspan;
                    // check overlap
                    if (!this._intersects(el, col, row, el.colspan, el.rowspan)) {

                        let fireLayoutChange = false;
                        //
                        if (farRight <= (this.columns || FALLBACK_COLUMNS)) {
                            fireLayoutChange = el.column !== col;
                            el.column = col; // + '/' + (col + this._initState.colspan);
                        }
                        if (farBottom <= (this.rows || FALLBACK_ROWS)) {
                            fireLayoutChange = fireLayoutChange || (el.row !== row);
                            el.row = row; // + '/' + (row + this._initState.rowspan);
                        }

                        if (fireLayoutChange) {
                            // attributechange should suffice
                            // this.dispatchLayoutChangeEvent();
                        }
                    }
                    break;
            };
        };

        private _resizeHandler = (evt: Pacem.UI.RescaleEvent) => {
            switch (evt.type) {
                case Pacem.UI.RescaleEventType.Start:
                    Pacem.Utils.addClass(evt.detail.element, PCSS + '-rescaling');
                    this._gridBoxes.forEach(svg => { svg.style.pointerEvents = 'auto'; });
                    break;
                case Pacem.UI.RescaleEventType.End:
                    this._gridBoxes.forEach(svg => { svg.style.pointerEvents = 'none'; });
                    Pacem.Utils.removeClass(evt.detail.element, PCSS + '-rescaling');
                    break;
                case Pacem.UI.RescaleEventType.Rescale:

                    evt.preventDefault();
                    // check pos
                    const pos = { x: evt.clientX, y: evt.clientY },
                        handle = evt.detail.handle;
                    const dropTarget = <HTMLElement | SVGElement>document.elementsFromPoint(pos.x, pos.y).find(e => this._dragDrop.dropTargets.indexOf(e) >= 0);
                    if (dropTarget) {
                        var col = +dropTarget.style.gridColumnStart;
                        var row = +dropTarget.style.gridRowStart;

                        const widget = <PacemUiWidgetElement>evt.detail.element,
                            startcol = widget.column + 1,
                            startrow = widget.row + 1;

                        const colspan = 1 + col - startcol,
                            rowspan = 1 + row - startrow;

                        if (!this._intersects(widget, widget.column, widget.row, colspan, rowspan)) {

                            let fireLayoutChange = false;
                            //
                            if (col >= startcol && handle.endsWith('right')) {
                                fireLayoutChange = widget.colspan !== colspan;
                                widget.colspan = colspan;
                            }
                            if (row >= startrow && handle.startsWith('bottom')) {
                                fireLayoutChange = fireLayoutChange || widget.rowspan !== rowspan;
                                widget.rowspan = rowspan;
                            }

                            if (fireLayoutChange) {
                                // attributechange should suffice
                                // this.dispatchLayoutChangeEvent();
                            }
                        }
                    }

                    break;
            }
        }

        private _intersects(who: PacemUiWidgetElement, col: number, row: number, colspan: number, rowspan: number) {
            for (let item of this.items) {
                let widget = <PacemUiWidgetElement>item;
                if (widget === who) {
                    continue;
                }
                if ((widget.column < (col + colspan) && (widget.column + widget.colspan) > col)
                    && (widget.row < (row + rowspan) && (widget.row + widget.rowspan) > row)
                ) {
                    return true;
                }
            }
            return false;
        }

        connectedCallback() {
            super.connectedCallback();
            Pacem.Utils.addClass(this, PCSS + '-grid');
            // drag-drop
            let dragDrop = this._dragDrop = <Pacem.Components.PacemDragDropElement>document.createElement(P + '-drag-drop');
            let floater = document.createElement('div');
            document.body.appendChild(floater);
            dragDrop.floater = floater;
            dragDrop.mode = Pacem.UI.DragDataMode.Alias;
            dragDrop.dropBehavior = Pacem.UI.DropBehavior.None;
            dragDrop.addEventListener(Pacem.UI.DragDropEventType.Start, this._dragDropHandler, false);
            dragDrop.addEventListener(Pacem.UI.DragDropEventType.Over, this._dragDropHandler, false);
            dragDrop.addEventListener(Pacem.UI.DragDropEventType.End, this._dragDropHandler, false);
            document.body.appendChild(dragDrop);
            // rescale
            let rescale = this._rescaler = <Pacem.Components.PacemRescaleElement>document.createElement(P + '-rescale');
            rescale.handles = [Pacem.UI.RescaleHandle.Right, Pacem.UI.RescaleHandle.Bottom];
            rescale.addEventListener(Pacem.UI.RescaleEventType.Start, this._resizeHandler, false);
            rescale.addEventListener(Pacem.UI.RescaleEventType.Rescale, this._resizeHandler, false);
            rescale.addEventListener(Pacem.UI.RescaleEventType.End, this._resizeHandler, false);
            document.body.appendChild(rescale);
            // editor
            // default configuration
            if (Utils.isNullOrEmpty(this.columns)) {
                this.columns = GRID_COLUMNS;
            }
            if (Utils.isNullOrEmpty(this.rows)) {
                this.rows = 1;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.adapt();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            this.adapt();
        }

        disconnectedCallback() {
            var dragDrop = this._dragDrop,
                rescale = this._rescaler;
            if (!Utils.isNull(dragDrop)) {
                dragDrop.floater.remove();
                dragDrop.removeEventListener(Pacem.UI.DragDropEventType.Start, this._dragDropHandler, false);
                dragDrop.removeEventListener(Pacem.UI.DragDropEventType.Over, this._dragDropHandler, false);
                dragDrop.removeEventListener(Pacem.UI.DragDropEventType.End, this._dragDropHandler, false);
                dragDrop.remove();
                this._dragDrop = null;
            }
            if (!Utils.isNull(rescale)) {
                rescale.removeEventListener(Pacem.UI.RescaleEventType.Start, this._resizeHandler, false);
                rescale.removeEventListener(Pacem.UI.RescaleEventType.Rescale, this._resizeHandler, false);
                rescale.removeEventListener(Pacem.UI.RescaleEventType.End, this._resizeHandler, false);
                rescale.remove();
                this._rescaler = null;
            }
            super.disconnectedCallback();
        }

        private _normalize(measure: number | string, defaultValue: number = 1): string {
            if (typeof measure === 'string') {
                return measure;
            } else if (measure == null) {
                measure = defaultValue;
            }
            return this.unitPixels(measure) + 'px';
        }

        protected unitPixels(qty: number) {
            return qty * (this.unit || 8);
        }

        @Debounce(100)
        protected adapt() {
            this.style.marginTop = this.unitPixels(this.marginTop || 0) + 'px';
            this.style.marginBottom = this.unitPixels(this.marginBottom || 0) + 'px';
            //
            this.style.gridTemplateColumns = `repeat(${(this.columns || FALLBACK_COLUMNS)}, 1fr)`;
            //this.style.gridAutoRows = `minmax(${(this.minRowheight || 24)}, ${(this.rowheight || 'auto')})`;
            let minrowheight: string = this._normalize(this.minRowheight, 3),
                rowheight: string = this._normalize(this.rowheight || 'auto');
            this.style.gridTemplateRows = `repeat(${(this.rows || FALLBACK_ROWS)}, minmax(${minrowheight}, ${rowheight}))`;
            this.style.gridRowGap = this._normalize(this.rowGap, 1);
            this.style.gridColumnGap = this._normalize(this.columnGap, 1);
            //
            this._setGridLines();
        }

        private _gridBoxes: SVGSVGElement[] = [];

        private _setGridLines() {
            var splice = 0;
            const editing = this.editing;
            if (editing) {
                const cols = this.columns || FALLBACK_COLUMNS,
                    rows = this.rows || FALLBACK_ROWS,
                    total = cols * rows;
                splice = total;
                for (let k = 0; k < total; k++) {
                    while (this._gridBoxes.length <= k) {
                        let s = createSvgGridBox();
                        this.appendChild(s);
                        this._gridBoxes.push(s);
                    }
                    let svg = this._gridBoxes[k];
                    const i = k % cols,
                        j = Math.floor(k / cols);
                    svg.style.gridColumn = (i + 1).toString();
                    svg.style.gridRow = (j + 1).toString();
                }

            }
            for (let svg of this._gridBoxes.splice(splice)) {
                svg.remove();
            }
            // behaviors to be synchronized
            if (!Utils.isNull(this._dragDrop) && !Utils.isNull(this._rescaler)) {
                this._dragDrop.disabled = this._rescaler.disabled
                    = !editing;
                this._dragDrop.dropTargets = this._gridBoxes;
            }
        }

    }

}