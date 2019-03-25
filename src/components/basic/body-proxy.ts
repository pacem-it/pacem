/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    export abstract class PacemTransferProxyElement extends PacemEventTarget {

        protected abstract get proxy(): HTMLElement;

        private _dom: Node[] = [];

        viewActivatedCallback() {
            super.viewActivatedCallback();
            let nodes = this.childNodes,
                ref: Node;
            for (let j = nodes.length - 1; j >= 0; j--) {
                let item = nodes.item(j);
                this.proxy.insertBefore(item, ref);
                this._dom.push(item);
                ref = item;
            }
        }

        disconnectedCallback() {
            for (let item of this._dom.splice(0)) {
                item.parentElement === this.proxy &&
                    this.proxy.removeChild(item);
            }
            super.disconnectedCallback();
        }
    }

    /** Moves its content to the document body and eventually removes it when disconnected. */
    @CustomElement({
        tagName: P + '-body-proxy'
    })
    export class PacemBodyProxyElement extends PacemTransferProxyElement {

        protected get proxy(): HTMLElement {
            return document.body;
        }

    }

    /** Moves its content to the closest shell and eventually removes it when disconnected. */
    @CustomElement({
        tagName: P + '-shell-proxy'
    })
    export class PacemShellProxyElement extends PacemTransferProxyElement {

        protected get proxy(): HTMLElement {
            return CustomElementUtils.findAncestorShell(this);
        }

    }
}