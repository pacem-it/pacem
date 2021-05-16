/// <reference path="../../core/types.ts" />
/// <reference path="../../core/eventtarget.ts" />
/// <reference path="../../core/adapter.ts" />
/// <reference path="../behaviors/behavior.ts" />
namespace Pacem.Components {

    export declare type RepeaterItemEventArgs = {
        dom: Node[], item: any, index: number
    };

    export const RepeaterItemCreateEventName = 'repeateritemcreate';
    export const RepeaterItemRemoveEventName = 'repeateritemremove';

    export abstract class RepeaterItemEvent extends CustomTypedEvent<RepeaterItemEventArgs> {

        constructor(name: string, args: RepeaterItemEventArgs) {
            super(name, args);
        }

    }

    export class RepeaterItemCreateEvent extends RepeaterItemEvent {

        constructor(args: RepeaterItemEventArgs) {
            super(RepeaterItemCreateEventName, args);
        }

    }

    export class RepeaterItemRemoveEvent extends RepeaterItemEvent {

        constructor(args: RepeaterItemEventArgs) {
            super(RepeaterItemRemoveEventName, args);
        }
    }

    export interface AriaAttributes {

        set(name: string, value: string): void;
        remove(name: string): void;
        toObject(): { [name: string]: string };
    }

    export interface Aria {
        role: string;
        readonly attributes: AriaAttributes;
    }

    export interface Wai {
        readonly aria: Aria;
    }

    const STD_EVENTS = ['keydown', 'keyup', 'click', 'focus', 'blur', 'dblclick', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave', 'mousedown', 'mouseup', 'mousemove', 'contextmenu'];

    class ElementAriaAttributes implements AriaAttributes {
        constructor(private _element: HTMLElement, ariaAttrs: { [name: string]: string }) {
            this._aria = Utils.extend({}, ariaAttrs || {});
        }

        private _aria: { [name: string]: string };

        toObject(): { [name: string]: string; } {
            return Utils.extend({}, this._aria);
        }

        set(name: string, value: string): void {
            this._aria[name] = value;
            const el = this._element;
            if (el.isConnected) {
                el.setAttribute('aria-' + name, value);
            }
        }

        remove(name: string): void {
            delete this._aria[name];
            const el = this._element;
            if (el.isConnected) {
                el.removeAttribute('aria-' + name);
            }
        }
    }

    class ElementAria implements Aria {

        constructor(private _element: HTMLElement, role?: string, attrs?: { [name: string]: string }) {
            this._aria = { role: role, attrs: new ElementAriaAttributes(_element, attrs) };
        }

        private _aria: { role?: string, attrs: AriaAttributes };

        get role() {
            return this._aria.role;
        }

        /** Remarks: when set to an empty string AFTER the element gets connected to the DOM, this will remove the `role` attribute. */
        set role(role: string) {
            this._aria.role = role;
            const el = this._element;
            if (el.isConnected) {
                Utils.isNullOrEmpty(role) ? el.removeAttribute('role') : el.setAttribute('role', role);
            }
        }

        get attributes() {
            return this._aria.attrs;
        }
    }

    export class PacemElement extends PacemEventTarget implements Wai, OnPropertyChanged, OnConnected, OnViewActivated, OnDisconnected {

        constructor(role?: string, aria?: { [name: string]: string }) {
            super();
            this._aria = new ElementAria(this, role, aria);
        }

        // #region ARIA

        get aria() { return this._aria; }

        private _aria: Aria;

        // #endregion

        private _cssBag: string[] = [];
        connectedCallback() {
            super.connectedCallback();
            if (!Utils.isNullOrEmpty(this._aria.role)) {
                this.setAttribute('role', this._aria.role);
            }
            let ariaAttrs = this._aria.attributes.toObject();
            if (!Utils.isNullOrEmpty(ariaAttrs)) {
                for (let name in ariaAttrs) {
                    this.setAttribute('aria-' + name, ariaAttrs[name]);
                }

            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            STD_EVENTS.forEach(e => {
                this.addEventListener(e, this.emitHandler, false);
            });
            for (var behavior of this.behaviors || []) {
                behavior.register(this);
            }
        }

        disconnectedCallback() {
            for (var behavior of this.behaviors || []) {
                behavior.unregister(this);
            }
            STD_EVENTS.forEach(e => {
                this.removeEventListener(e, this.emitHandler, false);
            });
            super.disconnectedCallback();
        }

        private _tabIndex: number = -1;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'css':
                    for (var css in this.css) {
                        this.style.setProperty(css, this.css[css]);
                    }
                    break;
                case 'cssClass':
                    if (Utils.isArray(this.cssClass)) {
                        const newBag = <string[]>this.cssClass;
                        for (let css of this._cssBag.splice(0)) {
                            Utils.removeClass(this, css);
                        }
                        for (let css of newBag) {
                            this._cssBag.push(css);
                            Utils.addClass(this, css);
                        }
                    } else
                        for (let css in this.cssClass) {
                            if (!this.cssClass[css])
                                Utils.removeClass(this, css);
                            else
                                Utils.addClass(this, css);
                        }
                    break;
                case "hide":
                    if (val) {
                        this.setAttribute('hidden', '');
                        this.aria.attributes.set('hidden', 'true');
                    } else {
                        this.removeAttribute('hidden');
                        this.aria.attributes.remove('hidden');
                    }
                    break;
                case 'tooltip':
                    this.title = val;
                    Utils.isNullOrEmpty(val) ? this.aria.attributes.remove('label') : this.aria.attributes.set('label', val);
                    break;
                case 'tabOrder':
                    this._tabIndex = val;
                    if (!this.disabled)
                        this.tabIndex = val;
                    break;
                case 'behaviors':
                    if (!Utils.isNullOrEmpty(old)) {
                        for (let behavior of <Behaviors.PacemBehavior[]>old) {
                            behavior.unregister(this);
                        }
                    }
                    if (!Utils.isNullOrEmpty(val) && !first) {
                        for (let behavior of <Behaviors.PacemBehavior[]>val) {
                            behavior.register(this);
                        }
                    }
                    break;
                case 'disabled':
                    let cssDis = PCSS + '-' + name;
                    if (!!val) {
                        this._tabIndex = this.tabIndex;
                        this.tabIndex = -1;
                        Utils.addClass(this, cssDis);
                    } else {
                        this.tabIndex = this._tabIndex;
                        Utils.removeClass(this, cssDis);
                    }
                    break;
                case 'culture':
                    if (Utils.isNullOrEmpty(val)) {
                        this.removeAttribute('lang');
                    } else {
                        this.setAttribute('lang', val);
                    }
                    if (!first) {
                        this.refreshBindings();
                    }
                    break;
            }
        }

        @Watch({ emit: false, converter: PropertyConverters.Json /* when declared plainly assume array of strings */ })
        cssClass: { [key: string]: boolean } | string[];

        @Watch({ emit: false, converter: PropertyConverters.Eval })
        css: { [key: string]: string };

        @Watch({ emit: false, converter: PropertyConverters.Boolean })
        hide: boolean;

        @Watch({ emit: false, converter: PropertyConverters.String })
        tooltip: string;

        @Watch({ emit: false, converter: PropertyConverters.Number })
        tabOrder: number;

        @Watch({ converter: PropertyConverters.String })
        culture: string;

        @Watch({ emit: false })
        behaviors: Pacem.Behaviors.PacemBehavior[] = [];

    }

    export abstract class PacemContentElement extends PacemElement {

        protected abstract cleanup(html: string): string;

        @Watch({ emit: false, converter: PropertyConverters.String })
        content: string;

        private _original: string;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'content' && !first) {
                this._fillContent(val);
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._original = this.innerHTML;
            if (!Utils.isNullOrEmpty(this.content)) {
                this._fillContent();
            }
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._original)) {
                this.innerHTML = this._original;
            }
            super.disconnectedCallback();
        }

        private _fillContent(val = this.content) {
            this.innerHTML = this.cleanup(val);
        }
    }

    export class PacemUnsafeContentElement extends PacemContentElement {

        protected cleanup(html: string): string {
            return html;
        }

    }

    export class PacemSafeContentElement extends PacemContentElement {

        protected cleanup(html: string): string {
            const scriptBlockPattern = /<script.+<\/script>/g;
            // TODO: remove onclick, onload, onkey*, ... attributes
            return (html || '').toString().replace(scriptBlockPattern, '');
        }

    }

}