/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    const PACEM_TOAST_POPS = "pacem:toast:pops";

    @CustomElement({
        tagName: P + '-toast'
    })
    export class PacemToastElement extends PacemElement {

        @Watch({ emit: false, converter: PropertyConverters.Boolean }) autohide: boolean = true;
        @Watch({ emit: false, converter: PropertyConverters.Number }) timeout: number = 3000;
        @Watch({ converter: PropertyConverters.Boolean }) show: boolean;

        connectedCallback() {
            super.connectedCallback();
            this.addEventListener('click', this._doHide, false);
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'show') {
                if (val !== true) {
                    Utils.removeClass(this, 'toast-show');
                    Utils.addClass(this, 'toast-hide');
                    this.dispatchEvent(new CustomEvent('close'));
                    Utils.waitForAnimationEnd(this, 1000).then(() => {
                        Utils.removeClass(this, 'toast-hide');
                    });
                } else {
                    let order: number = CustomElementUtils.getAttachedPropertyValue(PacemToastElement, PACEM_TOAST_POPS, 0) - 1;
                    CustomElementUtils.setAttachedPropertyValue(PacemToastElement, PACEM_TOAST_POPS, order);
                    this.style.order = '' + order;
                    Utils.addClass(this, 'toast-show');
                    this._show();
                }
            }
        }

        disconnectedCallback() {
            this.removeEventListener('click', this._doHide, false);
            super.disconnectedCallback();
        }

        private _handle: number;
        private _doHide = (evt?) => {
            window.clearTimeout(this._handle);
            this.show = false;
        }

        private _show() {
            window.clearTimeout(this._handle);
            if (this.disabled)
                return;
            if (this.autohide) {
                this._handle = window.setTimeout(() => { this.show = false; }, this.timeout);
            }
        }

        popup() {
            if (this.show) {
                this._show();
            } else {
                this.show = true;
            }
        }

        /**
         * Opinionated shortcut/utility for toast spinning.
         * @param toaster Toast container
         * @param level Message criticity level
         * @param message The message
         * @param options Further options object
         */
        @Transformer("poptoast")
        static toast(toaster: HTMLElement, level: 'info' | 'success' | 'warning' | 'danger' | 'error', message: string | HTMLElement, options?: { autohide?: boolean, timeout?: number }): Promise<void> {
            var toast = new PacemToastElement();
            toast.className = 'toast-' + level;

            if (!Utils.isNull(options?.autohide)) {
                toast.autohide = options.autohide;
            }
            if (options?.timeout > 0) {
                toast.timeout = options.timeout;
            }

            // icon
            const icon = document.createElement('i');
            icon.className = Pacem.PCSS + '-icon text-bigger-steady ' + Pacem.PCSS + '-margin margin-right-1 flex-auto';
            var ligature = 'info';
            switch (level) {
                case 'danger':
                case 'error':
                    ligature = 'error';
                    break;
                case 'warning':
                    ligature = 'warning';
                    break;
                case 'success':
                    ligature = 'check_circle';
                    break;
            }
            icon.textContent = ligature;
            const container = document.createElement('div');
            Utils.addClass(container, 'display-flex flex-stretch flex-start flex-nowrap');
            container.appendChild(icon);

            // caption
            const caption = document.createElement('span');
            Utils.addClass(caption, 'text-small text-pre');
            if (typeof message === 'string') {
                caption.innerHTML = message;
            } else {
                caption.appendChild(message);
            }
            container.appendChild(caption);

            toast.appendChild(container);
            toaster.appendChild(toast);

            // promise
            return new Promise((resolve, _) => {

                window.setTimeout(() => {
                    toast.popup();
                },  // needs some time to digest
                    // state and transition
                    100);

                const callback = () => {
                    toast.removeEventListener('close', callback, false);
                    resolve();
                    Pacem.Utils.waitForAnimationEnd(toast, 1000).then(_ => {
                        toast.remove();
                    });
                }

                toast.addEventListener('close', callback, false);
            });
        }
    }

}