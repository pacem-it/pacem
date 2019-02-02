/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: P + '-radio',
        template: `<${ P }-span class="${PCSS}-readonly ${PCSS}-radio" text="{{ :host.caption }}"></${ P }-span><input type="radio" class="${PCSS}-input" /><label class="${PCSS}-label ${PCSS}-radio ${PCSS}-viewfinder"><${ P }-text text="{{ :host.caption }}"></${ P }-text></label>`,
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
        @ViewChild("label") private _label: HTMLLabelElement;
        @ViewChild(`.${PCSS}-readonly`) span: HTMLElement;

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
            this._radio.id = this._label.htmlFor = this._key;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'name':
                    this._radio.name = val;
                    break;
                case 'selected':
                    (this._radio.checked = val) ?
                        Utils.addClass(this, PCSS + '-selected')
                        :
                        Utils.removeClass(this, PCSS + '-selected');
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