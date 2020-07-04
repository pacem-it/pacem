/// <reference path="../../index.d.ts" />
/// <reference path="../../dist/js/pacem-2d.d.ts" />
namespace Pacem.Components.Js {

    const PALETTE = [() => Utils.Css.getVariableValue('--color-default'),
        '#999', '#808000', '#80006e', '#d69d73', '#308978', '#429cd6'];

    type Vertex = {
        x: number,
        y: number,
        timestamp: Date | string | number
    };

    type Class = {
        name: string,
        type: 'ExternalBorder' | 'InternalBorder' | 'Default',
        index: number,
        vertices: Vertex[]
    }

    type Slice = {
        name: string,
        classes: Class[]
    };

    export interface Border extends Pacem.Drawing.Shape {
        readonly data: [Vertex, Vertex];
        readonly index: number;
        readonly parent: Pacem.Drawing.Drawable;
        readonly class: Class;
    }

    interface Neuron extends Pacem.Drawing.Shape {
        readonly data: Vertex;
        readonly index: number;
        center: Point,
        readonly parent: { items: Pacem.Drawing.Drawable[] }
    }

    const balloons = new WeakMap<Pacem.Components.UI.PacemBalloonElement, number>();

    function isBorderSegment(item: Pacem.Drawing.Drawable): item is Border {
        return Pacem.Drawing.isShape(item) && 'data' in item && Utils.isArray(item['data']);
    }

    function isNeuron(item: Pacem.Drawing.Drawable): item is Neuron {
        return Pacem.Drawing.isShape(item) && 'parent' in item && Utils.isArray(item['parent']['items']);
    }

    function sliceClassColor(cls: Class) {
        var clr = PALETTE[cls.index % PALETTE.length];
        if (typeof clr === 'function') {
            clr = clr();
        }
        return clr;
    }

    function showSplitHint(item: Border, setup: boolean) {
        const p1 = item.data[0],
            p2 = item.data[1];
        if (setup) {
            item.stroke = Utils.Css.getVariableValue('--color-accent');
            const midpoint = {
                x: .5 * (p1.x + p2.x), y: .5 * (p1.y + p2.y)
            }, circleShadowData = Pacem.Components.Drawing.PacemCircleElement.getPathData(midpoint, .25);
            item.pathData = `M${p1.x},${p1.y} L${p2.x},${p2.y} ${circleShadowData}`;
        } else {
            item.stroke = sliceClassColor(item.class);
            item.pathData = `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
        }
        item.stage.draw(item);
    }

    function neuronTooltip(balloon: Pacem.Components.UI.PacemBalloonElement, coords?: Point | false) {
        if (balloons.has(balloon)) {
            const handle = balloons.get(balloon);
            window.clearTimeout(handle);
        }
        if (coords) {
            balloon.target = coords;
            balloon.popup();
        } else {
            const handle = window.setTimeout(() => balloon.popout(), 500);
            balloons.set(balloon, handle);
        }
    }

    class DemoTransformers {

        @Transformer()
        static drawifyBrainSlice(slice: Slice, stage: Pacem.Drawing.Stage): Pacem.Drawing.Drawable[] {
            const drawables: Pacem.Drawing.Drawable[] = [];
            let j = 0;
            for (let cls of slice.classes || []) {
                const isBorder = cls.index === 0;
                const drawable: Pacem.Drawing.Drawable & { items: Pacem.Drawing.Drawable[] } = { stage: stage, items: [] };
                var color: string | (() => string) = PALETTE[j % PALETTE.length];
                if (typeof color === 'function') {
                    color = color();
                }
                let k = 0;
                for (let vertex of cls.vertices || []) {

                    if (isBorder && cls.vertices.length > k + 1) {
                        // add segment
                        const p1 = vertex, p2 = cls.vertices[k + 1];
                        const segment: Border = {
                            fill: 'none', stroke: color, stage: stage,
                            lineWidth: .05, opacity: .333,
                            pathData: `M${p1.x},${p1.y} L${p2.x},${p2.y}`,

                            data: [p1, p2],
                            index: k, parent: drawable, class: cls
                        }
                        drawable.items.push(segment);
                    }

                    const path: Neuron = {
                        fill: color,
                        lineWidth: 0, opacity: .5, pathData: Pacem.Components.Drawing.PacemCircleElement.getPathData({ x: vertex.x, y: vertex.y }, isBorder ? .25 : .1),
                        stage: stage, draggable: isBorder,

                        // extra-shape (neuron)
                        data: vertex,
                        index: drawable.items.length, parent: drawable, center: vertex
                    };
                    drawable.items.push(path);
                    k++;
                }

                drawables.push(drawable);
                j++;
            }
            return drawables;
        }

        @Transformer()
        static trayBrainBorder(neuron: Neuron, offset: Point, establish: boolean) {
            const ndx = neuron.index;
            const border = neuron.parent;
            const stage = neuron.stage;
            const center = Point.add(offset, neuron.center);
            if (ndx >= 3) {
                const lhs = border.items[ndx - 3];
                if (Pacem.Drawing.isShape(lhs)) {
                    const lPathData = lhs.pathData.split(' ');
                    lhs.pathData = lPathData[0] + ` L${center.x},${center.y}`;
                    stage.draw(lhs);
                }
            }
            if (establish) {
                neuron.pathData = Pacem.Components.Drawing.PacemCircleElement.getPathData(center, .25);
                neuron.center = center;
                stage.draw(neuron);
            }
            if (ndx >= 1) {
                const rhs = border.items[ndx - 1];
                if (Pacem.Drawing.isShape(rhs)) {
                    const rPathData = rhs.pathData.split(' ');
                    rhs.pathData = `M${center.x},${center.y} ` + rPathData[1];
                    stage.draw(rhs);
                }
            }

        }

        @Transformer()
        static handleItemOver(evt: Pacem.Drawing.DrawableEvent, balloon?: Pacem.Components.UI.PacemBalloonElement) {
            if (isBorderSegment(evt.detail)) {
                if (evt.ctrlKey) {
                    showSplitHint(evt.detail, true);
                } else {
                    showSplitHint(evt.detail, false);
                }
            } else if (isNeuron(evt.detail)) {
                if (evt.shiftKey) {
                    neuronTooltip(balloon, { x: evt.pageX, y: evt.pageY });
                } else {
                    neuronTooltip(balloon, false);
                }
            }
        }

        @Transformer()
        static handleItemOut(evt: Pacem.Drawing.DrawableEvent, balloon?: Pacem.Components.UI.PacemBalloonElement) {
            if (isBorderSegment(evt.detail)) {
                showSplitHint(evt.detail, false);
            } else if (isNeuron(evt.detail)) {
                neuronTooltip(balloon, false);
            }
        }

        @Transformer()
        static handleItemClick(evt: Pacem.Drawing.DrawableEvent, repo?: Pacem.Components.PacemDataElement) {
            if (isBorderSegment(evt.detail) && evt.ctrlKey) {
                const slice: Slice = repo.model,
                    border = evt.detail, cls = border.class,
                    clsIndex = slice.classes.indexOf(cls);
                if (clsIndex === -1) {
                    throw 'WTF!?...';
                }

                const
                    p1 = border.data[0],
                    p2 = border.data[1],
                    index = border.index + 1;
                cls.vertices.splice(index, 0, { timestamp: new Date(), x: .5 * (p1.x + p2.x), y: .5 * (p1.y + p2.y) });
                repo.model = Utils.clone(repo.model);
            }
        }
    }
}