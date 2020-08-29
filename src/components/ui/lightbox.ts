/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-lightbox',
        shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-panel class="${PCSS}-lightbox-wrapper" css-class="{{ {'${PCSS}-shown': :host.show } }}" hidden>
        <div class="${PCSS}-lightbox ${PCSS}-relative" style="transform: translateY(50vh)">
            <div class="${PCSS}-scrollable"><${P}-content></${P}-content></div>
        </div><${P}-resize watch-position="true" logger="{{ :host.logger }}" on-resize=":host._resize($event)" disabled="{{ !:host.show }}" target="{{ ::container }}"></${P}-resize>
    <${P}-button hide="{{ :host.modal }}" class="${PCSS}-close" on-click=":host._close($event)">X</${P}-button>
</${ P}-panel>`
    })
    export class PacemLightboxElement extends PacemEventTarget {

        private _resizeHandler = _ => {
            if (this.show)
                this._resize(_);
        }

        private _keyupHandler = (evt: KeyboardEvent) => {
            if (evt.keyCode === 27 /* ESC */ && this.show && !this.modal) {
                this.show = false;
            }
        };

        @Watch({ converter: PropertyConverters.Boolean }) show: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) modal: boolean;

        @ViewChild('.' + PCSS + '-lightbox-wrapper') private _wrapperElement: HTMLElement;
        @ViewChild('.' + PCSS + '-lightbox') container: HTMLElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            var wrapper = this._wrapperElement; //= <HTMLElement>this.querySelector();
            var container = this.container; //= <HTMLElement>this.querySelector();

            wrapper.addEventListener('mousedown', (evt: MouseEvent) => {
                if (this.modal)
                    Pacem.stopPropagationHandler(evt);
                else
                    this.show = false;
            }, false);
            container.addEventListener('mousedown', (evt: MouseEvent) => {
                Pacem.stopPropagationHandler(evt);
            }, false);
            window.addEventListener('resize', this._resizeHandler, false);
            window.addEventListener('keyup', this._keyupHandler, false);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'show':
                    if (!!val) {
                        (<PacemElement>this._wrapperElement).hide = false;
                        document.body.style.overflow = 'hidden';
                        this._resize();
                        var scroller = this.querySelector('.' + PCSS + '-scrollable');
                        if (scroller) {
                            window.requestAnimationFrame(() => scroller.scrollTop = 0);
                        }
                    } else {
                        document.body.style.overflow = '';
                        this.dispatchEvent(new Event('close'));
                        //
                        Utils.addAnimationEndCallback(this._wrapperElement, (e) => {
                            (<PacemElement>e).hide = true;
                        }, 500);
                    }
                    break;
            }
        }

        disconnectedCallback() {
            if (this.show) {
                this._close();
            }
            window.removeEventListener('resize', this._resizeHandler, false);
            window.removeEventListener('keyup', this._keyupHandler, false);
            super.disconnectedCallback();
        }

        #loop: boolean = false;
        #locked: boolean = false;
        private _resize(evt?: any) {
            if (Utils.isNull(this.container)) return;

            if (this.#locked) {
                this.#loop = true;
            } else {
                this.#locked = true;
                this.#loop = false;

                var win = window, element = this._wrapperElement;
                var viewportHeight = Utils.windowSize.height;
                var scrollTop = win.pageYOffset;
                element.style.width = '100%'
                element.style.height = viewportHeight + 'px';
                element.style.position = 'absolute';
                //element.style.zIndex = '10000'; // set in css
                element.style.margin = '0';
                element.style.padding = '0';
                element.style.top = scrollTop + 'px';
                element.style.left = '0';
                //
                var container = this.container;
                container.style.top = '0';
                container.style.margin = '0 auto';
                let fnPos = () => {
                    var containerHeight = container.offsetHeight;
                    var top = (viewportHeight - containerHeight) * .5;
                    container.style.transform = `translateY(${Math.round(top)}px)`;// top + 'px auto 0 auto';
                    Utils.waitForAnimationEnd(container, 300).then(() => {
                        this.#locked = false;
                        if (this.#loop) {
                            this._resize();
                        }
                    });
                };
                window.requestAnimationFrame(fnPos);
            }

        }

        private _close(evt?: any) {
            if (!Utils.isNull(evt)) {
                Pacem.avoidHandler(evt);
            }
            this.show = false;
        }
    }

}