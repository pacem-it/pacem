/// <reference path="types.ts" />
/// <reference path="utils.ts" />
/// <reference path="../contenteditable.ts" />
namespace Pacem.Components.Scaffolding {

    function getAlignIcon(align: string) {
        return 'format_align_' + align;
    }

    @CustomElement({
        tagName: P + '-contenteditable-aligncommand', shadow: Defaults.USE_SHADOW_ROOT,
        template: CONTENTELEMENT_BUTTONCOMMAND_TEMPLATE
    })
    export class PacemContenteditableAlignCommandElement extends PacemContenteditableButtonCommandElement {

        isRelevant(range: Range): boolean {
            const els = ContenteditableUtils.findSurroundingSiblingBlockElements(range);
            if (Utils.isNullOrEmpty(els)) {
                return false;
            }
            const el = els[0],
                textAlign = getComputedStyle(el).textAlign;
            return textAlign == this.align;
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'align') {
                if (Utils.isNullOrEmpty(this.icon) || this.icon === getAlignIcon(old)) {
                    this.icon = getAlignIcon(val);
                }
                if (Utils.isNullOrEmpty(this.altText) || this.altText === old) {
                    this.altText = val;
                }
            }
        }

        @Watch({ converter: PropertyConverters.String }) align: 'left' | 'right' | 'center' | 'justify';

        exec() {
            const elements = ContenteditableUtils.findSurroundingSiblingBlockElements(this.range);
            let targetAlign: string;
            for (let el of elements) {
                if (ContenteditableUtils.isBlockElement(el) && el instanceof HTMLElement) {

                    // normalize alignment: pick one element (the 1st one) to rule them all
                    if (Utils.isNull(targetAlign)) {
                        targetAlign = Utils.hasClass(el, 'text-' + this.align) ? '' : this.align;
                    }

                    el.style.textAlign = '';
                    Utils.removeClass(el, 'text-left text-right text-center text-justify');
                    if (!Utils.isEmpty(targetAlign)) {
                        Utils.addClass(el, 'text-' + targetAlign);
                    }
                }
            }
            return Promise.resolve();
        }
    }
}