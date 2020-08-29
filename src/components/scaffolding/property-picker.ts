/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: P + '-property-picker', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-select></${P}-select>`
    })
    export class PacemPropertyPickerElement extends PacemBaseElement {

        protected get inputFields(): HTMLElement[] {
            return [this._select];
        }

        protected toggleReadonlyView(readonly: boolean): void {
            this._select.readonly = readonly;
        }

        protected onChange(evt?: Event): PromiseLike<any> {
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

        @Watch({ converter: PropertyConverters.Element }) target: HTMLElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._databind();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'target':
                        this._databind();
                        break;
                }
            }
        }

        private _databind() {

            const props: string[] = [],
                // recursive fn
                fnRec = (container, prop: string, name: string) => {
                    const val = container[prop];
                    if (typeof val === 'object' && val != null && !Utils.isArray(val)) {
                        for (let key of Object.keys(val)) {

                            const fullName = name + '.' + key;

                            // add nested
                            props.push(fullName);

                            // try again (recursively)
                            fnRec(val, key, fullName);
                        }
                    }
                }

            let src = this.target;
            if (!Utils.isNull(src)) {
                let observed = CustomElementUtils.getWatchedProperties(src);

                for (let obs of observed) {
                    let name = obs.name;

                    // add straight
                    props.push(name);

                    // dig nested stuff
                    fnRec(src, name, name);
                }
            }
            this._select.datasource = props.sort();
        }
    }

}