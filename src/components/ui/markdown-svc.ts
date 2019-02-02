/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem {

    declare type ReplaceFn = (string: string, ...args: any[]) => string;
    declare type Replacer = { regex: RegExp, fn: (string: string, RegExp: RegExp) => string };
    declare type Replacer2 = { regex: RegExp, fn: string | ReplaceFn };
    const code_block_regex = /`{3}([\w#-]*)\r?\n([\s\S]*?)\n`{3}/g;

    const R = RegularExpressions;
    const REGEX = R.Regex;
    function void_replacer(): Replacer2 { return { regex: R.EMPTY_MATCHER, fn: (m) => m } };

    const regexes: Replacer[] = [
        // (* = totally custom markdown)
        // headings
        { regex: /^(#+)\s(.*)\s*$/gm, fn: (inp: string, r: RegExp) => inp.replace(r, function (m, m0, m1) { return `<h${m0.length}>${m1}</h${m0.length}>`; }) },
        // images
        { regex: /!\[([^\]]+)\]\(([^\)]+)\)/g, fn: (inp: string, r: RegExp) => inp.replace(r, `<img alt="$1" src="$2" />`) },
        // #region embed links
        // *tweet-embed
        {
            regex: /\[tweet\]\(([^\)]+)\)/g, fn: (inp: string, r: RegExp) => inp.replace(r, `<!-- twitter embed $1 -->\n<${ P }-tweetembed tweetid="$1"></${ P }-tweetembed>`)
        },
        // *youtube-embed
        {
            regex: /\[yt([\d]+x[\d]+)?\]\(([^\)]+)\)/g, fn: (inp: string, r: RegExp) => inp.replace(r, function (m, m0, m1) {
                m0 = m0 || '560x315';
                const size = m0.split('x'),
                    w = size[0], h = size[1];
                return `<!-- youtube embed ${m1} ${m0} -->
<iframe width="${w}" height="${h}" src="https://www.youtube.com/embed/${m1}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
            })
        },
        // #endregion
        // links
        { regex: /\[([^\]]+)\]\(([^\)]+)\)/g, fn: (inp: string, r: RegExp) => inp.replace(r, `<a href="$2">$1</a>`) },
        // bold/italics
        { regex: /(^|[^\w])(\*\*?|__?)(.*?)\2([^\w]|$)/gm, fn: (inp: string, r: RegExp) => inp.replace(r, function (m, s0, m0, m1, s1) { const tag = m0.length == 1 ? 'i' : 'b'; return `${s0}<${tag}>${m1}</${tag}>${s1}` }) },
        // strikethrough
        { regex: /\~\~(.*?)\~\~/g, fn: (inp: string, r: RegExp) => inp.replace(r, `<del>$1</del>`) },
        // quotes
        { regex: /\:\"(.*?)\"\:/g, fn: (inp: string, r: RegExp) => inp.replace(r, `<q>$1</q>`) },
        // code inlines
        { regex: /`([^`]*)`/g, fn: (inp: string, r: RegExp) => inp.replace(r, `<code>$1</code>`) },
        // (un)ordered lists
        { regex: /\n(-|\d+\.)\s+(.*)/g, fn: (inp: string, r: RegExp) => inp.replace(r, function (m, m0, m1) { const tag = m0 === '-' ? 'ul' : 'ol'; return `\n<${tag}>\n\t<li>${m1}</li>\n</${tag}>` }) },
        // fix for extra <ul>s
        { regex: /\n<\/(u|o)l>\n<\1l>/g, fn: (inp: string, r: RegExp) => inp.replace(r, '') },
        // blockquotes
        {
            regex: /(\n(&gt;|>)\s.*)+/g, fn: (inp: string, r: RegExp) => inp.replace(r, function (m, m0, m1) {
                var splitted = m.replace(/^(&gt;|>)\s(.*)$/gm, function (g, g0, g1) {
                    return g1;
                });
                return `\n<blockquote>${splitted}\n</blockquote>`;
            })
        },
        // horizontal rules
        { regex: /\n-{5,}/g, fn: (inp: string, r: RegExp) => inp.replace(r, function (m, m0, m1) { return `\n<hr />`; }) }/*,
        // paragraphs
        { regex: /\s{2}/g, fn: (inp: string, r: RegExp) => inp.replace(r, '<br />') }*/
    ];

    export class MarkdownService {

        private _inparagraph = false;

        // TODO: error prone and NOT safe. Process content line by line using encoding, regexes /m and scope variables. Try to keep it clean as well
        toHtml(md: string) {

            const _this = this,
                escapedMd = md.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
                trunks = REGEX.split(escapedMd, code_block_regex);
            var retval = [];
            for (var t of trunks) {
                if (t.match) {

                    retval.push(t.value.replace(code_block_regex, function (m, m0, m1) {
                        const lang = (m0 || 'unknown').replace('#', '-sharp').toLowerCase(),
                            code = _this._parseCode(m1, lang);
                        return `\n<code class="${PCSS}-code-block ${lang}">${code}</code>`;
                    }));

                } else {

                    let out = t.value;
                    for (var i of regexes) {
                        out = i.fn(out, i.regex);
                    }
                    var step = _this._paragraphy(out) + (_this._inparagraph ? '</p>' : '');
                    retval.push(_this._thenSafe(_this._thenTrim(step)));
                }
            }
            return retval.join('');
        }

        private _parseCode(code: string, lang: string) {
            var keywords = void_replacer(),
                numbers = void_replacer(),
                strings = void_replacer(),
                comments = void_replacer(),
                tags = void_replacer(),
                attrs = void_replacer();

            lang = lang.toLowerCase();
            switch (lang) {
                case 'c#':
                case 'c-sharp':
                case 'js':
                case 'javascript':
                case 'ts':
                case 'typescript':
                    if (lang.startsWith('c')) {
                        keywords.regex = /\b(abstract|as|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|else|enum|event|explicit|extern|false|finally|fixed|float|for|foreach|goto|if|implicit|in|int|interface|internal|is|lock|long|namespace|new|null|object|operator|out|out|override|params|private|protected|public|readonly|ref|return|sbyte|sealed|short|sizeof|stackalloc|static|string|struct|switch|this|throw|true|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|static|virtual|void|volatile|while|add|alias|ascending|async|await|descending|dynamic|from|get|global|group|into|join|let|nameof|orderby|partial|remove|select|set|value|var|when|where|yield)\b/g;
                        strings.regex = /'(\\'|[^'])*[^\\]?'|@?\$?"(\\"|[^"])*[^\\]?"/g;
                    } else {
                        keywords.regex = /\b(abstract|arguments|async|await|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|eval|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|let|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try|typeof|var|void|volatile|while|with|yield)\b/g;
                        strings.regex = /'(\\'|[^'])*[^\\]?'|"(\\"|[^"])*[^\\]?"|`(\\`|[^`])*[^\\]?`/g;
                    }
                    keywords.fn = '<span class="'+ PCSS +'-keyword">$1</span>';
                    strings.fn = (m) => `<span class="${PCSS}-string">${m}</span>`;
                    numbers.regex = /\b((0x[0-9a-fA-F]|[\d])*\.?[\d]+)\b/g;
                    numbers.fn = '<span class="'+ PCSS +'-number">$1</span>';
                    comments.regex = /(\/\/.*|\/\*(?:(?!(\*\/))[\s\S])*\*\/)/g;
                    comments.fn = `<span class="${PCSS}-comment">$1</span>`;
                    break;
                case 'xml':
                case 'html':
                    tags.regex = /(&lt;\/?)([\w-]+)|(\/?&gt;)/g;
                    tags.fn = (m, m1, m2, m3) => {
                        if (Utils.isNullOrEmpty(m3))
                            return `<span class="${PCSS}-tag">${m1}</span><span class="${PCSS}-tag-name">${m2}</span>`;
                        return `<span class="${PCSS}-tag">${m3}</span>`;
                    }
                    strings.regex = /(=')(\\'|[^'])*[^\\]?(')|(=")(\\"|[^"])*[^\\]?(")/g;
                    strings.fn = (m) => `<span class="${PCSS}-string">${m}</span>`;
                    // isn't this ugly?:
                    attrs.regex = /(\s[\w-]+)$/g;
                    attrs.fn = `<span class="${PCSS}-attribute">$1</span>`;
                    comments.regex = /((<|&lt;)!--(?:(?!(--(>|&gt;)))[\s\S])*--(>|&gt;))/g;
                    comments.fn = `<span class="${PCSS}-comment">$1</span>`;
            }

            var split = REGEX.split(code, comments.regex);
            var retval = [];
            for (var t of split) {
                if (t.match)
                    retval.push(t.value.replace(comments.regex, <any>comments.fn));
                else {
                    let split2 = REGEX.split(t.value, strings.regex);
                    let retval2 = [];
                    for (var t2 of split2) {
                        if (t2.match) {
                            retval2.push(t2.value
                                .replace(strings.regex, <any>strings.fn));
                        } else {
                            retval2.push(t2.value
                                .replace(tags.regex, <any>tags.fn)
                                .replace(keywords.regex, <any>keywords.fn)
                                .replace(attrs.regex, <any>attrs.fn)
                                .replace(numbers.regex, <any>numbers.fn)
                            );
                        }
                    }
                    retval.push(retval2.join(''));
                }
            }

            return retval.join('');
        }

        private _paragraphy(semi: string) {
            this._inparagraph = false;

            var incode = false,
                _this = this;
            return semi.replace(/^([^\n]*)$/gm, function (m, m0, index, whole) {

                if ((/^<code\s+([^>]+)>$/.test(m) && !incode) || (incode && /^<\/code>$/.test(m)))
                    incode = !incode;
                if (incode || /^\s*<\/?(ul|ol|li|h|p|bl|code)/i.test(m)) {
                    if (_this._inparagraph === false)
                        return m;
                    _this._inparagraph = false;
                    return '</p>\n' + m;
                }
                //
                var ret = m0.replace(/\s{2}/g, '<br />');
                if (!_this._inparagraph) {
                    if (m0.length > 0) {
                        ret = '<p>' + ret;
                        _this._inparagraph = true;
                    }
                } else if (m0 === undefined || m0.length === 0) {
                    _this._inparagraph = false;
                    ret += '</p>';
                }
                return ret;
            });
        }

        private _thenTrim(step: string) {
            return step.replace(/<p>(((?!<\/p>)(.|[\r\n]))*)<\/p>/g, function (m, m0, m1) {
                return `<p>${m0.trim()}</p>`;
            });

        }

        private _thenSafe(step: string): string {
            //return step.replace(/<\/?([\w]+-[\w]+|script)(?:[^>=]|='[^']*'|="[^"]*"|=[^'"][^\s>]*)*>/g, '');
            return step.replace(/<\/?script(?:[^>=]|='[^']*'|="[^"]*"|=[^'"][^\s>]*)*>/g, '');
        }

    }

}