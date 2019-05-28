/// <reference path="../../core/decorators.ts" />
/// <reference path="../../core/animations/easings.ts" />
/// <reference path="../../core/animations/events.ts" />
/// <reference path="../../core/animations/tween-service.ts" />

namespace Pacem.Components {

    @CustomElement({ tagName: P + '-tween' })
    export class PacemTweenElement extends PacemEventTarget implements OnPropertyChanged {

        constructor(private _tweener = new Pacem.Animations.TweenService()) {
            super();
        }

        @Watch({ emit: false }) easing: (time: number) => number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) from: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) to: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) duration: number = 1000;
        @Watch({ emit: false, converter: PropertyConverters.Number }) delay: number;

        @Watch({ emit: false, converter: PropertyConverters.Boolean }) start: boolean;
        @Watch({ converter: PropertyConverters.Number }) value: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'start') {
                if (val === true && this.disabled != true)
                    this._animate();
            }
        }

        private _animate() {

            var started = false;
            this._tweener.run(this.from, this.to, this.duration, this.delay, this.easing, (time, value) => {

                started = started == false && this.dispatchEvent(new Animations.AnimationStartEvent());
                this.dispatchEvent(new Animations.AnimationEvent({ time: time, value: this.value = value }));
                this.log(Logging.LogLevel.Info, 'value: ' + this.value);

                if (time == 1.0) {
                    this.dispatchEvent(new Animations.AnimationEndEvent());
                    // reset start property
                    this.start = false; // <- will trigger the animation next time set to true
                }
            });

        }
    }
}