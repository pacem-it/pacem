/// <reference path="types.ts" />
/// <reference path="input.ts" />
/// <reference path="element-picker.ts" />

namespace Pacem.Components.Scaffolding {

    export enum ExpressionSource {
        Constant = 'const',
        PropertyReference = 'property',
        Expression = 'expr'
    }

    @CustomElement({
        tagName: P + '-expression', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-collapse class="${PCSS}-expression" collapse="{{ !:host._editing }}">
    <div class="expression-builder ${PCSS}-grid grid-tiny-rowgap grid-tiny-colgap ${PCSS}-pad pad-bottom-2">
        <div class="${PCSS}-cell">
            <${P}-select value="{{ :host._source, twoway }}" class="display-block">
                <${P}-data-item value="${ExpressionSource.Constant}" label="constant value"></${P}-data-item>
                <${P}-data-item value="${ExpressionSource.PropertyReference}" label="property reference"></${P}-data-item>
                <${P}-data-item value="${ExpressionSource.Expression}" label="complex expression"></${P}-data-item>
            </${P}-select>
        </div>

        <${P}-panel class="${PCSS}-cell cols-hd-6" hide="{{ :host._source !== '${ExpressionSource.PropertyReference}' }}">
            <${P}-element-picker value="{{ :host._sourceRef, twoway }}" selector="{{ :host.selector }}" filter="{{ :host.filter }}" labeler="{{ :host.labeler }}" class="display-block"></${P}-element-picker>
        </${P}-panel>
        <${P}-panel class="${PCSS}-cell cols-hd-6" hide="{{ :host._source !== '${ExpressionSource.PropertyReference}' }}">
            <${P}-property-picker disabled="{{ !:host._sourceRef }}" target="{{ :host._sourceRef }}" on-change="::_editor.focus()" value="{{ :host._propRef, twoway }}" class="display-block"></${P}-property-picker>
        </${P}-panel>

        <${P}-panel class="${PCSS}-cell">
            <${P}-textarea class="display-block" placeholder="{{ '{{ '+ (:host._source || '') +'... }}' }}" change-policy="${ChangePolicy.Blur}"></${P}-textarea>
        </${P}-panel>
    </div>
</${P}-collapse>
<div class="${PCSS}-fieldset">
    <div class="fieldset-left">
        <div class="${PCSS}-fieldgroup ${PCSS}-viewfinder">
            <div><span class="text-ellipsed ${PCSS}-viewfinder display-block text-tech ${PCSS}-pad pad-left-1 pad-right-1">{{ :host.value || '...' }}</span></div>
            <${P}-panel class="fieldgroup-prepend">
                <${P}-button class="flat edit ${PCSS}-pad pad-left-1" on-click=":host._editing = !:host._editing" hide="{{ :host.readonly }}"></${P}-button>
            </${P}-panel>
            <${P}-panel class="fieldgroup-append text-tech" hide="{{ Pacem.Utils.isNullOrEmpty(:host.value) }}">
                <i class="${PCSS}-icon text-primary">keyboard_arrow_right</i>
                <${P}-text text="?" class="bg-primary ${PCSS}-pad pad-left-1 pad-right-1 ${PCSS}-margin margin-right-1" eval></${P}-text>
            </${P}-panel>
        </div>
    </div>
</div>`
    })
    export class PacemExpressionElement extends PacemElementPickerElementBase {

        @Watch({ emit: false }) converter: PropertyConverter;

        // private
        @Watch({ converter: PropertyConverters.Boolean }) private _editing: boolean;
        @Watch({ converter: PropertyConverters.String }) private _source: ExpressionSource;
        @Watch({ converter: PropertyConverters.Element }) private _sourceRef: HTMLElement;
        @Watch({ converter: PropertyConverters.String }) private _propRef: string;

        @ViewChild(P + '-element-picker') private _picker: PacemElementPickerElement;
        @ViewChild(P + '-textarea') private _editor: PacemTextAreaElement;
        @ViewChild('span.' + PCSS + '-viewfinder') private _view: HTMLElement;
        @ViewChild(P + '-text') private _eval: PacemTextElement;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'converter') {
                this._setFeedbackText(this.value);
            } else if (!first) {
                if (this._editing) {
                    switch (name) {
                        case '_source':
                            switch (val) {
                                case ExpressionSource.PropertyReference:
                                    this._picker.focus();
                                    break;
                                default:
                                    this._editor.focus();
                                    break;
                            }
                            break;
                        case '_propRef':
                            if (!Utils.isNullOrEmpty(val)) {
                                this._editor.focus();
                                this._editor.value = '{{ #' + this._sourceRef.id + '.' + val + '  }}';
                            }
                            this.changeHandler(new Event('change'));
                            break;
                    }
                }
            }
        }

        protected get inputFields(): HTMLElement[] {
            return [this._editor];
        }

        protected toggleReadonlyView(readonly: boolean): void {
            if (readonly) {
                // ensure not editing
                this._editing = false;
            }
        }

        protected onChange(_?: Event): PromiseLike<any> {
            return Utils.fromResult(this.value = this._editor.value);
        }

        protected acceptValue(val: any) {
            this._view.textContent = val || '...';
            this._setFeedbackText(val);
            this._reverseStructure();
            if (val !== this._editor.value) {
                this._editor.value = val;
            }
        }

        private _setFeedbackText(val = this.value) {
            const converter = this.converter;
            if (CustomElementUtils.isBindingAttribute(val) || typeof (converter && converter.convert) !== 'function') {
                this._eval.setAttribute('text', val);
            } else if (val === undefined) {
                this._eval.text = '<undefined>';
            } else {
                this._eval.text = converter.convert(val);
            }
        }

        protected getViewValue(value: any): string {
            return value;
        }

        protected convertValueAttributeToProperty(attr: string) {
            return attr;
        }

        @Debounce(50)
        private _reverseStructure() {

            let cleanup = () => {
                this._source = this._sourceRef = this._propRef = /*this.value =*/ undefined;
            }

            // dependencies?
            let expr = this.value;
            if (!Utils.isNullOrEmpty(expr)) {
                // setup the most likely form fields
                if (CustomElementUtils.isBindingAttribute(expr)) {
                    const expression = CustomElementUtils.parseBindingAttribute(expr, this),
                        deps = expression.dependencies;
                    // complex or simple (one dependency) expression
                    if (Utils.isNullOrEmpty(deps) || deps.length > 1) {
                        this._source = ExpressionSource.Expression;
                    } else {
                        const dep = deps[0];
                        this._source = ExpressionSource.PropertyReference;
                        this._sourceRef = document.querySelector('#' + (<HTMLElement>dep.element).id);
                        this._propRef = dep.path;
                    }
                } else {
                    this._source = ExpressionSource.Constant;
                }
                //
            } else {
                cleanup();
            }

        }
    }

}