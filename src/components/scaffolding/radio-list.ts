/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: P + '-radio-list', template: `<${ P }-repeater datasource="{{ :host.adaptedDatasource }}">
    <ol class="${PCSS}-radio-list ${PCSS}-viewfinder" pacem>
        <template>
            <li><${ P }-radio disabled="{{ ::_disable.model }}" name="{{ :host.key, once }}" caption="{{ ^item.viewValue }}" value="{{ ^item.value }}" selected="{{ :host.isDataSourceItemSelected(^item, :host.value) }}"
on-focus=":host.focusHandler($event)" on-blur=":host.focusHandler($event)"
on-${ PropertyChangeEventName }=":host._selectionChanged($event, ^index, ^item)"></${ P }-radio></li>
        </template>
    </ol>
</${ P }-repeater><span class="${PCSS}-readonly ${PCSS}-radio"><${ P }-text text="{{ :host.viewValue }}"></${ P }-text></span><${ P }-data></${ P }-data><${ P }-content></${ P }-content>`,
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

        @ViewChild(P + '-repeater') private _repeater: PacemRepeaterElement;
        @ViewChild(P + '-data') private _disable: PacemDataElement;
        @ViewChild(`span.${PCSS}-readonly`) private _span: HTMLSpanElement;

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