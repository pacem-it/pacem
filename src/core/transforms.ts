/// <reference path="decorators.ts" />
namespace Pacem {

    class Transforms {

        @Transformer()
        static highlight(src: any, query: any, css: string = PCSS + '-highlight') {
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
        static date(src: string | Date | number, format: 'short' | 'full' | 'iso' | 'isodate' | 'localdate' | Intl.DateTimeFormatOptions, culture?: string) {
            var date = Utils.parseDate(src),
                lang = culture || navigator.language;
            if (Utils.isNull(format) || typeof format === 'string') {
                switch (format) {
                    case 'iso':
                        return date.toISOString();
                    case 'isodate':
                        return date.toISOString().substr(0, 10);
                    case 'localdate':
                        return `${date.getFullYear()}-${Utils.leftPad(date.getMonth() + 1, 2, '0')}-${Utils.leftPad(date.getDate(), 2, '0')}`;
                    case 'full':
                        const offset = -(date.getTimezoneOffset() / 60);
                        var utc = '';
                        if (offset != 0)
                            utc = ' (UTC' + ((offset > 0 ? '+' : '-') + Math.abs(offset).toLocaleString()) + ')';
                        return date.toLocaleString(lang) + utc;
                    default:
                        return date.toLocaleDateString(lang);
                }
            } else {
                return date.toLocaleString(culture, format);
            }
        }

        @Transformer()
        static timespan(start: string | Date | number, end: string | Date | number, culture?: string): string {
            const startDate = Utils.parseDate(start),
                endDate = Utils.parseDate(end),
                span = endDate.valueOf() - startDate.valueOf(),
                msecsPerDay = 86400000,
                msecsPerHr = 3600000,
                msecsPerMin = 60000,
                days = Math.floor(span / msecsPerDay),
                hrs = Math.floor((span % msecsPerDay) / msecsPerHr),
                mins = Math.floor((span % msecsPerHr) / msecsPerMin),
                secs = Math.floor((span % msecsPerMin) / 1000),
                msecs = Math.floor(span % 1000);
            return `${days}d ${hrs}h ${mins}m ${secs}s ${msecs}ms`;
        }

        @Transformer()
        static currency(src: number, currency: string, culture?: string) {
            return new Intl.NumberFormat(culture || navigator.language, { style: 'currency', currency: currency }).format(src);
        }

        @Transformer()
        static number(src: number, formatOrCulture?: Intl.NumberFormatOptions | string, culture?: string) {
            if (typeof formatOrCulture === 'string') {
                return new Intl.NumberFormat(formatOrCulture || navigator.language).format(src);
            }
            return new Intl.NumberFormat(culture || navigator.language, formatOrCulture).format(src);

        }

        @Transformer()
        static filter(src: any[], filter: (e: any, j: number) => boolean): any[] {
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