/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.UI {

    export enum BalloonBehavior {
        Menu = 'menu',
        Tooltip = 'tooltip',
        Inert = 'inert'
    }

    export enum BalloonTrigger {
        Hover = 'hover',
        Click = 'click',
        ContextMenu = 'contextmenu',
        Focus = 'focus'
    }

    export enum BalloonAlignment {
        Start = 'start',
        Center = 'center',
        End = 'end',
        Auto = 'auto'
    }

    export enum BalloonPosition {
        Top = 'top',
        Left = 'left',
        Bottom = 'bottom',
        Right = 'right',
        Auto = 'auto',
        HorizontalAuto = 'x',
        VerticalAuto = 'y'
    }

    export enum BalloonSizing {
        Auto = 'auto',
        Match = 'match'
    }

    export const BalloonPopupEventName = 'popup';
    export const BalloonPopoutEventName = 'popout';

    const balloonConsts = {
        defaults: {
            'trigger': BalloonTrigger.Hover,
            'position': BalloonPosition.Auto,
            'size': BalloonSizing.Auto,
            'behavior': BalloonBehavior.Menu,
            'verticalOffset': 0,
            'horizontalOffset': 0,
            'hoverDelay': 250,
            'hoverTimeout': 500,
            'align': BalloonAlignment.Center
        }
    };

    export declare type BalloonOptions = {
        'trigger'?: BalloonTrigger,
        'position'?: BalloonPosition,
        'size'?: BalloonSizing,
        'behavior'?: BalloonBehavior,
        'verticalOffset'?: number,
        'horizontalOffset'?: number,
        /** Obsolete: use 'track' instead. */
        'trackPosition'?: boolean,
        'track'?: boolean,
        'moveToRoot'?: boolean, // append/move to body (positioning goes south when the balloon is placed inside e.g. `fixed` elements)
        'hoverDelay'?: number,
        'hoverTimeout'?: number,
        'align'?: BalloonAlignment
    };

    const allStyles = PCSS + '-balloon balloon-right balloon-left balloon-bottom balloon-top balloon-start balloon-center balloon-end balloon-out balloon-in balloon-on';

    @CustomElement({
        tagName: P + '-balloon',
        shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-resize target="{{ :host.target }}" watch-position="true" on-${ResizeEventName}=":host._onLayoutChange($event)"></${P}-resize>
<div class="${PCSS}-balloon"><${P}-resize on-${ResizeEventName}=":host._onLayoutChange($event)" content><${P}-content></${P}-content></${P}-resize></div>
<div class="corner top-left"></div><div class="corner bottom-left"></div><div class="corner top-right"></div><div class="corner bottom-right"></div>`
    })
    export class PacemBalloonElement extends PacemElement {

        constructor() {
            super();
        }

        private _timer: number;
        private _visible: boolean;
        private _options = balloonConsts.defaults;
        private _originalNeighborhood: { parent: Element, nextSibling?: Element } = null;

        @ViewChild(`.${PCSS}-balloon`) private container: HTMLElement;
        @ViewChild(P + '-resize[content]') private _resize: PacemResizeElement;
        @ViewChild(P + '-resize[watch-position=true]') private _position: PacemResizeElement;

        @Watch({ converter: ElementOrPointPropertyConverter }) target: ElementOrPoint;
        @Watch({ emit: false, converter: PropertyConverters.Json }) options: BalloonOptions;

        /** Gets whether the balloon is open and visible. */
        get visible() {
            return this._visible;
        }

        // #region LIFECYCLE

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'target') {
                if (old instanceof Element) {
                    this._removeHandlers(old);
                }
                if (!(val instanceof Element)) {
                    this._adjust();
                }
            } else if (name === 'options') {
                if (this.target instanceof Element) {
                    this._removeHandlers(this.target);
                }
                this._options = Utils.extend({}, Utils.clone(balloonConsts.defaults), val);
                this._synchronizeOptions();
            } else if (name === 'disabled') {
                //this.container.style.visibility = val ? 'hidden' : 'visible';
            }

            if (this.target instanceof Element && name !== 'disabled') {
                this._setHandlers(this.target);
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._ensurePopup();
            this.target = this.target || this.parentElement;
            this._synchronizeOptions();
        }

        disconnectedCallback() {
            super.disconnectedCallback();
            this._destroyPopup();
            if (this.target instanceof Element) {
                this._removeHandlers(this.target);
            }
        }

        // #endregion

        //#region METHODS

        private _synchronizeOptions() {
            const popup = this,
                options = popup.options || {};
            // track position and size
            if (!Utils.isNull(this._resize)) {
                this._resize.disabled =
                    this._position.disabled = !options.track && !options.trackPosition;
            }
            // moveToRoot
            if (!!options.moveToRoot && Utils.isNull(this._originalNeighborhood)) {
                this._originalNeighborhood = { parent: popup.parentElement, nextSibling: popup.nextElementSibling };
                document.body.appendChild(popup);
            } else if (!options.moveToRoot && !Utils.isNull(this._originalNeighborhood)) {
                const parent = this._originalNeighborhood.parent;
                // has something changed inn the neighborhood?...
                if (!Utils.isNull(parent)) {
                    parent.appendChild(popup);
                }
                this._originalNeighborhood = null;
            }
        }

        private _ensurePopup(): HTMLElement {
            const popup = this,
                container = popup.container;
            //
            if (popup && container && !Utils.hasClass(popup, PCSS + '-balloon')) {
                Utils.addClass(popup, PCSS + '-balloon');
                popup.style.position = 'absolute';
                container.style.position = 'relative';
                container.style.zIndex = '1';
                popup.style.visibility = 'hidden';
            }
            return popup;
        }

        private _destroyPopup() {
            var popup = this,
                container = popup.container;
            Utils.removeClass(popup, allStyles);
            popup.style.position = '';
            if (!Utils.isNull(container)) {
                container.style.position = '';
                container.style.zIndex = '';
            }
        }

        private _registerEvents() {
            const popup = this._ensurePopup(),
                options = this._options;
            switch (options.behavior) {
                case BalloonBehavior.Menu:
                    switch (options.trigger) {
                        case BalloonTrigger.Focus:
                            popup.addEventListener('mousedown', Pacem.stopPropagationHandler, false);
                            popup.addEventListener('focus', this._hoverDelegate, false);
                            // do nothing else: only the blur event will pop the balloon out
                            break;
                        case BalloonTrigger.Click:
                        case BalloonTrigger.ContextMenu:
                            popup.addEventListener('mousedown', Pacem.stopPropagationHandler, false);
                            window.document.body.addEventListener('mousedown', this._outConditionalDelegate, false);
                            break;
                        default:
                            popup.addEventListener('mouseenter', this._hoverDelegate, false);
                            popup.addEventListener('mouseleave', this._outDelegate, false);
                            break;
                    }
                    break;
                case BalloonBehavior.Tooltip:
                    switch (options.trigger) {
                        case BalloonTrigger.Focus:
                        case BalloonTrigger.Click:
                        case BalloonTrigger.ContextMenu:
                            window.document.body.addEventListener('mousedown', this._outConditionalDelegate, false);
                            break;
                        default:
                            break;
                    }
                    break;
            }
        }

        private _unregisterEvents() {
            var popup = this._ensurePopup();
            var opts = this._options;
            switch (opts.behavior) {
                case BalloonBehavior.Menu:
                    switch (opts.trigger) {
                        case BalloonTrigger.Focus:
                            popup.removeEventListener('mousedown', Pacem.stopPropagationHandler, false);
                            popup.removeEventListener('focus', this._hoverDelegate, false);
                            // do nothing else: only the blur event will pop the balloon out
                            break;
                        case BalloonTrigger.Click:
                        case BalloonTrigger.ContextMenu:
                            popup.removeEventListener('mousedown', Pacem.stopPropagationHandler, false);
                            window.document.body.removeEventListener('mousedown', this._outConditionalDelegate, false);
                            break;
                        default:
                            popup.removeEventListener('mouseenter', this._hoverDelegate, false);
                            popup.removeEventListener('mouseleave', this._outDelegate, false);
                            break;
                    }
                    break;
                case BalloonBehavior.Tooltip:
                    switch (opts.trigger) {
                        case BalloonTrigger.Click:
                        case BalloonTrigger.ContextMenu:
                            window.document.body.removeEventListener('mousedown', this._outConditionalDelegate, false);
                            break;
                    }
                    break;
            }
        }

        private _popupDelegate = (_: Event) => {
            this.popup();
        }

        private _onLayoutChange(evt: ResizeEvent) {
            if (this._visible) {
                this._adjust();
            }
        }

        private _adjust() {
            var popup = this,
                el = popup.target,
                coords = el instanceof Element ? Utils.offset(el) : { top: el.y, left: el.x, width: 0, height: 0 };

            const vieportSize = Utils.windowSize;

            var opts = this._options;
            var chosenPosition = opts.position,
                chosenAlignment = opts.align;
            if (chosenPosition != BalloonPosition.Top &&
                chosenPosition != BalloonPosition.Bottom && chosenPosition != BalloonPosition.Left && chosenPosition != BalloonPosition.Right) {
                let viewportHeight = vieportSize.height;
                let viewportWidth = vieportSize.width;
                const offsetLeft = coords.left - Utils.scrollLeft;
                const offsetTop = coords.top - Utils.scrollTop;
                const offsetBottom = viewportHeight - (offsetTop + coords.height);
                const offsetRight = viewportWidth - (offsetLeft + coords.width);
                switch (chosenPosition) {
                    case BalloonPosition.HorizontalAuto:
                        chosenPosition = offsetLeft > offsetRight ? BalloonPosition.Left : BalloonPosition.Right;
                        break;
                    default:
                        // (!) exclude 'left' and 'right' also when position is simply set to 'auto'
                        chosenPosition = offsetTop > offsetBottom ? BalloonPosition.Top : BalloonPosition.Bottom;
                        break;
                }
            }

            if (opts.size === BalloonSizing.Match) {
                switch (chosenPosition) {
                    case BalloonPosition.Bottom:
                    case BalloonPosition.Top:
                        popup.style.minWidth = coords.width + 'px';
                        popup.style.minHeight = '';
                        break;
                    case BalloonPosition.Left:
                    case BalloonPosition.Right:
                        popup.style.minHeight = coords.height + 'px';
                        popup.style.minWidth = '';
                        break;
                }
            } else {
                popup.style.minWidth = popup.style.minHeight = '';
            }

            const popupSize = { width: popup.offsetWidth, height: popup.offsetHeight };
            const fullOffsetWidth = coords.width - popupSize.width,
                halfOffsetWidth = fullOffsetWidth * .5,
                fullOffsetHeight = coords.height - popupSize.height,
                halfOffsetHeight = fullOffsetHeight * .5;

            switch (chosenAlignment) {
                case BalloonAlignment.Center:
                case BalloonAlignment.Start:
                case BalloonAlignment.End:
                    break;
                case BalloonAlignment.Auto:
                    chosenAlignment = BalloonAlignment.Center;
                    switch (chosenPosition) {
                        case BalloonPosition.Right:
                        case BalloonPosition.Left:
                            const halfHeight = Utils.scrollTop + vieportSize.height / 2;
                            if /* completely inside the first half of the screen */((coords.top + coords.height) < halfHeight) {
                                chosenAlignment = BalloonAlignment.Start;
                            } else if /* completely beyond the half line of the screen */ (coords.top > halfHeight) {
                                chosenAlignment = BalloonAlignment.End;
                            }
                            break;
                        case BalloonPosition.Top:
                        case BalloonPosition.Bottom:
                            const halfWidth = Utils.scrollLeft + vieportSize.width / 2;
                            if /* completely inside the first half of the screen */((coords.left + coords.width) < halfWidth) {
                                chosenAlignment = BalloonAlignment.Start;
                            } else if /* completely beyond the half line of the screen */ (coords.left > halfWidth) {
                                chosenAlignment = BalloonAlignment.End;
                            }
                            break;
                    }
                    break;
                default:
                    chosenAlignment = balloonConsts.defaults.align;
                    break;
            }

            Utils.addClass(popup, 'balloon-' + chosenPosition);
            Utils.addClass(popup, 'balloon-' + chosenAlignment);

            switch (chosenPosition) {
                case BalloonPosition.Top:
                    coords.top -= popupSize.height;
                    switch (chosenAlignment) {
                        case BalloonAlignment.Center:
                            coords.left += halfOffsetWidth;
                            break;
                        case BalloonAlignment.End:
                            coords.left += fullOffsetWidth;
                            break;
                    }
                    break;
                case BalloonPosition.Left:
                    coords.left -= popupSize.width;
                    switch (chosenAlignment) {
                        case BalloonAlignment.Center:
                            coords.top += halfOffsetHeight;
                            break;
                        case BalloonAlignment.End:
                            coords.top += fullOffsetHeight;
                            break;
                    }
                    break;
                case BalloonPosition.Right:
                    coords.left += coords.width;
                    switch (chosenAlignment) {
                        case BalloonAlignment.Center:
                            coords.top += halfOffsetHeight;
                            break;
                        case BalloonAlignment.End:
                            coords.top += fullOffsetHeight;
                            break;
                    }
                    break;
                default:
                    coords.top += coords.height;
                    switch (chosenAlignment) {
                        case BalloonAlignment.Center:
                            coords.left += halfOffsetWidth;
                            break;
                        case BalloonAlignment.End:
                            coords.left += fullOffsetWidth;
                            break;
                    }
                    break;
            }
            coords.left = Math.min(vieportSize.width - popupSize.width, Math.max(0, coords.left));
            //coords.top = Math.max(0, coords.top);

            // coords for balloon positioning
            coords.top += opts.verticalOffset;
            coords.left += opts.horizontalOffset;
            popup.style.top = Math.round(coords.top) + 'px';
            popup.style.left = Math.round(coords.left) + 'px';
            // popup.style.transform = `translateX(${Math.round(coords.left)}px) translateY(${Math.round(coords.top)}px) translateZ(0)`;
            //popup.style.visibility = 'visible';
        }

        /**
         * Shows the balloon, if hidden.
         */
        popup() {
            var popup = this;

            var isVisible = Utils.isVisible(popup);
            if (isVisible) return;
            // attach closured behavior to popup
            //if (!sameTrigger) {
            this._registerEvents(); // $popup.on('mouseenter', obj.methods.hover).on('mouseleave', obj.methods.out).data(vars.TRIGGER, obj);
            //}
            //
            popup.style.pointerEvents = 'none';
            this._visible = true;
            popup.style.visibility = 'visible';
            this._adjust();
            //requestAnimationFrame(() => {
            Utils.addClass(popup, 'balloon-in');
            Utils.addAnimationEndCallback(popup, () => {
                Utils.addClass(popup, 'balloon-on');
                popup.dispatchEvent(new PropertyChangeEvent({ propertyName: 'visible', oldValue: false, currentValue: true }));
                popup.dispatchEvent(new Event(BalloonPopupEventName));
                popup.style.pointerEvents = 'auto';
            }, 500);
            //});
        }

        private _popoutDelegate = (_: Event) => {
            this.popout();
        }

        /**
         * Hides the balloon, if visible.
         */
        popout() {
            var popup = this;
            if (!Utils.isVisible(popup)) return;
            // detach closured behavior from popup
            this._unregisterEvents();
            //
            popup.style.pointerEvents = 'none';
            Utils.removeClass(popup, 'balloon-in balloon-on');
            Utils.addClass(popup, 'balloon-out');
            Utils.addAnimationEndCallback(popup, () => {
                popup.style.visibility = 'hidden';
                this._visible = false;
                Utils.removeClass(popup, allStyles);
                popup.dispatchEvent(new Event(BalloonPopoutEventName));
                popup.dispatchEvent(new PropertyChangeEvent({ propertyName: 'visible', oldValue: true, currentValue: false }));
            }, 500);
        }

        /**
         * Shows the balloon, if hidden. Otherwise hides it.
         */
        toggle() {
            if (!Utils.isVisible(this)) { this.popup(); }
            else { this.popout(); }
        }

        private _hoverDelegate = (evt: Event) => {
            //console.log(`${evt.type}: ${evt.target} (enabled: ${(!this.disabled)})`);
            window.clearTimeout(this._timer);
            if (!this.disabled)
                this._timer = window.setTimeout(this._popupDelegate, this._options.hoverDelay);
        }

        private _outConditionalDelegate = (evt: Event) => {
            if ((evt.srcElement || evt.target) != this)
                this._outDelegate(evt);
        }

        private _mousedownConditionalDelegate = (evt: MouseEvent) => {
            Pacem.preventDefaultHandler(evt);
            if (this._visible)
                Pacem.stopPropagationHandler(evt);
        }

        private _outDelegate = (evt: Event) => {
            window.clearTimeout(this._timer);
            this._timer = window.setTimeout(() => this.popout(), this._options.hoverTimeout);
        }

        private _toggleDelegate = (evt) => {
            evt.preventDefault();
            if (this._visible) this._outDelegate(evt);
            else this._hoverDelegate(evt);
        }

        private _removeHandlers(el: Element) {
            if (Utils.isNull(el)) return;
            el.removeEventListener('mouseenter', this._hoverDelegate, false);
            el.removeEventListener('mouseleave', this._outDelegate, false);
            el.removeEventListener('mousedown', this._popoutDelegate, false);
            el.removeEventListener('mousedown', this._mousedownConditionalDelegate, false);
            el.removeEventListener('click', this._toggleDelegate, false);
            el.removeEventListener('focus', this._hoverDelegate, false);
            el.removeEventListener('blur', this._outDelegate, false);
            el.removeEventListener('contextmenu', this._toggleDelegate, false);
        }

        private _setHandlers(el: Element) {
            this.popout();
            // regenerate opts popup
            var opts = this._options;
            if (opts.behavior == BalloonBehavior.Inert)
                return;
            switch (opts.trigger) {
                case BalloonTrigger.Hover:
                    el.addEventListener('mouseenter', this._hoverDelegate, false);
                    el.addEventListener('mouseleave', this._outDelegate, false);
                    el.addEventListener('mousedown', this._popoutDelegate, false);
                    break;
                case BalloonTrigger.Focus:
                    el.addEventListener('focus', this._hoverDelegate, false);
                    el.addEventListener('blur', this._outDelegate, false);
                    break;
                case BalloonTrigger.Click:
                    opts.hoverDelay = opts.hoverTimeout = 0;
                    el.addEventListener('mousedown', this._mousedownConditionalDelegate, false);
                    el.addEventListener('click', this._toggleDelegate, false)/*.blur(obj.methods.out)*/;
                    break;
                case BalloonTrigger.ContextMenu:
                    opts.hoverDelay = opts.hoverTimeout = 0;
                    el.addEventListener('contextmenu', this._toggleDelegate, false);
                    break;
            }
        }

        //#endregion

    }
}