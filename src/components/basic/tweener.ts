/// <reference path="../../core/decorators.ts" />
namespace Pacem.Animations {

    // TODO: Bezier

    const pi_half = Math.PI * .5;

    export const Easings = {

        // t: normalized `current time` [0,1]

        linear: t => t,

        sineIn: t => Math.sin(t * pi_half - pi_half) + 1.0,
        sineOut: t => Math.sin(t * pi_half),
        sineInOut: t => .5 * Math.sin(t * Math.PI - pi_half) + .5,

        expoIn: t => (Math.pow(Math.E, t) - 1.0) / (Math.E - 1.0),
        expoOut: t => Math.log(t * (Math.E - 1.0) + 1.0),
        expoInOut: t => t < .5 ? .5 * Easings.expoIn(t * 2) : .5 * (1 +Easings.expoOut(t * 2 - 1.0))
    };

    export class TweenService {
        
        run(from: number, to: number,
            duration: number,
            delay: number = 0,
            easing: (time: number) => number = Easings.linear,
            callback: (time: number, value: number) => void = null
        ): PromiseLike<{}> {

            var deferred = DeferPromise.defer();

            const now = (performance && performance.now()) || Date.now();
            const start = now + Math.abs(delay || 0);
            const end = start + Math.abs(duration || 0);
            //
            var started = false;
            const fn = () => {
                const t = (performance && performance.now()) || Date.now();
                if (t >= start && t < end) {
                    const ct = (t - start) / duration;
                    const v = from + (easing || Pacem.Animations.Easings.linear)(ct) * (to - from);
                    if (callback)
                        callback(ct, v);
                }
                if (t < end) {
                    requestAnimationFrame(fn);
                } else {
                    if (callback)
                        callback(1.0, to);
                    deferred.resolve();
                }
            }
            fn();

            return deferred.promise;

        }

    }
}

namespace Pacem.Components {

    export declare type AnimationEventArgs = {
        time: number,
        value: number
    };

    export class AnimationEvent extends CustomTypedEvent<AnimationEventArgs>{
        constructor(args: AnimationEventArgs) {
            super("step", args);
        }
    }

    export class AnimationEndEvent extends CustomEvent<{}> {
        constructor() {
            super('end');
        }
    }

    export class AnimationStartEvent extends CustomEvent<{}> {
        constructor() {
            super('start');
        }
    }

    @CustomElement({ tagName: 'pacem-tween' })
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

                started = started == false && this.dispatchEvent(new AnimationStartEvent());
                this.dispatchEvent(new AnimationEvent({ time: time, value: this.value = value }));
                this.log(Logging.LogLevel.Info, 'value: ' + this.value);

                if (time == 1.0) {
                    this.dispatchEvent(new AnimationEndEvent());
                    // reset start property
                    this.start = false; // <- will trigger the animation next time set to true
                }
            });

        }
    }
}