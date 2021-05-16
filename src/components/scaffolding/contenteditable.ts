/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="contenteditable/utils.ts" />
/// <reference path="char-counter.ts" />
namespace Pacem.Components.Scaffolding {

    const EXECUTECOMMAND_NAME = 'execute';
    const EMPTY_CONTENT = '<p><br></p>';

    export interface ContenteditableCommand {
        exec(...args: any[]): Promise<unknown>;
    }

    class ContenteditableChangeEvent extends CustomTypedEvent<{ html: string }> {
        constructor(html: string) {
            super('contenteditablechange', { html: html });
        }
    }

    export abstract class PacemContenteditableCommandElement extends PacemItemElement<PacemContenteditableElement> implements ContenteditableCommand {

        abstract exec(...args: any[]): Promise<any>;
        abstract isRelevant(range: Range): boolean;
        /**
         * Cleans up all its relevant markup in order to obtain the most pure output.
         * @param contentElement
         */
        abstract cleanUp(contentElement: HTMLElement): void;

        protected execCommand(...args: any[]) {
            const me = this;
            if (me.disabled) {
                return;
            }
            me.exec.apply(me, args).then(
                _ => {
                    me.dispatchEvent(new Event(EXECUTECOMMAND_NAME));
                },
                e => {
                    console.error(e);
                });
        }

        connectedCallback() {
            super.connectedCallback();
            Utils.addClass(this, PCSS + '-contenteditable-command');
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            const cnt = this.container;
            if (!Utils.isNull(cnt)) {
                this.contentElement = cnt.contentElement;
                cnt.addEventListener(PropertyChangeEventName, this._containerPropChangeHandler, false);
            }
        }

        disconnectedCallback() {
            const cnt = this.container;
            if (!Utils.isNull(cnt)) {
                cnt.removeEventListener(PropertyChangeEventName, this._containerPropChangeHandler, false);
            }
            super.disconnectedCallback();
        }

        @Watch() protected range: Range;
        @Watch() protected contentElement: HTMLDivElement;

        private _containerPropChangeHandler = (evt: PropertyChangeEvent) => {
            const p = evt.detail;
            this.containerPropertyChangedCallback(p.propertyName, p.oldValue, p.currentValue, p.firstChange);
        }

        protected containerPropertyChangedCallback(name: string, old, val, first?: boolean) {
            if (name === 'range') {
                this.range = val;
            }
        }
    }

    export interface ContenteditableFileCommand extends ContenteditableCommand {

        pasteCallback(file: File): PromiseLike<any>;

    }

    function isFileCommand(obj: any): obj is ContenteditableFileCommand {
        return obj instanceof PacemContenteditableCommandElement && 'pasteCallback' in obj && typeof obj['pasteCallback'] === 'function';
    }

    function isElement(node: Node): node is Element {
        return node?.nodeType == Node.ELEMENT_NODE;
    }

    @CustomElement({
        tagName: P + '-contenteditable', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${PCSS}-contenteditable ${PCSS}-viewfinder">
    <div contenteditable="true" role="presenter" pacem></div>
</div>${CHAR_COUNTER_CHILD}
<div dashboard>
    <${P}-content></${P}-content>
</div>`
    })
    export class PacemContenteditableElement extends PacemItemsContainerBaseElement<PacemContenteditableCommandElement> {

        constructor() {
            super('rich text editor');
            //this._workspace = document.createElement('div');
        }

        #history: Pacem.HistoryService<string>;
        get history() {
            return this.#history;
        }

        reset() {
            super.reset();
            this.#history.reset();
            this._fireHistoryChange();
        }

        private _fireHistoryChange() {
            const h = this.#history;
            this.dispatchEvent(new PropertyChangeEvent({ propertyName: 'history', oldValue: h, currentValue: h }));
        }

        protected convertValueAttributeToProperty(attr: string) {
            return attr;
        }

        @ViewChild("div[pacem]") private _container: HTMLDivElement;
        @ViewChild("div[dashboard]") private _dashboard: HTMLElement;

        @Watch() range: Range;

        protected toggleReadonlyView(readonly: boolean) {
            this._dashboard.hidden = readonly;
            if (readonly) {
                this._container.removeAttribute('contenteditable');
            } else {
                this._container.setAttribute('contenteditable', 'true');
                document.execCommand("defaultParagraphSeparator", false, "p");
            }
        }

        register(item: PacemContenteditableCommandElement) {
            if (super.register(item)) {
                item.addEventListener(EXECUTECOMMAND_NAME, this._checkChangedHandler, false);
                return true;
            }
            return false;
        }

        unregister(item: PacemContenteditableCommandElement) {
            if (super.unregister(item)) {
                item.removeEventListener(EXECUTECOMMAND_NAME, this._checkChangedHandler, false);
                return true;
            }
            return false;
        }

        /** @override */
        protected get preventKeyboardSubmit() {
            return true;
        }

        protected get inputFields() {
            return [this._container];
        }

        get contentElement() {
            return this._container;
        }

        protected onChange(evt?: Event) {
            return new Promise<string>((resolve, reject) => {
                if (CustomEventUtils.isInstanceOf(evt, ContenteditableChangeEvent)) {
                    const html = this.value = (<ContenteditableChangeEvent>evt).detail.html;
                    resolve(html);

                    // find a less-instrusive way to call this...
                    this._selectionChangeHandler(evt);

                } else
                    resolve(this.value);
            });
        }

        private _fixRangeMarkup() {
            const range = this.range,
                fnDownwards = (node: Node) => {
                    node.childNodes.forEach(i => fnDownwards(i));
                    if (isElement(node) && node.tagName === 'SPAN') {
                        Element.prototype.replaceWith.apply(node, Array.from(node.childNodes));
                    } else if (node instanceof HTMLElement) {
                        node.removeAttribute('style');
                    }
                },
                fn = (node: Node) => {
                    let element = node;

                    if (!isElement(element)) {
                        element = node.parentElement;
                    }

                    fnDownwards(element);
                };
            if (!Utils.isNull(range)) {
                fn(range.commonAncestorContainer);
            }
        }

        private _ensureInteractiveMarkup() {
            const workspace = this._container,
                nodes = workspace.childNodes,
                childCount = nodes.length;

            if (childCount == 0 || workspace.innerHTML === EMPTY_CONTENT) {
                workspace.innerHTML = EMPTY_CONTENT;
            } else {
                let node: Node,
                    range: Range;

                const closeRange = (n: Node) => {
                    range.setEndAfter(n);
                    const p = document.createElement('p');
                    range.surroundContents(p);
                }

                for (let j = 0; j < childCount; j++) {
                    node = nodes.item(j);
                    if (!(node instanceof Element)) {
                        if (Utils.isNull(range)) {
                            range = document.createRange();
                            range.setStartBefore(node);
                        }
                    } else if (range) {
                        closeRange(node.previousSibling);
                        range = null;
                    }
                }

                // open range?
                if (!Utils.isNull(range)) {
                    closeRange(node);
                }
            }
        }

        private _focusHandler = (evt) => {
            this._ensureInteractiveMarkup();
        };

        private _blurHandler = (evt) => {
            // clean up the output

            const container = this._container;
            for (let command of this.items) {
                command.cleanUp(container);
            }

            this._checkChangedHandler(evt);
        };

        private _pasteHandler = (evt: ClipboardEvent) => {

            // I'll manage it myself!
            evt.preventDefault();

            const range = this.range,
                files = evt.clipboardData.files;
            if (!Utils.isNull(range) && files.length === 0) {

                const text = evt.clipboardData.getData('text/plain');
                const plainText = text.replace(/</gi, '&lt;').replace(/\n/gi, '<br />');
                const frag = range.createContextualFragment(plainText);
                range.deleteContents();
                range.insertNode(frag);

                this._checkChangedHandler(evt);

            } else {

                for (let j = 0; j < files.length; j++) {
                    const f = files.item(j);
                    for (let cmd of this.items) {
                        if (isFileCommand(cmd)) {
                            cmd.pasteCallback(f).then(_ => this._checkChangedHandler(evt), _ => { });
                        }
                    }
                }

                // this._checkAndSynchronizeHandler(evt);
            }
        };

        private _shortcutHandler = (evt: KeyboardEvent) => {

            // prevent any default shortcut combo apart from 'copy', 'cut' and 'paste' (mainly due to the clipboard access limitations)
            if (evt.ctrlKey && ['C', 'V', 'X'].indexOf(evt.key?.toUpperCase()) === -1) {
                // Let it manage it only if the relevant command is available
                evt.preventDefault();
            }

        };

        private _inputHandler = (evt: InputEvent) => {
            this._fixRangeMarkup();
            this._checkChangedHandler(evt);
        }

        private _checkChangedHandler = (evt: Event) => {

            const
                container = this._container,
                inputHtml = container.innerHTML;

            var html = inputHtml;
            if (Utils.isNullOrEmpty(inputHtml)
                || inputHtml === '<br>'
                || inputHtml === EMPTY_CONTENT) {
                container.innerHTML = EMPTY_CONTENT;
                html = '';
            }
            if (html != this.value) {
                this.changeHandler(new ContenteditableChangeEvent(html));
                if (this.value != this.#history.current) {
                    this._updateHistory();
                } 
            }
            // fire history change in any case
            this._fireHistoryChange();
        }

        @Debounce(500)
        private _updateHistory() {
            this.#history.push(this.value);
            this._fireHistoryChange();
        }

        private _selectionChangeHandler = (evt) => {
            const selection = document.getSelection();
            if (selection && selection.anchorNode && this._container.contains(selection.anchorNode)) {
                const range = selection.getRangeAt(0);
                this.range = range.cloneRange();
            } else {
                this.range = null;
            }
        }

        protected acceptValue(val) {
            if (!Utils.isNull(this._container) && /*the following `if` statement prevents from flashing the content and writing backwards!*/ val != this._container.innerHTML) {
                this._container.innerHTML = val;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            const container = this._container;
            this.#history = new Pacem.HistoryService(this.value);
            container.addEventListener('blur', this._blurHandler, false);
            container.addEventListener('keydown', this._shortcutHandler, false);
            container.addEventListener('focus', this._focusHandler, false);
            container.addEventListener('input', this._inputHandler, false);
            container.addEventListener('paste', this._pasteHandler, false);
            document.addEventListener('selectionchange', this._selectionChangeHandler, false);
        }

        disconnectedCallback() {
            document.removeEventListener('selectionchange', this._selectionChangeHandler, false);
            const container = this._container;
            if (!Utils.isNull(container)) {
                container.removeEventListener('keydown', this._shortcutHandler, false);
                container.removeEventListener('blur', this._blurHandler, false);
                container.removeEventListener('focus', this._focusHandler, false);
                container.removeEventListener('input', this._inputHandler, false);
                container.removeEventListener('paste', this._pasteHandler, false);
            }
            super.disconnectedCallback();
        }

        protected getViewValue(val: any) {
            return val;
        }
    }


}