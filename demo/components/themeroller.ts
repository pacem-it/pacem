/// <reference path="../../index.d.ts" />

namespace Pacem.Components.Js {

    @CustomElement({ tagName: 'pacemjs-themeroller' })
    export class PacemThemeRoller extends Pacem.Components.PacemEventTarget {

        @Watch({ emit: false, converter: Pacem.PropertyConverters.String }) src: string;
        @Watch({ emit: false, converter: Pacem.PropertyConverters.Json }) vars: { [name: string]: string };
        @Watch({ emit: false, converter: Pacem.PropertyConverters.Element }) target: HTMLStyleElement;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'src' || name === 'vars') {
                if (!Utils.isNullOrEmpty(this.src) && !Utils.isNull(this.target)) {
                    this._less(this.src);
                }
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (!Utils.isNullOrEmpty(this.src) && !Utils.isNull(this.target))
                this._less(this.src);
        }

        private _less(url) {
            fetch(url).then(r => {
                r.text().then(lss => {
                    const options: Less.Options = { filename: url };
                    const promise = <Promise<{ css: string }>>(<any>less.render(lss, Utils.extend(options, { modifyVars: Utils.extend(Utils.clone(PacemJS.DEFAULTS.theme), this.vars || {}) })));
                    promise.then(css => {
                        this.target.textContent = css.css;
                    });
                });
            });
        }
    }

}

namespace PacemJS {

    export const DEFAULTS = {

        theme: {

            color_default: '#262b3e',
            color_background: '#ffffff',
            
            color_accent: '#ff005a',
            color_accent_inv: '#ffffff',
            color_primary: '#429bbb',
            color_primary_inv: '#ffffff',
            color_danger: '#ff0000',
            color_danger_inv: '#ffffff',
            color_highlight: '#ffff00',
            color_highlight_fore: '#000000',
            color_tech: '#77c77d',
            color_watermark: '#c0c0c0',
            color_success: '#77c77d',
            color_success_inv: '#ffffff',
            /*#endregion*/

            color_warning: '#c6b800',
            shadows: false,
            gradients: false,

            /*#region SCAFFOLDING_VARIABLES*/

            color_button_border_light: '#fff',
            color_button_border: '#e0e3e8',
            color_button_border_dark: '#d0d3d8',
            color_button_back: 'rgb(242,242,242)',
            color_button_fore: '#262b3e',

            /*#endregion*/

            /*#region UI VARIABLES*/

            color_suggest_border: '#d0d3d8',
            color_suggest_back: 'rgb(242,242,242)',
            color_suggest_border_light: 'rgba(255, 255, 255, 0.8)',
            color_suggest_border_dark: 'rgba(0, 0, 0, 0.075)',

            color_marquee_back: 'rgb(242,242,242)',
            color_marquee_fore: '#262b3e',

            /*#endregion*/
            /*#region SCAFFOLDING_VARIABLES*/
            color_field_back: '#ffffff',
            border_field_size: '1px'

            /*#endregion*/
        },
        metadata: [
            { prop: 'color_default', type: 'color', display: { name: 'Text Color' } },
            { prop: 'color_background', type: 'color', display: { name: 'Background Color' } },
            { prop: 'color_accent', type: 'color', display: { name: 'Accent Color' } },
            { prop: 'color_accent_inv', type: 'color', display: { name: 'Accent Color (Inv)' } },
            { prop: 'color_primary', type: 'color', display: { name: 'Primary Color' } },
            { prop: 'color_primary_inv', type: 'color', display: { name: 'Primary Color (Inv)' } },
            { prop: 'color_danger', type: 'color', display: { name: 'Danger Color' } },
            { prop: 'color_danger_inv', type: 'color', display: { name: 'Danger Color (Inv)' } },
            { prop: 'color_warning', type: 'color', display: { name: 'Warning Color' } },
            { prop: 'color_warning_inv', type: 'color', display: { name: 'Warning Color (Inv)' } },
            { prop: 'color_success', type: 'color', display: { name: 'Success Color' } },
            { prop: 'color_success_inv', type: 'color', display: { name: 'Success Color (Inv)' } },
            { prop: 'color_tech', type: 'color', display: { name: 'Code Color' } },

            { prop: 'color_watermark', type: 'color', display: { name: 'Form Field Watermark' } },
            { prop: 'color_field_back', type: 'color', display: { name: 'Form Field Box' } },
        ]
    }
}