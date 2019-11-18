/// <reference path="expression.ts" />
/// <reference path="promise.ts" />
/// <reference path="trees/json.ts" />
/// <reference path="number_extensions.ts" />

namespace Pacem {

    const JSON_DATE_PATTERN = /^\/Date\([\d]+\)\/$/i;
    const PACEM_CORE_DEFAULT = 'pacem';
    const DEFAULT_DOWNLOAD_FILENAME = 'download';

    export const stopPropagationHandler = (evt: Event) => {
        evt.stopPropagation();
    };
    export const preventDefaultHandler = (evt: Event) => {
        evt.preventDefault();
    };
    export const avoidHandler = (evt: Event) => {
        evt.preventDefault();
        evt.stopPropagation();
    };

    declare type DownloadOptions = {
        filename?: string, mime?: string, credentials?: RequestCredentials, headers?: { [key: string]: string }
    }

    export class Utils {

        static get core() {
            const root: any = window['Pacem'];
            var id: string = (root && root.Configuration && root.Configuration.core) || PACEM_CORE_DEFAULT;
            return window[id] = window[id] || {};
        }

        static get customElements(): any {
            return window['customElements'];
        }

        // #region GENERAL

        static cssEscape(input: string) {
            return escape(input).replace('%', '\\');
        }

        static uniqueCode() {
            var pacem = this.core;
            var seed: number = pacem.__currentSeed || new Date().valueOf();
            pacem.__currentSeed = ++seed;
            return seed.toBase62();
        }

        static parseDate(input: string | Date | number): Date {
            let d: any;
            if (typeof input === 'string') {
                if (JSON_DATE_PATTERN.test(input))
                    d = parseInt(input.substring(6));
                else
                    d = Date.parse(input);
                return new Date(d);
            } else if (typeof input === 'number') {
                return new Date(input);
            } else
                return input as Date;
        }

        static copyToClipboard(input: string) {
            const deferred = DeferPromise.defer();
            const el = document.createElement('textarea');
            el.value = input;
            el.style.opacity = "0";
            document.body.appendChild(el);

            try {
                el.select();
                document.execCommand('copy');
                el.remove();
                deferred.resolve();
            } catch (e) {
                deferred.reject(e);
            }
            return deferred.promise;
        }

        // json-dedicated
        static Json = {
            stringify: Json.serialize,
            parse: Json.deserialize
        }

        // dates-dedicated
        static Dates = {
            parse: Utils.parseDate,
            isLeapYear: function (year: number): boolean {
                return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
            },
            daysInMonth: function (year: number, month: number): number {
                return [31, (Utils.Dates.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
            },
            /**
             * Gets whether a date is an `Invalid Date` or not.
             * @param date
             */
            isDate: function (date: Date): boolean {
                return !isNaN(date && date.valueOf());
            },
            dateOnly: function (datetime: Date): Date {
                return new Date(datetime.getFullYear(), datetime.getMonth(), datetime.getDate());
            },
            addMonths: function (input: Date, value: number): Date {
                let n = input.getDate(),
                    i = new Date(input),
                    month = i.getMonth() + value,
                    years = 0;
                while (month < 0) {
                    month += 12;
                    years--;
                }
                i.setDate(1);
                i.setMonth(month % 12);
                i.setFullYear(i.getFullYear() + years + Math.floor(month / 12));
                i.setDate(Math.min(n, Utils.Dates.daysInMonth(i.getFullYear(), i.getMonth())));
                return i;
            },
            addDays: function (input: Date, value: number): Date {
                return new Date(input.valueOf() + value * 86400000)
            }
        }

        static leftPad(v: any, targetLength: number, padChar: string) {
            let retval = v.toString();
            while (retval.length < targetLength)
                retval = padChar + retval;
            return retval;
        }

        // #endregion

        // #region blob/files...
        static loadImage(src: string) {
            return new Promise<HTMLImageElement>((resolve, reject) => {
                const img = new Image();
                img.src = src;
                if (img.complete) {
                    resolve(img);
                } else {
                    img.onload = (evt) => {
                        resolve(img);
                    };
                    img.onerror = (evt) => {
                        reject();
                    };
                }

            });
        }

        // thanks to @cuixiping: http://stackoverflow.com/questions/23150333
        static blobToDataURL(blob: Blob): Promise<string | ArrayBuffer> {
            return new Promise((resolve, _) => {
                var a = new FileReader();
                a.onload = (e) => { resolve(e.target.result); }
                a.readAsDataURL(blob);
            });
        }

        static dataURLToBlob(dataurl: string) {
            var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
        }

        static textToBlob(content: string): Blob {
            return new Blob([content], { type: 'text/plain' });
        }

        /**
         * Resizes an image when exceeding the provided size constraints.
         * @param img {Blob} Input image
         * @param maxWidth {number} Width constraint
         * @param maxHeight {number} Height constraint
         */
        static resizeImage(img: Blob, maxWidth: number, maxHeight: number, quality?: number): PromiseLike<Blob> {
            var deferred = DeferPromise.defer<Blob>();
            Utils.blobToDataURL(img)
                .then(Utils.loadImage)
                .then(el => {
                    const
                        origWidth = el.width,
                        origHeight = el.height;
                    let cnv = document.createElement('canvas');
                    cnv.width = origWidth;
                    cnv.height = origHeight;
                    let ctx = cnv.getContext('2d');
                    //ctx.drawImage(el, 0, 0);

                    if (origWidth > maxWidth
                        || origHeight > maxHeight) {

                        const
                            origRatio = origWidth / origHeight,
                            targetRatio = maxWidth / maxHeight;

                        let targetHeight: number,
                            targetWidth: number;
                        if (targetRatio < origRatio) {
                            targetWidth = maxWidth;
                            targetHeight = maxWidth / origRatio;
                        } else {
                            targetHeight = maxHeight;
                            targetWidth = maxHeight * origRatio;
                        }

                        cnv.width = targetWidth;
                        cnv.height = targetHeight;
                        const jpeg = quality > 0 && quality <= 1;
                        if (jpeg) {
                            ctx.fillStyle = '#000';
                            ctx.fillRect(0, 0, cnv.width, cnv.height);
                        }
                        Utils.cropImageOntoCanvas(el, ctx);
                        let newUrl: string;

                        if (jpeg)
                            newUrl = ctx.canvas.toDataURL("image/jpeg", quality);
                        else
                            newUrl = ctx.canvas.toDataURL();

                        deferred.resolve(Utils.dataURLToBlob(newUrl));
                    } else {
                        deferred.resolve(img);
                    }
                }, _ => {
                    // image loading error caught...
                });
            return deferred.promise;
        }

        /**
         * Crops an image having the provided url (might be a dataURL) into another having the provided size
         * @param url
         * @param width
         * @param height
         * @param ctx
         */
        static cropImage(url: string, width?: number, height?: number, quality?: number): PromiseLike<string> {
            var deferred = DeferPromise.defer<string>();
            let el = new Image();
            el.crossOrigin = 'anonymous';
            el.onload = function (ev) {
                let cnv = document.createElement('canvas');
                let ctx = cnv.getContext('2d');
                if (width) cnv.width = width;
                if (height) cnv.height = height;
                //
                const jpeg = quality > 0 && quality <= 1;
                if (jpeg) {
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, cnv.width, cnv.height);
                }
                Utils.cropImageOntoCanvas(el, ctx);
                deferred.resolve(jpeg ? cnv.toDataURL('image/jpeg', quality) : cnv.toDataURL());
            };
            el.src = url;
            return deferred.promise;
        }

        static getUserMediaFunctions() {
            var _getUserMedia = [];
            let methods = [navigator['getUserMedia'], navigator['webkitGetUserMedia'], navigator['msGetUserMedia'], navigator['mozGetUserMedia']];
            let fns = methods.filter(function (fn, j) { return typeof fn == 'function'; });
            if (fns.length) _getUserMedia = fns;

            return _getUserMedia;
        }

        /**
         * Crops the snapshot of a drawable element onto a provided canvas context. It gets centered in the area anc cropped (`cover`-like behavior).
         * @param el drawable element
         * @param ctx canvas context
         * @param sourceWidth forced source width
         * @param sourceHeight forced source height
         */
        static cropImageOntoCanvas(el: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement, ctx: CanvasRenderingContext2D, sourceWidth?: number, sourceHeight?: number) {

            ctx.imageSmoothingEnabled =
                ctx['mozImageSmoothingEnabled'] =
                ctx['oImageSmoothingEnabled'] =
                ctx['webkitImageSmoothingEnabled'] =
                true;
            //
            let tgetW = ctx.canvas.width /*= parseFloat(scope.thumbWidth)*/;
            let tgetH = ctx.canvas.height /*= parseFloat(scope.thumbHeight)*/;
            let cnvW = tgetW, cnvH = tgetH;
            let w = sourceWidth || 1.0 * el.width, h = sourceHeight || 1.0 * el.height;
            //console.log('img original size: ' + w + 'x' + h);
            var ratio = w / h;
            var tgetRatio = tgetW / tgetH;
            if (tgetRatio > ratio) {
                // crop vertically
                var f = tgetW / w;
                tgetH = f * h;
                ctx.drawImage(el, 0, .5 * (-tgetH + cnvH), cnvW, tgetH);
            } else {
                // crop horizontally
                var f = tgetH / h;
                tgetW = f * w;
                ctx.drawImage(el, -Math.abs(.5 * (-tgetW + cnvW)), 0, tgetW, cnvH);
            }
        }

        static snapshotElement(el: HTMLElement | SVGElement): HTMLImageElement {

            var data = el.outerHTML;

            if (el instanceof HTMLElement) {

                var doc = document.implementation.createHTMLDocument('');
                doc.write(el.outerHTML);

                doc.documentElement.setAttribute('xmlns', doc.documentElement.namespaceURI);

                const html = new XMLSerializer().serializeToString(doc);

                const node = <HTMLElement>document.evaluate(".//" + el.localName, doc.body, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                node.setAttribute('xmlns', doc.documentElement.namespaceURI);
                node.style.cssText = getComputedStyle(el).cssText;

                // Get well-formed markup
                var data = '<svg xmlns="http://www.w3.org/2000/svg" width="' + el.offsetWidth + '" height="' + el.offsetHeight + '">' +
                    '<foreignObject width="100%" height="100%">' +
                    node.outerHTML +
                    '</foreignObject>' +
                    '</svg>';

            }

            var DOMURL: { createObjectURL: (object) => string } = window.URL || window['webkitURL'] || <any>window;

            var img = new Image();
            var svg = new Blob([data], { type: 'image/svg+xml' });
            var url = DOMURL.createObjectURL(svg);
            img.src = url;
            return img;
        }

        static download(content: Blob, filename?: string, mime?: string): PromiseLike<void>;
        static download(url: string, filename?: string, mime?: string): PromiseLike<void>;
        static download(url: string, options: DownloadOptions): PromiseLike<void>;
        static async download(arg0: string | Blob, arg1?: string | DownloadOptions, mime: string = "application/download") {

            if (typeof arg0 === 'string') {
                const url = arg0;
                let options: RequestInit = {},
                    filename: string;
                if (!Utils.isNullOrEmpty(arg1)) {
                    if (typeof arg1 === 'object') {
                        options = { credentials: arg1.credentials, headers: arg1.headers };
                        filename = arg1.filename || filename;
                        mime = arg1.mime || mime;
                    } else {
                        filename = arg1;
                    }
                }

                var response = await fetch(url, options);
                if (response.ok) {
                    if (Utils.isNullOrEmpty(filename)) {
                        const headerName = 'Content-Disposition';
                        if (response.headers.has(headerName)) {
                            const header = response.headers.get(headerName),
                                results = /^attachment; filename=([^;]+)(;|$)/.exec(header);
                            if (results.length > 1) {
                                filename = results[1];
                            }
                        } else {
                            filename = DEFAULT_DOWNLOAD_FILENAME;
                        }
                    }
                    var blob = await response.blob();
                    const fn = filename.split(/[\\\/]/g).join('_');
                    return Utils.download(blob, fn);
                }
            } else {
                const content = arg0,
                    filename = (typeof arg1 === 'string' && arg1) || DEFAULT_DOWNLOAD_FILENAME,
                    fanchor = document.createElement('a');
                fanchor.setAttribute('href', window.URL.createObjectURL(content));
                fanchor.setAttribute('download', filename);
                if (document.createEvent) {
                    var event = document.createEvent('MouseEvents');
                    event.initEvent('click', true, true);
                    fanchor.dispatchEvent(event);
                } else {
                    fanchor.click();
                }
            }
        }

        // #endregion

        // #region DOM

        static isDOMReady() {
            return document.readyState === 'interactive'
                || document.readyState === 'complete';
        }

        static onDOMReady(listener: EventListenerOrEventListenerObject) {
            window.addEventListener('load', listener, false);
        }

        /**
         * Moves all the source element children to the target element and returns them as an array of nodes.
         * @param source Source element.
         * @param target Target element.
         */
        static moveChildren(source: Element, target: Element): Node[] {
            return Utils.moveItems(source.childNodes, target);
        }

        /**
         * Moves specific nodes to the target element and returns them as an array of nodes.
         * @param nodes Nodes to move.
         * @param target Target element.
         */
        static moveItems(nodes: Node[]|NodeList, target: Element) {
            let dom: Node[] = [],
                ref: Node;
            for (let j = nodes.length - 1; j >= 0; j--) {
                let item = nodes instanceof NodeList ? nodes.item(j) : nodes[j];
                target.insertBefore(item, ref);
                dom.unshift(item);
                ref = item;
            }
            return dom;
        }

        static is(el: any, selector: string): boolean {
            return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector)
                .call(el, selector);
        }

        static lang(el: HTMLElement): string {
            return el.lang || document.documentElement.lang || navigator.language;
        }

        static jsonSortStringify(obj: {}): string {
            if (Utils.isNull(obj)) {
                return <any>obj;
            }
            return Utils.Json.stringify(obj);
        }

        static cookies(cookie = document.cookie) {
            const cookies = (cookie || '').split(';'),
                retval: { [name: string]: string } = {};
            for (var pair of cookies) {
                const keyval = pair.split('=');
                if (keyval.length < 2)
                    continue;
                const key = (keyval[0] || '').trim(),
                    value = (keyval[1] || '').trim();
                Object.defineProperty(retval, key, {
                    configurable: false, enumerable: true, writable: false,
                    value: decodeURIComponent(value.split('+').join(' '))
                });
            }
            return retval;
        }

        static hasClass(el: HTMLElement | SVGElement, className: string): boolean {
            if (el.classList)
                return el.classList.contains(className);
            else
                return new RegExp('(^| )' + className + '( |$)', 'gi').test(el.className);
        }

        static isVisible(el: HTMLElement | SVGElement) {
            return getComputedStyle(el).visibility !== 'hidden' && (el.clientWidth > 0 || el.clientWidth > 0);
        }

        static addClass(el: HTMLElement | SVGElement, className: string) {
            const css = className.trim();
            if (el.classList)
                DOMTokenList.prototype.add.apply(el.classList, css.split(' '));
            else
                el.setAttribute('class', el.className + ' ' + css);
        }

        static removeClass(el: HTMLElement | SVGElement, className: string) {
            const css = className.trim();
            if (el.classList)
                DOMTokenList.prototype.remove.apply(el.classList, css.split(' '));
            else
                el.setAttribute('class', el.className.replace(new RegExp('(^|\\b)' + css.split(' ').join('|') + '(\\b|$)', 'gi'), ' '));
        }

        static offset(el: Element): { top: number, left: number, width: number, height: number } {
            var rect = el.getBoundingClientRect();
            return {
                top: Math.round(rect.top) + Utils.scrollTop,
                left: Math.round(rect.left) + Utils.scrollLeft,
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            };
        }

        static offsetRect(el: Element): Rect {
            var rect = el.getBoundingClientRect();
            return {
                y: Math.round(rect.top) + Utils.scrollTop,
                x: Math.round(rect.left) + Utils.scrollLeft,
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            };
        }

        static deserializeTransform(style: CSSStyleDeclaration): { a: number, b: number, c: number, d: number, x: number, y: number } {
            var a = 1, b = 0, c = 0, d = 1, x = 0, y = 0, matches = /^matrix\((.*)\)$/.exec(style.transform),
                mij: string[];
            //matrix(1, 0, 0, 1, 2, 4) 
            if (matches && matches.length > 1 && (mij = matches[1].split(',')).length == 6) {
                // scale + rot
                a = parseFloat(mij[0]);
                b = parseFloat(mij[1]);
                c = parseFloat(mij[2]);
                d = parseFloat(mij[3]);
                // transl
                x += parseFloat(mij[4]);
                y += parseFloat(mij[5]);
            }
            return { a: a, b: b, c: c, d: d, x: x, y: y };
        }

        static get scrollTop() {
            return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        }

        static get scrollLeft() {
            return window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
        }

        static get windowSize() {
            let win = window;
            return {
                width: win.innerWidth || win.document.documentElement.clientWidth || win.document.body.clientWidth || 0,
                height: win.innerHeight || win.document.documentElement.clientHeight || win.document.body.clientHeight || 0
            };
        }

        /**
         * Adds a callback at the end of a CSS animation/transition for a given element (execute once).
         * @param element The very element that has to trigger the animation/transitionend event.
         * @param callback Then callback.
         * @param timeout Fallback timeout (ms) in case the animation/transitionend event won't fire.
         */
        static addAnimationEndCallback(element: HTMLElement | SVGElement, callback: (element?: HTMLElement | SVGElement) => void, timeout: number = 500) {
            const fn = (e?: Event) => {
                if (!e || e.target == element) {
                    clearTimeout(handle);
                    element.removeEventListener('animationend', fn, false);
                    element.removeEventListener('transitionend', fn, false);
                    callback.apply(this, [element]);
                }
            }
            element.addEventListener('animationend', fn, false);
            element.addEventListener('transitionend', fn, false);
            // fallback in case animation is missing
            const handle = setTimeout(fn, timeout);
        }

        /**
         * Promisifies the addAnimationEndCallback function.
         * @param element The very element that has to trigger the animation/transitionend event.
         * @param timeout Fallback timeout (ms) in case the animation/transitionend event won't fire.
         */
        static waitForAnimationEnd(element: HTMLElement | SVGElement, timeout: number = 500): Promise<void> {
            return new Promise((resolve, _) => {
                Utils.addAnimationEndCallback(element, () => {
                    resolve();
                }, timeout);
            });
        }

        /**
         * Waits until the provided timespan elapses.
         * @param msecs timespan in milliseconds
         */
        static idle(msecs: number): Promise<void> {
            return new Promise((resolve, _) => {
                setTimeout(() => resolve(), msecs);
            });
        }

        /**
         * Increases a callback loop call until cancelation is called.
         * @param callback Callback looped.
         * @param interval First callback call delay in ms (default 500).
         * @param pace Acceleration in ms per loop (default 5).
         * @param min Minimum loop rate in ms (default 20).
         * 
         * Use case/example: while keeping a button pressed, the related callback execution increases in frequency.
         */
        static accelerateCallback(callback: (token: { cancel: boolean }) => void, interval = 500, pace = 5, min = 20) {
            let token = { cancel: false },
                int: number = interval,
                last = pace + min;
            let fn = () => {
                callback(token);
                if (!token.cancel) {
                    setTimeout(fn, int);
                    if (int < last) {
                        int = min;
                    } else {
                        int -= pace;
                    }
                }
            }
            fn();
        }

        // #endregion

        // #region other

        static isEmpty(obj) {
            if (Utils.Dates.isDate(obj))
                return false;
            for (var _ in obj)
                return false;
            try {
                return JSON.stringify({}) === Utils.Json.stringify(obj);
            } catch (e) {
                return false;
            }
        }

        static isNull(val: any): val is null | undefined {
            return val === null || val === undefined;
        }

        static isArray(val: any): val is any[] {
            return Array.isArray(val);
        }

        static isNullOrEmpty(val: any) {
            return Utils.isNull(val) || val === '' || (Utils.isArray(val) && val.length == 0) || (typeof val === 'object' && Utils.isEmpty(val));
        }

        /**
         * It is a `valueOf()` based comparison.
         * @param v1 term 1
         * @param v2 term 2
         */
        static areSemanticallyEqual(v1: any, v2: any) {
            const sv1 = v1 && v1.valueOf && v1.valueOf();
            const sv2 = v2 && v2.valueOf && v2.valueOf();
            return sv1 === sv2;
        }

        static extend(target, ...sources: any[]) {
            for (var source of sources) {
                var obj = <any>Object; // <- dodging the es5 compiler // TODO: replace in a future.
                if (typeof obj.assign != 'function') {
                    obj.assign = function (target) {
                        'use strict';
                        if (target == null) {
                            throw new TypeError('Cannot convert undefined or null to object');
                        }
                        target = obj(target);
                        if (source != null) {
                            for (var key in source) {
                                if (obj.prototype.hasOwnProperty.call(source, key)) {
                                    target[key] = source[key];
                                }
                            }
                        }
                    };
                }
                else obj.assign(target, source);
            }
            return target;
        }

        static clone<T>(obj: T): T {
            if (obj === undefined) return undefined;
            return DeepCloner.clone(obj);
        }

        static fromResult<T>(v: T): Promise<T> {
            return Promise.resolve(v);
        }

        static fromResultAsync<T>(task: () => T): Promise<T> {
            return new Promise(resolve => requestAnimationFrame(() => resolve(task())));
        }

        //#endregion

        //#region Net

        static URIs = {
            format: function (url: string, parameters: { [name: string]: string }, removeMatchedParameters?: boolean) {

                // replace segments
                for (let name in parameters || {}) {
                    let tmpl = new RegExp("(^|\\/)\\{" + name + "\\??\\}(\\/|$)");
                    let arr = tmpl.exec(url);
                    if (arr && arr.length) {
                        let rpl = new RegExp("\\{" + name + "\\??\\}"),
                            ndx = arr.index;
                        url = url.substr(0, ndx) + url.substr(ndx).replace(rpl, encodeURIComponent(parameters[name]));
                        if (removeMatchedParameters) {
                            delete parameters[name];
                        }
                    }
                }

                // clean-up optional
                const optPattern = /(^|\/)\{[\w]+\?\}(\/|$)/;
                var optArr: RegExpExecArray;
                while ((optArr = optPattern.exec(url)) && optArr.length > 0) {
                    let wholeMatch = optArr[0];
                    url = url.replace(wholeMatch, wholeMatch.endsWith('/') ? "/" : "");
                }

                return url;
            },
            appendQuery: function (url: string, parameters: { [name: string]: string }) {
                const query = (/\?/.test(url) ? '&' : '?') + Object.keys(parameters).map(
                    k => encodeURIComponent(k) + '=' + encodeURIComponent(parameters[k])
                ).join('&');
                return url + query;
            },
            hasMandatoryTemplateSegments: function (url) {
                return /(^|\/)\{\.*\}(\/|$)/.test(url);
            }
        };



        static getApiResult(json: any): any {
            if (typeof json === 'object'
                && !Utils.isNull(json)
                && json.hasOwnProperty('success')
            ) {
                switch (json.success) {
                    case true:
                        if (json.hasOwnProperty('result')) {
                            return json.result;
                        }
                        break;
                    case false:
                        if (json.hasOwnProperty('error')) {
                            return null;
                        }
                        break;
                }
            }
            return json;
        }

        //#endregion
    }

}