/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    export abstract class PacemElementPickerElementBase extends PacemBaseElement {

        @Watch({ converter: PropertyConverters.String }) selector: string;

        @Watch({ converter: PropertyConverters.Eval }) filter: (e: Element) => boolean;

        @Watch({ converter: PropertyConverters.Eval }) labeler: (e: Element) => string;
    }

    @CustomElement({
        tagName: P + '-element-picker', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-select></${P}-select>`
    })
    export class PacemElementPickerElement extends PacemElementPickerElementBase {

        protected get inputFields(): HTMLElement[] {
            return [this._select];
        }

        protected toggleReadonlyView(readonly: boolean): void {
            this._select.readonly = readonly;
        }

        protected onChange(_?: Event): PromiseLike<any> {
            return Utils.fromResult(this.value = this._select.value);
        }

        protected acceptValue(val: any) {
            this._select.value = val;
        }

        protected getViewValue(value: any): string {
            return this._select.viewValue;
        }

        protected convertValueAttributeToProperty(attr: string) {
            return PropertyConverters.Element.convert(attr);
        }

        @ViewChild(P + '-select') private _select: PacemSelectElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._databind();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'selector':
                    case 'filter':
                    case 'labeler':
                        this._databind();
                        break;
                }
            }
        }

        @Debounce(50)
        private _databind() {
            const project: (e: Element) => string = this.labeler || (e => {
                let label = e.constructor.name;
                if (e.id) {
                    label += '#' + e.id;
                }
                return label;
            });
            const retval: { element: Element, label: string }[] = [];
            document.querySelectorAll(this.selector || '[pacem]').forEach((e, i, arr) => {
                if ((Utils.isNull(this.filter) || this.filter(e) === true)
                    // let' say 'id' is a must-have...
                    && !Utils.isNullOrEmpty(e.id)) {
                    retval.push({ element: e, label: project(e) });
                }
            });
            this._select.valueProperty = 'element';
            this._select.textProperty = 'label';
            this._select.datasource = retval;
        }
    }

}