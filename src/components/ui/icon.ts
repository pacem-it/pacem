/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    const SVG = /^\s*<svg\s/;
    const FA = /^fa[brs]?\s+fa-/;
    const FA_CDN = { url: "https://kit.fontawesome.com/4922589c3c.js", crossOrigin: true };
    const LNI = /^lni\s+lni-/;
    const LNI_CDN = "https://cdn.lineicons.com/2.0/LineIcons.css";
    const COREUI = /^ci[dlsbf]-/;
    const COREUI_CDN = "https://unpkg.com/@coreui/icons/css/all.min.css";
    const MATERIAL = /^material(-icons)?\s+([\w]+)/;
    const MATERIAL_CDN = "https://fonts.googleapis.com/icon?family=Material+Icons";
    const URL = /^(https?:\/\/|\/\/)?.+\.(webp|svg|gif|png|jpe?g)$/;

    const iconImportMemoizer: string[] = [];
    function importConditionally(cssClassName: string, url: string, sha?: string, crossOrigin?: boolean, js?:boolean): PromiseLike<any> {
        if (iconImportMemoizer.indexOf(cssClassName) >= 0) {
            return Promise.resolve();
        }
        iconImportMemoizer.push(cssClassName);

        // this is the heavy part, be sure to call it just once (thus the memoizer)
        if (Utils.Css.isClassDefined(cssClassName)) {
            return Promise.resolve();
        }

        return js ? CustomElementUtils.importjs(url, sha, crossOrigin) : CustomElementUtils.importcss(url, sha, crossOrigin);
    }
    function getIconMarkup(icon: string): Promise<string> {
        return new Promise((resolve, reject) => {

            // null or empty
            if (Utils.isNullOrEmpty(icon)) {
                reject('No icon provided');
            }

            // svg?
            else if (SVG.test(icon)) {
                resolve(icon);
            }

            // font-awesome?
            else if (FA.test(icon)) {
                importConditionally("fa", FA_CDN.url, undefined, FA_CDN.crossOrigin, true).then(_ => {
                    resolve(`<i class="${icon}"></i>`);
                }, e => reject(e));
            }

            // explicit material icons?
            else if (MATERIAL.test(icon)) {
                importConditionally("material-icons", MATERIAL_CDN).then(_ => {
                    const regExcArray = MATERIAL.exec(icon),
                        ligature = regExcArray[2],
                        rest = icon.substr(regExcArray[0].length);
                    resolve(`<i class="material-icons${rest}">${ligature}</i>`);
                }, e => reject(e));
            }

            // line-icons?
            else if (LNI.test(icon)) {
                importConditionally('lni', LNI_CDN).then(_ => {
                    resolve(`<i class="${icon}"></i>`);
                }, e => reject(e));
            }

            // coreui icons?
            else if (COREUI.test(icon)) {
                importConditionally('clb', COREUI_CDN).then(_ => {
                    resolve(`<i class="${icon}"></i>`);
                }, e => reject(e));
            }

            // image url?
            else if (URL.test(icon)) {
                resolve(`<img src="${icon}" />`);
            }

            else {
                // assume material icon as default
                const parts = icon.trim().split(' ');
                const ligature = parts[0];
                const css = parts.length > 1 ? ' ' + parts.slice(1).join(' ') : '';
                resolve(`<i class="${PCSS}-icon${css}">${ligature}</i>`);
            }
        });
    }

    @CustomElement({
        tagName: P + '-icon'
    })
    export class PacemIconElement extends PacemElement {

        @Watch({ emit: false, converter: PropertyConverters.String }) icon: string;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'icon':
                        this._setIcon();
                        break;
                }
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._setIcon();
        }

        private _setIcon(icon = this.icon) {
            getIconMarkup(icon).then(markup => {
                this.innerHTML = markup;
            }, _ => {
                this.innerHTML = '';
            });
        }

    }

}