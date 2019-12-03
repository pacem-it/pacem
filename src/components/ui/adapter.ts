/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    export enum AdapterOrientation {
        Vertical = 'vertical',
        Horizontal = 'horizontal'
    }

    export interface AdapterPageButtonRefreshEventArgs {
        index: number,
        hide: boolean,
        disabled: boolean,
        content: string
    }

    export const AdapterPageButtonRefreshEventName = 'pagerefresh';

    export class AdapterPageButtonRefreshEvent extends CustomEvent<AdapterPageButtonRefreshEventArgs>{
        constructor(args: AdapterPageButtonRefreshEventArgs) {
            super(AdapterPageButtonRefreshEventName, { detail: args, bubbles: false, cancelable: false });
        }
    }

    @CustomElement({
        tagName: P + '-adapter', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-button class="${PCSS}-adapter-previous" on-click=":host._previous($event)">&lt;</${P}-button>
    <${P}-button class="${PCSS}-adapter-next" on-click=":host._next($event)">&gt;</${P}-button>
    <${P}-swipe on-swipeleft=":host._next($event)" on-swiperight=":host._previous($event)"></${P}-swipe>
    <${P}-panel tabindex="0">
    <${P}-repeater>
    <ol class="${PCSS}-adapter-dashboard">
        <li pacem hidden>
            <${P}-button class="${PCSS}-play-pause"
                          css-class="{{ {'paused' : :host._paused, 'playing': !:host._paused } }}" 
                          disabled="{{ !:host.pausable }}" on-click=":host._toggle($event)"></${P}-button>
        </li>
        <template>
        <li>
            <${P}-button on-click=":host._select(^index, $event)" class="${PCSS}-adapter-page" css-class="{{ { '${PCSS}-adapter-active': ^index === :host._index } }}">
                <${P}-span></${P}-span>
            </${P}-button>
        </li>
        </template>
    </ol></${P}-repeater></${P}-panel>`
    })
    export class PacemAdapterElement extends PacemAdapter<PacemIterativeElement<any>, any> {

        @ViewChild(P + '-repeater') private _repeater: PacemRepeaterElement;
        @ViewChild(P + '-button.' + PCSS + '-adapter-previous') private _prevBtn: PacemButtonElement;
        @ViewChild(P + '-button.' + PCSS + '-adapter-next') private _nextBtn: PacemButtonElement;
        @ViewChild(P + '-panel') private _panel: PacemPanelElement;
        @ViewChild(P + '-swipe') private _swiper: PacemSwipeElement;
        @ViewChild('.' + PCSS + '-adapter-dashboard > li[pacem]') private _liPause: HTMLLIElement;

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
            this._repeater.addEventListener(RepeaterItemCreateEventName, this._itemCreatedHandler, false);
            this._syncViewWithItems();
        }

        disconnectedCallback() {
            if (this._repeater) {
                this._repeater.removeEventListener(RepeaterItemCreateEventName, this._itemCreatedHandler, false);
            }
            super.disconnectedCallback();
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
            this.addEventListener('keydown', this._keydownHandler, false);
            el.addEventListener(Pacem.Components.ItemRegisterEventName, this._itemRegisterHandler, false);
            el.addEventListener(Pacem.Components.ItemUnregisterEventName, this._itemUnregisterHandler, false);
            //
            this._syncViewWithItems();
        }

        destroyCallback() {
            const el = this.master;
            this.removeEventListener('keydown', this._keydownHandler, false);
            el.removeEventListener('keydown', this._keydownHandler, false);
            el.removeEventListener(Pacem.Components.ItemRegisterEventName, this._itemRegisterHandler, false);
            el.removeEventListener(Pacem.Components.ItemUnregisterEventName, this._itemUnregisterHandler, false);

            if (!Utils.isNullOrEmpty(el.items)) {
                for (let item of el.items) {

                    const behaviors = item.behaviors, ndx = behaviors.indexOf(this._swiper);
                    if (ndx >= 0) {
                        behaviors.splice(ndx, 1);
                    }
                }
            }

            el.tabIndex = this._previousTabIndex;

            super.destroyCallback();
        }

        itemPropertyChangedCallback(index: number, name: string, old: any, val: any, first?: boolean) {
            super.itemPropertyChangedCallback(index, name, old, val, first);
            // tick overall version
            this._tickVersion();
            this._fireAdapterPageRefreshCallback(index);
        }

        private _itemCreatedHandler = (evt: RepeaterItemCreateEvent) => {
            const index = evt.detail.index;
            this._pageMap.set(index, (<HTMLLIElement>evt.detail.dom[0]).firstElementChild as PacemButtonElement);
            this._fireAdapterPageRefreshCallback(index, evt.detail.item);
        };

        private _pageMap = new Map<number, PacemButtonElement>();

        private _fireAdapterPageRefreshCallback(index: number, item?: any) {
            item = item || this.master.items[index];
            var hide: boolean = item.hide || false,
                disable: boolean = item.disabled || false,
                caption:string = this._labelCallback(item, index);
            const evt = new AdapterPageButtonRefreshEvent({ index: index, hide: hide, disabled: disable, content: caption });
            this.dispatchEvent(evt);
            // receive/accept changes
            hide = this._isHidden(item, index, evt.detail.hide);
            disable = this._isDisabled(item, index, evt.detail.disabled);
            caption = evt.detail.content;

            // pick target button
            const pagers = this._pageMap;
            if (pagers.has(index)) {
                const pager = pagers.get(index),
                    span = pager.firstElementChild as PacemSpanElement;

                let fn = (e?: Event) => {
                    if (e) {
                        pager.removeEventListener('load', fn, false);
                    }
                    pager.hide = hide;
                    pager.disabled = disable;
                    span.content = caption;
                }
                // *careful here*: TODO: TO BE STUDIED
                // if setting the property before it's connected
                // the @Watch configuration and the get+set injection gets lost!
                if (pager.isReady) {
                    // does not work for properties(?)...
                    fn();
                } else {
                    pager.addEventListener('load', fn, false);
                }
            }
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
        /** Gets or sets whether swipe gesture is enabled for navigation (also depends on the 'interactive' flag being set to 'true') */
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Boolean }) swipeEnabled: boolean = true;
        /** Gets or sets whether, by selecting twice an item, you will de-select it and obtain an overall unselected state. */
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Boolean }) deselectable: boolean;

        @Watch({ emit: false }) labelCallback: (item: any, index: number) => string = (item, index) => (index + 1).toString();

        // private
        @Watch() private _index: number;
        @Watch() private _paused: boolean;
        // hack in order to trigger propertychange events
        @Watch() private _v: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'interval':
                    this._resetTimer(val);
                    break;
                case 'swipeEnabled':
                    this._swiper.disabled = !val || !this.interactive;
                    break;
                case 'interactive':
                    this.hidden = !val;
                    this._swiper.disabled = !val || !this.swipeEnabled;
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
            if (!this.isReady
                || Utils.isNull(this.master)
                || Utils.isNull(this._prevBtn)
                || Utils.isNull(this._nextBtn)
                || Utils.isNull(this._repeater))
                return;
            var val = this.master.items;
            this._prevBtn.hide = this._nextBtn.hide = this._panel.hide = !(val && val.length > 1);
            this._repeater.datasource = val;
            this._index = this.master.index;
            if (!Utils.isNullOrEmpty(val)) {
                for (let item of val) {
                    if (item instanceof PacemElement && item.behaviors.indexOf(this._swiper) == -1)
                        item.behaviors.push(this._swiper);
                }
            }
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

        @Throttle(333)
        private _next(evt: Event) {
            if (evt.type !== Pacem.UI.SwipeEventType.SwipeLeft)
                Pacem.avoidHandler(evt);
            this._resetTimer(this.interval);
            super.next();
        }

        @Throttle(333)
        private _previous(evt: Event) {
            if (evt.type !== Pacem.UI.SwipeEventType.SwipeRight)
                Pacem.avoidHandler(evt);
            this._resetTimer(this.interval);
            super.previous();
        }

        private _select(ndx: number, evt: Event) {
            Pacem.avoidHandler(evt);
            this._resetTimer(this.interval);
            if (!this.deselectable || ndx !== this._index) {
                super.select(ndx);
            } else {
                this.master.index = this._index = -1;
            }
        }

        private _itemRegisterHandler = (evt: ItemRegisterEvent<any>) => {
            let item = evt.detail;
            if (!Utils.isNull(this._swiper) && item instanceof PacemElement && item.behaviors.indexOf(this._swiper) == -1)
                item.behaviors.push(this._swiper);
        };

        private _itemUnregisterHandler = (evt: ItemUnregisterEvent<any>) => {
            let item = evt.detail, index: number;
            if (!Utils.isNull(this._swiper) && item instanceof PacemElement && (index = item.behaviors.indexOf(this._swiper)) >= 0)
                item.behaviors.splice(index, 1);
        };

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

        private _isDisabled(item: any, index: number, disabled: boolean, v?: number) {
            return this._disableOrHide(item, index, disabled);
        }

        private _isHidden(item: any, index: number, hide: boolean, v?: number) {
            return this._disableOrHide(item, index, hide);
        }

        private _disableOrHide(item: any, index: number, disabledOrHidden: boolean) {
            const retval: boolean = item instanceof PacemElement && disabledOrHidden === true;
            if ((this._index === -1 && retval === false) || (retval === true && index === this._index)) {
                if (this.deselectable) {
                    this.master.index = this._index = -1;
                } else {
                    super.select(index);
                }
            }
            return retval;
        }

        private _labelCallback(item: any, index: any, v?: number) {
            return this.labelCallback(item, index);
        }
    }

}