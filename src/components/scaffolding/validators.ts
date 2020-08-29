/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    export interface Validator {

        invalid: boolean;
        validate: (val: any) => PromiseLike<boolean>;

    }

    export abstract class PacemBaseValidatorElement extends PacemFormRelevantElement implements Validator {

        constructor() {
            super();
        }

        @Watch({ converter: PropertyConverters.Boolean }) invalid: boolean;
        @Watch({ converter: PropertyConverters.String }) errorMessage: string;
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) watch: string;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            Utils.addClass(this, PCSS + '-validator');
        }

        propertyChangedCallback(name: string, old: any, val: any, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            let form = this.form;
            switch (name) {
                case 'watch':
                    old && form && form.unregisterValidator(val, this);
                    form && form.registerValidator(val, this);
                    break;
                case 'invalid':
                    break;
                case 'form':
                    let n = this.watch;
                    if (!Utils.isNullOrEmpty(n)) {
                        if (old != null) old.unregisterValidator(n, this);
                        if (val != null) val.registerValidator(n, this);
                    }
                    break;
                case 'disabled':
                    form && form.validate(this.watch);
                    break;
            }
        }

        validate(val: any): PromiseLike<boolean> {
            if (this.disabled) {
                return Utils.fromResult(true);
            }
            return this.evaluate(val);
        }

        protected abstract evaluate(val: any): PromiseLike<boolean>;
    }

    const BASIC_VALIDATOR_TEMPLATE = `<${P}-span hide="{{ !:host.invalid  }}" text="{{ :host.errorMessage }}"></${P}-span>`;

    // #region TEXTUAL

    function isValueEmpty(val: any) {
        return Utils.isNullOrEmpty(val);
    }

    @CustomElement({ tagName: P + '-required-validator', template: BASIC_VALIDATOR_TEMPLATE, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemRequiredValidatorElement extends PacemBaseValidatorElement {

        evaluate(val: any) {
            let retval = !isValueEmpty(val);
            return Utils.fromResult(retval);
        }
    }

    @CustomElement({ tagName: P + '-regex-validator', template: BASIC_VALIDATOR_TEMPLATE, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemRegexValidatorElement extends PacemBaseValidatorElement {

        @Watch({ converter: PropertyConverters.String }) pattern: string | RegExp;

        evaluate(val: any) {
            let retval = true,
                pattern = this.pattern;
            if (!isValueEmpty(val)) {

                retval = new RegExp(pattern).test(val);
            }
            return Utils.fromResult(retval);
        }

    }

    @CustomElement({ tagName: P + '-length-validator', template: BASIC_VALIDATOR_TEMPLATE, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemLengthValidatorElement extends PacemBaseValidatorElement {

        @Watch({ converter: PropertyConverters.Number }) min: number;
        @Watch({ converter: PropertyConverters.Number }) max: number;

        evaluate(val: any) {
            let retval = true;
            if (!isValueEmpty(val)) {
                if (this.min >= 0) retval = retval && (val || '').toString().length >= this.min;
                if (this.max >= 0) retval = retval && (val || '').toString().length <= this.max;
            }
            return Utils.fromResult(retval);
        }
    }

    // #endregion

    // #region NUMERIC/ORDINAL

    @CustomElement({ tagName: P + '-range-validator', template: BASIC_VALIDATOR_TEMPLATE, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemRangeValidatorElement extends PacemBaseValidatorElement {

        @Watch({ converter: PropertyConverters.Number }) min: any;
        @Watch({ converter: PropertyConverters.Number }) max: any;

        evaluate(val: any) {
            let retval = true;
            if (!isValueEmpty(val)) {
                let date = val;
                if (val instanceof Date || (typeof val !== 'number' && (date = Utils.parseDate(val)) instanceof Date && isFinite(date.valueOf()))) {

                    if (this.min != null)
                        retval = retval && date.valueOf() >= Utils.parseDate(this.min).valueOf();

                    if (this.max != null)
                        retval = retval && date.valueOf() <= Utils.parseDate(this.max).valueOf();


                } else {

                    if (this.min != null)
                        retval = retval && val >= this.min;

                    if (this.max != null)
                        retval = retval && val <= this.max;
                }


            }
            return Utils.fromResult(retval);
        }
    }

    // #endregion

    // #region COMPLEX

    @CustomElement({ tagName: P + '-compare-validator', template: BASIC_VALIDATOR_TEMPLATE, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemCompareValidatorElement extends PacemBaseValidatorElement {

        @Watch({ converter: PropertyConverters.String }) operator: 'equal' | 'lessOrEqual' | 'less' | 'greater' | 'greaterOrEqual' | 'notEqual';
        @Watch({ reflectBack: true }) to: any;

        evaluate(val: any) {
            let retval = true,
                other = this.to;
            if (!isValueEmpty(val) && !isValueEmpty(other)) {
                switch (this.operator) {
                    case 'lessOrEqual':
                        retval = val <= other;
                        break;
                    case 'less':
                        retval = val < other;
                        break;
                    case 'greaterOrEqual':
                        retval = val >= other;
                        break;
                    case 'greater':
                        retval = val > other;
                        break;
                    case 'notEqual':
                        retval = val !== other;
                        break;
                    default:
                        retval = val === other;
                        break;
                }
            }
            return Utils.fromResult(retval);
        }

    }

    // #endregion

    @CustomElement({ tagName: P + '-binary-validator', template: BASIC_VALIDATOR_TEMPLATE, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemBinaryValidatorElement extends PacemBaseValidatorElement {

        @Watch({ converter: PropertyConverters.String }) pattern: string | RegExp;
        @Watch({ converter: PropertyConverters.String }) maxSize: number;

        protected evaluate(val: string | BinaryValue): PromiseLike<boolean> {
            let retval = true,
                pattern = this.pattern,
                maxSize = this.maxSize;
            if (!isValueEmpty(val)) {

                // file name
                if (!Utils.isNullOrEmpty(pattern)) {
                    let filename = typeof val === 'string' ? val : val.name;
                    retval = new RegExp(pattern, 'i').test(filename);
                }

                // max size
                if (!Utils.isNull(maxSize) && typeof val === 'object' && val.size > 0) {
                    retval = retval && val.size <= maxSize;
                }
            }
            return Utils.fromResult(retval);
        }
    }

    @CustomElement({
        tagName: P + '-async-validator',
        template: BASIC_VALIDATOR_TEMPLATE + `<${P}-fetch autofetch="false" credentials="{{ :host.fetchCredentials }}" headers="{{ :host.fetchHeaders }}"></${P}-fetch>`, shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemAsyncValidatorElement extends PacemBaseValidatorElement implements Pacem.Net.OAuthFetchable {

        private _fetch(val: any): PromiseLike<boolean> {
            const deferred = this._deferredToken;
            const fetcher = this._fetcher;
            var params = this.parameters || {};
            params[this.watch] = val;
            fetcher.parameters = params;
            fetcher.url = this.url;
            fetcher.as = 'text';
            fetcher.method = this.method;

            // debounce
            clearTimeout(this._debouncer);
            this._debouncer = setTimeout(
                () => {
                    fetcher.fetch().then(_ => {

                        const result: string = fetcher.result;
                        switch (result) {
                            case 'true':
                                deferred.resolve(true);
                                break;
                            case 'false':
                                deferred.resolve(false);
                                break;
                            default: // expect json
                                try {
                                    let json = JSON.parse(result);
                                    let res = Utils.getApiResult(json);
                                    deferred.resolve(res || false);
                                } catch{
                                    deferred.resolve(false);
                                }
                                break;
                        }
                    }, _ => {
                        deferred.resolve(false);
                    });

                }
                , 1000
            );
            return deferred.promise;
        }

        private _debouncer: number;
        private _deferredToken = null;

        evaluate(val: any): PromiseLike<boolean> {

            if (Utils.isNullOrEmpty(val)) {

                return Utils.fromResult(true);

            } else {

                this._deferredToken = this._deferredToken = DeferPromise.defer<boolean>();
                return this._fetch(val).then(r => {
                    this._deferredToken = null;
                    return r;
                }, _ => {
                    this._deferredToken = null;
                    return false;
                });

            }

        }

        @Watch({ emit: false, converter: PropertyConverters.Json }) parameters: string;
        @Watch({ emit: false, converter: PropertyConverters.Json }) fetchCredentials: RequestCredentials;
        @Watch({ emit: false, converter: PropertyConverters.Json }) fetchHeaders: { [key: string]: string };
        @Watch({ emit: false, converter: PropertyConverters.String }) url: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) method: Pacem.Net.HttpMethod;

        @ViewChild(P + '-fetch') private _fetcher: PacemFetchElement;

    }
}