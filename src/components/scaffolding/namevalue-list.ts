namespace Pacem.Components.Scaffolding {

    const ITEM_TXT_CORE = `change-policy="${ChangePolicy.Blur}" readonly="{{ :host.readonly }}"`;

    type NameValuePair = {
        name: string,
        value: string
    };

    function isEmpty(nvp: NameValuePair) {
        return Utils.isNullOrEmpty(nvp && nvp.name);
    }

    function pullEmpty(): NameValuePair {
        return { name: '', value: '' };
    }

    @CustomElement({
        tagName: P + '-namevalue-list', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-repeater datasource="{{ :host._bag }}" on-itemdelete=":host._deleteAt($event)">
    <template>
        <div class="${PCSS}-fieldset ${PCSS}-margin margin-bottom-1">
            <div class="fieldset-auto">
                <div class="${PCSS}-fieldgroup">
                    <${P}-input-text ${ITEM_TXT_CORE} value="{{ ^item.name, twoway }}" on-change=":host.changeHandler($event)"></${P}-input-text>
                    <div class="fieldgroup-prepend"></div>
                </div>
                <div class="${PCSS}-fieldgroup">
                    <${P}-input-text ${ITEM_TXT_CORE} value="{{ ^item.value, twoway }}" on-change=":host.changeHandler($event)"></${P}-input-text>
                    <div class="fieldgroup-append">
                        <${P}-button class="${PCSS}-cell cols-2 flat delete" hide="{{ :host.readonly }}" command-name="delete" command-argument="{{ ^index }}"></${P}-button>
                    </div>
                </div>
            </div>
        </div>
    </template>
    <${P}-button class="flat add" hide="{{ :host.readonly }}" on-click=":host._addItem($event)"></${P}-button>
</${P}-repeater>`
    })
    export class PacemNameValueListElement extends PacemBaseElement {

        protected inputFields: HTMLElement[] = [];

        protected toggleReadonlyView(readonly: boolean): void {
            // let the bindings do their job...
        }

        protected onChange(evt?: Event): PromiseLike<any> {
            return new Promise((resolve, reject) => {

                let val = this._bagToValue(this._bag);
                if (!this.compareValuePropertyValues(val, this.value)) {
                    resolve(this.value = val);
                } else {
                    reject();
                }

            });
        }

        protected acceptValue(val: any) {

            this._bag = this._valueToBag(val);

        }

        protected getViewValue(value: any): string {
            return ''; // unneeded
        }


        protected compareValuePropertyValues(old, val): boolean {
            return Utils.Json.stringify(old) === Utils.Json.stringify(val);
        }

        protected convertValueAttributeToProperty(attr: string) {
            return PropertyConverters.Json.convert(attr);
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'dictionary' && !first) {
                this.value = this._bagToValue();
            }
        }

        /** Gets or sets whether the names should be unique */
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) dictionary: boolean;

        @Watch({ converter: PropertyConverters.Json }) private _bag: NameValuePair[] = [];

        private _bagToValue(bag = this._bag): {} {
            if (!this.dictionary) {

                // not a dictionary
                // return an array
                let b: NameValuePair[] = [];
                for (let item of bag || []) {
                    if (isEmpty(item)) {
                        continue;
                    }
                    if (b.find(i => i.name === item.name && i.value === item.value)) {
                        continue;
                    }
                    b.push(item);
                }
                return b;

            }

            // dictionary
            // return an object
            let v = {};
            for (let kvp of bag || []) {
                if (kvp.name in v) {
                    // skip existing names...
                    continue;
                }
                v[kvp.name] = kvp.value;
            }
            return v;
        }

        private _valueToBag(val = this.value): NameValuePair[] {
            const bag: NameValuePair[] = [];

            if (!Utils.isNullOrEmpty(val) && typeof val === 'object') {

                if (this.dictionary && !Utils.isArray(val)) {
                    for (let prop in val) {
                        bag.push({ name: prop, value: val[prop] });
                    }
                } else if (!this.dictionary && Utils.isArray(val)) {
                    Array.prototype.splice.apply(bag, [0, 0].concat(val.map(i => Utils.clone(i))));
                }
            }

            return !Utils.isNullOrEmpty(bag) ? bag : [pullEmpty()];
        }

        private _deleteAt(evt: DeleteItemCommandEvent) {
            this._bag.splice(evt.detail, 1);
            this.changeHandler(evt);
        }

        private _addItem(evt: Event) {
            const bag = this._bag,
                lastItem = this._bag[this._bag.length - 1];
            if (!isEmpty(lastItem)) {
                bag.push(pullEmpty());
            }
        }
    }

}