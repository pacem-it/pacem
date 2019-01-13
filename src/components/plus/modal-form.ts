/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-scaffolding.d.ts" />
namespace Pacem.Components.Plus {

    // TODO: use onewaytosource as a binding mode
    @CustomElement({
        tagName: 'pacem-modal-form', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<pacem-lightbox modal="true">
        <pacem-form on-submit=":host._onSubmit($event)" action="{{ :host.action }}" entity="{{ :host.state }}" on-success=":host._broadcast($event)" on-fail=":host._broadcast($event)"
            success="{{ :host.success, twoway }}" fail="{{ :host.fail, twoway }}">
            <pacem-repeater datasource="{{ :host.metadata }}" class="pacem-animatable-list pacem-list-bottom">
                <template>
                    <pacem-form-field entity="{{ :host.state, twoway }}" metadata="{{ ^item }}"></pacem-form-field>
                </template>
            </pacem-repeater>
        </pacem-form>
        <pacem-fetch method="${Pacem.Net.HttpMethod.Post}" headers="{{ :host.fetchHeaders || {} }}"></pacem-fetch> 
    <div class="pacem-dialog-buttons">
        <pacem-button on-click=":host._submit($event)"
            class="button primary" disabled="{{ !(::_form.valid && ::_form.dirty) || ::_fetcher.fetching }}">Ok</pacem-button>
        <pacem-button on-click=":host._cancel($event)" class="button" disabled="{{ ::_fetcher.fetching }}">Cancel</pacem-button>
    </div>
    <pacem-loader type="{{ :host.loaderType }}" class="pacem-hover loader-primary loader-small" active="{{ ::_fetcher.fetching }}"></pacem-loader>
</pacem-lightbox>`
    })
    export class PacemModalFormElement extends UI.PacemDialogBase implements OnViewActivated, OnPropertyChanged {
        
        @Watch()
        metadata: Scaffolding.PropertyMetadata[];

        @Watch({ converter: PropertyConverters.String })
        action: string;

        @Watch({ converter: PropertyConverters.String })
        loaderType: UI.LoaderType;

        @Watch({ converter: PropertyConverters.Boolean })
        success: boolean;

        @Watch({ converter: PropertyConverters.Boolean })
        fail: boolean;

        @Watch()
        fetchHeaders: any;

        @ViewChild('pacem-lightbox') protected lightbox: UI.PacemLightboxElement;
        @ViewChild('pacem-form') private _form: Scaffolding.PacemFormElement;
        @ViewChild('pacem-fetch') private _fetcher: PacemFetchElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            // HACK: move the buttons outside the .pacem-scrollable element in the lightbox
            var lightboxCore = this.querySelector('.pacem-lightbox');
            lightboxCore.appendChild(
                this.querySelector('.pacem-dialog-buttons')
            );
            lightboxCore.appendChild(
                this.querySelector('pacem-loader')
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