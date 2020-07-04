/// <reference path="../types.ts" />
namespace Pacem.Cms {

    export interface DataColumn {
        header: string,
        content: string,
        width?: number | 'auto'
    }

}

namespace Pacem.Components.Cms {

    const DATACOLUMN_METADATA: Pacem.Scaffolding.TypeMetadata = {
        display: { name: 'DataColumn' },
        props: [
            { prop: "header", type: "string", display: { name: "Header" } },
            { prop: "content", type: "string", display: { ui: "expression", name: "Content" }, extra: EXPRESSION_WIDGET_METADATA_EXTRA },
        ]
    };

    const DATAGRID_METADATA = buildWidgetMetadata({
        display: { icon: 'table_chart', name: 'DataGrid', description: 'DataGrid widget.' },
        props: [{
            prop: 'datasource', type: 'complex', display: { ui: 'expression', name: 'Datasource' },
            extra: Utils.extend({}, EXPRESSION_WIDGET_METADATA_EXTRA, { filter: (e: Element) => e instanceof PacemWidgetDataElement || e instanceof PacemWidgetFetchElement })
        },
        {
            prop: 'columns', type: 'array', display: { name: 'Columns' },
            // this will include 'datasource' as argument in the oneToMany source fn
            extra: { dependsOn: [{ prop: 'datasource', hide: true }] },
            props: gridifyMetadata(DATACOLUMN_METADATA)
        }]
    });

    const DATAGRID_HEADING_SEPARATOR = 'pacem-datagrid-heading';

    @CustomElement({
        tagName: P + '-widget-datagrid', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-repeater datasource="{{ :host.columns }}">
    <${P}-panel class="${PCSS}-datatable" css="{{ {'grid-template-columns': :host._gridify(:host.columns)} }}">
    <!--${DATAGRID_HEADING_SEPARATOR}-->
    <template>
        <${P}-panel class="${PCSS}-headcell" content="{{ ^item.header }}"></${P}-panel>
    </template>
</${P}-panel></${P}-repeater>`
    })
    export class PacemWidgetDataGridElement extends PacemUiWidgetElement {

        constructor() {
            super(DATAGRID_METADATA);
        }

        @Watch({ converter: PropertyConverters.Json }) columns: Pacem.Cms.DataColumn[] = [];

        @ViewChild('template') _template: HTMLTemplateElement;

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
            switch (name) {
                case 'columns':
                    this._setupHeadcells();
                case 'datasource':
                    break;
            }
        }

        private _setupHeadcells() {

        }

    }

}