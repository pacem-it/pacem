/// <reference path="../../core/decorators.ts" />
namespace Pacem.Components {

    @CustomElement({ tagName: P + '-annihilator' })
    export class PacemAnnihilatorElement extends HTMLElement {

        constructor() {
            super();
        }

        connectedCallback() {
            this.remove();
        }

    }

}