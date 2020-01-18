/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-toc', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${ P }-scroll-aware on-${ScrollEventName}=":host._onScroll($event)" url="{{ :host.url }}"></${ P }-scroll-aware>
<${ P }-repeater><nav class="${PCSS}-toc"><template>
    <${ P }-a on-click=":host._startScrollTo(^item, $event)" css-class="{{ {'toc-focus': ^item.focus} }}" href="{{ ^item.url }}"><${ P }-text text="{{ ^item.label }}"></${ P }-text></${ P }-a>
</template></nav></${ P }-repeater>`
    })
    export class PacemTocElement extends PacemElement {

        constructor(private _tweener = new Pacem.Animations.TweenService()) {
            super();
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) selector: string;
        @Watch({ emit: false, converter: PropertyConverters.Number }) offset: number;
        @Watch({ emit: false, converter: PropertyConverters.Element }) target: HTMLElement;

        @ViewChild(P + '-repeater') private _repeater: PacemRepeaterElement;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            // url
            switch (name) {
                case 'target':
                    if (!Utils.isNull(this._observer))
                        this._observe();
                    break;
                case 'selector':
                    this.refresh();
                    break;
            }
        }

        connectedCallback() {
            super.connectedCallback();
            window.addEventListener('hashchange', this._hashChange, false);
        }

        disconnectedCallback() {
            window.removeEventListener('hashchange', this._hashChange, false);
            if (!Utils.isNull(this._observer))
                this._observer.disconnect();
            super.disconnectedCallback();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._observer = new MutationObserver((e) => { this.refresh(); });
            this._observe();
        }

        @Debounce(100)
        private _onScroll(evt: ScrollEvent) {
            this._update(Utils.scrollTop);
        }

        private _observer: MutationObserver;
        private _items: { dom: HTMLElement, focus?: boolean }[] = [];

        private _observe() {
            this._observer.observe(this.target || document.body, { subtree: true, childList: true });
        }

        private _scrollToSelf = (evt: Event) => {
            this._scrollTo('#' + (<Element>evt.target).id);
        };

        private _getTop(dom: HTMLElement) {
            return Utils.offset(dom).top;
        }

        private _scrollTo(selector: string, tween = true) {
            const dom = !Utils.isNullOrEmpty(selector) && document.querySelector(selector),
                item = !Utils.isNull(dom) && this._items.find(i => i.dom === dom);
            if (item && !Utils.isNull(item.dom)) {
                const tget =  this._getTop(item.dom) - (this.offset || 0);
                if (tween) {
                    let from = Utils.scrollTop;
                    window.location.hash = item.dom.id;
                    this._tweener.run(from, tget, 500, 0, Pacem.Animations.Easings.sineInOut, (t, v) => {
                        window.scrollTo(0, v);
                    });
                } else {
                    window.scrollTo(0, tget);
                }
            }
        }

        private _hashChange = (evt: HashChangeEvent) => {
            evt.preventDefault();
            this._scrollTo(window.location.hash, false);
        };

        private _startScrollTo(item: { url: string }, evt: Event) {
            avoidHandler(evt);
            this._scrollTo(item.url);
        }

        private _update(top: number) {
            // pick focused item (fallback: first item)
            const zero = top + (this.offset || 0);
            var current = this._items && this._items.length > 0 && this._items[0];
            for (var item of this._items) {
                if (Utils.offset(item.dom).top <= zero)
                    current = item;
                else
                    break;
            }
            // update css
            const datasource: { label: string, focus: boolean, url: string }[] = [];
            for (var item of this._items) {
                if (Utils.isNullOrEmpty(item.dom.id)) {
                    item.dom.id = item.dom.innerText.trim().replace(/[^a-zA-Z0-9]/g, '-').replace(/-*$/, '').replace(/^-*/, '').toLowerCase();
                }
                datasource.push({ focus: item === current, label: item.dom.innerText, url: '#' + item.dom.id });
            }
            if (!Utils.isNull(this._repeater))
                this._repeater.datasource = datasource;
        }

        @Debounce(250)
        /** DOM might change while interacting with the page, this method allows extemporary resets. */
        refresh() {
            // reset items
            for (let item of this._items) {
                item.dom.removeEventListener('click', this._scrollToSelf, false);
                Utils.removeClass(item.dom, PCSS + '-toc-item');
            }
            //
            const selector = this.selector;
            if (Utils.isNullOrEmpty(selector)) {
                this._repeater && (this._repeater.datasource = []);
                return;
            }
            const items = (this.target || document).querySelectorAll(selector),
                elements: { top: number, dom: HTMLElement }[] = [];
            for (let j = 0; j < items.length; j++) {
                const dom = <HTMLElement>items.item(j);
                dom.addEventListener('click', this._scrollToSelf, false);
                Utils.addClass(dom, PCSS + '-toc-item');
                elements.push({ dom: dom, top: this._getTop(dom) });
            }

            // bootstrap TOC
            this._items = elements;
            this._update(Utils.scrollTop);

            // initial state
            let initialTarget = window.location.hash;
            if (!Utils.isNullOrEmpty(initialTarget)) {
                // in case of hash
                setTimeout(() => {
                    this._scrollTo(initialTarget, true);
                }, 1000);
            } 
        }
    }

}