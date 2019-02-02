/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="../../../dist/js/pacem-scaffolding.d.ts" />
namespace Pacem.Components.Plus {

    @CustomElement({
        tagName: P + '-search', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${ P }-fetch debounce="800" url="{{ :host.url }}" method="{{ :host.method }}">
</${ P }-fetch><${ P }-input-search value="{{ :host.hint, twoway }}"></${ P }-input-search>
<${ P }-repeater datasource="{{ ::_fetch.result }}">
    <${ P }-content></${ P }-content>
</${ P }-repeater>`
    })
    export class PacemSearchElement extends PacemElement implements OnPropertyChanged{

        @ViewChild(P + '-fetch') private _fetcher: Pacem.Components.PacemFetchElement;

        @Watch() datasource: any[];
        @Watch({ converter: PropertyConverters.String }) hint: string;
        @Watch({ converter: PropertyConverters.String }) url: string;
        @Watch({ converter: PropertyConverters.String }) method: Pacem.Net.HttpMethod;
        @Watch({ emit: false, converter: PropertyConverters.String }) hintParameter: string = 'q';

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'hint') {
                let params = {};
                params[this.hintParameter] = val;
                this._fetcher.parameters = params;
            }
        }
    }

}