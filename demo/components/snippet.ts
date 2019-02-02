/// <reference path="../../index.d.ts" />

namespace Pacem.Components.Js {

    class Transformers {

        @Transformer()
        static removeLeadingTabs(html: string) {
            // 1. identify the minimum amount of leading tabs/spaces
            var min: number = Number.MAX_SAFE_INTEGER;
            var split = html.split('\n');
            for (var line of split) {
                let match = /^(\s*)[^\s]+/.exec(line);
                if (match)
                    min = Math.min(match[1].length, min);
            }
            // 2. replace
            var retval = [];
            const regex = new RegExp(`^\\s{${min}}`, 'gm');
            for (var line of split) {
                retval.push(line.replace(regex, ''));
            }
            return retval.join('\n').replace(/^\s+|\s+$/g, '');
        }
    }

    var COPY_TOASTER_SINGLETON: HTMLElement;
    var COPY_TOAST_SINGLETON: Pacem.Components.UI.PacemToastElement;

    @CustomElement({
        tagName: 'pacemjs-snippet', shadow: false,
        template: `<${P}-content></${P}-content>
    <h4 class="snippet-header">&lt;Snippet/&gt;</h4>
    <${ P}-tabs>
    <${ P}-tab label="demo">
        <${ P}-view></${P}-view>
    </${ P}-tab>
    <${ P}-tab label="code" class="pos-relative">
        <${ P}-markdown class="text-small"></${P}-markdown>
        <${ P}-button class="hide-md flat circular copy pos-absolute absolute-top absolute-right" on-click=":host._copy()" tooltip="copy code snippet"></${P}-button>
    </${ P}-tab>
</${ P}-tabs>
    <div class="pacem-toaster toaster-bottom">
        <${ P}-toast timeout="1250" class="toast-primary"><span>Copied!</span></${P}-toast>
    </div>`
    })
    export class PacemSnippetElement extends PacemElement {

        private _itemTemplate: HTMLTemplateElement;
        @ViewChild(P + '-view') private _view: UI.PacemViewElement;
        @ViewChild(P + '-markdown') private _md: UI.PacemMarkdownElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._itemTemplate = this.querySelector('template');
            var id = this._itemTemplate.id;
            if (Utils.isNullOrEmpty(id)) {
                id = this._itemTemplate.id = `_${Utils.uniqueCode()}`;
            }
            this._view.setAttribute('url', `#${id}`);
            this._md.setAttribute('value', `{{ '\`\`\`html\\n\\n'+ $pacem.removeLeadingTabs(#${id}.innerHTML) +'\\n\`\`\`' }}`);
            //
            this._setupToaster();
        }

        private _setupToaster() {
            var toaster = COPY_TOASTER_SINGLETON;
            if (Utils.isNull(toaster)) {
                toaster = COPY_TOASTER_SINGLETON = document.createElement('div');
                Utils.addClass(toaster, 'pacem-toaster toaster-bottom');
                var toast = COPY_TOAST_SINGLETON = <UI.PacemToastElement>document.createElement(P + '-toast');
                toast.timeout = 1250;
                Utils.addClass(toast, 'toast-primary');
                toast.textContent = "Copied!";

                toaster.appendChild(toast);
                document.body.appendChild(toaster);
            }

        }

        private _copy() {
            Utils.copyToClipboard(this._itemTemplate.innerHTML).then(_ => {
                if (!Utils.isNull(COPY_TOAST_SINGLETON))
                    COPY_TOAST_SINGLETON.show = true;
            });
        }

    }
}