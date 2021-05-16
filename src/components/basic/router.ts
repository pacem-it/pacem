/// <reference path="types.ts" />
namespace Pacem {

    export class RouterNavigateEvent extends Pacem.CustomTypedEvent<string>{
        constructor(path: string) {
            super('navigate', path, { cancelable: false, bubbles: false });
        }
    }

    export class RouterNavigatingEvent extends Pacem.CustomTypedEvent<string>{
        constructor(path: string) {
            super('navigating', path, { cancelable: true, bubbles: false });
        }
    }

}

namespace Pacem.Components {

    const CHECK_PATTERN = /^([\w\.]:)?\/\/[^\/]+/;
    const URL_PATTERN = /^((https?:)?\/\/[^\/]+)?([^\?#]+)(\?[^#]*)?(#[^#]*)?$/;

    @CustomElement({ tagName: P + '-router' })
    export class PacemRouterElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.String }) template: string; // something like /{controller}/{action}/{id?}
        @Watch({ converter: PropertyConverters.Eval }) state: any;
        @Watch({ emit: false, converter: PropertyConverters.String }) path: string;

        #cancelingNavigation: boolean;

        navigate(path: string, title?: string): void {

            if (this.disabled) {
                return;
            }

            if (path != this.path) {
                this.path = path;
                return;
            }

            const l = document.location;
            if (CHECK_PATTERN.test(path)) {
                if (!path.startsWith(l.protocol + '//' + l.host)) {
                    throw `Only same-origin navigation is currently supported. "${path}" is not a valid path.`;
                }
            }

            if (!this.#cancelingNavigation) {
                // coming from path...
                const from = this.state && this.state.$path || void 0;

                // processing new segments and state
                const segments = this._segmentateUrl(path),
                    state = this._parseState(segments.path + segments.query + segments.hash, segments.path, segments.query, segments.hash);

                // popping state? aka history.back()/.forward()/.go(...)?
                // means that the URL is already in the target fashion
                const poppingState = (l.pathname + l.search + l.hash) === segments.path + segments.query + segments.hash;

                const evt = new RouterNavigatingEvent(path);
                window.dispatchEvent(evt);
                if (this.#cancelingNavigation = evt.defaultPrevented) {

                    // this will cut the history stack, no better option tho...
                    if (poppingState) {
                        // re-push current state
                        window.history.pushState(this.state, title, from);
                    }
                    this.path = from;

                    // exiting
                    return;
                }

                // this one actually does trigger the navigation in the outer world
                this.state = state;

                if (poppingState) {
                    window.history.scrollRestoration = 'manual';
                    window.history.replaceState(state, title);
                } else {
                    window.history.pushState(state, title, path);
                }
                if (!Utils.isNullOrEmpty(title)) {
                    document.title = title;
                }

                window.dispatchEvent(new RouterNavigateEvent(path));
            }

            this.#cancelingNavigation = false;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'path') {
                this.navigate(val);
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
            if (!Utils.isNull(evt.state) && !this.#cancelingNavigation) {
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