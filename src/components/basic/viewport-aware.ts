/// <reference path="../../core/decorators.ts" />
namespace Pacem.Components {

    // TODO: elementify the concept of an ochestrator
    // see also scroll-aware
    class PacemViewportOrchestrator {

        constructor(private _global: Window) {
        }

        viewports: PacemViewportAwareElement[] = [];

        register(vport: PacemViewportAwareElement) {
            const vports = this.viewports, win = this._global;
            if (vports.indexOf(vport) === -1) {
                vports.push(vport);
                if (vports.length === 1) {
                    // TODO: check against overflow: 'auto' | 'scroll' elements with constrained heights/widths...
                    win.addEventListener('resize', this._checkHandler, false);
                    win.addEventListener('scroll', this._checkHandler, false);
                    win.addEventListener('transitionend', this._checkHandler, false);
                    win.addEventListener('animationend', this._checkHandler, false);
                }
                this._oncheck();
            }
        }

        unregister(vport: PacemViewportAwareElement) {
            var ndx: number;
            const vports = this.viewports, win = this._global;
            if ((ndx = vports.indexOf(vport)) !== -1) {
                vports.splice(ndx, 1);
                if (vports.length === 0) {
                    win.removeEventListener('resize', this._checkHandler, false);
                    win.removeEventListener('scroll', this._checkHandler, false);
                    win.removeEventListener('transitionend', this._checkHandler, false);
                    win.removeEventListener('animationend', this._checkHandler, false);
                }
                this._oncheck();
            }
        }

        private isElementVisible(el: Element, ignoreHorizontal: boolean) {
            const vportSize = Utils.windowSize;
            var doc = this._global.document, rect = el.getBoundingClientRect(),
                vWidth = vportSize.width,
                vHeight = vportSize.height,
                efp = function (x, y) { return document.elementFromPoint(x, y) };

            return rect.bottom > 0 && rect.top < (0 + vHeight)
                && (ignoreHorizontal || (rect.left < (vWidth + 0) && rect.right > 0));
        }

        private _checkHandler = (evt: Event) => {
            this._oncheck(evt);
        }

        @Debounce(100)
        private _oncheck(evt?: Event) {
            for (var el of this.viewports) {
                const tget = el.target || el;
                const newviz = this.isElementVisible(tget, el.ignoreHorizontal);
                if (newviz !== el.visible) {
                    var visible = el.visible = newviz;
                    if (visible) Utils.addClass(tget, PCSS + '-in-viewport');
                    else Utils.removeClass(tget, PCSS + '-in-viewport');
                }
            }
        }
    }

    const ORCHESTRATOR = new PacemViewportOrchestrator(window);

    @CustomElement({ tagName: P + '-viewport-aware' })
    export class PacemViewportAwareElement extends PacemEventTarget {
        
        @Watch({ converter: PropertyConverters.Boolean }) visible: boolean

        @Watch({ emit: false, converter: PropertyConverters.Element }) target: HTMLElement | SVGElement;

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