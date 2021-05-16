/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-picture-source'
    })
    export class PacemPictureSourceElement extends PacemItemElement {

        @Watch({ emit: false, converter: PropertyConverters.String }) srcset: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) media: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) type: string;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);

            const picture = this.container;
            if (picture instanceof PacemPictureElement && ['srcset', 'media', 'type', 'disabled'].indexOf(name) >= 0) {
                picture.refreshSources();
            }
        }
    }

    @CustomElement({
        tagName: P + '-picture', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<picture class="${PCSS}-picture display-flex flex-fill">
    <img loading="lazy" />
</picture><${P}-content></${P}-content>`
    })
    export class PacemPictureElement extends PacemItemsContainerElement<PacemPictureSourceElement>{

        constructor() {
            super('img');
        }

        validate(item: any): boolean {
            return item instanceof PacemPictureSourceElement;
        }

        @ViewChild('picture') private _picture: HTMLPictureElement;
        @ViewChild('img') private _img: HTMLImageElement;

        @Watch({ emit: false, converter: PropertyConverters.String }) src: string;
        @Watch({ converter: PropertyConverters.String }) currentSrc: string;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'src':
                    this._setSource();
                    break;
                case 'items':
                    this._setSources();
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._img.addEventListener('load', this._updateCurrentSrcHandler, false);
            this._setSource();
            this._setSources();
        }

        disconnectedCallback() {
            const img = this._img;
            if (!Utils.isNull(img)) {
                img.removeEventListener('load', this._updateCurrentSrcHandler, false);
            }
            super.disconnectedCallback();
        }

        private _updateCurrentSrcHandler = (evt) => {
            this.currentSrc = this._img.currentSrc;
        };

        refreshSources() {
            this._setSources();
        }

        private _setSources(items = this.items) {
            const picture = this._picture,
                img = this._img;
            if (!Utils.isNull(picture) && !Utils.isNull(img)) {
                const sources = picture.querySelectorAll('source'),
                    itemCount = items?.length ?? 0;

                // populate
                for (let i = 0; i < itemCount; i++) {
                    const item = this.items[i];
                    let source: HTMLSourceElement;
                    if (sources.length <= i) {
                        picture.insertBefore(source = document.createElement('source'), img);
                    } else {
                        source = sources.item(i);
                    }

                    if (item.disabled || Utils.isNullOrEmpty(item.srcset)) {
                        source.removeAttribute('srcset');
                    } else {
                        source.srcset = item.srcset;
                    }

                    if (Utils.isNullOrEmpty(item.media)) {
                        source.removeAttribute('media');
                    } else {
                        source.media = item.media;
                    }

                    if (Utils.isNullOrEmpty(item.type)) {
                        source.removeAttribute('type');
                    } else {
                        source.type = item.type;
                    }
                }

                // cleanup
                for (let i = sources.length - 1; i >= itemCount; i--) {
                    let source = sources.item(i);
                    source.remove();
                }
            }
        }

        private _setSource(src = this.src) {
            const img = this._img;
            if (!Utils.isNull(img)) {
                img.src = src;
            }
        }
    }
}