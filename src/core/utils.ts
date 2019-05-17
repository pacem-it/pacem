/// <reference path="expression.ts" />
/// <reference path="promise.ts" />
/// <reference path="http.ts" />
/// <reference path="trees/json.ts" />
/// <reference path="number_extensions.ts" />

namespace Pacem {

    const JSON_DATE_PATTERN = /^\/Date\([\d]+\)\/$/i;
    const PACEM_BAG = '__pacem__';
    const PACEM_CORE_DEFAULT = 'pacem';

    export const Type = Function;

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

    export interface Type<T> extends Function { new(...args: any[]): T; }

    export interface CustomElementRegistry {
        define(name: string,
            type: Type<any>,
            options?: { [key: string]: string });

        get(name: string);
        whenDefined(name: string): PromiseLike<void>;
    };

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

        // #region blob/files...
        static loadImage(src: string) {
            const deferred = DeferPromise.defer<HTMLImageElement>();
            const img = new Image();
            img.src = src;
            if (img.complete)
                deferred.resolve(img);
            else {
                img.onload = (evt) => {
                    deferred.resolve(img);
                };
            }
            return deferred.promise;
        }

        // thanks to @cuixiping: http://stackoverflow.com/questions/23150333
        static blobToDataURL(blob: Blob) {
            var deferred = DeferPromise.defer<string>();
            var a = new FileReader();
            a.onload = function (e) { deferred.resolve(e.target['result']); }
            a.readAsDataURL(blob);
            return deferred.promise;
        }

        static dataURLToBlob(dataurl: string) {
            var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
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

            var DOMURL = window.URL || window['webkitURL'] || window;

            var img = new Image();
            var svg = new Blob([data], { type: 'image/svg+xml' });
            var url = DOMURL.createObjectURL(svg);
            img.src = url;
            return img;
        }

        static /*async*/ download(content: string | Blob, filename: string, mime: string = "application/download") {
            const fanchor = document.createElement('a');
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
        // #endregion

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
            let dom: Node[] = [],
                nodes = source.childNodes,
                ref: Node;
            for (let j = nodes.length - 1; j >= 0; j--) {
                let item = nodes.item(j);
                target.insertBefore(item, ref);
                dom.push(item);
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
         * Adds a callback at the end of a CSS animation/transition for a given element.
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
         * Increases a callback loop call until cancelation is called.
         * @param callback Callback looped.
         * @param interval First callback call delay in ms (default 500).
         * @param pace Acceleration in ms per loop (default 5).
         * @param min Minimum loop rate in ms (default 20).
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

        static isNull(val: any) {
            return val === null || val === undefined;
        }

        static isArray(val: any) {
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

        static clone(obj: any) {
            if (obj === undefined) return undefined;
            return DeepCloner.clone(obj);
        }

        static fromResult<T>(v: T): Promise<T> {
            return new Promise(resolve => resolve(v));
        }

        static fromResultAsync<T>(task: () => T): Promise<T> {
            return new Promise(resolve => requestAnimationFrame(() => resolve(task())));
        }

        //#endregion

        //#region Net

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

    export class CustomEventUtils {

        static isInstanceOf<TEvent extends CustomEvent>(evt: Event, type: Type<TEvent>): boolean {
            return evt instanceof type
                // this an optimistic BUGGED workaround due to a damn' Edge bug: https://github.com/Microsoft/ChakraCore/issues/3952
                || CustomElementUtils.getAttachedPropertyValue(evt, 'pacem:custom-event') === evt.type;
        }

        static fixEdgeCustomEventSubClassInstance<TEvent extends CustomEvent>(evt: TEvent, type: string) {
            CustomElementUtils.setAttachedPropertyValue(evt, 'pacem:custom-event', type);
        }
    }

    // {{ binding.expression }}
    const bindingPattern = /^\{\{(.|\n)+\}\}$/;

    export class CustomElementUtils {

        static get polyfilling() {
            return customElements instanceof window['CustomElementRegistry'];
        }

        static camelToKebab(camelCased: string) {
            return camelCased && camelCased.replace(/([A-Z])/g, '-$1').toLowerCase();
        }

        static kebabToCamel(kebabCased: string) {
            return kebabCased && kebabCased.replace(/(-[a-z])/g, (m) => {
                return m[1].toUpperCase();
            });
        }

        static importjs(src: string, integrity: string = null, crossorigin: boolean = false) {
            var attrs =
                { 'type': 'text\/javascript', 'src': src };
            if (!Utils.isNullOrEmpty(integrity))
                Utils.extend(attrs, { integrity: integrity });
            if (crossorigin)
                Utils.extend(attrs, { 'crossorigin': '' });
            return CustomElementUtils.import(src,
                'script', attrs,
                (document.head || document.getElementsByTagName("head")[0]));
        }

        static getWatchedProperties(target: Type<any>, includeInherited?: boolean): { name: string, config: WatchConfig }[];
        static getWatchedProperties(element: HTMLElement, includeInherited?: boolean): { name: string, config: WatchConfig }[];
        static getWatchedProperties(target: Type<any> | HTMLElement, includeInherited = true): { name: string, config: WatchConfig }[] {
            var properties: { name: string, config: WatchConfig }[] = [];
            var chain = target instanceof HTMLElement ? target.constructor : target;
            do {

                let additional: { name: string, config: WatchConfig }[] = this.getAttachedPropertyValue(chain, WATCH_PROPS_VAR) || [];
                let pblic: any[] = additional.filter(p => !p.name.startsWith('_'));
                Array.prototype.splice.apply(properties, [0, 0].concat(pblic));

            } while (includeInherited && (chain = Object.getPrototypeOf(chain)));
            return properties;
        }

        static importcss(src: string, integrity: string = null, crossorigin: boolean = false) {
            var attrs =
                { 'rel': 'stylesheet', 'href': src };
            if (!Utils.isNullOrEmpty(integrity))
                Utils.extend(attrs, { integrity: integrity });
            if (crossorigin)
                Utils.extend(attrs, { 'crossorigin': '' });
            return CustomElementUtils.import(src,
                'link', attrs,
                (document.head || document.getElementsByTagName("head")[0]));
        }

        static import(key: string, tagName: string, attrs: { [name: string]: any }, appendTo: Node = document.body): PromiseLike<HTMLElement> {
            var deferred = DeferPromise.defer<HTMLElement>();
            const _p = Utils.core;
            var _imports = _p['imports'] = _p['imports'] || {},
                script: HTMLElement;
            if (script = _imports[key]) {
                deferred.resolve(script);
            } else {
                script = document.createElement(tagName);
                script.onerror = e => {
                    deferred.reject(e);
                };
                script.onload = () => {
                    deferred.resolve(_imports[key] = script);
                };
                appendTo.appendChild(script);
                for (var attr in (attrs || {})) {
                    script.setAttribute(attr, attrs[attr]);
                }
            }
            return deferred.promise;
        }

        static setAttachedPropertyValue(target: any, name: string, value: any) {

            /*(target[PACEM_BAG] = target[PACEM_BAG] || {})[name] = value;*/

            if (Utils.isNull(target)) return;
            const propKey = Object.getOwnPropertyDescriptor(target, PACEM_BAG);
            const bag: PropertyDescriptor = (propKey && propKey.value)
                || Object.defineProperty(target, PACEM_BAG, {
                    value: {}, enumerable: false, writable: false, configurable: false
                })[PACEM_BAG];
            if (Utils.isNull(value))
                delete bag[name];
            else
                bag[name] = value;
        }

        static deleteAttachedPropertyValue(target: any, name: string) {
            CustomElementUtils.setAttachedPropertyValue(target, name, undefined);
        }

        static getAttachedPropertyValue(target: any, name: string, ensureValue?: any): any {
            const propKey = Object.getOwnPropertyDescriptor(target, PACEM_BAG),
                bag = propKey && propKey.value;
            if (Utils.isNull(bag && bag[name]) && !Utils.isNull(ensureValue)) {
                CustomElementUtils.setAttachedPropertyValue(target, name, ensureValue);
                return ensureValue;
            }
            return bag && bag[name];
        }

        /**
         * Resolves a dotted path into actual values.
         * @param path Dotted path
         * @param scope Root of the path
         */
        static resolvePath(path: string, scope: any): { target: { value: any, name: string }, parent: { value: any, path: string }, root: { value: any, property: string } } {
            if (!path || !scope) return undefined;
            if (/[\(\)\{\}]/.test(path))
                throw `Security alert: not allowed to process paths like ${path}.`;
            const trunks = path.split('.');

            var root = scope,
                ref = root,
                parent,
                core = trunks[0];

            trunks.forEach((t, i) => {
                var trunksSq = t.split('[');
                trunksSq.forEach((t2, j) => {
                    parent = ref;
                    if (/\]$/.test(t2)) {
                        t2 = t2.substr(0, t2.length - 1);
                        if (/^('|").+[^\\]\1$/.test(t2)) {
                            t2 = t2.substr(1, t2.length - 2);
                        }
                    }
                    ref = ref[t2];
                });
            });
            var name: string, ndx: number;
            if (/\]$/.test(path)) {
                ndx = path.lastIndexOf('[');
                name = path.substr(ndx + 1);
                name = name.substr(0, name.length - 1);
            } else {
                ndx = path.lastIndexOf('.');
                name = path.substr(ndx + 1);
            }
            return { target: { value: ref, name: name }, parent: { value: parent || scope, path: path.substr(0, ndx) }, root: { value: root, property: core } };
        }

        static set(element: Node, path: string, value: any) {
            var obj = CustomElementUtils.resolvePath(path, element);
            var current = obj.target.value;
            if (current !== value) {
                if (obj.parent.value != obj.root.value /* nested property scenario */) {

                    // 1. set new value (won't fire 'propertychange' since it's a nested property)
                    obj.parent.value[obj.target.name] = value;

                    // 2. clone the resulting object (will be set as the new one at 4.)
                    const set_val = Utils.clone(obj.root.value[obj.root.property]);

                    // 3. reset to previous value (so that when 4. will trigger the 'propertychange' we'll have meaningful arguments)
                    obj.parent.value[obj.target.name] = current;

                    // repeater-item?
                    let repItem: Components.RepeaterItem;
                    if (obj.root.property === 'item' && !Utils.isNull(repItem = Components.RepeaterItem.getRepeaterItem(obj.root.value))) {

                        // kind of ugly solution, I know. it works however...
                        // trigger array update
                        repItem.repeater && repItem.repeater.datasource && repItem.repeater.datasource.splice(repItem.index, 1, repItem.item = set_val);
                    } else {

                        // 4. force root property change
                        obj.root.value[obj.root.property] = set_val;
                    }
                } else {
                    // parent === root, property change event fires automatically
                    obj.parent.value[obj.target.name] = value;
                }
            }
        }

        static get(element: Node, path: string): any {
            var obj = CustomElementUtils.resolvePath(path, element);
            return obj && obj.target && obj.target.value;
        }

        static findScopeContext(element: HTMLElement): Document | ShadowRoot {
            let el: Node = element;
            let retval: Document | ShadowRoot;
            do {
                el = el.parentNode;
            } while (el != null && (el != (retval = element.ownerDocument) || (el instanceof HTMLElement && (retval = el.shadowRoot) != null)));

            //let logFn: (message?: string) => void;
            //if (retval == null && console && (logFn = console.debug))
            //    logFn(`Element "${element.constructor.name}" isn't attached to any context yet.`);
            return retval;
        }

        static findAncestor(element: Element, predicate: (Node) => boolean): any {
            let el: Node = element;
            let retval: any;
            while (el && (el = el.parentNode) != null) {
                if (el['host'] instanceof HTMLElement)
                    el = el['host'];
                if (predicate.apply(el, [el])) {
                    retval = el;
                    break;
                }
            }
            return retval;
        }

        static findAncestorShell(element: Element): HTMLElement {
            return CustomElementUtils.findAncestor(element, el => Utils.is(el, `.${PCSS}-body`) || el === document.body);
        }

        static findAncestorOfType<TNode extends Node>(element: Element, ctor: Type<TNode>): TNode {
            return CustomElementUtils.findAncestor(element, el => el instanceof ctor);
        }

        static findDescendants(element: Element, predicate: (Node) => boolean): Node[] {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
            var retval: Node[] = [];
            while (walker.nextNode()) {
                let n = walker.currentNode;
                if (predicate(n) === true)
                    retval.push(n);
            }
            return retval;
        }

        /**
         * To be used back again when Edge will allow Comment subclassing
         * https://github.com/Microsoft/ChakraCore/issues/2999 and https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/12080908/
         * @param element
         * @param ctor
         * @param upLevels
         */
        static findPreviousSiblingOrAncestorOfType<TNode extends Node>(element: Element, ctor: Type<TNode>, upLevels: number = 0): TNode {
            let el: Node = element;
            let retval: TNode = null;
            let levels: number = 0;
            do {
                el = el.previousSibling || el.parentNode;
                if (el instanceof ctor) {
                    if (levels >= upLevels) {
                        retval = <TNode>el;
                        break;
                    } else {
                        el = el.parentNode;
                    }
                    levels++;
                }
            } while (el != null);

            return retval;
        }

        /**
         * To be removed when Edge will allow Comment subclassing
         * https://github.com/Microsoft/ChakraCore/issues/2999 and https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/12080908/
         * @param element
         * @param predicate
         * @param upLevels
         */
        static findPreviousSiblingOrAncestor(element: Element, predicate: (Node) => boolean, upLevels: number = 0): Node {
            let el: Node = element;
            let retval: Node = null;
            let levels: number = 0;
            do {
                el = el.previousSibling || el.parentNode;
                if (el && predicate.apply(el, [el])) {
                    if (levels >= upLevels) {
                        retval = el;
                        break;
                    } else {
                        el = el.parentNode;
                    }
                    levels++;
                }
            } while (el != null);

            return retval;
        }

        static assignHostContext(host: any, template: HTMLTemplateElement) {
            const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT + /* traverse templates' content */NodeFilter.SHOW_DOCUMENT_FRAGMENT);
            while (walker.nextNode()) {
                var node = walker.currentNode;
                /*if (node instanceof HTMLTemplateElement)
                    CustomElementUtils.assignHostContext(host, node);
                else*/ if (Utils.isNull(CustomElementUtils.getAttachedPropertyValue(node, INSTANCE_HOST_VAR)))
                    CustomElementUtils.setAttachedPropertyValue(node, INSTANCE_HOST_VAR, host);
            }
        }

        static findHostContext(element: HTMLElement): HTMLElement {
            let el: HTMLElement = element;
            let retval: any;
            while (el != null) {
                retval = CustomElementUtils.getAttachedPropertyValue(el, INSTANCE_HOST_VAR);
                if (retval instanceof HTMLElement)
                    break;
                el = el.parentElement;
            }
            let logFn: (message?: string) => void;
            if (retval == null && console && (logFn = console.warn))
                logFn(`Element "${element.constructor.name}" isn't a descendant of a templated component.`);
            return retval;
        }

        static isBindingAttribute(attr: string) {
            /*if (/^\s*\{\s*binding\s+.*\}\s*$/.test(attr)) {

                // { binding ... } syntax
                var fn = attr.replace('binding', '').trim();
                fn = fn.substring(1, fn.length - 1);
                let twoway = /,\s*twoway\s*=\s*true\s*$/.test(fn);
                let commaNdx = fn.indexOf(',');
                if (commaNdx == -1)
                    commaNdx = fn.length;
                var expression = Expression.parse(fn.substr(0, commaNdx), element);
                (expression && expression.dependencies).forEach(d => {
                    d.twoway = d.twowayAllowed && twoway && expression.dependencies.length == 1;
                });
                return expression;
            }
            else*/
            return bindingPattern.test(attr);
        }

        static parseBindingAttribute(attr: string, element: HTMLElement): Expression {
            if (CustomElementUtils.isBindingAttribute(attr)) {
                // loose syntax {{ ... }}
                let expression = attr.substr(2, attr.length - 4);
                const arr = /,\s*(twoway|once)\s*$/.exec(expression),
                    mode: string = arr && arr.length > 1 && arr[1];
                if (!Utils.isNullOrEmpty(mode)) {
                    expression = expression.substr(0, expression.lastIndexOf(','));
                }
                var expr = Expression.parse(expression, element);
                (expr && expr.dependencies).forEach(d => {
                    switch (mode) {
                        case 'twoway':
                            d.mode = (d.twowayAllowed && expr.dependencies.length == 1) ? 'twoway' : undefined;
                            break;
                        case 'once':
                            d.mode = mode;
                            break;
                    }
                });
                return expr;
            } else {
                throw `Invalid attribute: incorrect binding syntax.`;
                //return new Function(`return ${attr};`).apply(element);
            }
        }

        static ensureMember(o: any, name: string, attributes: PropertyDescriptor): PropertyDescriptor {
            let original = Object.getOwnPropertyDescriptor(o, name);
            if (original != undefined)
                return original;
            Object.defineProperty(o, name, attributes);
            return Object.getOwnPropertyDescriptor(o, name);
        }

        /**
         * Strips all the observed attributes of an element and its descendants, in order to seal that dom branch and to avoid bindings evaluation.
         * @param element Input element
         */
        static stripObservedAttributes(element: Element) {
            avoidObservedAttributes(element, false);
        }

        /**
         * Freezes all the observed attributes of an element and its descendants, in order to seal that dom branch and to avoid bindings evaluation.
         * @param element Input element
         */
        static freezeObservedAttributes(element: Element) {
            avoidObservedAttributes(element);
        }
    }

    function avoidObservedAttributes(element: Element, freeze: boolean = true) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT);
        do {
            var node = walker.currentNode;
            if (node instanceof HTMLElement) {
                const attrs = <string[]>node.constructor['observedAttributes'];
                if (!Utils.isNull(attrs)) {
                    CustomElementUtils.deleteAttachedPropertyValue(node, INSTANCE_BINDINGS_VAR);

                    let revertFn = function (v) {
                        if (Utils.isArray(v)) {
                            return '[' + v.map(revertFn).join(',') + ']';
                        }
                        if (v instanceof Element) {
                            const vid = v.id = v.id || ('_' + Utils.uniqueCode());
                            return `#${vid}`;
                        } else {
                            return `${Utils.Json.stringify(v)}`;
                        }
                    };

                    for (var attr of attrs) {
                        if (attr in node.attributes) {
                            let prop: string;
                            let val: any;
                            if (freeze && !Utils.isNull(val = node[prop = CustomElementUtils.kebabToCamel(attr)])) {
                                let reverted = revertFn(val);
                                node.setAttribute(attr, `{{ ${reverted} }}`);
                            } else
                                node.removeAttribute(attr);
                        }
                    }
                }
            }
        } while (walker.nextNode())
    }
}