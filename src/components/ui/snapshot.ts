/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    const getUserMediaFunctions = Utils.getUserMediaFunctions();

    export enum SnapshotStep {
        Start = 'start',
        Taking = 'taking',
        Confirm = 'confirm'
    }

    @CustomElement({
        tagName: 'pacem-snapshot',
        shadow: Defaults.USE_SHADOW_ROOT,
        template: `<pacem-panel class="pacem-snapshot" 
css-class="{{ { 
'pacem-steady': :host.step === '${ SnapshotStep.Start}',
'pacem-ongoing': :host.step != '${ SnapshotStep.Start}', 
'pacem-taking': :host.step != '${ SnapshotStep.Start}', 
'pacem-video': :host._canUseWebcam && :host.step === '${ SnapshotStep.Taking}', 
'pacem-countdown': :host._countdown > 0, 
'pacem-preview': :host.step == '${ SnapshotStep.Confirm}' } }}">
    
    <pacem-button on-click=":host.take($event)" class="pacem-camera" hide="{{ :host.step != '${ SnapshotStep.Start}' }}"></pacem-button>
    
    <canvas class="pacem-preview"></canvas>

    <input type="file" accept="image/*" capture="camera" hidden />

    <video class="pacem-player" autoplay="autoplay"></video>
    <pacem-button class="pacem-countdown"><pacem-text text="{{ :host._countdown }}"></pacem-text></pacem-button>
    <pacem-button class="pacem-undo" hide="{{ :host.step == '${ SnapshotStep.Start}' || :host._countdown > 0 }}" on-click=":host.back($event)"></pacem-button>
    <pacem-button class="pacem-confirm" hide="{{ :host.step != '${ SnapshotStep.Confirm}' }}" on-click=":host.confirm($event)"></pacem-button>
    <pacem-span hide="{{ :host._canUseWebcam }}"><pacem-content></pacem-content></pacem-span>
</pacem-panel>`
    })
    export class PacemSnapshotElement extends PacemElement implements OnPropertyChanged, OnViewActivated {

        @ViewChild('.pacem-snapshot') private _root: HTMLElement;
        @ViewChild('canvas') private _stage: HTMLCanvasElement;
        @ViewChild('input[type=file]') private _grabber: HTMLInputElement;
        @ViewChild('video') private _player: HTMLVideoElement;

        @Watch({ converter: PropertyConverters.String }) step: SnapshotStep = SnapshotStep.Start;

        /** Confirmed snapshot dataURL. */
        @Watch({ converter: PropertyConverters.String }) value: string;

        get _getUserMedia() {
            return this._canUseWebcam && getUserMediaFunctions[0];
        }

        /*const*/ private _canUseWebcam: boolean = getUserMediaFunctions.length > 0;
        @Watch() private _countdown: number = 0;

        private _webcamInitialized: boolean = false;
        private _processing: boolean = false;
        @Watch({ emit: false }) private _buffer: string;
        private _previousStatuses = [];
        private _poppedStatus: string;

        viewActivatedCallback() {
            super.viewActivatedCallback();
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'step':
                    if (!Utils.isNullOrEmpty(old) && val != this._poppedStatus)
                        this._previousStatuses.push(old);
                    if (val === SnapshotStep.Taking)
                        this._ensureWebcamRunning();
                    break;
                case 'value':
                case '_buffer':
                    let cnv = this._stage;
                    cnv.width = cnv.clientWidth;
                    cnv.height = cnv.clientHeight;
                    let ctx = cnv.getContext('2d');
                    if (Utils.isNullOrEmpty(val)) {
                        ctx.clearRect(0, 0, cnv.width, cnv.height);
                    } else {
                        Utils.loadImage(val).then(img => {
                            Utils.cropImageOntoCanvas(img, ctx, img.width, img.height);
                        });
                    }
                    break;
            }
        }

        private _setToBeConfirmed(buffer: string) {
            this.step = SnapshotStep.Confirm;
            this._buffer = buffer;
        }

        private _refreshBuffer(buffer: string): PromiseLike<string> {
            var cnv = this._stage;
            cnv.width = /*this.width ||*/ cnv.clientWidth;
            cnv.height = /*this.height ||*/ cnv.clientHeight;
            return Utils.cropImage(buffer, cnv.width, cnv.height);
        }

        private take(evt: Event) {
            evt.preventDefault();
            evt.stopPropagation();
            this.step = SnapshotStep.Taking;
        }

        private confirm(evt: Event) {
            evt.preventDefault();
            evt.stopPropagation();
            this.value =
            /*this.onselect.emit(
                'data:image/jpeg;base64,' +*/ this._buffer
                //)
                ;
            this._previousStatuses.splice(0);
            this.step = SnapshotStep.Start;
            this._buffer = '';
        }

        private back(evt: Event) {
            evt.preventDefault();
            evt.stopPropagation();
            this._buffer = this.value;
            if (this._previousStatuses.length <= 0) return;
            var prev: SnapshotStep = this._poppedStatus = this._previousStatuses.pop();
            this.step = prev;
        }

        private _ensureWebcamRunning() {
            if (this._canUseWebcam && !this._webcamInitialized) {
                var me = this;
                me._webcamInitialized = true;
                me._getUserMedia.apply(navigator, [{ video: true/*, audio: false*/ },
                                /* success */function (localMediaStream: MediaStream) {
                    var video = me._player;
                    // deprecated:
                    //video.src = window.URL.createObjectURL(localMediaStream);
                    // replaced with:
                    video.srcObject = localMediaStream;
                    function timeout() {
                        if (me._countdown <= 0) {
                            var cnv = document.createElement('canvas');
                            cnv.width = /*this.width ||*/ video.clientWidth;
                            cnv.height = /*this.height ||*/ video.clientHeight;
                            var ctx = cnv.getContext('2d');
                            Utils.cropImageOntoCanvas(video, ctx, video.videoWidth, video.videoHeight);
                            cnv.style.position = 'absolute';
                            let root = me._root;
                            root.insertBefore(cnv, video);
                            cnv.className = 'pacem-brightout pacem-preview';
                            setTimeout(function () {
                                root.removeChild(cnv);
                            }, 2000);
                            me._refreshBuffer(cnv.toDataURL()).then((b) => me._setToBeConfirmed(b));
                        }
                        else setTimeout(() => { me._countdown--; timeout(); }, 1000);
                    }

                    video.addEventListener('click', (evt) => {
                        me._countdown = 3;
                        timeout();
                    }, false);

                }, /* fail */function (e) {
                    alert((e || e.message).toString());
                }]);
            }
        }
    }
}