/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    export enum BinderAnchor {
        Auto = 'auto',
        Left = 'left',
        Top = 'top',
        Right = 'right',
        Bottom = 'bottom',
        Center = 'center'
    }

    const UI_BINDERS: string = 'pacem:components:ui:binders';

    class BindersCollector {

        constructor(element: Element) {
            const watcher = this.resize = new PacemResizeElement();
            watcher.target = element;
            watcher.watchPosition = true;
            document.body.appendChild(watcher);
        }

        resize: PacemResizeElement;
        binders: PacemBinderElement[] = [];

        dispose() {
            this.resize.remove();
        }

        fire = (evt: ResizeEvent) => {
            for (var binder of this.binders) {
                binder.refresh(this.resize.target, evt.detail);
            }
        }

    }

    class BinderUtils {

        static register(element: Element, binder: PacemBinderElement) {
            var collector: BindersCollector = CustomElementUtils.getAttachedPropertyValue(element, UI_BINDERS);
            if (Utils.isNull(collector)) {
                collector = new BindersCollector(element);
                CustomElementUtils.setAttachedPropertyValue(element, UI_BINDERS, collector);
            }
            if (collector.binders.indexOf(binder) == -1) {
                if (collector.binders.length === 0) {
                    collector.resize.addEventListener(Pacem.Components.ResizeEventName, collector.fire, false);
                } //else {
                binder.refresh(element, collector.resize.currentSize);
                //}
                collector.binders.push(binder);
            }
        }

        static unregister(element: Element, binder: PacemBinderElement) {
            var collector: BindersCollector = CustomElementUtils.getAttachedPropertyValue(element, UI_BINDERS),
                ndx: number;
            if (!Utils.isNull(collector) && (ndx = collector.binders.indexOf(binder)) > -1) {
                collector.binders.splice(ndx, 1);
                if (collector.binders.length === 0) {
                    collector.resize.removeEventListener(Pacem.Components.ResizeEventName, collector.fire, false);
                    collector.dispose();
                    CustomElementUtils.deleteAttachedPropertyValue(element, UI_BINDERS);
                }
            }
        }

    }

    export declare type PacemBinderTarget = Element | Point;

    const ElementOrPointPropertyConverter: PropertyConverter = {
        convert: (attr: string) => {
            let el = document.querySelector(attr);
            return el || JSON.parse(attr);
        }
    };

    @CustomElement({ tagName: 'pacem-binder' })
    export class PacemBinderElement extends PacemElement implements OnConnected, OnDisconnected, OnPropertyChanged {

        @Watch({ emit: false, converter: ElementOrPointPropertyConverter }) from: PacemBinderTarget;
        @Watch({ emit: false, converter: ElementOrPointPropertyConverter }) to: PacemBinderTarget;
        @Watch({ emit: false, converter: PropertyConverters.String }) fromAnchor: BinderAnchor;
        @Watch({ emit: false, converter: PropertyConverters.String }) toAnchor: BinderAnchor;
        @Watch({ emit: false, converter: PropertyConverters.String }) color: string;

        connectedCallback() {
            super.connectedCallback();
            this._ensurePath();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (this.from instanceof Element)
                BinderUtils.register(this.from, this);
            if (this.to instanceof Element)
                BinderUtils.register(this.to, this);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'from':
                case 'to':
                    if (old instanceof Element)
                        BinderUtils.unregister(old, this);
                    if (val instanceof Element) {
                        // `BinderUtils.register` eventually calls `.refresh`
                        BinderUtils.register(val, this);
                    } else
                        this.refresh(val);
                    break;
                case 'fromAnchor':
                    this.refresh(this.from);
                    break;
                case 'toAnchor':
                    this.refresh(this.to);
                    break;
                case 'cssClass':
                    if (!Utils.isNull(this._svg)) {
                        this._svg.setAttribute('class', 'pacem-binder ' + this.className);
                        //Utils.removeClass(this._svg, 'pacem-binder ' + this._svg.className);
                        //Utils.addClass(this._svg, );
                    }
                    break;
            }
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._path)) {
                this._svg.remove();
                this._path = undefined;
            }
            if (this.from instanceof Element)
                BinderUtils.unregister(this.from, this);
            if (this.to instanceof Element)
                BinderUtils.unregister(this.to, this);
            super.disconnectedCallback();
        }

        private _ensurePath() {
            if (Utils.isNull(this._path)) {

                let svg = this._svg = <SVGSVGElement>document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.style.position = 'absolute';
                Utils.addClass(svg, 'pacem-binder ' + this.className);
                svg.style.top = '0';
                svg.style.left = '0';
                svg.style.overflow = 'hidden';
                svg.style.pointerEvents = 'none';

                const path = this._path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('fill', 'none');

                svg.appendChild(path);
                document.body.appendChild(svg);
            }
        }

        private _path: SVGPathElement;
        // TODO: singleton-ize SVGSVGElement.
        private _svg: SVGSVGElement;
        private _state: { [name: string]: { size: ResizeEventArgs, anchor: BinderAnchor } } = {};

        private _computeAnchorPoints(target: ResizeEventArgs, anchor: BinderAnchor, ref: ResizeEventArgs, refAnchor: BinderAnchor): Point[] {
            var p1: Point, p2: Point, c1: Point, c2: Point;

            const top = target.top,
                left = target.left,
                w = target.width,
                h = target.height,
                w2 = w / 2,
                h2 = h / 2;
            const r_top = ref.top,
                r_left = ref.left,
                r_w = ref.width,
                r_h = ref.height,
                r_w2 = r_w / 2,
                r_h2 = r_h / 2;

            const p1_center: Point = { x: left + w2, y: top + h2 };
            const p2_center: Point = { x: r_left + r_w2, y: r_top + r_h2 };
            const p1_top: Point = { x: left + w2, y: top };
            const p1_bottom: Point = { x: left + w2, y: top + h };
            const p1_left: Point = { x: left, y: top + h2 };
            const p1_right: Point = { x: left + w, y: top + h2 };
            const p2_top: Point = { x: r_left + r_w2, y: r_top };
            const p2_bottom: Point = { x: r_left + r_w2, y: r_top + r_h };
            const p2_left: Point = { x: r_left, y: r_top + r_h2 };
            const p2_right: Point = { x: r_left + r_w, y: r_top + r_h2 };

            const points = {
                'p1_top': p1_top,
                'p1_bottom': p1_bottom,
                'p1_left': p1_left,
                'p1_right': p1_right,

                'p2_top': p2_top,
                'p2_bottom': p2_bottom,
                'p2_left': p2_left,
                'p2_right': p2_right,
            };

            var distance_memoizer: { [key: string]: number } = {};

            function getDistance(suffix1, suffix2) {
                const key = suffix1 + '_' + suffix2;
                return distance_memoizer[key] = distance_memoizer[key] || Geom.distance(points['p1_' + suffix1], points['p2_' + suffix2]);
            }

            if (anchor == BinderAnchor.Auto || refAnchor == BinderAnchor.Auto) {

                //if (anchor == BinderAnchor.Auto && refAnchor == BinderAnchor.Auto) {
                // algorithm for finding the closest edges (1 atan + 4 distances)
                // 1. compute atan of the segment joining the two centers
                const slope = Geom.slopeDeg({ x: p1_center.x, y: -p1_center.y }, { x: p2_center.x, y: -p2_center.y });

                switch (slope) {
                    case 0:
                        if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Right;
                        if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Left;
                        break;
                    case 90:
                        if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Top;
                        if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Bottom;
                        break;
                    case 180:
                        if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Left;
                        if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Right;
                        break;
                    case -90:
                        if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Bottom;
                        if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Top;
                        break;
                    default:
                        // 2. compute distances combining the 4 points (compare 4 distances)
                        if (slope < 90 && slope > 0) {
                            // right | top vs left | bottom
                            let top_2_left = getDistance('top', 'left'),
                                right_2_left = getDistance('right', 'left'),
                                right_2_bottom = getDistance('right', 'bottom'),
                                top_2_bottom = getDistance('top', 'bottom')
                                ;
                            var d = Math.min(top_2_left, right_2_left, right_2_bottom, top_2_bottom);
                            switch (d) {
                                case top_2_left:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Top;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Left;
                                    break;
                                case top_2_bottom:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Top;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Bottom;
                                    break;
                                case right_2_bottom:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Right;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Bottom;
                                    break;
                                default:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Right;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Left;
                                    break;
                            }
                        } else if (slope < 180 && slope > 90) {
                            // left | top vs right | bottom
                            let top_2_right = getDistance('top', 'right'),
                                left_2_right = getDistance('left', 'right'),
                                left_2_bottom = getDistance('left', 'bottom'),
                                top_2_bottom = getDistance('top', 'bottom')
                                ;
                            var d = Math.min(top_2_right, left_2_right, left_2_bottom, top_2_bottom);
                            switch (d) {
                                case top_2_right:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Top;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Right;
                                    break;
                                case left_2_right:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Left;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Right;
                                    break;
                                case left_2_bottom:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Left;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Bottom;
                                    break;
                                default:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Top;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Bottom;
                                    break;
                            }
                        } else if (slope < -90) {
                            // left | bottom vs right | top
                            let bottom_2_right = getDistance('bottom', 'right'),
                                left_2_right = getDistance('left', 'right'),
                                left_2_top = getDistance('left', 'top'),
                                bottom_2_top = getDistance('bottom', 'top')
                                ;
                            var d = Math.min(bottom_2_right, left_2_right, left_2_top, bottom_2_top);
                            switch (d) {
                                case bottom_2_right:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Bottom;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Right;
                                    break;
                                case left_2_right:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Left;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Right;
                                    break;
                                case left_2_top:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Left;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Top;
                                    break;
                                default:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Bottom;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Top;
                                    break;
                            }
                        } else {
                            // right | bottom vs left | top
                            let bottom_2_left = getDistance('bottom', 'left'),
                                right_2_left = getDistance('right', 'left'),
                                right_2_top = getDistance('right', 'top'),
                                bottom_2_top = getDistance('bottom', 'top')
                                ;
                            var d = Math.min(bottom_2_left, right_2_left, right_2_top, bottom_2_top);
                            switch (d) {
                                case bottom_2_left:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Bottom;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Left;
                                    break;
                                case right_2_left:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Right;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Left;
                                    break;
                                case right_2_top:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Right;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Top;
                                    break;
                                default:
                                    if (anchor == BinderAnchor.Auto) anchor = BinderAnchor.Bottom;
                                    if (refAnchor == BinderAnchor.Auto) refAnchor = BinderAnchor.Top;
                                    break;
                            }
                        }
                        break;
                }

                //}

            }
            const f = 1.0;
            switch (anchor) {
                case BinderAnchor.Bottom:
                    p1 = p1_bottom;
                    c1 = { x: p1.x, y: p1.y + Math.abs(f * (p1_bottom.y - p1_center.y)) };
                    break;
                case BinderAnchor.Center:
                    p1 = { x: left + w2, y: top + h2 };
                    c1 = p1;
                    break;
                case BinderAnchor.Left:
                    p1 = p1_left;
                    c1 = { x: p1.x - Math.abs(f * (p1_center.x - p1_left.x)), y: p1.y };
                    break;
                case BinderAnchor.Right:
                    p1 = p1_right;
                    c1 = { x: p1.x + Math.abs(f * (p1_right.x - p1_center.x)), y: p1.y };
                    break;
                case BinderAnchor.Top:
                    p1 = p1_top;
                    c1 = { x: p1.x, y: p1.y - Math.abs(f * (p1_top.y - p1_center.y)) };
                    break;
            }
            switch (refAnchor) {
                case BinderAnchor.Bottom:
                    p2 = p2_bottom;
                    c2 = { x: p2.x, y: p2.y + Math.abs(f * (p2_bottom.y - p2_center.y)) };
                    break;
                case BinderAnchor.Center:
                    p2 = { x: r_left + r_w2, y: r_top + r_h2 };
                    c2 = p2;
                    break;
                case BinderAnchor.Left:
                    p2 = p2_left;
                    c2 = { x: p2.x - Math.abs(f * (p2_center.x - p2_left.x)), y: p2.y };
                    break;
                case BinderAnchor.Right:
                    p2 = p2_right;
                    c2 = { x: p2.x + Math.abs(f * (p2_right.x - p2_center.x)), y: p2.y };
                    break;
                case BinderAnchor.Top:
                    p2 = p2_top;
                    c2 = { x: p2.x, y: p2.y - Math.abs(f * (p2_top.y - p2_center.y)) };
                    break;
            }

            return [p1, c1, p2, c2];
        }

        refresh(element: PacemBinderTarget, args?: ResizeEventArgs) {
            var path: SVGPathElement;
            if (Utils.isNull(element) || Utils.isNull(path = this._path))
                return;

            const draw = !Utils.isNull(this.from) && !Utils.isNull(this.to);
            const leave = Utils.isNull(this.from) && Utils.isNull(this.to)

            if (this.disabled || !draw) {
                path.removeAttribute('d');
                if (leave)
                    return;
            }

            // compute anchor points
            const key: string = element === this.from ? 'from' : 'to';
            var anchor = (key === 'from' ? this.fromAnchor : this.toAnchor) || BinderAnchor.Auto;

            if (Utils.isNull(args)) {
                if (!(element instanceof Element)) {
                    args = { height: 0, width: 0, left: element.x, top: element.y };
                    anchor = BinderAnchor.Center;
                } else if (key in this._state)
                    args = this._state[key].size;

            }

            if (Utils.isNull(args))
                return;

            this._state[key] = { size: args, anchor: anchor };

            if (draw)
                this._draw();
        }

        //@Debounce()
        private _draw() {
            var state1 = this._state['from'],
                state2 = this._state['to'],
                svg = this._svg,
                path = this._path;

            if (Utils.isNull(path) || Utils.isNull(state1) || Utils.isNull(state2))
                return;

            const points = this._computeAnchorPoints(state1.size, state1.anchor, state2.size, state2.anchor),
                p0 = points[0],
                c0 = points[1],
                p1 = points[2],
                c1 = points[3];

            const x0 = p0.x;
            const y0 = p0.y;
            const cx0 = c0.x;
            const cy0 = c0.y;
            const x1 = p1.x;
            const y1 = p1.y;
            const cx1 = c1.x;
            const cy1 = c1.y;

            const dStart = `M${x0 - 2},${y0 - 2} h4 v4 h-4 z`;
            const dEnd = `M${x1 - 2},${y1 - 2} h4 v4 h-4 z`;
            path.setAttribute('d', dStart + `M${x0},${y0} C${cx0},${cy0} ${cx1},${cy1} ${x1},${y1}` + dEnd);
            if (!Utils.isNullOrEmpty(this.color))
                path.style.stroke = this.color;

            svg.setAttribute('width', document.body.scrollWidth.toString());
            svg.setAttribute('height', document.body.scrollHeight.toString());
        }

    }

}