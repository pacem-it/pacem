/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-pager', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${ P }-repeater class="${PCSS}-pager"><div class="${PCSS}-buttonset">
<div class="pager-buttons">
    <template>
        <${ P }-button class="${PCSS}-page button" on-click=":host.index = ^item.index" disabled="{{ ^item.disabled }}"
    css-class="{{ { 'currentpage': ^item.index === :host.index, 'firstpage buttonset-first': ^item.first, 'previouspage': ^item.previous, 'nextpage': ^item.next, 'lastpage buttonset-last': ^item.last } }}"><${ P }-span content="{{ ^item.caption }}"></${ P }-span></${ P }-button>
    </template>
</div>
</div></${ P }-repeater>`
    })
    export class PacemPagerElement extends PacemElement {

        @ViewChild(P + '-repeater') private _repeater: PacemRepeaterElement;

        @Watch({ converter: PropertyConverters.Number }) index: number;
        @Watch({ converter: PropertyConverters.Number, emit: false }) total: number;
        @Watch({ converter: PropertyConverters.Number, emit: false }) pages: number;
        @Watch({ converter: PropertyConverters.Number, emit: false }) size: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'index':
                case 'total':
                case 'pages':
                case 'size':
                    this._databind();
                    break;
            }
        }

        @Debounce(true)
        private _databind() {
            const repeater = this._repeater;
            if (Utils.isNull(repeater))
                return;
            //
            var datasource: { caption: string, index: number, first?: boolean, previous?: boolean, next?: boolean, last?: boolean, disabled?: boolean }[] = [];
            const size = this.size || 10,
                pages = this.pages || 5,
                total = this.total || 0, index = this.index || 0;
            if (total > 0) {
                let totpages = Math.ceil(total / size);
                let pageindex = Math.floor(index / size);
                let startpageindex = Math.max(0, Math.ceil(pageindex - pages / 2));
                let endpageindex = Math.min(totpages - 1, startpageindex + pages - 1);
                while (startpageindex > 0 && (1 + endpageindex - startpageindex) < pages) {
                    startpageindex--;
                }
                // |<
                datasource.push({ caption: '&laquo;', index: 0, first: true, disabled: !(/*start*/pageindex > 0) });
                // <
                datasource.push({ caption: '&lt;', index: size * (pageindex - 1), previous: true, disabled: !(pageindex > 0) });
                // ...
                if (startpageindex > 0) {
                    datasource.push({ caption: '&hellip;', index: size * (startpageindex - 1) });
                }
                // #
                for (let j = startpageindex; j <= endpageindex; j++) {
                    datasource.push({ caption: (j + 1).toLocaleString(Utils.lang(this)), index: j * size });
                }
                // ...
                if (endpageindex < (totpages - 1)) {
                    datasource.push({ caption: '&hellip;', index: size * (endpageindex + 1) });
                }
                // >
                datasource.push({ caption: '&gt;', index: size * (pageindex + 1), next: true, disabled: !(pageindex < (totpages - 1)) });
                // >|
                datasource.push({ caption: '&raquo;', index: size * (totpages - 1), last: true, disabled: !(/*end*/pageindex < (totpages - 1)) });
                // 
                this.index = pageindex * size;
            }
            repeater.datasource = datasource;
        }
    }

}