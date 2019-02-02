/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: P + '-select', template: `<${ P }-repeater datasource="{{ :host.adaptedDatasource }}" on-${RepeaterItemCreateEventName}=":host._manageDom($event)">
    <select class="${PCSS}-select ${PCSS}-viewfinder">
        <option value="" class="${PCSS}-watermark"></option>
        <template>
            <option></option>
        </template>
    </select>
</${ P }-repeater><span class="${PCSS}-readonly"><${ P }-text text="{{ :host.viewValue }}"></${ P }-text></span><${ P }-content></${ P }-content>`, shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemSelectElement extends PacemDataSourceElement {

        constructor() {
            super();
        }

        @ViewChild('select') private _select: HTMLSelectElement;
        @ViewChild(P + '-repeater') private _repeater: PacemRepeaterElement;
        @ViewChild(`span.${PCSS}-readonly`) private _span: HTMLSpanElement;

        protected toggleReadonlyView(readonly: boolean) {
            this._repeater.hidden = readonly;
            this._span.hidden = !readonly;
        }

        // no actual need to be idem-potent...
        // (take care in future)
        protected get inputFields(): HTMLSelectElement[] {
            return [this._select];
        }

        private _manageDom(evt: RepeaterItemEvent) {
            const args = evt.detail;
            let option = <HTMLOptionElement>args.dom.find(o => o instanceof HTMLOptionElement);
            option.value = args.item.value;
            option.textContent = args.item.viewValue;
            option.selected = this.isDataSourceItemSelected(args.item);
        }

        protected onChange(evt?: Event) {
            let select = this._select,
                selectedIndex = select.selectedIndex,
                datasource = this.adaptedDatasource,
                item = selectedIndex > 0 && datasource[selectedIndex - 1],
                value;
            if (item != null) {
                value = item.value;
            } else
                value = undefined;
            this.value = value;
            return Utils.fromResult(value);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'placeholder':
                    this._select.options.item(0).text = val;
                    break;
            }
        }

        protected acceptValue(val: any) {
            let item = this.datasource && this.datasource.filter(i => this.isItemSelected(i));
            if (item && item.length == 1)
                this._select.selectedIndex = this.datasource.indexOf(item[0]) + 1 /* <- placeholder at 0 */;
            else {
                this._select.value = undefined;
                let opts = this._select.options;
                if (opts.length > 0 && Utils.isNullOrEmpty(opts[0].value))
                    this._select.selectedIndex = 0;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            //select.addEventListener("change", this.changeHandler, false);
            var options: any = { capture: false, passive: true };
            this._select.addEventListener("wheel", this.emitHandler, options);
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._select)) {
                //select.removeEventListener("change", this.changeHandler, false);
                var options: any = { capture: false, passive: true };
                this._select.removeEventListener("wheel", this.emitHandler, options);
            }
            super.disconnectedCallback();
        }

    }

}