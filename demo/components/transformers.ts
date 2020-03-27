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

    interface Neuron extends Pacem.Drawing.Shape {
        readonly index: number;
        center: Point,
        readonly parent: { items: Pacem.Drawing.Drawable[] }
    }

    const balloons = new WeakMap<Pacem.Components.UI.PacemBalloonElement, number>();

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
                        const segment: Pacem.Drawing.Shape = {
                            fill: 'none', stroke: color, stage: stage,
                            lineWidth: .05, opacity: .333,
                            pathData: `M${p1.x},${p1.y} L${p2.x},${p2.y}`
                        }
                        drawable.items.push(segment);
                    }

                    const path: Neuron = {
                        fill: color,
                        lineWidth: 0, opacity: .5, pathData: Pacem.Components.Drawing.PacemCircleElement.getPathData({ x: vertex.x, y: vertex.y }, isBorder ? .25 : .1),
                        stage: stage, draggable: isBorder,

                        // extra-shape (neuron)
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
            const center = Geom.add(offset, neuron.center);
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
        static neuronTooltip(balloon: Pacem.Components.UI.PacemBalloonElement, coords?: Point | false) {
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
    }
}