/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Plus {

    @CustomElement({
        tagName: P + '-context-commands', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-button class="button-flat ${PCSS}-margin margin-y-0"><i class="${PCSS}-icon text-primary text-bigger">more_horiz</i></${P}-button>
<${P}-shell-proxy>
    <${P}-balloon target="{{ :host._btn }}" class="${PCSS}-contextmenu" options="{{ { trigger: 'click', position: 'left', align: 'auto' } }}">
        <${P}-content></${P}-content>
    </${P}-balloon>
</${P}-shell-proxy>`
    })
    export class RisolutoContextMenuElement extends PacemElement {

        @ViewChild(P + '-button') private _btn: UI.PacemButtonElement;
        @ViewChild(P + '-shell-proxy') private _btns: PacemShellProxyElement;

        @Watch({ converter: PropertyConverters.Json }) commandArgument: any;

        private _dispatchCommand = (e: CommandEvent) => {
            avoidHandler(e);
            this._balloon.popout();
            this.dispatchEvent(new CommandEvent({ commandName: e.detail.commandName, commandArgument: e.detail.commandArgument || this.commandArgument }));
        }

        private get _balloon(): UI.PacemBalloonElement {
            return <UI.PacemBalloonElement>this._btns.dom[0];
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._balloon.addEventListener(CommandEventName, this._dispatchCommand, false);

        }

        disconnectedCallback() {
            if (!Utils.isNull(this._balloon)) {
                this._balloon.removeEventListener(CommandEventName, this._dispatchCommand, false);
            }
            super.disconnectedCallback();
        }
    }

}