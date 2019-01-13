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

    @CustomElement({
        tagName: 'pacemjs-snippet', shadow: false,
        template: `<pacem-content></pacem-content>
    <h4 class="snippet-header">&lt;Snippet/&gt;</h4>
    <pacem-tabs>
    <pacem-tab label="demo">
        <pacem-view></pacem-view>
    </pacem-tab>
    <pacem-tab label="code" class="pos-relative">
        <pacem-markdown class="text-small"></pacem-markdown>
        <pacem-button class="hide-md flat circular copy pos-absolute absolute-top absolute-right" on-click=":host._copy()" tooltip="copy code snippet"></pacem-button>
    </pacem-tab>
</pacem-tabs>
    <div class="pacem-toaster toaster-bottom">
        <pacem-toast timeout="1250" class="toast-primary"><span>Copied!</span></pacem-toast>
    </div>`
    })
    export class PacemSnippetElement extends PacemElement {

        private _itemTemplate: HTMLTemplateElement;
        @ViewChild('pacem-toast') private _toast: UI.PacemToastElement;
        @ViewChild('pacem-view') private _view: UI.PacemViewElement;
        @ViewChild('pacem-markdown') private _md: UI.PacemMarkdownElement;
        
        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._itemTemplate = this.querySelector('template');
            var id = this._itemTemplate.id;
            if (Utils.isNullOrEmpty(id)) {
                id = this._itemTemplate.id = `_${Utils.uniqueCode()}`;
            }
            this._view.setAttribute('url', `#${id}`);
            this._md.setAttribute('value', `{{ '\`\`\`html\\n\\n'+ $pacem.removeLeadingTabs(#${id}.innerHTML) +'\\n\`\`\`' }}`);
        }

        private _copy() {
            Utils.copyToClipboard(this._itemTemplate.innerHTML).then(_ => {
                this._toast.show = true;
            });
        }

    }
}