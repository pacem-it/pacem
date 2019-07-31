/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Drawing {

    @CustomElement({ tagName: P + '-'+ TAG_MIDDLE_NAME +'-rect' })
    export class PacemRectElement extends ShapeElement {

        @Watch({ converter: PropertyConverters.Number }) x: number = 0;
        @Watch({ converter: PropertyConverters.Number }) y: number = 0;
        @Watch({ converter: PropertyConverters.Number }) w: number = 100;
        @Watch({ converter: PropertyConverters.Number }) h: number = 100;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'x' || name === 'y' || name === 'w' || name === 'h') {
                this._updateData();
            }
        }

        private _updateData() {
            const x = this.x, y = this.y, w = this.w, h = this.h;
            this.data = `M ${x} ${y} h ${w} v ${h} h ${-w} z`;
        }

        getBoundingRect(): Rect {
            return { x: this.x, y: this.y, width: this.w, height: this.h };
        }

    }

}