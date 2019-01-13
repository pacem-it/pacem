/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.Logging {

    export declare type LogConfiguration = {
        debug?: boolean,
        log?: boolean,
        error?: boolean,
        info?: boolean,
        trace?: boolean,
        warn?: boolean
    };

    const DEFAULT_CONFIG: LogConfiguration = {
        error: true, info: true, warn: true
    };

    @CustomElement({ tagName: 'pacem-console' })
    export class PacemConsoleElement extends PacemEventTarget implements Pacem.Logging.Logger, OnPropertyChanged {

        private _category: string;
        private _config: LogConfiguration = DEFAULT_CONFIG;

        @Watch({ emit: false, converter: PropertyConverters.Json }) configuration: LogConfiguration;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'configuration')
                this._config = Utils.extend({}, val || {}, DEFAULT_CONFIG);
        }

        log(level: Pacem.Logging.LogLevel, message: string, category?: string) {
            try {
                /* console enabled? better check: you might find cumbersome behaviors on IE/Edge when F12 tools aren't available! */
                this._log(level, message, category);
            } catch (e) { }
        }

        private _log(level: Pacem.Logging.LogLevel, message: string, category?: string) {
            // enabled?
            if (!this.disabled && this._config[level] === true) {
                if (category !== this._category) {
                    if (!Utils.isNullOrEmpty(this._category))
                        console.groupEnd();
                    if (!Utils.isNullOrEmpty(category)) {
                        console.group(category);
                    }
                    this._category = category;
                }
                var fn: (msg: string, ...args: any[]) => void = (m) => { };
                switch (level) {
                    case Pacem.Logging.LogLevel.Debug:
                        fn = console.debug;
                        break;
                    case Pacem.Logging.LogLevel.Error:
                        fn = console.error;
                        break;
                    case Pacem.Logging.LogLevel.Info:
                        fn = console.info;
                        break;
                    case Pacem.Logging.LogLevel.Trace:
                        fn = console.trace;
                        break;
                    case Pacem.Logging.LogLevel.Warn:
                        fn = console.warn;
                        break;
                    case Pacem.Logging.LogLevel.Log:
                        fn = console.log;
                        break;
                }
                fn(new Date().toISOString() + ': ' + message);
            }
        }

    }

}