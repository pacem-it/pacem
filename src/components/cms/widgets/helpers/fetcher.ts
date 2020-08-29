/// <reference path="../../scaffolding/types.ts" />
namespace Pacem.Components.Cms {

    const FETCH_PARAMETER_METADATA: Pacem.Scaffolding.TypeMetadata = {
        props: [
            { prop: 'name', type: 'string', isReadOnly: true, display: { name: 'Name', cssClass: ['cols-md-4', 'cols-lg-3', 'cols-hd-2'] } },
            { prop: 'value', type: EXPRESSION_METADATA_TYPE, display: { name: 'Value', cssClass: ['cols-md-8', 'cols-lg-9', 'cols-hd-10'] } }
        ]
    };

    const FETCH_METADATA: Pacem.Scaffolding.TypeMetadata = {
        display: {
            icon: 'wifi', name: 'Api Fetcher', description: 'Fetching widget that retrieves data from a REST endpoint.'
        }, props: [
            {
                prop: 'manifest', type: EXPRESSION_METADATA_TYPE, isComplexType: true, display: {
                    name: 'Api Manifest'
                }, extra: {
                    selector: P + '-widget-apimanifest'
                }, validators: [{ type: 'required', errorMessage: 'Api Manifest is a required field.' }]
            },
            {
                prop: 'endpoint', type: 'object', isComplexType: true, display: {
                    name: 'Endpoint', ui: 'oneToMany'
                }, validators: [{ type: 'required', errorMessage: 'Api Manifest is a required field.' }],
                extra: {
                    source: (manifest: Pacem.Scaffolding.OpenApi.ApiManifest) => manifest.endpoints.map(e => Utils.extend(e, { 'fullPath': `[${e.method.toUpperCase()}] ${e.path}` })).sort(),
                    textProperty: 'fullPath', valueProperty: 'fullPath',
                    dependsOn: [{ prop: 'manifest', hide: true }]
                }
            },
            {
                prop: 'parameters', type: 'array', display: {
                    name: 'Parameters'
                },
                props: gridifyMetadata(FETCH_PARAMETER_METADATA),
                extra: {
                    lockItems: true,
                    dependsOn: [{ prop: 'endpoint', hide: true }]
                }
            },
            ACCESS_TOKEN_METADATA
        ]
    };

    const PARAMETER_TAGNAME = P + '-widget-fetch-parameter';

    @CustomElement({ tagName: PARAMETER_TAGNAME })
    export class PacemWidgetFetchParameterElement extends PacemEventTarget {

        private _fetcher: PacemWidgetFetchElement;

        @Watch({ reflectBack: true, converter: PropertyConverters.Boolean }) required: boolean;
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) name: string;
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) value: any;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val.first);
            if (name === 'value' && !Utils.isNull(this._fetcher)) {
                this._fetcher.fetch();
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            const fetcher = this._fetcher = CustomElementUtils.findAncestorOfType(this, PacemWidgetFetchElement);
            if (!Utils.isNull(this._fetcher) && !Utils.isNull(this.value)) {
                this._fetcher.fetch();
            }
        }
    }

    @CustomElement({
        tagName: P + '-widget-fetch', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-fetch autofetch="false" fetching="{{ :host.fetching, twoway }}" debounce="100"
on-${Pacem.Net.FetchResultEventName}=":host._onresult($event)" on-${Pacem.Net.FetchErrorEventName}=":host._onerror($event)" on-${Pacem.Net.FetchSuccessEventName}=":host._onsuccess($event)"></${P}-fetch><div hidden><${P}-content></${P}-content></div>`
    })
    export class PacemWidgetFetchElement extends PacemBearerWidgetElement{

        constructor() {
            super(buildWidgetMetadata(FETCH_METADATA));
        }

        @Watch({ reflectBack: true, emit: true /* < due to metadata 'dependsOn' */, converter: PropertyConverters.Json }) manifest: Pacem.Scaffolding.OpenApi.ApiManifest;
        @Watch({ reflectBack: true, emit: true /* < due to metadata 'dependsOn' */, converter: PropertyConverters.Json }) endpoint: Pacem.Scaffolding.OpenApi.ApiEndpoint;

        @Watch({ reflectBack: true, emit: false, converter: PropertyConverters.String }) url: string;
        @Watch({ reflectBack: true, emit: false, converter: PropertyConverters.String }) method: Pacem.Net.HttpMethod;
        @Watch({ reflectBack: true, emit: false, converter: PropertyConverters.Json }) fields: Pacem.Scaffolding.TypeMetadata | Pacem.Scaffolding.PropertyMetadata[];
        @Watch(/* just for editing sake */) parameters: any[];
        @Watch(/* can only be databound or assigned at runtime */) result: any[];

        @Watch({ converter: PropertyConverters.Boolean }) fetching: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) success: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) failure: boolean;

        @ViewChild(P + '-fetch') private _fetcher: Pacem.Components.PacemFetchElement;
        @ViewChild('div[hidden]') private _itemsElement: HTMLElement;

        private _onerror = (e: Event) => {
            this.failure = !(this.success = false);
        }

        private _onsuccess = (e: Event) => {
            this.failure = !(this.success = true);
        }

        private _onresult = (e: CustomEvent<any>) => {
            this.result = e.detail;
        }

        get _parameters() {
            return Array.from(this._itemsElement.children).filter(e => e.localName === PARAMETER_TAGNAME) as PacemWidgetFetchParameterElement[];
        }

        fetch() {
            const fetcher = this._fetcher,
                parameters = this._parameters || [],
                endpoint = this.endpoint;

            if (!Utils.isNull(endpoint)) {
                for (let param of endpoint.parameters) {
                    if (param.required && Utils.isNull(parameters.find(p => p.name === param.name))) {
                        // parameters not yet aligned with the ref endpoint:
                        // not all the required parameters are attached => exit
                        return;
                    }
                }
            }

            // build-up fetch params
            const params = {};
            for (let parameter of parameters) {
                if (!Utils.isNullOrEmpty(parameter.value)) {
                    params[parameter.name] = parameter.value;
                } else if (parameter.required) {
                    // found an empty (required) parameter => exit
                    return;
                }
            }

            fetcher.url = this.url;
            fetcher.method = this.method;
            fetcher.credentials = this.fetchCredentials;
            fetcher.headers = this.fetchHeaders;
            fetcher.parameters = params;

            return fetcher.fetch();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.fetch();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'endpoint' && !Utils.isNullOrEmpty(val)) {
                this._mergeEndpoint(val);
            } else switch (name) {
                case 'parameters':
                case 'fetchHeaders':
                case 'fetchCredentials':
                case 'url':
                case 'method':
                    this.fetch();
                    break;
            }
        }

        private _mergeEndpoint(endpoint = this.endpoint) {

            this.url = this.manifest.baseUrl + endpoint.path;
            this.method = endpoint.method;
            this.fields = endpoint.response.fields;

            const itemsElement = this._itemsElement,
                parameters = this._parameters;

            // remove exceeding
            for (let j = parameters.length - 1; j >= 0; j--) {
                let item = parameters[j];
                let matching = endpoint.parameters.find(p => p.name === item.name);
                if (Utils.isNull(matching)) {
                    item.remove();
                }
            }

            // add missing
            for (let param of endpoint.parameters) {
                let existing = parameters.find(p => p.name === param.name);
                if (Utils.isNull(existing)) {
                    let item = existing = document.createElement(PARAMETER_TAGNAME) as PacemWidgetFetchParameterElement;
                    item.name = param.name;
                    itemsElement.appendChild(item);
                }
                existing.required = param.required;
            }

            // for editing sake
            this.parameters = parameters;
        }
    }

}