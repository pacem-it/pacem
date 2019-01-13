/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: 'pacem-marquee', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="pacem-marquee"><pacem-content></pacem-content></div><div class="pacem-marquee-overlap"></div><pacem-resize target="{{ :host._marquee }}" on-${ResizeEventName}=":host._resize($event)"></pacem-resize>`
    })
    export class PacemMarqueeElement extends PacemElement {

        constructor() {
            super();
        }

        // TODO: reuse css animation injection
        connectedCallback() {
            super.connectedCallback();
            const css = this._css = document.createElement('style');
            document.head.appendChild(css);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'speed') {
                this._adjust(this._resizer.currentSize);
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._adjust(this._resizer.currentSize);
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._css))
                this._css.remove();
            super.disconnectedCallback();
        }

        private _resize(evt: ResizeEvent) {
            this._adjust(evt.detail);
        }

        private _css: HTMLStyleElement;
        private _state: ResizeEventArgs;

        @ViewChild(".pacem-marquee") private _marquee: HTMLDivElement;
        @ViewChild("pacem-resize") private _resizer: PacemResizeElement;
        /** seconds per 1920px */
        @Watch({ converter: PropertyConverters.Number }) speed: number;

        private _adjust(args: ResizeEventArgs) {
            const m = this._marquee;
            if (!Utils.isNull(m)) {
                const id = 'marquee-' + Utils.uniqueCode(), // rename the animation every time (Edge bug)
                    from = Math.round(Utils.offset(this).width),
                    to = -Math.round(args.width);
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