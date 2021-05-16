namespace Pacem {

    const JSON_DATE_PATTERN = /^\/Date\([\d]+\)\/$/i;

    export class Dates {

        static parse(input: string | Date | number): Date {
            let d: any;
            if (typeof input === 'string') {
                if (JSON_DATE_PATTERN.test(input))
                    d = parseInt(input.substring(6));
                else
                    d = Date.parse(input);
                return new Date(d);
            } else if (typeof input === 'number') {
                return new Date(input);
            } else
                return input as Date;
        }

        static isLeapYear(year: number): boolean {
            return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
        }

        static daysInMonth(year: number, month: number): number {
            return [31, (Dates.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
        }

        /**
         * Gets whether a date is an `Invalid Date` or not.
         * @param date
         */
        static isDate(date: any): date is Date {
            return date instanceof Date && !isNaN(date.valueOf());
        }

        /**
         * Returns the date-only equaivalent of a provided datetime.
         * @param datetime
         */
        static dateOnly(datetime: Date): Date {
            return new Date(datetime.getFullYear(), datetime.getMonth(), datetime.getDate());
        }

        static addMonths(input: Date, value: number): Date {
            let n = input.getDate(),
                i = new Date(input),
                month = i.getMonth() + value,
                years = 0;
            while (month < 0) {
                month += 12;
                years--;
            }
            i.setDate(1);
            i.setMonth(month % 12);
            i.setFullYear(i.getFullYear() + years + Math.floor(month / 12));
            i.setDate(Math.min(n, Dates.daysInMonth(i.getFullYear(), i.getMonth())));
            return i;
        }

        static addDays(input: Date, value: number): Date {
            return new Date(input.valueOf() + value * 86400000)
        }
    }

}