/// <reference path="../contenteditable.ts" />
/// <reference path="utils.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: P + '-contenteditable-linkcommand', shadow: Defaults.USE_SHADOW_ROOT,
        template: CONTENTELEMENT_BUTTONCOMMAND_TEMPLATE
    })
    export class PacemContenteditableLinkCommandElement extends PacemContenteditableButtonCommandElement {

        isRelevant(range: Range): boolean {
            return !Utils.isNull(
                ContenteditableUtils.findSurroundingNode(range, HTMLAnchorElement)
            );
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) target: string;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (Utils.isNullOrEmpty(this.altText)) {
                this.altText = 'insert link';
            }
            if (Utils.isNullOrEmpty(this.icon)) {
                this.icon = 'insert_link';
            }
            if (Utils.isNullOrEmpty(this.keyboardShortcut)) {
                this.keyboardShortcut = 'Ctrl+H';
            }
        }

        exec(arg?: string, target: string = this.target): Promise<void> {
            return new Promise<void>((resolve, reject) => {

                var selection = this.range;
                var anchorNode = ContenteditableUtils.findSurroundingNode(selection, HTMLAnchorElement);

                //console.log('selection: ' + selection);
                var current = "http://";
                var regex = /<a.*href=\"([^\"]*)/;
                if (anchorNode && regex.test(anchorNode.outerHTML)) {
                    current = regex.exec(anchorNode.outerHTML)[1];
                }
                //console.log('link: ' + current);
                if (arg === 'current') {
                    return current == 'http://' ? '' : current;
                }
                var link = arg || (arg === void 0 && window.prompt('link (empty to unlink):', current));
                if (!link) {
                    document.execCommand('unlink');
                } else {
                    document.execCommand('createLink', false, link);
                    anchorNode = ContenteditableUtils.findSurroundingNode(selection, HTMLAnchorElement);
                    if (anchorNode) {
                        anchorNode.setAttribute('target', target || '_blank');
                    }
                }
                resolve();
            });
        }

    }

}