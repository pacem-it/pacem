/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({ tagName: 'pacem-infinite-scroller' })
    export class PacemInfiniteScrollerElement extends PacemEventTarget implements OnPropertyChanged, OnViewActivated, OnDisconnected {

        constructor() {
            super();
            this._container = this;
            this._viewport = this;
            this._scroller = this;
        }

        @Watch({ converter: PropertyConverters.String }) container: string | HTMLElement;
        @Watch({ reflectBack: true, converter: PropertyConverters.Number }) threshold: number;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.setInfiniteScrollContainer(this._container);
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._scroller))
                this._scroller.removeEventListener('scroll', this._scrollDelegate, false);
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'container':
                    this.setInfiniteScrollContainer(val);
                    break;
                case 'disabled':
                    if (this._enabled = !val)
                        this._doScroll();
                    break;
                case 'threshold':
                    this._bottomGap = val || 0;
                    break;
            }
        }

        setInfiniteScrollContainer(v: string | HTMLElement = '$document') {
            var cont: HTMLElement | string = v;
            var isDoc = this._isDocument = cont === '$document' || cont === document.body || cont === document.documentElement;
            this._container = isDoc ? (document.body || document.documentElement) : (
                (typeof v === 'string') ?
                    <HTMLElement>document.querySelector(<string>cont)
                    :
                    <HTMLElement>cont);
            this._viewport = isDoc ? window : this._container;
            if (this._scroller)
                this._scroller.removeEventListener('scroll', this._scrollDelegate, false);
            this._scroller = isDoc ? window.document : this._container;
            this._scroller.addEventListener('scroll', this._scrollDelegate, false);
            if (this._enabled)
                this._doScroll();
        }

        private _scrollDelegate = () => this._doScroll();
        private _enabled: boolean = true;
        private _viewportHeight: number = 0;
        private _innerHeight: number = 0;
        private _isDocument: boolean = false;
        private _container: HTMLElement = null;
        private _viewport: HTMLElement | Window = null;
        private _scroller: HTMLElement | Document = null;
        private _bottomGap: number = 10;

        //ngOnChanges(changes: SimpleChanges) {
        //}

        private _emitFetchMore() {
            /**
             * on-fetchmore => must toggle `enabled` while fetching...
             */
            var evt = new CustomEvent('fetchmore');
            this.dispatchEvent(evt);
        }

        @Debounce(100)
        private _doScroll(): void {
            if (!this._enabled) return;
            if (!this._computeHeight()) {
                var scrollTop = this._scroller instanceof Document ? window.pageYOffset : (<HTMLElement>this._scroller).scrollTop;
                var viewportHeight: number = this._viewportHeight, innerHeight = this._innerHeight;
                var threshold = innerHeight - (scrollTop + viewportHeight);
                if (threshold < this._bottomGap /* pixels */
                    || innerHeight <= viewportHeight) {

                    // fire fetchMore() 
                    this._emitFetchMore();

                    window.requestAnimationFrame(() => {
                        if (this._enabled)
                            this._doScroll();
                    });

                } //else computeHeight();
            } else this._doScroll();
        }

        private _computeHeight(): boolean {
            if (!this._container) return;
            var cont = this._container;
            var topOffset = Number.MAX_VALUE, bottomOffset = 0, totalHeight = 0, _innerHeight;
            if (this._isDocument) {
                var d = cont;
                _innerHeight = Math.max(
                    d.scrollHeight,
                    d.offsetHeight,
                    d.clientHeight
                );
            } else {
                for (var i = 0; i < cont.children.length; i++) {
                    var e = <HTMLElement>cont.children.item(i);
                    var eTopOffset = e.offsetTop,
                        eHeight = e.offsetHeight,
                        eBottomOffset = eTopOffset + eHeight;
                    totalHeight += eHeight;

                    if (eTopOffset < topOffset) {
                        topOffset = eTopOffset;
                    }
                    if (eBottomOffset > bottomOffset) {
                        bottomOffset = eBottomOffset;
                    }
                }
                _innerHeight = Math.round(bottomOffset - topOffset);
            }
            var _viewportHeight = this._viewport instanceof Window ? Utils.windowSize.height : (<HTMLElement>this._viewport).offsetHeight;
            if (_innerHeight != this._innerHeight || _viewportHeight != this._viewportHeight) {
                this._innerHeight = _innerHeight;
                this._viewportHeight = _viewportHeight;
                return true;
            }
            return false;
        }
    }

}