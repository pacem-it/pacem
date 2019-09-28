/// <reference path="prefix.ts" />
/// <reference path="utils.ts" />
/// <reference path="utils-customelement.ts" />
/// <reference path="converters.ts" />
namespace Pacem {

    // #region CUSTOM ELEMENT

    //export const ViewActivatedEventName: string = 'viewactivate';

    const GET_VAL = CustomElementUtils.getAttachedPropertyValue;
    const SET_VAL = CustomElementUtils.setAttachedPropertyValue;
    const DEL_VAL = CustomElementUtils.deleteAttachedPropertyValue;

    const WATCH_PROP_PREFIX: string = 'pacem:property:';
    const WATCH_VERS_PROP: string = 'pacem:version';
    const WATCH_BIND_PREFIX: string = 'pacem:binding:';
    //const WATCH_THROTTLE_PREFIX: string = 'pacem:throttle:';

    const INSTANCE_CHILDREN_VAR: string = 'pacem:view-children';
    const HAS_BIND_PREFIX: string = 'pacem:has-binding:';
    const HAS_TEMPLATE_VAR: string = 'pacem:custom-element:has-template';
    const HASBEEN_TEMPLATED_VAR: string = 'pacem:custom-element:has-templated';
    const INSTANCE_PROMISE_VAR: string = 'pacem:custom-element:promise';
    const INSTANCE_READY_VAR = 'pacem:custom-element:ready';
    const INSTANCE_ONREADY_VAR = 'pacem:custom-element:startup';

    //const TYPE_OPTIONS_VAR = 'pacem:custom-element:options';

    function processBinding(element: HTMLElement, property: string, binding?: Expression) {
        var _this = element;
        const prop = property;
        const value = binding;
        // reset previous dependencies
        var deps = <{ dep: PropertyDependency, callback: EventListenerOrEventListenerObject }[]>GET_VAL(_this, WATCH_BIND_PREFIX + prop);
        //var handleName = WATCH_THROTTLE_PREFIX + prop;

        deps && // reset previous dependencies
            deps.forEach(i => {
                //cancelAnimationFrame(GET_VAL(_this, handleName));
                i.dep.element.removeEventListener(PropertyChangeEventName, i.callback, false);
            });

        if (Utils.isNull(value) || GET_VAL(element, INSTANCE_READY_VAR) !== true) {
            DEL_VAL(_this, WATCH_BIND_PREFIX + prop);
            DEL_VAL(_this, HAS_BIND_PREFIX + prop);
        } else {
            if (value.pending) {
                SET_VAL(_this, WATCH_BIND_PREFIX + prop, []);
            } else {
                let mode = 'oneway'; // default
                switch (value.dependencies && value.dependencies.length && value.dependencies[0].mode) {
                    case 'twoway':
                        if (/* extra-safety here: */ value.dependencies.length == 1)
                            mode = 'twoway';
                        break;
                    case 'once':
                        mode = 'once';
                }
                SET_VAL(_this, HAS_BIND_PREFIX + prop, mode);
                const mapped = value.dependencies.map(d => {
                    // gather changes and evaluate at `next frame` (?)
                    var retval = {
                        dep: d, callback: function (evt: PropertyChangeEvent) {
                            if (evt.detail.propertyName === d.property) {
                                //cancelAnimationFrame(_this[handleName]);
                                //_this[handleName] = requestAnimationFrame(() => {
                                _this[prop] = value.evaluate/*Async*/()/*.then(val => {
                                    _this[prop] = val;
                                })*/;
                                //});
                            }
                        }
                    };
                    //try {
                    d.element.addEventListener(PropertyChangeEventName, retval.callback, false);
                    //} catch (ex) {
                    //    console.log(_this.outerHTML + '\n' + d.property);
                    //    throw (ex);
                    //}
                    return retval;
                });
                SET_VAL(_this, WATCH_BIND_PREFIX + prop, mapped);
                _this[prop] = value.evaluate();
            }
        }
    }

    function retrieveTemplateAndWaitForDOMReady(config: CustomElementConfig): PromiseLike<string> {
        var deferred = DeferPromise.defer<string>();
        const on_load = (tmpl: string) => {
            if (Utils.isDOMReady())
                deferred.resolve(tmpl);
            else
                Utils.onDOMReady((evt) => {
                    deferred.resolve(tmpl);
                });
        };
        //
        if (config.template) {
            on_load(config.template);
        } else if (config.templateUrl) {
            let http = new Net.Http();
            http.get(config.templateUrl).success(r => {
                let tmpl = config.template = r.text;
                on_load(tmpl);
                return r;
            }).error(err => {
                console.error(err.message);
                on_load(null);
            });
        } else
            on_load(null);
        //
        return deferred.promise;
    }

    function retrieveDescendantTemplateActivationPromises(host: any, root: HTMLElement | ShadowRoot) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        var promises: PromiseLike<void>[] = [];
        while (walker.nextNode()) {
            var node = walker.currentNode;
            if (true === GET_VAL(node.constructor, HAS_TEMPLATE_VAR)) {
                var deferred = GET_VAL(node, INSTANCE_PROMISE_VAR, DeferPromise.defer<void>());
                promises.push(deferred.promise);
            }
        }
        return promises;
    }

    export const CustomElement = (config: CustomElementConfig) => {
        return (target: Type<any>) => {

            // might be already registered
            if (Utils.customElements.get(config.tagName)) {
                console.warn(`${config.tagName} registration skipped, since already defined.`);
                return;
            }

            // retrieved watched properties (inherited included)
            var properties = CustomElementUtils.getWatchedProperties(target, true);

            SET_VAL(target, HAS_TEMPLATE_VAR, !(Utils.isNullOrEmpty(config.template) && Utils.isNullOrEmpty(config.templateUrl)));

            if (properties && properties.length > 0) {
                // attribute change whitelist
                const OBS_ATTR_PROP = 'observedAttributes';
                var extraObserved: string[] = [];
                if (target.hasOwnProperty(OBS_ATTR_PROP)) {
                    extraObserved = (<string[]>target[OBS_ATTR_PROP]).slice();
                    delete target[OBS_ATTR_PROP];
                }

                // attributes to watch
                let attrs = extraObserved;
                for (var p of properties) {
                    let a = CustomElementUtils.camelToKebab(p.name);
                    attrs.unshift(a);
                }

                Object.defineProperty(target, OBS_ATTR_PROP, {
                    get: function () {
                        return attrs;
                    },
                    enumerable: true,
                    configurable: false
                });
            }
            {
                const proto = target.prototype;
                // connectedCallback override
                const originalConnectedCallback = Object.getOwnPropertyDescriptor(proto, 'connectedCallback') || proto.connectedCallback;
                const originalViewActivatedCallback = Object.getOwnPropertyDescriptor(proto, 'viewActivatedCallback') || proto.viewActivatedCallback;
                Object.defineProperty(proto, 'connectedCallback', {
                    value: function connectedCallback() {
                        const _this = this;
                        //console.log(`${_this.localName} connected.`);
                        _this.setAttribute('pacem', '');
                        _this.setAttribute('cloak', '');
                        // reset INSTANCE_CHILDREN_VAR at connectedCallback
                        DEL_VAL(_this, INSTANCE_CHILDREN_VAR);

                        // ready to fire
                        if (originalConnectedCallback && originalConnectedCallback.value)
                            originalConnectedCallback.value.apply(_this, []);
                        else if (typeof originalConnectedCallback == 'function')
                            originalConnectedCallback.apply(_this);
                        /*
                        There's no guarantee that at this point in the element lifecycle its inner DOM has been processed.
                        On the contrary, it is fairly likely it hasn't.
                        If the element is statically declared on the page after the class declaration (.js file), then its innerHTML is empty for sure.
                        **Any template relevant logic must be moved at a point in time when the DOM is fully loaded!**
                        */

                        retrieveTemplateAndWaitForDOMReady(config).then(tmpl => {

                            var promises: PromiseLike<void>[] = [];

                            // apply the template if not already applied(!!)...
                            if (GET_VAL(_this, INSTANCE_READY_VAR) !== true
                                // ...and if any.
                                && !Utils.isNullOrEmpty(tmpl)
                                && GET_VAL(_this, HASBEEN_TEMPLATED_VAR) != true
                            ) {
                                SET_VAL(_this, HASBEEN_TEMPLATED_VAR, true);
                                const element: HTMLElement = _this,
                                    originalContent = document.createElement('template').content,
                                    currentContent = document.createElement('template');// config.originalContent === true;

                                for (var j = element.childNodes.length - 1; j >= 0; j--) {
                                    originalContent.insertBefore(element.childNodes.item(j), originalContent.firstChild);
                                }

                                currentContent.innerHTML = tmpl;
                                // use pacem-content as a placeholder, then `insertBefore`, then remove.
                                const placeholders = currentContent.content.querySelectorAll(P + '-content');

                                // assign host and create view activation promise
                                CustomElementUtils.assignHostContext(_this, currentContent);

                                // placeholder replacement.
                                if (placeholders.length == 1) {
                                    const placeholder = placeholders.item(0);
                                    var ph = placeholder.nextSibling;
                                    const parent = placeholder.parentElement || currentContent.content;
                                    const nodes = originalContent.childNodes;
                                    parent.removeChild(placeholder);
                                    while (nodes.length > 0) {
                                        try {
                                            let node = nodes.item(0);
                                            parent.insertBefore(node, ph);
                                            //ph = node;
                                        } catch (e) {
                                            console.error(e.toString());
                                        }
                                    }


                                } else if (placeholders.length > 1) {
                                    throw `There can only be at most 1 content placeholder inside a template.`;
                                }


                                var root: ShadowRoot | HTMLElement;
                                if (config.shadow) {
                                    root = element.attachShadow({ mode: 'open' });
                                } else
                                    root = element;

                                var currentChildren = currentContent.content.children;
                                //for (var j = currentChildren.length - 1; j >= 0; j--) {
                                //    root.insertBefore(currentChildren.item(j), root.firstElementChild);
                                //}
                                while (currentChildren.length > 0) {
                                    root.append(currentChildren.item(0));
                                }

                                promises = retrieveDescendantTemplateActivationPromises(_this, root);

                            }

                            // flag as ready
                            SET_VAL(_this, INSTANCE_READY_VAR, true);

                            // retry with unresolved properties
                            for (let property of properties) {
                                const prop = property.name;
                                const config = property.config;
                                if (!config.converter.retryConversionWhenReady || !Utils.isNull(_this[prop])) {
                                    continue;
                                }
                                // check attr
                                const attrName = CustomElementUtils.camelToKebab(prop),
                                    attr = (<HTMLElement>_this).getAttribute(attrName);
                                if (!Utils.isNullOrEmpty(attr) && !CustomElementUtils.isBindingAttribute(attr)) {
                                    // retry conversion
                                    _this[prop] = config.converter.convert(attr, _this);
                                }
                            }

                            // execute todos (aka `reflect-backs` of prop values onto attr string values)
                            var todos = <(() => void)[]>(GET_VAL(_this, INSTANCE_ONREADY_VAR) || []);
                            todos.forEach(todo => {
                                todo.apply(_this);
                            });

                            //
                            var pendingBindings = (evt?: Event) => {
                                // re-evaluate pending expressions...
                                var bindings = <string[]>(GET_VAL(_this, INSTANCE_BINDINGS_VAR) || []);
                                bindings.forEach(attrName => {

                                    const attrNameBind = attrName;
                                    if (!(attrNameBind in _this.attributes)) {
                                        throw `Howcome? ${attrNameBind} not in ${_this.constructor.name} attributes!?...`;
                                    }

                                    const attrValueBind = _this.attributes[attrNameBind].value;
                                    // still a binding attribute? (might have changed its shape while pending...)
                                    if (CustomElementUtils.isBindingAttribute(attrValueBind)) {
                                        var expr = CustomElementUtils.parseBindingAttribute(attrValueBind, _this);
                                        processBinding(_this, CustomElementUtils.kebabToCamel(attrName), expr);
                                    }
                                });

                            };

                            //...now that the document is ready:
                            pendingBindings();

                            var fireViewActivated = (evt?: Event) => {

                                //(<HTMLElement>_this).dispatchEvent(new Event(ViewActivatedEventName));

                                if (originalViewActivatedCallback && originalViewActivatedCallback.value)
                                    originalViewActivatedCallback.value.apply(_this, []);
                                else if (typeof originalViewActivatedCallback == 'function')
                                    originalViewActivatedCallback.apply(_this);

                                var deferred = GET_VAL(_this, INSTANCE_PROMISE_VAR);
                                if (!Utils.isNull(deferred))
                                    deferred.resolve();

                            };

                            (<HTMLElement>_this).removeAttribute('cloak');

                            //...now that the document is ready:
                            // fire original viewActivatedCallback
                            // when all the descendant templated elements have already fired
                            Promise.all(promises)
                                .then(f => fireViewActivated());
                        });


                    }, configurable: true, enumerable: true
                });

                // disconnectedCallback override
                const originalDisconnectedCallback = Object.getOwnPropertyDescriptor(proto, 'disconnectedCallback') || proto.disconnectedCallback;
                Object.defineProperty(proto, 'disconnectedCallback', {
                    value: function disconnectedCallback() {
                        const _this = this;

                        // 1. dispose as of dev's desires
                        if (originalDisconnectedCallback && originalDisconnectedCallback.value)
                            originalDisconnectedCallback.value.apply(_this, []);
                        else if (typeof originalDisconnectedCallback === 'function')
                            originalDisconnectedCallback.apply(_this, []);

                        // 2. dismantle everything
                        SET_VAL(_this, INSTANCE_READY_VAR, false);

                        // re-evaluate pending expressions (in order to dismiss them, having the element `disconnected`)
                        const bindings = <string[]>(GET_VAL(_this, INSTANCE_BINDINGS_VAR) || []);
                        bindings.forEach(attrName => {
                            processBinding(_this, CustomElementUtils.kebabToCamel(attrName)/*, expr*/);
                        });

                    }, configurable: true, enumerable: true
                });

                // watchify attributes
                const originalAttributeChangedCallback = Object.getOwnPropertyDescriptor(proto, 'attributeChangedCallback') || proto.attributeChangedCallback;
                Object.defineProperty(proto, 'attributeChangedCallback', {
                    value: function attributeChangedCallback(name?: string, old?: string, val?: string) {
                        var _this = this;

                        const ready = GET_VAL(_this, INSTANCE_READY_VAR) === true;

                        /*
                        attributeChangedCallback has to fire BEFORE propertyChangedCallback IN THIS CASE
                        */
                        if (originalAttributeChangedCallback && originalAttributeChangedCallback.value)
                            originalAttributeChangedCallback.value.apply(_this, [name, old, val]);
                        else if (typeof originalAttributeChangedCallback === 'function')
                            originalAttributeChangedCallback.apply(_this, [name, old, val]);

                        // dispatch custom event 'attributechange'
                        const evt = new AttributeChangeEvent({ attributeName: name, oldValue: old, currentValue: val, firstChange: !ready });
                        _this.dispatchEvent(evt);

                        // binding attribute?
                        const binding = CustomElementUtils.isBindingAttribute(val);
                        const plainAttrName = name;
                        const prop = CustomElementUtils.kebabToCamel(plainAttrName);

                        if (binding) {
                            let value = CustomElementUtils.parseBindingAttribute(val, _this);
                            if (value instanceof Expression) {

                                if (value.independent) {
                                    // constant expression, just assign its value
                                    _this[prop] = value.evaluate();
                                } else {

                                    var bindings: string[] = GET_VAL(_this, INSTANCE_BINDINGS_VAR, []);
                                    bindings.push(plainAttrName);
                                    if (!value.pending) {
                                        processBinding(_this, prop, value);
                                    }
                                }

                            } else {
                                throw `Howcome? ${val} misinterpreted as ${plainAttrName} binding...`;
                            }
                        } else {
                            // retrieve property type and cast coherently...
                            var property = properties.find(p => p.name === prop);
                            if (!Utils.isNull(property)) {
                                // eventual retry at Ln.286
                                _this[prop] = property.config.converter.convert(val, _this);
                            }
                        }

                    }, configurable: true, enumerable: true
                });

                // watchify properties
                const originalPropertyChangedCallback = Object.getOwnPropertyDescriptor(proto, 'propertyChangedCallback') || proto.propertyChangedCallback;
                Object.defineProperty(proto, 'propertyChangedCallback', {
                    value: function propertyChangedCallback(name?: string, old?: any, val?: any, firstChange?: boolean, options?: WatchConfig) {
                        var _this = this;

                        const ready = GET_VAL(_this, INSTANCE_READY_VAR) === true;

                        var todo: (() => void) = () => {
                            const bindingType = GET_VAL(_this, HAS_BIND_PREFIX + name);
                            /*
                                propertyChangedCallback has to fire BEFORE attributeChangedCallback in this case
                            */
                            if (originalPropertyChangedCallback && originalPropertyChangedCallback.value)
                                originalPropertyChangedCallback.value.apply(_this, [name, old, val, !ready]);
                            else if (typeof originalPropertyChangedCallback === 'function')
                                originalPropertyChangedCallback.apply(_this, [name, old, val, !ready]);

                            // dispatch custom event 'propertychange'
                            if (!options || options.emit !== false) {
                                const evt = new PropertyChangeEvent({ propertyName: name, oldValue: old, currentValue: val, firstChange: !ready });
                                _this.dispatchEvent(evt);
                            }

                            if (Utils.isNullOrEmpty(bindingType) /* reflect to attribute only if this is not a binding property... */) {

                                var property = properties.find(p => p.name === name);

                                if (options
                                    && options.reflectBack === true
                                    // && ready (reflectBack also when not ready yet)
                                    && /* not polyfilled */ !CustomElementUtils.polyfilling
                                ) {
                                    var attrName = CustomElementUtils.camelToKebab(name),
                                        attr = _this.attributes.getNamedItem(attrName);
                                    var config: WatchConfig;
                                    if (val === undefined || val === null) {
                                        _this.removeAttribute(attrName);
                                    } else if (property && (config = property.config) && typeof config.converter.convertBack === 'function') {
                                        const sval = config.converter.convertBack(val, _this);
                                        /* ...and the values are different */
                                        if (attr == null || sval !== attr.value)
                                            _this.setAttribute(attrName, sval);
                                    }
                                }
                            } else if (bindingType === 'twoway') {
                                const binding = (<{ dep: PropertyDependency, callback: EventListenerOrEventListenerObject }[]>GET_VAL(_this, WATCH_BIND_PREFIX + name))[0].dep;
                                CustomElementUtils.set(binding.element, binding.path, val);
                            } else if (bindingType === 'once') {
                                // remove the binding
                                processBinding(_this, name /*, null*/);
                            }

                        };
                        // the following filter is needed in order to avoid attribute reflect-back and error:
                        // `Uncaught DOMException: Failed to construct 'CustomElement': The result must not have attributes`
                        if (ready) {
                            todo.apply(_this);
                        } else {
                            var todos: (() => void)[] = GET_VAL(_this, INSTANCE_ONREADY_VAR, []);
                            todos.push(todo);
                        }


                    }, configurable: true, enumerable: true
                });
            }

            Utils.customElements.define(config.tagName, target, config.options);
            Utils.customElements.whenDefined(config.tagName).then(() => {
                //console.log(`${config.tagName} defined.`);
            });

        };
    }

    // #endregion

    // #region WATCH PROPERTIES

    const DefaultPropertyConverter = PropertyConverters.None;

    export function Watch(config?: WatchConfig) {
        return (target: any, prop: string, descriptor?: PropertyDescriptor) => {

            var watchableProperties: { name: string, config: WatchConfig }[] = GET_VAL(target.constructor, WATCH_PROPS_VAR, []);
            watchableProperties.push({
                name: prop, config: Utils.extend({ emit: true, converter: DefaultPropertyConverter }, config)
            });

            // comparer
            const comparer = DefaultComparer;

            // original setter?
            var setter = descriptor && descriptor.set;

            // backing field value
            const propref: string = WATCH_PROP_PREFIX + prop; // <- pacem:property:'prop'
            const ver: string = WATCH_VERS_PROP; // <- pacem:version
            const propver: string = WATCH_VERS_PROP + ':' + prop; // <- pacem:version:'prop'

            // getter
            function getter() {
                var _this = this;
                return GET_VAL(_this, propref);
            };

            function onChange(key: string, oldValue: any, currentValue: any) {
                var _this = this;
                const debounce = config && config.debounce;
                // does it implement OnPropertyChanged?
                var propertyChangedCallback: (name: string, old: any, val: any) => void;
                if (typeof (propertyChangedCallback = _this['propertyChangedCallback']) == 'function') {
                    var fn = () => propertyChangedCallback.apply(_this, [key, oldValue, GET_VAL(_this, propref), false /* dummy */, config]);
                    if (debounce > 0) {
                        clearTimeout(this['_handle_' + prop]);
                        this['_handle_' + prop] = setTimeout(fn, <number>debounce);
                    } else if (debounce === true) {
                        cancelAnimationFrame(this['_handle_' + prop]);
                        this['_handle_' + prop] = requestAnimationFrame(fn);
                    } else
                        fn();
                }
            };

            function decorateArray(instance?: any) {
                var _this = this;
                instance = instance || _this[prop];
                if (/* already decorated? */ GET_VAL(instance, 'pacem:array:decorated') === true) return;
                SET_VAL(instance, 'pacem:array:decorated', true);
                const proto = Array.prototype;
                var methods = {
                    splice: proto.splice,
                    pop: proto.pop,
                    copyWithin: proto.copyWithin,
                    push: proto.push,
                    shift: proto.shift,
                    unshift: proto.unshift
                };
                for (var name in methods) {
                    let fn = name; // < closure
                    instance[fn] = function (...args) {
                        const retval = methods[fn].apply(this, args);
                        // TODO?: specifically notify which items have changed.
                        // .length property risks to not be affected, fire it as well.
                        SET_VAL(this, ver, new Date().valueOf());

                        onChange.call(_this, prop, this, this);
                        return retval;
                    };
                }
            }

            function setterCore(oldVal: any, newVal: any) {
                var _this = this,
                    isArray = Utils.isArray(newVal);
                // different?
                var diffrent = !comparer(oldVal, newVal);
                if (diffrent || (isArray && GET_VAL(newVal, ver) != _this[propver])) {
                    SET_VAL(_this, propref, newVal);
                    if (isArray) {
                        SET_VAL(_this, propver, GET_VAL(newVal, ver));
                        decorateArray.call(_this, newVal);
                    }
                    onChange.call(_this, prop, oldVal, newVal);
                }
            }

            // setter
            if (setter) {
                descriptor.set = function (v) {
                    const _this = this,
                        oldVal = _this[prop];
                    setter.call(_this, v);
                    var newVal = _this[prop];
                    //
                    setterCore.call(_this, oldVal, newVal);
                };
            } else {
                //#region this is needed when creating property at runtime.
                try {
                    // TODO: find better way!
                    if (target.ownerDocument)
                        target[propref] = target[prop];
                } catch (e) { /*Illegal invocation*/ }
                //#endregion
                if (delete target[prop]) {

                    Object.defineProperty(target, prop, {
                        get: function () {
                            return getter.call(this);
                        },
                        set: function (newVal) {
                            const _this = this;
                            const oldVal = GET_VAL(_this, propref);
                            //
                            setterCore.call(_this, oldVal, newVal);
                        },
                        enumerable: true,
                        configurable: true
                    });
                }
            }
        }
    }

    export function ViewChild(selector: string) {
        return (target: any, prop: string, descriptor?: PropertyDescriptor) => {

            const key = `${prop}_${Utils.uniqueCode()}`;

            function findElement() {
                var _this = <HTMLElement>this,
                    nodelist = (_this.shadowRoot || _this).querySelectorAll(selector);
                for (let i = 0; i < nodelist.length; i++) {
                    let item = nodelist.item(i);
                    if (GET_VAL(item, INSTANCE_HOST_VAR) === _this) {
                        return item;
                    }
                }
                return null;
            }

            function getter() {
                var _this = <HTMLElement>this;
                // reset INSTANCE_CHILDREN_VAR on connectedCallback!
                var dict = GET_VAL(_this, INSTANCE_CHILDREN_VAR, {});
                return dict[key] = dict[key] || findElement.call(_this);
            };

            if (delete target[prop]) {

                Object.defineProperty(target, prop, {
                    get: function () {
                        return getter.call(this);
                    },
                    enumerable: true,
                    configurable: true
                });
            }
        }
    }

    // #endregion

    // #region CONCURRENT/DEBOUNCE EXECUTION

    export function Concurrent() {

        function isPromiseLike(obj: any): boolean {
            return obj && typeof obj.then === 'function';
        }

        return function (target: any /* type, actually */, key: string, descriptor?: PropertyDescriptor) {
            const originalMethod = <Function>descriptor.value;
            const bufferKey = `pacem:concurrent-buffer:${key}`,
                lockKey = `pacem:concurrent-running:${key}`;
            descriptor.value = function (...args: any[]) {
                var _this = this;
                var buffer: any[] = CustomElementUtils.getAttachedPropertyValue(_this, bufferKey, []);
                var locked: boolean = CustomElementUtils.getAttachedPropertyValue(_this, lockKey, false);
                if (locked) {
                    // previous process still going: 
                    // save args for later use,
                    let deferred = DeferPromise.defer<any>();
                    //let logFn = console && console.debug;
                    //if (typeof logFn === 'function')
                    //    logFn(`Method ${key} is busy. Procrastinating args '${JSON.stringify(args)}'...`);
                    args.push(deferred);
                    buffer.push(args);
                    // and exit.
                    return deferred.promise;
                }
                var result = originalMethod.apply(_this, args);
                if (isPromiseLike(result)) {
                    let deferred = args && args.length > 0 && args[args.length - 1];
                    if (deferred && deferred.promise instanceof DeferPromise)
                        args.pop();
                    else
                        deferred = DeferPromise.defer<any>();
                    // hi-jack only if promise-like...
                    CustomElementUtils.setAttachedPropertyValue(_this, lockKey, true);
                    (<PromiseLike<any>>result).then(r => {
                        deferred.resolve(r);
                        CustomElementUtils.setAttachedPropertyValue(_this, lockKey, false);
                        // warning: here's a possibly sneaky point (TODO: strengthen the lock)
                        if (buffer.length > 0)
                            originalMethod.apply(_this, buffer.shift());
                    }, err => {
                        CustomElementUtils.setAttachedPropertyValue(_this, lockKey, false);
                        deferred.reject(err);
                    });
                    return deferred.promise;
                }
                // ...otherwise return the - hopefully - safe single-threaded result.
                else return result;
            }
        }
    }

    export function Debounce(msecs: boolean | number = 50) {

        return function (target: any /* type, actually */, key: string, descriptor?: PropertyDescriptor) {
            const originalMethod = <Function>descriptor.value;
            const handleKey = `pacem:debouncer:${key}`;
            if (msecs === true) {
                descriptor.value = function (...args: any[]) {

                    var _this = this;
                    cancelAnimationFrame(GET_VAL(_this, handleKey));
                    SET_VAL(_this, handleKey, requestAnimationFrame(() => {
                        originalMethod.apply(_this, args);
                    }));
                }
            } else if (msecs > 0) {
                descriptor.value = function (...args: any[]) {

                    var _this = this;
                    clearTimeout(GET_VAL(_this, handleKey, 0));
                    SET_VAL(_this, handleKey, setTimeout(() => {
                        originalMethod.apply(_this, args);
                    }, <number>msecs));
                }
            }
        }

    }

    export function Throttle(msecs: boolean | number = 50) {

        return function (target: any /* type, actually */, key: string, descriptor?: PropertyDescriptor) {
            const originalMethod = <Function>descriptor.value;
            const handleKey = `pacem:throttler:${key}`;
            descriptor.value = function (...args: any[]) {

                const _this = this,
                    reset = () => { DEL_VAL(_this, handleKey); };

                if (!Utils.isNull(GET_VAL(_this, handleKey))) {
                    return;
                }
                SET_VAL(_this, handleKey, 1);
                originalMethod.apply(_this, args);
                if (msecs === true) {
                    requestAnimationFrame(reset);
                } else if (msecs > 0) {
                    setTimeout(reset, <number>msecs);
                }
            }
        }

    }

    // #endregion

    // #region TRANSFORMS

    class Transforms {

        static register(name: string, fn: TransformFunction) {
            const _set = Utils.core;
            if (!Utils.isNull(_set[name])) {
                console.warn(`A transform named ${name} already exists.`);
            } else {
                _set[name] = fn;
            }
        }

    }

    export function Transformer(name?: string) {

        return function (target: any, key: string, descriptor?: PropertyDescriptor) {
            var method = <TransformFunction>descriptor.value;
            Transforms.register(name || method.name, method);
        }

    }

    // #endregion
}