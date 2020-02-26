/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    export abstract class PacemTransferProxyElement extends PacemEventTarget {

        protected abstract get proxy(): HTMLElement;

        private _dom: Node[] = [];
        private _children: Element[] = [];

        get dom() {
            return this._children;
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.moveContent(this.proxy);
        }

        protected moveContent(to: Element) {
            if (!Utils.isNull(to)) {
                if (Utils.isNullOrEmpty(this._dom)) {
                    this._dom = Utils.moveItems(this.childNodes, to);
                    this._children = <Element[]>this._dom.filter(e => e instanceof Element);
                } else {
                    Utils.moveItems(this._children, to);
                }
            }
        }

        disconnectedCallback() {
            for (let item of (this._dom || []).splice(0)) {
                (<ChildNode>item).remove();
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

    /** Moves its content to the provided target element. */
    @CustomElement({
        tagName: P + '-element-proxy'
    })
    export class PacemElementProxyElement extends PacemTransferProxyElement {

        protected get proxy(): HTMLElement {
            return this.target;
        }

        @Watch({ converter: PropertyConverters.Element }) target: HTMLElement;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'target' && !first) {
                this.moveContent(this.proxy);
            }
        }

    }
}