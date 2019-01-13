/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: 'pacem-lightbox',
        shadow: Defaults.USE_SHADOW_ROOT,
        template: `<pacem-panel class="pacem-lightbox-wrapper" hide="{{ !:host.show }}" css-class="{{ {'pacem-hidden': !:host.show, 'pacem-shown': :host.show } }}">
        <div class="pacem-lightbox pacem-relative">
            <div class="pacem-scrollable"><pacem-content></pacem-content></div>
        </div><pacem-resize on-resize=":host._resize($event)" enabled="{{ :host.show }}" target="{{ ::_container }}"></pacem-resize>
    <pacem-button hide="{{ :host.modal }}" class="pacem-close" on-click=":host._close($event)">X</pacem-button>
</pacem-panel>`
    })
    export class PacemLightboxElement extends PacemEventTarget implements OnViewActivated, OnDisconnected, OnPropertyChanged {

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

        @ViewChild('.pacem-lightbox-wrapper') private _wrapperElement: HTMLElement;
        @ViewChild('.pacem-lightbox') container: HTMLElement;

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
                        document.body.style.overflow = 'hidden';
                        this._resize();
                        var scroller = this.querySelector('.pacem-scrollable');
                        if (scroller)
                            window.requestAnimationFrame(() => scroller.scrollTop = 0);
                    } else {
                        document.body.style.overflow = '';
                        this.dispatchEvent(new Event('close'));
                    }
                    break;
            }
        }

        disconnectedCallback() {
            window.removeEventListener('resize', this._resizeHandler, false);
            window.removeEventListener('keyup', this._keyupHandler, false);
            super.disconnectedCallback();
        }

        private _resize(evt?: any) {
            if (Utils.isNull(this.container)) return;
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
            };
            window.requestAnimationFrame(fnPos);
            //fnPos();
        }

        private _close(evt) {
            Pacem.avoidHandler(evt);
            this.show = false;
        }
    }

}