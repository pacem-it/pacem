/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.Scaffolding {

    export const CHAR_COUNTER_CHILD: string = `<pacem-char-count hide="{{ :host.readonly || !(:host.minlength > 0 || :host.maxlength > 0) }}" minlength="{{ :host.minlength }}" maxlength="{{ :host.maxlength }}" string="{{ :host.value }}"></pacem-char-count>`;

    @CustomElement({
        tagName: 'pacem-char-count',
        shadow: Defaults.USE_SHADOW_ROOT,
        template: `<pacem-panel class="pacem-char-count" css-class="{{ {'valid': :host._isValid(:host.string), 'invalid': !:host._isValid(:host.string) } }}">
    <pacem-span hide="{{ !(:host.minlength > 0) }}" class="pacem-char-min" content="{{ :host.minlength }}"></pacem-span>
    <pacem-span class="pacem-char-curr" content="{{ :host._length(:host.string) }}"></pacem-span>
    <pacem-span hide="{{ !(:host.maxlength > 0) }}" class="pacem-char-max" content="{{ :host.maxlength }}"></pacem-span>
</pacem-panel>`
    })
    export class PacemCharCountElement extends PacemElement {

        @Watch({ converter: PropertyConverters.Number }) minlength: number;
        @Watch({ converter: PropertyConverters.Number }) maxlength: number;
        @Watch({ converter: PropertyConverters.String }) string: string;

        private _isValid(v: string): boolean {
            const l = this._length(v);
            if (this.minlength > 0 && l < this.minlength)
                return false;
            if (this.maxlength > 0 && l > this.maxlength)
                return false;
            return true;
        }

        private _length(s: string) {
            return (s && s.length) || 0;
        }
    }

}