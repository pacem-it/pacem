/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: P + '-checkbox-list', template: `<${ P }-repeater datasource="{{ :host.adaptedDatasource }}">
    <ol class="${PCSS}-checkbox-list ${PCSS}-viewfinder" pacem>
        <template>
            <li><${ P }-checkbox disabled="{{ ::_disable.model }}" name="{{ :host.key }}" caption="{{ ^item.viewValue }}" true-value="{{ ^item.value }}" selected="{{ :host.isDataSourceItemSelected(^item, :host.value) }}"
on-focus=":host.focusHandler($event)" on-blur=":host.focusHandler($event)"
on-${ PropertyChangeEventName}=":host._selectionChanged($event, ^index, ^item)" on-change=":host.changeHandler($event)"></${ P }-checkbox></li>
        </template>
    </ol>
</${ P }-repeater><span class="${PCSS}-readonly"><${ P }-text text="{{ :host.viewValue }}"></${ P }-text></span><${ P }-data></${ P }-data><${ P }-content></${ P }-content>`,
        shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemCheckboxListElement extends PacemDataSourceElement {

        protected acceptValue(val: any) {
            // no need to implement
        }

        constructor() {
            super(true);
            this['key'] = '_' + Utils.uniqueCode();
        }

        protected get inputFields() {
            return [];
        }

        @ViewChild(`span.${PCSS}-readonly`) private _span: HTMLSpanElement;
        @ViewChild(P + '-repeater') private _repeater: PacemRepeaterElement;
        @ViewChild(P + '-data') private _disable: PacemDataElement;

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
            this._span.hidden = !readonly;
            this._repeater.hidden = readonly;
        }

        private _selectedUiItems: any[] = [];

        private _selectionChanged(evt: PropertyChangeEvent, index: number, item: DataSourceItem) {
            if (evt.detail.propertyName === 'selected') {
                let ndx: number, uiItems = this._selectedUiItems;
                if (evt.detail.currentValue === true) {
                    uiItems.push(this.datasource[index]);
                } else if ((ndx = uiItems.indexOf(this.datasource[index])) !== -1)  {
                    uiItems.splice(ndx, 1);
                }
            }
        }

        protected onChange(evt?: Event) {
            const val =
                this.value = this._selectedUiItems.map(i => this.mapEntityToValue(i));
            return Utils.fromResult(val);
        }

    }

}