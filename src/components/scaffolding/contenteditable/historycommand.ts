/// <reference path="types.ts" />
/// <reference path="utils.ts" />
/// <reference path="../contenteditable.ts" />
namespace Pacem.Components.Scaffolding {


    @CustomElement({
        tagName: P + '-contenteditable-historycommand', shadow: Defaults.USE_SHADOW_ROOT,
        template: CONTENTELEMENT_BUTTONCOMMAND_TEMPLATE
    })
    export class PacemContenteditableHistoryCommandElement extends PacemContenteditableButtonCommandElement {

        exec(): Promise<any> {
            return new Promise<void>((resolve, _) => {

                const history = this.container?.history;
                if (!Utils.isNull(history)) {
                    switch (this.command) {
                        case 'redo':
                            if (history.canRedo) {
                                history.redo();
                                resolve();
                            }
                            break;
                        default:
                            if (history.canUndo) {
                                history.undo();
                                resolve();
                            }
                            break;
                    }
                    this.contentElement.innerHTML = history.current;
                }
            });
        }

        isRelevant(_: Range): boolean {
            return false;
        }

        @Watch({ emit: false, converter: PropertyConverters.String, reflectBack: true }) command: 'undo' | 'redo';

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'command':
                    this.icon = this.icon || val;
                    this.altText = val;
                    this.keyboardShortcut = this.keyboardShortcut || ('Ctrl+' + (val === 'redo' ? 'Y' : 'Z'));
                    break;
            }
        }

        protected containerPropertyChangedCallback(name: string, old, val, first?: boolean) {
            super.containerPropertyChangedCallback(name, old, val, first);
            const c = this.container,
                h = c.history;
            if (name === 'range' || name === 'history') {

                // override 'active' state setting
                this.active = !Utils.isNull(c.range) &&
                    ((this.command === 'redo' && h?.canRedo) || (this.command !== 'redo' && h?.canUndo));
            }
        }
    }

}