namespace Pacem.Components.Scaffolding {

    export abstract class PacemContenteditableButtonCommandElement extends PacemContenteditableCommandElement {

        @Watch({ converter: PropertyConverters.String }) icon: string;
        @Watch({ converter: PropertyConverters.String }) keyboardShortcut: string;
        @Watch({ converter: PropertyConverters.String }) altText: string;
        @Watch({ converter: PropertyConverters.Boolean }) active: boolean;

        cleanUp(_: HTMLElement): void {
            // do nothing
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'range') {
                this.active = !Utils.isNull(val);
            }
        }

        protected getTooltip(altText = this.altText, shortcut = this.keyboardShortcut): string {
            const hint = altText;
            if (Utils.isNullOrEmpty(shortcut)) {
                return hint;
            }
            return `${hint} (${shortcut})`;
        }
    }

    export const CONTENTELEMENT_BUTTONCOMMAND_TEMPLATE = `<${P}-button disabled="{{ !:host.active }}" css-class="{{ {'text-primary': :host.isRelevant(:host.range)} }}" tooltip="{{ :host.getTooltip(:host.altText, :host.keyboardShortcut) }}" class="button" on-click=":host.execCommand()"><${P}-icon class="text-rootsize" icon="{{ :host.icon }}"></${P}-icon></${P}-button>
                   <${P}-shortcut disabled="{{ !:host.active }}" target="{{ :host.contentElement }}" combination="{{ :host.keyboardShortcut }}" on-execute=":host.execCommand()"></${P}-shortcut>`

}