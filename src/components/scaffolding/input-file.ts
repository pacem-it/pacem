/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Scaffolding {

    type UploadRequest = {
        action: string,
        filename?: string,
        length?: number,
        position?: number,
        chunk?: string
        uid?: string,
        state?: any
    };

    type FileValue = Partial<BinaryValue>;

    export const FileUploadEventName = 'fileupload';

    export type FileUploadEventArgs = {
        complete: boolean,
        percentage: number,
        uid: string,
        filename: string,
        originalFilename: string,
        size: number
    };

    interface UploadResult extends FileUploadEventArgs { }

    export class FileUploadEvent extends CustomTypedEvent<FileUploadEventArgs> {
        constructor(file: FileUploadEventArgs) {
            super(FileUploadEventName, file);
        }
    }

    const ERROR_BINDING = '!Pacem.Utils.isNullOrEmpty(:host.value) && :host.invalidFile && Pacem.Utils.isNullOrEmpty(:host.url)';

    /**
     * PacemUploader Component
     */
    @CustomElement({
        tagName: P + '-upload', shadow: Defaults.USE_SHADOW_ROOT
        , template: `<${P}-button on-click=":host._dispatchDownload($event)" class="${PCSS}-upload ${PCSS}-viewfinder flat" css-class="{{ {'upload-chosen': !Pacem.Utils.isNullOrEmpty(:host.value) && !:host.uploading, 'upload-error': ${ERROR_BINDING}, 'upload-readonly': :host.readonly } }}">

        <${P}-panel class="upload-button" hide="{{ (:host.uploading || :host.failed) && !Pacem.Utils.isNullOrEmpty(:host.url) }}">
            <${P}-button tooltip="{{ :host.viewValue }}" class="circular pos-relative overflow-hidden" icon-glyph="{{ :host._getMimeIcon(:host.value, :host.uploading) }}" 
                css-class="{{ {'${PCSS}-anim anim-rotate': :host.uploading, 'button-danger': :host.invalidFile, 'button-primary': Pacem.Utils.isNullOrEmpty(:host.value) && !:host.invalidFile, 'button-success': !Pacem.Utils.isNullOrEmpty(:host.value) && !:host.invalidFile } }}">
                <input type="file" class="${PCSS}-transparent ${PCSS}-clickable pos-absolute absolute-left absolute-right absolute-top absolute-bottom" />
            </${P}-button>
        </${P}-panel>
        <${P}-panel class="upload-button" hide="{{ !:host.failed }}">
            <${P}-button class="circular flat" icon-glyph="refresh"
            tooltip="{{ :host.retryCaption }}" on-click=":host._retry($event)"><${P}-text text="{{ :host.retryCaption }}"></${P}-text></${P}-button>
        </${P}-panel>
        <${P}-panel class="upload-button" hide="{{ !:host.uploading || Pacem.Utils.isNullOrEmpty(:host.url) }}">
            <${P}-button class="circular flat" icon-glyph="clear" tooltip="{{ :host.undoCaption }}" 
                on-click=":host._undo($event)"><${P}-text text="{{ :host.undoCaption }}"></${P}-text></${P}-button>
        </${P}-panel>

        <${P}-span hide="{{ $pacem.isNullOrEmpty(:host.value) || :host.uploading }}" class="readonly text-reset display-block ${PCSS}-anim text-truncate text-left text-pre ${PCSS}-pad pad-right-3" text="{{ :host.viewValue }}"></${P}-span>

        <${P}-panel class="upload-progress hit-none" hide="{{ :host.readonly || (!Pacem.Utils.isNullOrEmpty(:host.value) && !:host.uploading) }}">
            <${P}-tuner value="{{ :host.percentage }}" css-class="{{ {'tuner-success': !:host.invalidFile, 'tuner-danger': :host.invalidFile} }}" interactive="false"></${P}-tuner>
        </${P}-panel>

</${P}-button>`
    })
    export class PacemUploadElement extends PacemBaseElement implements Net.OAuthFetchable {

        @Watch({ emit: false, converter: PropertyConverters.Json }) fetchCredentials: RequestCredentials;
        @Watch({ emit: false, converter: PropertyConverters.String }) fetchHeaders: { [key: string]: string; };

        constructor(private _tweener = new Pacem.Animations.TweenService()) {
            super();
        }

        protected convertValueAttributeToProperty(attr: string) {
            return attr; // better assumptions anyone?
        }

        protected acceptValue(val: any) {
            this.percentage = 0;
            this.uploading = false;
            this._fileupload.value = '';
        }

        @ViewChild('input[type=file]') private _fileupload: HTMLInputElement;
        @ViewChild(`${P}-tuner`) private _tuner: UI.PacemTunerElement;

        @Watch({ converter: PropertyConverters.String }) undoCaption: string = 'undo';
        @Watch({ converter: PropertyConverters.String }) retryCaption: string = 'retry';

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) pattern: string;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.String }) url: string;

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) maxImageWidth: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) parallelism: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) chunkSize: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) maxImageHeight: number;
        /** Gets or sets the max blob size in bytes. */
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) maxSize: number;

        @Watch({ converter: PropertyConverters.Boolean }) uploading: boolean = false;
        @Watch({ converter: PropertyConverters.Number }) size: number = 0;
        @Watch({ converter: PropertyConverters.Number }) percentage: number = .0;
        @Watch({ converter: PropertyConverters.Boolean }) complete: boolean = false;
        @Watch({ converter: PropertyConverters.Boolean }) failed: boolean = false;
        @Watch({ converter: PropertyConverters.Boolean }) invalidFile = false;

        private _getMimeIcon(file: string = this.value, uploading = this.uploading) {
            if (uploading) {
                return 'sync';
            }

            var filename = file;
            if (Utils.isNullOrEmpty(file)) {
                return 'file_upload';
            }

            if (typeof file === 'object') {
                filename = (<FileValue>file).name;
            }
            const extPattern = /\.([\w]+)(\s|$)/;
            const match = extPattern.exec(filename);
            if (match && match.length) {
                switch (match[1].toLowerCase()) {
                    case 'pdf':
                        return 'picture_as_pdf';
                    //case 'txt':
                    //case 'doc':
                    //case 'docx':
                    //    return '<i class="pacem-icon">collection_text</i>';
                    case 'jpg':
                    case 'jpeg':
                    case 'gif':
                    case 'png':
                        return 'filter';
                }
            }
            return 'filter_none';
        }

        get blob(): Blob {
            return this._fields.blob;
        }

        protected get inputFields() {
            return [this._fileupload];
        }

        protected getViewValue(val: any): string {
            const value: string | FileValue = this._localValue || val;
            if (!Utils.isNullOrEmpty(value) && typeof value === 'object') {
                return `${value.name}\n(${Utils.core.size(value.size)})`;
            }
            return value as string;
        }

        protected toggleReadonlyView(readonly: boolean) {
            this._fileupload.hidden = readonly;
        }

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._fileupload.addEventListener('click', Pacem.stopPropagationHandler, false);
        }

        disconnectedCallback() {
            if (this._fileupload) {
                this._fileupload.removeEventListener('click', Pacem.stopPropagationHandler, false);
            }
            super.disconnectedCallback();
        }

        /**
         * Triggered from the component's template.
         */
        private _dispatchDownload(evt: Event) {
            avoidHandler(evt);
            const value: string | FileValue = /* download the file being currently precessed, if available */ this._localValue || this.value,
                dispatch = (name: string) => {
                    this.dispatchEvent(new CustomEvent('download', { detail: name, bubbles: true, cancelable: false }));
                };
            if (!Utils.isNullOrEmpty(value)) {
                if (typeof value === 'string') {
                    // dispatch outside if url is provided
                    dispatch(value);
                } else {
                    if (!Utils.isNullOrEmpty(value.content)) {
                        // download right-away the content when provided
                        Utils.download(Utils.dataURLToBlob('data:application/download;base64,' + value.content), value.name, value.type);
                    } else {
                        // dispatch outside if content is empty
                        dispatch(value.name);
                    }
                }
            }
        }

        reset() {
            super.reset();
            this._localValue = null;
            this.invalidFile = false;
        }

        private _fields = {
            'parallelism': 3,
            'uid': '',
            'ongoing': 0,
            'enqueuer': null,
            'blob': null,
            'retryFrom': 0,
            'chunkSize': 1024 * 128,
            'undone': false
        };

        private _validate(file: Blob = this._fileupload.files[0], filename?: string) {
            if (file instanceof File) {
                filename = file.name;
            }
            filename = filename.substr(filename.lastIndexOf('\\') + 1);

            // max size exceeded
            const size = this.maxSize;
            if (size > 0 && size < file.size) {
                this.invalidFile = true;
                return false;
            }

            // pattern unmatched
            const pattern = this.pattern;
            if (pattern && !(new RegExp(pattern, 'i').test(filename))) {
                this.invalidFile = true;
                return false;
            }

            // all-right then
            this.invalidFile = false;
            return true;
        }

        upload(file: Blob, filename?: string, state?: string) {
            if (this._validate(file, filename)) {
                return this._upload(file, filename, state);
            }
        }

        private async _upload(file: Blob, filename?: string, state?: any) {
            var Uploader = this,
                fields = Uploader._fields;

            if (!file) return;
            if (!filename && file instanceof File) {
                filename = file.name;
            }

            Uploader.failed = false;
            fields.undone = false;
            fields.ongoing = 0;

            const blob = file,
                size = Uploader.size = blob.size;
            filename = filename.substr(filename.lastIndexOf('\\') + 1);
            Uploader.percentage = .0;
            Uploader.complete = false;

            //
            var request: UploadRequest = {
                filename: filename, length: size, action: "start", state: state
            };
            //
            Uploader.uploading = true;

            try {

                var r = await Uploader._fetch(request);
                if (r.ok) {
                    var json: UploadResult = await r.json();
                    fields.retryFrom = 0;
                    fields.blob = blob;
                    fields.uid = json.uid;
                    Uploader._manage();
                } else {
                    Uploader.uploading = false;
                }
                return r;

            } catch (e) {
                Uploader.uploading = false;
            } finally {

            }

        }

        private async _blobToBase64(blob: Blob) {
            const result = await Utils.blobToDataURL(blob) as string;
            return result.substr(result.indexOf('base64,') + 7);
        }

        private async _doUpload(blob, skip) {
            var Uploader = this, fields = Uploader._fields;
            fields.ongoing++;
            //
            const chunk = await this._blobToBase64(blob);

            var request: UploadRequest = {
                chunk: chunk,
                uid: fields.uid, position: skip,
                action: "do"
            };

            try {
                const r = await Uploader._fetch(request);

                if (r.ok) {

                    fields.ongoing--;
                    if (!!fields.undone) return;

                    const json = await r.json();
                    const result = json as UploadResult;

                    // parallelism > 1 may cause non-ordered responses
                    if (result.percentage > this.percentage) {
                        await Uploader._tweenPercentage(Math.round(Math.max(1, result.percentage)), 200);
                    }

                    if (Uploader.complete != result.complete) {
                        Uploader.complete = result.complete;
                        if (Uploader.complete === true) {
                            Uploader.uploading = false;
                            Uploader.changeHandler(new FileUploadEvent(result));
                        }
                    }

                } else {

                    // error occurred
                    fields.retryFrom = skip;
                    Uploader.failed = true;
                    Uploader.uploading = false;

                }

            } catch (_) {

                // crash
                fields.retryFrom = skip;
                Uploader.failed = true;
                Uploader.uploading = false;
            }

        }

        private _manage() {
            const fields = this._fields,
                size = this.size,
                blob: Blob = fields.blob,
                chunkSize = this.chunkSize || fields.chunkSize;
            var start = fields.retryFrom;
            var end = start + chunkSize;
            //
            fields.enqueuer = setInterval(() => {
                if (start < size && !this.failed) {
                    const parallelism = this.parallelism || fields.parallelism;
                    if (fields.ongoing >= parallelism) return;
                    this._doUpload(blob.slice(start, end), start);
                    start = end;
                    end = start + chunkSize;
                } else {
                    var input = this._fileupload;
                    input.value = '';
                    window.clearInterval(fields.enqueuer);
                }
            }, 100);
        }

        private _localValue: FileValue;
        private async _buildLocalValue(file: File, filename = file.name, blob: Blob = file): Promise<FileValue> {
            return this._localValue = { name: filename, size: file.size, type: file.type, lastModified: Utils.parseDate(file.lastModified).toISOString(), content: await this._blobToBase64(blob) };
        }

        protected onChange(evt: Event) {
            return new Promise(async (resolve, reject) => {
                if (CustomEventUtils.isInstanceOf(evt, FileUploadEvent)) {

                    // result of an upload?
                    const file = this.value = (<FileUploadEvent>evt).detail.filename;
                    this.dispatchEvent(evt);
                    resolve(file);

                } else {
                    let Uploader = this,
                        input = <HTMLInputElement>Uploader._fileupload;

                    var file = input.files[0],
                        filename = file.name,
                        blob: Blob = file;

                    // validate file
                    if (!this._validate(file) && !Utils.isNullOrEmpty(this.url)) {

                        // do not start uploads with an invalid file
                        resolve(this.value = await this._buildLocalValue(file));

                    } else {

                        if (/\.(jpe?g|png)$/i.test(filename) && this.maxImageWidth > 0 && this.maxImageHeight > 0) {
                            blob = await Utils.resizeImage(blob, this.maxImageWidth, this.maxImageHeight, .6);
                        }

                        await this._buildLocalValue(file, filename, blob);

                        if (Utils.isNullOrEmpty(this.url)) {

                            // mimic upload
                            this.uploading = true; // <- triggers anim
                            if (!Utils.isNullOrEmpty(this.value)) {
                                this.percentage = 0;

                                await Utils.waitForAnimationEnd(this._tuner);
                            } else {
                                await Utils.idle(250);
                            }

                            await this._tweener.run(0, 100, 500, 0, Pacem.Animations.Easings.sineInOut, (t, v) => {
                                this.percentage = v;
                            });

                            // reset pct
                            this.percentage = .0;
                            this.uploading = false;

                            // no direct upload? set the value to the very File
                            resolve(this.value = this._localValue);


                        } else {

                            // upload, then wait for resulting filename (value will be the filename string) 
                            Uploader._upload(blob, input.value);
                            resolve(this.value);
                        }
                    }
                }
            });
        }

        private _fetch(request: UploadRequest) {
            return fetch(this.url, {
                method: 'POST', credentials: this.fetchCredentials, headers: Utils.extend({ 'Accept': 'application/json', 'Content-Type': 'application/json' }, this.fetchHeaders || {}), body: JSON.stringify(request)
            });
        }

        private async _undo(e: Event) {
            e.preventDefault();
            e.stopPropagation();
            var Uploader = this, fields = Uploader._fields, input = <HTMLInputElement>Uploader._fileupload;
            clearInterval(fields.enqueuer);

            var request: UploadRequest = {
                action: "undo", uid: fields.uid
            };

            try {
                var r = await Uploader._fetch(request);

                if (r.ok) {

                    fields.undone = true;
                    Uploader.size = 0;
                    Uploader._tweenPercentage(.0, 300);
                }

                return r;

            } catch (e) {

            } finally {

                // This input element accepts a filename, which may only be programmatically set to the empty string(!)
                input.value = '';
                Uploader.uploading = false;
                return r;
            }

        }

        private _tweenPercentage(pct: number, duration = 500) {
            const from = this.percentage;
            return this._tweener.run(from, pct, duration, 0, Pacem.Animations.Easings.sineInOut, (t, v) => {
                this.percentage = v;
            });
        }

        private _retry(e: Event) {
            e.preventDefault();
            e.stopPropagation();
            this.failed = false;
            this._manage();
        }

    }
}