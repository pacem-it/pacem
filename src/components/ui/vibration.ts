/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({ tagName: P + '-vibrate' })
    export class PacemVibrateElement extends PacemEventTarget {

        @Watch({
            emit: false, converter: {
                convert: (attr) => attr.split(',').map(i => parseInt(i)),
                convertBack: (prop) => prop.join(',')
            }
        }) pattern: number[]; 

        vibrate() {
            if (this.disabled) {
                return;
            }
            const pattern = this.pattern;
            if (!Utils.isNullOrEmpty(pattern)) {
                if (typeof navigator.vibrate === 'function') {
                    navigator.vibrate(pattern);
                }
            }
        }
    }


}