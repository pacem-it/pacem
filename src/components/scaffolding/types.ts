﻿/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Scaffolding {

    export declare type DisplayMetadata = {
        name: string, description?: string, short?: string, watermark?: string, null?: string, ui?: string, format?: string,

        // css styles
        css?: { [name: string]: string },

        // css class
        cssClass?: string[],

        /** Metadata icons are currently managed only at TypeMetadata-level and only in particular scenarios (e.g. CMS). */
        icon?: string
    }

    type CompareValidatorOperator = 'equal' | 'lessOrEqual' | 'less' | 'greater' | 'greaterOrEqual' | 'notEqual';

    export declare type KnownValidatorMetadata =
        { type: 'required', errorMessage: string }
        | { type: 'email', errorMessage: string }
        | { type: 'length', errorMessage: string, params: { min?: number, max?: number } }
        | { type: 'range', errorMessage: string, params: { min?: number | string | Date, max?: number | string | Date } }
        | { type: 'regex', errorMessage: string, params: { pattern: string | RegExp } }
        | { type: 'binary', errorMessage: string, params: { pattern?: string, maxSize?: number } }
        | { type: 'compare', errorMessage: string, params: { value: any, operator?: CompareValidatorOperator } | { to: string, operator?: CompareValidatorOperator } | { toProperty: string, operator?: CompareValidatorOperator } }
        | { type: 'async', errorMessage: string, params: { url: string, verb?: Pacem.Net.HttpMethod, dependsOn?: DependsOn[] } }
        ;

    export declare type ValidatorType = Omit<string, 'required' | 'email' | 'length' | 'range' | 'regex' | 'binary' | 'compare' | 'async'>;
    export declare type ValidatorManifest = { [name: string]: string };
    export declare type PropertyMetadataValidatorFactory = (host: Element, hostRef?: string, entityRef?: string) => ValidatorManifest;

    export declare type ValidatorMetadata = KnownValidatorMetadata
        | { type: ValidatorType, errorMessage: string, params?: any }
        | { type: ValidatorType, attributes: PropertyMetadataValidatorFactory };

    export declare type CommandMetadata = { name: string, tooltip?: string, icon: string, cssClass?: string[], prepend?: boolean, dependsOnValue?: boolean };

    export declare type DependsOn = {
        prop: string,
        alias?: string,
        value?: any,
        hide?: boolean
    }

    type TooltipTypeMetadata = 'html' | 'md' | 'markdown' | 'text' | boolean;
    export declare type TooltipBalloonMetadata = {
        type: TooltipTypeMetadata,
        position?: Pacem.Components.UI.BalloonPosition,
        trigger?: Pacem.Components.UI.BalloonTrigger,
        align?: Pacem.Components.UI.BalloonAlignment
    };
    export declare type TooltipMetadata = {
        tooltip?: TooltipTypeMetadata | TooltipBalloonMetadata
    }

    type PropertyMetadataExtraCore = { dependsOn?: DependsOn[] | PropertyMetadataDependsOnFactory }
        & TooltipMetadata;

    type PropertyMetadataExtraDatasource = { source?: Function | any[], sourceUrl?: string, verb?: Pacem.Net.HttpMethod, valueProperty?: string, textProperty?: string, disabledProperty?: string }
        & { /* radio-list */ enum?: any[] }
        & { /* suggest */ itemtemplate?: string | HTMLTemplateElement, filterFields?: string[] | string };

    type PropertyMetadataExtraSnapshot = { width?: number, height?: number, thumbHeight?: number, thumbWidth?: number, snapshot?: boolean, uploadUrl?: string, fetchUrl?: string };
    type PropertyMetadataExtraTags = { allowNew?: boolean, allowDuplicates?: boolean };
    type PropertyMetadataExtraChildform = { lockItems?: boolean };
    type PropertyMetadataExtraUpload = { maxImageWidth?: number, maxImageHeight?: number, parallelism?: number, chunkSize?: number, uploadUrl?: string };
    type PropertyMetadataExtraSlider = { step?: 'any' | number };
    type PropertyMetadataExtraDatetime = { format?: string | Intl.DateTimeFormatOptions };

    export declare type PropertyMetadataExtra = PropertyMetadataExtraCore
        & (
            // one-to-many, ... datasources
            PropertyMetadataExtraDatasource
            // snapshot/imageUrl (deprecatable)
            & PropertyMetadataExtraSnapshot
            // tags
            & PropertyMetadataExtraTags
            // child-forms
            & PropertyMetadataExtraChildform
            // upload
            & PropertyMetadataExtraUpload
            // slider
            & PropertyMetadataExtraSlider
            // datetime
            & PropertyMetadataExtraDatetime
        );

    export declare type FieldManifest = { tagName: string, attrs?: { [name: string]: string }, children?: FieldManifest[] };
    export declare type PropertyMetadataFieldFactory = (host: Element, hostRef?: string, entityRef?: string) => FieldManifest;

    export declare type DependsOnManifest = { disabledAttr: string, hideAttr?: string, /**@ dependency parameters */parameterAttrs?: { [alias: string]: string } };
    export declare type PropertyMetadataDependsOnFactory = (host: Element, hostRef?: string, entityRef?: string, fieldEntityRef?: string) => DependsOnManifest;

    // to be continued
    export declare type PropertyMetadata = {
        prop: string,
        type: 'object' | 'array' | string | /* let the possibility to inject custom scaffolding elements */ PropertyMetadataFieldFactory,
        display?: DisplayMetadata,
        extra?: PropertyMetadataExtra
        // leave space to immagination
        & { [key: string]: any },
        isReadOnly?: boolean,
        dataType?: string,
        isComplexType?: boolean,
        isNullable?: boolean,
        validators?: ValidatorMetadata[],
        commands?: CommandMetadata[],
        // child entities
        /** Either the metadata of an 'object' or the metadata of the single item of an homogeneous 'array'. */
        props?: TypeMetadata | PropertyMetadata[]
    };

    // It is important that Type- and Property-Metadata match in their core properties in order to allow nesting forms when rendered.
    export declare type TypeMetadata = {

        display?: DisplayMetadata,

        props: PropertyMetadata[],

        // one form? many subforms?
        type?: 'object' | 'array'
    }
}

namespace Pacem.Components.Scaffolding {

    /** @deprecated */
    export declare type PropertyMetadata = Pacem.Scaffolding.PropertyMetadata;

    export interface PacemFormOrField {

        dirty: boolean;
        valid: boolean;
        name: string;
        form: PacemFormElement;
        setPristine(): void;
        setDirty(): void;
    }

    export interface PacemModel extends PacemFormOrField {

        value: any;
        viewValue: string;
        reset(): void;
    }

    export declare type BinaryValue = {
        name: string, size: number, type: string, lastModified: number | string | Date, /** base64 binary string */content: string,
        encoding?: string
    };

    const ORIGINAL_VALUE_FIELD = 'pacem:model:original-value';

    export abstract class PacemFormRelevantElement extends PacemElement {

        @Watch({ converter: PropertyConverters.Element }) form: PacemFormElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.form = CustomElementUtils.findAncestorOfType(this, PacemFormElement);
        }
    }

    export abstract class PacemModelElement extends PacemFormRelevantElement implements PacemModel {

        viewActivatedCallback() {
            super.viewActivatedCallback();
            const name = this.name,
                form = this.form;
            if (!Utils.isNullOrEmpty(name) && !Utils.isNull(form)
                && (!this.hasAttribute('autobind')
                    || (this.getAttribute('autobind') !== 'off' && this.getAttribute('autobind') !== 'false')
                )) {
                form.registerField(name, this);

                // automatic bind value given the field name
                if (!this.hasAttribute('value')) {

                    const formId = form.id = form.id || 'frm_' + Utils.uniqueCode();
                    this.setAttribute('value', `{{ #${formId}.entity.${name}, twoway }}`);
                }
            }
            this._setAsOriginalValue(this.value);
        }

        propertyChangedCallback(name: string, old: any, val: any, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'value':
                    this.viewValue = this.getViewValue(val);
                    break;
                case 'valid':
                    if (!val) {
                        Utils.addClass(this, PCSS + '-invalid');
                    } else {
                        Utils.removeClass(this, PCSS + '-invalid');
                    }
                    break;
                case 'dirty':
                    if (val) {
                        Utils.addClass(this, PCSS + '-dirty');
                    } else {
                        Utils.removeClass(this, PCSS + '-dirty');
                    }
                    break;
                case 'name':
                    let form = this.form;
                    if (form != null) {
                        if (old) form.unregisterField(old);
                        form.registerField(val, this);
                    }
                    break;
                case 'form':
                    let n = this.name;
                    if (!Utils.isNullOrEmpty(n)) {
                        if (old != null) old.unregisterField(n);
                        if (val != null) val.registerField(n, this);
                    }
                    break;
            }
        }

        disconnectedCallback() {
            let name = this.name,
                form = this.form;
            if (!Utils.isNullOrEmpty(name) && !Utils.isNull(form))
                form.unregisterField(name);
            super.disconnectedCallback();
        }

        protected get originalValue(): any {
            return CustomElementUtils.getAttachedPropertyValue(this, ORIGINAL_VALUE_FIELD);
        }

        private _setAsOriginalValue(v: any) {
            CustomElementUtils.setAttachedPropertyValue(this, ORIGINAL_VALUE_FIELD, v);
        }

        protected abstract getViewValue(value: any): string;

        reset(): void {
            this.value = this.originalValue;
            // then
            this.dirty = false;
        }

        setPristine(): void {
            this._setAsOriginalValue(this.value);
            //
            this.dirty = false;
        }

        setDirty(): void {
            this.dirty = true;
        }

        protected abstract convertValueAttributeToProperty(attr: string): any;
        protected abstract compareValuePropertyValues(old, val): boolean;

        @Watch({ converter: PropertyConverters.String }) viewValue: string;
        @Watch({
            converter: {
                convert: (attr: string, element?: HTMLElement) => {
                    if (!(element instanceof PacemModelElement))
                        return attr;
                    return element.convertValueAttributeToProperty(attr);
                },
                convertBack: (prop: any) => prop.toString()
            }
        }) value: any;
        @Watch({ converter: PropertyConverters.Boolean }) dirty: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) valid: boolean;
        @Watch({ converter: PropertyConverters.String }) name: string;
    }

    export abstract class PacemBaseElement extends PacemModelElement {

        protected compareValuePropertyValues(old: any, val: any): boolean {
            return DefaultComparer(old, val);
        }

        @Watch({ converter: PropertyConverters.Boolean }) required: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) autofocus: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) readonly: boolean;
        @Watch({ converter: PropertyConverters.String }) name: string;

        @Watch({ converter: PropertyConverters.String }) placeholder: string;

        protected abstract get inputFields(): HTMLElement[];

        protected abstract toggleReadonlyView(readonly: boolean): void;

        protected get preventKeyboardSubmit(): boolean {
            return false;
        }

        /**
         * When implemented in a derived class, must handle the `UI -> value` change logic and returns the value that has been set.
         * @param evt {Event} Original event triggered by the user
         */
        protected abstract onChange(evt?: Event): PromiseLike<any>;

        /**
         * When implemented in a derived class, must handle the `value -> UI` synchronization logic.
         * @param val Current value
         */
        protected abstract acceptValue(val: any);

        propertyChangedCallback(name: string, old: any, val: any, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'required':
                case 'disabled':
                case 'autofocus':
                case 'placeholder':
                case 'readonly':
                    for (let inputField of this.inputFields)
                        val ? inputField.setAttribute(name, val) : inputField.removeAttribute(name);
                    break;
                //case 'name':
                case 'tabOrder':
                    for (let inputField of this.inputFields)
                        inputField.setAttribute('tabindex', val);
                    break;
                case 'value':
                    this.acceptValue(val);
                    break;
            }
            if (name === 'required'
                || name === 'disabled'
                || name === 'readonly') {
                let className = `${PCSS}-${name}`;
                val ? Utils.addClass(this, className) : Utils.removeClass(this, className);
            }

            if (name === 'readonly') {
                this.toggleReadonlyView(val);
            }
            // aria-... attributes
            else if (name === 'required') {
                this.aria.attributes.set('required', !!val + '');
            } else if (name === 'valid') {
                // Specs say that 'aria-invalid' on required attributes SHOULD NOT be set before submission, 
                // think about a 'submitted state'(?) to check against...
                this.aria.attributes.set('invalid', (!val && !!this.dirty) + '');
            }
        }

        private _preFocusValue: any;
        protected focusHandler = (evt: FocusEvent) => {

            const focusFieldgroup = (add = true) => {

                // TODO: re-think, since this is an ugly workaround just to properly set the outline and borders of the fieldgroup 
                if (Utils.is(this.parentElement, '.' + PCSS + '-fieldgroup')) {
                    (add ? Utils.addClass : Utils.removeClass).apply(this, [this.parentElement, PCSS + '-focus']);
                }
            };
            const blurFieldgroup = () => focusFieldgroup(false);

            switch (evt.type) {
                case 'focus':
                    Utils.addClass(this, PCSS + '-focus');
                    focusFieldgroup();
                    this._preFocusValue = this.value;
                    break;
                case 'blur':
                    Utils.removeClass(this, PCSS + '-focus');
                    blurFieldgroup();
                    break;
            }
            if (evt.bubbles)
                this.emit(evt);
            else
                this.dispatchEvent(new FocusEvent(evt.type));
        };

        protected changeHandler = (evt: Event) => {
            const val = this.value;
            this.onChange(evt).then(v => {
                if (!this.compareValuePropertyValues(val, v)) {
                    this.dispatchEvent(new Event('change'));
                    this.dirty = true;
                }
            }, _ => {
                // do nothing
            });
        }

        protected keydownHandler = (evt: KeyboardEvent) => {
            stopPropagationHandler(evt);
        }

        protected keyupHandler = (evt: KeyboardEvent) => {
            switch (evt.keyCode) {
                case /* Esc */27:

                    stopPropagationHandler(evt);

                    // choose between reset and set
                    if (this.compareValuePropertyValues(this.originalValue, this._preFocusValue)) {
                        this.reset();
                    } else {
                        this.value = this._preFocusValue;
                    }
                    this.blur();

                    break;

                case /* Enter */13:
                    if (this.preventKeyboardSubmit) {

                        stopPropagationHandler(evt);

                    }
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.toggleReadonlyView(this.readonly || false);

            // aria-attribute
            if (!Utils.isNullOrEmpty(this.id)) {
                const label = document.querySelector(`label[for=${this.id}]`);
                if (label) {
                    if (label.id) {
                        this.aria.attributes.set('labelledby', label.id);
                    } else {
                        this.aria.attributes.set('label', label.textContent);
                    }
                } else {
                    this.aria.attributes.remove('labelledby');
                    this.aria.attributes.remove('label');
                };
            }

            for (let inputField of this.inputFields) {
                inputField.addEventListener('focus', this.focusHandler, false);
                inputField.addEventListener('blur', this.focusHandler, false);
                inputField.addEventListener('change', this.changeHandler, false);
                // avoid interference with other handlers (e.g. cref UI.PacemAdapterElement)
                inputField.addEventListener('keydown', this.keydownHandler, false);
                inputField.addEventListener('keyup', this.keyupHandler, false);
                inputField.addEventListener('mousedown', Pacem.stopPropagationHandler, false);
                inputField.addEventListener('touchstart', Pacem.stopPropagationHandler, { passive: false, capture: false });
            }

        }

        disconnectedCallback() {

            for (let inputField of this.inputFields) {
                if (Utils.isNull(inputField)) continue;
                inputField.removeEventListener('touchstart', Pacem.stopPropagationHandler, { capture: false });
                inputField.removeEventListener('keydown', this.keydownHandler, false);
                inputField.removeEventListener('keyup', this.keyupHandler, false);
                inputField.removeEventListener('mousedown', Pacem.stopPropagationHandler, false);
                //
                inputField.removeEventListener('change', this.changeHandler, false);
                inputField.removeEventListener('focus', this.focusHandler, false);
                inputField.removeEventListener('blur', this.focusHandler, false);
            }
            super.disconnectedCallback();
        }

        focus() {
            const fields = this.inputFields;
            if (fields && fields.length) {
                fields[0].focus();
            }
        }

        blur() {
            const fields = this.inputFields;
            if (!Utils.isNullOrEmpty(fields)) {
                for (let field of fields) {
                    field.blur();
                }
            }
        }
    }

    export declare type DataSourceItem = { value: any, viewValue: string, disabled?: boolean, data: any };
    export declare type DataSource = DataSourceItem[];

    export abstract class PacemItemElement<TContainer extends PacemItemsContainerBaseElement<any>> extends PacemElement {

        #container: TContainer;

        /** @overridable */
        protected findContainer(): TContainer {
            return CustomElementUtils.findAncestor(this, n => n instanceof PacemItemsContainerBaseElement);
        }

        protected get container() {
            return this.#container;
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            const container = this.#container = this.findContainer();
            if (!Utils.isNull(container)) {
                container.register(this);
            }
        }

        disconnectedCallback() {
            if (!Utils.isNull(this.#container)) {
                this.#container.unregister(this);
            }
            super.disconnectedCallback();
        }
    }

    export abstract class PacemItemsContainerBaseElement<TItem extends HTMLElement> extends PacemBaseElement implements ItemsContainer<TItem> {

        @Watch(/* can only be databound or assigned at runtime */) items: TItem[];

        /**
         * Registers a new item among the items.
         * @param item {PacemDataItemElement} Item to be enrolled
         */
        register(item: TItem) {
            let flag = true;
            if (Utils.isNull(this.items)) {
                this.items = [item];
            }
            else if (this.items.indexOf(item) === -1) {
                this.items.push(item);
            } else {
                flag = false;
            }
            return flag;
        }

        /**
         * Removes an existing element from the items.
         * @param item {PacemDataItemElement} Item to be removed
         */
        unregister(item: TItem) {
            const ndx = !Utils.isNull(this.items) && this.items.indexOf(item);
            if (ndx >= 0) {
                this.items.splice(ndx, 1)[0];
                return true;
            }
            return false;
        }

    }

    @CustomElement({ tagName: P + '-data-item' })
    export class PacemDataItemElement extends PacemItemElement<PacemDataSourceElement> {

        @Watch({
            converter: {
                convert: (attr: string, element?: Element) => {
                    // boolean?
                    if (attr === 'true') return true;
                    if (attr === 'false') return false;
                    // number?
                    let num = parseFloat(attr);
                    if (!isNaN(num)) return num;
                    // date?
                    let date = Utils.Dates.parse(attr);
                    if (Utils.Dates.isDate(date)) return date;
                    return attr;
                },
                convertBack: (prop: any) => prop.toString()
            }
        }) value: any;
        @Watch({ converter: PropertyConverters.String }) label: string;
        @Watch({ converter: PropertyConverters.Boolean }) disabled: boolean;

    }

    export abstract class PacemDataSourceElement extends PacemItemsContainerBaseElement<PacemDataItemElement> {

        constructor(protected multipleChoice: boolean = false) {
            super();
        }

        @Watch({ emit: false, converter: PropertyConverters.Json })
        datasource: any[];

        @Watch({ emit: false, converter: PropertyConverters.String })
        valueProperty: string;

        @Watch({ emit: false, converter: PropertyConverters.String })
        textProperty: string;

        @Watch({ emit: false, converter: PropertyConverters.String })
        disabledProperty: string;

        @Watch({ emit: false, converter: PropertyConverters.String })
        compareBy: string;

        @Watch({ converter: PropertyConverters.Json })
        protected adaptedDatasource: DataSource;

        /**
         * Registers a new item among the items.
         * @param item {PacemDataItemElement} Item to be enrolled
         */
        register(item: PacemDataItemElement) {
            const flag = super.register(item);
            if (flag) {
                item.addEventListener(PropertyChangeEventName, this._itemPropertyChangedHandler, false);
            }
            return flag;
        }

        /**
         * Removes an existing element from the items.
         * @param item {PacemDataItemElement} Item to be removed
         */
        unregister(item: PacemDataItemElement) {
            const flag = super.register(item);
            if (flag) {
                item.removeEventListener(PropertyChangeEventName, this._itemPropertyChangedHandler, false);
            }
            return flag;
        }

        private _itemPropertyChangedHandler = (evt: PropertyChangeEvent) => {
            this.databind();
        };

        protected buildAdaptedDatasource(ds = this.datasource): DataSource {
            return ds && ds.map(i => this.mapEntityToItem(i));
        }

        @Debounce(true)
        protected databind(datasource: DataSource = this.buildAdaptedDatasource(this.datasource)) {
            if (Utils.isNull(datasource) && Utils.isNull(this.adaptedDatasource))
                return;
            const ds = this.adaptedDatasource = datasource || [];/*
                .map(i => this.mapEntityToItem(i))*/;
            if (Utils.isNullOrEmpty(ds.filter(i => this.isDataSourceItemSelected(i))))
                this.handleDatasourceMismatch(ds);
        }

        protected handleDatasourceMismatch(datasource: DataSourceItem[]) {
            this.value = undefined;
        }

        /**
         * Checks wether the provided `item` matches the control's criteria for a selected option against a provided value (which defaults to control's value).
         * @param item {any} item to check against
         * @param value {any} value to match
         */
        protected isItemSelected(item: any, value: any = this.value) {
            if (Utils.isNullOrEmpty(value)) {
                return false;
            }
            const v = this.mapEntityToValue(item),
                c = this.compareBy;

            if (this.multipleChoice && Utils.isArray(value))
                return !Utils.isNull((<any[]>value).find(j =>
                    // caution: numbers and strings might be compared, ease the comparison by loosing equality constraints: `===` to `==`.
                    j /* value item */ ==/*=*/ v /* datasource item */ || (typeof j === 'object' && !Utils.isNullOrEmpty(c) && c in v && c in j && v[c] ==/*=*/ j[c]))
                );
            else if (!this.multipleChoice) {
                return value ==/*=*/ v || (typeof value === 'object' && !Utils.isNullOrEmpty(c) && c in v && c in value && v[c] ==/*=*/ value[c]);
            } else {
                return false;
            }
        }

        /**
         * Checks wether the provided `item` matches the control's criteria for a selected option against a provided value (which defaults to control's value).
         * @param item {DataSourceItem} item to check against
         * @param value {any} value to match
         */
        protected isDataSourceItemSelected(item: DataSourceItem, value: any = this.value) {
            if (Utils.isNullOrEmpty(value)) {
                return false;
            }
            if (item.disabled) {
                return false;
            }
            const c = this.compareBy;
            if (this.multipleChoice && Utils.isArray(value)) {
                // caution: numbers and strings might be compared, ease the comparison by loosing equality constraints: `===` to `==`.
                let found = (<any[]>value).find(j => j ==/*=*/ item.value || (typeof j === 'object' && !Utils.isNullOrEmpty(c) && c in j && !Utils.isNullOrEmpty(item.value) && c in item.value && j[c] ==/*=*/ item.value[c]));
                return !Utils.isNull(found);
            } else if (!this.multipleChoice && !Utils.isNullOrEmpty(item.value)) {
                return value ==/*=*/ item.value || (typeof value === 'object' && !Utils.isNullOrEmpty(c) && c in value && !Utils.isNullOrEmpty(item.value) && c in item.value && value[c] ==/*=*/ item.value[c]);
            } else {
                return false;
            }
        }

        protected mapEntityToValue(entity: any): any {
            if (entity == null)
                throw 'entity cannot be null';

            // declared
            if (entity instanceof PacemDataItemElement) {
                return entity.value;
            }

            // databound
            let value = entity, prop;
            if (prop = this.valueProperty) {
                value = entity[prop];
            }
            return value;
        }

        protected mapEntityToViewValue(entity: any): string {
            if (entity == null)
                throw 'entity cannot be null';

            // declared
            if (entity instanceof PacemDataItemElement) {
                return entity.label || entity.value;
            }

            // databound
            let viewValue = entity.toString(), prop;
            if (prop = this.textProperty) {
                viewValue = entity[prop];
            }
            return viewValue;
        }

        protected mapEntityToItem(entity: any): DataSourceItem {
            if (entity == null)
                throw 'entity cannot be null';

            // declared
            if (entity instanceof PacemDataItemElement) {
                return { value: entity.value, viewValue: entity.label || entity.value, disabled: entity.disabled, data: entity };
            }

            // databound
            let disabled = false;
            const disabledProp = this.disabledProperty;
            if (!Utils.isNullOrEmpty(disabledProp)) {
                disabled = entity[disabledProp] || false;
            }
            return { value: this.mapEntityToValue(entity), viewValue: this.mapEntityToViewValue(entity), disabled: disabled, data: entity };
        }

        private _handle: number;
        private _handleItems: number;

        propertyChangedCallback(name: string, old, val, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'datasource':
                case 'textProperty':
                case 'disabledProperty':
                case 'valueProperty':
                    cancelAnimationFrame(this._handle);
                    this._handle = requestAnimationFrame(() => {
                        this.databind();
                        // refresh view value, since it depends on selected items.
                        this.viewValue = this.getViewValue(this.value);
                    });
                    break;
                case 'items':
                    cancelAnimationFrame(this._handleItems);
                    this._handleItems = requestAnimationFrame(() => {
                        this.datasource = this.items;
                    });
                    break;
            }
        }

        protected getViewValue(val: any): string {
            if (Utils.isNullOrEmpty(this.datasource)) {
                return undefined;
            }
            return this.datasource.filter(i => this.isItemSelected(i)).map(i => this.mapEntityToViewValue(i)).join(', ');
        }

        protected convertValueAttributeToProperty(attr: string) {
            if (this.multipleChoice)
                return attr.split(',').map(i => i.trim());
            return attr;
        }

        protected compareValuePropertyValues(old, val): boolean {
            return Utils.areSemanticallyEqual(old, val);
        }

    }

}