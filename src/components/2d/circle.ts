/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Drawing {

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-circle' })
    export class PacemCircleElement extends ShapeElement {

        @Watch({ converter: PropertyConverters.Json }) center: Point = { x: 50, y: 50 };
        @Watch({ converter: PropertyConverters.Number }) radius: number = 50;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'center' || name === 'radius') {
                this._updateData();
            }
        }

        private _updateData() {
            const r = this.radius, d = 2 * r,
                cx = this.center.x, cy = this.center.y;
            this.data = `M ${cx} ${cy} m ${-r}, 0 a ${r},${r} 0 1,1 ${d},0 a ${r},${r} 0 1,1 ${-d},0`;
        }

        getBoundingRect(): Rect {
            var c = this.center, r = this.radius, d = 2 * r;
            return { x: c.x - r, y: c.y - r, width: d, height: d };
        }

    }

}