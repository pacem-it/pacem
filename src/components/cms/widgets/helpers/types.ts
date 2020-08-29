/// <reference path="../types.ts" />

namespace Pacem.Components.Cms {

    export const FETCH_CREDENTIALS_METADATA: Pacem.Scaffolding.PropertyMetadata = {
        prop: 'fetchCredentials', type: 'string', dataType: 'enumeration', display: { name: 'Fetch Credentials' }, extra: {
            enum: ['same-origin', 'omit', 'include']
        }
    };
    export const ACCESS_TOKEN_METADATA: Pacem.Scaffolding.PropertyMetadata = {
        prop: 'accessToken', type: EXPRESSION_METADATA_TYPE, display: { name: 'Access Token' },
        extra: Utils.extend({}, EXPRESSION_WIDGET_METADATA_EXTRA, { filter: (e: Element) => e instanceof PacemWidgetDataElement || e instanceof PacemWidgetFetchElement })
    };

    export abstract class PacemBearerWidgetElement extends PacemWidgetElement implements Pacem.Net.OAuthFetchable {

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) fetchCredentials: RequestCredentials = 'same-origin';
        @Watch({ emit: false, converter: PropertyConverters.Json }) fetchHeaders: { [key: string]: string; };
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) accessToken: { [key: string]: string; };
        @Watch({ converter: PropertyConverters.Boolean }) fetching: boolean;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'accessToken') {
                if (!Utils.isNullOrEmpty(val)) {
                    this.fetchHeaders = { 'Authorization': 'Bearer ' + val };
                } else {
                    this.fetchHeaders = {};
                }
            }
        }

    }
}