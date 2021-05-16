/// <reference path="../index.d.ts" />
namespace Pacem.Tests {

    export const mdTests = [{

        name: 'Markdown Parsing (UI)', test: function () {

            var md = new Pacem.MarkdownService();

            it('YouTube extra rule', function () {

                const videoid = 'mJ_-VoEB6zM';
                var v = `Do you like this?  
{yt}(${videoid})`;
                var actual1 = md.toHtml(v);
                var expected1 = `<p>Do you like this?<br />\n<!-- youtube embed -->
<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoid}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></p>`;

                expect(actual1).toEqual(expected1);

            });

            it('Twitter extra rule', function () {

                const tweetid = '1329504600857206787';
                var v = `{tweet}(${tweetid})`;
                var actual1 = md.toHtml(v);
                var expected1 = `<p><!-- twitter embed -->\n<pacem-tweetembed tweetid="${tweetid}"></pacem-tweetembed></p>`;

                expect(actual1).toEqual(expected1);

            });
        }
    }];

    export const mdParserTests = [{
        name: 'Markdown Parsing (lexer/parser/renderer)', test: function () {

            const md = new Pacem.Compile.Markdown.Parser();

            it('Headings (tokens)', function () {

                var v1 = 'Hello world!';
                var actual1 = md.tokenize(`# ${v1}`);
                expect(actual1.length).toEqual(1);
                const actual = actual1[0];
                expect(actual.type).toEqual('heading');
                expect(actual.level).toEqual(1);

                var actualNs = md.tokenize(`### ${v1}`);
                expect(actualNs.length).toEqual(1);

                const actualN = actualNs[0];
                expect(actualN.type).toEqual('heading');
                expect(actualN.level).toEqual(3);

                var actualMultiline = md.tokenize(`## ${v1}
Hi`);
                expect(actualMultiline.length).toEqual(2);

            });

            it('Headings (html)', function () {

                const v1 = 'Hello world!',
                    v10 = 'hello-world';
                var actual1 = md.toHtml(`# ${v1}`);
                var expected1 = `<h1 id="${v10}">${v1}</h1>`

                expect(actual1).toEqual(expected1);

                var actualN = md.toHtml(`### ${v1}`);
                var expectedN = `<h3 id="${v10}">${v1}</h3>`;

                expect(actualN).toEqual(expectedN);

                var actualMultiline = md.toHtml(`## ${v1}
Hi`);
                var expectedMultiline = `<h2 id="${v10}">${v1}</h2>
<p>Hi</p>`;

                expect(actualMultiline).toEqual(expectedMultiline);

            });

            it('Links (html)', function () {

                var v = 'Pacem', h = 'http://pacem.it';
                var actual = md.toHtml(`[${v}](${h})`);
                var expected = `<a href="${h}">${v}</a>`;

                expect(actual).toContain(expected);

            });

            it('Code priority (html)', function () {

                const v1 = 'normalized value `[0-100]`.',
                    actual1 = md.toHtml(v1),
                    expected1 = `normalized value <code>[0-100]</code>.`;

                expect(actual1).toContain(expected1);

                const v2 = 'should win **`emphasis`**.',
                    actual2 = md.toHtml(v2),
                    expected2 = `should win <b><code>emphasis</code></b>.`;

                expect(actual2).toContain(expected2);

                const v3 = 'should win `**code**`.',
                    actual3 = md.toHtml(v3),
                    expected3 = `should win <code>**code**</code>.`;

                expect(actual3).toContain(expected3);

                const v5 = 'should win ~~`delete`~~.',
                    actual5 = md.toHtml(v5),
                    expected5 = `should win <s><code>delete</code></s>.`;

                expect(actual5).toContain(expected5);

                const v4 = 'should win `~~code~~`.',
                    actual4 = md.toHtml(v4),
                    expected4 = `should win <code>~~code~~</code>.`;

                expect(actual4).toContain(expected4);

            });

            it('Images (html)', function () {

                var alt = 'baz', src = 'http://foo.it';
                var actual = md.toHtml(`![${alt}](${src})`);
                var expected = `<img src="${src}" alt="${alt}" />`;

                expect(actual).toContain(expected);

            });

            it('Images and links combined (html)', function () {

                var combo = '[![IMAGE ALT TEXT HERE](http://img.youtube.com/vi/YOUTUBE_VIDEO_ID_HERE/0.jpg)](http://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID_HERE)';
                var actual = md.toHtml(combo);
                var expected = `<a href="http://www.youtube.com/watch?v=YOUTUBE_VIDEO_ID_HERE"><img src="http://img.youtube.com/vi/YOUTUBE_VIDEO_ID_HERE/0.jpg" alt="IMAGE ALT TEXT HERE" /></a>`;

                expect(actual).toContain(expected);

            });

            it('Emphasis and paragraphs (html)', function () {

                var b = 'bold', i = 'italic';
                var actual = md.toHtml(`__${b}__
**${b}**, _${i}_, **_${b + i}_**
*${i}* **ciao a tutti**`);
                var expected = `<p><b>${b}</b>
<b>${b}</b>, <i>${i}</i>, <b><i>${b + i}</i></b>
<i>${i}</i> <b>ciao a tutti</b></p>`;

                expect(actual).toEqual(expected);

            });

            it('Strike-through (html)', function () {

                var v = 'I was wrong';
                var actual = md.toHtml(`~~${v}~~`);
                var expected = `<s>${v}</s>`;

                expect(actual).toContain(expected);

            });

            it('Quote (html)', function () {

                var v = 'Works on my machine';
                var actual = md.toHtml(`:"${v}":`);
                var expected = `<q>${v}</q>`;

                expect(actual).toContain(expected);

            });

            it('Inline code (html)', function () {

                var v = 'it(<\'was\'>, fun);';
                var actual = md.toHtml(`\`${v}\``);
                var expected = `<code>it(&lt;\'was\'>, fun);</code>`;
                expect(actual).toContain(expected);

                // strange case 
                const v1 = 'The `percentage` must be provided in a normalized value `[0-100]`.',
                    actual1 = md.toHtml(v1),
                    expected1 = 'The <code>percentage</code> must be provided in a normalized value <code>[0-100]</code>';
                expect(actual1).toContain(expected1);
            });

            it('Blockquote and paragraphs (html)', function () {

                var v = `
> ciao`;
                var actual = md.toHtml(`${v}`);
                var expected = `<blockquote>\n<p>ciao</p>\n</blockquote>`;
                expect(actual).toEqual(expected);

                var v1 = `
> ciao
> a
> tutti
quanti`;
                var actual1 = md.toHtml(`${v1}`);
                var expected1 = `<blockquote>
<p>ciao
a
tutti</p>
</blockquote>
<p>quanti</p>`;
                expect(actual1).toEqual(expected1, actual1.replace(/\s/g, '-') + '\nvs\n' + expected1.replace(/\s/g, '-'));

            });

            it('Code block and paragraphs (html)', function () {

                var pretest_exp = "\nfoo\n";;
                var pretest_act = `
foo
`;
                expect(pretest_act).toEqual(pretest_exp);

                var p_exp = "<p>foo</p>";
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
                var expected = `<p>paragraph</p>
<pre>
<code class="javascript">var foo = 'baz';
setInterval(() => { alert(foo); }, 10);
// done
</code>
</pre>`;
                expect(actual).toEqual(expected);

            });

            it('Double paragraph (tokens)', function () {

                var v = `A paragraph

Another paragraph`;
                var actual = md.tokenize(`${v}`);
                expect(actual.length).toEqual(3);

            });

            it('Double paragraph (html)', function () {

                var v = `A paragraph

Another paragraph`;
                var actual = md.toHtml(`${v}`);
                var expected = `<p>A paragraph</p>\n<p>Another paragraph</p>`;
                expect(actual).toEqual(expected);

            });

            it('Horizontal rule (html)', function () {

                var v0 = `-------`;
                var v1 = `-----`;
                var actual0 = md.toHtml(`${v0}`);
                var actual1 = md.toHtml(`${v1}`);
                var expected = `<hr />`;
                expect(actual0).toEqual(expected);
                expect(actual1).toEqual(expected);

            });

            it('(Un)ordered lists (html)', function () {

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
                var expected = `<ul>
\t<li>1st item</li>
\t<li>2nd item</li>
\t<li>3rd item</li>
</ul>`;
                expect(actual).toEqual(expected);

                var actual1 = md.toHtml(`${v1}`);
                var expected1 = `<ol start="1">
\t<li>1st item</li>
\t<li>2nd item</li>
\t<li>3rd item</li>
</ol>`;
                expect(actual1).toEqual(expected1);

            });

            it('Lists with nested stuff (tokens + html)', function () {

                var v = `
- 1st item
    2) 1st nested
    3) 2nd nested
- 2nd item
- 3rd item
`;
                var tokens = md.tokenize(v);
                expect(tokens.length).toEqual(2);

                const token = tokens[tokens.length - 1];
                tokens = token.tokens;

                expect(tokens[0].tokens.length).toEqual(3);

                var actual = md.toHtml(v);
                var expected = `<ul>
\t<li><p>1st item</p>
<ol start="2">
\t<li>1st nested</li>
\t<li>2nd nested</li>
</ol>
</li>
\t<li>2nd item</li>
\t<li>3rd item</li>
</ul>`;
                expect(actual).toEqual(expected);


            });
        }

    }];
}
