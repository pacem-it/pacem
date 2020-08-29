/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const mdTests = [{ 

        name: 'Markdown Parsing', test: function () {

            var md = new Pacem.MarkdownService();

            it('Headings', function () {

                var v1 = 'Hello world!';
                var actual1 = md.toHtml(`# ${v1}`);
                var expected1 = `<h1>${v1}</h1>`

                expect(actual1).toEqual(expected1);

                var actualN = md.toHtml(`### ${v1}`);
                var expectedN = `<h3>${v1}</h3>`;

                expect(actualN).toEqual(expectedN);

                var actualMultiline = md.toHtml(`## ${v1}
Hi`);
                var expectedMultiline = `<h2>${v1}</h2>
<p>Hi</p>`;

                expect(actualMultiline).toEqual(expectedMultiline);

            });

            it('Links', function () {

                var v = 'Pacem', h = 'http://pacem.it';
                var actual = md.toHtml(`[${v}](${h})`);
                var expected = `<a href="${h}">${v}</a>`;

                expect(actual).toContain(expected);

            });

            it('Images', function () {

                var alt = 'baz', src = 'http://foo.it';
                var actual = md.toHtml(`![${alt}](${src})`);
                var expected = `<img alt="${alt}" src="${src}" />`;

                expect(actual).toContain(expected);

            });

            it('Images and links combined', function () {

                var combo = '[![IMAGE ALT TEXT HERE](http://img.youtube.com/vi/YOUTUBE_VIDEO_ID_HERE/0.jpg)](http://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID_HERE)';
                var actual = md.toHtml(combo);
                var expected = `<a href="http://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID_HERE"><img alt="IMAGE ALT TEXT HERE" src="http://img.youtube.com/vi/YOUTUBE_VIDEO_ID_HERE/0.jpg" /></a>`;

                expect(actual).toContain(expected);

            });

            it('Emphasis and paragraphs', function () {

                var b = 'bold', i = 'italic';
                var actual = md.toHtml(`__${b}__
**${b}**, _${i}_
*${i}*`);
                var expected = `<p><b>${b}</b>
<b>${b}</b>, <i>${i}</i>
<i>${i}</i></p>`;

                expect(actual).toEqual(expected);

            });

            it('Strike-through', function () {

                var v = 'I was wrong';
                var actual = md.toHtml(`~~${v}~~`);
                var expected = `<del>${v}</del>`;

                expect(actual).toContain(expected);

            });

            it('Quote', function () {

                var v = 'Works on my machine';
                var actual = md.toHtml(`:"${v}":`);
                var expected = `<q>${v}</q>`;

                expect(actual).toContain(expected);

            });

            it('Inline code', function () {

                var v = 'it(\'was\', fun);';
                var actual = md.toHtml(`\`${v}\``);
                var expected = `<code>${v}</code>`;
                expect(actual).toEqual(expected);

            });

            it('(Un)ordered lists', function () {

                var v = `
- 1st item
- 2nd item
- 3rd item
`;
                var v1 = `
1.  1st item
2.  2nd item
3.  3rd item
`;
                var actual = md.toHtml(`${v}`);
                var expected = `
<ul>
\t<li>1st item</li>
\t<li>2nd item</li>
\t<li>3rd item</li>
</ul>
`;
                expect(actual).toEqual(expected);

                var actual1 = md.toHtml(`${v1}`);
                var expected1 = `
<ol>
\t<li>1st item</li>
\t<li>2nd item</li>
\t<li>3rd item</li>
</ol>
`;
                expect(actual1).toEqual(expected1);

            });

            it('Horizontal rule', function () {

                var v0 = `
-------`;
                var v1 = `\n-----`;
                var actual0 = md.toHtml(`${v0}`);
                var actual1 = md.toHtml(`${v1}`);
                var expected = `\n<hr />`;
                expect(actual0).toEqual(expected);
                expect(actual1).toEqual(expected);

            });

            it('Blockquote and paragraphs', function () {

                var v = `
> ciao`;
                var actual = md.toHtml(`${v}`);
                var expected = `\n<blockquote>\n<p>ciao</p>\n</blockquote>`;
                expect(actual).toEqual(expected);

                var v1 = `
> ciao
> a
> tutti
quanti`;
                var actual1 = md.toHtml(`${v1}`);
                var expected1 = `
<blockquote>
<p>ciao
a
tutti</p>
</blockquote>
<p>quanti</p>`;
                expect(actual1).toEqual(expected1);

            });

            it('Code block and paragraphs', function () {

                var pretest_exp = "\nfoo\n";;
                var pretest_act = `
foo
`;
                expect(pretest_act).toEqual(pretest_exp);
                    
                var p_exp = "\n<p>foo</p>";
                var p_act = md.toHtml("\nfoo\n");

                expect(p_act).toEqual(p_exp);

                const triplet = '```';
                var v = `
paragraph
${triplet}JavaScript
var foo = 'baz';
setInterval(() => { alert(foo); }, 10);
// done
${triplet}`;
                var actual = md.toHtml(`${v}`);
                var expected = `\n<p>paragraph</p>\n<code class="pacem-code-block javascript"><span class="pacem-keyword">var</span> foo = <span class="pacem-string">'baz'</span>;
setInterval(() =&gt; { alert(foo); }, <span class="pacem-number">10</span>);
<span class="pacem-comment">// done</span></code>`;
                expect(actual).toEqual(expected);

            });



            it('Double paragraph', function () {

                var v = `A paragraph

Another paragraph`;
                var actual = md.toHtml(`${v}`);
                var expected = `<p>A paragraph</p>\n<p>Another paragraph</p>`;
                expect(actual).toEqual(expected);

            });
        }
    }];

}
