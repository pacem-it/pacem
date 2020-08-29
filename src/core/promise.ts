namespace Pacem {

    export class DeferPromise<T> implements PromiseLike<T> {

        private promise: Promise<T>;
        private deferred: {
            'resolve': (v?: T) => void | PromiseLike<void>,
            'reject': (v?: any) => void | PromiseLike<void>,
            'promise': DeferPromise<T>
        } = null;

        constructor() {
            var me = this;
            me.promise = new Promise<T>(function (resolve, reject) {
                me.deferred = { 'resolve': resolve, 'reject': reject, 'promise': me };
            });
        }

        then<TResult1 = T, TResult2 = never>(
            onCompleted?: ((v: T) => TResult1 | PromiseLike<TResult1>),
            onFailed?: (v?: any) => TResult2 | PromiseLike<TResult2>) : PromiseLike<TResult1 | TResult2> {
            return this.promise.then(onCompleted, onFailed);
        }

        /**
         * Occurs whenever the promise concludes (either after completion or error).
         * @param {Function } callback
         */
        finally(callback: (v?: T | any) => void | PromiseLike<void>) {
            this.promise.then(callback, callback);
            return this;
        }

        success(callback: (v?: T) => T | PromiseLike<T>) {
            this.promise.then(callback, null);
            return this;
        }

        error(callback: (v?: any) => void | PromiseLike<void>) {
            this.promise.then(null, callback);
            return this;
        }

        static defer<T>() {
            var q = new DeferPromise<T>();
            return q.deferred;
        }
    }

}