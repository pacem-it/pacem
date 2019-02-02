﻿/// <reference path="../../core/http.ts" />
/// <reference path="types.ts" />

type GlobalResponse = Response;

namespace Pacem.Net {

    export interface Fetcher extends NotifyPropertyChange {
        url: string;
        method: HttpMethod;
        parameters: { [key: string]: string };
        headers: { [key: string]: string };
        result: any;
        fetch: () => PromiseLike<GlobalResponse>;
    }

    export interface OAuthFetchable {

        readonly fetcher?: Fetcher;
        fetchCredentials: RequestCredentials;
        fetchHeaders: { [key: string]: string };

    }

    export const FetchResultEventName = 'fetchresult';
    export const FetchErrorEventName = 'error';
}

namespace Pacem.Components {

    @CustomElement({ tagName: P + '-fetch' })
    export class PacemFetchElement extends PacemEventTarget implements Net.Fetcher {

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) url: string;

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) method: Net.HttpMethod;

        @Watch({ emit: false, converter: PropertyConverters.Json }) parameters: { [key: string]: string };

        @Watch({ emit: false, converter: PropertyConverters.Json }) headers: { [key: string]: string };

        @Watch({ emit: false, converter: PropertyConverters.String }) credentials: 'omit' | 'same-origin' | 'include';

        @Watch({ emit: false, converter: PropertyConverters.String }) mode: 'cors' | 'no-cors' | 'navigate' | 'same-origin';

        @Watch({ converter: PropertyConverters.BooleanStrict }) fetching: boolean;

        @Watch({ emit: false, converter: PropertyConverters.String }) as: 'object' | 'text' | 'blob' | 'image';

        @Watch({ emit: false, converter: PropertyConverters.String }) type: 'json' | 'raw';

        @Watch({ reflectBack: true, converter: PropertyConverters.Number }) debounce: number = 100;

        /** Whether to compare parameter and header single values prior to trigger a new fetch execution (default false). */
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Boolean }) diffByValues: boolean;

        @Watch() result: any;

        private _handle: number;

        constructor() {
            super();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._delayFetch();
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
                    this._delayFetch();
                    break;
                case 'parameters':
                case 'headers':
                    if (!this.diffByValues
                        // spare round-trips: compare stringified values.
                        // state might be changed, by it's up to the dev to unlock this
                        // (i.e. just by calling 'fetch()' directly)
                        || Utils.jsonSortStringify(old) != Utils.jsonSortStringify(val)) {
                        this._delayFetch();
                    }
                    break;
            }
        }

        private _delayFetch() {
            clearTimeout(this._handle);
            this._handle = setTimeout(() => {
                this.fetch();
            }, this.debounce);
        }

        /** Returns a promise to a request with an already-used body. */
        @Concurrent()
        fetch(): PromiseLike<Response> {
            var deferred = DeferPromise.defer<Response>(),
                url = this.url;
            if (!this.isReady || Utils.isNullOrEmpty(url) || this.disabled) {
                deferred.resolve(null);
            } else {

                let _me = this;
                _me.fetching = true;
                const type = _me.type || 'json';
                let contentType = 'application/json';
                switch (type) {
                    case 'raw':
                        contentType = 'application/x-www-form-urlencoded';
                        break;
                }
                const method = _me.method || Net.HttpMethod.Get;
                let options: RequestInit = {
                    headers: Utils.extend({ 'Content-Type': contentType }, _me.headers),
                    method: method,
                    mode: _me.mode || 'cors',
                    credentials: _me.credentials || 'same-origin'
                };
                const parameters = _me.parameters;
                let query = '';
                if (!Utils.isNullOrEmpty(parameters)) {
                    switch (method.toLowerCase()) {
                        case 'get':
                            query = (/\?/.test(url) ? '&' : '?') + Object.keys(parameters).map(
                                k => encodeURIComponent(k) + '=' + encodeURIComponent(parameters[k])
                            ).join('&');
                            break;
                        case 'put':
                        case 'post':
                            switch (_me.type) {
                                case 'raw':
                                    let searchParams = new URLSearchParams();
                                    for (let key in parameters)
                                        searchParams.set(key, parameters[key]);
                                    options.body = searchParams;
                                    break;
                                default:
                                    options.body = JSON.stringify(parameters);
                                    break;
                            }
                            break;
                    }
                }
                fetch(url + query, options).then(r => {
                    _me.fetching = false;
                    if (r.ok) {
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
                                    deferred.resolve(r);
                                }, _ => {
                                    this.log(Logging.LogLevel.Warn, `Couldn't parse a ${_me.as}. ${_}`);
                                    deferred.resolve(null);
                                });
                                break;
                            case 'text':
                                r.text().then(t => {
                                    _me.result = t;
                                    deferred.resolve(r);
                                });
                                break;
                            default:
                                if (r.headers.get("Content-Length") == "0") {
                                    // empty object
                                    _me.result = {};
                                    deferred.resolve(r);
                                } else {
                                    r.json().then(j => {
                                        _me.result = j;
                                        deferred.resolve(r);
                                    }, _ => {
                                        this.log(Logging.LogLevel.Warn, `Couldn't parse a ${_me.as}. ${_}`);
                                        deferred.resolve(null);
                                    });
                                }
                                break;
                        }
                    } else {
                        this.dispatchEvent(new CustomEvent(Pacem.Net.FetchErrorEventName, { detail: r }));
                        deferred.reject(r);
                    }
                });
            }
            return deferred.promise;
        }

    }
}