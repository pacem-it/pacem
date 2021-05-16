/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
/// <reference path="char-counter.ts" />
namespace Pacem.Components.Scaffolding {
    
    @CustomElement({
        tagName: P + '-input-email',
        template: `<input type="email" class="${PCSS}-input ${PCSS}-viewfinder" />${CHAR_COUNTER_CHILD}<${P}-a class="${PCSS}-readonly" disabled="{{ $pacem.isNullOrEmpty(:host.value) }}" href="{{ \'mailto:\'+ :host.value }}"><${P}-text text="{{ :host.viewValue }}"></${P}-text></${P}-a>`, shadow: Defaults.USE_SHADOW_ROOT
    })
    export class PacemEmailInputElement extends PacemTextualInputElement {

        @ViewChild('input[type=email]') input: HTMLInputElement;
        @ViewChild(P + '-a') anchor: UI.PacemAnchorElement;

        protected toggleReadonlyView(readonly: boolean) {
            this.input.hidden = readonly;
            this.anchor.hidden = !readonly;
        }

        protected get inputFields(): HTMLInputElement[] {
            return [this.input];
        }

    }

}