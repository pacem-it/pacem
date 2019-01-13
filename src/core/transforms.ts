/// <reference path="decorators.ts" />
namespace Pacem {

    class Transforms {

        @Transformer()
        static highlight(src: any, query: any, css: string = 'pacem-highlight') {
            if (!query || !src) return src;
            let output = src.substr(0);
            var trunks = query.substr(0).split(' ');
            for (var j = 0; j < trunks.length; j++) {
                var regex = new RegExp('(?![^<>]*>)' + trunks[j], 'gi');
                output = output.replace(regex, function (piece, index: number, whole: string) {
                    var startTagNdx, endTagIndex;
                    if ((startTagNdx = whole.indexOf('<', index)) != (endTagIndex = whole.indexOf('</', index)) || startTagNdx == -1)
                        return '<span class="' + css + '">' + piece + '</span>';
                    return piece;
                });
            }
            return output;
        }

        @Transformer()
        static size(src: number): string {
            // TODO: use logarithms
            if (!(src > 0))
                return '-';
            if (src < 1024 /* 1kB */)
                return src + ' B';
            if (src < 1048576 /* 1MB */)
                return (src / 1024).toFixed(2) + ' kB';
            if (src < 1073741824 /* 1GB */)
                return (src / 1048576).toFixed(2) + ' MB';
            return (src / 1073741824).toFixed(2) + ' GB';
        }

        @Transformer()
        static decToDeg(src: number, degSeparator = '° ', minSeparator = '\' ', secSeparator = '"'): string {
            const deg = Math.floor(src),
                min0 = (src - deg) * 60,
                min = Math.floor(min0),
                sec0 = (min0 - min) * 60,
                sec = Math.floor(sec0);
            return deg + degSeparator + min + minSeparator + sec + secSeparator;
        }

        @Transformer()
        static date(src: string | Date | number, format: 'short' | 'full' | 'iso' | 'isodate' | Intl.DateTimeFormatOptions, culture?: string) {
            var date = Utils.parseDate(src);
            if (Utils.isNull(format) || typeof format === 'string') {
                switch (format) {
                    case 'iso':
                        return date.toISOString();
                    case 'isodate':
                        return `${date.getFullYear()}-${(date.getMonth() + 1)}-${date.getDate()}`;
                    case 'full':
                        const offset = -(date.getTimezoneOffset() / 60);
                        var utc = '';
                        if (offset != 0)
                            utc = ' (UTC' + ((offset > 0 ? '+' : '-') + Math.abs(offset).toLocaleString()) + ')';
                        return date.toLocaleString(culture) + utc;
                    default:
                        return date.toLocaleDateString(culture);
                }
            } else {
                return date.toLocaleString(culture, format);
            }
        }

        @Transformer()
        static currency(src: number, currency: string, culture?: string) {
            return new Intl.NumberFormat(culture || navigator.language, { style: 'currency', currency: currency }).format(src);
        }

        @Transformer()
        static filter(src: any[], filter: (e: any, j:number) => boolean): any[] {
            return src.filter(filter);
        }

        @Transformer()
        static orderby(src: any[], prop?: string): any[] {
            return src.sort((a, b) => {
                if (!Utils.isNullOrEmpty(prop)) {
                    a = a[prop];
                    b = b[prop];
                }
                return a > b ? 1 : (a < b ? -1 : 0);
            });
        }

    }

}