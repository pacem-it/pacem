/// <reference path="easings.ts" />
/// <reference path="events.ts" />

namespace Pacem.Animations {


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