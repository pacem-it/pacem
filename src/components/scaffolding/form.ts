/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Scaffolding {

    export declare type FormSubmitEventArgs = {
        parameters: { [key: string]: any },
        fields: { [key: string]: PacemModel }
    };

    export const FormSubmitEventName = 'submit';

    export class FormSubmitEvent extends CustomTypedEvent<FormSubmitEventArgs> {

        constructor(args: FormSubmitEventArgs) {
            super(FormSubmitEventName, args, { bubbles: true, cancelable: true });
        }

    }

    const SUBMIT_CANCELLATION_TOKEN = false;

    @CustomElement({ tagName: P + '-form' })
    export class PacemFormElement extends PacemFormRelevantElement implements Pacem.Net.OAuthFetchable {

        @Watch({ emit: false, converter: PropertyConverters.String }) fetchCredentials: RequestCredentials;
        @Watch({ emit: false, converter: PropertyConverters.Json }) fetchHeaders: { [key: string]: string; };

        constructor() {
            super('form');
        }

        propertyChangedCallback(name: string, old: any, val: any, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if ((name === 'metadata' && this.autogenerate === true) ||
                (name === 'autogenerate' && val === true && this.metadata && (this.metadata['props'] || this.metadata).length > 0)) {
                this._buildUpForm();
            } else {
                switch (name) {
                    case 'readonly':
                        //this._lockSubForms(val);
                        break;
                }
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.form && this.form.registerSubForm(this);
            this._checkValidity();

            this.addEventListener('keyup', this._keyupHandler, false);
        }

        disconnectedCallback() {

            this.removeEventListener('keyup', this._keyupHandler, false);

            this.form && this.form.unregisterSubForm(this);
            super.disconnectedCallback();
        }

        @Debounce(100)
        private _buildUpForm() {
            const key = '_' + Pacem.Utils.uniqueCode();
            const uid = this.id = (this.id || key);
            const f_uid = 'fetch' + key;
            //
            const form = document.createElement('form');
            form.id = "frm_" + uid;
            form.className = PCSS + '-form';
            form.setAttribute('pacem', '');
            form.setAttribute('novalidate', '');
            const html = `<${P}-repeater class="${PCSS}-animatable-list ${PCSS}-list-bottom" datasource="{{ #${uid}.metadata && (#${uid}.metadata.props || #${uid}.metadata) }}">
    <${P}-panel css="{{ #${uid}.metadata.css }}" css-class="{{ #${uid}.metadata.cssClass }}">
        <template>
            <${P}-form-field css-class="{{ ^item.display && ^item.display.cssClass }}" css="{{ ^item.display && ^item.display.css }}"
                             fetch-credentials="{{ #${uid}.fetchCredentials }}" fetch-headers="{{ #${uid}.fetchHeaders }}"
                             logger="{{ #${uid}.logger }}" entity="{{ #${uid}.entity, twoway }}" metadata="{{ ^item }}" readonly="{{ #${uid}.readonly }}"></${P}-form-field>
        </template>
    </${P}-panel>
</${P}-repeater>
<${P}-fetch logger="{{ #${uid}.logger }}" id="${f_uid}" method="${Pacem.Net.HttpMethod.Post}" credentials="{{ #${uid}.fetchCredentials }}" headers="{{ #${uid}.fetchHeaders }}"></${P}-fetch> 
<${P}-button logger="{{ #${uid}.logger }}" on-click="#${uid}._submit(#${f_uid}, $event)" type="submit" hide="{{ #${uid}.readonly || Pacem.Utils.isNullOrEmpty(#${uid}.action) || !Pacem.Utils.isNull(#${uid}.form) }}" class="button primary" disabled="{{ !(#${uid}.valid && #${uid}.dirty) || #${f_uid}.fetching }}">Ok</${P}-button>
<${P}-button logger="{{ #${uid}.logger }}" on-click="#${uid}._reset($event)" type="reset" class="button" hide="{{ #${uid}.readonly || !#${uid}.dirty || !Pacem.Utils.isNull(#${uid}.form) }}" disabled="{{ #${f_uid}.fetching }}">Reset</${P}-button>`;
            // buttons are kept hidden if 
            form.innerHTML = html;
            this.innerHTML = '';
            this.appendChild(form);
            form.addEventListener('submit', Pacem.avoidHandler, false);
        }

        private _keyupHandler = (evt: KeyboardEvent) => {
            if (evt.keyCode === 13) {
                let btn: Pacem.Components.UI.PacemButtonElement = (<HTMLFormElement>evt.currentTarget).querySelector(P + '-button[type=submit]');
                if (!Utils.isNull(btn) && Utils.isVisible(btn) && !btn.disabled) {
                    btn.click();
                }
            }
        };

        private _submit = (fetcher: Pacem.Components.PacemFetchElement, evt?: Event) => {
            if (!Utils.isNull(evt))
                Pacem.avoidHandler(evt);
            var args =
                this.submit(fetcher).then(_ => {
                    // successful submission here
                    this.setPristine();
                },
                    _ => {
                        // catch rejected/canceled
                    });
        }

        /**
         * Submits the form data via a provided fetcher.
         * @param fetcher The fetching delegate.
         */
        submit(fetcher: Pacem.Net.Fetcher): PromiseLike<any> {
            if (Utils.isNull(fetcher))
                throw `Fetcher cannot be null while submitting a form.`;
            var deferred = DeferPromise.defer();
            this._submitInternally(fetcher).then(_ => {
                this.dispatchEvent(new CustomEvent("success", { detail: _ }));
                deferred.resolve(_);
            }, _ => {
                if (_ !== SUBMIT_CANCELLATION_TOKEN) {
                    this.dispatchEvent(new CustomEvent("fail", { detail: _ }));
                }
                deferred.reject(_);
            });
            return deferred.promise;
        }

        /** Resets the form to its pristine values. */
        reset() {
            this._reset();
        }

        private _submitInternally(fetcher: Pacem.Net.Fetcher, args?: FormSubmitEventArgs): PromiseLike<any> {
            if (Utils.isNull(fetcher))
                throw `Fetcher cannot be null while submitting a form.`;

            var deferred = DeferPromise.defer();

            const entity = this.entity,
                entityName = this.entityName;
            var model = {};
            if (!Utils.isNullOrEmpty(entityName)) {
                model[entityName] = entity;
            } else {
                model = entity;
            }

            var args: FormSubmitEventArgs = { parameters: model, fields: this._getAllFields() };
            // allow to inject some logic while submitting...
            var submitEvt = new FormSubmitEvent(args);
            this.dispatchEvent(submitEvt);
            if (submitEvt.defaultPrevented) {

                // rejection using `false` identifies a canceled submission.
                deferred.reject(SUBMIT_CANCELLATION_TOKEN);

            } else {
                // ...use the output parameters
                fetcher.parameters = Utils.extend({}, submitEvt.detail.parameters);
                // fetcher fetchresult event listener
                const fnResult = (evt: CustomEvent) => {
                    // remove listeners
                    fetcher.removeEventListener(Pacem.Net.FetchResultEventName, fnResult, false);
                    fetcher.removeEventListener(Pacem.Net.FetchErrorEventName, fnError, false);
                    //
                    var result = evt.detail;
                    if (typeof (result) === 'object' && (<object>result).hasOwnProperty('success')) {
                        if (result.success === true) {
                            this.success = true;
                            deferred.resolve(result.result || {});
                        } else {
                            this.fail = true;
                            deferred.reject(result.error);
                        }
                    } else {
                        this.success = true;
                        deferred.resolve(result);
                    }
                }
                // fetcher error event listener
                const fnError = (evt: CustomEvent) => {
                    // remove listeners
                    fetcher.removeEventListener(Pacem.Net.FetchResultEventName, fnResult, false);
                    fetcher.removeEventListener(Pacem.Net.FetchErrorEventName, fnError, false);
                    this.fail = true;
                    const response = evt.detail;
                    deferred.reject(response.statusText);
                };
                // fetcher propertychange event listener
                const fnPropChange = (evt: PropertyChangeEvent) => {
                    switch (evt.detail.propertyName) {
                        case 'fetching':
                            if (evt.detail.currentValue === true) {
                                Utils.addClass(this, PCSS + '-fetching');
                            } else {
                                Utils.removeClass(this, PCSS + '-fetching');
                                fetcher.removeEventListener(Pacem.PropertyChangeEventName, fnPropChange, false);
                            }
                            break;
                    }
                };
                fetcher.addEventListener(Pacem.PropertyChangeEventName, fnPropChange, false);
                fetcher.addEventListener(Pacem.Net.FetchResultEventName, fnResult, false);
                fetcher.addEventListener(Pacem.Net.FetchErrorEventName, fnError, false);
                if (!Utils.isNullOrEmpty(this.action)) {
                    fetcher.url = this.action;
                }
                this.success = this.fail = false;
            }
            //
            return deferred.promise;
        }

        private _getAllFields(accumulator: { [name: string]: PacemModel } = {}) {

            Utils.extend(accumulator, this._fields);

            for (var form of this._subForms) {
                form._getAllFields(accumulator);
            }

            return accumulator;
        }

        private _reset = (evt?: Event) => {
            if (!Utils.isNull(evt))
                Pacem.avoidHandler(evt);
            for (var field in this._fields) {
                var fld = this._fields[field];
                if (fld instanceof PacemModelElement)
                    fld.reset();
            }
            for (var form of this._subForms) {
                form._reset();
            }
        };

        /** Sets the current form state as its pristine state. */
        setPristine() {
            for (var field in this._fields) {
                var fld = this._fields[field];
                if (fld instanceof PacemModelElement)
                    fld.setPristine();
            }
            for (var form of this._subForms) {
                form.setPristine();
            }
        }

        private _fields: { [name: string]: PacemModel } = {};
        private _validators: { [name: string]: Validator[] } = {};
        private _subForms: PacemFormElement[] = [];

        private _fieldPropertyChanged = (evt?: PropertyChangeEvent) => {
            switch (evt.detail.propertyName) {
                case 'value':
                    // validate:
                    let model = <PacemModelElement>evt.target;
                    this._checkFieldValidity(model.name);
                    break;
                case 'dirty':
                    this._checkDirtyness();
                    break;
                case 'valid':
                    this._checkValidity();
                    break;
            }
        };

        private _validatorPropertyChanged = (evt?: PropertyChangeEvent) => {
            const validator = <PacemBaseValidatorElement>evt.target,
                name = validator.watch;
            if (evt.detail.propertyName === 'invalid') {
                let model = this._fields[validator.watch];
                if (validator.invalid)
                    model.valid = false;
                else
                    this._checkFieldValidity(name);
            } else {
                this._checkFieldValidity(name);
            }
        };

        private _checkFieldValidity(name) {
            if (name in this._fields)
                this._validateField(name);
        }

        // Remove Concurrent from here, better check the closure for params in @Concurrent
        //@Concurrent()
        private _validateField(name: string) {
            var deferred = DeferPromise.defer<boolean>();
            var model: PacemModel = this._fields[name];
            if (model) {
                var validators = this._validators[model.name];
                if (validators && validators.length > 0) {
                    this.log(Logging.LogLevel.Log, `Computing "${model.name}" validity.`);
                    Promise.all(
                        validators.map(v => v.validate(model.value)
                            .then(_ => !(v.invalid = !_))
                        )
                    )
                        .then(results => {
                            let valid = true;
                            for (var result of results) {
                                if (result === false) {
                                    valid = false;
                                    break;
                                }
                            }
                            this.log(Logging.LogLevel.Log, `Property "${model.name}" turns out to be ${(valid ? '' : 'not ')}valid.`);
                            deferred.resolve(model.valid = valid);
                        });
                } else {
                    this.log(Logging.LogLevel.Log, `Property "${model.name}" has no validators.`);
                    deferred.resolve(model.valid = true);
                }
            }
            else {
                this.log(Logging.LogLevel.Log, `Property "${name}" has no fields in this form.`);
                deferred.resolve(true);
            }
            //
            return deferred.promise;
        }

        // #region FORM HIERARCHY validity/dirtyness

        private _checkDirtyness() {
            let dirty = false;
            for (var model in this._fields) {
                if (this._fields[model].dirty === true) {
                    dirty = true;
                    break;
                }
            }
            if (/* still */dirty === false) {
                for (var form of this._subForms) {
                    if (form.dirty) {
                        dirty = true;
                        break;
                    }
                }
            }
            this.dirty = dirty;
        };

        private _checkValidity() {
            let valid = true;
            for (var model in this._fields) {
                this.log(Logging.LogLevel.Log, `Checking "${model}" validity.`);
                if (this._fields[model].valid === false) {
                    this.log(Logging.LogLevel.Log, `"${model}" is not valid.`);
                    valid = false;
                    break;
                }
            }
            if (/* still */valid === true) {
                for (var form of this._subForms) {
                    if (!form.valid) {
                        valid = false;
                        break;
                    }
                }
            }
            this.valid = valid;
        };

        registerSubForm(form: PacemFormElement) {
            let arr = this._subForms;
            if (arr.indexOf(form) == -1) {
                form.addEventListener(PropertyChangeEventName, this._fieldPropertyChanged, false);
                arr.push(form);
                this._checkValidity();
                this._checkDirtyness();
            }
        }

        unregisterSubForm(form: PacemFormElement) {
            let arr = this._subForms,
                ndx = arr.indexOf(form);
            if (ndx >= 0) {
                form.removeEventListener(PropertyChangeEventName, this._fieldPropertyChanged, false);
                arr.splice(ndx, 1);
                this._checkValidity();
                this._checkDirtyness();
            }
        }

        registerField(name: string, model: PacemModel) {
            var container = this._fields;
            if (container[name] != model) {
                this.unregisterField(name, false);
                container[name] = model;
                this.log(Logging.LogLevel.Log, `Registering "${name}" field.`);
                if (model instanceof HTMLElement)
                    model.addEventListener(PropertyChangeEventName, this._fieldPropertyChanged, false);
                this._checkFieldValidity(name);
                this._checkDirtyness();
            }
        }

        unregisterField(name: string, check: boolean = true) {
            var container = this._fields, current = container[name];
            if (current instanceof HTMLElement)
                current.removeEventListener(PropertyChangeEventName, this._fieldPropertyChanged, false);
            delete container[name];
            if (current && check === true) {
                this._checkValidity();
                this._checkDirtyness();
            }
        }

        registerValidator(name: string, validator: Validator) {
            var container = this._validators[name] = this._validators[name] || [],
                index = container.indexOf(validator);
            if (index == -1) {
                container.push(validator);
                if (validator instanceof HTMLElement)
                    validator.addEventListener(PropertyChangeEventName, this._validatorPropertyChanged, false);
                this.log(Logging.LogLevel.Log, `Calling "${name}" validity check after validator registration.`);
                // most likely, at this point, the corresponding field isn't available yet.
                this._checkFieldValidity(name);
            }
        }

        unregisterValidator(name: string, validator: Validator) {
            this._unregisterValidator(name, validator, true);
        }

        private _unregisterValidator(name: string, validator: Validator, check: boolean) {
            var container = this._validators[name] = this._validators[name] || [],
                index = container.indexOf(validator);
            if (index >= 0) {
                if (validator instanceof HTMLElement)
                    validator.removeEventListener(PropertyChangeEventName, this._validatorPropertyChanged, false);
                container.splice(index, 1);
                if (check)
                    this._checkFieldValidity(name);
            }
        }

        // #endregion

        @Watch({ reflectBack: true, converter: PropertyConverters.Boolean })
        valid: boolean;

        @Watch({ reflectBack: true, converter: PropertyConverters.Boolean })
        dirty: boolean;

        @Watch({ reflectBack: true, converter: PropertyConverters.Boolean })
        readonly: boolean;

        @Watch({ converter: PropertyConverters.Boolean })
        success: boolean;

        @Watch({ converter: PropertyConverters.Boolean })
        fail: boolean;

        @Watch({ converter: PropertyConverters.Json })
        entity: any;

        @Watch({ emit: false, converter: PropertyConverters.String })
        entityName: string;

        @Watch()
        metadata: Pacem.Scaffolding.TypeMetadata | PropertyMetadata[];

        @Watch({ emit: false, converter: PropertyConverters.Boolean })
        autogenerate: boolean;

        @Watch({ converter: PropertyConverters.String })
        action: string;
    }

}