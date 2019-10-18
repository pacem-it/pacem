/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Fx {

    const CSS_CLASS = PCSS + '-fx-list';

    @CustomElement({
        tagName: P + '-fx-list'
    })
    export class PacemFxListElement extends PacemFxElement {

        private _observer: MutationObserver;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (!Utils.isNull(this.target)) {
                this._setup();
            }
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._observer)) {
                this._observer.disconnect();
            }
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);

            if (name === 'target') {
                if (old) {
                    this._reset(old);
                } else {
                    this._setup();
                }
            }
        }

        private _observed = (items: MutationRecord[]) => {
            const children = Array.from(this.target.children);
            for (let item of items) {
                item.removedNodes.forEach(n => {
                    if (n instanceof Element) {
                        this.dispatchEvent(new CustomEvent('itemremoved', { detail: n }));
                    }
                });
                item.addedNodes.forEach((n, j) => {
                    if (n instanceof Element) {
                        this.dispatchEvent(new CustomEvent('itemadded', { detail: { item: n, index: children.indexOf(n) } }));
                    }
                });
            }
        }

        private _reset(el: HTMLElement) {
            Utils.removeClass(el, CSS_CLASS);
            this._observer.disconnect();
        }

        private _setup() {
            const target = this.target;
            Utils.addClass(target, CSS_CLASS);
            const obs = this._observer = new MutationObserver(this._observed);
            obs.observe(target, { childList: true });
        }

    }

}