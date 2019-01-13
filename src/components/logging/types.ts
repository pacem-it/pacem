/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.Logging {

    export declare type TrackingData = {
        count: number;
        average: number;
        max: number;
        min: number;
        current: number;
    }

    export interface Tracker {

        data: TrackingData;
    }

    const DEFAULT_DATA: TrackingData = { current: 0, count: 0, average: 0, max: Number.MIN_VALUE, min: Number.MAX_VALUE };

    export abstract class PacemTrackerElement extends PacemEventTarget implements Tracker, OnPropertyChanged {

        constructor() {
            super();
        }

        @Watch({ converter: PropertyConverters.Json }) data: TrackingData = DEFAULT_DATA;

        @Watch({ emit: false, converter: PropertyConverters.Number }) entry: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'entry')
                this._update(val).then(t => this.data = t);
        }

        @Concurrent()
        private _update(ne: number): PromiseLike<TrackingData> {
            //var deferred = DeferPromise.defer<TrackingData>();
            let fn = () => {
                const data = this.data,
                    min = Math.min(ne, data.min),
                    max = Math.max(ne, data.max),
                    count = data.count + 1,
                    average = (data.count * data.average + ne) / count;
                return { count: count, min: min, max: max, average: average, current: ne };
            };
            return Utils.fromResultAsync(fn);
            //return Utils.fromResult/*Async*/(fn());
        }

        reset() {
            this.data = DEFAULT_DATA;
        }
    }
}