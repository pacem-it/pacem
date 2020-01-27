/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Plus {

    export abstract class PacemContextMenuItemElement extends PacemItemElement {

        connectedCallback() {
            super.connectedCallback();
            Utils.addClass(this, PCSS + '-context-menuitem');
        }

        @Watch({ converter: PropertyConverters.String }) iconGlyph: string;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            const container = this.container;
            if (container instanceof PacemContextMenuElement) {
                container.refresh();
            }
        }
    }

    @CustomElement({ tagName: P + '-context-menuitem-command' })
    export class PacemContextMenuItemCommandElement extends PacemContextMenuItemElement {

        @Watch({ emit: false, converter: PropertyConverters.String }) commandName: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) caption: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) iconGlyph: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) confirmationMessage: string;
        @Watch({ emit: false, converter: PropertyConverters.Element }) confirmationDialog: Pacem.Components.UI.PacemDialogBase;

    }

    @CustomElement({ tagName: P + '-context-menuitem-separator' })
    export class PacemContextMenuItemSeparatorElement extends PacemContextMenuItemElement {
    }

    @CustomElement({
        tagName: P + '-context-menu', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-button class="button-flat ${PCSS}-margin margin-0"></${P}-button>
<${P}-content></${P}-content>
<${P}-shell-proxy>
        <${P}-balloon target="{{ :host._btn }}" class="${PCSS}-contextmenu" options="{{ { trigger: 'click', position: 'x', align: 'auto' } }}">
    <${P}-repeater>
            <template>
                <${P}-if match="{{ ^item.localName === '${P}-context-menuitem-command' }}">
                    <${P}-button icon-glyph="{{ ^item.iconGlyph }}" hide="{{ ^item.hide }}" disabled="{{ ^item.disabled }}"
                                 on-mouseup="::_balloon.popout()"
                                 confirmation-message="{{ ^item.confirmationMessage }}" confirmation-dialog="{{ ^item.confirmationDialog }}"
                                 command-name="{{ ^item.commandName }}"><${P}-text text="{{ ^item.caption }}"></${P}-text></${P}-button>
                </${P}-if>
                <${P}-if match="{{ ^item.localName === '${P}-context-menuitem-separator' }}">
                    <hr />
                </${P}-if>
            </template>
    </${P}-repeater>
        </${P}-balloon>
</${P}-shell-proxy>`
    })
    export class PacemContextMenuElement extends PacemItemsContainerElement<PacemContextMenuItemElement> {

        validate(item: PacemContextMenuItemElement): boolean {
            return item instanceof PacemContextMenuItemElement;
        }

        @ViewChild(P + '-button') private _btn: UI.PacemButtonElement;
        @ViewChild(P + '-shell-proxy') private _btns: PacemShellProxyElement;

        @Watch({ converter: PropertyConverters.Json }) commandArgument: any;
        @Watch({ converter: PropertyConverters.String }) icon: string;

        private _dispatchCommand = (e: CommandEvent) => {
            avoidHandler(e);
            this.dispatchEvent(new CommandEvent({ commandName: e.detail.commandName, commandArgument: e.detail.commandArgument || this.commandArgument }));
        }

        private get _balloon(): UI.PacemBalloonElement {
            return <UI.PacemBalloonElement>this._btns.dom[0];
        }

        private get _repeater(): PacemRepeaterElement {
            return this._balloon.querySelector(P + '-repeater');
        }

        register(item: PacemContextMenuItemElement) {
            const retval = super.register(item);
            if (retval) {
                this._refreshRepeater();
            }
            return retval;
        }

        unregister(item: PacemContextMenuItemElement) {
            const retval = super.unregister(item);
            if (retval) {
                this._refreshRepeater();
            }
            return retval;
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._renderButton();
            this._balloon.addEventListener(CommandEventName, this._dispatchCommand, false);
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'icon' && this._btn) {
                this._renderButton(val);
            }
        }

        private _renderButton(val = this.icon) {
            this._btn.innerHTML = val ? Utils.renderHtmlIcon(val) : `<i class="${PCSS}-icon">more_horiz</i>`;
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._balloon)) {
                this._balloon.removeEventListener(CommandEventName, this._dispatchCommand, false);
            }
            super.disconnectedCallback();
        }

        refresh() {
            this._refreshRepeater();
        }

        @Debounce(true)
        private _refreshRepeater() {
            const rep = this._repeater;
            if (!Utils.isNullOrEmpty(rep)) {
                rep.datasource = this.items.map(i => {

                    let obj = { localName: i.localName };
                    for (let j = 0; j < i.attributes.length; j++) {
                        let attr = i.attributes.item(j).name;
                        let prop = CustomElementUtils.kebabToCamel(attr);
                        obj[prop] = i[prop];
                    }

                    return obj;
                });
            }
        }
    }

}