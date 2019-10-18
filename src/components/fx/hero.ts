/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Fx {

    const HERO_CSS = PCSS + "-hero";
    const TRANSITION = 200;
    const HEROING_IN = "entering";
    const HEROING_OUT = "exiting";
    const HERO_IN = "entered";
    const HERO_OUT = "exited";

    const rectOrElementConverter: PropertyConverter = {
        convert: attr => {
            if (attr.trim().startsWith('#'))
                return PropertyConverters.Element.convert(attr);
            return PropertyConverters.Json.convert(attr);
        }
    };

    @CustomElement({ tagName: P + '-fx-hero' })
    export class PacemFxHeroElement extends PacemFxElement {

        @Watch({ converter: Pacem.PropertyConverters.Boolean }) hero: boolean
        @Watch({ converter: rectOrElementConverter, emit: false }) to: Rect | Element;
        @Watch({ converter: rectOrElementConverter, emit: false }) from: Rect | Element;
        @Watch({ converter: Pacem.PropertyConverters.Number, emit: false }) duration: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);

            // target switch?
            if (name === 'target' && !Utils.isNull(old)) {
                this._resetTarget(old);
            }

            // recompute back path (originalState)?
            if (name === 'from' && this.hero && !Utils.isNull(val)) {
                this._originalState = this._computeFromState();
            }

            // trigger
            if (name === 'hero' || name === 'target' || name === 'goal') {
                if (!Utils.isNull(this.target)) {
                    if (this.hero) {
                        this.start();
                    } else {
                        this.reset();
                    }
                }
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (this.hero && !Utils.isNull(this.target))
                this.start();
        }

        disconnectedCallback() {
            if (!Utils.isNull(this.target))
                this.reset();
            super.disconnectedCallback();
        }

        private _originalState: Rect;
        private _targetState: Rect;
        private _originalStyle: { [name: string]: string };

        private _computeFromState(): Rect {
            const tget = this.target,
                offset = Utils.offset(tget);
            if (this.from instanceof Element) {
                let from = Utils.offset(this.from);
                return { x: from.left, y: from.top, width: from.width, height: from.height };
            } else {
                return { x: offset.left, y: offset.top, width: offset.width, height: offset.height };
            }
        }

        private _resetTarget(tget = this.target) {
            // reset inline style options
            const style = tget.style;
            // reset position/size
            style.top = style.left = style.height = style.width = '';
            for (let j = 0; j < style.length; j++) {
                let prop = style.item(j);
                style[prop] = '';
            }
            for (let prop in this._originalStyle) {
                style[prop] = this._originalStyle[prop];
            }
            Utils.removeClass(tget, HERO_CSS);
        }

        reset(callback?: () => void) {
            // 
            if (Utils.isNull(this._originalState) || Utils.isNull(this._targetState)) {
                return;
            }
            this.dispatchEvent(new Event(HEROING_OUT));
            this._animate(this._targetState, this._originalState, () => {
                this._resetTarget();
                this.dispatchEvent(new Event(HERO_OUT));
            });
        }

        start(callback?: () => void) {

            if (!this.disabled && !Utils.isNull(this.target)) {
                let goal: Pacem.Rect;
                if (this.to instanceof Element) {
                    let to = Utils.offset(this.to);
                    goal = { x: to.left, y: to.top, width: to.width, height: to.height };
                } else {
                    goal = this.to;
                }

                const tget = this.target,
                    wSize = Utils.windowSize,
                    state = goal || { x: 0, y: 0, width: wSize.width, height: wSize.height },
                    style = tget.style;

                this._targetState = state;
                let start = this._originalState = this._computeFromState();
                // save inline style options
                this._originalStyle = {};
                for (let j = 0; j < style.length; j++) {
                    let prop = style.item(j);
                    this._originalStyle[prop] = style[prop];
                }
                // 
                Utils.addClass(tget, HERO_CSS);
                this.dispatchEvent(new Event(HEROING_IN));
                this._animate(start, state, () => {
                    this.dispatchEvent(new Event(HERO_IN));
                });
            }
        }

        private _animate(from: Rect, to: Rect, callback: () => void) {
            const tget = this.target,
                style = tget.style;

            // transformations to make target state look like original state
            // i.e. `target state` gets constrained to fit `original state`.
            const scaleX = from.width / to.width,
                scaleY = from.height / to.height,
                translateX = (from.x - to.x) + 'px',
                translateY = (from.y - to.y) + 'px';

            style.transformOrigin = '0 0';
            style.transition = 'none';
            // set final state
            style.transform = `translate(${translateX}, ${translateY}) scale(${scaleX}, ${scaleY})`;
            style.width = to.width + 'px';
            style.height = to.height + 'px';
            style.top = to.y + 'px';
            style.left = to.x + 'px';
            // hero-animate
            requestAnimationFrame(() => {
                let duration = this.duration || TRANSITION;
                style.transition = `transform cubic-bezier(0.445, 0.05, 0.55, 0.95) ${duration}ms, opacity ${duration}ms`;
                style.transform = `translate(0, 0) scale(1)`;
            });

            Utils.addAnimationEndCallback(tget, callback, TRANSITION + 10);
        }

    }

}