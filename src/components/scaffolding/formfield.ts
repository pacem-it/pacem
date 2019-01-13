/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: 'pacem-form-field', template: `<pacem-form class="pacem-field" logger="{{ :host.logger }}" 
css-class="{{ {'pacem-fetching': ::_fetcher.fetching, 'pacem-dirty': this.dirty, 'pacem-invalid': !this.valid, 'pacem-editable': !:host.readonly, 'pacem-readonly': :host.readonly, 'pacem-pristine': !this.dirty, 'pacem-valid': this.valid, 'pacem-has-value': !:host._isValueNullOrEmpty(:host.entity, :host.metadata) } }}">
    <label class="pacem-label"></label>
    <div class="pacem-input-container"></div>
    <pacem-fetch debounce="50" logger="{{ :host.logger }}"></pacem-fetch>
    <pacem-panel class="pacem-validators" hide="{{ ::_form.valid || !::_form.dirty }}">
    </pacem-panel>
</pacem-form>` })
    export class PacemFormFieldElement extends PacemElement {

        constructor() {
            super();
        }

        private _field: HTMLElement;
        private _key: string = '_' + Utils.uniqueCode();

        @ViewChild('label') private label: HTMLLabelElement;

        @ViewChild('div.pacem-input-container') private container: HTMLDivElement;

        private _balloon: UI.PacemBalloonElement;

        @ViewChild('pacem-fetch') private _fetcher: PacemFetchElement;

        @ViewChild('pacem-form') private _form: PacemFormElement;

        @ViewChild('pacem-panel.pacem-validators') private _validators: PacemPanelElement;

        get key(): string {
            return this._key;
        }

        @Watch({ converter: PropertyConverters.Json }) metadata: Pacem.Scaffolding.PropertyMetadata;

        @Watch({ converter: PropertyConverters.Boolean }) readonly: boolean;

        @Watch() entity: any;

        get field(): HTMLElement {
            return this._field;
        }

        viewActivatedCallback(): void {
            super.viewActivatedCallback();
            this._buildUpForm();
            this._buildUpFetcher();
        }

        propertyChangedCallback(name: string, old?: any, val?: any, first?: boolean): void {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'readonly':
                    this._ensureBalloon();
                    break;
                case 'metadata':
                    this._ensureBalloon();
                    this._buildUpLabel();
                    this._buildUpField();
                    break;
            }
        }

        disconnectedCallback() {
            super.disconnectedCallback();
            if (!Utils.isNull(this._balloon))
                this._balloon.remove();
        }

        private _ensureBalloon(): void {
            // balloon
            if (Utils.isNull(this._balloon)) {
                let balloon = <UI.PacemBalloonElement>document.createElement('pacem-balloon');
                balloon.options = {
                    behavior: UI.BalloonBehavior.Tooltip,
                    position: UI.BalloonPosition.Top,
                    hoverDelay: 100, hoverTimeout: 200,
                    align: UI.BalloonAlignment.Start
                };
                Utils.addClass(balloon, 'pacem-field-tooltip');
                document.body.appendChild(this._balloon = balloon);
            }
            /*
            <pacem-balloon
            target="{{ ::label }}"
            options="{ 'behavior': 'tooltip' }"><pacem-text text="{{ :host.metadata && :host.metadata.display && :host.metadata.display.description }}"></pacem-text></pacem-balloon>
            */
            const balloon = this._balloon;
            balloon.target = this.label;
            var innerText: string;
            balloon.disabled = this.readonly
                || (this.metadata && this.metadata.extra && this.metadata.extra.tooltip) !== true
                || Utils.isNullOrEmpty(innerText = this.metadata && this.metadata.display && this.metadata.display.description);
            balloon.innerText = innerText || '';
        }

        private _buildUpLabel(): void {
            // label
            var label = this.label;
            let meta = this.metadata;
            label.htmlFor = this._key;
            Utils.addClass(label, 'pacem-label');
            const vals = this.metadata.validators;
            if (vals && vals.find(v => v.type === 'required'))
                Utils.addClass(label, 'pacem-required');
            else
                Utils.removeClass(label, 'pacem-required');
            //
            if (!this._balloon.disabled)
                Utils.addClass(label, 'pacem-tooltip');
            else
                Utils.removeClass(label, 'pacem-tooltip');
            label.textContent = (meta.display && meta.display.name) || meta.prop;
        }

        private _isValueNullOrEmpty(
            entity = this.entity,
            metadata: Pacem.Scaffolding.PropertyMetadata = this.metadata) {
            return Utils.isNullOrEmpty(entity && metadata && entity[metadata.prop]);
        }

        private _buildUpFetcher(): void {
            // fetcher
            var fetcher = this._fetcher;
            fetcher.setAttribute('id', 'fetch' + this._key);
        }

        private _buildUpForm(): void {
            // form
            var form = this._form;
            form.setAttribute('id', 'form' + this._key);
        }

        private _buildUpField() {
            if (this._field)
                this._field.remove();
            this._fetcher.removeAttribute('parameters');
            this._fetcher.result =
                this._fetcher.url = null;
            for (var j = this._validators.children.length - 1; j >= 0; j--)
                this._validators.children[j].remove();

            var meta = this.metadata;

            // field
            let tagName: string = 'pacem-input-text';
            let attrs: { [key: string]: string } = {
                'id': this._key, 'name': meta.prop,
                // readonly if property `readonly` set to true OR metadata property is not editable OR parent form's `readonly` property is set to true
                'readonly': "{{ :host.readonly || :host.metadata.isReadOnly || ::_form.readonly }}",
                'value': `{{ :host.entity.${meta.prop}, twoway }}`,
                'placeholder': `${((meta.display && meta.display.watermark) || "")}`
            };
            // fetch data
            let fetchData: { sourceUrl: string, valueProperty: string, textProperty: string, verb: Pacem.Net.HttpMethod, dependsOn?: { prop: string, alias?: string, value?: any, hide?: boolean }[] } = meta.extra;
            let fetchAttrs: { [key: string]: string } = {};

            // dependency from other props
            if (!Utils.isNullOrEmpty(fetchData && fetchData.dependsOn)) {
                let dependsOn = fetchData.dependsOn;
                // there is a better way...
                let disablingClauses: { empty: string[], notEqual: string[] } = { empty: [], notEqual: [] };
                let hidingClauses: { empty: string[], notEqual: string[] } = { empty: [], notEqual: [] };
                for (var depends of dependsOn) {
                    let path = ':host.entity.' + depends.prop,
                        path2 = '$this.entity.' + depends.prop;
                    if (!Utils.isNullOrEmpty(depends.value)) {
                        let clause = (p) => p + ' !== ' + JSON.stringify(depends.value);
                        disablingClauses.notEqual.push(clause(path));
                        if (depends.hide) {
                            hidingClauses.notEqual.push(clause(path2));
                        }
                    } else {
                        let clause = (p) => 'Pacem.Utils.isNullOrEmpty(' + p + ')';
                        disablingClauses.empty.push(clause(path));
                        if (depends.hide) {
                            hidingClauses.empty.push(clause(path2));
                        }
                    }
                }

                let joinClauses = (d: { empty: string[], notEqual: string[] }) => {
                    let ne: string = 'false',
                        emp: string = 'false';
                    if (!Utils.isNullOrEmpty(d.notEqual)) {
                        ne = '('+ d.notEqual.join(' && ') +')';
                    }
                    if (!Utils.isNullOrEmpty(d.empty)) {
                        emp = '(' + d.empty.join(' || ') +')';
                    }
                    return ne + ' || ' + emp;
                };

                attrs['disabled'] = `{{ ${joinClauses(disablingClauses)} }}`;
                this.setAttribute('hide', `{{ ${joinClauses(hidingClauses)} }}`);
            }

            // metadata
            switch (meta.display && meta.display.ui) {
                // remove this (use dataType = 'HTML' instead).
                case 'contentEditable':
                    console.warn('`contentEditable` ui hint is deprecated. Lean on `dataType` equal to \'HTML\' instead.');
                    tagName = 'pacem-contenteditable';
                    break;
                case 'snapshot':
                    tagName = 'pacem-thumbnail';
                    let w = attrs['width'] = meta.extra.width;
                    let h = attrs['height'] = meta.extra.height;
                    let mode = attrs['mode'] = meta.type.toLowerCase() === 'string' ? 'string' : 'binary';
                    break;
                case 'oneToMany':
                    // select
                    tagName = 'pacem-select';
                    attrs['on-mousewheel'] = '$event.preventDefault()';
                    if (!Utils.isNullOrEmpty(fetchData.textProperty))
                        attrs['text-property'] = fetchData.textProperty;
                    if (!Utils.isNullOrEmpty(fetchData.valueProperty)) {
                        if (!meta.isComplexType)
                            attrs['value-property'] = fetchData.valueProperty;
                        else
                            attrs['compare-by'] = fetchData.valueProperty;
                    }
                    this._fetcher.id = `fetch${this._key}`;
                    this._fetcher.url = fetchData.sourceUrl;
                    this._fetcher.method = fetchData.verb;
                    //
                    let dependingClause = '';
                    //
                    if (!Utils.isNullOrEmpty(fetchData.dependsOn)) {
                        let dependsOn = fetchData.dependsOn;
                        let namesAndPaths = [];
                        let paths = [];
                        for (var depends of dependsOn) {
                            let path = ':host.entity.' + depends.prop;
                            paths.push(path);
                            namesAndPaths.push(`${(depends.alias || depends.prop)} : ${path}`);
                            dependingClause += path + ' && ';
                        }

                        fetchAttrs['parameters'] = `{{ { ${namesAndPaths.join(', ')} } }}`;
                        fetchAttrs['disabled'] = `{{ Pacem.Utils.isNullOrEmpty(${paths.join(") || Pacem.Utils.isNullOrEmpty(")}) }}`;
                    }
                    //
                    attrs['datasource'] = `{{ ${dependingClause} Pacem.Utils.getApiResult(#fetch${this._key}.result) }}`;
                    break;
                case 'manyToMany':
                    // checkboxlist
                    tagName = 'pacem-checkbox-list';
                    delete attrs['placeholder'];
                    attrs['datasource'] = `{{ Pacem.Utils.getApiResult(#fetch${this._key}.result) }}`;
                    if (!Utils.isNullOrEmpty(fetchData.textProperty))
                        attrs['text-property'] = fetchData.textProperty;
                    if (!Utils.isNullOrEmpty(fetchData.valueProperty))
                        attrs['compare-by'] = fetchData.valueProperty;
                    this._fetcher.id = `fetch${this._key}`;
                    this._fetcher.url = fetchData.sourceUrl;
                    this._fetcher.method = fetchData.verb;
                    // TODO: implement dependsOn

                    break;
                case 'suggest':
                case 'tags':
                case 'autocomplete':
                    // autocomplete
                    tagName = meta.display.ui === 'tags' ? 'pacem-tags' : 'pacem-suggest';
                    this._fetcher.id = `fetch${this._key}`;
                    attrs['datasource'] = `{{ Pacem.Utils.getApiResult(#fetch${this._key}.result) }}`;
                    if (!Utils.isNullOrEmpty(fetchData.textProperty))
                        attrs['text-property'] = fetchData.textProperty;

                    let itemValue = `#${this._key}.value`;
                    if (!Utils.isNullOrEmpty(fetchData.valueProperty)) {
                        attrs['compare-by'] = fetchData.valueProperty;
                        itemValue = `(${itemValue} && ${itemValue}.${fetchData.valueProperty}) || ''`;
                    }
                    // fairly complicated (any way of simplifying it?)
                    fetchAttrs['parameters'] = `{{ {q: #${this._key}.hint || '', ${ (fetchData.valueProperty || 'value') }: ${itemValue} } }}`;
                    //fetchAttrs['disabled'] = `{{ !(#${this._key}.hint || (#${this._key}.value && !#${this._key}.dirty)) }}`;
                    fetchAttrs['url'] = `${fetchData.sourceUrl}`; //`{{ (#${this._key}.hint || (#${this._key}.value && !#${this._key}.dirty)) ? '${fetchData.sourceUrl}' : '' }}`;
                    this._fetcher.method = fetchData.verb;
                    // TODO: implement dependsOn

                    break;
                default:
                    switch ((meta.dataType || meta.type).toLowerCase()) {
                        case 'imageurl':
                            tagName = 'pacem-input-image';
                            const f_id = this._fetcher.id = `fetch${this._key}`;
                            attrs['image-set'] = `{{ Pacem.Utils.getApiResult(#${f_id}.result) }}`;
                            attrs['on-imagefetchrequest'] = `#${f_id}.url = '${meta.extra.fetchUrl}'; #${f_id}.parameters = { q: $event.detail.hint, skip: $event.detail.skip, take: $event.detail.take }`;
                            attrs['max-width'] = meta.extra.width;
                            attrs['max-height'] = meta.extra.height;
                            attrs['max-thumbnail-height'] = meta.extra.thumbHeight;
                            attrs['max-thumbnail-width'] = meta.extra.thumbWidth;
                            attrs['upload-url'] = meta.extra.uploadUrl;
                            attrs['allow-snapshot'] = meta.extra.snapshot;
                            break;
                        case 'upload':
                            break;
                        case 'html':
                            // contenteditable
                            tagName = 'pacem-contenteditable';
                            break;
                        case 'enumeration':
                            // radiobutton list
                            tagName = 'pacem-radio-list';
                            attrs['class'] = 'pacem-radio-list';
                            attrs['value-property'] = "value";
                            attrs['text-property'] = "caption";
                            attrs['datasource'] = '{{ ' + JSON.stringify(meta.extra.enum) + ' }}';
                            delete attrs['placeholder'];
                            break;
                        case 'password':
                            tagName = 'pacem-input-password';
                            break;
                        case 'emailaddress':
                            tagName = 'pacem-input-email';
                            break;
                        case "color":
                            tagName = 'pacem-input-color';
                            break;
                        case "time":
                            tagName = 'pacem-datetime-picker';
                            break;
                        case "datetime":
                            tagName = 'pacem-datetime-picker';
                            delete attrs['placeholder'];
                            delete attrs['class'];
                            attrs['precision'] = "minute";
                            break;
                        case "date":
                            tagName = 'pacem-datetime-picker';
                            delete attrs['placeholder'];
                            delete attrs['class'];
                            break;
                        case "url":
                            tagName = 'pacem-input-url';
                            break;
                        case "phonenumber":
                            tagName = 'pacem-input-tel';
                            break;
                        case "multilinetext":
                            tagName = 'pacem-textarea';
                            break;
                        case "markdown":
                            tagName = 'pacem-textarea-markdown';
                            break;
                        case 'latlng':
                            tagName = 'pacem-latlng';
                            break;
                        default:
                            switch ((meta.type || '').toLowerCase()) {
                                case "boolean":
                                    tagName = 'pacem-checkbox';
                                    //attrs['selected'] = `{{ :host.entity.${meta.prop}, twoway }}`;
                                    attrs['true-value'] = "{{ true }}";
                                    attrs['false-value'] = "{{ false }}";
                                    attrs['caption'] = attrs['placeholder'];
                                    //delete attrs['value'];
                                    delete attrs['placeholder'];
                                    break;
                                case "byte":
                                    tagName = 'pacem-input-number';
                                    attrs['min'] = '0';
                                    attrs['max'] = '255';
                                    break;
                                case "int32":
                                case "int64":
                                case "integer":
                                case "int":
                                case "long":
                                    tagName = 'pacem-input-number';
                                    break;
                                case "double":
                                case "decimal":
                                case "float":
                                case "single":
                                    tagName = 'pacem-input-number';
                                    attrs['step'] = "{{ 'any' }}";
                                    break;
                                default:
                                    break;
                            }
                            break;
                    }
                    break;
            }

            // validators
            if (meta.validators && meta.validators.length) {
                meta.validators.forEach((validator) => {
                    var validatorElement: PacemBaseValidatorElement;
                    switch (validator.type) {
                        case 'required':
                            attrs['required'] = 'true';
                            validatorElement = <PacemRequiredValidatorElement>document.createElement('pacem-required-validator');
                            break;
                        case 'length':
                            let lengthValidator = <PacemLengthValidatorElement>document.createElement('pacem-length-validator');
                            validatorElement = lengthValidator;
                            let max = validator.params && validator.params['max'];
                            let min = validator.params && validator.params['min'];
                            if (max != null) {
                                attrs['maxlength'] = lengthValidator.max = max;
                            }
                            if (min != null) {
                                attrs['minlength'] = lengthValidator.min = min;
                            }
                            break;
                        case 'range':
                            let rangeValidator = <PacemRangeValidatorElement>document.createElement('pacem-range-validator');
                            validatorElement = rangeValidator;
                            let maxNum = validator.params && validator.params['max'];
                            let minNum = validator.params && validator.params['min'];
                            let isDateTime = tagName === 'pacem-datetime-picker';
                            if (maxNum != null) {
                                rangeValidator.max = maxNum;
                                attrs['max'] = "{{ " + (isDateTime ? "'" + maxNum + "'" : maxNum) + " }}";
                            }
                            if (minNum != null) {
                                rangeValidator.min = minNum;
                                attrs['min'] = "{{ " + (isDateTime ? "'" + minNum + "'" : minNum) + " }}";
                            }
                            break;
                        case 'email':
                            let emailValidator = <PacemRegexValidatorElement>document.createElement('pacem-regex-validator');
                            validatorElement = emailValidator;
                            attrs['pattern'] = emailValidator.pattern = "[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z0-9]{2,6}";
                            break;
                        case 'regex':
                            let regexValidator = <PacemRegexValidatorElement>document.createElement('pacem-regex-validator');
                            validatorElement = regexValidator;
                            let pattern = validator.params['pattern'];
                            attrs['pattern'] = pattern.replace('\\', '\\\\');
                            regexValidator.pattern = pattern;
                            break;
                        case 'compare':
                            let compareValidator = <PacemCompareValidatorElement>document.createElement('pacem-compare-validator');
                            validatorElement = compareValidator;
                            let comparedTo = `{{ :host.entity.${validator.params['to']} }}`;
                            compareValidator.setAttribute('to', comparedTo);
                            let operator = compareValidator.operator = validator.params['operator'] || 'equal';
                            // In case of `date(time)` try to add some interaction with `datetime-picker`'s min/max props.
                            if (tagName === 'pacem-datetime-picker') {
                                switch (operator) {
                                    case 'lessOrEqual':
                                    case 'less': // approximation: edge value won't be allowed but will result enabled on the `datetime-picker`
                                        attrs['max'] = comparedTo;
                                        break;
                                    case 'greaterOrEqual':
                                    case 'greater': // approximation: edge value won't be allowed but will result enabled on the `datetime-picker`
                                        attrs['min'] = comparedTo;
                                        break;
                                }
                            }
                    }
                    //
                    if (Utils.isNull(validatorElement)) {
                        throw `Cannot generate a formfield validator based on type: ${validator.type}.`;
                    } else {
                        validatorElement.watch = meta.prop;
                        validatorElement.setAttribute('hide', '{{ !this.invalid }}');
                        validatorElement.errorMessage = validator.errorMessage;
                        this._validators.appendChild(validatorElement);
                    }
                });
            }

            let field = document.createElement(tagName);
            for (var name in attrs) {
                let attr: string;
                if (!Utils.isNullOrEmpty(attr = attrs[name]))
                    field.setAttribute(name, attr);
            }
            this._field = field;
            this.container.appendChild(field);

            for (var name in fetchAttrs) {
                let attr: string;
                if (!Utils.isNullOrEmpty(attr = fetchAttrs[name]))
                    this._fetcher.setAttribute(name, attr);
            }

            // fire propertychange event for bindings' sake...
            this.dispatchEvent(new PropertyChangeEvent({ propertyName: 'field', currentValue: field }));

        }

    }

}