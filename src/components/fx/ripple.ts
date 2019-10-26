/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Fx {

    const RIPPLE_CSS = "ripple";

    @CustomElement({
        tagName: P + '-fx-ripple', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${RIPPLE_CSS}"></div>`
    })
    export class PacemFxRippleElement extends PacemFxElement {

        @ViewChild('.' + RIPPLE_CSS) private _wave: HTMLElement;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);

            // target switch?
            if (name === 'target') {
                if (!Utils.isNull(old)) {
                    this._reset(old);
                }
                if (!Utils.isNull(val)) {
                    this._set(val);
                }
            }

        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (!Utils.isNull(this.target))
                this._set();
        }

        disconnectedCallback() {
            if (!Utils.isNull(this.target))
                this._reset();
            super.disconnectedCallback();
        }

        private _lock = false;
        private _remove = false;

        private _rippleHandler = (e: MouseEvent | TouchEvent) => {

            if (this.disabled || (this.target instanceof PacemEventTarget && this.target.disabled)) {
                return;
            }

            if (e instanceof MouseEvent && e.button !== 0) {
                // only the 'main' (left) button click goes.
                return;
            }

            const rect = Utils.offset(this.target);
            const style = getComputedStyle(this.target);
            const css = this.style;
            css.top = rect.top + 'px';
            css.left = rect.left + 'px';
            css.width = rect.width + 'px';
            css.height = rect.height + 'px';
            css.borderRadius = style.borderRadius;

            const pointSrc = e.type === 'touchstart' ? (<TouchEvent>e).touches[0] : (<MouseEvent>e);
            const point = { x: pointSrc.pageX, y: pointSrc.pageY };
            const topLeft = { x: rect.left, y: rect.top },
                topRight = { x: rect.left + rect.width, y: rect.top },
                bottomLeft = { x: rect.left, y: rect.top + rect.height },
                bottomRight = { x: topRight.x, y: bottomLeft.y };
            const radius = Math.max(
                Geom.distance(point, topLeft),
                Geom.distance(point, topRight),
                Geom.distance(point, bottomRight),
                Geom.distance(point, bottomLeft)
            );

            const wave = this._wave;
            wave.style.left = (point.x - rect.left - radius) + 'px';
            wave.style.top = (point.y - rect.top - radius) + 'px';
            wave.style.width = wave.style.height = (2 * radius) + 'px';

            Utils.addAnimationEndCallback(wave, () => {
                this._lock = false;
                this._tryRemove();
            });
            this._lock = true;
            Utils.addClass(wave, 'ripple-go');
        };
        
        private _unrippleHandler = (e: MouseEvent | TouchEvent) => {
            this._remove = true;
            this._tryRemove();
        };

        private _tryRemove() {
            if (!this._lock && this._remove) {
                this._remove = false;
                Utils.removeClass(this._wave, 'ripple-go');
            }
        }

        private _set(val: Element = this.target) {
            val.addEventListener('mousedown', this._rippleHandler, false);
            val.addEventListener('touchstart', this._rippleHandler, false);
            val.addEventListener('touchend', this._unrippleHandler, false);
            val.addEventListener('mouseup', this._unrippleHandler, false);
            val.addEventListener('mousemove', this._unrippleHandler, false);
        }

        private _reset(old: Element = this.target) {
            old.removeEventListener('mousedown', this._rippleHandler, false);
            old.removeEventListener('touchstart', this._rippleHandler, false);
            old.removeEventListener('touchend', this._unrippleHandler, false);
            old.removeEventListener('mouseup', this._unrippleHandler, false);
            old.removeEventListener('mousemove', this._unrippleHandler, false);
        }
    }

}