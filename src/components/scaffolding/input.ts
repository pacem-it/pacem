/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    export enum ChangePolicy {
        Input = 'input',
        Blur = 'blur'
    }

    export abstract class PacemBaseInputElement extends PacemBaseElement {
        
        @Watch({
            emit: false, converter: {
                convert: (attr: string) => {
                    switch (attr) {
                        case 'true':
                            return true;
                        case 'false':
                            return false;
                        default:
                            return parseFloat(attr);
                    }
                },
                convertBack: (prop: any) => prop.toString()
            } }) debounce: number | boolean = false;
        @Watch({ emit: false, converter: PropertyConverters.String }) changePolicy: ChangePolicy = ChangePolicy.Input;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'placeholder':
                    this.inputField && this.inputField.setAttribute(name, val);
                    break;
            }
        }

        protected acceptValue(val) {
            if (this.inputField && val !== this.inputField.value) {
                this.inputField.value = Utils.isNullOrEmpty(val) ? '' : val;
            }
        }

        protected get inputField(): HTMLInputElement {
            return <HTMLInputElement>this.inputFields[0];
        }

        protected abstract getValue(value: string): any;

        private _handle: number;
        protected onChange(evt?: Event) {
            var deferred = DeferPromise.defer<any>();
            if (evt.type === 'input' && this.changePolicy === ChangePolicy.Blur)
                deferred.resolve(this.value);
            else {
                //
                const fn = () => {
                    const val = this.getValue(this.inputField.value);
                    if (val !== this.value) {
                        this.value = val;
                        // /* DO NOT MESS THE change EVENT DISPATCH */ this.dispatchEvent(new Event('change'));
                    }
                    deferred.resolve(val);
                }
                const d = this.debounce;
                if (typeof d === 'number' && d > 0) {
                    clearTimeout(this._handle);
                    this._handle = setTimeout(fn, d);
                } else if (d === true) {
                    cancelAnimationFrame(this._handle);
                    this._handle = requestAnimationFrame(fn);
                } else
                    requestAnimationFrame(fn);
            }
            return deferred.promise;
        };

        viewActivatedCallback() {
            super.viewActivatedCallback();
            let field = this.inputField;
            field.autocomplete = 'off';
            field.addEventListener('input', this.changeHandler, false);
        }

        disconnectedCallback() {
            let field = this.inputField;
            if (!Utils.isNull(field)) {
                field.removeEventListener('input', this.changeHandler, false);
            }
            super.disconnectedCallback();
        }
    }

    export abstract class PacemOrdinalInputElement extends PacemBaseInputElement {

        @Watch({ converter: PropertyConverters.Number }) min: any;
        @Watch({ converter: PropertyConverters.Number }) max: any;
        @Watch({ converter: PropertyConverters.Number }) step: any;

        protected convertValueAttributeToProperty(attr: string) {
            return parseFloat(attr);
        }

        propertyChangedCallback(name: string, old: any, val: any, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'min':
                case 'max':
                case 'step':
                    val != null ? this.inputField.setAttribute(name, val) : this.inputField.removeAttribute(name);
                    break;
            }
        }
    }

    export abstract class PacemTextualInputElement extends PacemBaseInputElement {

        @Watch({ converter: PropertyConverters.String}) pattern: string;
        @Watch({ converter: PropertyConverters.Number}) minlength: number;
        @Watch({ converter: PropertyConverters.Number }) maxlength: number;

        protected convertValueAttributeToProperty(attr: string) {
            return attr;
        }

        propertyChangedCallback(name: string, old: any, val: any, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'pattern':
                case 'maxlength':
                case 'minlength':
                    val != null ? this.inputField.setAttribute(name, val) : this.inputField.removeAttribute(name);
                    break;
            }
        }

        protected getValue(val: string): any {
            return val;
        }

        protected getViewValue(val: any): string {
            return val;
        }
    }

}