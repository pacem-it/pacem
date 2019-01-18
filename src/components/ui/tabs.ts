/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    const PACEM_TAB_FOCUS_CSS = 'tab-focus';

    @CustomElement({
        tagName: 'pacem-tab'
    })
    export class PacemTabElement extends PacemIterableElement {

        constructor() {
            super('tab');
        }

        @Watch({ converter: PropertyConverters.String }) label: string;
        @Watch({ converter: PropertyConverters.String }) key: string;

    }

    @CustomElement({
        tagName: 'pacem-tabs', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="pacem-tabs">
    <pacem-adapter class="pacem-tabs-adapter" hide="{{ !:host._isUsingDefaultTabAdapter }}" label-callback="{{ :host._labelCallback }}"></pacem-adapter>
    <div class="pacem-tabs-content">
        <pacem-content></pacem-content>
    </div>
</div>`
    })
    export class PacemTabsElement extends PacemIterativeElement<PacemTabElement> {

        constructor(private _tweener = new Pacem.Animations.TweenService()) {
            super();
        }

        @ViewChild('pacem-adapter') private _defaultTabAdapter: PacemAdapterElement;
        @ViewChild('.pacem-tabs') private _tabs: HTMLElement;
        @ViewChild('.pacem-tabs-content') private _container: HTMLElement;

        @Watch() private _isUsingDefaultTabAdapter: boolean;
        /** Gets or sets the orientation of the default tabs adapter. */
        @Watch({ converter: PropertyConverters.String }) orientation: AdapterOrientation;

        private _labelCallback(item: PacemTabElement, index: number) {
            return `<span class="${(item.key || 'tab')}">${item.label}</span>`;
        }

        private _syncOrientation(val: AdapterOrientation = this.orientation) {
            if (!Utils.isNull(this._defaultTabAdapter)) {
                this._defaultTabAdapter.orientation = val;
            }
            if (!Utils.isNull(this._tabs)) {
                const fn: (el: Element, c: string) => void = val === AdapterOrientation.Vertical ? Utils.addClass : Utils.removeClass;
                fn(this._tabs, 'tabs-vertical');
            }
        }

        private _syncVisibility(val: number = this.index, old: number = -1) {
            const timeout = 500;
            // lock height
            const container = this._container, height = container.clientHeight;
            const style = getComputedStyle(container),
                padding = style.boxSizing === 'border-box' ? 0 : parseInt(style.paddingTop) + parseInt(style.paddingBottom);
            container.style.height = (height - padding) + 'px';

            let ndx = 0;
            for (let tab of this.items) {
                if (ndx === val) {
                    Utils.addClass(tab, 'tab-in');
                    requestAnimationFrame(() => {
                        // wait for visibility digestion
                        Utils.addClass(tab, PACEM_TAB_FOCUS_CSS);
                        Utils.removeClass(tab, 'tab-in');
                        Utils.addAnimationEndCallback(tab, (t) => {
                            Utils.removeClass(t, 'tab-previous tab-next');
                            const tgetH = Utils.offset(t).height + padding;
                            this._tweener.run(parseInt(container.style.height), tgetH, 100, 0, Pacem.Animations.Easings.sineOut,
                                (_, v) => {
                                    container.style.height = Math.round(v) + 'px';
                                })
                                .then(_ => {
                                    // unlock height
                                    container.style.height = '';

                                });
                        }, timeout);
                    });
                    tab.aria.attributes.set('selected', 'true');
                } else {
                    Utils.removeClass(tab, 'tab-previous tab-next');
                    Utils.addClass(tab, ndx < val ? 'tab-previous' : 'tab-next');
                    if (ndx === old) {
                        Utils.addClass(tab, 'tab-out');
                        Utils.removeClass(tab, PACEM_TAB_FOCUS_CSS);
                        Utils.addAnimationEndCallback(tab, (t) => {
                            Utils.removeClass(t, 'tab-out');
                        }, timeout);
                        tab.aria.attributes.set('selected', 'false');
                    }
                }
                ndx++;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            //this._defaultTabAdapter.labelCallback = this._labelCallback;
            if (Utils.isNull(this.adapter)) {
                this._syncOrientation();
                this._syncVisibility();
                this.adapter = this._defaultTabAdapter;
            }
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'adapter':
                    if (Utils.isNull(val)) {
                        this.adapter = this._defaultTabAdapter;
                    }
                    this._isUsingDefaultTabAdapter = this.adapter === this._defaultTabAdapter;
                    break;
                case 'index':
                    this._syncVisibility(val, old);
                    break;
                case 'orientation':
                    this._syncOrientation(val);
                    break;
            }
        }

        validate(item: any) {
            return item instanceof PacemTabElement;
        }

    }


}