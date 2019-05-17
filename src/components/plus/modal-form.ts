/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-scaffolding.d.ts" />
namespace Pacem.Components.Plus {

    // TODO: use onewaytosource as a binding mode
    @CustomElement({
        tagName: P + '-modal-form', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${ P }-lightbox modal="true">
        <${ P }-form on-submit=":host._onSubmit($event)" action="{{ :host.action }}" entity="{{ :host.state }}" on-success=":host._broadcast($event)" on-fail=":host._broadcast($event)"
            success="{{ :host.success, twoway }}" fail="{{ :host.fail, twoway }}">
            <${ P}-repeater datasource="{{ :host.metadata && (:host.metadata.props || :host.metadata) }}" class="${PCSS}-animatable-list ${PCSS}-list-bottom">
                <${P}-panel css="{{ :host.metadata && :host.metadata.display && :host.metadata.display.css }}" css-class="{{ :host.metadata && :host.metadata.display && :host.metadata.display.cssClass }}">
                    <template>
                        <${ P}-form-field css-class="{{ ^item.display && ^item.display.cssClass }}" css="{{ ^item.display && ^item.display.css }}"
                                          fetch-headers="{{ :host.fetchHeaders }}" fetch-credentials="{{ :host.fetchCredentials }}"
                                          entity="{{ :host.state, twoway }}" metadata="{{ ^item }}"></${ P }-form-field>
                    </template>
                </${P}-panel>
            </${ P }-repeater>
        </${ P }-form>
        <${ P}-fetch method="${Pacem.Net.HttpMethod.Post}" headers="{{ :host.fetchHeaders }}" credentials="{{ :host.fetchCredentials }}"></${ P }-fetch> 
    <div class="${PCSS}-dialog-buttons">
        <${ P }-button on-click=":host._submit($event)"
            class="button primary" disabled="{{ !(::_form.valid && ::_form.dirty) || ::_fetcher.fetching }}">Ok</${ P }-button>
        <${ P }-button on-click=":host._cancel($event)" class="button" disabled="{{ ::_fetcher.fetching }}">Cancel</${ P }-button>
    </div>
    <${ P }-loader type="{{ :host.loaderType }}" class="${PCSS}-hover loader-primary loader-small" active="{{ ::_fetcher.fetching }}"></${ P }-loader>
</${ P }-lightbox>`
    })
    export class PacemModalFormElement extends UI.PacemDialogBase implements Pacem.Net.OAuthFetchable {
        
        @Watch()
        metadata: Pacem.Scaffolding.TypeMetadata | Scaffolding.PropertyMetadata[];

        @Watch({ converter: PropertyConverters.String })
        action: string;

        @Watch({ converter: PropertyConverters.String })
        loaderType: UI.LoaderType;

        @Watch({ converter: PropertyConverters.Boolean })
        success: boolean;

        @Watch({ converter: PropertyConverters.Boolean })
        fail: boolean;

        @Watch({ emit: false, converter: PropertyConverters.Json })
        fetchHeaders: { [key: string]: string };

        @Watch({ emit: false, converter: PropertyConverters.String })
        fetchCredentials: RequestCredentials;

        @ViewChild(P + '-lightbox') protected lightbox: UI.PacemLightboxElement;
        @ViewChild(P + '-form') private _form: Scaffolding.PacemFormElement;
        @ViewChild(P + '-fetch') private _fetcher: PacemFetchElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            // HACK: move the buttons outside the .pacem-scrollable element in the lightbox
            var lightboxCore = this.querySelector(`.${PCSS}-lightbox`);
            lightboxCore.appendChild(
                this.querySelector(`.${PCSS}-dialog-buttons`)
            );
            lightboxCore.appendChild(
                this.querySelector(P + '-loader')
            );
        }

        private _submit(evt: Event) {
            Pacem.avoidHandler(evt);
            if (Utils.isNullOrEmpty(this.action)) {
                this.commit(UI.DialogButton.Ok, evt);
            } else {
                this._form.submit(this._fetcher).then(v => {
                    this.state = v;
                    this.commit(UI.DialogButton.Ok, evt);
                }, r => {
                    // do nothing
                });
            }
        }

        private _onSubmit(evt: Scaffolding.FormSubmitEvent) {
            // no need to broadcast, event bubbles itself...
            // ...just handle it using the eventual listeners:
            this.emit(evt);
        }

        open(state) {
            var retval = super.open(state);
            this._form.setPristine();
            return retval;
        }

        private _cancel(evt: Event) {
            this.commit(UI.DialogButton.Cancel, evt);
        }

        private _broadcast(evt: CustomEvent) {
            this.dispatchEvent(new CustomEvent(evt.type, { detail: evt.detail }));
        }
    }

}