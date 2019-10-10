/// <reference path="../../../../dist/js/pacem-scaffolding.d.ts" />
namespace Pacem.Cms.OpenApi {

    const BAG = 'pacem:metadatabag';

    interface StorageCache {
        getPropertyValue: (name: string) => any,
        setPropertyValue: (name: string, value: any, persistent?: boolean) => void;
        removeProperty: (name: string) => void;
    }

    export class SwaggerCmsParser {

        constructor(private _openApi = new Pacem.Scaffolding.OpenApi.SwaggerParser()) {
        }

        cache: StorageCache;

        async load(url: string, headers?: { [name: string]: string }): Promise<Pacem.Scaffolding.OpenApi.ApiManifest> {
            let api = await this._openApi.load(url, headers);
            if (api != null) {
                api[BAG] = {};
                // greedy load of datafields
                for (let endpoint of api.endpoints) {
                    await this._enrichSchemas(api, endpoint, headers);
                }
            }
            return api;
        }

        private async _enrichSchemas(api: Pacem.Scaffolding.OpenApi.ApiManifest, endpoint: Pacem.Scaffolding.OpenApi.ApiEndpoint, headers?: { [name: string]: string }) {
            const response = endpoint.response;
            if (response && response.meta) {

                response.fields = await this._fetchMetadata(api, { name: response.fullType, schema: response.meta }, headers);
            }

            // parameters?
            const parameters = endpoint.parameters;
            for (let parameter of (parameters || [])) {
                if (parameter.meta && parameter.fullType) {
                    let fields = await this._fetchMetadata(api, { name: parameter.fullType, schema: parameter.meta }, headers);
                    parameter.fields = fields;
                }
            }
        }

        private _cachedMetadataUrls: string[] = [];
        clearCache(): void {
            const cache = this.cache,
                keys = this._cachedMetadataUrls;
            if (cache) {
                for (let key of keys) {
                    cache.removeProperty(key);
                }
                // clear keys
                keys.splice(0);
            }
        }

        /**
         * 
         * @param def1
         * @param headers HTTP headers for API fetching
         */
        private async _fetchMetadata(api: Pacem.Scaffolding.OpenApi.ApiManifest, def0: { name: string, schema: OpenApiSwagger.Schema }, headers: { [name: string]: string }): Promise<Pacem.Scaffolding.OpenApi.DataField[]> {
            let _fetch = async (def1: { name: string, schema: OpenApiSwagger.Schema }) => {
                let cols: Pacem.Scaffolding.OpenApi.DataField[] = [];
                if (def1 && def1.name) {

                    // short-circuit if already in the bag
                    if (api[BAG][def1.name]) {
                        return api[BAG][def1.name];
                    }

                    /* reserve a place for this type so that it gets not fetched again if aggressive recursion occurs */ api[BAG][def1.name] = cols;

                    let meta: Pacem.Scaffolding.TypeMetadata = { props: [] },
                        metadataUrl;

                    if (/^https?:\/\//.test(def1.name)) {
                        // name is url? then it's the endpoint for type metadata, fetch it!
                        metadataUrl = def1.name;

                    } else {

                        console.warn(`Swagger entity definition keys must appear in form of absolute url. Their response to a GET request needs to be the entity metadata itself.\nNo other options are currently supported.`);
                        return;
                    }

                    if (metadataUrl) {

                        let retrieveFn = async () => {

                            let response = await fetch(metadataUrl, { credentials: 'omit', mode: 'cors', headers: headers });
                            if (response.ok) {
                                return await response.json();
                            }
                        }

                        if (this.cache) {

                            // check for session cache
                            meta = this.cache.getPropertyValue(metadataUrl);
                            if (!meta) {

                                // no cache available? then fetch...
                                meta = await retrieveFn();

                                this._cachedMetadataUrls.push(metadataUrl);
                                this.cache.setPropertyValue(metadataUrl, meta, /* persist in session not on location */ false);
                            }
                        } else {

                            // do fetch
                            meta = await retrieveFn();
                        }

                    }

                    let schema = def1.schema;

                    for (let col in schema.properties) {
                        let column = schema.properties[col],
                            field = meta && meta.props.find(p => p.prop === col);

                        let datafield: Pacem.Scaffolding.OpenApi.DataField = Object.assign({
                            prop: col, type: column.type || 'text'
                        }, field || /* if there's no match, then read-only */ { isReadOnly: true });

                        if (field) {
                            let $ref = (column.items && (<OpenApiSwagger.Schema>column.items).$ref) || column.$ref;
                            if ($ref) {
                                let ref = Pacem.Scaffolding.OpenApi.getOpenApiDefinition(api, $ref),
                                    key = ref.name;
                                if (api[BAG][key]) {
                                    datafield.props = api[BAG][key];
                                } else {
                                    // recursion here
                                    datafield.props = await _fetch(ref);
                                }
                            }
                        }

                        cols.push(datafield);

                    }
                }
                return cols;
            }
            return await _fetch(def0);
        }
    }

}