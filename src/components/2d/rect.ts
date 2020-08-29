/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Drawing {

    @CustomElement({ tagName: P + '-' + TAG_MIDDLE_NAME + '-rect' })
    export class PacemRectElement extends ShapeElement {

        @Watch({ emit: false, converter: PropertyConverters.Number }) x: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) y: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) w: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) h: number;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first && (name === 'x' || name === 'y' || name === 'w' || name === 'h')) {
                this.data = this.getPathData();
            }
        }

        protected getPathData() {
            const x = this.x, y = this.y, w = this.w, h = this.h;
            if (!Utils.isNull(x) && !Utils.isNull(y) && !Utils.isNull(w) && !Utils.isNull(h)) {
                return PacemRectElement.getPathData(x, y, w, h);
            }
            return null;
        }

        get boundingRect(): Rect {
            return { x: this.x, y: this.y, width: this.w, height: this.h };
        }

        static getPathData(x: number = NaN, y: number = NaN, w: number = NaN, h: number = NaN) {
            return `M ${x} ${y} h ${w} v ${h} h ${-w} z`;
        }

    }

}