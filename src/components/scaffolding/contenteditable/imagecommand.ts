/// <reference path="../contenteditable.ts" />
/// <reference path="utils.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    //@CustomElement({ tagName: P + '-contenteditable-selectable' })
    //export class PacemContenteditableSelectableBehaviorElement extends Pacem.Behaviors.PacemBehavior {

    //    protected decorate(element: Element) {
    //        if (element instanceof HTMLElement || element instanceof SVGElement) {
    //            Utils.addClass(element, PCSS + '-contenteditable-selectable');
    //        }
    //    }
    //    protected undecorate(element: Element) {
    //        if (element instanceof HTMLElement || element instanceof SVGElement) {
    //            Utils.removeClass(element, PCSS + '-contenteditable-selectable');
    //        }
    //    }

    //}

    function insertPicture(range: Range, blob: Blob): Promise<HTMLPictureElement> {

        return new Promise((resolve, reject) => {
            Utils.blobToDataURL(blob)
                .then(Utils.loadImage)
                .then(img => {

                    const pic = document.createElement('picture');
                    pic.setAttribute('contenteditable', 'false');
                    img.tabIndex = 0;
                    pic.appendChild(img);
                    range.deleteContents();
                    range.insertNode(pic);
                    resolve(pic);
                });
        });
    }

    @CustomElement({
        tagName: P + '-contenteditable-imagecommand', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<input type="file" accept="image/png, image/gif, image/jpeg, image/bmp, image/x-icon" class="${PCSS}-trasparent ${PCSS}-inert" pacem hidden>` +
            CONTENTELEMENT_BUTTONCOMMAND_TEMPLATE + `<${P}-rescale keep-proportions="true"></${P}-rescale>`
    })
    export class PacemContenteditableImageCommandElement extends PacemContenteditableButtonCommandElement implements ContenteditableFileCommand {

        pasteCallback(f: File) {
            if (f.type.startsWith('image')) {
                return insertPicture(this.range, f);
            } else {
                return Promise.reject();
            }
        }

        cleanUp(content: HTMLElement): void {
            content.querySelectorAll('picture[contenteditable=false]').forEach(pic => {
                const childCount = pic.childNodes.length;
                for (let j = childCount - 1; j > 0; j--) {
                    // remove leftover rescale divs
                    pic.childNodes.item(j).remove();
                }
            });
            // legacy leftovers
            content.querySelectorAll('div.' + PCSS + '-rescale').forEach(i => i.remove());
        }

        isRelevant(range: Range): boolean {
            return false;
        }

        @ViewChild('input[type=file]') private _file: HTMLInputElement;
        @ViewChild(P + "-rescale") private _rescale: PacemRescaleElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            if (Utils.isNullOrEmpty(this.altText)) {
                this.altText = 'insert image';
            }
            if (Utils.isNullOrEmpty(this.icon)) {
                this.icon = 'insert_photo';
            }
            if (Utils.isNullOrEmpty(this.keyboardShortcut)) {
                this.keyboardShortcut = 'Ctrl+Shift+I';
            }
            this._rescale.addEventListener('rescale', this._rescaleImg, false);
        }

        disconnectedCallback() {
            if (!Utils.isNull(this._rescale)) {
                this._rescale.removeEventListener('rescale', this._rescaleImg, false);

                this._disposeContainer();

            }
            super.disconnectedCallback();
        }

        propertyChangedCallback(name: string, old, val, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'disabled':
                    if (!Utils.isNull(this._rescale)) {
                        this._rescale.disabled = val;
                    }
                    break;
                case 'contentElement':
                    if (old) {
                        this._disposeContainer(old);
                    }
                    if (val) {
                        this._initContainer(val); 
                    }
                    break;
                case 'range':
                    this._rangeChangeCallback(old, val);
                    break;
            }
        }

        exec(): Promise<void> {
            return new Promise<void>((resolve, reject) => {

                const file = this._file,
                    range = this.range;
                file.onchange = (evt) => {
                    const f = file.files[0];

                    if (Utils.isNull(f)) {

                        resolve();

                    } else {

                        insertPicture(range, f)
                            .then(pic => {
                                file.value = '';
                                resolve();
                            });
                    }
                };
                file.click();

            });
        }

        // #region private

        private _rescaleImg(evt: Pacem.UI.RescaleEvent) {
            evt.preventDefault();
            const pic = evt.detail.element as HTMLPictureElement,
                rect = evt.detail.targetRect,
                img = pic.firstElementChild as HTMLImageElement;

            img.style.width = rect.width + 'px';
            img.style.height = rect.height + 'px';
        }
        #observer: ContenteditableDOMObserver;
        
        private _rangeChangeCallback(old: Range, val: Range) {
            if (!Utils.isNull(old)
                && !old.collapsed
                && old.commonAncestorContainer instanceof Element
                && old.commonAncestorContainer === old.startContainer
                && old.commonAncestorContainer === old.endContainer
                && old.startOffset === (old.endOffset - 1)) {
                const el = old.commonAncestorContainer.childNodes.item(old.startOffset);
                if (el instanceof HTMLPictureElement) {
                    this._rescale.unregister(el);
                }
            }
            if (!Utils.isNull(val)
                && !val.collapsed
                && val.commonAncestorContainer instanceof Element
                && val.commonAncestorContainer === val.startContainer
                && val.commonAncestorContainer === val.endContainer
                && val.startOffset === (val.endOffset - 1)) {
                const el = val.commonAncestorContainer.childNodes.item(val.startOffset);
                if (el instanceof HTMLPictureElement) {
                    this._rescale.register(el);
                }
            }
        }
        private _setBehaviorHandler = (evt: Event) => {
            const img = evt.target as Node,
                pic = img.parentElement;
            // this._rescale.register(pic);
            this.range = ContenteditableUtils.select(pic);
        };
        private _disposeBehaviorHandler = (_) => {
        };
        private _enhancePictureElement(pic: HTMLPictureElement) {
            if (pic.firstElementChild) {
                pic.firstElementChild.addEventListener('focus', this._setBehaviorHandler, false);
                pic.firstElementChild.addEventListener('blur', this._disposeBehaviorHandler, false);
            }
        }
        private _downgradePictureElement(pic: HTMLPictureElement) {
            if (pic.firstElementChild) {
                // this._rescale.unregister(pic);
                pic.firstElementChild.removeEventListener('focus', this._setBehaviorHandler, false);
                pic.firstElementChild.removeEventListener('blur', this._disposeBehaviorHandler, false);
            }
        }
        private _initContainer(contentElement = this.contentElement) {
            this.#observer = new ContenteditableDOMObserver(contentElement, (pic, removed) => {
                if (pic instanceof HTMLPictureElement) {
                    if (removed) {
                        this._downgradePictureElement(pic);
                    } else {
                        this._enhancePictureElement(pic);
                    }
                }
            }, 'picture');
        }

        private _disposeContainer(_ = this.contentElement) {
            const observer = this.#observer;
            if (!Utils.isNull(observer)) {
                observer.dispose();
            }
        }

        // #endregion

    }

}