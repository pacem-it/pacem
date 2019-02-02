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
        tagName: P + '-dialog', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-lightbox modal="true">
    <${ P}-content></${P}-content>
    <div class="${PCSS}-dialog-buttons">
        <${ P}-button class="button primary" on-click=":host.commit('ok', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons !== 'ok' && :host.buttons !== 'okcancel' }}" class="${PCSS}-ok"><${P}-text text="{{ :host.okCaption }}"></${P}-text></${P}-button>
        <${ P}-button class="button" on-click=":host.commit('yes', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons === 'ok' || :host.buttons === 'okcancel' }}" class="${PCSS}-yes"><${P}-text text="{{ :host.yesCaption }}"></${P}-text></${P}-button>
        <${ P}-button class="button" on-click=":host.commit('no', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons !== 'yesno' && :host.buttons !== 'yesnocancel' }}" class="${PCSS}-no"><${P}-text text="{{ :host.noCaption }}"></${P}-text></${P}-button>
        <${ P}-button class="button" on-click=":host.commit('cancel', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons !== 'yesnocancel' && :host.buttons !== 'okcancel' }}" class="${PCSS}-cancel"><${P}-text text="{{ :host.cancelCaption }}"></${P}-text></${P}-button>
    </div>
</${ P}-lightbox>`
    })
    export class PacemDialogElement extends PacemDialogBase {

        @Watch({ converter: PropertyConverters.String }) buttons: DialogButtons = DialogButtons.Ok;
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) okCaption: string = 'OK';
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) yesCaption: string = 'Yes';
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) noCaption: string = 'No';
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) cancelCaption: string = 'Cancel';

        @ViewChild(P + '-button.' + PCSS + '-ok') private okButton: PacemButtonElement;
        @ViewChild(P + '-button.' + PCSS + '-yes') private yesButton: PacemButtonElement;
        @ViewChild(P + '-button.' + PCSS + '-no') private noButton: PacemButtonElement;
        @ViewChild(P + '-button.' + PCSS + '-cancel') private cancelButton: PacemButtonElement;
        @ViewChild(`.${PCSS}-dialog-buttons`) private _buttons: PacemButtonElement;
        @ViewChild(P + '-lightbox') protected lightbox: PacemLightboxElement;

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