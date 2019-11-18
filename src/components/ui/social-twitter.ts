/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI.Social {
    
    @CustomElement({ tagName: P + '-tweetembed' })
    export class PacemTweetEmbedElement extends PacemElement {

        @Watch({ emit: false, converter: PropertyConverters.String }) tweetid: string;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'tweetid' && this._scriptsLoaded)
                this._render();
        }

        private _scriptsLoaded = false;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            CustomElementUtils.importjs('https://platform.twitter.com/widgets.js').then(() => {
                this._scriptsLoaded = true;
                this._render();
            });
        }

        private _render() {
            if (this.tweetid && this._scriptsLoaded) {
                twttr.ready(tw => tw.widgets.createTweet(this.tweetid, this));
            }
        }
    }

}