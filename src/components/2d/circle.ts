/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Drawing {

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-circle' })
    export class PacemCircleElement extends ShapeElement {

        @Watch({ converter: PropertyConverters.Json }) center: Point;
        @Watch({ converter: PropertyConverters.Number }) radius: number;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'center':
                    case 'radius':
                        this.data = this.getPathData();
                        break;
                }
            }
        }

        protected getPathData(): string {
            const r = this.radius, c = this.center;
            if (!Utils.isNull(c) && !Utils.isNull(r)) {
                return PacemCircleElement.getPathData(c, r);
            }
            return null;
        }

        get boundingRect(): Rect {
            var c = this.center, r = this.radius, d = 2 * r;
            return { x: c.x - r, y: c.y - r, width: d, height: d };
        }

        static getPathData(c: Point = { x: NaN, y: NaN }, r: number = NaN) {
            const d = 2 * r,
                cx = c.x, cy = c.y;
            return `M ${cx} ${cy} m ${-r}, 0 a ${r},${r} 0 1,1 ${d},0 a ${r},${r} 0 1,1 ${-d},0`;
        }
    }

}