/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Scaffolding {

    export declare type PropertyMetadata = {
        prop: string,
        type: string,
        display?: { name: string, description: string, short: string, watermark: string, null?: string, ui: string, format: string },
        extra?: any,
        isReadOnly?: boolean,
        dataType?: string,
        isComplexType?: boolean,
        isNullable?: boolean,
        validators?: { type: string, errorMessage: string, params?: any }[]
    };

}

namespace Pacem.Components.Scaffolding {

    /** @deprecated */
    export declare type PropertyMetadata = Pacem.Scaffolding.PropertyMetadata;

    export interface PacemFormOrField {

        dirty: boolean;
        valid: boolean;
        name: string;
        form: PacemFormElement;

    }

    export interface PacemModel extends PacemFormOrField {

        value: any;
        viewValue: string;
        metadata: PropertyMetadata
    }

    const ORIGINAL_VALUE_FIELD = 'pacem:model:original-value';

    export abstract class PacemFormRelevantElement extends PacemElement {

        private _form: PacemFormElement = null;

        get form(): PacemFormElement {
            return this._form || (this._form = CustomElementUtils.findAncestor(this, (n) => n instanceof PacemFormElement));
        }

        set form(v: PacemFormElement) {
            if (v == null)
                throw `Cannot set null ${PacemFormElement.name} instance.`;
            if (v !== this._form) {
                let old = this._form;
                this._form = v;
                this.propertyChangedCallback('form', old, v);
            }
        }
    }

    export abstract class PacemModelElement extends PacemFormRelevantElement implements PacemModel, OnViewActivated, OnPropertyChanged, OnDisconnected {

        viewActivatedCallback() {
            super.viewActivatedCallback();
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
                        Utils.addClass(this, 'pacem-invalid');
                    } else {
                        Utils.removeClass(this, 'pacem-invalid');
                    }
                    break;
                case 'dirty':
                    if (val) {
                        Utils.addClass(this, 'pacem-dirty');
                    } else {
                        Utils.removeClass(this, 'pacem-dirty');
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

        protected abstract convertValueAttributeToProperty(attr: string): any;

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
        metadata: PropertyMetadata;
    }

    export abstract class PacemBaseElement extends PacemModelElement implements OnPropertyChanged, OnViewActivated, OnDisconnected {

        @Watch({ converter: PropertyConverters.Boolean }) required: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) autofocus: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) readonly: boolean;
        @Watch({ converter: PropertyConverters.String }) name: string;

        @Watch({ converter: PropertyConverters.String })
        placeholder: string;

        protected abstract get inputFields(): HTMLElement[];

        protected abstract toggleReadonlyView(readonly: boolean): void;

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
                let className = `pacem-${name}`;
                val ? Utils.addClass(this, className) : Utils.removeClass(this, className);
            }
            if (name === 'readonly')
                this.toggleReadonlyView(val);
        }

        //private _focusHandle: number;
        protected focusHandler = (evt: FocusEvent) => {
            //cancelAnimationFrame(this._focusHandle);
            //this._focusHandle = requestAnimationFrame(() => {
            switch (evt.type) {
                case 'focus':
                    Utils.addClass(this, 'pacem-focus');
                    break;
                case 'blur':
                    Utils.removeClass(this, 'pacem-focus');
                    break;
            }
            if (evt.bubbles)
                this.emit(evt);
            else
                this.dispatchEvent(new FocusEvent(evt.type));
            //});
        };

        protected changeHandler = (evt: Event) => {
            const val = this.value;
            this.onChange(evt).then(v => {
                //if (evt.type === 'change')
                //    this.emit(evt);
                if (!Utils.areSemanticallyEqual(v, val)) {
                    this.dispatchEvent(new Event('change'));
                    this.dirty = true;
                }
            });
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.toggleReadonlyView(this.readonly || false);
            for (let inputField of this.inputFields) {
                inputField.addEventListener('focus', this.focusHandler, false);
                inputField.addEventListener('blur', this.focusHandler, false);
                inputField.addEventListener('change', this.changeHandler, false);
                // avoid interference with other handlers (e.g. cref UI.PacemAdapterElement)
                inputField.addEventListener('keydown', Pacem.stopPropagationHandler, false);
                inputField.addEventListener('mousedown', Pacem.stopPropagationHandler, false);
                inputField.addEventListener('touchstart', Pacem.stopPropagationHandler, { passive: false, capture: false });
            }
        }

        disconnectedCallback() {
            for (let inputField of this.inputFields) {
                if (Utils.isNull(inputField)) continue;
                inputField.removeEventListener('touchstart', Pacem.stopPropagationHandler, { capture: false });
                inputField.removeEventListener('keydown', Pacem.stopPropagationHandler, false);
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

    export declare type DataSourceItem = { value: any, viewValue: string };
    export declare type DataSource = DataSourceItem[];

    @CustomElement({ tagName: 'pacem-data-item' })
    export class PacemDataItemElement extends HTMLElement {

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

        private _container: PacemDataSourceElement;

        /** @overridable */
        private _findContainer(): PacemDataSourceElement {
            return CustomElementUtils.findAncestor(this, n => n instanceof PacemDataSourceElement);
        }

        viewActivatedCallback() {
            const container = this._container = this._findContainer();
            if (!Utils.isNull(container))
                container.register(this);
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._container))
                this._container.unregister(this);
        }
    }

    export abstract class PacemDataSourceElement extends PacemBaseElement implements ItemsContainer<PacemDataItemElement> {

        constructor(protected multipleChoice: boolean = false) {
            super();
        }

        @Watch(/* can only be databound or assigned at runtime */) items: PacemDataItemElement[];

        @Watch({ emit: false, converter: PropertyConverters.Json })
        datasource: any[];

        @Watch({ emit: false, converter: PropertyConverters.String })
        valueProperty: string;

        @Watch({ emit: false, converter: PropertyConverters.String })
        textProperty: string;

        @Watch({ emit: false, converter: PropertyConverters.String })
        compareBy: string;

        @Watch({ converter: PropertyConverters.Json })
        protected adaptedDatasource: DataSource;

        /**
         * Registers a new item among the items.
         * @param item {PacemDataItemElement} Item to be enrolled
         */
        register(item: PacemDataItemElement) {
            let flag = true;
            if (Utils.isNull(this.items)) {
                this.items = [item];
            }
            else if (this.items.indexOf(item) === -1) {
                this.items.push(item);
            } else {
                flag = false;
            }
            if (flag) {
                item.addEventListener(PropertyChangeEventName, this._itemPropertyChangedHandler, false);
            }
        }

        /**
         * Removes an existing element from the items.
         * @param item {PacemDataItemElement} Item to be removed
         */
        unregister(item: PacemDataItemElement) {
            const ndx = !Utils.isNull(this.items) && this.items.indexOf(item);
            if (ndx >= 0) {
                let item = this.items.splice(ndx, 1)[0];
                item.removeEventListener(PropertyChangeEventName, this._itemPropertyChangedHandler, false);
            }
        }

        private _itemPropertyChangedHandler = (evt: PropertyChangeEvent) => {
            this.databind();
        };

        protected databind(datasource: DataSource = this.datasource && this.datasource.map(i => this.mapEntityToItem(i))) {
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
            if (Utils.isNullOrEmpty(value))
                return false;
            const v = this.mapEntityToValue(item),
                c = this.compareBy;
            if (this.multipleChoice && Utils.isArray(value))
                return !Utils.isNull((<any[]>value).find(j =>
                    // caution: numbers and strings might be compared, ease the comparison by loosing equality constraints: `===` to `==`.
                    j /* value item */ ==/*=*/ v /* datasource item */ || (!Utils.isNullOrEmpty(c) && c in v && c in j && v[c] ==/*=*/ j[c]))
                );
            else if (!this.multipleChoice)
                return value ==/*=*/ v || (!Utils.isNullOrEmpty(c) && c in v && c in value && v[c] ==/*=*/ value[c]);
            else
                return false;
        }

        /**
         * Checks wether the provided `item` matches the control's criteria for a selected option against a provided value (which defaults to control's value).
         * @param item {DataSourceItem} item to check against
         * @param value {any} value to match
         */
        protected isDataSourceItemSelected(item: DataSourceItem, value: any = this.value) {
            if (Utils.isNullOrEmpty(value))
                return false;
            const c = this.compareBy;
            if (this.multipleChoice && Utils.isArray(value)) {
                // caution: numbers and strings might be compared, ease the comparison by loosing equality constraints: `===` to `==`.
                let found = (<any[]>value).find(j => j ==/*=*/ item.value || (!Utils.isNullOrEmpty(c) && c in j && c in item.value && j[c] ==/*=*/ item.value[c]));
                return !Utils.isNull(found);
            } else if (!this.multipleChoice)
                return value ==/*=*/ item.value || (!Utils.isNullOrEmpty(c) && c in value && c in item.value && value[c] ==/*=*/ item.value[c]);
            else
                return false;
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
            if (prop = this.valueProperty)
                value = entity[prop];
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
            if (prop = this.textProperty)
                viewValue = entity[prop];
            return viewValue;
        }

        protected mapEntityToItem(entity: any): DataSourceItem {
            if (entity == null)
                throw 'entity cannot be null';
            // declared
            if (entity instanceof PacemDataItemElement) {
                return { value: entity.value, viewValue: entity.label || entity.value };
            }
            // databound
            return { value: this.mapEntityToValue(entity), viewValue: this.mapEntityToViewValue(entity) };
        }

        private _handle: number;
        private _handleItems: number;

        propertyChangedCallback(name: string, old, val, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'datasource':
                case 'textProperty':
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
            if (Utils.isNullOrEmpty(this.datasource))
                return undefined;
            return this.datasource.filter(i => this.isItemSelected(i)).map(i => this.mapEntityToViewValue(i)).join(', ');
        }

        protected convertValueAttributeToProperty(attr: string) {
            if (this.multipleChoice)
                return attr.split(',').map(i => i.trim());
            return attr;
        }
    }

}