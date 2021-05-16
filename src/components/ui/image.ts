/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-img'
    })
    export class PacemImageElement extends PacemElement {

        constructor() {
            super('img');
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) adapt: 'cover' | 'contain' | 'auto';
        @Watch({ emit: false, converter: PropertyConverters.String }) src: string;
        @Watch({ converter: PropertyConverters.Json }) size: { width: number, height: number, weight?: number };
        @Watch({ converter: PropertyConverters.Boolean }) loading: boolean;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'src':
                case 'disabled':
                    this._setSource();
                    break;
                case 'adapt':
                    this._setLayout();
                    break;
                case 'loading':
                    (!val ? Utils.addClass : Utils.removeClass)(this, 'img-ready');
                    break;
            }
        }

        private _setLayout() {
            const bgsize = this.adapt || 'auto';
            this.style.backgroundSize = bgsize;
            const adapt = bgsize === 'auto', size = this.size || { width: 0, height: 0 },
                w = size.width,
                h = size.height;
            if (adapt) {
                this.style.width = w > 0 ? `${w}px` : '';
                this.style.height = h > 0 ? `${h}px` : '';
            }
        }

        private _setSource() {
            var _me = this, src;
            if (_me.disabled) {
                return;
            }
            //
            _me.style.backgroundImage = '';
            if (!Utils.isNullOrEmpty(src = _me.src)) {
                this.loading = true;
                Utils.loadImage(src).then(img => {
                    let weight: number, entries: any[], entry: any;
                    if (window.performance
                        && (entries = performance.getEntriesByName(img.src))
                        && (entry = entries[0])) {
                        weight = entry.decodedBodySize;
                    }
                    _me.size = {
                        width: img.width,
                        height: img.height,
                        weight: weight
                    };
                    _me._setLayout();
                    this.loading = false;
                    _me.style.backgroundImage = `url("${img.src}")`;
                }, _ => {
                    // 404, whatever...
                    this.loading = false;
                });
            }
        }
    }
}