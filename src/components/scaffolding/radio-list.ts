/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: 'pacem-radio-list', template: `<pacem-repeater datasource="{{ :host.adaptedDatasource }}">
    <ol class="pacem-radio-list pacem-viewfinder" pacem>
        <template>
            <li><pacem-radio disabled="{{ ::_disable.model }}" name="{{ :host.key }}" caption="{{ ^item.viewValue }}" value="{{ ^item.value }}" selected="{{ :host.isDataSourceItemSelected(^item, :host.value) }}"
on-focus=":host.focusHandler($event)" on-blur=":host.focusHandler($event)"
on-${ PropertyChangeEventName }=":host._selectionChanged($event, ^index, ^item)"></pacem-radio></li>
        </template>
    </ol>
</pacem-repeater><span class="pacem-readonly pacem-radio"><pacem-text text="{{ :host.viewValue }}"></pacem-text></span><pacem-data></pacem-data><pacem-content></pacem-content>`,
        shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemRadioListElement extends PacemDataSourceElement {

        protected acceptValue(val: any) {
            // no need to implement
        }
        
        constructor() {
            super();
            this['key'] = '_' + Utils.uniqueCode();
        }
        
        protected get inputFields() {
            return [];
        }

        @ViewChild('pacem-repeater') private _repeater: PacemRepeaterElement;
        @ViewChild('span.pacem-readonly') private _span: HTMLSpanElement;
        @ViewChild('pacem-data') private _disable: PacemDataElement;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'disabled') {
                this._disable.model = val;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._disable.model = this.disabled;
        }

        protected toggleReadonlyView(readonly: boolean) {
            this._repeater.hidden = readonly;
            this._span.hidden = !readonly;
        }

        private _selectedValue: any;

        private _selectionChanged(evt: PropertyChangeEvent, index: number, item: DataSourceItem) {
            if (evt.detail.propertyName === 'selected' && evt.detail.currentValue === true) {
                this._selectedValue = this.mapEntityToValue(this.datasource[index]);
                this.changeHandler(evt);
            }
        }

        protected onChange(evt?: Event) {
            this.value = this._selectedValue;
            this.databind();
            return Utils.fromResult(this._selectedValue);
        }

    }

}