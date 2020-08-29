/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    @CustomElement({ tagName: P + '-audio' })
    export class PacemAudioElement extends PacemEventTarget {

        @Watch({ emit: false, converter: PropertyConverters.String }) src: string;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) stream: boolean;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) autoplay: boolean;

        // TODO: structure a proper MediaElement hierarchy (share logic with a future VideoElement)
        /** @readonly */
        // @Watch({ converter: PropertyConverters.Boolean }) duration: number;

        #audio: HTMLAudioElement;
        #canPlay: boolean;
        #canPlayThrough: boolean;

        connectedCallback() {
            super.connectedCallback();
            const a = this.#audio = new Audio();
            a.addEventListener('canplay', this._canPlayHandler, false);
            a.addEventListener('ended', this._endedHandler, false);
            a.addEventListener('canplaythrough', this._canPlayThroughHandler, false);
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (!first) {
                switch (name) {
                    case 'src':
                        this._init();
                        break;
                }
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._init();
        }

        disconnectedCallback() {
            const a = this.#audio;
            a.removeEventListener('ended', this._endedHandler, false);
            a.removeEventListener('canplaythrough', this._canPlayThroughHandler, false);
            a.removeEventListener('canplay', this._canPlayHandler, false);
            super.disconnectedCallback();
        }

        play() {

            // sudden exit when disabled
            if (this.disabled) {
                return Promise.reject('disabled');
            }

            return this.#audio.play().then(_ => {
                this.dispatchEvent(new Event('start'));
            },
            e => {
                this.dispatchEvent(new CustomEvent('error', { detail: e }));
            });
        }

        pause() {
            this.#audio.pause();
        }

        reset() {
            this.#audio.load();
        }

        private get _canPlay() {
            return this.stream && this.#canPlay || this.#canPlayThrough;
        }

        private _endedHandler = (e: Event) => {
            this.dispatchEvent(new Event('end'));
        };

        private _canPlayHandler = (e: Event) => {
            this.#canPlay = true;
            this._autoplay();
        };

        private _canPlayThroughHandler = (e: Event) => {
            this.#canPlayThrough = true;
            this._autoplay();
        };

        private _autoplay() {
            if (this.autoplay) {
                if (this._canPlay) {
                    this.play();
                }
            }
        }

        private _init(src = this.src) {
            const audio = this.#audio;
            this.#canPlay =
                this.#canPlayThrough = false;
            audio.src = src;
        }
    }

}