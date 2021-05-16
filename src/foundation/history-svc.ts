namespace Pacem {

    /** Grants undo/redo functionalities for given state. */
    export class HistoryService<TState = any> {

        constructor(state: TState, maxlength?: number) {
            this.#current = state;
            this.#maxlength = maxlength;
        }

        // it's a queue
        #backwards: TState[] = [];
        // it's a stack
        #forwards: TState[] = [];
        // max number of items (queue + stack)
        #maxlength: number;

        #current: TState;

        /**
         * Gets the current state.
         */
        get current(): TState {
            return this.#current;
        }

        get canUndo() {
            return this.#backwards.length > 0;
        }

        get canRedo() {
            return this.#forwards.length > 0;
        }

        undo() {
            if (this.canUndo) {
                const back = this.#backwards,
                    fore = this.#forwards,
                    current = this.#current;
                fore.unshift(current);
                this.#current = back.pop();
            }
        }

        redo() {
            if (this.canRedo) {
                const back = this.#backwards,
                    fore = this.#forwards,
                    current = this.#current;
                back.push(current);
                this.#current = fore.shift();
            }
        }

        push(state: TState) {
            this.#forwards.splice(0);
            this.#backwards.push(this.#current);
            this.#current = state;

            const max: number = this.#maxlength,
                queue = this.#backwards;
            if (max > 0 && queue.length > max) {
                queue.splice(0, queue.length - max);
            }
        }

        reset() {
            this.#forwards.splice(0);
            this.#backwards.splice(0);
        }

    }


}