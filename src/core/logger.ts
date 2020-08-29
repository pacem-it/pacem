namespace Pacem.Logging {

    export enum LogLevel {
        Trace = 'trace',
        Debug = 'debug',
        Warn = 'warn',
        Error = 'error',
        Info = 'info',
        Log = 'log'
    }

    export interface Logger {
        log(level: LogLevel, message: string, category?: string);
    }

}