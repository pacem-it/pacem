/// <reference path="../types.ts" />
namespace Pacem.Components.Cms {

    export enum ExpressionSource {
        Constant = 'const',
        WidgetPropertyReference = 'widget',
        Expression = 'expr'
    }

    /** Complex editor (hierarchical form) for declarative expressions. */
    @CustomElement({
        tagName: P + '-expression', shadow: false, template: `<${P}-collapse collapse="{{ !:host._editing }}">
<hr />
<!-- expression dependency type -->
<div class="row form-group m-b-10">
  <label class="col-md-3 col-form-label">source</label>
    <${P}-select type="text" class="col-md-9" value="{{ :host._source, twoway }}" on-change="::_exprBox.value = ''">
        <fg-data-item value="${ExpressionSource.Constant}" label="constant value"></fg-data-item>
        <fg-data-item value="${ExpressionSource.WidgetPropertyReference}" label="widget property"></fg-data-item>
        <fg-data-item value="${ExpressionSource.Expression}" label="complex expression (advanced)"></fg-data-item>
    </${P}-select>
</div>
<!-- widget selector -->
<${P}-panel class="row form-group m-b-10" hide="{{ :host._source != '${ ExpressionSource.WidgetPropertyReference}' }}">
  <label class="col-md-3 col-form-label">widget</label>
    <${P}-select class="col-md-9" on-change="::_exprBox.value = ''" value="{{ :host._sourceReference, twoway }}" level-2></${P}-select>
</${P}-panel>
<!-- widget property selector -->
<${P}-panel class="row form-group m-b-10" hide="{{ Pacem.Utils.isNullOrEmpty(:host._sourceReference) }}">
  <label class="col-md-3 col-form-label"><${P}-text text="{{ :host._sourceReference }}"></${P}-text></label>
    <${P}-select class="col-md-9" on-change="::_exprBox.value = '{{ '+ this._getFormattedReferenceExpression() +' }}'" value="{{ :host._refProperty, twoway }}" level-3></${P}-select>
</${P}-panel>
<!-- expression editor -->
<${P}-panel class="row form-group m-b-10" hide="{{ :host._source == '${ExpressionSource.WidgetPropertyReference}' && Pacem.Utils.isNullOrEmpty(:host._refProperty)  }}">
    <label class="col-md-3 col-form-label">
        <${P}-text text="{{ (:host._source == '${ExpressionSource.Constant}') ? 'constant value' : 'edit expression' }}"></${P}-text>
    </label>
    <div class="input-group col-md-9">
        <input type="text" class="text-monospace form-control" placeholder="{{ :host._source +'...' }}" level-3 />
        <div class="input-group-append" hidden expression>
            <button class="btn btn-success"><i class="fa fa-check"></i></button>
        </div>
    </div>
</${P}-panel>
</${P}-collapse>

<div class="input-group" toggler>
    <div class="input-group-prepend">
        <button class="btn btn-default" method>...</btn>
    </div>
    <code class="form-control text-truncate"><${P}-text text="{{ :host.value }}"></${P}-text></code>
    <div class="input-group-append">
        <button class="btn btn-default" toggler><i class="fa fa-code"></i></button>
    </div>
</div>
<!-- feedback panel (result) -->
<${P}-panel class="note note-primary text-truncate m-t-5" hide="{{ Pacem.Utils.isNullOrEmpty(:host.value) }}">=> <b><${P}-text eval></${P}-text></b></${P}-panel>`
    })
    export class PacemExpressionElement extends Pacem.Components.Scaffolding.PacemBaseElement {

        protected get inputFields(): HTMLElement[] {
            return [this._exprBox];
        }

        protected toggleReadonlyView(readonly: boolean): void {
            this._editing = false;
        }
        protected onChange(evt?: Event): PromiseLike<any> {
            return new Promise((resolve, reject) => {
                resolve(this.value = this._exprBox.value);
            });
        }
        protected acceptValue(val: any) {
            this._exprBox.value = val;
            if (!Utils.isNullOrEmpty(val)) {
                this._eval.setAttribute('text',
                    // ACHTUNG! TODO: handle this substitution properly!
                    (val || '').split('$this').join('::widget'));
            } else {
                this._eval.removeAttribute('text');
            }
            //
            this._reverseStructure();
        }

        protected getViewValue(value: any): string {
            return value;
        }

        protected convertValueAttributeToProperty(attr: string) {
            return attr;
        }

        @ViewChild(`${P}-select[level-2]`) private _sourceSelect: Pacem.Components.Scaffolding.PacemSelectElement;
        @ViewChild(`${P}-select[level-3]`) private _propSelect: Pacem.Components.Scaffolding.PacemSelectElement;
        @ViewChild('input[level-3]') private _exprBox: HTMLInputElement;
        @ViewChild(`${P}-text[eval]`) private _eval: Pacem.Components.PacemTextElement;

        @ViewChild('button[toggler]') private _btn: HTMLButtonElement;
        @ViewChild('button[method]') private _mode: HTMLButtonElement;
        @ViewChild('.input-group[toggler]') private _toggler: HTMLElement;
        @ViewChild('div[expression]') private _exprWrapper: HTMLElement;

        // privately observed properties
        @Watch({ converter: PropertyConverters.Boolean }) private _editing: boolean;
        @Watch({ converter: PropertyConverters.String }) private _source: ExpressionSource;

        @Watch({ converter: PropertyConverters.String }) private _sourceReference: string;
        @Watch({ converter: PropertyConverters.String }) private _refProperty: string;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case '_source':
                    this._manageSourceType();
                    break;
                case '_sourceReference':
                    this._manageWidgetRefProperties();
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._toggler.addEventListener('click', this._togglerClickHandler, false);
            this._propSelect.addEventListener('change', this._propSelectChangeHandler, false);
            this._exprWrapper.firstElementChild.addEventListener('click', this._setExpressionHandler, false);
        }

        disconnectedCallback() {
            if (this._toggler) {
                this._toggler.removeEventListener('click', this._togglerClickHandler, false);
            }
            if (this._propSelect) {
                this._propSelect.removeEventListener('change', this._propSelectChangeHandler, false);
            }
            if (this._exprWrapper) {
                this._exprWrapper.firstElementChild.removeEventListener('click', this._setExpressionHandler, false);
            }
            super.disconnectedCallback();
        }

        private _setExpressionHandler = (evt: Event) => {
            this._exprBox.dispatchEvent(new Event("change"));
        }

        private _propSelectChangeHandler = (evt: Event) => {
            const v = Utils.isNullOrEmpty(this._propSelect.value) ? '' : `{{ ${this._getFormattedReferenceExpression()} }}`;
            this._exprBox.value = v;
            this._exprWrapper.hidden = false;
        }

        private _togglerClickHandler = (evt: Event) => {
            this._editing = !this._editing;
        }

        @Pacem.Debounce(50)
        /** Reverse build internal properties: from widget configuration to parameter pre-selections. */
        private _reverseStructure() {

            let cleanup = () => {
                this._exprWrapper.hidden = true;
                this._source = this._sourceReference = this._refProperty = /*this.value =*/ undefined;
            }

            // dependencies?
            let expr = this.value;
            if (!Utils.isNullOrEmpty(expr)) {
                // setup the most likely form fields
                if (Pacem.CustomElementUtils.isBindingAttribute(expr)) {
                    const expression = Pacem.CustomElementUtils.parseBindingAttribute(expr, this),
                        deps = expression.dependencies;
                    // complex or simple (one dependency) expression
                    if (Utils.isNullOrEmpty(deps) || deps.length > 1) {
                        this._source = ExpressionSource.Expression;
                    } else {
                        const dep = deps[0];
                        this._source = ExpressionSource.WidgetPropertyReference;
                        this._sourceReference = '#' + (<HTMLElement>dep.element).id;
                        this._refProperty = dep.path;
                    }
                } else {
                    this._source = ExpressionSource.Constant;
                }
                //
            } else {
                cleanup();
            }

        }

        /** TODO: generalize (include 'format' field?) */
        private _getFormattedReferenceExpression() {
            return `${this._sourceReference}.${this._refProperty}`;
        }

        /** Handles the change of selected source type. */
        private _manageSourceType() {
            let cssIcon = 'far fa-circle',
                cssClr = 'default';
            switch (this._source) {
                case ExpressionSource.Constant:
                    this._sourceReference = '';
                    cssIcon = 'fas fa-cube';
                    cssClr = 'info';
                    break;
                case ExpressionSource.Expression:
                    this._sourceReference = '';
                    cssIcon = 'fas fa-code';
                    cssClr = 'success';
                    break;
                case ExpressionSource.WidgetPropertyReference:
                    this._sourceReference = '';
                    this._sourceSelect.textProperty = 'label';
                    this._sourceSelect.valueProperty = 'ref';
                    this._sourceSelect.datasource = this._getAvailableWidgets().map(w => this._widgetProjector(w));
                    cssIcon = 'fas fa-code-branch';
                    cssClr = 'purple';
                    break;
            }
            this._btn.className =
                this._mode.className = 'btn btn-' + cssClr;
            this._mode.innerHTML = `<i class="${cssIcon}"></i>`;
        }

        private _widgetProjector(widget: PacemEventTarget): { label: string, ref: string, widget: PacemEventTarget } {
            var label = widget.constructor.name;
            if (widget.id) {
                label += '#' + widget.id;
            }
            //if (widget.tag) {
            //    label = `[${widget.tag}] ${label}`;
            //}
            return {
                label: label, widget: widget, ref: '#' + widget.id
            };
        }

        private _getAvailableWidgets(predicate?: (el: PacemEventTarget) => boolean): PacemEventTarget[] {
            const retval: PacemEventTarget[] = [];
            document.querySelectorAll('[pacem]').forEach((element, i, arr) => {
                if (element instanceof PacemEventTarget && (Utils.isNull(predicate) || predicate(element))) {
                    retval.push(element);
                }
            });
            return retval;
        }

        private _manageWidgetRefProperties() {
            if (Utils.isNullOrEmpty(this._sourceReference)) {
                this._propSelect.datasource = [];
                return;
            }

            let props: string[] = [];
            let src = document.querySelector(this._sourceReference);
            let observed = CustomElementUtils.getWatchedProperties(<HTMLElement>src);

            for (let obs0 of observed) {

                let obs = obs0.name;

                // add straight
                props.push(obs);

                let val = src[obs];
                if (typeof val === 'object' && val != null && !Utils.isArray(val)) {
                    for (let key of Object.keys(val)) {

                        // add nested
                        props.push(obs + '.' + key);
                    }
                }
            }

            this._propSelect.datasource = props;
        }
    }

}