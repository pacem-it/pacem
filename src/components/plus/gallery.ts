/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.Plus {

    export declare type GalleryDataItem = {
        image: string,
        caption?: string
    };

    @CustomElement({
        tagName: P + '-gallery', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${ P }-lightbox class="${PCSS}-gallery">
    <${ P }-repeater datasource="{{ :host.datasource }}">
        <${ P }-slideshow adapter="{{ ::_adapter }}" index="{{ :host.index, twoway }}">
        <template>
            <${ P }-slide class="${PCSS}-gallery-item"
css-class="{{ { '${PCSS}-gallery-previous': :host.isPrevious(^index, ::_slideshow.index), '${PCSS}-gallery-next': :host.isNext(^index, ::_slideshow.index), '${PCSS}-gallery-focus': ^index === ::_slideshow.index } }}"
>
            <${ P }-img src="{{ ^item.image }}" disabled="{{ !(:host.isCloseTo(^index, ::_slideshow.index) || ^index === ::_slideshow.index) }}" 
css="{{ {'visibility': (:host._poppingUp ? 'hidden' : ''), 'transition': (:host._poppingUp ? 'none' : '')} }}" class="${PCSS}-gallery-splash" adapt="contain"></${ P }-img>
            </${ P }-slide>
        </template>
        </${ P }-slideshow>
    </${ P }-repeater>
<${ P }-adapter class="${PCSS}-gallery-adapter"></${ P }-adapter>
</${ P }-lightbox><div class="${PCSS}-gallery-hero-target"></div>`
    })
    export class PacemGalleryElement extends UI.PacemAdaptedIterativeElement<GalleryDataItem> {

        @ViewChild(P + '-adapter') private _adapter: UI.PacemAdapterElement;
        @ViewChild(P + '-lightbox') private _lightbox: UI.PacemLightboxElement;
        @ViewChild(P + '-slideshow') private _slideshow: UI.PacemSlideshowElement;
        @ViewChild(`.${PCSS}-gallery-hero-target`) private _heroPlaceholder: HTMLElement;

        @Watch() private _poppingUp: boolean;

        get adapter() {
            return this._adapter;
        }
        
        private _heroAnimate(fromEl?: HTMLElement, src?: string): PromiseLike<{}> {
            var deferred = DeferPromise.defer();
            if (Utils.isNull(fromEl)) {
                deferred.resolve();
            } else {

                let pImg = <UI.PacemImageElement>document.createElement(P + '-img');
                let goalEl = this._heroPlaceholder;
                const TRANSITION = 300;

                let fn = () => {

                    pImg.style.transform = '';
                    if (/*current.left === goal.left && current.top === goal.top &&*/ (Date.now() - start) > TRANSITION) {
                        deferred.resolve();
                        pImg.remove();
                    } else {
                        requestAnimationFrame(fn);
                    }

                };
                
                pImg.src = src || /* assuming an img-ish element */ fromEl['src'];
                pImg.adapt = 'contain';
                
                let goal = Utils.offset(goalEl),
                    from = Utils.offset(fromEl),
                    style = pImg.style;

                const cfrStyle = getComputedStyle(goalEl);
                style.border = cfrStyle.border;
                style.width = goalEl.clientWidth+'px';
                style.height = goalEl.clientHeight + 'px';
                style.position = 'absolute';
                style.top = goal.top + 'px';
                style.left = goal.left + 'px';

                const scaleX = fromEl.clientWidth / goalEl.clientWidth,
                    scaleY = fromEl.clientHeight / goalEl.clientHeight,
                    translateX = (from.left - goal.left) + 'px',
                    translateY = (from.top - goal.top) + 'px';

                style.transformOrigin = '0 0';
                style.transition = `transform cubic-bezier(0.445, 0.05, 0.55, 0.95) ${TRANSITION}ms, opacity ${TRANSITION}ms`;
                style.transform = `translate(${translateX}, ${translateY}) scale(${scaleX}, ${scaleY})`;
                document.body.appendChild(pImg);

                const start = Date.now();
                requestAnimationFrame(fn);
            }

            return deferred.promise;
        }

        open(startIndex: number, heroFrom?: HTMLElement, src?: string) {
            this._poppingUp = true;
            this._lightbox.show = true;
            this._slideshow.index = startIndex; // reflects on 'this' (twoway)
            this._heroAnimate(heroFrom)
                .then(_ => {
                    this._poppingUp = false;
                    this._slideshow.focus();
                })
        }
    }

}