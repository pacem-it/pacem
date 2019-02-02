/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    /** Moves its content to the document body and eventually removes it when disconnected. */
    @CustomElement({
        tagName: P + '-body-proxy'
    })
    export class PacemBodyProxyElement extends PacemEventTarget {

        private _dom: Node[] = [];

        viewActivatedCallback() {
            super.viewActivatedCallback();
            let nodes = this.childNodes,
                ref: Node;
            for (let j = nodes.length - 1; j >= 0; j--) {
                let item = nodes.item(j);
                document.body.insertBefore(item, ref);
                this._dom.push(item);
                ref = item;
            }
        }

        disconnectedCallback() {
            for (let item of this._dom.splice(0)) {
                item.parentElement === document.body &&
                    document.body.removeChild(item);
            }
            super.disconnectedCallback();
        }

    }
}