/// <reference path="types.ts" />
namespace Pacem {

    export class RouterNavigateEvent extends Pacem.CustomTypedEvent<string>{
        constructor(path: string) {
            super('navigate', path, { cancelable: false, bubbles: false });
        }
    }

}

namespace Pacem.Components {
    
    const CHECK_PATTERN = /^([\w\.]:)?\/\/[^\/]+/;
    const URL_PATTERN = /^((https?:)?\/\/[^\/]+)?([^\?#]+)(\?[^#]*)?(#[^#]*)?$/;

    @CustomElement({ tagName: P + '-router' })
    export class PacemRouterElement extends PacemEventTarget {

        @Watch({ converter: PropertyConverters.String }) template: string; // something like /{controller}/{action}/{id?}
        @Watch({ converter: PropertyConverters.Eval }) state: any;
        @Watch({ converter: PropertyConverters.String }) path: string;

        navigate(path: string, title?: string) {
            const l = document.location;
            if (CHECK_PATTERN.test(path)) {
                if (!path.startsWith(l.protocol + '//' + l.host)) {
                    throw `Only same-origin navigation is currently supported. "${path}" is not a valid path.`;
                }
            }

            const segments = this._segmentateUrl(path),
                state = this.state = this._parseState(segments.path + segments.query + segments.hash, segments.path, segments.query, segments.hash);

            var poppingState = (l.pathname + l.search + l.hash) === segments.path + segments.query + segments.hash;

            if (poppingState) {
                window.history.replaceState(state, title);
            } else {
                window.history.pushState(state, title, path);
            }
            if (!Utils.isNullOrEmpty(title)) {
                document.title = title;
            }
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

        private _segmentateUrl(url: string): { path: string, query?: string, hash?: string } {
            const regArr = URL_PATTERN.exec(url);
            if (!regArr || regArr.length <= 3) {
                return null;
            }
            return { path: regArr[3], query: regArr[4] || '', hash: regArr[5] || '' };
        }

        private _parseState(fullPath: string, path: string, query: string, hash: string): any {
            var obj = {
                $path: fullPath,
                $querystring: query.length > 0 ? query.substr(1) : query,
                $query: this._parseQuery(query),
                $hash: this._parseHash(hash)
            }, i = 0;
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

        private _parseHash(hash: string): string {
            const ndx = hash.indexOf('#');
            if (ndx !== 0) {
                return null;
            }
            return hash.substr(ndx + 1);
        }

        private _parseQuery(search: string) {
            const obj: { [key: string]: string } = {};
            const ndx = search.indexOf('?');
            if (ndx === 0) {
                search.substr(ndx + 1).split('&').forEach(pair => {
                    const kvp = pair.split('=');
                    if (kvp.length == 2 && !Pacem.Utils.isNullOrEmpty(kvp[1])) {

                        Object.defineProperty(obj, decodeURIComponent(kvp[0]), { enumerable: true, value: decodeURIComponent(kvp[1]) });

                    }
                });
            }
            return obj;
        }
    }

}