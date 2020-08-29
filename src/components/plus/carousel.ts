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
        tagName: P + '-carousel', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${ P }-repeater datasource="{{ :host.datasource }}">
        <${ P }-slideshow class="${PCSS}-carousel" adapter="{{ ::adapter }}" index="{{ :host.index, twoway }}" on-load="this.focus()">

            <template>

                <${ P }-slide class="${PCSS}-carousel-item" css-class="{{ { '${PCSS}-carousel-previous': :host.isPrevious(^index, ::slideshow.index), '${PCSS}-carousel-next': :host.isNext(^index, ::slideshow.index), '${PCSS}-carousel-focus': ^index === ::slideshow.index } }}">
                <${ P }-a href="{{ ^item.url }}">
                    <${ P }-img disabled="{{ !:host.isCloseTo(^index, ::slideshow.index) }}" class="${PCSS}-carousel-splash" adapt="cover" src="{{ ^item.image }}"></${ P }-img>
                    <div class="${PCSS}-carousel-content">
                        <div class="${PCSS}-carousel-caption">
                            <h3><${ P }-text text="{{ ^item.title }}"></${ P }-text></h3>
                            <${ P }-panel class="paragraph" content="{{ ^item.content }}"></${ P }-panel>
                        </div>
                    </div>
                </${ P }-a>
                </${ P }-slide>

            </template>
        </${ P }-slideshow>
        
    </${ P }-repeater><${ P }-adapter pausable="{{ :host.pausable }}" class="${PCSS}-carousel-adapter" interval="{{ :host.interval }}"></${ P }-adapter>`
    })
    export class PacemCarouselElement extends UI.PacemAdaptedIterativeElement<CarouselDataItem> {

        @ViewChild(P + '-adapter') adapter: UI.PacemAdapterElement;
        @ViewChild(P + '-slideshow') slideshow: UI.PacemSlideshowElement;

        @Watch({ converter: PropertyConverters.Number}) interval: number = 4000;
        @Watch({ converter: PropertyConverters.Boolean}) pausable: boolean;
    }

}