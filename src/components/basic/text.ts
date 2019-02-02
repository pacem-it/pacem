/// <reference path="types.ts" />
namespace Pacem.Components {

    @CustomElement({ tagName: P + '-text' })
    export class PacemTextElement extends HTMLElement implements OnPropertyChanged, OnConnected {

        constructor() {
            super();
        }

        private _text: Node;

        connectedCallback() {
            if (this.childNodes.length == 0)
                this.innerHTML = '&nbsp;';
            this._text = this.childNodes.item(0);
        }

        propertyChangedCallback(name: string, old: any, val: any, first: boolean) {
            if (Utils.isNull(val) && first === true)
                return;
            this._text.nodeValue = val;
        }

        /**
         * Gets or sets the plain text to display.
         */
        @Watch({ emit: false/*, debounce: true*/, converter: PropertyConverters.String })
        text: string;
    }

}