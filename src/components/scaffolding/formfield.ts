/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    function getFormId(key: string) {
        return 'form' + key;
    }

    function patternToString(pattern: string | RegExp) {
        return new RegExp(pattern/*.split('\\').join('\\\\')*/).source;
    }

    @CustomElement({
        tagName: P + '-form-field', template: `<${P}-form class="${PCSS}-field" logger="{{ :host.logger }}" 
css-class="{{ {'${PCSS}-fetching': ::_fetcher.fetching, '${PCSS}-dirty': this.dirty, '${PCSS}-invalid': !this.valid, '${PCSS}-editable': !:host.readonly, '${PCSS}-readonly': :host.readonly, '${PCSS}-pristine': !this.dirty, '${PCSS}-valid': this.valid, '${PCSS}-has-value': !:host._isValueNullOrEmpty(:host.entity, :host.metadata) } }}">
    <label class="${PCSS}-label"></label>
    <div class="${PCSS}-input-container"></div>
    <${P}-fetch debounce="50" logger="{{ :host.logger }}" credentials="{{ :host.fetchCredentials }}" headers="{{ :host.fetchHeaders }}" diff-by-values="true"></${P}-fetch>
    <${P}-panel class="${PCSS}-validators" hide="{{ ::_form.valid || !::_form.dirty || :host.readonly }}"></${P}-panel>
</${ P}-form>`
    })
    export class PacemFormFieldElement extends PacemElement implements Pacem.Net.OAuthFetchable {

        constructor(private _md = new MarkdownService()) {
            super();
        }

        private _field: HTMLElement;
        private _key: string = '_' + Utils.uniqueCode();

        @ViewChild('label') private label: HTMLLabelElement;

        @ViewChild(`div.${PCSS}-input-container`) private _container: HTMLDivElement;

        private _balloon: UI.PacemBalloonElement;

        @ViewChild(P + '-fetch') private _fetcher: PacemFetchElement;

        @ViewChild(P + '-form') private _form: PacemFormElement;

        @ViewChild(P + '-panel.' + PCSS + '-validators') private _validators: PacemPanelElement;

        get key(): string {
            return this._key;
        }

        get fetcher(): Pacem.Net.Fetcher {
            return this._fetcher;
        }

        @Watch({ converter: PropertyConverters.Json }) metadata: Pacem.Scaffolding.PropertyMetadata;

        @Watch({ converter: PropertyConverters.Json }) fetchHeaders: { [key: string]: string };

        @Watch({ converter: PropertyConverters.String }) fetchCredentials: RequestCredentials;

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
                case 'entity':
                    // In the case that the entity is a HTMLElement,
                    // its changes might not propagate correctly.
                    // This is a nudgy solution. Explore how to improve
                    // `CustomElementUtils.set` as an alternative...
                    if (old instanceof HTMLElement) {
                        old.removeEventListener(PropertyChangeEventName, this._entityPropertyChangeHandler, false);
                    }
                    if (val instanceof HTMLElement) {
                        val.addEventListener(PropertyChangeEventName, this._entityPropertyChangeHandler, false);
                    }
                    break;
            }
        }

        disconnectedCallback() {
            if (this.entity instanceof HTMLElement) {
                this.entity.removeEventListener(PropertyChangeEventName, this._entityPropertyChangeHandler, false);
            }
            if (!Utils.isNull(this._balloon)) {
                this._balloon.remove();
            }
            super.disconnectedCallback();
        }

        private _entityPropertyChangeHandler = (e) => {
            // nudge entity propertychange notification
            this.dispatchEvent(new Pacem.PropertyChangeEvent({ propertyName: 'entity', currentValue: this.entity }));
        };

        private _ensureBalloon(): void {

            var innerText: string,
                tooltipMode: true | false | 'html' | 'md' | 'markdown';
            const noBalloon = this.readonly
                || Utils.isNullOrEmpty(tooltipMode = this.metadata && this.metadata.extra && this.metadata.extra.tooltip)
                || (tooltipMode !== true && tooltipMode !== 'html' && tooltipMode !== 'md' && tooltipMode !== 'markdown')
                || Utils.isNullOrEmpty(innerText = this.metadata && this.metadata.display && this.metadata.display.description);

            // balloon
            if (Utils.isNull(this._balloon) && !noBalloon) {
                let balloon = <UI.PacemBalloonElement>document.createElement(P + '-balloon');
                balloon.options = {
                    behavior: UI.BalloonBehavior.Tooltip,
                    position: UI.BalloonPosition.Top,
                    hoverDelay: 200, hoverTimeout: 50,
                    align: UI.BalloonAlignment.Start
                };
                Utils.addClass(balloon, PCSS + '-field-tooltip');
                var shell = CustomElementUtils.findAncestorShell(this);
                shell.appendChild(this._balloon = balloon);
            }

            const balloon = this._balloon;
            if (!Utils.isNull(balloon)) {
                balloon.target = this.label;
                balloon.disabled = noBalloon;

                const content = innerText || '';
                switch (tooltipMode) {
                    case 'md':
                    case 'markdown':
                        balloon.innerHTML = this._md.toHtml(content);
                        break;
                    case 'html':
                        balloon.innerHTML = content;
                        break;
                    default:
                        balloon.innerText = content;
                        break;
                }
            }
        }

        private _buildUpLabel(): void {
            // label
            var label = this.label;
            let meta = this.metadata;
            label.htmlFor = this._key;
            Utils.addClass(label, PCSS + '-label');
            const vals = this.metadata.validators;
            if (vals && vals.find(v => v.type === 'required'))
                Utils.addClass(label, PCSS + '-required');
            else
                Utils.removeClass(label, PCSS + '-required');
            //
            if (!Utils.isNull(this._balloon) && !this._balloon.disabled)
                Utils.addClass(label, PCSS + '-tooltip');
            else
                Utils.removeClass(label, PCSS + '-tooltip');
            label.textContent = (meta.display && meta.display.name) || meta.prop;
            label.setAttribute('id', 'label' + this._key);
        }

        // #region Template-called

        private _isValueNullOrEmpty(
            entity = this.entity,
            metadata: Pacem.Scaffolding.PropertyMetadata = this.metadata) {
            return Utils.isNullOrEmpty(entity && metadata && entity[metadata.prop]);
        }

        /**
         * Reflects the value onto the entity attribute, if the 'entity' is an instance of HTMLElement.
         * @param value
         */
        private _handleValueChange(evt: PropertyChangeEvent) {
            if (evt.detail.propertyName === 'value') {
                const value = evt.detail.currentValue,
                    prop = this.metadata.prop;
                if (this.entity instanceof HTMLElement) {

                    // handle the entity as an element and modify the attribute
                    let attr = CustomElementUtils.camelToKebab(prop);
                    if (Utils.isNullOrEmpty(value)) {
                        this.entity.removeAttribute(attr);
                    } else {
                        this.entity.setAttribute(attr, value.toString());
                    }

                } else {
                    this.entity[prop] = value;
                }
            }
        }

        // #endregion

        private _buildUpFetcher(): void {
            // fetcher
            var fetcher = this._fetcher;
            fetcher.setAttribute('id', 'fetch' + this._key);
        }

        private _buildUpForm(): void {
            // form
            var form = this._form;
            form.setAttribute('id', getFormId(this._key));
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
            let tagName: string = /* setting the default/fallback input element */ P + '-input-text';
            let numericTagName = P + (meta.display && meta.display.ui === 'slider' ? '-slider' : '-input-number');
            let attrs: { [key: string]: string } = {
                'id': this._key, 'name': meta.prop,
                // readonly if property `readonly` set to true OR metadata property is not editable OR parent form's `readonly` property is set to true
                'readonly': "{{ :host.readonly || :host.metadata.isReadOnly || ::_form.readonly }}",
                'value': `{{ :host.entity.${meta.prop}, twoway }}`,
                'placeholder': `${((meta.display && meta.display.watermark) || "")}`
            };

            // fetch data
            let fetchData: { source: Function | any[], sourceUrl: string, valueProperty: string, textProperty: string, disabledProperty?: string, verb: Pacem.Net.HttpMethod, dependsOn?: Pacem.Scaffolding.DependsOn[] } = meta.extra;
            let fetchAttrs: { [key: string]: string } = {};

            let disabledAttr = "false";
            let dependingClause = '';
            let dependingDisabling = '';
            let dependingParameters = '';

            // #region dependency from other props
            if (!Utils.isNullOrEmpty(fetchData && fetchData.dependsOn)) {
                let dependsOn = fetchData.dependsOn;
                // there is a better way...
                let disablingClauses: { empty: string[], notEqual: string[] } = { empty: [], notEqual: [] };
                let hidingClauses: { empty: string[], notEqual: string[] } = { empty: [], notEqual: [] };

                // fetch
                let namesAndPaths = [];
                let paths = [];

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

                    // fetch
                    paths.push(path);
                    namesAndPaths.push(`${(depends.alias || depends.prop)} : ${path}`);
                    dependingClause += path + ' && ';
                }

                dependingParameters = namesAndPaths.join(', ');

                let joinClauses = (d: { empty: string[], notEqual: string[] }) => {
                    let ne: string = 'false',
                        emp: string = 'false';
                    if (!Utils.isNullOrEmpty(d.notEqual)) {
                        ne = '(' + d.notEqual.join(' && ') + ')';
                    }
                    if (!Utils.isNullOrEmpty(d.empty)) {
                        emp = '(' + d.empty.join(' || ') + ')';
                    }
                    return ne + ' || ' + emp;
                };

                dependingDisabling = joinClauses(disablingClauses);
                disabledAttr = `{{ ${dependingDisabling} }}`;
                // never disable the form-field, NEVER!
                // attrs['disabled'] = disabledAttr; // * BUG
                this.setAttribute('hide', `{{ ${joinClauses(hidingClauses)} }}`);
            }
            // #endregion

            const fn = 'fn';
            const fns: { [key: string]: Function } = this[fn] = this[fn] || {};

            // metadata
            switch (meta.display && meta.display.ui) {
                case 'expression':
                    // cms-relevant (mostly)
                    attrs['value'] = `{{ :host.entity instanceof HTMLElement && :host.entity.getAttribute('${CustomElementUtils.camelToKebab(meta.prop)}') }}`;
                    attrs['on-' + PropertyChangeEventName] = ':host._handleValueChange($event)';
                    attrs['converter'] = `{{ Pacem.CustomElementUtils.getWatchedProperty(:host.entity, '${meta.prop}').config.converter }}`;
                    tagName = P + '-expression';
                    let extra: { selector: string, filter?: string | ((e: Element) => boolean), labeler?: (e: Element) => string } = meta.extra || {};
                    if (!Utils.isNullOrEmpty(extra.selector)) {
                        attrs['selector'] = extra.selector;
                    }
                    if (!Utils.isNullOrEmpty(extra.filter)) {
                        switch (typeof extra.filter) {
                            case 'string':
                                attrs['filter'] = `{{ (e) => e.constructor.name === "${extra.filter}" || e.localName === "${extra.filter.toLowerCase()}" }}`;
                                break;
                            case 'function':
                                const fnKey = 'fn' + Utils.uniqueCode();
                                fns[fnKey] = extra.filter;
                                attrs['filter'] = `{{ :host.${fn}.${fnKey}, once }}`;
                                break;
                        }
                    }
                    if (typeof extra.labeler === 'function') {
                        const fnKey = 'fn' + Utils.uniqueCode();
                        fns[fnKey] = extra.labeler;
                        attrs['labeler'] = `{{ :host.${fn}.${fnKey}, once }}`;
                        break;
                    }
                    break;
                // remove this (use dataType = 'HTML' instead).
                case 'contentEditable':
                    console.warn('`contentEditable` ui hint is deprecated. Lean on `dataType` equal to \'HTML\' instead.');
                    tagName = P + '-contenteditable';
                    break;
                case 'snapshot':
                    tagName = P + '-thumbnail';
                    let w = attrs['width'] = meta.extra.width;
                    let h = attrs['height'] = meta.extra.height;
                    let mode = attrs['mode'] = meta.type.toLowerCase() === 'string' ? 'string' : 'binary';
                    break;
                case 'oneToMany':
                    // select
                    tagName = P + '-select';
                    attrs['on-wheel'] = '$event.preventDefault()';
                    if (!Utils.isNullOrEmpty(fetchData.textProperty)) {
                        attrs['text-property'] = fetchData.textProperty;
                    }
                    if (!Utils.isNullOrEmpty(fetchData.disabledProperty)) {
                        attrs['disabled-property'] = fetchData.disabledProperty;
                    }
                    if (!Utils.isNullOrEmpty(fetchData.valueProperty)) {
                        if (!meta.isComplexType)
                            attrs['value-property'] = fetchData.valueProperty;
                        else
                            attrs['compare-by'] = fetchData.valueProperty;
                    }

                    if (Utils.isNullOrEmpty(fetchData.source)) {

                        // datasource has to be fetched
                        this._fetcher.id = `fetch${this._key}`;
                        this._fetcher.url = fetchData.sourceUrl;
                        this._fetcher.method = fetchData.verb;
                        //
                        fetchAttrs['parameters'] = `{{ { ${dependingParameters} } }}`;
                        fetchAttrs['disabled'] = disabledAttr;
                        attrs['datasource'] = `{{ ${dependingClause}Pacem.Utils.getApiResult(#fetch${this._key}.result) }}`;

                    } else {

                        // static datasource provided
                        let args: string = (fetchData.dependsOn || []).map(p => ':host.entity.' + p.prop).join(', ');
                        const fnKey = 'fn' + Utils.uniqueCode();

                        switch (typeof fetchData.source) {
                            case 'function':
                                fns[fnKey] = fetchData.source;
                                break;
                            default:
                                if (Utils.isArray(fetchData.source)) {
                                    fns[fnKey] = () => fetchData.source;
                                } else {
                                    throw 'Unsupported source format.';
                                }
                                break;
                        }
                        attrs['datasource'] = `{{ :host.${fn}.${fnKey}(${args}) }}`;
                    }
                    break;
                case 'manyToMany':
                    // checkboxlist
                    tagName = P + '-checkbox-list';
                    delete attrs['placeholder'];
                    attrs['datasource'] = `{{ Pacem.Utils.getApiResult(#fetch${this._key}.result) }}`;
                    if (!Utils.isNullOrEmpty(fetchData.textProperty))
                        attrs['text-property'] = fetchData.textProperty;
                    if (!Utils.isNullOrEmpty(fetchData.disabledProperty))
                        attrs['disabled-property'] = fetchData.disabledProperty;
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
                    const tags = meta.display.ui === 'tags';
                    tagName = P + (tags ? '-tags' : '-suggest');
                    this._fetcher.id = `fetch${this._key}`;

                    if (!Utils.isNullOrEmpty(fetchData.textProperty))
                        attrs['text-property'] = fetchData.textProperty;

                    let itemValue = `#${this._key}.value`;
                    if (!Utils.isNullOrEmpty(fetchData.valueProperty)) {
                        attrs['compare-by'] = fetchData.valueProperty;
                        if (tags) {
                            itemValue = `(${itemValue} && ${itemValue}.${fetchData.valueProperty}) || ''`;
                        } else {
                            attrs['value-property'] = fetchData.valueProperty;
                        }
                    }

                    if (!Utils.isNullOrEmpty(fetchData.sourceUrl)) {
                        fetchAttrs['url'] = `${fetchData.sourceUrl}`;
                        this._fetcher.method = fetchData.verb;

                        //
                        if (!Utils.isNullOrEmpty(fetchData.dependsOn)) {
                            // deps
                            fetchAttrs['parameters'] = `{{ { ${dependingParameters}, q: #${this._key}.hint || '', ${(fetchData.valueProperty || 'value')}: ${itemValue} || '' } }}`;
                            fetchAttrs['disabled'] = disabledAttr;
                        } else {
                            // no deps
                            fetchAttrs['parameters'] = `{{ {q: #${this._key}.hint || '', ${(fetchData.valueProperty || 'value')}: ${itemValue} || '' } }}`;
                        }
                        attrs['datasource'] = `{{ ${dependingClause}Pacem.Utils.getApiResult(#fetch${this._key}.result) }}`;
                    }

                    if (meta.display.ui === 'tags') {
                        attrs['allow-new'] = (meta.extra.allowNew === true).toString();
                        attrs['allow-duplicates'] = (meta.extra.allowDuplicates === true).toString();
                    }

                    break;
                case 'switcher':
                    if ((meta.type || '').toLowerCase() === 'boolean') {
                        attrs['class'] = "checkbox-switch";
                    } else {
                        break;
                    }
                default:
                    let dataType = (meta.dataType || meta.type || '').toLowerCase();
                    switch (dataType) {
                        // should deprecated this one:
                        case 'imageurl':
                            tagName = P + '-input-image';
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
                            // upload
                            tagName = P + '-upload';
                            let uploadExtra = meta.extra || {};
                            attrs['url'] = uploadExtra.uploadUrl;
                            attrs['parallelism'] = uploadExtra.parallelism;
                            attrs['chunk-size'] = uploadExtra.chunkSize;
                            attrs['max-image-width'] = uploadExtra.maxImageWidth;
                            attrs['max-image-height'] = uploadExtra.maxImageHeight;
                            break;
                        case 'html':
                            // contenteditable
                            tagName = P + '-contenteditable';
                            break;
                        case 'enumeration':
                            // radiobutton list
                            tagName = P + '-radio-list';
                            attrs['class'] = PCSS + '-radio-list';
                            attrs['value-property'] = "value";
                            attrs['text-property'] = "caption";
                            attrs['datasource'] = '{{ ' + JSON.stringify(meta.extra.enum) + ' }}';
                            delete attrs['placeholder'];
                            break;
                        case 'password':
                            tagName = P + '-input-password';
                            break;
                        case 'emailaddress':
                            tagName = P + '-input-email';
                            break;
                        case "color":
                            tagName = P + '-input-color';
                            break;
                        case "time":
                            tagName = P + '-datetime-picker';
                            break;
                        case "datetime":
                            tagName = P + '-datetime-picker';
                            delete attrs['placeholder'];
                            attrs['precision'] = "minute";
                            break;
                        case "date":
                            tagName = P + '-datetime-picker';
                            delete attrs['placeholder'];
                            break;
                        case "url":
                            tagName = P + '-input-url';
                            break;
                        case "phonenumber":
                            tagName = P + '-input-tel';
                            break;
                        case "multilinetext":
                            tagName = P + '-textarea';
                            break;
                        case "markdown":
                            tagName = P + '-textarea-markdown';
                            break;
                        case 'latlng':
                            tagName = P + '-latlng';
                            if (!Utils.isNullOrEmpty(meta.extra) && typeof meta.extra === 'object' && !Utils.isArray(meta.extra)) {
                                attrs['options'] = JSON.stringify(meta.extra);
                            }
                            break;
                        case 'percent':
                        case 'percentage':
                        case 'currency':
                            let baseOptions = dataType === 'currency' ? { style: 'currency', currency: 'EUR' } : { style: 'percent', maximumFractionDigits: 2 };
                            let intl: Intl.NumberFormatOptions = Object.assign(baseOptions, meta.extra);
                            attrs['format'] = JSON.stringify(intl);
                        default:
                            switch ((meta.type || '').toLowerCase()) {
                                case "boolean":
                                    tagName = P + '-checkbox';
                                    //attrs['selected'] = `{{ :host.entity.${meta.prop}, twoway }}`;
                                    attrs['true-value'] = "{{ true }}";
                                    attrs['false-value'] = "{{ false }}";
                                    attrs['caption'] = attrs['placeholder'];
                                    //delete attrs['value'];
                                    delete attrs['placeholder'];
                                    break;
                                case "byte":
                                    attrs['min'] = '0';
                                    attrs['max'] = '255';
                                case "int16":
                                case "int32":
                                case "int64":
                                case "short":
                                case "integer":
                                case "int":
                                case "long":
                                    attrs['step'] = "1";
                                    tagName = numericTagName;
                                    break;
                                case "double":
                                case "decimal":
                                case "float":
                                case "single":
                                case "number":
                                    tagName = numericTagName;
                                    attrs['step'] = "{{ 'any' }}";
                                    break;
                                default:
                                    if ((meta.type === 'array' || meta.type === 'object') && !Utils.isNullOrEmpty(meta.props)) {
                                        tagName = P + '-childform';
                                        delete attrs['placeholder'];
                                        attrs['metadata'] = Utils.Json.stringify(meta.props);
                                        attrs['mode'] = meta.type;
                                        attrs['lock-items'] = '' + (meta.extra && meta.extra.lockItems || false);
                                        attrs['logger'] = '{{ :host.logger }}';
                                        if (!Utils.isNullOrEmpty(fetchData && fetchData.dependsOn)) {

                                            var extraDom = '';
                                            for (let d of fetchData.dependsOn) {
                                                extraDom += `<${P}-childform-propagator model="${attrs["value"]}" watch="{{ :host.entity.${d.prop} }}" property="${(d.alias || d.prop)}"></${P}-childform-propagator>\n`;
                                            }
                                            this._container.innerHTML = extraDom;
                                        }
                                        attrs['fetch-credentials'] = '{{ :host.fetchCredentials }}';
                                        attrs['fetch-headers'] = '{{ :host.fetchHeaders }}';
                                    }
                                    break;
                            }
                            break;
                    }
                    break;
            }

            // commands
            if (!Utils.isNullOrEmpty(meta.commands)) {
                Utils.addClass(this._container, PCSS + '-fieldgroup');
                const prepend = this._container.appendChild(document.createElement('div')),
                    append = this._container.appendChild(document.createElement('div'));
                Utils.addClass(prepend, `fieldgroup-prepend ${PCSS}-buttonset buttons`);
                Utils.addClass(append, `fieldgroup-append ${PCSS}-buttonset buttons`);

                const disable: string = dependingDisabling || 'false';

                meta.commands.forEach(cmd => {
                    const btn = document.createElement(P + '-button');
                    btn.setAttribute('icon-glyph', cmd.icon);
                    btn.setAttribute('command-name', cmd.name);
                    if (cmd.dependsOnValue) {
                        btn.setAttribute('disabled', `{{ (${disable}) || !::_form.valid || Pacem.Utils.isNullOrEmpty(:host.entity.${meta.prop}) }}`);
                        btn.setAttribute('command-argument', `{{ :host.entity.${meta.prop} }}`);
                    } else {
                        btn.setAttribute('disabled', disabledAttr);
                    }
                    btn.setAttribute('tooltip', cmd.tooltip);
                    if (!Utils.isNullOrEmpty(cmd.cssClass)) {
                        Utils.addClass(btn, cmd.cssClass.join(' '));
                    }
                    (cmd.prepend ? prepend : append).appendChild(btn);
                });
            }

            // validators
            if (!Utils.isNullOrEmpty(meta.validators)) {
                meta.validators.forEach((validator) => {
                    var validatorElement: PacemBaseValidatorElement;
                    switch (validator.type) {
                        case 'required':
                            attrs['required'] = 'true';
                            validatorElement = <PacemRequiredValidatorElement>document.createElement(P + '-required-validator');
                            break;
                        case 'length':
                            let lengthValidator = <PacemLengthValidatorElement>document.createElement(P + '-length-validator');
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
                            let rangeValidator = <PacemRangeValidatorElement>document.createElement(P + '-range-validator');
                            validatorElement = rangeValidator;
                            let maxNum = validator.params && validator.params['max'];
                            let minNum = validator.params && validator.params['min'];
                            let isDateTime = tagName === P + '-datetime-picker';
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
                            let emailValidator = <PacemRegexValidatorElement>document.createElement(P + '-regex-validator');
                            validatorElement = emailValidator;
                            attrs['pattern'] = patternToString(emailValidator.pattern = "[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z0-9]{2,6}");
                            break;
                        case 'regex':
                            let regexValidator = <PacemRegexValidatorElement>document.createElement(P + '-regex-validator');
                            validatorElement = regexValidator;
                            let pattern: string | RegExp = validator.params['pattern'];
                            attrs['pattern'] = patternToString(pattern);
                            regexValidator.pattern = pattern;
                            break;
                        case 'binary':
                            let binaryValidator = <PacemBinaryValidatorElement>document.createElement(P + '-binary-validator');
                            validatorElement = binaryValidator;
                            let filePattern: string | RegExp = validator.params['pattern'];
                            if (filePattern != null) {
                                attrs['pattern'] = patternToString(filePattern);
                                binaryValidator.pattern = filePattern;
                            }
                            let maxSize = validator.params && validator.params['maxSize'];
                            if (maxSize != null) {
                                binaryValidator.maxSize = maxSize;
                                attrs['max-size'] = '' + maxSize;
                            }
                            break;
                        case 'compare':
                            let compareValidator = <PacemCompareValidatorElement>document.createElement(P + '-compare-validator');
                            validatorElement = compareValidator;
                            let comparedTo = `{{ :host.entity.${validator.params['to']} }}`;
                            compareValidator.setAttribute('to', comparedTo);
                            let operator = compareValidator.operator = validator.params['operator'] || 'equal';
                            // In case of `date(time)` try to add some interaction with `datetime-picker`'s min/max props.
                            if (tagName === P + '-datetime-picker') {
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
                            break;
                        case 'async':
                            let asyncValidator = <PacemAsyncValidatorElement>document.createElement(P + '-async-validator');
                            validatorElement = asyncValidator;
                            asyncValidator.url = validator.params['url'];
                            let params: string[] = [],
                                dependsOn: { alias?: string, prop: string }[] = validator.params['dependsOn'];
                            params.push(`${meta.prop} : :host.entity.${meta.prop}`);
                            for (let depend of dependsOn || []) {
                                params.push(`${(depend.alias || depend.prop)} : :host.entity.${depend.prop}`);
                            }
                            asyncValidator.setAttribute('parameters', `{{ { ${(params.join(', '))} } }}`);
                            asyncValidator.method = validator.params['verb'] || Pacem.Net.HttpMethod.Get;
                            asyncValidator.setAttribute('fetch-credentials', '{{ :host.fetchCredentials }}');
                            asyncValidator.setAttribute('fetch-headers', '{{ :host.fetchHeaders }}');
                            break;
                    }
                    //
                    if (Utils.isNull(validatorElement)) {
                        throw `Cannot generate a formfield validator based on type: ${validator.type}.`;
                    } else {
                        validatorElement.watch = meta.prop;
                        validatorElement.setAttribute('hide', '{{ !this.invalid }}');
                        validatorElement.setAttribute('disabled', disabledAttr);
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
            this._container.insertBefore(field, this._container.firstElementChild);

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