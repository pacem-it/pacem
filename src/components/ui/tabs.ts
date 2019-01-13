/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    const PACEM_TAB_FOCUS_CSS = 'pacem-tab-focus';

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
    export class PacemTabsElement extends PacemIterativeElement<PacemTabElement> implements OnPropertyChanged, OnViewActivated {

        @ViewChild('pacem-adapter') private _defaultTabAdapter: PacemAdapterElement;
        @ViewChild('.pacem-tabs') private _tabs: HTMLElement;
        @Watch() private _isUsingDefaultTabAdapter: boolean;
        /** Gets or sets the orientation of the default tabs adapter. */
        @Watch({ converter: PropertyConverters.String }) orientation: AdapterOrientation;

        private _labelCallback(item: PacemTabElement, index: number) {
            return `<span class="${item.key}">${item.label}</span>`;
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

        viewActivatedCallback() {
            super.viewActivatedCallback();
            //this._defaultTabAdapter.labelCallback = this._labelCallback;
            if (Utils.isNull(this.adapter)) {
                this._syncOrientation();
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
                    let ndx = 0;
                    for (var tab of this.items) {
                        if (ndx === val) {
                            Utils.addClass(tab, PACEM_TAB_FOCUS_CSS);
                            tab.aria.attributes.set('selected', 'true');
                        } else {
                            Utils.removeClass(tab, PACEM_TAB_FOCUS_CSS);
                            tab.aria.attributes.set('selected', 'false');
                        }
                        ndx++;
                    }
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