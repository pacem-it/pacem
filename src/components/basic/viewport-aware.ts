/// <reference path="../../core/decorators.ts" />
namespace Pacem.Components {

    // TODO: elementify the concept of an ochestrator
    // see also scroll-aware
    class PacemViewportOrchestrator {

        constructor(private global: Window) {
        }

        viewports: PacemViewportAwareElement[] = [];

        register(vport: PacemViewportAwareElement) {
            const vports = this.viewports;
            if (vports.indexOf(vport) === -1) {
                vports.push(vport);
                if (vports.length === 1) {
                    // TODO: check against overflow: 'auto' | 'scroll' elements with constrained heights/widths...
                    this.global.addEventListener('resize', this.checkHandler, false);
                    this.global.addEventListener('scroll', this.checkHandler, false);
                    this.global.addEventListener('transitionend', this.checkHandler, false);
                    this.global.addEventListener('animationend', this.checkHandler, false);
                }
                this.oncheck();
            }
        }

        unregister(vport: PacemViewportAwareElement) {
            var ndx: number;
            const vports = this.viewports;
            if ((ndx = vports.indexOf(vport)) !== -1) {
                vports.splice(ndx, 1);
                if (vports.length === 0) {
                    this.global.removeEventListener('resize', this.checkHandler, false);
                    this.global.removeEventListener('scroll', this.checkHandler, false);
                    this.global.removeEventListener('transitionend', this.checkHandler, false);
                    this.global.removeEventListener('animationend', this.checkHandler, false);
                }
                this.oncheck();
            }
        }

        private isElementVisible(el: Element, ignoreHorizontal: boolean) {
            const vportSize = Utils.windowSize;
            var doc = window.document, rect = el.getBoundingClientRect(),
                vWidth = vportSize.width,
                vHeight = vportSize.height,
                efp = function (x, y) { return document.elementFromPoint(x, y) };

            return rect.bottom > 0 && rect.top < (0 + vHeight)
                && (ignoreHorizontal || (rect.left < (vWidth + 0) && rect.right > 0));
        }

        private checkHandler = (evt: Event) => {
            this.oncheck(evt);
        }

        @Debounce(100)
        private oncheck(evt?: Event) {
            for (var el of this.viewports) {
                const tget = el.target || el;
                const newviz = this.isElementVisible(tget, el.ignoreHorizontal);
                if (newviz !== el.visible) {
                    var visible = el.visible = newviz;
                    if (visible) Utils.addClass(tget, 'pacem-in-viewport');
                    else Utils.removeClass(tget, 'pacem-in-viewport');
                }
            }
        }
    }

    const ORCHESTRATOR = new PacemViewportOrchestrator(window);

    @CustomElement({ tagName: 'pacem-viewport-aware' })
    export class PacemViewportAwareElement extends PacemEventTarget implements OnViewActivated, OnDisconnected {

        constructor() {
            super();
        }

        @Watch({ converter: PropertyConverters.Boolean }) visible: boolean

        @Watch({ converter: PropertyConverters.Element }) target: HTMLElement | SVGElement;

        @Watch({ emit: false, converter: PropertyConverters.Boolean }) ignoreHorizontal: boolean;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            //
            ORCHESTRATOR.register(this);
        }

        disconnectedCallback() {
            ORCHESTRATOR.unregister(this);
            //
            super.disconnectedCallback();
        }

    }

}