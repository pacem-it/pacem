/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.Scaffolding {

    export const CHAR_COUNTER_CHILD: string = `<${ P }-char-count hide="{{ :host.readonly || !(:host.minlength > 0 || :host.maxlength > 0) }}" minlength="{{ :host.minlength }}" maxlength="{{ :host.maxlength }}" string="{{ :host.value }}"></${ P }-char-count>`;

    @CustomElement({
        tagName: P + '-char-count',
        shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${ P }-panel class="${PCSS}-char-count" css-class="{{ {'valid': :host._isValid(:host.string), 'invalid': !:host._isValid(:host.string) } }}">
    <${ P }-span hide="{{ !(:host.minlength > 0) }}" class="${PCSS}-char-min" content="{{ :host.minlength }}"></${ P }-span>
    <${ P }-span class="${PCSS}-char-curr" content="{{ :host._length(:host.string) || '0' }}"></${ P }-span>
    <${ P }-span hide="{{ !(:host.maxlength > 0) }}" class="${PCSS}-char-max" content="{{ :host.maxlength }}"></${ P }-span>
</${ P }-panel>`
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