/// <reference path="../types.ts" />
/// <reference path="../../scaffolding/datacolumns.ts" />

namespace Pacem.Components.Cms {

    const DATACOLUMN_METADATA: Pacem.Scaffolding.TypeMetadata = {
        display: { name: 'DataColumn' },
        props: [
            { prop: "header", type: "string", display: { name: "Header" } },
            { prop: "content", type: EXPRESSION_METADATA_TYPE, display: { name: "Content" }, extra: EXPRESSION_WIDGET_METADATA_EXTRA },
        ]
    };

    const DATAGRID_METADATA = buildWidgetMetadata({
        display: { icon: 'table_chart', name: 'DataGrid', description: 'DataGrid widget.' },
        props: [{
            prop: 'datasource', type: EXPRESSION_METADATA_TYPE, display: { name: 'Datasource' },
            extra: Utils.extend({}, EXPRESSION_WIDGET_METADATA_EXTRA, { filter: (e: Element) => e instanceof PacemWidgetDataElement || e instanceof PacemWidgetFetchElement })
        },
        {
            prop: 'columns', type: DATACOLUMNS_METADATA_TYPE, display: { name: 'Columns' },
            // this will include 'datasource' as argument in the oneToMany source fn
            extra: { properties: 'datarowMetadata' },
            props: gridifyMetadata(DATACOLUMN_METADATA)
        }]
    });

    const DATAGRID_HEADING_SEPARATOR = 'pacem-widget-datagrid-heading';

    function gridify(columns: Pacem.Cms.DataColumn[] = []): string {
        var output = '';
        for (let column of columns || []) {
            // if empty then 1fr
            const col = column.width || 1;
            if (typeof col === 'number') {
                output += col + 'fr ';
            } else {
                output += 'auto ';
            }
        }
        return output;
    }

    function datagridFragments(columns: Pacem.Cms.DataColumn[] = []) {

        const
            fragHeading = document.createDocumentFragment(),
            fragBody = document.createDocumentFragment();
        let j = 1;
        for (let col of columns) {

            // heading
            const headcell = document.createElement('div');
            headcell.classList.add(PCSS + '-headcell');
            headcell.textContent = col.header;
            fragHeading.appendChild(headcell);

            // body
            const datacell = new Pacem.Components.PacemSpanElement();
            datacell.classList.add(PCSS + '-datacell', 'datacell-corners');
            datacell.style.gridColumn = j.toString();
            datacell.setAttribute('css', "{{ {'grid-row': ^index+2} }}");
            datacell.setAttribute('content', col.content);
            fragBody.appendChild(datacell);

            j++;
        }

        const datarow = new Pacem.Components.PacemPanelElement();
        datarow.classList.add(PCSS + '-datarow');
        datarow.setAttribute('css', "{{ {'grid-row': ^index+2} }}");
        datarow.setAttribute('css-class', "{{ {'datarow-alt': ^index % 2 === 1} }}");
        datarow.style.gridColumn = "1/" + (columns.length + 1);
        fragBody.appendChild(datarow);

        return { head: fragHeading, body: fragBody };
    }

    function datagridInnerHTML(id: string, columns: Pacem.Cms.DataColumn[] = []) {
        const { head, body } = datagridFragments(columns);

        const head0 = document.createElement('div');
        head0.appendChild(head);
        const body0 = document.createElement('div');
        body0.appendChild(body);

        return `<${P}-repeater datasource="{{ #${id}.datasource }}">
    <div class="${PCSS}-datatable" style="grid-template-columns: ${gridify(columns)}">
    ${ head0.innerHTML}
    <template>${ body0.innerHTML }</template>
</div></${P}-repeater>`;
    }

    @CustomElement({
        tagName: P + '-widget-datagrid'
    })
    export class PacemWidgetDataGridElement extends PacemUiWidgetElement {

        constructor() {
            super(DATAGRID_METADATA);
        }

        @Watch({ reflectBack: true, converter: PropertyConverters.Json }) columns: Pacem.Cms.DataColumn[] = [];
        @Watch({ converter: PropertyConverters.Json }) datasource: any[] = [];
        @Watch({ converter: PropertyConverters.Json }) datarowMetadata: Partial<Pacem.Scaffolding.PropertyMetadata>[] = [];

        @ViewChild(`.${PCSS}-datatable`) _datatable: HTMLElement;
        @ViewChild('template') _template: HTMLTemplateElement;
        @ViewChild(P + '-repeater') _repeater: PacemRepeaterElement;

        private _gridify(columns: Pacem.Cms.DataColumn[] = this.columns): string {
            var output = '';
            for (let column of columns || []) {
                // if empty then 1fr
                const col = column.width || 1;
                if (typeof col === 'number') {
                    output += col + 'fr ';
                } else {
                    output += 'auto ';
                }
            }
            return output;
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'columns':
                        /*
                         * 
                         * TODO: manage columns separately!
                         * Create an ad-hoc editor/formfield and a dedicated form
                         * 
                         * */
                        this.innerHTML = datagridInnerHTML(this.id, val);
                        break;
                    case 'datasource':
                        this._extractMetadataJustInCase(val);
                        break;
                }
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.innerHTML = datagridInnerHTML(this.id, this.columns);
        }

        private _seekArray(ds: any): any[] {
            if (Utils.isArray(ds)) {
                return ds;
            }
            if (typeof ds === 'object') {
                for (let prop in ds) {
                    const arr = this._seekArray(ds[prop]);
                    if (!Utils.isNull(arr)) {
                        return arr;
                    }
                }
            }
            return null;
        }

        private _builtUponDatasource = false;
        private _extractMetadataJustInCase(ds = this.datasource) {
            if ((Utils.isNullOrEmpty(this.datarowMetadata) || this._builtUponDatasource) && !Utils.isNullOrEmpty(ds)) {
                const arr = this._seekArray(ds);
                if (!Utils.isNullOrEmpty(arr)) {
                    const props: Partial<Pacem.Scaffolding.PropertyMetadata>[] = [];
                    const item = arr[0];
                    for (let prop in item) {
                        props.push({ prop, type: typeof item[prop] });
                    }
                    this.datarowMetadata = props;
                    this._builtUponDatasource = true;
                }
            }
        }
    }

}