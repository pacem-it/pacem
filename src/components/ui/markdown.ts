/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="markdown-svc.ts" />
namespace Pacem.Components.UI {

    @CustomElement({ tagName: P + '-markdown' })
    export class PacemMarkdownElement extends PacemElement {

        constructor(private _md = new MarkdownService()) {
            super();
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) value: string;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'value') {
                this.innerHTML = this.html();
            }
        }

        // IDEA: allow extensible parsing (grammar components?...)

        tokens(md = this.value): any[] {
            return this._md.tokenize(md);
        }

        html(md = this.value): string {
            return this._md.toHtml(md);
        }
    }

}