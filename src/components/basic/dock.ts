/// <reference path="tweener.ts" />
namespace Pacem.Components {

    export enum DockMode {
        Top = 'top',
        Bottom = 'bottom'
    }

    @CustomElement({
        tagName: 'pacem-dock'
    })
    export class PacemDockElement extends PacemEventTarget implements OnPropertyChanged {

        constructor(private _tweener = new Animations.TweenService()) {
            super();
        }

        @Watch({ emit: false, converter: PropertyConverters.String }) mode: DockMode = DockMode.Top;
        @Watch({ converter: PropertyConverters.Boolean }) dock: boolean;
        @Watch({ emit: false, converter: PropertyConverters.Element }) target: HTMLElement;
        @Watch({ emit: false, converter: PropertyConverters.Number }) delay: number /* msecs */;
        @Watch({ emit: false, converter: PropertyConverters.Number }) transitionDuration: number = 300 /* msecs */;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'dock' && (!Utils.isNull(old) || val != false))
                this._doDock();
            else if (name === 'mode' && this.dock === true)
                this._doDock();
        }

        private _animate(from: number, to: number) {
            var transition: number = this.transitionDuration;
            if (!(transition > 0))
                transition = 300;
            //
            return this._tweener.run(from, to, transition, this.delay, Animations.Easings.sineInOut, (time, value) => {
                this._setOffset(value);
            }).then(() => {
                this._resetOffset();
            });
        }

        private _setOffset(value?: number) {
            this.style.transform = 'translateY(' + value + 'px)';
        }

        private _resetOffset() {
            this.style.transform = '';
        }

        private _compute() {
            const offset = Utils.offset(this);
            const css = getComputedStyle(this);
            const scrollTop = Utils.scrollTop;

            switch (this.mode) {
                case DockMode.Bottom:
                    const marginBottom = parseInt(css.marginBottom);
                    const bottom = offset.top;
                    const deltaBottom = Utils.windowSize.height - (bottom - scrollTop + this.offsetHeight);
                    return { delta: deltaBottom + marginBottom };
                case DockMode.Top:
                    const marginTop = parseInt(css.marginTop);
                    const top = offset.top;
                    const delta = top - scrollTop;
                    return { delta: -(delta + marginTop) };
            }

        }

        private _doDock() {
            const docked = this.dock;
            if (docked) {
                const cmp = this._compute();
                if (Utils.isNull(cmp))
                    return;
                //
                // adding the css classes first...
                Utils.addClass(this, 'pacem-dock');
                switch (this.mode) {
                    case DockMode.Bottom:
                        Utils.removeClass(this, 'pacem-dock-top');
                        Utils.addClass(this, 'pacem-dock-bottom');
                        break;
                    case DockMode.Top:
                        Utils.removeClass(this, 'pacem-dock-bottom');
                        Utils.addClass(this, 'pacem-dock-top');
                        break;
                }
                // ...so have to flip `from` and `to` 
                const from = -cmp.delta;
                const to = 0;
                const state = CustomElementUtils.getAttachedPropertyValue(this, 'pacem-dock:state') || 0;
                CustomElementUtils.setAttachedPropertyValue(this, 'pacem-dock:state', -from + state);
                this.log(Logging.LogLevel.Info, `animating from ${from}px to ${to}px`);
                //
                this._animate(from, to)/*.then(() => { })*/;

            } else {
                // removing the css classes first then animating
                const from = CustomElementUtils.getAttachedPropertyValue(this, 'pacem-dock:state');
                CustomElementUtils.deleteAttachedPropertyValue(this, 'pacem-dock:state');
                const to = 0;
                this.log(Logging.LogLevel.Info, `animating back from ${from}px to ${to}px`);

                Utils.removeClass(this, 'pacem-dock pacem-dock-top pacem-dock-bottom');
                this._animate(from, to);
            }
        }

    }
}