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
    type UploadResultWrapped = {
        success: boolean,
        result?: UploadResult,
        error?: string
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
        tagName: 'pacem-upload', shadow: Defaults.USE_SHADOW_ROOT
        , template: `<pacem-panel class="pacem-upload" css-class="{{ {'pacem-progress': :host.showProgress} }}">
    <pacem-panel class="pacem-upload-filewrapper" 
         hide="{{ :host.uploading || :host.failed }}"><input type="file" /></pacem-panel>
    <pacem-button class="pacem-upload-retry flat" 
            tooltip="{{ :host.retryCaption }}" 
            hide="{{ !:host.failed }}" 
            on-click=":host.retry($event)"><pacem-text text="{{ :host.retryCaption }}"></pacem-text></pacem-button>
    <pacem-button class="pacem-upload-undo flat" 
            tooltip="{{ :host.undoCaption }}" 
            on-click=":host.undo($event)" 
            hide="{{ !:host.uploading }}"><pacem-text text="{{ :host.undoCaption }}"></pacem-text></pacem-button>
    <pacem-tuner hide="{{ !:host.showProgress }}" value="{{ :host.percentage }}" interactive="false"></pacem-tuner>
</pacem-panel>`
    })
    export class PacemUploadElement extends PacemBaseElement {

        protected convertValueAttributeToProperty(attr: string) {
            return attr; // better assumptions anyone?
        }

        protected acceptValue(val: any) {
            this.log(Logging.LogLevel.Warn, "Implement a feedback logic!");
        }

        @ViewChild('input[type=file]') fileupload: HTMLInputElement;
        @ViewChild('div.pacem-upload') container: HTMLDivElement;

        @Watch({ emit: false, converter: PropertyConverters.String }) undoCaption: string = 'undo';
        @Watch({ emit: false, converter: PropertyConverters.String }) retryCaption: string = 'retry';

        @Watch({ emit: false, converter: PropertyConverters.String }) pattern: string;
        @Watch({ emit: false, converter: PropertyConverters.String }) url: string;

        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) maxImageWidth: number;
        @Watch({ emit: false, reflectBack: true, converter: PropertyConverters.Number }) maxImageHeight: number;

        @Watch({ converter: PropertyConverters.Boolean }) showProgress: boolean;
        @Watch({ converter: PropertyConverters.Boolean }) uploading: boolean = false;
        @Watch({ converter: PropertyConverters.Number }) size: number = 0;
        @Watch({ converter: PropertyConverters.Number }) percentage: number = .0;
        @Watch({ converter: PropertyConverters.Boolean }) complete: boolean = false;
        @Watch({ converter: PropertyConverters.Boolean }) failed: boolean = false;
        @Watch({ converter: PropertyConverters.Boolean }) invalidFile = false;

        get blob(): Blob {
            return this.fields.blob;
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

        private fields = {
            'parallelism': 3,
            'uid': '',
            'ongoing': 0,
            'enqueuer': null,
            'blob': null,
            'retryFrom': 0,
            'undone': false
        };

        upload(file: Blob, filename?: string, state?: any) {
            var Uploader = this,
                fields = Uploader.fields;
            if (!file) return;
            if (!filename && file instanceof File)
                filename = file.name;
            Uploader.failed = false;
            fields.undone = false;
            fields.ongoing = 0;
            var blob = file;
            filename = filename.substr(filename.lastIndexOf('\\') + 1);
            var pattern = Uploader.pattern;
            if (pattern && !(new RegExp(pattern, 'i').test(filename))) {
                Uploader.invalidFile = true;
                return;
            }
            Uploader.invalidFile = false;
            var size = Uploader.size = blob.size;
            Uploader.percentage = .0;
            Uploader.complete = false;

            // TODO: use Pacem.Net.Http + JSON formatted data.
            var request: UploadRequest = {
                filename: filename, length: size, action: "start", state: state
            };
            const formData = JSON.stringify(request);
            //
            Uploader.uploading = true;
            this._httpClient.post(Uploader.url, request)
                .success(r => {
                    var json = <UploadResultWrapped>r.json;
                    if (!!json.success) {

                        fields.retryFrom = 0;
                        fields.blob = blob;
                        fields.uid = json.result.uid;
                        Uploader.manage();
                    }
                    return r;
                });
        }

        private doUpload(blob, skip) {
            var Uploader = this, fields = Uploader.fields;
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

                Uploader._httpClient.post(Uploader.url, request)
                    .success(r => {
                        fields.ongoing--;
                        if (!!fields.undone) return;

                        // Note: .response instead of .responseText
                        var json = <UploadResultWrapped>r.json;
                        if (!!json.success) {
                            const result = json.result;
                            Uploader.percentage = Math.min(1, result.percentage);
                            if (Uploader.complete != result.complete) {
                                Uploader.complete = result.complete;
                                var fn;
                                if (Uploader.complete === true) {
                                    Uploader.uploading = false;
                                    Uploader.changeHandler(new FileUploadEvent(result));
                                }
                            }
                        } else {
                            fields.retryFrom = skip;
                            Uploader.failed = true;
                            Uploader.uploading = false;
                            //console.error(json.error);
                        }

                        return r;
                    })
                    .error(err => {
                        fields.retryFrom = skip;
                        Uploader.uploading = false;
                        Uploader.failed = true;
                    });
            }
            reader.readAsDataURL(blob);
        }

        private manage() {
            var Uploader = this;
            var fields = Uploader.fields;
            var start = fields.retryFrom;
            var size = Uploader.size;
            var blob: Blob = fields.blob;
            var BYTES_PER_CHUNK = 1024 * 256; // 0.25MB chunk sizes.
            var end = start + BYTES_PER_CHUNK;
            //
            fields.enqueuer = setInterval(() => {
                if (start < size && !Uploader.failed) {
                    if (fields.ongoing >= fields.parallelism) return;
                    this.doUpload(blob.slice(start, end), start);
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

        private undo(e: Event) {
            e.preventDefault();
            e.stopPropagation();
            var Uploader = this, fields = Uploader.fields, input = <HTMLInputElement>Uploader.fileupload;
            clearInterval(fields.enqueuer);

            var request: UploadRequest = {
                action: "undo", uid: fields.uid
            };
            this._httpClient.post(Uploader.url, request)
                .success(r => {
                    var json = <UploadResultWrapped>r.json;
                    if (!!json.success) {
                        fields.undone = true;
                        Uploader.size = 0;
                        Uploader.percentage = .0;
                    }
                    return r;
                })
                .finally(r => {
                    input.value = ''; // <- This input element accepts a filename, which may only be programmatically set to the empty string(!)
                    Uploader.uploading = false;
                });
        }

        private retry(e: Event) {
            e.preventDefault();
            e.stopPropagation();
            this.failed = false;
            this.manage();
        }

    }
}