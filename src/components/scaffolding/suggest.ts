/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />

namespace Pacem.Components.Scaffolding {

    class SuggestionSelectEvent extends CustomTypedEvent<{ selectedValue: any }> {
        constructor(value) {
            super('suggestionselect', { selectedValue: value })
        }
    }

    @CustomElement({
        tagName: P + '-suggest', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${PCSS}-relative"><input type="text" class="${PCSS}-input" />
<${P}-button clear
class="button-flat ${PCSS}-anim anim-pop anim-sudden anim-quick pos-absolute absolute-right absolute-top display-block ${PCSS}-margin margin-0" 
    icon-glyph="highlight_off"></${P}-button>
<${P}-button 
class="button-flat icon-rotate ${PCSS}-anim anim-pop anim-sudden anim-quick pos-absolute absolute-right absolute-top display-block ${PCSS}-margin margin-0" 
    icon-glyph="arrow_drop_down" toggle></${P}-button>
</div>
<span class="${PCSS}-readonly"><${P}-text text="{{ :host.viewValue }}"></${P}-text></span>
<${P}-repeater on-${RepeaterItemCreateEventName}=":host._itemCreate($event)" on-${RepeaterItemRemoveEventName}=":host._itemRemove($event)">
    <ol>
        <${P}-template-proxy></${P}-template-proxy>
    </ol>
</${P}-repeater><${P}-content></${P}-content>
<template>
    <li><${P}-span content="{{ $pacem.highlight(^item.viewValue, ::_input.value) }}"></${P}-span></li>
</template>`
    })
    export class PacemSuggestElement extends PacemDataSourceElement {

        @ViewChild('input[type=text]') private _input: HTMLInputElement;
        @ViewChild(P + '-repeater') private _repeater: PacemRepeaterElement;
        @ViewChild(`span.${PCSS}-readonly`) private span: HTMLSpanElement;
        @ViewChild(`template`) private _defaultTemplate: HTMLTemplateElement;
        @ViewChild(P + '-template-proxy') private _tmplProxy: PacemTemplateProxyElement;
        @ViewChild(`${P}-button[toggle]`) private _btnArrow: UI.PacemButtonElement;
        @ViewChild(`${P}-button[clear]`) private _btnClear: UI.PacemButtonElement;

        private _balloon: UI.PacemBalloonElement;

        protected get inputFields() {
            return [this._input];
        }

        @Watch({ converter: PropertyConverters.String }) hint: string;
        @Watch({ emit: false, converter: PropertyConverters.Number }) maxSuggestions: number;
        @Watch({ converter: PropertyConverters.Boolean }) allowTyping: boolean;
        /** Relevant in a rich/plain text header dashboard, in order to avoid the editing control to lose focus. */
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) preventFocus: boolean;
        @Watch({ emit: false, converter: PropertyConverters.Element }) itemtemplate: HTMLTemplateElement;
        /** Fields (in addition to 'textProperty') used to filter the datasource */
        @Watch({ emit: false, converter: PropertyConverters.StringArray }) filterFields: string[];
        /** Whether allow or not values not available in the suggestions. If set to `true`, works only for primitive values. */
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) allowNew: boolean;
        private _downOn: EventTarget;

        protected acceptValue(val: any) {
            if (!this._isTyping()
                && (this.allowNew || !Utils.isNullOrEmpty(this.datasource))
            ) {
                this.hint = '';
                this._input.value = this.getViewValue(val) || '';
            }
        }

        protected getViewValue(val) {
            var superValue = super.getViewValue(val);
            if (Utils.isNullOrEmpty(superValue) && this.allowNew && !Utils.isNullOrEmpty(val)) {
                superValue = this.mapEntityToViewValue(val);
            }
            return superValue;
        }

        protected onChange(evt?: Event) {
            return new Promise<any>((resolve, reject) => {
                // change triggered elsewhere... (see _afterSelectHandler)
                if (evt.type === 'suggestionselect') {
                    const val = (<SuggestionSelectEvent>evt).detail.selectedValue;
                    this.value = val;
                    if (val) {
                        this.popout();
                    }
                    resolve(val);
                    this._unlockSelection();
                } else {
                    // keep the current value
                    resolve(this.value);
                }
            });
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();

            this._setDropdownMode();
            this._setupItemTemplate();

            var balloon = this._createBalloon();
            balloon.appendChild(this._repeater);
            this._checkBalloon(balloon);

            const shell = CustomElementUtils.findAncestorShell(this);
            shell.appendChild(balloon);
            this._balloon = balloon;

            this._input.addEventListener('mousedown', this._focusHandler, false);
            this._input.addEventListener('keydown', this._keydownHandler, false);
            this._input.addEventListener('keyup', this._keyupHandler, false);
            this._input.addEventListener('focus', this._focusHandler, false);
            this._btnClear.addEventListener('mousedown', this._clearBtnHandler, false);
            this._btnArrow.addEventListener('mousedown', this._toggleBtnHandler, false);

            this._databind();
            this._syncButtons();
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (Utils.isNull(this._balloon)) {
                return;
            }
            const typing = this._isTyping();
            switch (name) {
                case 'adaptedDatasource':
                    if (!Utils.isNullOrEmpty(val)) {
                        if (!typing) {
                            this._input.value = this.getViewValue(this.value);
                        } else {
                            this.popup();
                        }
                    } else {
                        this.popout();
                    }
                    break;
                case 'hint':
                    if (!typing) {
                        this._input.value = val;
                    }
                    break;
                case 'disabled':
                case 'value':
                case 'readonly':
                    this._checkBalloon();
                    break;
                case 'itemtemplate':
                    if (!first) {
                        this._setupItemTemplate();
                    }
                    break;
                case 'allowTyping':
                    if (!first) {
                        this._setDropdownMode();
                    }
                    break;
            }

            if (['adaptedDatasource', 'hint', 'value'].indexOf(name) >= 0) {
                this._databind();
            }
            if (['allowTyping', 'value', 'hint'].indexOf(name) >= 0) {
                this._syncButtons();
            }
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._balloon)) {
                this._balloon.removeEventListener('popup', this._balloonPopupHandler, false);
                this._balloon.removeEventListener('popout', this._balloonPopoutHandler, false);
                this._balloon.remove();
            }
            if (!Utils.isNull(this._input)) {
                this._input.removeEventListener('mousedown', this._focusHandler, false);
                this._input.removeEventListener('focus', this._focusHandler, false);
                this._input.removeEventListener('keydown', this._keydownHandler, false);
                this._input.removeEventListener('keyup', this._keyupHandler, false);
            }
            if (!Utils.isNull(this._btnClear)) {
                this._btnClear.removeEventListener('mousedown', this._clearBtnHandler, false);
            }
            if (!Utils.isNull(this._btnArrow)) {
                this._btnArrow.addEventListener('mousedown', this._toggleBtnHandler, false);
            }
            super.disconnectedCallback();
        }

        private _databind() {
            if (!Utils.isNull(this._repeater)) {
                this._repeater.datasource = this._filter(this.adaptedDatasource, this.hint, this.value);
            }
        }

        private _syncButtons() {
            if (!Utils.isNull(this._btnArrow)) {
                // hide="{{ !$pacem.isNullOrEmpty(:host.hint || :host.value) || :host.allowTyping !== false }}"
                this._btnArrow.hide = this.allowTyping !== false || !Utils.isNullOrEmpty(this.hint || this.value);
            }
            if (!Utils.isNull(this._btnClear)) {
                //  hide="{{ $pacem.isNullOrEmpty(:host.hint || :host.value) }}"
                this._btnClear.hide = Utils.isNullOrEmpty(this.hint || this.value);
            }
        }

        private _toggleBtnHandler = (evt: MouseEvent) => {
            evt.preventDefault();
            if (!this.disabled) {
                this._balloon.toggle();
            }
        }

        private _clearBtnHandler = (evt: MouseEvent) => {
            evt.preventDefault();
            this._lockSelection();
            this.value = void 0;
            this._unlockSelection();

            if (!this.preventFocus) {
                this._input.focus();
            }
            this.popup();
        }

        private _isTyping() {
            return !this.#selecting && Utils.is(this._input, ':focus'); // && this.viewValue !== this._input.value;
        }

        #selecting: boolean;
        private _lockSelection(unlock = false) {
            this.#selecting = !unlock;
            this._checkBalloon();
        }
        private _unlockSelection() {
            this._lockSelection(true);
        }

        private _balloonPopupHandler = (evt: Event) => {
            Utils.addClass(this._btnArrow, 'rotate-180');
        };

        private _balloonPopoutHandler = (evt: Event) => {
            Utils.removeClass(this._btnArrow, 'rotate-180');
        };

        private _focusHandler = (evt: Event) => {
            if (this.preventFocus) {
                // manage the balloon toggle manually (since focus won't be dispatched)
                evt.preventDefault();
                const balloon = this._balloon;
                if (!balloon.visible) {
                    this.popup();
                } else {
                    this.popout();
                }
            }

            const actualHint = (this._downOn = this._input).value;
            if (this.viewValue != actualHint) {
                this.hint = actualHint;
            }
            // now just lean on the balloon's trigger, it will popup eventually...
        };

        private _keyupHandler = (evt: KeyboardEvent) => {
            if (evt.target !== this._downOn) {
                Pacem.avoidHandler(evt);
            }
            else if /* TODO: check this clause against TAB navigation */ (this._isTyping()) {
                this.hint = this._input.value;
                this.changeHandler(new SuggestionSelectEvent(null));
            }
        }

        private _keydownHandler = (evt: KeyboardEvent) => {
            this._downOn = evt.target;
            var el: HTMLElement;
            switch (evt.keyCode) {
                case 40: /*arrow down*/
                case 9: /*tab*/
                case 13: /* enter */
                    if (this._balloon.visible === true && !Utils.isNull(el = <HTMLElement>this._repeater.querySelector('ol > li'))) {
                        while (!Utils.isNull(el) && el.dataset['pacemDisabled'] === 'true' && el.localName === 'li') {
                            el = <HTMLElement>el.nextElementSibling;
                        }
                        Pacem.avoidHandler(evt);
                        if (!Utils.isNull(el)) {
                            this._focus(el);
                        }
                    }
                    break;
            }
        }

        private _setDropdownMode(allowTyping = this.allowTyping) {
            const dropdown = !(allowTyping ?? true);
            this._input.readOnly = dropdown;
        }

        private _setupItemTemplate() {
            if (this.itemtemplate instanceof HTMLTemplateElement) {

                const frag = (<HTMLTemplateElement>this.itemtemplate.cloneNode(true)).content;
                const tmpl = document.createElement('template');
                const li = document.createElement('li');
                li.append(frag);
                tmpl.content.appendChild(li);
                this._tmplProxy.target = tmpl;

            } else {
                this._tmplProxy.target = this._defaultTemplate;
            }
        }

        private _focus(el: HTMLElement) {
            if (Utils.isNull(el) || this.preventFocus) {
                return;
            }
            el.focus();
            el.dispatchEvent(new Event('focus', { bubbles: true }));
        }

        private _selectHandler = (evt: MouseEvent | KeyboardEvent) => {

            const _this = this;
            var fn = function (e: Event) {
                Pacem.avoidHandler(e);

                const el = e.currentTarget as HTMLElement,
                    value = JSON.parse(el.dataset['pacemValue']),
                    disabled = el.dataset['pacemDisabled'] === 'true'
                    ;
                if (!disabled) {
                    _this._lockSelection();
                    _this.changeHandler(new SuggestionSelectEvent(value));
                }
            };
            if ((evt instanceof KeyboardEvent && (evt.keyCode === 9 /*tab*/
                || evt.keyCode === 13 /*enter*/
                || evt.keyCode === 32 /*space-bar*/))
                || evt.type === 'mousedown'
            ) {
                fn.apply(this, [evt]);
            } else if (evt instanceof KeyboardEvent) {
                this._downOn = evt.target;
                var li = (<HTMLLIElement>evt.target),
                    target: HTMLElement = li;
                switch (evt.keyCode) {
                    case 38 /*arrow up*/:
                        do {
                            target = <HTMLElement>target.previousElementSibling;
                        } while (!Utils.isNull(target) && target.dataset['pacemDisabled'] === 'true');
                        target = target || this._input;
                        Pacem.avoidHandler(evt);
                        break;
                    case 40 /*arrow down*/:
                        do {
                            target = <HTMLElement>(target.nextElementSibling);
                        } while (!Utils.isNull(target) && target.localName === 'li' && target.dataset['pacemDisabled'] === 'true')
                        target = target || li;
                        Pacem.avoidHandler(evt);
                        break;
                    case 27 /*esc*/:
                        this.popout();
                        Pacem.avoidHandler(evt);
                        break;
                }
                this._focus(target);
            }
        }

        private _afterSelectHandler = (evt: KeyboardEvent) => {
            // keyup event
            if (evt.keyCode === 9 /*tab*/
                || evt.keyCode === 13 /*enter*/
                || evt.keyCode === 32 /*space-bar*/) {
                Pacem.avoidHandler(evt);
            }
        }

        private _filter(ds: DataSource, hint?: string, value = this.value): DataSource {
            let datasource = ds || [];
            //if (!Utils.isNull(value)) {
            //    datasource = datasource.filter(i => i.value == value);
            //} else 
            if (!Utils.isNullOrEmpty(hint && hint.trim())) {
                const lowerHints = hint.toLowerCase().split(' ');
                let filtered = datasource.filter(i => {
                    for (let lowerHint of lowerHints) {
                        if (i.viewValue.toLowerCase().indexOf(lowerHint) >= 0) {
                            return true;
                        }
                        // check the whole 'data' object, just in case
                        const filters = this.filterFields;
                        if (!Utils.isNullOrEmpty(filters)) {
                            const iData = i.data;
                            if (typeof iData === 'object' && !Utils.isNullOrEmpty(iData)) {
                                for (let prop in iData) {
                                    if (filters.indexOf(prop) === -1) {
                                        continue;
                                    }
                                    const iPropValue = iData[prop];
                                    if (Utils.isNullOrEmpty(iPropValue)) {
                                        continue;
                                    }
                                    if (iPropValue.toString().toLowerCase().indexOf(lowerHint) >= 0) {
                                        return true;
                                    }
                                }
                            }
                        }
                    }
                    return false;
                });
                const concatenate = this.allowNew
                    // only concatenate on plain strings...
                    && Utils.isNullOrEmpty(this.valueProperty)
                    && Utils.isNullOrEmpty(this.textProperty)
                    // ...and no matches are available
                    && (Utils.isNullOrEmpty(filtered) || Utils.isNull(filtered.find(i => i.viewValue === hint)));
                datasource = concatenate ? [{ value: hint, viewValue: hint, data: hint }].concat(filtered) : filtered;
            }
            let retval = datasource;
            if (this.allowTyping !== false) {
                // max-suggestions enabled only when typing is allowed (default)
                retval = datasource.slice(0, this.maxSuggestions || 10);
            }
            //
            if (this._isTyping()) {
                this.popup();
            }
            this._balloon.style.opacity = Utils.isNullOrEmpty(retval) ? '0' : '';
            this.log(Logging.LogLevel.Log, `${retval.length} dropdown suggestion(s), given hint '${hint}' and ${(ds || []).length} datasource items`);
            return retval;
        }

        private _itemCreate(evt: RepeaterItemCreateEvent) {
            const li = <HTMLLIElement>evt.detail.dom.find(i => i instanceof HTMLLIElement);
            const item = evt.detail.item;
            const index = evt.detail.index;
            const disabled = item.disabled === true;
            li.tabIndex = disabled ? -1 : 0;
            li.dataset['pacemValue'] = JSON.stringify(item.value);
            li.dataset['pacemViewValue'] = JSON.stringify(item.viewValue);
            li.dataset['pacemDisabled'] = disabled.toString();
            li.addEventListener('keydown', this._selectHandler, false);
            li.addEventListener('keyup', this._afterSelectHandler, false);
            li.addEventListener('mousedown', this._selectHandler, false);
        }

        private _itemRemove(evt: RepeaterItemCreateEvent) {
            const li = <HTMLLIElement>evt.detail.dom.find(i => i instanceof HTMLLIElement);
            li.removeEventListener('keydown', this._selectHandler, false);
            li.removeEventListener('keyup', this._afterSelectHandler, false);
            li.removeEventListener('mousedown', this._selectHandler, false);
        }

        protected toggleReadonlyView(readonly: boolean) {
            this.span.hidden = !readonly;
            this._input.hidden = readonly;
            if (readonly) {
                this._btnClear.hide = this._btnArrow.hide = true;
            } else {
                this._syncButtons();
            }
        }

        /* 
        Balloon and repeater
        */

        popup() {
            if (!Utils.isNullOrEmpty(this.adaptedDatasource)) {
                this._balloon?.popup();
            }
        }

        popout() {
            console.log('popping out');
            this._balloon?.popout();
        }

        private _checkBalloon(balloon: UI.PacemBalloonElement = this._balloon) {
            if (!Utils.isNull(balloon)) {
                const hasValue = !Utils.isNullOrEmpty(this.value) && !Utils.isNullOrEmpty(this._input.value) && Utils.isNullOrEmpty(this.hint);
                balloon.disabled = this.#selecting || hasValue || this.readonly || this.disabled || /* normalize to an actual boolean */false;// || Pacem.Utils.isNullOrEmpty(this.adaptedDatasource);
            }
        }

        private _createBalloon(): UI.PacemBalloonElement {
            /*<${ P }-balloon target="{{ ::_input }}" options="{ position: 'bottom', align: 'left', behavior: 'inert', hoverDelay: 0 }"
disabled="{{ :host.readonly || Pacem.Utils.isNullOrEmpty(:host.adaptedDatasource) }}">*/
            const balloon = <UI.PacemBalloonElement>document.createElement(P + '-balloon');
            Utils.addClass(balloon, 'suggest dropdown');
            balloon.options = {
                trackPosition: true,
                trigger: UI.BalloonTrigger.Focus,
                position: UI.BalloonPosition.VerticalAuto,
                size: UI.BalloonSizing.Match,
                align: UI.BalloonAlignment.Start,
                behavior: UI.BalloonBehavior.Menu, // UI.BalloonBehavior.Inert,
                hoverDelay: 0, hoverTimeout: 0
            };
            balloon.addEventListener('popup', this._balloonPopupHandler, false);
            balloon.addEventListener('popout', this._balloonPopoutHandler, false);
            balloon.target = this._input;
            return balloon;
        }
    }

}