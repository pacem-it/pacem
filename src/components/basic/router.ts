/// <reference path="types.ts" />
namespace Pacem {

    export class RouterNavigateEvent extends Pacem.CustomTypedEvent<string>{
        constructor(path: string) {
            super('navigate', path, { cancelable: false, bubbles: false });
        }
    }

}

namespace Pacem.Components {

    @CustomElement({ tagName: P + '-router' })
    export class PacemRouterElement extends PacemEventTarget implements OnPropertyChanged {

        @Watch({ converter: PropertyConverters.String }) template: string; // something like /{controller}/{action}/{id?}
        @Watch({ converter: PropertyConverters.Eval }) state: any;
        @Watch({ converter: PropertyConverters.String }) path: string;

        navigate(path: string, title?: string) {
            const state = this.state = this._parsePath(path);
            if (document.location.pathname == path) {
                window.history.replaceState(state, title);
            } else {
                window.history.pushState(state, title, path);
            }
            if (!Utils.isNullOrEmpty(title))
                document.title = title;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'path') {
                this.navigate(val);
                window.dispatchEvent(new RouterNavigateEvent(val));
            }
        }

        connectedCallback() {
            super.connectedCallback();
            window.addEventListener('popstate', this._onPopState, false);
        }

        disconnectedCallback() {
            window.removeEventListener('popstate', this._onPopState, false);
            super.disconnectedCallback();
        }

        private _onPopState = (evt: PopStateEvent) => {
            if (!Utils.isNull(evt.state)) {
                this.path = evt.state.$path;
            }
            //this.state = evt.state || {};
        };

        private _parseTemplate() {
            const trunks: { name: string, optional: boolean }[] = [];
            let tmpl = this.template;
            if (!Utils.isNullOrEmpty(tmpl)) {
                let res: RegExpExecArray;
                while ((res = /\/\{([a-z\$_][\w]*)\??\}/g.exec(tmpl)) != null) {
                    const prop = res[1], item = res[0];
                    trunks.push({ name: prop, optional: item.charAt(item.length - 2) === '?' });
                    tmpl = tmpl.substr(res.index + item.length);
                }

            }
            return trunks;
        }

        private _parsePath(path: string): any {
            var obj = { $path: path }, i = 0;
            const tmpl = this._parseTemplate();
            if (!Utils.isNullOrEmpty(tmpl)) {
                let res: RegExpExecArray;
                while ((res = /\/[a-zA-Z0-9\$_-]+/g.exec(path)) != null) {
                    const v = res[0];
                    if (i >= tmpl.length) {
                        throw `Length mismatch: cannot compare provided path with current template.`;
                    }
                    const prop = tmpl[i];
                    Object.defineProperty(obj, prop.name, { enumerable: true, value: v.substr(1) });
                    i++;
                    path = path.substr(res.index + v.length);
                }
            }
            for (let k = i; k < tmpl.length; k++) {
                if (!tmpl[k].optional) {
                    throw `Must provide "${tmpl[k].name}" route value.`;
                }
            }
            return obj;
        }
    }

}