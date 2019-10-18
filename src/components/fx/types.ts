/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Fx {

    export abstract class PacemFxElement extends PacemEventTarget {

        @Watch({ converter: Pacem.PropertyConverters.Element }) target: HTMLElement;

    }

}