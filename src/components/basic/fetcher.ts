/// <reference path="../../core/net/http.ts" />
/// <reference path="types.ts" />

namespace Pacem.Components {

    @CustomElement({ tagName: P + '-fetch' })
    export class PacemFetchElement extends PacemEventTarget implements Net.Fetcher {

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) url: string;

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) method: Net.HttpMethod;

        @Watch({ emit: false, converter: PropertyConverters.Json }) parameters: { [key: string]: string };

        @Watch({ emit: false, converter: PropertyConverters.Json }) headers: { [key: string]: string };

        @Watch({ emit: false, converter: PropertyConverters.String }) credentials: 'omit' | 'same-origin' | 'include';

        @Watch({ emit: false, converter: PropertyConverters.String }) mode: 'cors' | 'no-cors' | 'navigate' | 'same-origin';

        @Watch({ emit: false, converter: PropertyConverters.String }) cache: RequestCache;

        @Watch({ converter: PropertyConverters.BooleanStrict }) fetching: boolean;

        /** Gets or sets whether to trigger a fetch whenever a significant property has changed (default: true). */
        @Watch({ reflectBack: true, converter: PropertyConverters.Boolean }) autofetch: boolean = true;

        @Watch({ emit: false, converter: PropertyConverters.String }) as: 'object' | 'text' | 'blob' | 'image';

        @Watch({ emit: false, converter: PropertyConverters.String }) type: 'json' | 'raw';

        @Watch({ reflectBack: true, converter: PropertyConverters.Number }) debounce: number = 100;

        /** Gets or sets whether to compare parameter and header single values prior to trigger a new fetch execution (default false). */
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Boolean }) diffByValues: boolean;

        @Watch() result: any;

        private _handle: number;

        constructor() {
            super();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._delayAndConditionallyFetch();
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            // parameters/headers -> in order to avoid unnecessary fetches don't compare byref but term by term in the json
            switch (name) {
                case 'result':
                    this.dispatchEvent(new CustomEvent(Pacem.Net.FetchResultEventName, { detail: val }));
                    break;
                case 'url':
                case 'method':
                case 'type':
                case 'as':
                case 'mode':
                case 'credentials':
                case 'disabled':
                case 'autofetch':
                    this._delayAndConditionallyFetch();
                    break;
                case 'parameters':
                case 'headers':
                    if (!this.diffByValues
                        // spare round-trips: compare stringified values.
                        // state might be changed, by it's up to the dev to unlock this
                        // (i.e. just by calling 'fetch()' directly)
                        || Utils.jsonSortStringify(old) != Utils.jsonSortStringify(val)) {
                        this._delayAndConditionallyFetch();
                    }
                    break;
            }
        }

        private _delayAndConditionallyFetch() {
            clearTimeout(this._handle);
            if (this.autofetch) {
                this._handle = setTimeout(() => {
                    this.fetch();
                }, this.debounce || 0);
            }
        }

        /** Returns a promise to a request with an already-used body. */
        // @Concurrent()
        fetch(): Promise<Response> {
            return new Promise((resolve, reject) => {
                var url = this.url;

                // any reason to exit now?
                if (!this.isReady || Utils.isNullOrEmpty(url) || this.disabled) {
                    resolve(null);
                    return;
                }

                // go on...
                let _me = this;
                _me.fetching = true;
                const type = _me.type || 'json';
                let contentType = 'application/json';
                switch (type) {
                    case 'raw':
                        contentType = 'application/x-www-form-urlencoded';
                        break;
                }
                const method = (_me.method || Net.HttpMethod.Get).toUpperCase();
                let options: RequestInit = {
                    headers: Utils.extend({ 'Content-Type': contentType }, _me.headers),
                    method: method,
                    mode: _me.mode || 'cors',
                    credentials: _me.credentials || 'same-origin',
                    cache: _me.cache || 'default'
                };

                const parameters = Utils.clone(_me.parameters || {});
                // complete a templated url, just in case (and remove params)
                // Note:    templated urls might sound pleonastic where you can simply concatenate pieces of string.
                //          They become handly in non-controllable autogenerated scenarios (e.g. autogenerated forms) where REST templated urls are involved.
                url = Utils.URIs.format(url, parameters, /* remove matched params if... */ method == "GET");

                if (!Utils.isNullOrEmpty(parameters)) {

                    switch (method) {
                        case 'GET':
                            url = Utils.URIs.appendQuery(url, parameters);
                            break;
                        case 'PUT':
                        case 'POST':
                            switch (_me.type) {
                                case 'raw':
                                    let searchParams = new URLSearchParams();
                                    for (let key in parameters)
                                        searchParams.set(key, parameters[key]);
                                    options.body = searchParams;
                                    break;
                                default:
                                    options.body = Utils.Json.stringify(parameters);
                                    break;
                            }
                            break;
                    }
                }

                // mandatory tmpl segments left over?
                if (Utils.URIs.hasMandatoryTemplateSegments(url)) {

                    // exit
                    resolve(null);
                    return;
                }

                fetch(url, options).then(r => {
                    _me.fetching = false;
                    if (r.ok) {
                        this.dispatchEvent(new CustomEvent(Pacem.Net.FetchSuccessEventName, { detail: r }));
                        switch (_me.as) {
                            case 'blob':
                            case 'image':
                                r.blob().then(b => {
                                    if (_me.as === 'image')
                                        Utils.blobToDataURL(b).then(i => {
                                            _me.result = i;
                                        });
                                    else
                                        _me.result = b;
                                    resolve(r);
                                }, _ => {
                                    this.log(Logging.LogLevel.Warn, `Couldn't parse a ${_me.as}. ${_}`);
                                    resolve(null);
                                });
                                break;
                            case 'text':
                                r.text().then(t => {
                                    _me.result = t;
                                    resolve(r);
                                });
                                break;
                            default:
                                if (r.headers.get("Content-Length") == "0") {
                                    // empty object
                                    _me.result = {};
                                    resolve(r);
                                } else {
                                    r.json().then(j => {
                                        _me.result = j;
                                        resolve(r);
                                    }, _ => {
                                        this.log(Logging.LogLevel.Warn, `Couldn't parse a ${_me.as}. ${_}`);
                                        resolve(null);
                                    });
                                }
                                break;
                        }
                    } else {
                        this.dispatchEvent(new CustomEvent(Pacem.Net.FetchErrorEventName, { detail: r }));
                        reject(r);
                    }
                });

            });

        }

    }
}