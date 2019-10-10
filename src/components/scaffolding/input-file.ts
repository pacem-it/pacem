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

    /**
     * PacemUploader Component
     */
    @CustomElement({
        tagName: P + '-upload', shadow: Defaults.USE_SHADOW_ROOT
        , template: `<${P}-panel class="${PCSS}-upload" css-class="{{ {'${PCSS}-progress': :host.showProgress} }}">
    <${ P}-panel class="${PCSS}-upload-filewrapper" 
         hide="{{ :host.uploading || :host.failed }}"><input type="file" /></${ P}-panel>
    <${ P}-button class="${PCSS}-upload-retry flat" 
            tooltip="{{ :host.retryCaption }}" 
            hide="{{ !:host.failed }}" 
            on-click=":host._retry($event)"><${ P}-text text="{{ :host.retryCaption }}"></${P}-text></${P}-button>
    <${ P}-button class="${PCSS}-upload-undo flat" 
            tooltip="{{ :host.undoCaption }}" 
            on-click=":host._undo($event)" 
            hide="{{ !:host.uploading }}"><${ P}-text text="{{ :host.undoCaption }}"></${P}-text></${P}-button>
    <${ P}-tuner hide="{{ !:host.showProgress }}" value="{{ :host.percentage }}" interactive="false"></${P}-tuner>
</${ P}-panel>`
    })
    export class PacemUploadElement extends PacemBaseElement implements Net.OAuthFetchable {

        @Watch({ emit: false, converter: PropertyConverters.Json }) fetchCredentials: RequestCredentials;
        @Watch({ emit: false, converter: PropertyConverters.String }) fetchHeaders: { [key: string]: string; };

        protected convertValueAttributeToProperty(attr: string) {
            return attr; // better assumptions anyone?
        }

        protected acceptValue(val: any) {
            this.log(Logging.LogLevel.Warn, "Implement a feedback logic!");
        }

        @ViewChild('input[type=file]') fileupload: HTMLInputElement;
        @ViewChild(`div.${PCSS}-upload`) container: HTMLDivElement;

        @Watch({ emit: false, converter: PropertyConverters.String }) undoCaption: string = 'undo';
        @Watch({ emit: false, converter: PropertyConverters.String }) retryCaption: string = 'retry';

        @Watch({ emit: false, converter: PropertyConverters.String }) pattern: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) url: string;

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) maxImageWidth: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) maxImageHeight: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) maxSize: number;

        @Watch({ converter: PropertyConverters.Boolean }) showProgress: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) uploading: boolean = false;
        @Watch({ converter: PropertyConverters.Number }) size: number = 0;
        @Watch({ converter: PropertyConverters.Number }) percentage: number = .0;
        @Watch({ converter: PropertyConverters.Boolean }) complete: boolean = false;
        @Watch({ converter: PropertyConverters.Boolean }) failed: boolean = false;
        @Watch({ converter: PropertyConverters.Boolean }) invalidFile = false;

        get blob(): Blob {
            return this._fields.blob;
        }

        private _httpClient = new Net.Http();

        protected get inputFields() {
            return [this.fileupload];
        }

        protected getViewValue(val: any): string {
            return this.value;
        }

        /*protected getValue(val: string): any {
            const matches = /[^\\\/]+$/.exec(val);
            if (Utils.isNullOrEmpty(matches)) return '';
            return matches[0];
        }*/

        protected toggleReadonlyView(readonly: boolean) {
        }

        private _fields = {
            'parallelism': 3,
            'uid': '',
            'ongoing': 0,
            'enqueuer': null,
            'blob': null,
            'retryFrom': 0,
            'undone': false
        };

        async upload(file: Blob, filename?: string, state?: any) {
            var Uploader = this,
                fields = Uploader._fields;
            if (!file) return;
            if (!filename && file instanceof File)
                filename = file.name;
            Uploader.failed = false;
            fields.undone = false;
            fields.ongoing = 0;
            var blob = file;
            filename = filename.substr(filename.lastIndexOf('\\') + 1);

            // max size exceeded
            var size = Uploader.maxSize;
            if (size > 0 && size < blob.size) {
                Uploader.invalidFile = true;
                return;
            }

            // pattern unmatched
            var pattern = Uploader.pattern;
            if (pattern && !(new RegExp(pattern, 'i').test(filename))) {
                Uploader.invalidFile = true;
                return;
            }
            Uploader.invalidFile = false;
            var size = Uploader.size = blob.size;
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

        private _doUpload(blob, skip) {
            var Uploader = this, fields = Uploader._fields;
            fields.ongoing++;
            //
            var reader = new FileReader();
            reader.onloadend = function () {

                const result = reader.result as string;
                var request: UploadRequest = {
                    chunk: result.substr(result.indexOf('base64,') + 7),
                    uid: fields.uid, position: skip,
                    action: "do"
                };

                Uploader._fetch(request)
                    .then(r => {

                        if (r.ok) {

                            fields.ongoing--;
                            if (!!fields.undone) return;

                            r.json().then(json => {
                                const result = json as UploadResult;
                                Uploader.percentage = Math.round(Math.max(1, result.percentage));
                                if (Uploader.complete != result.complete) {
                                    Uploader.complete = result.complete;
                                    if (Uploader.complete === true) {
                                        Uploader.uploading = false;
                                        Uploader.changeHandler(new FileUploadEvent(result));
                                    }
                                }
                            });

                        } else {

                            // error occurred
                            fields.retryFrom = skip;
                            Uploader.failed = true;
                            Uploader.uploading = false;

                        }

                    }, _ => {

                        // crash
                        fields.retryFrom = skip;
                        Uploader.failed = true;
                        Uploader.uploading = false;

                    });

            }
            reader.readAsDataURL(blob);
        }

        private _manage() {
            var Uploader = this;
            var fields = Uploader._fields;
            var start = fields.retryFrom;
            var size = Uploader.size;
            var blob: Blob = fields.blob;
            var BYTES_PER_CHUNK = 1024 * 128; // 0.125MB chunk sizes.
            var end = start + BYTES_PER_CHUNK;
            //
            fields.enqueuer = setInterval(() => {
                if (start < size && !Uploader.failed) {
                    if (fields.ongoing >= fields.parallelism) return;
                    this._doUpload(blob.slice(start, end), start);
                    start = end;
                    end = start + BYTES_PER_CHUNK;
                } else {
                    var input = Uploader.fileupload;
                    input.value = '';
                    window.clearInterval(fields.enqueuer);
                }
            }, 100);
        }

        protected onChange(evt: Event) {
            var deferred = DeferPromise.defer<any>();
            if (CustomEventUtils.isInstanceOf(evt, FileUploadEvent)) {
                const file = this.value = (<FileUploadEvent>evt).detail.filename;
                this.dispatchEvent(evt);
                deferred.resolve(file);
            } else {
                let Uploader = this,
                    //    fields = Uploader.fields,
                    input = <HTMLInputElement>Uploader.fileupload;
                //var filename = input.value;
                var blob = input.files[0];

                if (/\.(jpe?g|png)$/i.test(blob.name) && this.maxImageWidth > 0 && this.maxImageHeight > 0)
                    Utils.resizeImage(blob, this.maxImageWidth, this.maxImageHeight, 0.6).then(blob2 => {
                        Uploader.upload(blob2, input.value);
                        deferred.resolve(this.value);
                    })
                else {
                    Uploader.upload(blob, input.value);
                    deferred.resolve(this.value);
                }
            }
            return deferred.promise;
        }

        private _fetch(request: UploadRequest) {
            return fetch(this.url, {
                method: 'POST', credentials: this.fetchCredentials, headers: Utils.extend({ 'Accept': 'application/json', 'Content-Type': 'application/json' }, this.fetchHeaders || {}), body: JSON.stringify(request)
            });
        }

        private async _undo(e: Event) {
            e.preventDefault();
            e.stopPropagation();
            var Uploader = this, fields = Uploader._fields, input = <HTMLInputElement>Uploader.fileupload;
            clearInterval(fields.enqueuer);

            var request: UploadRequest = {
                action: "undo", uid: fields.uid
            };

            try {
                var r = await Uploader._fetch(request);

                if (r.ok) {

                    fields.undone = true;
                    Uploader.size = 0;
                    Uploader.percentage = .0;
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

        private _retry(e: Event) {
            e.preventDefault();
            e.stopPropagation();
            this.failed = false;
            this._manage();
        }

    }
}