/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="../../../dist/js/pacem-scaffolding.d.ts" />
namespace Pacem.Components.Plus {

    export const KNOWN_COMMANDS = ['bold', 'italic', 'underline', 'hyperlink', 'orderedList', 'unorderedList', 'image'];
    const knownCommands = { BOLD: KNOWN_COMMANDS[0], ITALIC: KNOWN_COMMANDS[1], UNDERLINE: KNOWN_COMMANDS[2], LINK: KNOWN_COMMANDS[3], ORDEREDLIST: KNOWN_COMMANDS[4], UNORDEREDLIST: KNOWN_COMMANDS[5], IMAGE: KNOWN_COMMANDS[6] };

    export class PacemExecCommand {

        private getSurroundingNode(selection:Selection, tagName) {
            var node = selection.anchorNode;
            while (node && node.nodeName.toUpperCase() !== tagName.toUpperCase()) {
                node = node.parentNode;
            }
            return <Element>node;
        }

        exec(command: string, arg?: string, target?) {
            ///<param name="command" type="String" />
            ///<param name="arg" type="String" optional="true" />
            ///<param name="target" type="String" optional="true" />
            var promise = new Promise((resolve, reject) => {
                switch (command) {
                    case knownCommands.LINK:
                        var selection = document.getSelection();
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

    @CustomElement({
        tagName: 'pacem-markdown-editor', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="pacem-contenteditable pacem-viewfinder">
    <div contenteditable pacem></div>
</div>
<pacem-repeater datasource="{{ Pacem.Components.Plus.KNOWN_COMMANDS }}">
<div class="pacem-commands">
<template>
    <pacem-button class="button pacem-command" css-class="{{ ['pacem-'+ ^item.toLowerCase()] }}" on-click=":host._commands.exec(^item).then(() => :host.changeHandler($event))"></pacem-button>
</template>
</div>
</pacem-repeater>`
    })
    export class PacemMarkdownEditor extends Scaffolding.PacemBaseElement {

        constructor(private _md = new Pacem.MarkdownService(), private _commands = new PacemExecCommand()) {
            super();
        }

        @ViewChild('div[contenteditable]') private _content: HTMLDivElement;
        @ViewChild("pacem-repeater") private _repeater: PacemRepeaterElement;

        protected toggleReadonlyView(readonly: boolean) {
            this._repeater.hidden = readonly;
            if (readonly)
                this._content.removeAttribute('contenteditable');
            else
                this._content.setAttribute('contenteditable', '');
        }

        protected get inputFields(): HTMLElement[] {
            return [this._content];
        }

        protected onChange(evt?: Event): PromiseLike<any> {
            var deferred = DeferPromise.defer<string>();
            if (evt instanceof Scaffolding.ContentEditableChangeEvent) {
                const html = this.value = evt.detail.html;
                deferred.resolve(html);
            } else
                deferred.resolve(this.value);
            return <PromiseLike<string>>deferred.promise;
        }

        protected getViewValue(value: any): string {
            return this._md.toHtml(value);
        }



        private keydownHandler = (evt) => {
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

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'value'
                && /*the following `if` statement prevents from flashing the content and writing backwards!*/ val != this._content.innerHTML)
                this._content.innerHTML = val;
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._content.addEventListener('blur', this.checkChangedHandler, false);
            this._content.addEventListener('input', this.checkChangedHandler, false);
            this._content.addEventListener('keydown', this.keydownHandler, false);
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._content)) {
                this._content.removeEventListener('blur', this.checkChangedHandler, false);
                this._content.removeEventListener('input', this.checkChangedHandler, false);
                this._content.removeEventListener('keydown', this.keydownHandler, false);
            }
            super.disconnectedCallback();
        }

    }
}