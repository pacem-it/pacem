/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Plus {

    export declare type CarouselDataItem = {
        image: string,
        title?: string,
        content?: string,
        url?: string
    };

    @CustomElement({
        tagName: 'pacem-carousel', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<pacem-repeater datasource="{{ :host.datasource }}">
        <pacem-slideshow class="pacem-carousel" adapter="{{ ::adapter }}" index="{{ :host.index, twoway }}" on-load="this.focus()">

            <template>

                <pacem-slide class="pacem-carousel-item" css-class="{{ { 'pacem-carousel-previous': :host.isPrevious(^index, ::slideshow.index), 'pacem-carousel-next': :host.isNext(^index, ::slideshow.index), 'pacem-carousel-focus': ^index === ::slideshow.index } }}">
                <pacem-a href="{{ ^item.url }}">
                    <pacem-img disabled="{{ !:host.isCloseTo(^index, ::slideshow.index) }}" class="pacem-carousel-splash" adapt="cover" src="{{ ^item.image }}"></pacem-img>
                    <div class="pacem-carousel-content">
                        <div class="pacem-carousel-caption">
                            <h3><pacem-text text="{{ ^item.title }}"></pacem-text></h3>
                            <pacem-panel class="paragraph" content="{{ ^item.content }}"></pacem-panel>
                        </div>
                    </div>
                </pacem-a>
                </pacem-slide>

            </template>
        </pacem-slideshow>
        
    </pacem-repeater><pacem-adapter pausable="{{ :host.pausable }}" class="pacem-carousel-adapter" interval="{{ :host.interval }}"></pacem-adapter>`
    })
    export class PacemCarouselElement extends UI.PacemAdaptedIterativeElement<CarouselDataItem> {

        @ViewChild('pacem-adapter') adapter: UI.PacemAdapterElement;
        @ViewChild('pacem-slideshow') slideshow: UI.PacemSlideshowElement;

        @Watch({ converter: PropertyConverters.Number}) interval: number = 4000;
        @Watch({ converter: PropertyConverters.Boolean}) pausable: boolean;
    }

}