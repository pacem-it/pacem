/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="adapter.ts" />
namespace Pacem.Components.UI {

    export abstract class PacemAdaptedIterativeElement<TItem> extends PacemElement {

        protected abstract get adapter(): PacemAdapterElement;

        @Watch({ converter: PropertyConverters.Number }) index: number = 0;
        @Watch() datasource: TItem[];

        protected isCloseTo(ndx: number, focusndx: number): boolean {
            if (Utils.isNull(this.datasource) || this.datasource.length == 0)
                return false;
            return /*this.adapter.isClose(ndx) ||*/ this._isCloseToCore(ndx, focusndx, this.datasource.length);
        }

        protected isPrevious(ndx: number, focusndx: number): boolean {
            if (Utils.isNull(this.datasource) || this.datasource.length == 0)
                return false;
            return /*this.adapter.isPrevious(ndx) ||*/ this._isPreviousCore(ndx, focusndx, this.datasource.length);
        }

        protected isNext(ndx: number, focusndx: number): boolean {
            if (Utils.isNull(this.datasource) || this.datasource.length == 0)
                return false;
            return /*this.adapter.isNext(ndx) ||*/ this._isNextCore(ndx, focusndx, this.datasource.length);
        }

        private _isNextCore(ndx: number, focusndx: number, count: number) {
            return ((focusndx + 1) % count) === ndx;
        }

        private _isPreviousCore(ndx: number, focusndx: number, count: number) {
            return ((focusndx - 1 + count) % count) === ndx;
        }

        private _isCloseToCore(ndx: number, focusndx: number, count: number) {
            return (((focusndx + count) % count) == ((ndx + count) % count))
            || this._isNextCore(ndx, focusndx, count) || this._isPreviousCore(ndx, focusndx, count);
        }

    }

}