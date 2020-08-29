namespace Pacem.Cms {

    export interface DataColumn {
        header: string,
        /** expression, constant, ... */
        content: string,
        width?: number | 'auto'
    }
}

namespace Pacem.Components.Cms {

    /** Default metadata ('expression' field) 'type' factory. */
    export const DATACOLUMNS_METADATA_TYPE = (host: Pacem.Components.Scaffolding.PacemFormFieldElement, hostRef = ':host', hostEntityRef = ':host.entity') => {
        const attrs: { [name: string]: string } = {},
            meta = host.metadata,
            fns = Pacem.Components.Cms.Functions,
            fnKeys: string[] = [];
        attrs['properties'] = `{{ Pacem.CustomElementUtils.getWatchedProperty(${hostEntityRef}, '${meta.prop}').config.converter }}`;
        const tagName = P + '-datacolumns';
        let extra = <{ properties: string | ((e?: Element) => Partial<Pacem.Scaffolding.PropertyMetadata>[]) }>(meta.extra || {});

        // properties
        if (!Utils.isNullOrEmpty(extra.properties)) {
            switch (typeof extra.properties) {
                case 'string':
                    attrs['properties'] = `{{ ${hostEntityRef}.${extra.properties} }}`;
                    break;
                case 'function':
                    const fnKey = 'fn' + Utils.uniqueCode();
                    fns[fnKey] = extra.properties;
                    attrs['properties'] = `{{ Pacem.Components.Cms.Functions.${fnKey}(${hostRef}), once }}`;

                    // tidy-up memento
                    fnKeys.push(fnKey);
                    break;
            }
        }

        if (fnKeys.length > 0) {

            // tidy-up
            attrs['on-unload'] = `{{ Pacem.Components.Cms.Functions.dismiss('${fnKeys.join('\',\'')}') }}`
        }

        return { tagName: tagName, attrs: attrs };
    };

    const DATACOLUMN_METADATA: Pacem.Scaffolding.TypeMetadata = {
        display: { name: 'Columns' },
        props: [
            { prop: 'header', type: 'string', display: { cssClass: ['form-minimal'], name: 'Header' } },
            {
                prop: 'content', type: EXPRESSION_METADATA_TYPE, display: { name: 'Content' },
                extra: EXPRESSION_WIDGET_METADATA_EXTRA
            }
        ]
    };

    @CustomElement({
        tagName: P + '-datacolumn', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-form class="panel-body" autogenerate="true"></${P}-form>`
    })
    export class PacemDataColumnElement extends PacemElement {

        @Watch({ converter: PropertyConverters.String }) header: string;
        @Watch({ converter: PropertyConverters.String }) content: string;
        @Watch({ converter: PropertyConverters.String }) contentExpression: string;

        @ViewChild(P + '-form') private _form: Pacem.Components.Scaffolding.PacemFormElement;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'content':
                    this.contentExpression = val;
                    break;
                case 'contentExpression':
                    this.setAttribute('content', val || '');
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._form.entity = this;
            this._form.metadata = gridifyMetadata(DATACOLUMN_METADATA);
        }
    }

    @CustomElement({
        tagName: P + '-datacolumns', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${PCSS}-datacolumns">
    <div class="datacolumns-main display-flex flex-fill">

        <${P}-drag-drop mode="${Pacem.UI.DragDataMode.Alias}" disabled="{{ :host.readonly }}" handle-selector="*[handle]"
              drop-behavior="${Pacem.UI.DropBehavior.InsertChild}" drop-targets="{{ [::_dropTarget] }}" columns></${P}-drag-drop>   
        <${P}-repeater class="display-flex flex-fill" columns>   
            <!-- columns -->
            <div class="display-flex flex-nowrap" drop-target>
                <template>
                    <${P}-panel behaviors="{{ [::_colDragger] }}">
                        <div class="${PCSS}-panel panel-side-left side-auto">
                            <div class="panel-side">
                                <${P}-button class="display-block button-flat icon-glyph-small" icon-glyph="drag_indicator" handle></${P}-button>
                                <${P}-button class="display-block button-flat icon-glyph-small" on-click=":host.value.splice(^index, 1)" icon-glyph="clear"></${P}-button>
                            </div>
                            <div class="panel-heading">
                                <${P}-text text="{{ ^item.header }}"></${P}-text>
                            </div>
                            <${P}-datacolumn class="panel-body" header="{{ ^item.header, twoway }}" content-expression="{{ ^item.content, twoway }}"></${P}-form>
                        </div>
                    </${P}-panel>
                </template>
            </div>
        </${P}-repeater>

    </div>
    <${P}-panel class="datacolumns-props" hide="{{ :host.readonly }}">
        <${P}-drag-drop mode="${Pacem.UI.DragDataMode.Copy}" disabled="{{ :host.readonly }}" handle-selector="*[handle]"
              drop-behavior="${Pacem.UI.DropBehavior.InsertChild}" drop-targets="{{ [::_dropTarget] }}" properties></${P}-drag-drop>
        <${P}-repeater datasource="{{ :host._columnifyMetadata(:host.properties) }}">
        <!-- properties -->
            <template>
                <${P}-panel behaviors="{{ [::_propDragger] }}" class="${PCSS}-panel panel-side-left side-auto panel-primary panel-filled ${PCSS}-margin margin-bottom-1">
                    <div class="panel-side">
                        <${P}-button class="display-block button-flat icon-glyph-small" icon-glyph="drag_indicator" handle></${P}-button>
                    </div>
                    <div class="text-truncate panel-body">
                        <${P}-span text="{{ ^item.header }}"></${P}-span>
                    </div>
                </${P}-panel>
            </template>
        </${P}-repeater>
    </${P}-panel>
</div>`
    })
    export class PacemDataColumnsElement extends Pacem.Components.Scaffolding.PacemBaseElement {

        @ViewChild(`${P}-repeater[columns]`) private _repeater: Pacem.Components.PacemRepeaterElement;
        @ViewChild(`${P}-drag-drop[properties]`) private _propDragger: Pacem.Components.PacemDragDropElement;
        @ViewChild(`${P}-drag-drop[columns]`) private _colDragger: Pacem.Components.PacemDragDropElement;
        @ViewChild('div[drop-target]') private _dropTarget: HTMLElement;

        @Watch({ converter: PropertyConverters.Json }) properties: Partial<Pacem.Scaffolding.PropertyMetadata>[];

        protected get inputFields(): HTMLElement[] {
            return [];
        }

        protected toggleReadonlyView(readonly: boolean): void {
            // leave it all to the template bindings
        }

        protected onChange(evt?: Event): PromiseLike<any> {
            return Utils.fromResult(this.value = this._repeater.datasource);
        }

        protected acceptValue(val: any) {
            if (!Utils.isNull(this._repeater)) {
                this._repeater.datasource = Utils.clone(val || []);
            }
        }

        protected getViewValue(value: any): string {
            return /* dummy */ '[DataColumns]';
        }

        protected convertValueAttributeToProperty(attr: string) {
            return PropertyConverters.Json.convert(attr, this);
        }

        private _dropHandler = (e) => {
            this.changeHandler(e);
        };

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._propDragger.addEventListener(Pacem.UI.DragDropEventType.End, this._dropHandler, false);
            this._colDragger.addEventListener(Pacem.UI.DragDropEventType.End, this._dropHandler, false);
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._propDragger)) {
                this._propDragger.removeEventListener(Pacem.UI.DragDropEventType.End, this._dropHandler, false);
            }
            if (!Utils.isNull(this._colDragger)) {
                this._colDragger.removeEventListener(Pacem.UI.DragDropEventType.End, this._dropHandler, false);
            }
            super.disconnectedCallback();
        }

        private _columnifyMetadata = (props = this.properties) => {
            return (props || []).map(p => {
                const c: Pacem.Cms.DataColumn = {
                    header: p.display?.name || p.prop,
                    content: `{{ ^item.${p.prop} }}`
                };
                return c;
            }).sort((a, b) => a.header > b.header ? 1 : -1);
        }

    }

}