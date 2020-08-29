/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="char-counter.ts" />
namespace Pacem.Components.Scaffolding {

    export const KNOWN_COMMANDS = ['bold', 'italic', 'underline', 'hyperlink', 'orderedList', 'unorderedList'];
    const knownCommands = { BOLD: KNOWN_COMMANDS[0], ITALIC: KNOWN_COMMANDS[1], UNDERLINE: KNOWN_COMMANDS[2], LINK: KNOWN_COMMANDS[3], ORDEREDLIST: KNOWN_COMMANDS[4], UNORDEREDLIST: KNOWN_COMMANDS[5] };

    export class PacemExecCommand {

        private getSurroundingNode(selection, tagName) {
            var node = selection.anchorNode;
            while (node && node.nodeName.toUpperCase() !== tagName.toUpperCase()) {
                node = node.parentNode;
            }
            return node;
        }

        exec(command: string, arg?: string, target?) {
            ///<param name="command" type="String" />
            ///<param name="arg" type="String" optional="true" />
            ///<param name="target" type="String" optional="true" />
            var promise = new Promise((resolve, reject) => {
                switch (command) {
                    case knownCommands.LINK:
                        var selection = document.getSelection();
                        var anchorNode = this.getSurroundingNode(selection, 'A');

                        //console.log('selection: ' + selection);
                        var current = "http://";
                        var regex = /<a.*href=\"([^\"]*)/;
                        if (anchorNode && regex.test(anchorNode.outerHTML))
                            current = regex.exec(anchorNode.outerHTML)[1];
                        //console.log('link: ' + current);
                        if (arg === 'current')
                            return current == 'http://' ? '' : current;
                        var link = arg || (arg === void 0 && window.prompt('link (empty to unlink):', current));
                        if (!link)
                            document.execCommand('unlink');
                        else {
                            document.execCommand('createLink', false, link);
                            anchorNode = this.getSurroundingNode(selection, 'A');
                            if (anchorNode) anchorNode.setAttribute('target', target || '_blank');
                        }
                        resolve();
                        break;
                    case knownCommands.ORDEREDLIST:
                        document.execCommand('insertOrderedList');
                        resolve();
                        break;
                    case knownCommands.UNORDEREDLIST:
                        document.execCommand('insertUnorderedList');
                        resolve();
                        break;
                    default:
                        document.execCommand(command);
                        resolve();
                        break;
                }
            });
            return promise;
        }
    }

    class ContentEditableChangeEvent extends CustomTypedEvent<{ html: string }> {
        constructor(html: string) {
            super('contenteditablechange', { html: html });
        }
    }

    @CustomElement({
        tagName: P + '-contenteditable', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${PCSS}-contenteditable ${PCSS}-viewfinder">
    <div contenteditable pacem></div>
</div>${ CHAR_COUNTER_CHILD}
<${ P }-repeater>
<div class="${PCSS}-commands">
<template>
    <${ P }-button class="button ${PCSS}-command" css-class="{{ ['${PCSS}-'+ ^item.toLowerCase()] }}" on-click=":host._commands.exec(^item).then(() => :host.changeHandler($event))"></${ P }-button>
</template>
</div>
</${ P }-repeater>`
    })
    export class PacemContenteditableElement extends PacemBaseElement implements OnPropertyChanged, OnViewActivated, OnDisconnected {

        constructor(private _commands = new PacemExecCommand()) {
            super();
            this._workspace = document.createElement('div');
        }

        protected convertValueAttributeToProperty(attr: string) {
            return attr;
        }

        @ViewChild("div[pacem]") private _container: HTMLDivElement;
        @ViewChild(P + "-repeater") private _repeater: PacemRepeaterElement;
        @Watch({ converter: PropertyConverters.Number }) minlength: number;
        @Watch({ converter: PropertyConverters.Number }) maxlength: number;

        private _workspace: HTMLDivElement;

        protected toggleReadonlyView(readonly: boolean) {
            this._repeater.hidden = readonly;
            if (readonly)
                this._container.removeAttribute('contenteditable');
            else
                this._container.setAttribute('contenteditable', '');
        }

        /** @override */
        protected get preventKeyboardSubmit() {
            return true;
        }

        protected get inputFields() {
            return [this._container];
        }

        protected onChange(evt?: Event) {
            var deferred = DeferPromise.defer<string>();
            if (CustomEventUtils.isInstanceOf(evt, ContentEditableChangeEvent)) {
                const html = this.value = (<ContentEditableChangeEvent>evt).detail.html;
                deferred.resolve(html);
            } else
                deferred.resolve(this.value);
            return <PromiseLike<string>>deferred.promise;
        }

        private _cleanup(html) {
            const cnt = this._workspace;
            cnt.innerHTML = html;
            let n: Node, a = [], walker = document.createTreeWalker(cnt, NodeFilter.SHOW_ELEMENT, null, false);
            while (n = walker.nextNode()) {
                if (n instanceof Element)
                    n.removeAttribute('style');
            }
            return cnt.innerHTML;
        }

        private _checkChangedHandler = (evt) => {
            var html = this._cleanup(this._container.innerHTML);
            if (html == '<br>')
                html = '';
            if (html != this.value) {
                this.changeHandler(new ContentEditableChangeEvent(html));
            }
        }

        private _keydownHandler = (evt) => {
            const execCommand = this._commands,
                commands = knownCommands;

            if (evt.ctrlKey) {
                //console.log(evt.keyCode + ': ' + String.fromCharCode(evt.keyCode));
                let flag = false;
                switch (evt.keyCode) {
                    case 49:
                        // `1`
                        flag = true;
                        //
                        execCommand.exec(commands.ORDEREDLIST);
                        break;
                    case 189:
                        // `dash`
                        flag = true;
                        //
                        execCommand.exec(commands.UNORDEREDLIST);
                        break;
                    case 72:
                        // `h`yperlink
                        flag = true;
                        //
                        execCommand.exec(commands.LINK).then(() => this.onChange());
                        break;
                }
                if (flag)
                    Pacem.avoidHandler(evt);
            }
        }

        protected acceptValue(val) {
            if (!Utils.isNull(this._container) && /*the following `if` statement prevents from flashing the content and writing backwards!*/ val != this._container.innerHTML)
                this._container.innerHTML = val;
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._repeater.datasource = Pacem.Components.Scaffolding.KNOWN_COMMANDS;
            this._container.addEventListener('blur', this._checkChangedHandler, false);
            this._container.addEventListener('input', this._checkChangedHandler, false);
            this._container.addEventListener('keydown', this._keydownHandler, false);
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._container)) {
                this._container.removeEventListener('blur', this._checkChangedHandler, false);
                this._container.removeEventListener('input', this._checkChangedHandler, false);
                this._container.removeEventListener('keydown', this._keydownHandler, false);
            }
            super.disconnectedCallback();
        }

        protected getViewValue(val: any) {
            return val;
        }
    }

}