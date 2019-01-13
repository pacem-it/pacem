/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Scaffolding {

    const StringOrBooleanPropertyConverter: PropertyConverter = {
        convert: (attr: string) => attr === 'true' ? true : (attr === 'false' ? false : attr),
        convertBack: (prop: any) => prop.toString()
    }

    @CustomElement({
        tagName: 'pacem-checkbox',
        template: `<pacem-span class="pacem-readonly pacem-checkbox" text="{{ :host.caption }}"></pacem-span>
<input type="checkbox" class="pacem-input" /><label class="pacem-label pacem-checkbox pacem-viewfinder" pacem><pacem-text text="{{ :host.caption }}"></pacem-text></label>`,
        shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemCheckboxElement extends PacemBaseElement implements OnPropertyChanged, OnViewActivated {

        constructor() {
            super('checkbox');
            this._key = '_' + Utils.uniqueCode();
        }

        private _key: string;

        protected convertValueAttributeToProperty(attr: string) {
            StringOrBooleanPropertyConverter.convert(attr) === this.trueValue ? this.trueValue : this.falseValue;
        }

        @ViewChild("input[type=checkbox]") private _checkbox: HTMLInputElement;
        @ViewChild("label") label: HTMLLabelElement;
        @ViewChild(".pacem-readonly") span: HTMLElement;

        @Watch({ converter: PropertyConverters.String }) caption: string = '';
        @Watch({ emit: false, converter: StringOrBooleanPropertyConverter }) trueValue: any;
        @Watch({ emit: false, converter: StringOrBooleanPropertyConverter }) falseValue: any;
        // TODO: hide/remove `selected` property (lean only on `value`)
        @Watch({ converter: PropertyConverters.Boolean }) selected: boolean;

        protected toggleReadonlyView(readonly: boolean) {
            this.span.hidden = !readonly;
            this._checkbox.hidden = this.label.hidden = readonly;
        }

        protected get inputFields() {
            return [this._checkbox];
        }

        protected onChange(evt?: Event) {
            this.selected = this._checkbox.checked;
            const value = this.value = this.selected ? this.trueValue : this.falseValue;
            return Utils.fromResult(value);
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._checkbox.id = this.label.htmlFor = this._key;
            if (this.value /* weak equality to deal with declarative values and conversions */ == this.trueValue)
                this.selected = true;
            else if (this.value /* weak equality to deal with declarative values and conversions */ == this.falseValue)
                this.selected = false;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'caption':
                    this.label.hidden = Utils.isNullOrEmpty(val);
                    break;
                case 'name':
                    this._checkbox.name = val;
                    break;
                case 'selected':
                    if (this._checkbox.checked = val) {
                        this.value = this.trueValue;
                        Utils.addClass(this, 'pacem-selected');
                        this.aria.attributes.set('checked', 'true');
                    } else {
                        this.value = this.falseValue;
                        Utils.removeClass(this, 'pacem-selected');
                        this.aria.attributes.set('checked', 'false');
                    }
                    break;
            }
        }

        protected acceptValue(val: any) {
            this.selected = val /* weak equality to deal with declarative values and conversions */ == this.trueValue;
        }

        protected getViewValue(val: any): string {
            if (!Utils.isNull(val))
                return this.caption;
            return '';
        }
    }
}