/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({
        tagName: 'pacem-slide'
    })
    export class PacemSlideElement extends PacemIterableElement {
        // whatever
    }

    @CustomElement({
        tagName: 'pacem-slideshow'
    })
    export class PacemSlideshowElement extends PacemIterativeElement<PacemSlideElement> implements OnPropertyChanged {

        validate(item) {
            return item instanceof PacemSlideElement;
        }

    }
}