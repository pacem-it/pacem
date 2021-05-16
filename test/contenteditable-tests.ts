/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    const ROOT_ATTRS = ' role="presenter" contenteditable="true" pacem ';
    function wrapHtml(core: string): DocumentFragment {
        const html = `<div${ROOT_ATTRS}>${core}</div>`;
        const div = document.createElement('div');
        div.innerHTML = html;
        const frag = new DocumentFragment();
        frag.appendChild(div.firstElementChild);
        return frag;
    }
    function resetPlayground(content: string): HTMLDivElement {
        playground.innerHTML = '';
        playground.append(wrapHtml(content));
        return playground.firstElementChild as HTMLDivElement;
    }

    const playground = document.createElement('div');
    playground.hidden = true;
    document.body.appendChild(playground);
    const range = document.createRange();

    export const richTextTests = [{

        name: 'Range behavior check', test: function () {
            it('Should sever between text and node context (as intuitively expected)', function () {

                const div = resetPlayground(`<span>Single node</span>`);
                range.setStart(div.firstElementChild.firstChild, 0);
                range.setEnd(div.firstElementChild.firstChild, 11);

                expect(range.startContainer).toEqual(range.endContainer);
                expect(range.startContainer.nodeType).toEqual(Node.TEXT_NODE);

                range.setStart(div.firstElementChild, 0);
                range.setEnd(div.firstElementChild, 1);

                expect(range.startContainer).toEqual(range.endContainer);
                expect(range.startContainer.nodeType).toEqual(Node.ELEMENT_NODE);

            });
        }
    },
    {
        name: 'Range to Nodes', test: function () {

            it('Shouldn\'t find any relevant block element', function () {

                const div = resetPlayground(`<span>Hello</span><span>World</span>`);
                range.setStart(div.firstElementChild.firstChild, 0);
                range.setEnd(div.lastElementChild.firstChild, 5);
                const empty = Pacem.Components.Scaffolding.ContenteditableUtils.findSurroundingSiblingBlockElements(range);
                expect(Utils.isNullOrEmpty(empty)).toBeTruthy();
            });

            it('Should find relevant block elements', function () {

                const div = resetPlayground(`<p>Hello</p><p>World</p>`);
                range.setStart(div.firstElementChild.firstChild, 0);
                range.setEnd(div.lastElementChild.firstChild, 5);
                const two = Pacem.Components.Scaffolding.ContenteditableUtils.findSurroundingSiblingBlockElements(range);
                expect(two.length).toEqual(2);
            });
        }
    }]
}