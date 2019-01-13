/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
/// <reference path="input.ts" />
/// <reference path="input-url.ts" />
namespace Pacem.Components.Scaffolding {

    export class Picture {
        thumbnailSrc: string;
        src: string;
        caption?: string;
    }

    export declare type PictureSet = {
        total: number,
        skip: number,
        take: number,
        set: Picture[]
    }

    export const ImageFetchRequestEventName = 'imagefetchrequest';

    export declare type FetchRequestEventArgs = {
        hint?: string,
        skip: number,
        take?: number
    }

    export class ImageFetchRequestEvent extends CustomTypedEvent<FetchRequestEventArgs> {

        constructor(args: FetchRequestEventArgs) {
            super(ImageFetchRequestEventName, args, { bubbles: true /*, scoped: false */ });
        }
    }

    @CustomElement({
        tagName: 'pacem-edit-image', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<pacem-panel class="pacem-edit-image"
        css-class="{{ {'pacem-snapshot': ::_snapshot.step != '${ UI.SnapshotStep.Start}', 'pacem-uploading': ::_uploader.uploading, 'pacem-upload-enabled': !Pacem.Utils.isNullOrEmpty(:host.uploadUrl), 'pacem-snapshot-enabled': !Pacem.Utils.isNullOrEmpty(:host.uploadUrl) && :host.allowSnapshot} }}">
        <div>
            <pacem-input-search value="{{ :host.hint, twoway }}"></pacem-input-search>
            <pacem-upload main pattern=".+\.(jpe?g|png|svg|ico)$" url="{{ :host.uploadUrl }}"
                    max-image-width="{{ :host.maxWidth }}" max-image-height="{{ :host.maxHeight }}"
                    on-${FileUploadEventName}=":host._uploaderFileUploadCallback($event)"
                    on-${PropertyChangeEventName}=":host._uploaderPropertyChangedCallback($event)" hide="{{ Pacem.Utils.isNullOrEmpty(:host.uploadUrl) || ::_thumbUploader.uploading }}"></pacem-upload>
            <pacem-upload thumb pattern=".+\.(jpe?g|png|svg|ico)$" url="{{ :host.uploadUrl }}" hide="{{ !::_thumbUploader.uploading  }}"
                    max-image-width="{{ :host.maxThumbnailWidth }}" max-image-height="{{ :host.maxThumbnailHeight }}"
                    on-${PropertyChangeEventName}=":host._thumbnailUploaderPropertyChangedCallback($event)"></pacem-upload>
            <pacem-button class="pacem-snapshot" on-click="Pacem.avoidHandler($event); ::_snapshot.step = '${ UI.SnapshotStep.Taking}'" hide="{{ Pacem.Utils.isNullOrEmpty(:host.uploadUrl) || !:host.allowSnapshot }}"></pacem-button>
            <pacem-infinite-scroller container="{{ ::_repeater }}" on-fetchmore=":host._imagefetchSuddenly()" disabled="{{ :host._fetching || :host.disabled || :host._images.length >= :host.imageSet.total }}"></pacem-infinite-scroller>
            <pacem-repeater datasource="{{ :host._images }}">
                <template>
                    <pacem-img css-class="{{ {'pacem-selected': ^item.src === :host.value } }}" on-click=":host.value = ^item.src" src="{{ ^item.thumb }}" adapt="contain"></pacem-img>
                </template>
            </pacem-repeater>
            <pacem-progressbar class="progressbar-smaller progressbar-accent" caption="{{ ::_thumbUploader.uploading ? 'thumbnail...' : 'uploading...' }}"></pacem-progressbar>
        </div>
        <div>
            <pacem-snapshot hide="{{ !:host.allowSnapshot }}" on-${PropertyChangeEventName}=":host._snapshotPropertyChangedCallback($event)"></pacem-snapshot>
        </div>
    </pacem-panel>`
    })
    export class PacemEditImageElement extends PacemElement implements OnPropertyChanged {

        private _uploaderPropertyChangedCallback(evt: PropertyChangeEvent) {
            const val = evt.detail.currentValue;
            switch (evt.detail.propertyName) {
                case 'percentage':
                    this._progressbar.percentage = val * 100.0;
                    break;
                case 'uploading':
                    if (val)
                        this._done(true);
                    break;
            }
        }

        private _thumbnailUploaderPropertyChangedCallback(evt: PropertyChangeEvent) {
            const val = evt.detail.currentValue;
            switch (evt.detail.propertyName) {
                case 'percentage':
                    this._progressbar.percentage = val * 100.0;
                    break;
                case 'uploading':
                    this._done(val);
                    break;
            }
        }

        private _uploaderFileUploadCallback(evt: FileUploadEvent) {
            const uploader = this._uploader;
            const thumbUploader = this._thumbUploader,
                w = thumbUploader.maxImageWidth,
                h = thumbUploader.maxImageHeight;
            if (w > 0 && h > 0) {
                var blob = uploader.blob;
                const uid = evt.detail.uid;
                Utils.resizeImage(blob, w, h).then(blob2 => {
                    if (blob2 != blob) {
                        thumbUploader.upload(blob2, 'thumbnail.jpg', uid);
                        return;
                    } else
                        // fallback
                        this._done(false);
                });
            } else
                // fallback
                this._done(false);
        }

        private _done(uploading: boolean) {
            if (!uploading) {
                this._imagefetch(0);
            }
            this._repeater.hidden = uploading;
            this._progressbar.hidden = !uploading;
        }

        private _snapshotPropertyChangedCallback(evt: PropertyChangeEvent) {
            switch (evt.detail.propertyName) {
                case 'value':
                    const blob = Utils.dataURLToBlob(evt.detail.currentValue);
                    this._uploader.upload(blob, 'snapshot.jpg');
                    break;
            }
        }

        reset() {
            this._snapshot.step = UI.SnapshotStep.Start;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'imageSet':
                    let set: PictureSet = val || { skip: 0, set: [] };
                    if (Utils.isNullOrEmpty(this._images) || set.skip === 0)
                        this._images = set.set;
                    else if (!Utils.isNull(this._images))
                        Array.prototype.splice.apply(this._images, (<any[]>[set.skip, this._images.length - set.skip]).concat(set.set));
                    this._fetching = false;
                    break;
                case 'hint':
                    if (!first)
                        this._imagefetch(0);
                    break;
            }
        }

        @Watch({ converter: PropertyConverters.String }) uploadUrl: string;
        private _index: number = 0;
        @Watch({ converter: PropertyConverters.String }) hint: string = '';
        @Watch() imageSet: PictureSet;
        @Watch({ converter: PropertyConverters.String }) value: string;
        @Watch({ converter: PropertyConverters.Number }) maxWidth: number;
        @Watch({ converter: PropertyConverters.Number }) maxHeight: number;
        @Watch({ converter: PropertyConverters.Number }) maxThumbnailWidth: number;
        @Watch({ converter: PropertyConverters.Number }) maxThumbnailHeight: number;
        @Watch({ converter: PropertyConverters.Boolean }) allowSnapshot: boolean;
        @Watch() private _fetching: boolean;
        @Watch() private _images: Picture[];
        @ViewChild('pacem-repeater') private _repeater: PacemRepeaterElement;
        @ViewChild('pacem-upload[main]') private _uploader: Scaffolding.PacemUploadElement;
        @ViewChild('pacem-upload[thumb]') private _thumbUploader: Scaffolding.PacemUploadElement;
        @ViewChild('pacem-snapshot') private _snapshot: UI.PacemSnapshotElement;
        @ViewChild('pacem-progressbar') private _progressbar: UI.PacemProgressbarElement;

        private _imagefetchSuddenly(ndx?: number) {
            this._fetching = true;
            this._imagefetch(ndx);
        }

        @Debounce(500)
        private _imagefetch(ndx?: number) {
            if (!(ndx >= 0))
                ndx = (this._images && this._images.length) || 0;
            this.dispatchEvent(new ImageFetchRequestEvent({ hint: this.hint, skip: ndx, take: 18 }));
        }
    }

    @CustomElement({
        tagName: 'pacem-input-image', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="pacem-input-image"><pacem-img src="{{ :host.value }}" adapt="contain"></pacem-img><div class="pacem-input-image-dashboard">
    <pacem-button on-click=":host._edit($event)" hide="{{ :host.disabled }}" class="pacem-edit">Edit</pacem-button>
    <pacem-button on-click=":host._clear($event)" hide="{{ :host.disabled }}" class="pacem-clear">Clear</pacem-button>
</div><pacem-input-url placeholder="{{ :host.placeholder }}" on-change=":host.changeHandler($event)" value="{{ :host.value }}"></pacem-input-url>

    <pacem-panel hide="{{ Pacem.Utils.isNullOrEmpty(:host.value) }}">
    <dl class="pacem-input-image-preview">
        <dt>dimensions:</dt><dd><pacem-text text="{{ ::_image.size.width +'x'+ ::_image.size.height }}"></pacem-text></dd>
        <dt>size:</dt><dd><pacem-text text="{{ $pacem.size(::_image.size.weight) }}"></pacem-text></dd>
    </dl></pacem-panel>

</div>`
    })
    export class PacemImageInputElement extends PacemBaseElement implements OnConnected, OnPropertyChanged, OnDisconnected {

        protected convertValueAttributeToProperty(attr: string) {
            return attr; // better assumptions anyone?
        }

        @Watch({ converter: PropertyConverters.String }) placeholder: string;

        private _editImage: Scaffolding.PacemEditImageElement;
        private _dialog: UI.PacemDialogElement;
        @ViewChild('pacem-img') private _image: UI.PacemImageElement;
        @ViewChild('pacem-button.pacem-edit') private _editBtn: UI.PacemButtonElement;
        @ViewChild('pacem-button.pacem-clear') private _clearBtn: UI.PacemButtonElement;
        @ViewChild('pacem-input-url') private _input: PacemUrlInputElement;

        getViewValue(value: any) {
            return value;
        }

        protected get inputFields() {
            return [];
        }

        private _clear(evt: Event) {
            this.changeHandler(evt);
        }

        protected onChange(evt?: Event): PromiseLike<any> {
            let value = this.value;
            if (CustomEventUtils.isInstanceOf(evt, UI.DialogResultEvent)
                && (<UI.DialogResultEvent>evt).detail.button === UI.DialogButton.Ok)
                value = this.value = (<UI.DialogResultEvent>evt).detail.state;
            else if (evt.target === this._input)
                value = this.value = this._input.value;
            else if (evt.target === this._clearBtn)
                value = this.value = undefined;
            return Utils.fromResult(value);
        }

        protected toggleReadonlyView(readonly: boolean) {
            this._input.hidden = this._editBtn.hide = this._clearBtn.hide = readonly;
        }

        private _addDialog() {
            var dialog = <UI.PacemDialogElement>document.createElement('pacem-dialog');
            dialog.buttons = UI.DialogButtons.OkCancel;
            dialog.addEventListener(UI.DialogResultEventName, this.changeHandler, false);
            dialog.appendChild(this._addEditImage());
            document.body.appendChild(dialog);
            //
            return this._dialog = dialog;
        }

        private _removeDialog() {
            this._removeEditImage();
            if (!Utils.isNull(this._dialog)) {
                this._dialog.removeEventListener(UI.DialogResultEventName, this.changeHandler, false);
                this._dialog.remove();
            }
        }

        private _addEditImage() {
            var editImage = <Scaffolding.PacemEditImageElement>document.createElement('pacem-edit-image');
            editImage.disabled = true;
            editImage.addEventListener(PropertyChangeEventName, this._innerValueChangedHandler, false);
            editImage.addEventListener(ImageFetchRequestEventName, this._broadcastFetchRequestEventName, false);
            editImage.uploadUrl = this.uploadUrl;
            editImage.allowSnapshot = this.allowSnapshot;
            editImage.maxWidth = this.maxWidth;
            editImage.maxHeight = this.maxHeight;
            editImage.maxThumbnailHeight = this.maxThumbnailHeight;
            editImage.maxThumbnailWidth = this.maxThumbnailWidth;
            return this._editImage = editImage;
        }

        private _removeEditImage() {
            if (!Utils.isNull(this._editImage)) {
                this._editImage.removeEventListener(PropertyChangeEventName, this._innerValueChangedHandler, false);
                this._editImage.removeEventListener(ImageFetchRequestEventName, this._broadcastFetchRequestEventName, false);
            }
        }

        private _broadcastFetchRequestEventName = (evt: ImageFetchRequestEvent) => {
            this.dispatchEvent(new ImageFetchRequestEvent(evt.detail));
        };

        private _innerValueChangedHandler = (evt: PropertyChangeEvent) => {
            if (evt.detail.propertyName === 'value' && !Utils.isNull(this._dialog))
                this._dialog.state = evt.detail.currentValue;
        };

        connectedCallback() {
            super.connectedCallback();
            this._addDialog();
        }

        disconnectedCallback() {
            this._removeDialog();
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'uploadUrl':
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
                case 'maxThumbnailHeight':
                    if (!Utils.isNull(this._editImage))
                        this._editImage.maxThumbnailHeight = val;
                    break;
                case 'maxThumbnailWidth':
                    if (!Utils.isNull(this._editImage))
                        this._editImage.maxThumbnailWidth = val;
                    break;
                case 'maxHeight':
                    if (!Utils.isNull(this._editImage))
                        this._editImage.maxHeight = val;
                    break;
                case 'maxWidth':
                    if (!Utils.isNull(this._editImage))
                        this._editImage.maxWidth = val;
                    break;
            }
        }

        protected acceptValue(val: any) {
            if (!Utils.isNull(this._editImage))
                this._editImage.value = val;
        }

        private _update(val: string) {
            this._image.src = val;
        }

        private _retrieve(): string {
            return this.value;
        }

        _edit(evt: Event) {
            Pacem.avoidHandler(evt);
            var editImage = this._editImage,
                state = this.value;
            editImage.disabled = false;
            editImage.reset();
            editImage.value = state;
            this._dialog.open(state).then(args => {
                switch (args.button) {
                    case UI.DialogButton.Cancel:
                        // reset value
                        this._update(this.value);
                        break;
                    case UI.DialogButton.Ok:
                        // save
                        this._update(args.state);
                        break;
                }
                this._editImage.disabled = true;
            });
        }

        // #region IMAGES

        @Watch({ emit: false, converter: PropertyConverters.String }) uploadUrl: string;
        @Watch({ emit: false, converter: PropertyConverters.Json }) imageSet: PictureSet;
        @Watch({ emit: false, converter: PropertyConverters.Number }) maxWidth: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) maxHeight: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) maxThumbnailWidth: number;
        @Watch({ emit: false, converter: PropertyConverters.Number }) maxThumbnailHeight: number;
        @Watch({ emit: false, converter: PropertyConverters.Boolean }) allowSnapshot: boolean;

        // #endregion

    }

}