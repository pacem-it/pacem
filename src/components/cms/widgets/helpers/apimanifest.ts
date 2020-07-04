/// <reference path="types.ts" />
namespace Pacem.Components.Cms {

    const APIMANIFEST_METADATA: Pacem.Scaffolding.TypeMetadata = {
        display: { icon: 'cloud_circle', name: 'Api Manifest', description: 'OpenApi parser for WebApi scaffolding.' },
        props: [
            {
                prop: 'url', type: 'text', display: {
                    name: 'Url', description: 'Insert the url of the OpenApi json configuration.', cssClass: ['cols-lg-8'],
                    watermark: 'https://domain.com/swagger/v1/swagger.json'
                },
                extra: { tooltip: true },
                validators: [{
                    type: 'required', errorMessage: 'Url field is required.'
                }]
            },
            {
                prop: 'usecache', type: 'boolean', display: {
                    name: 'Cache results', description: 'Whether to cache the manifest per-url.', cssClass: ['cols-lg-4'],
                    ui: 'switcher'
                },
                extra: { tooltip: true }
            },
            ACCESS_TOKEN_METADATA
        ]
    };

    @CustomElement({ tagName: P + '-widget-apimanifest' })
    export class PacemWidgetApiManifestElement extends PacemBearerWidgetElement {

        constructor(private _openapi = new Pacem.Cms.OpenApi.SwaggerCmsParser(), private _cache = new Pacem.Storage()) {
            super(buildWidgetMetadata(APIMANIFEST_METADATA));
        }

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) url: string;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Boolean }) usecache: boolean;

        @Watch({ converter: PropertyConverters.Json }) manifest: Pacem.Scaffolding.OpenApi.ApiManifest;

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'url':
                case 'editing':
                case 'editable':
                    this._scaffold();
                    break;
                case 'usecache':
                    this._openapi.cache = val ? this._cache : null;
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (this.usecache) {
                this._openapi.cache = this._cache;
            }
            this._scaffold();
        }

        private _scaffold() {
            if (this.editing && this.editable && !Utils.isNullOrEmpty(this.url)) {
                this.fetching = true;
                this._openapi.load(this.url).then(s => {
                    this.manifest = s;
                    this.fetching = false;
                }, _ => {
                    this.fetching = false;
                });
            }
        }

    }

}