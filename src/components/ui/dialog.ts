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

        /** Gets the current state/datacontext of the dialog.
         * It is automatically destroyed when the dialog closes.
         * (It has not to be set declaratively.) */
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
            const state = this.state;
            var drevt = new DialogResultEvent({ button: btn, state: state });
            this.lightbox.show = false;
            this._deferred.resolve(drevt.detail);
            this._deferred = null;
            this.dispatchEvent(drevt);
        }
    }

    @CustomElement({
        tagName: P + '-dialog', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-lightbox modal="true" logger="{{ :host.logger }}">
    <${P}-content></${P}-content>
    <div class="${PCSS}-dialog-buttons ${PCSS}-buttonset buttons">
        <div class="buttonset-left">
            <${P}-button class="button button-size size-small primary dialog-ok" css-class="{{ {'buttonset-last': :host.buttons === 'ok'} }}" on-click=":host.commit('ok', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons !== 'ok' && :host.buttons !== 'okcancel' }}"><${P}-text text="{{ :host.okCaption }}"></${P}-text></${P}-button>
            <${P}-button class="button button-size size-small primary dialog-yes" css-class="{{ {'buttonset-first': :host.buttons !== 'ok' || :host.buttons !== 'okcancel'} }}" on-click=":host.commit('yes', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons === 'ok' || :host.buttons === 'okcancel' }}"><${P}-text text="{{ :host.yesCaption }}"></${P}-text></${P}-button>
            <${P}-button class="button button-size size-small dialog-no" css-class="{{ {'buttonset-last': :host.buttons === 'yesno'} }}" on-click=":host.commit('no', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons !== 'yesno' && :host.buttons !== 'yesnocancel' }}"><${P}-text text="{{ :host.noCaption }}"></${P}-text></${P}-button>
            <${P}-button class="button button-size size-small dialog-cancel" on-click=":host.commit('cancel', $event)" disabled="{{ :host.disabled || this.hide }}" hide="{{ :host.buttons !== 'yesnocancel' && :host.buttons !== 'okcancel' }}"><${P}-text text="{{ :host.cancelCaption }}"></${P}-text></${P}-button>
        </div>
    </div>
</${P}-lightbox>`
    })
    export class PacemDialogElement extends PacemDialogBase {

        @Watch({ converter: PropertyConverters.String }) buttons: DialogButtons = DialogButtons.Ok;
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) okCaption: string = 'OK';
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) yesCaption: string = 'Yes';
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) noCaption: string = 'No';
        @Watch({ reflectBack: true, converter: PropertyConverters.String }) cancelCaption: string = 'Cancel';

        @ViewChild(`.${PCSS}-dialog-buttons`) private _buttons: HTMLElement;
        @ViewChild(P + '-lightbox') protected lightbox: PacemLightboxElement;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'buttons':
                    //
                    break;
            }
        }

        open(state?: any) {
            const retval = super.open(state);
            switch (this.buttons) {
                case DialogButtons.Ok:
                case DialogButtons.OkCancel:
                    (<PacemButtonElement>this.dialogButtons.ok).focus();
                    break;
                default:
                    (<PacemButtonElement>this.dialogButtons.yes).focus();
                    break;
            }
            return retval;
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            // HACK: move the buttons outside the .pacem-scrollable element in the lightbox
            requestAnimationFrame(() => {
                const elFrom = this.lightbox && this.lightbox.container;
                if (!Utils.isNull(elFrom)) {
                    elFrom.appendChild(this._buttons);
                    this.dispatchEvent(new PropertyChangeEvent({ propertyName: 'dialogButtons', currentValue: this.dialogButtons }));
                } else {
                    this.log(Logging.LogLevel.Warn, `Could not find the lightbox container as expected.`);
                }
            });
        }

        /** Gets the 'ok', 'yes', 'no' and 'cancel' dialog buttons. */
        get dialogButtons() {
            const btns = this._buttons;
            return {
                ok: btns && btns.firstElementChild.firstElementChild,
                yes: btns && btns.firstElementChild.children.item(1),
                no: btns && btns.firstElementChild.children.item(2),
                cancel: btns && btns.firstElementChild.lastElementChild
            }
        }
    }

}