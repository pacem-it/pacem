/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: P + '-slide'
    })
    export class PacemSlideElement extends PacemIterableElement {
        // whatever
    }

    @CustomElement({
        tagName: P + '-slideshow'
    })
    export class PacemSlideshowElement extends PacemIterativeElement<PacemSlideElement> {

        validate(item) {
            return item instanceof PacemSlideElement;
        }

    }
}