/// <reference path="../../core/decorators.ts" />
namespace Pacem.Components {

    export const ScrollEventName: string = 'scroll';

    export declare type ScrollEventArgs = {
        top: number,
        left: number
    };

    export class ScrollEvent extends CustomTypedEvent<ScrollEventArgs>{
        constructor(args: ScrollEventArgs) {
            super(ScrollEventName, args);
        }
    }

    // TODO: elementify the concept of an ochestrator
    // see also viewport-aware
    class PacemScrollOrchestrator {

        constructor(private global: Window) {
        }

        scrollers: PacemScrollAwareElement[] = [];

        register(vport: PacemScrollAwareElement) {
            const scrlls = this.scrollers;
            if (scrlls.indexOf(vport) === -1) {
                scrlls.push(vport);
                if (scrlls.length === 1) {
                    this.global.addEventListener('scroll', this.scrollHandler, false);
                }
                this._scroll();
            }
        }

        unregister(vport: PacemScrollAwareElement) {
            var ndx: number;
            const scrlls = this.scrollers;
            if ((ndx = scrlls.indexOf(vport)) !== -1) {
                scrlls.splice(ndx, 1);
                if (scrlls.length === 0) {
                    this.global.removeEventListener('scroll', this.scrollHandler, false);
                }
            }
        }

        private scrollHandler = (evt: Event) => {
            this._scroll(evt);
        }

        private _scroll(evt?: Event) {
            const scrollTop = Utils.scrollTop,
                scrollLeft = Utils.scrollLeft;
            // this could jerk your scrolling experience...
            for (var el of this.scrollers) {
                const offset = Utils.offset(el.target || el),
                    scrollElTop = offset.top - scrollTop,
                    scrollElLeft = offset.left - scrollLeft,
                    scrollOffset = { top: scrollElTop, left: scrollElLeft };
                el.offset = scrollOffset;
                el.dispatchEvent(new ScrollEvent({ top: scrollElTop, left: scrollElLeft }));
            }
        }
    }

    const ORCHESTRATOR = new PacemScrollOrchestrator(window);

    /**
     * Manages scrolling interactions firing self-referenced ad-hoc events.
     */
    @CustomElement({
        tagName: P + '-scroll-aware'
    })
    export class PacemScrollAwareElement extends Pacem.Components.PacemEventTarget implements OnViewActivated, OnDisconnected {

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

        @Watch({ converter: PropertyConverters.Element }) target: HTMLElement | SVGElement;
        @Watch({ converter: PropertyConverters.Json }) offset: { top: number, left: number };

    }

}