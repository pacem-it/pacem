/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-marquee', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${PCSS}-marquee"><${P}-content></${P}-content></div><div class="${PCSS}-marquee-overlap"></div>
<${P}-resize target="{{ :host._overlap }}" on-${ResizeEventName}=":host._overlapResize($event)"></${P}-resize>
<${P}-resize target="{{ :host._marquee }}" on-${ResizeEventName}=":host._contentResize($event)"></${P}-resize>`
    })
    export class PacemMarqueeElement extends PacemElement {

        // TODO: reuse css animation injection
        connectedCallback() {
            super.connectedCallback();
            const css = this._css = document.createElement('style');
            document.head.appendChild(css);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'speed') {
                this._adjust();
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._adjust();
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._css))
                this._css.remove();
            super.disconnectedCallback();
        }

        private _overlapResize(evt: ResizeEvent) {
            this._state.overlap = evt.detail.width;
            this._adjust();
        }

        private _contentResize(evt: ResizeEvent) {
            this._state.content = evt.detail.width;
            this._adjust();
        }

        private _css: HTMLStyleElement;
        private _state = { overlap: 0, content: 0 };

        @ViewChild(`.${PCSS}-marquee`) private _marquee: HTMLDivElement;
        @ViewChild(`.${PCSS}-marquee-overlap`) private _overlap: HTMLDivElement;
        @ViewChild(P + "-resize") private _resizer: PacemResizeElement;
        /** seconds per 1920px */
        @Watch({ converter: PropertyConverters.Number }) speed: number;

        private _adjust() {

            const state = this._state;
            if (state.content > 0 && state.overlap > 0) {

                const m = this._marquee;
                const id = 'marquee-' + Utils.uniqueCode(), // rename the animation every time (Edge bug)
                    from = Math.round(state.overlap),
                    to = -Math.round(state.content);
                this._css.innerHTML = `@keyframes ${id} {
    0% {
        transform: translateX(${from}px);
    }

    100% {
        transform: translateX(${to}px);
    }
}`;
                const speed = this.speed || 20;
                const time = Math.max(speed, Math.round(speed * Math.abs(from - to) / 1920));
                m.style.animationName = id;
                m.style.animationDuration = time + 's';
                m.style.animationIterationCount = 'infinite';
                m.style.animationTimingFunction = 'linear';
            }
        }

    }

}