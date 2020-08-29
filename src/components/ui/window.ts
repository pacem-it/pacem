/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    const HANDLE_CSS = 'window-title';

    @CustomElement({
        tagName: P + '-window-area'
    })
    export class PacemWindowAreaElement extends PacemIterativeElement<PacemWindowElement>{

        validate(item: PacemWindowElement): boolean {
            return item instanceof PacemWindowElement;
        }

        private _behaviors: Behaviors.PacemBehavior[];
        private _dragDrop: PacemDragDropElement;
        private _rescale: PacemRescaleElement;
        private _zIndex = 1;

        private _startHandler = (evt: Pacem.UI.DragDropEvent | Pacem.UI.RescaleEvent) => {
            this._incrementZIndex(evt.detail.element);
            Utils.addClass(evt.detail.element, 'window-rescaling');
        }

        private _blurHandler = (evt: Pacem.UI.RescaleEvent) => {
            Utils.removeClass(evt.detail.element, 'window-rescaling');
        }

        private _focusHandler = (evt: MouseEvent) => {
            this._incrementZIndex(<HTMLElement>evt.currentTarget);
        }

        private _incrementZIndex(target: HTMLElement | SVGElement) {
            if (this._zIndex != parseInt(target.style.zIndex)) {
                target.style.zIndex = '' + (++this._zIndex);
            }
        }

        connectedCallback() {
            super.connectedCallback();

            let shell = CustomElementUtils.findAncestorShell(this);
            this._behaviors = [
                shell.appendChild(this._dragDrop = document.createElement(P + '-drag-drop') as PacemDragDropElement),
                shell.appendChild(this._rescale = document.createElement(P + '-rescale') as PacemRescaleElement)
            ];
            this._dragDrop.handleSelector = '.' + HANDLE_CSS;
            //this._dragDrop.addEventListener(Pacem.UI.DragDropEventType.Init, this._focusHandler, false);
            this._rescale.addEventListener(Pacem.UI.RescaleEventType.Start, this._startHandler, false);
            this._rescale.addEventListener(Pacem.UI.RescaleEventType.End, this._blurHandler, false);
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            // adapter (reuse)
            if (Utils.isNull(this.adapter)) {
                const adapter = this.adapter = this.appendChild(document.createElement(P + '-adapter') as PacemAdapterElement);
                Utils.addClass(adapter, 'windows-adapter');
                adapter.labelCallback = (item: PacemWindowElement, _) => {
                    return item.caption;
                };
                adapter.swipeEnabled = false;
                adapter.deselectable = true;
                adapter.initialize(this);
            }
            this.adapter.addEventListener(AdapterPageButtonRefreshEventName, this._adapterPagerCallback, false);
        }

        disconnectedCallback() {
            if (!Utils.isNull(this.adapter)) {
                this.adapter.removeEventListener(AdapterPageButtonRefreshEventName, this._adapterPagerCallback, false);
                this.adapter.remove();
                this.adapter = null;
            }

            //this._dragDrop.removeEventListener(Pacem.UI.DragDropEventType.Init, this._focusHandler, false);
            this._rescale.removeEventListener(Pacem.UI.RescaleEventType.End, this._blurHandler, false);
            this._rescale.removeEventListener(Pacem.UI.RescaleEventType.Start, this._startHandler, false);
            for (let b of this._behaviors) {
                b.remove();
            }
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'index') {
                this._syncVisibility();
            }
        }

        register(item: PacemWindowElement) {
            const retval = super.register(item);
            if (retval) {
                item.addEventListener(PropertyChangeEventName, this._itemPropertyChangeHandler, false);
                item.addEventListener('mousedown', this._focusHandler, false);
                for (let b of this._behaviors) {
                    const ndx = item.behaviors.indexOf(b);
                    if (ndx === -1) {
                        item.behaviors.push(b);
                    }
                }
            }
            return retval;
        }

        unregister(item: PacemWindowElement) {
            const retval = super.unregister(item);
            if (retval) {
                item.removeEventListener(PropertyChangeEventName, this._itemPropertyChangeHandler, false);
                item.removeEventListener('mousedown', this._focusHandler, false);
                for (let b of this._behaviors) {
                    const ndx = item.behaviors.indexOf(b);
                    if (ndx >= 0) {
                        item.behaviors.splice(ndx, 1);
                    }
                }
            }
            return retval;
        }

        private _itemPropertyChangeHandler = (evt: PropertyChangeEvent) => {
            if (evt.detail.propertyName === 'floating' && evt.detail.currentValue === false) {
                const item = evt.currentTarget as PacemWindowElement,
                    ndx = this.items.indexOf(item);
                Utils.addClass(item, 'docking-in');
                this.adapter.select(ndx);
                Utils.addAnimationEndCallback(item, (e) => {
                    Utils.removeClass(e, 'docking-in');
                }, 150);
            }
        }

        private _adapterPagerCallback = (evt: AdapterPageButtonRefreshEvent) => {
            const index = evt.detail.index,
                item = this.items[index];

            evt.detail.hide = item.hide || item.floating;
        }

        private _syncVisibility() {
            let ndx = 0;
            for (let item of this.items) {
                if (ndx === this.index) {
                    Utils.addClass(item, 'dock-open');
                } else {
                    Utils.removeClass(item, 'dock-open');
                }
                ndx++;
            }
        }
    }

    @CustomElement({
        tagName: P + '-window', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${HANDLE_CSS}">
    <${P}-text text="{{ :host.caption || 'Window' }}"></${P}-text>
</div>
<div class="window-buttons ${PCSS}-buttonset"><div class="buttonset-right">
    <${P}-button class="button" on-click=":host.minimized = !:host.minimized" icon-glyph="{{ :host.minimized ? 'maximize' : 'minimize' }}" hide="{{ !:host.floating }}"></${P}-button>
    <${P}-button class="button" on-click=":host.floating = !:host.floating" css-class="{{ {'buttonset-first': !:host.floating} }}" icon-glyph="{{ :host.floating? 'lock_open' : 'lock' }}"></${P}-button>
</div></div>
<div class="window-content"><${P}-content></${P}-content></div>`
    })
    export class PacemWindowElement extends PacemIterableElement {

        @Watch({ converter: PropertyConverters.String }) caption: string;
        @Watch({ converter: PropertyConverters.Boolean }) minimized: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) floating: boolean;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'minimized' || name === 'floating') {
                this._syncLayout();
            }

        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._syncLayout();
        }

        private _syncLayout() {
            (this.minimized ? Utils.addClass : Utils.removeClass).apply(this, [this, 'window-min']);
            (this.floating ? Utils.removeClass : Utils.addClass).apply(this, [this, 'window-dock']);
        }
    }

}