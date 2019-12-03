/// <reference path="expression.ts" />
/// <reference path="promise.ts" />
/// <reference path="prefix.ts" />
/// <reference path="trees/json.ts" />
/// <reference path="utils.ts" />

namespace Pacem {

    const PACEM_BAG = '__pacem__';

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

        static getWatchedProperty(target: HTMLElement, name: string): { name: string, config: WatchConfig } {
            return this.getWatchedProperties(target, true).find(p => p.name === name);
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
                if (obj.parent.value != obj.root.value /* nested property scenario */
                    && !(obj.parent.value instanceof HTMLElement) /* and not targeting an HTMLElement (which will eventually fire autonomously) */) {

                    // 1. set new value (won't fire 'propertychange' since it's a nested property)
                    obj.parent.value[obj.target.name] = value;

                    // 2. clone the resulting object (will be set as the new one at 4.)
                    const set_val = Utils.clone(obj.root.value[obj.root.property]);

                    // 3. reset to previous value (so that when 4. will trigger the 'propertychange' we'll have meaningful arguments)
                    obj.parent.value[obj.target.name] = current;

                    // repeater-item?
                    let repItem: RepeaterItem;
                    if (obj.root.property === 'item' && !Utils.isNull(repItem = RepeaterItem.getRepeaterItem(obj.root.value))) {

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

        static findAll<T extends Element>(selector: string = '[pacem]', filter: (e: Element) => boolean = (e) => true): T[] {
            const retval: T[] = [];
            document.querySelectorAll(selector).forEach((e, i, arr) => {
                if (filter(e) === true) {
                    retval.push(e as T);
                }
            });
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

    const GET_VAL = CustomElementUtils.getAttachedPropertyValue;
    const SET_VAL = CustomElementUtils.setAttachedPropertyValue;
    const REPEATERITEM_PLACEHOLDER = 'pacem:repeater-item';

    export interface Repeater extends HTMLElement {

        datasource: any[];

    }

    export class Repeater {

        /**
         * Seeks for a PacemRepeaterItem element upwards through the DOM tree, given a starting element and the number of nesting levels.
         * @param element {HTMLElement} Element to start the upward search from
         * @param Optional upLevels {Number} 0-based nesting level
         */
        static findItemContext(element: Element, upLevels: number = 0, logFn: (message?: string) => void = console.warn): Pacem.RepeaterItem {
            let retval = RepeaterItem.findUpwards(element, upLevels, logFn);
            if (retval == null && logFn && element instanceof HTMLElement && element['isConnected']) {
                logFn(`Couldn't find a ${RepeaterItem.name} up ${upLevels} level${((upLevels === 1) ? "" : "s")} from element "${element.constructor.name}".`);
            }
            return retval;
        }
    }

    export abstract class RepeaterItem {

        static findUpwards(element: Element, upLevels: number = 0, logFn: (message?: string) => void = console.warn) {
            if (Utils.isNull(element) || element.localName === 'template' || element instanceof /* template-like element? */ TemplateElement) {
                return null;
            }
            let item: /* repeater-item core */ Pacem.RepeaterItem = null;
            let predicate: (node: any) => boolean = (node) => !Utils.isNull(item = RepeaterItem.getRepeaterItem(node));
            let retval: Node = CustomElementUtils.findPreviousSiblingOrAncestor(element, predicate, upLevels);
            if (retval == null && logFn && element instanceof HTMLElement && element['isConnected']) {
                logFn(`Couldn't find a ${RepeaterItem.name} up ${upLevels} level${((upLevels === 1) ? "" : "s")} from element "${element.constructor.name}".`);
            }
            return item;
        }

        static isRepeaterItem(node: Node) {
            return !Utils.isNull(GET_VAL(node, REPEATERITEM_PLACEHOLDER));
        }

        static getRepeaterItem(node: Node): RepeaterItem {
            return GET_VAL(node, REPEATERITEM_PLACEHOLDER);
        }

        constructor(private _placeholder: Node) {
            SET_VAL(_placeholder, REPEATERITEM_PLACEHOLDER, this);
        }

        abstract item: any;
        abstract index: number;
        abstract readonly repeater: Repeater;

        get placeholder() {
            return this._placeholder;
        }
    }
}