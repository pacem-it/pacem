/// <reference path="utils.ts" />
/// <reference path="../contenteditable.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    export enum KnownExecCommand {
        Bold = 'bold',
        Italic = 'italic',
        Underline = 'underline',
        StrikeThrough = 'strikeThrough',
        OrderedList = 'insertOrderedList',
        UnorderedList = 'insertUnorderedList',
        JustifyLeft = 'justifyLeft',
        JustifyCenter = 'justifyCenter',
        JustifyRight = 'justifyRight',
        JustifyFull = 'justifyFull',
        //Copy = 'copy',
        //Cut = 'cut',
        //Paste = 'paste'
        //Undo = 'undo',
        //Redo = 'redo',
    };

    /**
     * Returns relevant material icon ligatures
     * @param cmd A known command
     */
    function getKnownCommandIcon(cmd: KnownExecCommand) {
        const lower_cmd = cmd?.toLowerCase();
        switch (lower_cmd) {
            case "bold":
            case "italic":
                return 'format_' + lower_cmd;
            case 'underline':
                return 'format_underlined';
            case 'strikethrough':
                return 'strikethrough_s';
            case 'insertorderedlist':
                return 'format_list_numbered';
            case 'insertunorderedlist':
                return 'format_list_bulleted';
            case 'justifyleft':
            case 'justifyright':
            case 'justifycenter':
                return 'format_align_' + lower_cmd.substr(7 /* 'justify' */);
            case 'justifyfull':
                return 'format_align_justify';
            default:
                return 'help_outline';
        }
    }

    function getKnownCommandFilters(cmd: KnownExecCommand, argument: string): (string | { tagName?: string, style: { name: string, value: string } })[] {
        const lower_cmd = cmd?.toLowerCase();
        switch (lower_cmd) {
            case "bold":
                return ['b', 'strong'];
            case "italic":
                return ['i', 'em'];
            case 'underline':
                return ['u'];
            case 'strikethrough':
                return ['strike', 's', 'del'];
            case 'insertorderedlist':
                return ['ol'];
            case 'insertunorderedlist':
                return ['ul'];
            case 'justifyleft':
                return [{ style: { name: 'text-align', value: 'left' } }];
            case 'justifyright':
                return [{ style: { name: 'text-align', value: 'right' } }];
            case 'justifycenter':
                return [{ style: { name: 'text-align', value: 'center' } }];
            case 'justifyfull':
                return [{ style: { name: 'text-align', value: 'justify' } }];
            case 'formatblock':
                return [argument];
            default:
                return ['none'];
        }
    }

    @CustomElement({
        tagName: P + '-contenteditable-execcommand', shadow: Defaults.USE_SHADOW_ROOT,
        template: CONTENTELEMENT_BUTTONCOMMAND_TEMPLATE
    })
    export class PacemContenteditableExecCommandElement extends PacemContenteditableButtonCommandElement {

        private _matchRelevance(range: Range, arg: string | { tagName?: string, style: { name: string, value: string } }): boolean {

            const found =
                (typeof arg === 'object') ?
                    ContenteditableUtils.findSurroundingNode(range,
                        node => node instanceof HTMLElement
                            && (Utils.isNullOrEmpty(arg.tagName) || node.tagName === arg.tagName.toUpperCase())
                            && node.style[arg.style.name] === arg.style.value)
                    : ContenteditableUtils.findSurroundingNode(range, arg);

            return !Utils.isNull(found);
        }

        isRelevant(range: Range): boolean {
            const filters = getKnownCommandFilters(this.command, this.argument);
            for (let f of filters) {
                if (this._matchRelevance(range, f)) {
                    return true;
                }
            }
            return false;
        }

        @Watch({ converter: PropertyConverters.String }) command: KnownExecCommand;
        @Watch({ emit: false, converter: PropertyConverters.String }) argument: string;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'command') {
                if (Utils.isNullOrEmpty(this.icon) || this.icon === getKnownCommandIcon(old)) {
                    this.icon = getKnownCommandIcon(val);
                }
                if (Utils.isNullOrEmpty(this.altText) || this.altText === old) {
                    this.altText = val;
                }
            }
        }

        exec() {
            return new Promise<void>((resolve, _) => {
                
                // check if selection is around an 'inert' ([contenteditable=false]) element
                const r = this.range, cmdfilter = getKnownCommandFilters(this.command, this.argument)[0];
                if (!Utils.isNull(r)) {

                    // #region wrap/unwrap (manages contenteditable=false 'islands')
                    const island = ContenteditableUtils.testInertElementWrapping(r);
                    if (island.result
                        && typeof cmdfilter === 'string' && ['b', 'i', 'strike', 'u'].indexOf(cmdfilter) >= 0) {

                        // wrap or remove?
                        const wrapper = ContenteditableUtils.findSurroundingNode(r, cmdfilter);
                        if (!Utils.isNull(wrapper) && wrapper.childNodes.length === 1) {
                            // remove
                            const newChild = wrapper.childNodes.item(0),
                                select = island.element;
                            wrapper.parentElement.replaceChild(newChild, wrapper);
                            ContenteditableUtils.select(select);
                        } else {
                            // wrap
                            const n = document.createElement(cmdfilter),
                                select = island.element;
                            const frag = r.extractContents();
                            r.insertNode(n);
                            n.append(frag);
                            ContenteditableUtils.select(select);
                        }
                    }
                    // #endregion
                    else {
                        document.execCommand(this.command, false, this.argument);
                    }
                }

                resolve();

            });
        }
    }

}