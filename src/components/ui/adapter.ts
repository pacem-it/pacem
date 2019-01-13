/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    export enum AdapterOrientation {
        Vertical = 'vertical',
        Horizontal = 'horizontal'
    }

    @CustomElement({
        tagName: 'pacem-adapter', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<pacem-button class="pacem-adapter-previous" on-click=":host._previous($event)">&lt;</pacem-button>
    <pacem-button class="pacem-adapter-next" on-click=":host._next($event)">&gt;</pacem-button>
    <pacem-swipe on-swipeleft=":host._next($event)" on-swiperight=":host._previous($event)"></pacem-swipe>
    <pacem-panel tabindex="0">
    <pacem-repeater>
    <ol class="pacem-adapter-dashboard">
        <li pacem hidden>
            <pacem-button class="pacem-play-pause"
                          css-class="{{ {'paused' : :host._paused, 'playing': !:host._paused } }}" 
                          disabled="{{ !:host.pausable }}" on-click=":host._toggle($event)"></pacem-button>
        </li>
        <template>
        <li>
            <pacem-button on-click=":host._select(^index, $event)" 
                    disabled="{{ :host._isDisabled(^item, ^index, ^item.disabled, :host._v) }}" hide="{{ :host._isHidden(^item, ^index, ^item.hide, :host._v) }}"
                    class="pacem-adapter-page" css-class="{{ { 'pacem-adapter-active': ^index === :host._index } }}">
                <pacem-span content="{{ :host._labelCallback(^item, ^index, :host._v) }}"></pacem-span>
            </pacem-button>
        </li>
        </template>
    </ol></pacem-repeater></pacem-panel>`
    })
    export class PacemAdapterElement extends PacemAdapter<PacemIterativeElement<any>, any> {

        constructor() {
            super();
        }

        @ViewChild('pacem-repeater') private _repeater: PacemRepeaterElement;
        @ViewChild('pacem-button.pacem-adapter-previous') private _prevBtn: PacemButtonElement;
        @ViewChild('pacem-button.pacem-adapter-next') private _nextBtn: PacemButtonElement;
        @ViewChild('pacem-panel') private _panel: PacemPanelElement;
        @ViewChild('pacem-swipe') private _swiper: PacemSwipeElement;
        @ViewChild('.pacem-adapter-dashboard > li[pacem]') private _liPause: HTMLLIElement;

        masterPropertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.masterPropertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'items':
                    this._syncViewWithItems();
                    break;
                case 'index':
                    this._index = val;
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._syncViewWithItems();
        }

        private _previousTabIndex: number;

        initializeCallback() {
            super.initializeCallback();
            const el = this.master;
            //
            const tab = this._previousTabIndex = this.master.tabIndex;
            if (!tab || tab < 0)
                el.tabIndex = 0;
            el.addEventListener('keydown', this._keydownHandler, false);
            //
            this._syncViewWithItems();
        }

        destroyCallback() {
            const el = this.master;
            if (el) {
                const behaviors = el.behaviors, ndx = behaviors.indexOf(this._swiper);
                behaviors.splice(ndx, 1);

                el.tabIndex = this._previousTabIndex;
                el.removeEventListener('keydown', this._keydownHandler, false);
            }
            super.destroyCallback();
        }

        itemPropertyChangedCallback(index: number, name: string, old: any, val: any, first?: boolean) {
            super.itemPropertyChangedCallback(index, name, old, val, first);
            // tick overall version
            this._tickVersion();
        }

        @Debounce()
        private _tickVersion() {
            this._v = Date.now();
        }

        private _handle: number;
        @Watch({ converter: PropertyConverters.Boolean }) pausable: boolean;
        @Watch({ emit: false, converter: PropertyConverters.Number }) interval: number;
        @Watch({ emit: false, converter: PropertyConverters.String }) orientation: AdapterOrientation;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Boolean }) interactive: boolean = true;
        @Watch() private _index: number;
        @Watch() private _paused: boolean;
        // hack in order to trigger propertychange events
        @Watch() private _v: number;
        @Watch({ emit: false }) labelCallback: (item: any, index: number) => string = (item, index) => (index + 1).toString();

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'interval':
                    this._resetTimer(val);
                    break;
                case 'interactive':
                    this.hidden = 
                    this._swiper.disabled = !val;
                    break;
                case 'pausable':
                    if (val == true)
                        this._liPause.removeAttribute('hidden');
                    else
                        this._liPause.setAttribute('hidden', 'hidden');
                    break;
            }
        }

        private _syncViewWithItems() {
            if (Utils.isNull(this.master)
                || Utils.isNull(this._prevBtn)
                || Utils.isNull(this._nextBtn)
                || Utils.isNull(this._repeater))
                return;
            var val = this.master.items;
            this._prevBtn.hide = this._nextBtn.hide = this._panel.hide = !(val && val.length > 1);
            this._repeater.datasource = val;
            this._index = this.master.index;
            if (this.master.behaviors.indexOf(this._swiper) == -1)
                this.master.behaviors.push(this._swiper);
        }

        private _toggle(evt: Event) {
            const p = this._paused = !this._paused;
            if (p) {
                avoidHandler(evt);
                this._resetTimer(0);
            } else {
                this._next(evt);
            }
        }

        private _resetTimer(val: number) {
            clearInterval(this._handle);
            if (val > 0)
                this._handle = window.setInterval(() => {
                    super.next();
                }, val);
        }

        private _next(evt: Event) {
            Pacem.avoidHandler(evt);
            this._resetTimer(this.interval);
            super.next();
        }

        private _previous(evt: Event) {
            Pacem.avoidHandler(evt);
            this._resetTimer(this.interval);
            super.previous();
        }

        private _select(ndx: number, evt: Event) {
            Pacem.avoidHandler(evt);
            this._resetTimer(this.interval);
            super.select(ndx);
        }

        private _keydownHandler = (evt: KeyboardEvent) => {
            if (!this.interactive) {
                return;
            }
            switch (this.orientation) {
                case AdapterOrientation.Vertical:
                    switch (evt.keyCode) {
                        case 40: // down
                            this._next(evt);
                            break;
                        case 38: // up
                            this._previous(evt);
                            break;
                    }
                    break;
                default:
                    // horizontal
                    switch (evt.keyCode) {
                        case 39: // right
                            this._next(evt);
                            break;
                        case 37: // left
                            this._previous(evt);
                            break;
                    }
                    break;
            }
        }

        private _isDisabled(item: any, index: number, disabled: boolean, v: number) {
            const retval: boolean = item instanceof PacemEventTarget && disabled === true;
            if ((this._index === -1 && retval === false) || (retval === true && index === this._index))
                super.select(index);
            return retval;
        }

        private _isHidden(item: any, index: number, hide: boolean, v: number) {
            const retval: boolean = item instanceof PacemElement && hide === true;
            if ((this._index === -1 && retval === false) || (retval === true && index === this._index))
                super.select(index);
            return retval;
        }

        private _labelCallback(item: any, index: any, v: number) {
            return this.labelCallback(item, index);
        }
    }

}