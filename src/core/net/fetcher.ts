/// <reference path="http.ts" />
/// <reference path="../types.ts" />
type GlobalResponse = Response;

namespace Pacem.Net {

    export interface Fetcher extends NotifyPropertyChange {
        url: string;
        method: HttpMethod;
        parameters: { [key: string]: string };
        headers: { [key: string]: string };
        result: any;
        fetch: () => PromiseLike<GlobalResponse>;
    }

    export interface OAuthFetchable {

        readonly fetcher?: Fetcher;
        fetchCredentials: RequestCredentials;
        fetchHeaders: { [key: string]: string };

    }

    export const FetchResultEventName = 'fetchresult';
    export const FetchErrorEventName = 'error';
    export const FetchSuccessEventName = 'success';
}