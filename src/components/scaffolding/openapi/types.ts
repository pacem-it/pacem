/// <reference path="../../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../../dist/js/swagger-types.d.ts" />
namespace Pacem.Scaffolding.OpenApi {

    export declare type ApiEndpoint = {
        method: Pacem.Net.HttpMethod,
        path: string,
        parameters: ApiParameter[],
        response?: ApiResponse
    }

    export declare type Parameter = {
        name: string,
        required: boolean
    }

    export declare type Schema = {
        meta?: OpenApiSwagger.Schema,
        fullType?: string,
        fields?: DataField[]
    };

    export interface ApiParameter extends Parameter, Schema {
        type?: ApiParameterType
    };

    export enum ApiParameterType {
        String = 'string', Number = 'number', Datetime = 'datetime', Boolean = 'boolean', Binary = 'binary', Object = 'object'
    }

    export interface DataField extends PropertyMetadata {
        props?: DataField[]
    }

    export interface ApiResponse extends Schema {
        type: string
    }

    export declare type ApiManifest = {
        definitions: { [name: string]: OpenApiSwagger.Schema },
        endpoints: ApiEndpoint[],
        baseUrl: string
    }

    export declare type PagedSet<T> = {
        set: T[],
        skip: number,
        take: number,
        total: number,
        size: number
    };

    export interface ApiParser {

        parse(content: any): ApiManifest;
        load(url: string): Promise<ApiManifest>;
    }

    const $refPattern = /^#\/definitions\/(.+)$/;
    export function getOpenApiDefinition(manifest: ApiManifest, $ref: string): { name: string, schema: OpenApiSwagger.Schema } {
        var rec = $refPattern.exec($ref);
        if (rec && rec.length > 1) {
            return { name: rec[1], schema: manifest.definitions[rec[1]] };
        }
        return null;
    }
}
