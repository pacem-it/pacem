/// <reference path="promise.ts" />

namespace Pacem.Net {

    const noop = () => { };

    export enum HttpMethod {
        Get = 'GET',
        Post = 'POST',
        Put = 'PUT',
        Delete = 'DELETE',
        Options = 'OPTIONS',
        Head = 'HEAD'
    }

    export class StatusCodeError extends Error {

        constructor(private statusCode: number, statusText: string) {
            super(statusText);
        }

        get status() {
            return this.statusCode;
        }
    }

    export class Response {

        constructor(req: XMLHttpRequest, processTime: number) {
            if (!req) return;
            this._status = req.status;
            this._body = req.response;
            this._text = req.responseText;
            this._type = req.responseType;
            this._allHeadersRaw = req.getAllResponseHeaders();
            this._processTime = processTime;
        }

        private _processTime: number;
        private _status: number;
        private _text: string;
        private _body: any;
        private _type: string;
        private _allHeadersRaw: string;
        private _headers: { [key: string]: string };

        get processTime(): number {
            return this._processTime;
        }

        get headers(): { [key: string]: string } {
            if (this._headers === undefined && this._allHeadersRaw)
                this._parseHeaders();
            return this._headers;
        }

        get size(): number {
            return +this.headers['Content-Length'];
        }

        get mime(): string {
            return this.headers['Content-Type'];
        }

        get date(): Date {
            return new Date(Date.parse(this.headers['Date']));
        }

        private _parseHeaders() {
            let headers: { [key: string]: string } = {}, rows = this._allHeadersRaw.split('\r\n');
            rows.forEach(r => {
                if (r && r.length) {
                    let index = r.indexOf(':');
                    let key = r.substr(0, index).trim();
                    let value = r.substr(index + 1).trim();
                    headers[key] = value;
                }
            });
            this._headers = headers;
        }

        get status() { return this._status; }
        get text() { return this._text; }
        get content() { return this._body; }
        get type() { return this._type; }

        /**
         * Short-hand utility for getting or parsing json content (if any).
         */
        get json() {
            if (this._type === 'json') return this._body;
            else
                try {
                    return JSON.parse(this._text);
                } catch (e) {
                    return undefined;
                }
        }
    }

    export declare type RequestOptions = {
        data?: 'string' | { [key: string]: string },
        headers?: { [key: string]: string },
        method: HttpMethod,
        progress?: (pct: number) => void
    };

    export class Http {

        constructor() { }

        /** Gets or sets the Bearer authorization token. */
        accessToken: string;

        /**
         * Executes an asynchronous XMLHttpRequest over the net.
         * @param {String} url - Base url to be requested.
         * @param {Object} [options] - Options for the request.
         * @param {Object} [options.data] - Data to be sent along.
         * @param {String} [options.method=GET] - HTTP Verb to be used.
         * @param {Object} [options.headers] - Key-value pairs of strings.
         * @param {Function} [options.progress] - Callback on retrieval progress.
         */
        request(url, options?: RequestOptions) {
            var _this = this;
            let deferred = DeferPromise.defer<Response>();
            options = options || { method: HttpMethod.Get };
            var method = options.method || HttpMethod.Get;
            var data = options.data || {};
            var progress = options.progress || noop;
            var headers: { [key: string]: string } = options.headers || {};

            if (_this.accessToken)
                headers['Authorization'] = 'Bearer ' + _this.accessToken;

            var req = new XMLHttpRequest();
            // send cookies?
            req.withCredentials = false;
            //
            req.addEventListener("progress", (evt) => {
                if (evt.lengthComputable) {
                    var pct = evt.loaded / evt.total;
                    // callback
                    if (typeof progress === 'function') progress.apply(_this, [pct]);
                }
            }, false);
            req.addEventListener("error", (err) => {
                // Network error occurred
                deferred.reject(new StatusCodeError(500, err['message'] || 'Unknown error'));
            }, false);
            //req.addEventListener("abort", transferCanceled, false);

            var stopWatch: number;
            req.addEventListener('load', () => {
                if (req.status >= 200 && req.status < 300) {
                    // Resolve the promise with the response
                    var response = new Response(req, Date.now() - stopWatch);
                    deferred.resolve(response);
                } else
                    deferred.reject(new StatusCodeError(req.status, req.statusText));
            }, false);

            var params: string;
            switch (method.toUpperCase()) {
                case HttpMethod.Get:
                    url += (/\?/.test(url) ? '&' : '?') + (typeof data == 'string' ? data : Object.keys(data).map(
                        function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]) }
                    ).join('&'));
                    break;
                case HttpMethod.Post:
                    params = JSON.stringify(data);
            }
            //
            req.open(method, url, true);
            switch (method.toUpperCase()) {
                case HttpMethod.Get:
                    req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                    break;
                case HttpMethod.Post:
                    req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                    req.setRequestHeader('Content-Type', 'application/json');
                    break;
            }
            for (var kvp in headers) {
                req.setRequestHeader(kvp, headers[kvp]);
            }
            //
            stopWatch = Date.now();
            req.send(params);
            return deferred.promise;
        }

        /**
         * Short-hand for 'GET' requests.
         */
        get(url, data?, headers?: { [key: string]: string }) {
            return this.request(url, { 'method': HttpMethod.Get, 'data': data, 'headers': headers || {} });
        }

        /**
         * Short-hand for 'POST' requests (content provided as json).
         */
        post(url, data?, headers?: { [key: string]: string }) {
            return this.request(url, { 'method': HttpMethod.Post, 'data': data, 'headers': headers || {} });
        }

    }

}

