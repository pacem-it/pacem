/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: 'pacem-radio',
        template: `<pacem-span class="pacem-readonly pacem-radio" text="{{ :host.caption }}"></pacem-span><input type="radio" class="pacem-input" /><label class="pacem-label pacem-radio pacem-viewfinder"><pacem-text text="{{ :host.caption }}"></pacem-text></label>`,
        shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemRadioElement extends PacemBaseElement implements OnPropertyChanged, OnViewActivated {

        protected convertValueAttributeToProperty(attr: string) {
            return attr;
        }
        constructor() {
            super();
            this._key = '_' + Utils.uniqueCode();
        }

        private _key: string;

        @ViewChild("input[type=radio]") private _radio: HTMLInputElement;
        @ViewChild("label") label: HTMLLabelElement;
        @ViewChild(".pacem-readonly") span: HTMLElement;

        @Watch({ converter: PropertyConverters.String }) caption: string;
        @Watch({ converter: PropertyConverters.Boolean }) selected: boolean;

        protected toggleReadonlyView(readonly: boolean) {
            this.span.hidden = !readonly;
            this._radio.hidden = /*this.label.hidden =*/ readonly;
        }

        protected get inputFields() {
            return [this._radio];
        }

        protected onChange(evt?: Event) {
            this.selected = this._radio.checked;
            const value = this.selected ? this._radio.value : undefined;
            return Utils.fromResult(value);
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._radio.id = this.label.htmlFor = this._key;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'name':
                    this._radio.name = val;
                    break;
                case 'selected':
                    (this._radio.checked = val) ?
                        Utils.addClass(this, 'pacem-selected')
                        :
                        Utils.removeClass(this, 'pacem-selected');
                    break;
            }
        }

        protected acceptValue(val: any) {
            this._radio.value = Utils.isNullOrEmpty(val) ? '' : val;
        }

        protected getViewValue(val: any): string {
            if (!Utils.isNull(val))
                return this.caption;
            return '';
        }
    }
}