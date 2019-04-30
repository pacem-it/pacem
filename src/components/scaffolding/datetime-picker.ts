/// <reference path="../../../dist/js/pacem-core.d.ts" />
/// <reference path="../../../dist/js/pacem-ui.d.ts" />
namespace Pacem.Components.Scaffolding {

    const emptyVal = '';

    type MonthSelectDataItem = { value: number, date: Date, label: string };
    type DateSelectDataItem = { value: number, date: Date, label: string, disabled: boolean };

    class DatetimeChangeEvent extends CustomTypedEvent<{ date: Date }> {
        constructor(date: Date) {
            super('datetimechange', { date: date });
        }
    }

    @CustomElement({
        tagName: P + '-datetime-picker', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<div class="${PCSS}-datetime-picker">
    <div class="${PCSS}-datetime-picker-fields ${PCSS}-viewfinder">

    <div class="${PCSS}-datetime-picker-year">
    <${ P}-select value="{{ :host.year, twoway }}" placeholder="..." datasource="{{ :host._years }}">
    </${ P}-select></div>

    <div class="${PCSS}-datetime-picker-month">
    <${ P}-select value="{{ :host.month, twoway }}" placeholder="..." value-property="value" text-property="label" datasource="{{ :host._months }}">
    </${ P}-select></div>

    <div class="${PCSS}-datetime-picker-date">
    <${ P}-select value="{{ :host.date, twoway }}" placeholder="..." value-property="value" text-property="label" datasource="{{ :host._dates }}">
    </${ P}-select></div>

    <${ P}-panel class="${PCSS}-datetime-picker-hours" hide="{{ :host.precision === 'day' }}">
    <${ P}-select value="{{ :host.hours, twoway }}" datasource="{{ :host._a24 }}">
    </${ P}-select></${P}-panel>

    <${ P}-panel class="${PCSS}-datetime-picker-minutes" hide="{{ :host.precision === 'day' }}">
    <${ P}-select value="{{ :host.minutes, twoway }}" datasource="{{ :host._a60 }}">
    </${ P}-select></${P}-panel>

    <${ P}-panel class="${PCSS}-datetime-picker-seconds" hide="{{ :host.precision !== 'second' }}">
    <${ P}-select value="{{ :host.seconds, twoway }}" datasource="{{ :host._a60 }}">
    </${ P}-select></${P}-panel>

    </div>
    <${ P}-panel hide="{{ Pacem.Utils.isNullOrEmpty(:host.dateValue) || :host.precision === 'day' || :host.readonly }}">
    <dl class="${PCSS}-datetime-picker-preview">
        <dt>local:</dt><dd><${ P}-text text="{{ :host.viewValue }}"></${P}-text></dd>
        <dt>iso:</dt><dd><${ P}-text text="{{ (:host.dateValue && :host.dateValue.toISOString()) || '' }}"></${P}-text></dd>
    </dl>
    </${ P}-panel>
    <${ P}-span class="${PCSS}-readonly" css-class="{{ { 'date': :host.precision === 'day', 'datetime': :host.precision !== 'day' } }}" content="{{ :host.viewValue }}" hide="{{ !:host.readonly }}"></${P}-span>
</div>`
    })
    export class PacemDatetimePickerElement extends PacemBaseElement implements OnConnected, OnPropertyChanged {

        constructor() {
            super();
        }

        @ViewChild('.' + PCSS + '-datetime-picker-year >       ' + P + '-select') private _yearel: PacemSelectElement;
        @ViewChild('.' + PCSS + '-datetime-picker-month >      ' + P + '-select') private _monthel: PacemSelectElement;
        @ViewChild('.' + PCSS + '-datetime-picker-date >       ' + P + '-select') private _dateel: PacemSelectElement;
        @ViewChild('.' + PCSS + '-datetime-picker-hours >      ' + P + '-select') private _hourel: PacemSelectElement;
        @ViewChild('.' + PCSS + '-datetime-picker-minutes >    ' + P + '-select') private _minel: PacemSelectElement;
        @ViewChild('.' + PCSS + '-datetime-picker-seconds >    ' + P + '-select') private _secel: PacemSelectElement;

        protected get inputFields() {
            return [this._yearel, this._monthel, this._dateel, this._hourel, this._minel, this._secel];
        }

        @ViewChild(`div.${PCSS}-datetime-picker-fields`) private _allFields: HTMLDivElement;

        protected toggleReadonlyView(readonly: boolean) {
            this._allFields.hidden = readonly;
        }

        protected convertValueAttributeToProperty(attr: string) {
            return PropertyConverters.Datetime.convert(attr);
        }

        @Watch({ converter: PropertyConverters.Datetime }) dateValue: Date;
        @Watch({ converter: PropertyConverters.Datetime }) min: string | Date;
        @Watch({ converter: PropertyConverters.Datetime }) max: string | Date;
        @Watch({ converter: PropertyConverters.String }) precision: 'day' | 'minute' | 'second' = 'day';

        connectedCallback() {
            super.connectedCallback();
            const today = new Date();
            let year = this.year = today.getFullYear();
            this.min = new Date(year - 100, 0, 1);
            this.max = new Date(year + 10, 11, 31);
            this.month = today.getMonth();
            //
            let months: MonthSelectDataItem[] = [], hours = [], minutes = [],
                leftPad = Utils.leftPad;
            // months
            for (let i = 0; i < 12; i++) {
                let date = new Date(year, i, 1),
                    label = date.toLocaleString(Utils.lang(this), { month: "short" });
                ;
                months.push({ value: i, date: date, label: label });
            }
            this._months = months;
            // hours
            for (let i = 0; i < 24; i++) {
                hours.push(leftPad(i, 2, '0'));
            }
            this._a24 = hours;
            // minutes/secs
            for (let i = 0; i < 60; i++) {
                minutes.push(leftPad(i, 2, '0'));
            }
            this._a60 = minutes;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'dateValue':
                    this.log(Logging.LogLevel.Log, `dateValue changed from ${old} to ${val}`);
                    this._disassembleDate(val);
                    this.changeHandler(new DatetimeChangeEvent(val));
                    break;
                case 'min':
                case 'max':
                    if (!Utils.isNullOrEmpty(this.min)
                        && !Utils.isNullOrEmpty(this.max))
                        this.setupYears();
                    break;
                case 'year':
                case 'month':
                    this._buildupDates();
                    break;
                case 'date':
                case 'hours':
                case 'minutes':
                case 'seconds':
                    this._buildup();
                    break;
            }
        }

        protected acceptValue(val: any) {
            this.dateValue = Utils.parseDate(val);
        }

        private _disassembleDate(v: string | Date) {
            if (!v) {
                this.date = undefined;
                return;
            }
            if (typeof v === 'string')
                v = Utils.parseDate(v);
            const leftPad = (i) => Utils.leftPad(i, 2, '0');
            this.year = v.getFullYear();
            this.month = v.getMonth();
            this.date = v.getDate();
            this.hours = leftPad(v.getHours());
            this.minutes = leftPad(v.getMinutes());
            this.seconds = leftPad(v.getSeconds());
        }

        private _months: MonthSelectDataItem[] = [];
        @Watch() private _dates: DateSelectDataItem[] = [];
        private _a24: number[] = [];
        private _a60: number[] = [];
        @Watch() private _years: number[] = [];

        @Watch() private year: number | string;
        @Watch() private month: number | string;
        @Watch() private date: number | string;
        @Watch() private hours: number | string = '00';
        @Watch() private minutes: number | string = '00';
        @Watch() private seconds: number | string = '00';

        private setupYears() {
            let years = [];
            const min = Utils.parseDate(this.min),
                max = Utils.parseDate(this.max);
            for (let i = min.getFullYear(); i <= max.getFullYear(); i++) {
                years.push(i);
            }
            this._years = years;
        }

        protected onChange(evt?: Event) {
            var deferred = DeferPromise.defer<Date>();
            if (CustomEventUtils.isInstanceOf(evt, DatetimeChangeEvent)) {
                const date = this.value = (<DatetimeChangeEvent>evt).detail.date;
                deferred.resolve(date); // keep same type (Date or string equivalent)
            } else
                deferred.resolve(this.value);
            return <PromiseLike<Date>>deferred.promise;
        }

        private _buildupDates(evt?: Event) {
            if (evt) evt.stopPropagation();
            const v = this,
                options = { weekday: 'short', day: 'numeric' },
                isDate = (k: number) => {
                    try {
                        let monthvalue = +v.month, parsed = new Date(+v.year, +v.month, k);
                        return parsed.getMonth() == monthvalue;
                    } catch (e) {
                        return false;
                    }
                };
            var dates: DateSelectDataItem[] = [];
            if (!Utils.isNullOrEmpty(v.year) && !Utils.isNullOrEmpty(v.month)) {
                let day = 1;
                do {
                    let date = new Date(+v.year, +v.month, day),
                        label = date.toLocaleString(Utils.lang(this), options);
                    dates.push({ value: day, date: date, label: label, disabled: date < this.min || date > this.max });
                } while (isDate(++day));
            }
            this._dates = dates;
            if (!isDate(+this.date))
                this.date = '';
            else
                this._buildup();
        }

        @Debounce(10)
        private _buildup(evt?: Event) {
            if (evt) evt.stopPropagation();
            //
            const v = this;
            let year = '', month = '', date = '';
            if (Utils.isNullOrEmpty(v.year) || Utils.isNullOrEmpty(v.month) || Utils.isNullOrEmpty(v.date))
                this.dateValue = null;
            else
                //
                try {

                    let value = new Date(+v.year, +v.month, +v.date);
                    value.setHours(+v.hours);
                    value.setMinutes(+v.minutes);
                    value.setSeconds(+v.seconds);
                    value.setMilliseconds(0);
                    if (!Number.isNaN(value.valueOf())) {
                        this.dateValue = value;
                    }
                    else
                        this.dateValue = null;
                } catch (e) {
                    this.dateValue = null;
                }
        }

        protected getViewValue(val: any): string {
            const v =  /*this.dateValue ||*/ val;
            if (v) {

                return Utils.core.date(v, this.precision != 'day' ? 'full' : 'short', Utils.lang(this));
            }
            return '';
        }

    }

}