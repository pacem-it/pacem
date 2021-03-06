﻿/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-menu', template: `<${ P }-panel class="${PCSS}-hamburger-menu" css-class="{{ {'menu-close': !:host.open, 'menu-open': :host.open} }}" on-click=":host._toggle($event)">    
    <nav><${ P }-content></${ P }-content></nav>
</${ P }-panel>
<${P}-shell-proxy>
<${ P}-button class="${PCSS}-back ${PCSS}-menu flat" css-class="{{ {'menu-close': !:host.open, 'menu-open': :host.open} }}" on-click=":host._toggle($event)">BACK</${ P }-button>
<${ P}-button class="${PCSS}-hamburger ${PCSS}-menu flat" css-class="{{ {'menu-close': :host.open, 'menu-open': !:host.open} }}" on-click=":host._toggle($event)">MENU</${P}-button></${P}-shell-proxy>`,
        shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemMenuElement extends PacemElement {

        @Watch({ converter: PropertyConverters.Boolean }) open: boolean;
        @ViewChild('nav') private _container: HTMLElement;
        @ViewChild(`.${PCSS}-hamburger-menu`) private _base: HTMLElement;

        private _stopPropagationHandlerConditional = (evt: RouterNavigateEvent) => {
            if (!Utils.isNull(this._container) && !Utils.isNull(this._base)) {
                const offsetNav = Utils.offset(this._container);
                const offsetBase = Utils.offset(this._base);
                // TODO: consider height as well for different skins, but DO manage edge cases...
                if (offsetNav.width < offsetBase.width) {
                    this.open = false;
                }
            }
        };

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._container.addEventListener('click', Pacem.stopPropagationHandler, false);
            this._container.addEventListener("scroll", Pacem.stopPropagationHandler, false);
            this._sync();
        }

        disconnectedCallback() {
            window.removeEventListener('navigate', this._stopPropagationHandlerConditional, false);
            if (!Utils.isNull(this._container)) {
                this._container.removeEventListener('click', Pacem.stopPropagationHandler, false);
                this._container.removeEventListener("scroll", Pacem.stopPropagationHandler, false);
            }
            super.disconnectedCallback();
        }

        connectedCallback() {
            super.connectedCallback();
            window.addEventListener('navigate', this._stopPropagationHandlerConditional, false);
            this._shell = CustomElementUtils.findAncestorShell(this);
        }

        private _toggle(evt: Event) {
            avoidHandler(evt);
            this.open = !this.open;
            this.dispatchEvent(new Event('toggle'));
        }

        private _shell: HTMLElement;

        private _sync(val = this.open) {
            Utils.addClass(this._shell, PCSS + (val === true ? '-menu-open' : '-menu-close'));
            Utils.removeClass(this._shell, PCSS +(val === true ? '-menu-close' : '-menu-open'));
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'open') {
                this._sync(val);
            }
        }
    }

    @CustomElement({
        tagName: P + '-menu-cursor'
    })
    export class PacemMenuCursorElement extends PacemElement {

        private _menu: PacemMenuElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._menu = CustomElementUtils.findAncestorOfType(this, PacemMenuElement);
            this._onPathChange();
        }

        connectedCallback() {
            super.connectedCallback();
            window.addEventListener('navigate', this._onPathChange, false);
        }

        disconnectedCallback() {
            this._menu = null;
            window.removeEventListener('navigate', this._onPathChange, false);
            super.disconnectedCallback();
        }
        
        private _onPathChange = (evt?: CustomTypedEvent<string>) => {
            const menu = this._menu,
                path = (evt && evt.detail) || window.location.pathname;
            if (Utils.isNull(menu)) {
                this.log(Logging.LogLevel.Warn, `Couldn't find a ${PacemMenuElement} ancestor for this ${PacemMenuCursorElement}.`);
                return;
            }
            // 1. try to find a matching PacemAnchorElement
            var anchors = menu.querySelectorAll(P + '-a');
            var tget: HTMLElement = null;
            for (let j = 0; j < anchors.length; j++) {
                let a = <PacemAnchorElement>anchors.item(j);
                if (a.href === path) {
                    tget = a;
                    break;
                }
            }
            if (Utils.isNull(tget)) {
                // 2. try with real HTMLAnchorElement
                tget = menu.querySelector(`a[href='${path}']`);
            }
            if (!Utils.isNull(tget)) {
                // TODO: use transforms (remove width/height/top/... animations)
                // TODO: consider <nav> scrollTop
                const rect = Utils.offset(tget);
                const rectMenu = Utils.offset(menu);
                this.style.top = rect.top + 'px';
                this.style.left = rectMenu.left + 'px';
                this.style.width = '0';
                this.style.height = rect.height + 'px';
                Utils.addAnimationEndCallback(this, () => {
                    this.style.width = (rect.width + rect.left - rectMenu.left) + 'px';
                }, 500);
            }
        }

    }

}