/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="char-counter.ts" />
/// <reference path="input.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({ tagName: P + '-textarea-markdown', template: `<textarea class="${PCSS}-input" pacem></textarea>${ CHAR_COUNTER_CHILD }<div class="${PCSS}-readonly ${PCSS}-markdown"></div>`, shadow: Defaults.USE_SHADOW_ROOT })
    export class PacemMarkdownTextAreaElement extends PacemTextualInputElement
        implements OnPropertyChanged, OnViewActivated, OnDisconnected {

        constructor(private _md = new MarkdownService()) {
            super();
        }

        @Watch({ emit: false, converter: PropertyConverters.Number }) rows = 5;
        @Watch({ emit: false, converter: PropertyConverters.Number }) cols = 50;


        @ViewChild('textarea') input: HTMLTextAreaElement;
        @ViewChild(`div.${PCSS}-readonly`) private _markdown: HTMLDivElement;

        protected toggleReadonlyView(readonly: boolean) {
            this.input.hidden = readonly;
        }

        protected get inputFields(): HTMLTextAreaElement[] {
            return [this.input];
        }

        protected getViewValue(val: any): string {
            return this._md.toHtml(val);
        }

        propertyChangedCallback(name: string, old: any, val: any, first: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'rows'
                || name === 'cols') {
                this.inputField.setAttribute(name, val);
            } else if (name == 'viewValue') {
                this._markdown.innerHTML = val;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.input.addEventListener("keydown", this._keydownHandler, false);
        }

        disconnectedCallback() {
            this.input &&
                this.input.removeEventListener("keydown", this._keydownHandler, false);
            super.disconnectedCallback();
        }

        private _keydownHandler = (evt: KeyboardEvent) => {
            if (evt.keyCode === 9 /* tab */) {
                const input = this.input,
                    value = input.value;
                var ndx = input.selectionStart;
                input.value = value.substr(0, ndx) + '    ' + value.substr(ndx);
                Pacem.preventDefaultHandler(evt);
            }
        };

    }

}