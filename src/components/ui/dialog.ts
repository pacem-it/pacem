/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    export enum DialogButtons {
        YesNo = 'yesno',
        YesNoCancel = 'yesnocancel',
        Ok = 'ok',
        OkCancel = 'okcancel'
    }

    export enum DialogButton {
        Yes = 'yes',
        No = 'no',
        Cancel = 'cancel',
        Ok = 'ok'
    }

    export declare type DialogResultEventArgs = {
        button: DialogButton,
        state?: any
    };

    export const DialogResultEventName = 'commit';

    export class DialogResultEvent extends CustomTypedEvent<DialogResultEventArgs> {

        constructor(args: DialogResultEventArgs) {
            super(DialogResultEventName, args);
        }

    }

    export abstract class PacemDialogBase extends PacemEventTarget {

        @Watch() state: any;

        protected abstract get lightbox(): PacemLightboxElement;

        private _deferred: any;
        open(state?: any): PromiseLike<DialogResultEventArgs> {
            const lb = this.lightbox;
            if (!Utils.isNull(this._deferred))
                throw `${PacemDialogElement.name} already open.`;
            this.dispatchEvent(new Event('open'));
            this._deferred = DeferPromise.defer<DialogResultEventArgs>();
            lb.show = true;
            this.state = state;
            return this._deferred.promise;
        }

        protected commit(btn: DialogButton, evt: Event) {
            Pacem.avoidHandler(evt);
            var drevt = new DialogResultEvent({ button: btn, state: this.state });
            this.lightbox.show = false;
            this._deferred.resolve(drevt.detail);
            this._deferred = null;
            this.dispatchEvent(drevt);
        }
    }

    @CustomElement({
        tagName: 'pacem-dialog', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<pacem-lightbox modal="true">
    <pacem-content></pacem-content>
    <div class="pacem-dialog-buttons">
        <pacem-button class="button primary" on-click=":host.commit('ok', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons !== 'ok' && :host.buttons !== 'okcancel' }}" class="pacem-ok"><pacem-text text="{{ :host.okCaption }}"></pacem-text></pacem-button>
        <pacem-button class="button" on-click=":host.commit('yes', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons === 'ok' || :host.buttons === 'okcancel' }}" class="pacem-yes"><pacem-text text="{{ :host.yesCaption }}"></pacem-text></pacem-button>
        <pacem-button class="button" on-click=":host.commit('no', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons !== 'yesno' && :host.buttons !== 'yesnocancel' }}" class="pacem-no"><pacem-text text="{{ :host.noCaption }}"></pacem-text></pacem-button>
        <pacem-button class="button" on-click=":host.commit('cancel', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons !== 'yesnocancel' && :host.buttons !== 'okcancel' }}" class="pacem-cancel"><pacem-text text="{{ :host.cancelCaption }}"></pacem-text></pacem-button>
    </div>
</pacem-lightbox>`
    })
    export class PacemDialogElement extends PacemDialogBase implements OnPropertyChanged, OnViewActivated {

        @Watch({ converter: PropertyConverters.String }) buttons: DialogButtons = DialogButtons.Ok;
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) okCaption: string = 'OK';
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) yesCaption: string = 'Yes';
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) noCaption: string = 'No';
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) cancelCaption: string = 'Cancel';

        @ViewChild('pacem-button.pacem-ok') private okButton: PacemButtonElement;
        @ViewChild('pacem-button.pacem-yes') private yesButton: PacemButtonElement;
        @ViewChild('pacem-button.pacem-no') private noButton: PacemButtonElement;
        @ViewChild('pacem-button.pacem-cancel') private cancelButton: PacemButtonElement;
        @ViewChild('.pacem-dialog-buttons') private _buttons: PacemButtonElement;
        @ViewChild('pacem-lightbox') protected lightbox: PacemLightboxElement;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'buttons':
                    //
                    break;
            }
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            // HACK: move the buttons outside the .pacem-scrollable element in the lightbox
            requestAnimationFrame(() => {
                const elFrom = this.lightbox && this.lightbox.container;
                if (!Utils.isNull(elFrom)) {
                    elFrom.appendChild(this._buttons);
                } else {
                    this.log(Logging.LogLevel.Warn, `Could not find the lightbox container as expected.`);
                }
            });
        }
    }

}