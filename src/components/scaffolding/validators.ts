/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    export interface Validator {

        invalid: boolean;
        evaluate: (val: any) => PromiseLike<boolean>;

    }

    export abstract class PacemBaseValidatorElement extends PacemFormRelevantElement implements OnViewActivated, OnPropertyChanged, Validator {

        constructor() {
            super();
        }

        @Watch({ converter: PropertyConverters.Boolean }) invalid: boolean;
        @Watch({ converter: PropertyConverters.String }) errorMessage: string;
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) watch: string;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            Utils.addClass(this, 'pacem-validator');
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
            }
        }

        abstract evaluate(val: any): PromiseLike<boolean>;
    }

    const BASIC_VALIDATOR_TEMPLATE = `<pacem-span hide="{{ !:host.invalid  }}" text="{{ :host.errorMessage }}"></pacem-span>`;

    // #region TEXTUAL

    function isValueEmpty(val: any) {
        return Utils.isNullOrEmpty(val);
    }

    @CustomElement({ tagName: 'pacem-required-validator', template: BASIC_VALIDATOR_TEMPLATE, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemRequiredValidatorElement extends PacemBaseValidatorElement {

        evaluate(val: any) {
            let retval = !isValueEmpty(val);
            return Utils.fromResult(retval);
        }
    }

    @CustomElement({ tagName: 'pacem-regex-validator', template: BASIC_VALIDATOR_TEMPLATE, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemRegexValidatorElement extends PacemBaseValidatorElement {

        @Watch({ converter: PropertyConverters.String }) pattern: string | RegExp;

        evaluate(val: any) {
            let retval = true,
                pattern = this.pattern;
            if (!isValueEmpty(val)) {
                if (pattern instanceof RegExp)
                    retval = pattern.test(val);
                else if (!isValueEmpty(pattern)) {
                    retval = new RegExp(pattern).test(val);
                }
            }
            return Utils.fromResult(retval);
        }

    }

    @CustomElement({ tagName: 'pacem-length-validator', template: BASIC_VALIDATOR_TEMPLATE, shadow: Defaults.USE_SHADOW_ROOT })
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

    @CustomElement({ tagName: 'pacem-range-validator', template: BASIC_VALIDATOR_TEMPLATE, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemRangeValidatorElement extends PacemBaseValidatorElement {

        @Watch({ converter: PropertyConverters.Number }) min: any;
        @Watch({ converter: PropertyConverters.Number }) max: any;

        evaluate(val: any) {
            let retval = true;
            if (!isValueEmpty(val)) {
                let date = val;
                if (val instanceof Date || ((date = Utils.parseDate(val)) instanceof Date && isFinite(date.valueOf()))) {

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

    @CustomElement({ tagName: 'pacem-compare-validator', template: BASIC_VALIDATOR_TEMPLATE, shadow: Defaults.USE_SHADOW_ROOT })
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

    @CustomElement({
        tagName: 'pacem-async-validator',
        template: BASIC_VALIDATOR_TEMPLATE + `<pacem-fetch></pacem-fetch>`, shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemAsyncValidatorElement extends PacemBaseValidatorElement {

        evaluate(val: any): PromiseLike<boolean> {
            const fetcher = this._fetcher;
            var deferred = DeferPromise.defer<boolean>();
            // else
            let fn = (evt: PropertyChangeEvent) => {
                if (evt.detail.propertyName === 'result') {
                    fetcher.removeEventListener(PropertyChangeEventName, fn, false);
                    var result = evt.detail.currentValue;
                    if (typeof (result) === 'object' && (<object>result).hasOwnProperty('success')) {
                        if (result.success === true) {
                            deferred.resolve(result.result || false);
                        } else {
                            this.log(Logging.LogLevel.Error, result.error)
                            deferred.resolve(false);
                        }
                    } else {
                        deferred.resolve(result === true);
                    }
                }
            };
            fetcher.addEventListener(PropertyChangeEventName, fn, false);
            var params = {};
            params[this.watch] = val;
            fetcher.parameters = params;
            fetcher.url = this.url;
            return deferred.promise;
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) url: string;
        @ViewChild('pacem-fetch') _fetcher: Net.Fetcher;

    }
}