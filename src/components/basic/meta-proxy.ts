/// <reference path="../../core/decorators.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components {

    @CustomElement({
        tagName: P + '-meta-proxy'
    })
    export class PacemMetaProxyElement extends PacemEventTarget {

        @Watch({emit: false, converter: PropertyConverters.String }) name: string; 
        @Watch({emit: false, converter: PropertyConverters.String }) itemprop: string; 
        @Watch({emit: false, converter: PropertyConverters.String }) content: string; 

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            this._update();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._update();
        }

        @Debounce(true)
        private _update() {
            const value = this.content;
            const nameBased = !Utils.isNullOrEmpty(this.name);
            const key = nameBased ? this.name : this.itemprop;
            if (Utils.isNullOrEmpty(key) || this.disabled) {
                // No key means do nothing
                return;
            }
            const escapedKey = Utils.cssEscape(key);
            const query = nameBased ? `meta[name='${escapedKey}']` : `meta[itemprop='${escapedKey}']`;
            var meta = document.head.querySelector(query);
            if (Utils.isNull(meta)) {
                meta = document.createElement('meta');
                document.head.appendChild(meta);
            } else if (Utils.isNullOrEmpty(value)) {
                // Empty `content` means "remove the element".
                meta.remove();
                return;
            } 
            // set
            meta.setAttribute("content", value);
            meta.setAttribute(nameBased ? "name" : "itemprop", key);
            meta.removeAttribute(nameBased ? "itemprop" : "name");
        }
    }
}