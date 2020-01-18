/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-scaffolding.d.ts" />
namespace Pacem.Components.Plus {

    // TODO: use onewaytosource as a binding mode
    @CustomElement({
        tagName: P + '-modal-form', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-lightbox modal="true" logger="{{ :host.logger }}"><${P}-form wrapper>
        <${P}-form logger="{{ :host.logger }}" on-submit=":host._onSubmit($event)" readonly="{{ :host.readonly }}" entity="{{ :host.state, twoway }}" on-success=":host._broadcast($event)" 
            on-fail=":host._broadcast($event)" success="{{ :host.success, twoway }}" fail="{{ :host.fail, twoway }}" autogenerate="{{ !Pacem.Utils.isNull($this.entity) }}" metadata="{{ :host.metadata }}"
            fetch-headers="{{ :host.fetchHeaders }}" fetch-credentials="{{ :host.fetchCredentials }}"></${P}-form></${P}-form>
        <${P}-fetch logger="{{ :host.logger }}" method="{{ :host.method }}" headers="{{ :host.fetchHeaders }}" credentials="{{ :host.fetchCredentials }}" autofetch="false" url="{{ :host.action }}"></${P}-fetch> 
    <div class="${PCSS}-dialog-buttons ${PCSS}-buttonset buttons">
        <div class="buttonset-left">
        <${P}-button on-click=":host._submit($event)"
            class="button primary button-size size-small" disabled="{{ !:host.readonly && (!(::_form.valid && ::_form.dirty) || ::_fetcher.fetching) }}"><${P}-text text="{{ :host.okCaption }}"></${P}-text></${P}-button>
        <${P}-button on-click=":host._cancel($event)" hide="{{ :host.readonly }}" class="button button-size size-small" disabled="{{ ::_fetcher.fetching }}"><${P}-text text="{{ :host.cancelCaption }}"></${P}-text></${P}-button>
    </div></div>
    <${P}-panel class="${PCSS}-dialog-heading">
        <${P}-content></${P}-content>
    </${P}-panel>
    <${P}-loader type="{{ :host.loaderType }}" class="${PCSS}-hover loader-primary loader-small" active="{{ ::_fetcher.fetching }}"></${P}-loader>
</${P}-lightbox>`
    })
    export class PacemModalFormElement extends UI.PacemDialogBase implements Pacem.Net.OAuthFetchable {

        @Watch({ reflectBack: true, converter: PropertyConverters.String }) okCaption: string = 'OK';
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) cancelCaption: string = 'Cancel';
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) method: Pacem.Net.HttpMethod = Pacem.Net.HttpMethod.Post;

        @Watch({ converter: PropertyConverters.Json })
        metadata: Pacem.Scaffolding.TypeMetadata | Scaffolding.PropertyMetadata[];

        @Watch({ converter: PropertyConverters.String })
        action: string;

        @Watch({ converter: PropertyConverters.String })
        loaderType: UI.LoaderType;

        @Watch({ converter: PropertyConverters.Boolean })
        success: boolean;

        @Watch({ converter: PropertyConverters.Boolean })
        fail: boolean;

        @Watch({ converter: PropertyConverters.Boolean })
        readonly: boolean;

        @Watch({ converter: PropertyConverters.Json })
        fetchHeaders: { [key: string]: string };

        @Watch({ converter: PropertyConverters.String })
        fetchCredentials: RequestCredentials;

        @ViewChild(P + '-lightbox') protected lightbox: UI.PacemLightboxElement;
        @ViewChild(P + '-form[entity]') private _form: Scaffolding.PacemFormElement;
        @ViewChild(P + '-fetch') private _fetcher: PacemFetchElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            // HACK: move the buttons outside the .pacem-scrollable element in the lightbox
            var lightboxCore = this.querySelector(`.${PCSS}-lightbox`);
            lightboxCore.appendChild(
                this._buttons = this.querySelector(`.${PCSS}-dialog-buttons`)
            );
            lightboxCore.appendChild(
                this.querySelector(`.${PCSS}-dialog-heading`)
            );
            lightboxCore.appendChild(
                this.querySelector(P + '-loader')
            );

            this.dispatchEvent(new PropertyChangeEvent({ propertyName: 'modalButtons', currentValue: this.modalButtons }));
        }

        private _submit(evt: Event) {
            if (this.readonly) {
                this.commit(UI.DialogButton.Ok, evt);
            } else {

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
        }

        private _onSubmit(evt: Scaffolding.FormSubmitEvent) {
            // no need to broadcast, event bubbles itself...
            // ...just handle it using the eventual listeners:
            this.emit(evt);
        }

        open(state) {
            if (Utils.isNull(state)) {
                throw `The state of a ${PacemModalFormElement} cannot be null.`;
            }
            var retval = super.open(state);
            this._form.setPristine();
            return retval;
        }

        private _cancel(evt: Event) {
            this.commit(UI.DialogButton.Cancel, evt);
            this._form.reset();
        }

        private _broadcast(evt: CustomEvent) {
            this.dispatchEvent(new CustomEvent(evt.type, { detail: evt.detail }));
        }

        private _buttons: Element;
        /** Gets the 'ok' and 'cancel' modal buttons. */
        get modalButtons() {
            const btns = this._buttons;
            return {
                ok: btns && btns.firstElementChild && btns.firstElementChild.firstElementChild,
                cancel: btns && btns.firstElementChild && btns.firstElementChild.lastElementChild
            }
        }
    }

}