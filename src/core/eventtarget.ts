/// <reference path="converters.ts" />
/// <reference path="decorators.ts" />
/// <reference path="logger.ts" />

namespace Pacem {

    export interface NotifyPropertyChange extends EventTarget {
    }

}

namespace Pacem.Components {

    export abstract class PacemEventTarget extends HTMLElement implements NotifyPropertyChange, OnPropertyChanged, OnConnected, OnViewActivated, OnDisconnected {

        constructor() {
            super();
        }

        /**
         * Dispatches the provided event and executes the relevant handler defined in the `on-{evt.type}` attribute, if any.
         * @param evt {Event} the event to be fired
         */
        protected emit(evt: Event) {
            // no handlers processed if the element is disabled.
            if (this._dontDispatch(evt))
                return;
            var attrName: string = `on-${evt.type.toLowerCase()}`;
            if (attrName in this.attributes) {
                this.log(Logging.LogLevel.Debug, `Calling ${attrName} handler for event ${evt.type}`);
                var attrBody: string = this.attributes[attrName].value;
                var expression = Expression.parse(attrBody, this);
                if (!Utils.isNull(expression) && expression.pending !== true) {
                    expression.evaluatePlus({ '$event': evt });
                }
            }
        }

        handle(evt: Event) {
            this.emit(evt);
        }

        private _dontDispatch(evt: Event) {
            return this.disabled === true /*&& !(evt instanceof PropertyChangeEvent && evt.detail.propertyName === 'disabled')*/;
        }

        // do not override "isConnected" -> breaks polyfills.
        //private _isConnected = false;
        ///** Gets whether the element has been appended to an (owner)Document. */
        //get isConnected() : boolean {
        //    return this._isConnected;
        //}

        private _isReady = false;
        /** Gets whether the element has been completely loaded alongside with the remaining DOM. */
        get isReady(): boolean {
            return this._isReady;
        }

        connectedCallback() { 
            //this._isConnected = true;
        }

        disconnectedCallback() {
            this._isReady = 
                /*this._isConnected =*/ false;
        }

        viewActivatedCallback() {
            this._isReady = true;
            this.dispatchEvent(new Event('load'));
        }

        /**
         * Manages the value change of a watched property.
         * @param name {string} property name
         * @param old {any} former property value
         * @param val {any} new/current property value
         * @param first {boolean} whether is the first change (right before view activation) or not
         */
        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            if (first)
                this.log(Logging.LogLevel.Log, `Property "${name}" changed at start-up`);
            else
                this.log(Logging.LogLevel.Log, `Property "${name}" changed from ${old} to ${val}`);
        }

        /**
         * Wraps the native dispatchEvent in order to emit `on-{evt-type}` handler, if any.
         * @param evt {Event} the event to be fired
         */
        dispatchEvent(evt: Event): boolean {
            // no events dispatched if the element is disabled.
            if (this._dontDispatch(evt))
                return false;
            this.log(Logging.LogLevel.Log, `Dispatching event "${evt.type}"`);
            const ret = super.dispatchEvent(evt);
            this.emit(evt);
            return ret;
        }

        protected emitHandler: (evt: Event) => void = (evt) => {
            this.emit(evt);
        }

        @Watch({ reflectBack: true, converter: PropertyConverters.Boolean })
        disabled: boolean;
        @Watch({ emit: false, converter: PropertyConverters.Element })
        logger: Pacem.Logging.Logger;

        /**
         * Logs a message if a logger is available.
         * @param level {LogLevel} Level of log
         * @param message {String} Content
         * @param category {String} Grouping category
         */
        protected log(level: Pacem.Logging.LogLevel, message: string, category: string = this.localName + (this.id ? '#' + this.id : '')) {
            this.logger && this.logger.log(level, message, category);
        }
    }

}