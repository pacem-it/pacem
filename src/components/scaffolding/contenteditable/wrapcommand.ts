/// <reference path="utils.ts" />
/// <reference path="../contenteditable.ts" />
/// <reference path="types.ts" />
namespace Pacem.Components.Scaffolding {

    @CustomElement({
        tagName: P + '-contenteditable-wrapcommand', shadow: Defaults.USE_SHADOW_ROOT,
        template: CONTENTELEMENT_BUTTONCOMMAND_TEMPLATE
    })
    export class PacemContenteditableWrapCommandElement extends PacemContenteditableButtonCommandElement {

        isRelevant(range: Range): boolean {
            return !Utils.isNull(
                ContenteditableUtils.findSurroundingNode(range, this.tagname)
            );
        }

        @Watch({ converter: PropertyConverters.String }) tagname: string;

        exec() {
            return new Promise<void>((resolve, _) => {

                const tagName = this.tagname;
                if (!Utils.isNullOrEmpty(tagName)) {
                    const range = this.range;

                    const alreadyEl = ContenteditableUtils.findSurroundingNode(range, tagName)
                        || ContenteditableUtils.findSurroundingNode(range.startContainer, tagName)
                        || ContenteditableUtils.findSurroundingNode(range.endContainer, tagName);

                    if (Utils.isNull(alreadyEl)) {

                        // WRAP

                        const elementsToWrap = ContenteditableUtils.findSurroundingSiblingBlockElements(range);
                        if (!Utils.isNullOrEmpty(elementsToWrap)) {
                            const newChild = document.createElement(tagName);
                            if (elementsToWrap.length === 1) {
                                // replace
                                const repl = elementsToWrap[0];
                                range.setStart(repl, 0);
                                range.setEnd(repl, repl.childNodes.length);
                                const frag = range.extractContents();
                                newChild.append(frag);
                                ContenteditableUtils.copyAttributes(newChild, repl);
                                repl.parentElement.insertBefore(newChild, repl);
                                repl.remove();
                            } else {
                                // wrap
                                range.setStartBefore(elementsToWrap[0]);
                                range.setEndAfter(elementsToWrap[elementsToWrap.length - 1]);
                                const frag = range.extractContents();
                                newChild.append(frag);
                                range.insertNode(newChild);
                            }
                            const r = ContenteditableUtils.select(newChild, true);
                            r.collapse();
                        }
                    } else {

                        // UNWRAP

                        range.setStart(alreadyEl, 0);
                        range.setEnd(alreadyEl, alreadyEl.childNodes.length);
                        // replace or unwrap
                        let replace = false;
                        const childNodes = alreadyEl.childNodes;
                        for (let j = 0; j < childNodes.length; j++) {
                            const child = childNodes.item(j);
                            if (!ContenteditableUtils.isBlockElement(child)) {
                                replace = true;
                                break;
                            }
                        }

                        if (replace) {
                            const p = document.createElement('p');
                            ContenteditableUtils.copyAttributes(p, alreadyEl);
                            p.append(range.extractContents());
                            alreadyEl.parentNode.replaceChild(p, alreadyEl);
                            const r = ContenteditableUtils.select(p, true);
                            r.collapse();
                        } else {
                            // unwrap
                            alreadyEl.parentNode.replaceChild(range.extractContents(), alreadyEl);
                            const r = ContenteditableUtils.select(range.endContainer, true);
                            r.collapse();
                        }
                    }


                }
                resolve();

            });
        }
    }
}