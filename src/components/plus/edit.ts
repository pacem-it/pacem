/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="../../../dist/js/pacem-scaffolding.d.ts" />
namespace Pacem.Components.Plus {

    export enum EditMode {
        Text = 'text',
        Html = 'html',
        Image = 'image',
        Markdown = 'markdown'
    }

    @CustomElement({
        tagName: 'pacem-edit'
    })
    export class PacemEditElement extends PacemElement implements OnPropertyChanged, OnConnected, OnViewActivated, OnDisconnected {

        constructor(private _markdown = new Pacem.MarkdownService()) {
            super();
        }

        private _button: UI.PacemButtonElement;
        private _textarea: Scaffolding.PacemTextAreaElement;
        private _contenteditable: Scaffolding.PacemContenteditableElement;
        private _editImage: Scaffolding.PacemEditImageElement;
        private _dialog: UI.PacemDialogElement;

        @Watch({ emit: false, converter: PropertyConverters.String }) key: string;
        @Watch({ converter: PropertyConverters.String }) type: EditMode;
        @Watch({ converter: PropertyConverters.Element }) target: HTMLElement;

        private _state: string;
        private _content: Element;

        private _addButton() {
            /*<pacem-balloon options="{ position: '${UI.BalloonPosition.Top}', align: '${UI.BalloonAlignment.End}', behavior: '${UI.BalloonBehavior.Inert}', hoverDelay: 0 }" disabled="{{ :host.disabled }}" class="pacem-edit-balloon">
                <pacem-button class="pacem-edit" on-click=":host.edit($event)"></pacem-button>
            </pacem-balloon>*/
            if (!Utils.isNull(this._button))
                return;
            //
            var btn = <UI.PacemButtonElement>document.createElement('pacem-button');
            btn.className = 'pacem-edit-button';
            btn.addEventListener('click', this._editHandler, false);
            this._target.appendChild(btn);
            //
            return this._button = btn;
        }

        private _removeButton() {
            var btn = this._button;
            if (Utils.isNull(btn))
                return;
            btn.removeEventListener('click', this._editHandler, false);
            btn.remove();
            this._button = null;
        }

        // #region dialog 

        private _addDialog() {
            /* <pacem-dialog buttons="'${ UI.DialogButtons.OkCancel}'" on-${PropertyChangeEventName}=":host._dialogPropertyChangedCallback($event)"> */
            var dialog = <UI.PacemDialogElement>document.createElement('pacem-dialog');
            dialog.buttons = UI.DialogButtons.OkCancel;
            dialog.addEventListener(PropertyChangeEventName, this._dialogPropertyChangedHandler, false);
            dialog.appendChild(this._addTextarea());
            dialog.appendChild(this._addContenteditable());
            dialog.appendChild(this._addEditImage());
            document.body.appendChild(dialog);
            //
            return this._dialog = dialog;
        }

        private _removeDialog() {
            this._removeTextarea();
            this._removeContenteditable();
            this._removeEditImage();
            if (!Utils.isNull(this._dialog)) {
                this._dialog.removeEventListener(PropertyChangeEventName, this._dialogPropertyChangedHandler, false);
                this._dialog.remove();
            }
        }

        // #region textarea 

        private _addTextarea() {
            /*<pacem-textarea hide="{{ :host.type === '${ EditMode.Html}' || :host.type === '${EditMode.Image}' }}" value="{{ ::_dialog.state, twoway }}"></pacem-textarea>*/
            var textarea = <Scaffolding.PacemTextAreaElement>document.createElement('pacem-textarea');
            textarea.className = 'pacem-edit-text';
            textarea.addEventListener(PropertyChangeEventName, this._innerValueChangedHandler, false);
            const type = this.type || EditMode.Text;
            textarea.hide = type !== EditMode.Text && type !== EditMode.Markdown;
            return this._textarea = textarea;
        }

        private _removeTextarea() {
            if (!Utils.isNull(this._textarea))
                this._textarea.removeEventListener(PropertyChangeEventName, this._innerValueChangedHandler, false);
        }

        // #endregion

        // #region contenteditable

        private _addContenteditable() {
            /*<pacem-contenteditable hide="{{ :host.type != '${ EditMode.Html}' }}" value="{{ ::_dialog.state, twoway  }}"></pacem-contenteditable> */
            var contenteditable = <Scaffolding.PacemContenteditableElement>document.createElement('pacem-contenteditable');
            contenteditable.className = 'pacem-edit-content';
            contenteditable.addEventListener(PropertyChangeEventName, this._innerValueChangedHandler, false);
            const type = this.type || EditMode.Text;
            contenteditable.hide = type !== EditMode.Html;
            return this._contenteditable = contenteditable;
        }

        private _removeContenteditable() {
            if (!Utils.isNull(this._contenteditable))
                this._contenteditable.removeEventListener(PropertyChangeEventName, this._innerValueChangedHandler, false);
        }

        // #endregion

        // #region edit-image

        private _addEditImage() {
            /*<!-- img -->
    <pacem-panel class="pacem-edit-image" hide="{{ :host.type != '${ EditMode.Image}' }}"
        css-class="{{ {'pacem-uploading': ::_uploader.uploading, 'pacem-upload-enabled': !Pacem.Utils.isNullOrEmpty(:host.imageUploadUrl)} }}">
        <pacem-input-search value="{{ :host.hint, twoway }}"></pacem-input-search>
        <pacem-upload pattern="'.+\.(jpe?g|png)$'" url="{{ :host.imageUploadUrl }}" on-${ PropertyChangeEventName}=":host._uploaderPropertyChangedCallback($event)" hide="{{ Pacem.Utils.isNullOrEmpty(:host.imageUploadUrl) }}"></pacem-upload>
        <pacem-infinite-scroller container="{{ ::_repeater }}" on-fetchmore=":host._imagefetchSuddenly()" disabled="{{ :host._fetching || !:host._open || :host._images.length >= :host.imageSet.total }}"></pacem-infinite-scroller>
        <pacem-repeater datasource="{{ :host._images }}">
            <template>
                <pacem-img css-class="{{ {'pacem-selected': ^item.src === ::_dialog.state } }}" on-click="::_dialog.state = ^item.src" src="{{ ^item.thumb }}" adapt="'contain'"></pacem-img>
            </template>
        </pacem-repeater>
        <pacem-progressbar></pacem-progressbar>
    </pacem-panel>*/
            var editImage = <Scaffolding.PacemEditImageElement>document.createElement('pacem-edit-image');
            editImage.disabled = true;
            editImage.addEventListener(PropertyChangeEventName, this._innerValueChangedHandler, false);
            editImage.addEventListener(Scaffolding.ImageFetchRequestEventName, this._broadcastFetchRequestEventName, false);
            const type = this.type || EditMode.Text;
            editImage.hide = type !== EditMode.Image;
            editImage.uploadUrl = this.imageUploadUrl;
            editImage.allowSnapshot = this.allowSnapshot;
            editImage.maxWidth = this.maxImageWidth;
            editImage.maxHeight = this.maxImageHeight;
            return this._editImage = editImage;
        }

        private _removeEditImage() {
            if (!Utils.isNull(this._editImage)) {
                this._editImage.removeEventListener(PropertyChangeEventName, this._innerValueChangedHandler, false);
                this._editImage.removeEventListener(Scaffolding.ImageFetchRequestEventName, this._broadcastFetchRequestEventName, false);
            }
        }

        // #endregion

        // #endregion

        private _dialogPropertyChangedHandler = (evt) => {
            this._dialogPropertyChangedCallback(evt);
        };

        private _broadcastFetchRequestEventName = (evt: Scaffolding.ImageFetchRequestEvent) => {
            this.dispatchEvent(new Scaffolding.ImageFetchRequestEvent(evt.detail));
        };

        private _innerValueChangedHandler = (evt: PropertyChangeEvent) => {
            if (evt.detail.propertyName === 'value' && !Utils.isNull(this._dialog))
                this._dialog.state = evt.detail.currentValue;
        };

        private _editHandler = (evt) => {
            this.edit(evt);
        };

        private _update(val: string) {
            var cnt = <HTMLElement>this._content;
            switch (this.type) {
                case EditMode.Html:
                    cnt.innerHTML = val;
                    break;
                case EditMode.Markdown:
                    switch (cnt.localName) {
                        case 'pacem-markdown':
                            (<UI.PacemMarkdownElement>cnt).value = val;
                            break;
                        default:
                            cnt.innerHTML = this._markdown.toHtml(val);
                            break;
                    }
                    break;
                case EditMode.Image:

                    switch (cnt.localName) {
                        case 'img':
                        case 'pacem-img':
                            cnt['src'] = val;
                            break;
                        default:
                            cnt.style.backgroundImage = `url(${val})`;
                            break;
                    }

                    break;
                default:
                    this._content.textContent = val;
                    break;
            }
        }

        private _retrieve(): string {
            var cnt = <HTMLElement>this._content;
            switch (this.type) {
                case EditMode.Html:
                    return cnt.innerHTML;
                case EditMode.Image:
                    switch (cnt.localName) {
                        case 'pacem-img':
                        case 'img':
                            return cnt['src'];
                        default:
                            let styled = getComputedStyle(cnt).backgroundImage,
                                matches = /url\(["']?([^'"]+)["']?\)/.exec(styled);
                            return matches && matches.length && matches[1];
                    }
                case EditMode.Markdown:
                    return cnt['value'] || cnt.textContent;
                default:
                    return cnt.textContent;
            }
        }

        private _setup() {
            const val: boolean = this.disabled;
            if (val) {
                Utils.removeClass(this._target, 'pacem-editing');
                this._removeButton();
            } else {
                Utils.addClass(this._target, 'pacem-editing');
                this._addButton();
            }
        }

        private _dialogPropertyChangedCallback(evt: PropertyChangeEvent) {
            if (evt.detail.propertyName === 'state') {
                const val = evt.detail.currentValue;
                if (!Utils.isNull(this._textarea))
                    this._textarea.value = val;
                if (!Utils.isNull(this._contenteditable))
                    this._contenteditable.value = val;
                if (!Utils.isNull(this._editImage))
                    this._editImage.value = val;
                this._update(evt.detail.currentValue);
            }
        }

        private get _target(): HTMLElement {
            var cnt = this.target;
            if (Utils.isNull(cnt))
                cnt = <HTMLElement>this.firstElementChild;
            return cnt;
        }

        connectedCallback() {
            super.connectedCallback();
            this._addDialog();
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._addButton();
            this._setup();
        }

        disconnectedCallback() {
            this._removeButton();
            this._removeDialog();
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'imageUploadUrl':
                    if (!Utils.isNull(this._editImage))
                        this._editImage.uploadUrl = val;
                    break;
                case 'allowSnapshot':
                    if (!Utils.isNull(this._editImage))
                        this._editImage.allowSnapshot = val;
                    break;
                case 'imageSet':
                    if (!Utils.isNull(this._editImage))
                        this._editImage.imageSet = val;
                    break;
                case 'disabled':
                    this._setup();
                    break;
                case 'type':
                    const type = <EditMode>val;
                    if (!Utils.isNull(this._textarea))
                        this._textarea.hide = type !== EditMode.Text && type !== EditMode.Markdown;
                    if (!Utils.isNull(this._contenteditable))
                        this._contenteditable.hide = type !== EditMode.Html;
                    if (!Utils.isNull(this._editImage))
                        this._editImage.hide = type !== EditMode.Image;
                    break;
                case 'maxImageHeight':
                    if (!Utils.isNull(this._editImage))
                        this._editImage.maxHeight = val;
                    break;
                case 'maxImageWidth':
                    if (!Utils.isNull(this._editImage))
                        this._editImage.maxWidth = val;
                    break;
            }
        }

        edit(evt: Event) {
            Pacem.avoidHandler(evt);
            var cnt = this._target;
            if (Utils.isNull(cnt))
                return;
            this._removeButton();
            this._content = cnt;
            var state = this._state = this._retrieve();
            if (!Utils.isNull(this._editImage))
                this._editImage.disabled = false;
            this._dialog.open(state).then(args => {
                switch (args.button) {
                    case UI.DialogButton.Cancel:
                        // reset value
                        this._update(this._state);
                        break;
                    case UI.DialogButton.Ok:
                        // save
                        this._update(args.state);
                        this.dispatchEvent(new CustomEvent('commit', { detail: { value: args.state } }));
                        break;
                }
                this._content = null;
                if (!Utils.isNull(this._editImage))
                    this._editImage.disabled = true;
                this._addButton();
            });
        }

        // #region IMAGES

        @Watch({ emit: false, converter: PropertyConverters.String }) imageUploadUrl: string;
        @Watch({ emit: false }) imageSet: Scaffolding.PictureSet;
        @Watch({ emit: false, converter: PropertyConverters.Number }) maxImageWidth: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) maxImageHeight: number;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) allowSnapshot: boolean;

        // #endregion
    }

}