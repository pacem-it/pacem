/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />

namespace Pacem.Components.Scaffolding {

    class SuggestionSelectEvent extends CustomTypedEvent<{ selectedValue: any }> {
        constructor(value) {
            super('suggestionselect', { selectedValue: value })
        }
    }

    @CustomElement({
        tagName: 'pacem-suggest', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<input type="text" class="pacem-input" />
<span class="pacem-readonly"><pacem-text text="{{ :host.viewValue }}"></pacem-text></span>
<pacem-repeater datasource="{{ :host._filter(:host.adaptedDatasource, :host.hint) }}"
    on-${ RepeaterItemCreateEventName}=":host._itemCreate($event)"
    on-${ RepeaterItemRemoveEventName}=":host._itemRemove($event)">
    <ol>
        <template>
            <li><pacem-span content="{{ $pacem.highlight(^item.viewValue, ::_input.value) }}"></pacem-span></li>
        </template>
    </ol>
</pacem-repeater><pacem-content></pacem-content>`
    })
    export class PacemSuggestElement extends PacemDataSourceElement {

        @ViewChild('input[type=text]') private _input: HTMLInputElement;
        @ViewChild('pacem-repeater') private _repeater: PacemRepeaterElement;
        @ViewChild('span.pacem-readonly') private span: HTMLSpanElement;
        /*@ViewChild('pacem-balloon')*/ private _balloon: UI.PacemBalloonElement;

        protected get inputFields() {
            return [this._input];
        }

        @Watch({ converter: PropertyConverters.String }) hint: string;
        @Watch({ converter: PropertyConverters.Number }) maxSuggestions: number;
        /** Whether allow or not values not available in the suggestions. If set to `true`, works only for primitive values. */
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) allowNew: boolean;
        private _downOn: EventTarget;

        protected acceptValue(val: any) {
            if (!this._isTyping()
                && (this.allowNew || !Utils.isNullOrEmpty(this.datasource))
            ) {
                this.hint = '';
                this._input.value = this.getViewValue(this.value) || '';
            }
        }

        protected getViewValue(val) {
            var superValue = super.getViewValue(val);
            if (Utils.isNullOrEmpty(superValue) && this.allowNew && !Utils.isNullOrEmpty(val)) {
                superValue = this.mapEntityToViewValue(val);
            }
            return superValue;
        }

        private _isTyping() {
            return Utils.is(this._input, ':focus');
        }

        protected onChange(evt?: Event) {
            var deferred = DeferPromise.defer<any>();
            // change triggered elsewhere... (see _afterSelectHandler)
            if (evt.type === 'suggestionselect') {
                const val = (<SuggestionSelectEvent>evt).detail.selectedValue;
                this.value = val;
                if (val) {
                    this._balloon.popout();
                }
                deferred.resolve(val);
            } else
                // keep the current value
                deferred.resolve(this.value);
            return deferred.promise;
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();

            var balloon = this._createBalloon();
            balloon.appendChild(this._repeater);
            this._checkBalloon(balloon);
            document.body.appendChild(balloon);
            this._balloon = balloon;

            this._input.addEventListener('keydown', this._keydownHandler, false);
            this._input.addEventListener('keyup', this._keyupHandler, false);
            this._input.addEventListener('focus', this._focusHandler, false);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (Utils.isNull(this._balloon))
                return;
            switch (name) {
                case 'datasource':
                    if (!Utils.isNullOrEmpty(val) && !this._isTyping()) {
                        this._input.value = this.getViewValue(this.value);
                    }
                    break;
                case 'hint':
                    if (!this._isTyping()) {
                        this._input.value = val;
                    }
                    break;
                case 'disabled':
                case 'readonly':
                    this._checkBalloon();
                    break;
            }
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._balloon)) {
                this._balloon.remove();
            }
            if (!Utils.isNull(this._input)) {
                this._input.removeEventListener('focus', this._focusHandler, false);
                this._input.removeEventListener('keydown', this._keydownHandler, false);
                this._input.removeEventListener('keyup', this._keyupHandler, false);
            }
            super.disconnectedCallback();
        }
        
        private _focusHandler = (evt: Event) => {
            this.hint = this._input.value;
        };

        private _keyupHandler = (evt: KeyboardEvent) => {
            if (evt.target !== this._downOn)
                Pacem.avoidHandler(evt);
            else //if (this._input.value !== this.viewValue)
            {
                this.hint = this._input.value;
                this.changeHandler(new SuggestionSelectEvent(null));
            }
        }

        private _keydownHandler = (evt: KeyboardEvent) => {
            this._downOn = evt.target;
            var el: HTMLElement;
            if (evt.keyCode === 40 || evt.keyCode === 9) {
                if (this._balloon.visible === true && !Utils.isNull(el = <HTMLElement>this._repeater.querySelector('ol > li'))) {
                    Pacem.avoidHandler(evt);
                    this._focus(el);
                }
            }
        }

        private _focus(el: HTMLElement) {
            if (Utils.isNull(el))
                return;
            el.focus();
            el.dispatchEvent(new Event('focus', { bubbles: true }));
        }

        private _selectHandler = (evt: MouseEvent | KeyboardEvent) => {

            var fn = function (e) {
                const value = JSON.parse(e.currentTarget.dataset['pacemValue']),
                    viewValue = JSON.parse(e.currentTarget.dataset['pacemViewValue']);
                Pacem.avoidHandler(e);
                this.changeHandler(new SuggestionSelectEvent(value));
            };
            if ((evt instanceof KeyboardEvent && (evt.keyCode === 9 /*tab*/
                || evt.keyCode === 13 /*enter*/
                || evt.keyCode === 32 /*space-bar*/))
                || evt.type === 'click') {
                fn.apply(this, [evt]);
            } else if (evt instanceof KeyboardEvent) {
                this._downOn = evt.target;
                var li = (<HTMLLIElement>evt.target),
                    target: HTMLElement;
                switch (evt.keyCode) {
                    case 38 /*arrow up*/:
                        target = <HTMLElement>(li.previousElementSibling || this._input);
                        Pacem.avoidHandler(evt);
                        break;
                    case 40 /*arrow down*/:
                        if (li.nextElementSibling && li.nextElementSibling.localName === 'li')
                            target = <HTMLElement>(li.nextElementSibling);
                        Pacem.avoidHandler(evt);
                        break;
                }
                this._focus(target);
            }
        }

        private _afterSelectHandler = (evt: KeyboardEvent) => {
            if (evt.keyCode === 9 /*tab*/
                || evt.keyCode === 13 /*enter*/
                || evt.keyCode === 32 /*space-bar*/) {
                Pacem.avoidHandler(evt);
            }
        }

        private _filter(ds: DataSource, hint?: string): DataSource {
            let datasource = ds || [];
            if (!Utils.isNullOrEmpty(hint && hint.trim())) {
                const lowerHints = hint.toLowerCase().split(' ');
                let filtered = datasource.filter(i => {
                    for (let lowerHint of lowerHints) {
                        if (i.viewValue.toLowerCase().indexOf(lowerHint) >= 0)
                            return true;
                    }
                    return false;
                });
                const concatenate = this.allowNew
                    && Utils.isNullOrEmpty(this.valueProperty)
                    && Utils.isNullOrEmpty(this.textProperty)
                    && (Utils.isNullOrEmpty(filtered) || Utils.isNull(filtered.find(i => i.viewValue === hint)));
                datasource = concatenate ? [{ value: hint, viewValue: hint }].concat(filtered) : filtered;
            }
            let retval = datasource.slice(0, this.maxSuggestions || 10);
            this._balloon.style.opacity = Utils.isNullOrEmpty(retval) ? '0' : '';
            //if (this._isTyping && retval.length > 0) {
            //    this._balloon.popup();
            //} else {
            //    this._balloon.popout();
            //}
            this.log(Logging.LogLevel.Log, `${retval.length} dropdown suggestion(s), given hint '${hint}' and ${(ds || []).length} datasource items`);
            return retval;
        }

        private _itemCreate(evt: RepeaterItemCreateEvent) {
            const li = <HTMLLIElement>evt.detail.dom.find(i => i instanceof HTMLLIElement);
            const item = evt.detail.item;
            const index = evt.detail.index;
            li.tabIndex = 0;
            li.dataset['pacemValue'] = JSON.stringify(item.value);
            li.dataset['pacemViewValue'] = JSON.stringify(item.viewValue);
            li.addEventListener('keydown', this._selectHandler, false);
            li.addEventListener('keyup', this._afterSelectHandler, false);
            li.addEventListener('click', this._selectHandler, false);
        }

        private _itemRemove(evt: RepeaterItemCreateEvent) {
            const li = <HTMLLIElement>evt.detail.dom.find(i => i instanceof HTMLLIElement);
            li.removeEventListener('keydown', this._selectHandler, false);
            li.removeEventListener('keyup', this._afterSelectHandler, false);
            li.removeEventListener('click', this._selectHandler, false);
        }

        protected toggleReadonlyView(readonly: boolean) {
            this.span.hidden = !readonly;
            this._input.hidden = readonly;
        }

        /* 
        Balloon and repeater
        */
        private _checkBalloon(balloon: UI.PacemBalloonElement = this._balloon) {
            if (!Utils.isNull(balloon))
                balloon.disabled = this.readonly || this.disabled;// || Pacem.Utils.isNullOrEmpty(this.adaptedDatasource);
        }

        private _createBalloon(): UI.PacemBalloonElement {
            /*<pacem-balloon target="{{ ::_input }}" options="{ position: 'bottom', align: 'left', behavior: 'inert', hoverDelay: 0 }"
disabled="{{ :host.readonly || Pacem.Utils.isNullOrEmpty(:host.adaptedDatasource) }}">*/
            const balloon = <UI.PacemBalloonElement>document.createElement('pacem-balloon');
            Utils.addClass(balloon, 'suggest dropdown');
            balloon.options = {
                trackPosition: true,
                trigger: UI.BalloonTrigger.Focus,
                position: UI.BalloonPosition.Bottom,
                align: UI.BalloonAlignment.Start,
                behavior: UI.BalloonBehavior.Menu, // UI.BalloonBehavior.Inert,
                hoverDelay: 0, hoverTimeout: 200
            };
            balloon.target = this._input;
            return balloon;
        }
    }

}