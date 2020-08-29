/// <reference path="../../../../dist/js/swagger-types.d.ts" />
namespace Pacem.Scaffolding.OpenApi {

    const ApiMethod = Pacem.Net.HttpMethod;

    export class SwaggerParser implements ApiParser {

        async load(url: string, headers?: { [name: string]: string }): Promise<ApiManifest> {
            let resp = await fetch(url, {
                mode: 'cors', credentials: 'omit', headers: headers
            });
            try {
                let json: OpenApiSwagger.Spec = await resp.json();
                return this.parse(json, url);
            } catch (e) {
                return null;
            }
        }

        private _findDefinitionName(definitionHashTag: string) {
            var pattern = /#\/definitions\/(.+)/;
            var arr = pattern.exec(definitionHashTag);
            if (arr == null || arr.length < 2)
                return definitionHashTag;
            return arr[1];
        }

        parse(content: any, url?: string): ApiManifest {
            let j: any = content;
            if (typeof j === 'string') {
                j = JSON.parse(j);
            }
            const json: OpenApiSwagger.Spec = j;
            let definitions: { [name: string]: OpenApiSwagger.Schema } = {};
            for (let def in json.definitions) {
                let name = this._findDefinitionName(def);
                definitions[name] = json.definitions[def];
            }

            let baseUrl = '';
            if (json.host && json.schemes.length > 0) {
                baseUrl = json.schemes[0] + '://' + json.host + json.basePath;
            } else if (url) {
                // add scheme, host and basePath just-in-case
                let parsed = /^(https?):\/\/([^\/]+)/.exec(url);
                if (parsed && parsed.length) {
                    if (!(json.schemes) && parsed.length > 1) {
                        json.schemes = [parsed[1]];
                    }
                    if (!json.host && parsed.length > 2) {
                        json.host = parsed[2];
                        json.basePath = '';
                    }
                    baseUrl = parsed[0];
                }
            } else {
                console.warn('Not able to find a base url from the OpenApi specs.');
            }

            let retval: ApiManifest = { endpoints: [], definitions: definitions, baseUrl: baseUrl };
            for (let path in json.paths) {
                let src = json.paths[path];
                for (let method of [ApiMethod.Get, ApiMethod.Delete, ApiMethod.Post, ApiMethod.Put]) {
                    let op = src[method.toLowerCase()];
                    if (op) {
                        let endpoint: ApiEndpoint = this._tryGetEndpoint(json, op, path, method);
                        retval.endpoints.push(endpoint);
                    }
                }
            }
            return retval;
        }

        private _tryGetEndpoint(json: OpenApiSwagger.Spec, op: OpenApiSwagger.Operation, path: string, method: Pacem.Net.HttpMethod): ApiEndpoint {
            return {
                response: this._tryGetResponse(json, op),
                path: path,
                method: method,
                parameters: this._tryGetParameters(json, op)
            }
        }

        private _translateType(type: string, format: string): ApiParameterType {
            switch (type) {
                case 'number':
                case 'integer':
                    return ApiParameterType.Number;
                case 'boolean':
                    return ApiParameterType.Boolean;
                case 'string':
                    switch (format) {
                        case 'date':
                        case 'date-time':
                            return ApiParameterType.Datetime;
                        case 'byte':
                            return ApiParameterType.Binary;
                        case 'binary':
                            throw `Binary octets not supported.`;
                    }
                    return ApiParameterType.String;
            }
            return ApiParameterType.String;
        }

        private _tryGetParameters(json: OpenApiSwagger.Spec, operation: OpenApiSwagger.Operation) {
            return (operation.parameters || []).map(p => {
                const pb = p as OpenApiSwagger.BaseParameter;
                let retval: ApiParameter = {
                    name: pb.name,
                    required: pb.required || false
                };
                let type = (<OpenApiSwagger.QueryParameter>p).type;
                if ((<OpenApiSwagger.BodyParameter>p).schema) {
                    let pbody = <OpenApiSwagger.BodyParameter>p;
                    retval.type = ApiParameterType.Object;
                    let name = retval.fullType = this._findDefinitionName(pbody.schema.$ref);
                    retval.meta = json.definitions[name];
                } else if (type) {
                    retval.type = this._translateType(type, (<OpenApiSwagger.QueryParameter>p).format);
                }
                return retval;
            });
        }

        private _tryGetResponse(json: OpenApiSwagger.Spec, operation: OpenApiSwagger.Operation): ApiResponse {
            let ok = <OpenApiSwagger.Response>operation.responses['200'];
            if (!ok || !ok.schema) return null;
            let type = ok.schema.type || 'object',
                meta: OpenApiSwagger.Schema,
                name;
            if (ok.schema.$ref) {
                name = this._findDefinitionName(ok.schema.$ref);
                meta = json.definitions[name];
            } else {
                meta = ok.schema;
                if (ok.schema.items) {
                    if (ok.schema.items.hasOwnProperty('$ref')) {
                        name = this._findDefinitionName((<OpenApiSwagger.Schema>ok.schema.items).$ref);
                        meta = json.definitions[name];
                    } else {
                        meta = <OpenApiSwagger.Schema>ok.schema.items;
                    }
                }
            }

            return { type: type, fullType: name, meta: meta };
        }
    }
}