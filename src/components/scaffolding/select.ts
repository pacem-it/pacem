/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: P + '-select', template: `<${P}-repeater datasource="{{ :host.adaptedDatasource }}" on-${RepeaterItemCreateEventName}=":host._manageDom($event)">
    <select class="${PCSS}-select ${PCSS}-viewfinder">
        <template>
            <option></option>
        </template>
    </select>
</${ P}-repeater><span class="${PCSS}-readonly"><${P}-text text="{{ :host.viewValue }}"></${P}-text></span><${P}-content></${P}-content>`, shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemSelectElement extends PacemDataSourceElement {

        constructor() {
            super();
        }

        @ViewChild('select') private _select: HTMLSelectElement;
        @ViewChild(P + '-repeater') private _repeater: PacemRepeaterElement;
        @ViewChild(`span.${PCSS}-readonly`) private _span: HTMLSpanElement;

        @Watch({ emit: false, converter: PropertyConverters.Boolean }) emptyOption: boolean = true;

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
            (Utils.isNullOrEmpty(option.value) ? Utils.addClass : Utils.removeClass).apply(this, [option, PCSS + '-watermark']);
        }

        protected onChange(evt?: Event) {
            let select = this._select,
                selectedIndex = select.selectedIndex,
                datasource = this.adaptedDatasource,
                item = selectedIndex >= 0 && datasource[selectedIndex],
                value;
            if (item != null) {
                value = item.value;
            } else
                value = undefined;
            return Utils.fromResult(this.value = value);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                // case 'required':
                case 'placeholder':
                case 'emptyOption':
                    this.databind();
                    break;
            }
        }

        protected buildAdaptedDatasource(ds = this.datasource): DataSource {
            let adapted = super.buildAdaptedDatasource(ds);
            if (adapted && this.emptyOption) {
                adapted.splice(0, 0, { viewValue: this.placeholder || '', value: '' });
            }
            return adapted;
        }

        protected handleDatasourceMismatch(ds: DataSource) {
            if (this.emptyOption) {
                super.handleDatasourceMismatch(ds);
            } else {
                // change value, since it does not exist in database and there's not null/empty fallback...
                this.value = ds[0].value;
                // ...you'll re-enter the acceptValue procedure with hopefully more luck.
            }
        };

        protected acceptValue(val: any) {
            const ds = this.adaptedDatasource,
                item = ds && ds.filter(i => this.isDataSourceItemSelected(i, val));
            //let item = this.datasource && this.datasource.filter(i => this.isItemSelected(i));
            if (item && item.length == 1)
                this._select.selectedIndex = ds.indexOf(item[0]);
            else {
                this._select.value = undefined;
                let opts = this._select.options;
                if (opts.length > 0 && Utils.isNullOrEmpty(opts[0].value)) {
                    this._select.selectedIndex = 0;
                }
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