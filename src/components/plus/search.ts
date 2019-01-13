/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="../../../dist/js/pacem-scaffolding.d.ts" />
namespace Pacem.Components.Plus {

    @CustomElement({
        tagName: 'pacem-search', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<pacem-fetch debounce="800" url="{{ :host.url }}" method="{{ :host.method }}">
</pacem-fetch><pacem-input-search value="{{ :host.hint, twoway }}"></pacem-input-search>
<pacem-repeater datasource="{{ ::_fetch.result }}">
    <pacem-content></pacem-content>
</pacem-repeater>`
    })
    export class PacemSearchElement extends PacemElement implements OnPropertyChanged{

        @ViewChild('pacem-fetch') private _fetcher: Pacem.Components.PacemFetchElement;

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