/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Drawing {

    @CustomElement({ tagName: P + '-'+ TAG_MIDDLE_NAME, shadow: Defaults.USE_SHADOW_ROOT, template: `<${P}-resize target="{{ ::_stage }}" on-${ ResizeEventName }=":host._resize($event)"></${P}-resize><div class="${PCSS}-2d"></div><pacem-content></pacem-content>` })
    export class Pacem2DElement extends PacemItemsContainerElement<DrawableElement> implements Stage {

        get stage(): HTMLElement {
            return this._stage;
        }

        validate(item: DrawableElement): boolean {
            return item instanceof DrawableElement;
        }

        @Watch({ converter: PropertyConverters.Element }) adapter: Pacem2DAdapterElement;
        @Watch({ converter: PropertyConverters.Boolean }) interactive: boolean = false;

        @ViewChild('.'+ PCSS + '-2d') private _stage: HTMLElement;

        @Throttle(true)
        draw() {
            const adapter = this.adapter;
            if (!this.disabled && !Utils.isNull(adapter)) {
                let cancelable = new CustomEvent('predraw', { cancelable: true });
                this.dispatchEvent(cancelable);
                if (!cancelable.defaultPrevented) {
                    adapter.draw(this);
                    this.dispatchEvent(new CustomEvent('draw'));
                }
            }
            // requestAnimationFrame(() => this.draw());
        }

        private _size: Size;
        private _resize = (evt: ResizeEvent) => {
            const size = this._size = { width: evt.detail.width, height: evt.detail.height };
            this.adapter.invalidateSize(this, size);
            this.draw();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (!Utils.isNull(this.adapter)) {
                this.adapter.initialize(this);
                this.adapter.invalidateSize(this, this._size);
            }
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'adapter') {
                if (!Utils.isNull(old)) {
                    (<Pacem2DAdapterElement>val).dispose(this);
                }
                if (!Utils.isNull(val)) {
                    (<Pacem2DAdapterElement>val).initialize(this);
                }
            }
        }

        disconnectedCallback() {
            if (!Utils.isNull(this.adapter)) {
                this.adapter.dispose(this);
            }
            super.disconnectedCallback();
        }

    }

}