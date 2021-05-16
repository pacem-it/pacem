/// <reference path="../../../dist/js/pacem-core.d.ts" />
namespace Pacem.Components.UI {

    export enum CalendarZoom {
        Month = "month",
        Week = "week",
        Day = "day"
    }

    export class ViewDateChangeEvent extends CustomTypedEvent<Date>{
        constructor(date: Date) {
            super('viewdatechange', date);
        }
    }

    export class DateSelectEvent extends CustomTypedEvent<Date>{
        constructor(date: Date) {
            super('dateselect', date, { bubbles: true });
        }
    }

    export class TimeSelectEvent extends CustomTypedEvent<Date>{
        constructor(date: Date) {
            super('timeselect', date, { bubbles: true });
        }
    }

    const MSECS_PER_HOUR = 1000 * 60 * 60;
    const MSECS_PER_DAY = MSECS_PER_HOUR * 24;
    const DAY_HOURS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5,
        12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5];
    let now = new Date();
    const DUMMY_DATE = Utils.Dates.dateOnly(now).valueOf();
    const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    declare type CalendarDataItem = {
        continuing: { start: boolean, end: boolean },
        allDay?: boolean,
        // indexes
        day?: number, hour?: number,
        // span (may be column- or row-)
        span: number,
        caption: string,
        offset?: { start: string, end: string },
        event: PacemCalendarEventElement
    };

    declare type DateRange = {
        from?: Date,
        to?: Date
    };

    @CustomElement({
        tagName: P + '-calendar-event'
    })
    export class PacemCalendarEventElement extends PacemItemElement {

        @Watch({ converter: PropertyConverters.Datetime }) start: Date;
        @Watch({ converter: PropertyConverters.Datetime }) end: Date;
        @Watch({ converter: PropertyConverters.String }) caption: string;
        @Watch({ converter: PropertyConverters.Json }) place: string;
        @Watch({ converter: PropertyConverters.Boolean }) allDay: boolean;

        private _handle: number;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            cancelAnimationFrame(this._handle);
            this._handle = requestAnimationFrame(() => {
                let container = this.container;
                if (!Utils.isNull(container)) {
                    // trigger propertychange for `items`
                    container.dispatchEvent(new PropertyChangeEvent({ propertyName: 'items', oldValue: container.items, currentValue: container.items }));
                }
            });
        }
    }

    declare type CalendarEventEventArgs = {
        event: PacemCalendarEventElement,
        element: HTMLElement
    };

    export class CalendarEventSelectEvent extends CustomTypedEvent<CalendarEventEventArgs>{
        constructor(args: CalendarEventEventArgs) {
            super("eventselect", args, { bubbles: false, cancelable: true });
        }
    }

    export class CalendarEventUnselectEvent extends CustomTypedEvent<CalendarEventEventArgs>{
        constructor(args: CalendarEventEventArgs) {
            super("eventunselect", args, { bubbles: false, cancelable: true });
        }
    }

    export abstract class PacemCalendarBaseElement extends PacemItemsContainerElement<PacemCalendarEventElement> {

        validate(item: PacemCalendarEventElement): boolean {
            return item instanceof PacemCalendarEventElement;
        }

        @Watch({ converter: PropertyConverters.Datetime }) viewDate: Date;
        @Watch({ converter: PropertyConverters.Datetime }) now: Date;
        @Watch({ converter: PropertyConverters.String }) zoom: CalendarZoom;
        @Watch({ converter: PropertyConverters.String }) weekStart: 'mon' | 'sun' | 'm' | 's' | 'monday' | 'sunday';

        @Watch({ converter: PropertyConverters.Eval }) week: Date[];
        @Watch({ converter: PropertyConverters.Eval }) month: Date[][];
        @Watch({ converter: PropertyConverters.Eval }) disabledRanges: DateRange[];

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'viewDate' || name === 'weekStart') {
                this._synchronizeWeek();
            }
            switch (name) {
                case 'viewDate':
                    this.dispatchEvent(new ViewDateChangeEvent(val));
                    Utils.removeClass(this, "viewdate-next viewdate-previous");
                    requestAnimationFrame(() => {
                        Utils.addClass(this, old > val ? "viewdate-previous" : "viewdate-next");
                    });
                    break;
                case 'zoom':
                    Utils.removeClass(this, "viewdate-next viewdate-previous");
                    break;
            }
        }

        // #region PROTECTED

        protected oneventselect(el: HTMLElement, evt: PacemCalendarEventElement) {
            this.dispatchEvent(new CalendarEventSelectEvent({ element: el, event: evt }));
        }

        protected oneventunselect(el: HTMLElement, evt: PacemCalendarEventElement) {
            this.dispatchEvent(new CalendarEventUnselectEvent({ element: el, event: evt }));
        }

        protected getHeaderLabel(d: Date, f: CalendarZoom) {
            const options: Intl.DateTimeFormatOptions = f === CalendarZoom.Week ? { weekday: 'short', day: 'numeric', month: 'numeric' }
                : (f === CalendarZoom.Day ? { weekday: 'long' } : /* fallback: month */{ weekday: 'short' });
            return Utils.parseDate(d).toLocaleString(Utils.lang(this), options);
        }

        protected getDayLabel(d: Date) {
            const options: Intl.DateTimeFormatOptions = d.getDate() == 1 ? { month: 'short', day: 'numeric' } : { day: 'numeric' };
            return Utils.parseDate(d).toLocaleString(Utils.lang(this), options);
        }

        protected getHourLabel(d: Date) {
            const options: Intl.DateTimeFormatOptions = { hour: 'numeric'/*, minute: 'numeric'*/ };
            return Utils.parseDate(d).toLocaleString(Utils.lang(this), options);
        }

        protected getTimeLabel(d: Date) {
            const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric' };
            return Utils.parseDate(d).toLocaleString(Utils.lang(this), options);
        }

        protected isNow(d: Date, now: Date) {
            const d0 = Utils.parseDate(d),
                v = Utils.parseDate(now || new Date());
            return d0.getHours() === v.getHours() && this.isToday(d, now);
        }

        protected isToday(d: Date, now: Date) {
            const d0 = Utils.parseDate(d),
                v = Utils.parseDate(now || new Date());
            return d0.getDate() === v.getDate() && d0.getMonth() == v.getMonth() && d0.getFullYear() === v.getFullYear();
        }

        protected isViewDay(d: Date, vd: Date = this.viewDate) {
            const d0 = Utils.parseDate(d),
                v = Utils.parseDate(vd || this.viewDate || new Date());
            return d0.getDate() === v.getDate() && d0.getMonth() == v.getMonth() && d0.getFullYear() === v.getFullYear();
        }

        protected isViewWeek(d: Date) {
            const d0 = Utils.parseDate(d);
            return this.week && this.week.find(d1 => d1.getDate() == d0.getDate() && d1.getMonth() == d0.getMonth() && d1.getDate() == d0.getDate());
        }

        protected isViewMonth(d: Date) {
            const d0 = Utils.parseDate(d),
                v = Utils.parseDate(this.viewDate || new Date());
            return d0.getMonth() == v.getMonth() && d0.getFullYear() === v.getFullYear();
        }

        protected isTimeSlotDisabled(ranges: DateRange[], d: Date, h?: number) {
            if (!Utils.isNullOrEmpty(ranges)) {
                h = h || 0;
                const slot = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(h), 60 * (h % 1)).valueOf();
                for (let range of ranges) {
                    let from = Utils.Dates.parse(range.from), to = Utils.Dates.parse(range.to);
                    if (
                        (!from || (from && from.valueOf() <= slot))
                        && (!to || (to && to.valueOf() > slot))
                        && (to || from)
                    ) {
                        return true;
                    }
                }
            }
            return false;
        }

        // #endregion

        // #region PRIVATE

        private _getWeekStart(day: Date, weekstart: string) {
            let dow = day.getDay(),
                v = day.valueOf();
            const tget = (weekstart || 'm').toLowerCase().startsWith('m') ? 1 : 0;
            if (dow === tget) {
                return v;
            }
            if (dow === 0) {
                // damn 0-indexed sunday, skip to the previous one
                dow = 7;
            }
            return v + (tget - dow) * MSECS_PER_DAY;
        }

        private _getDatasource(d: Date, w: string = this.weekStart
        ): Date[][] {
            let day = Utils.Dates.dateOnly(Utils.parseDate(d));
            const ds = this.month;
            let _d0 = ds && ds.length && ds[0] && ds[0].length && ds[0][0];
            if (_d0 && _d0.getMonth() == day.getMonth() && _d0.getFullYear() == day.getFullYear()
                && ds.find(wk => !Utils.isNull(wk.find(dy => dy.valueOf() == day.valueOf())))) {
                // return the "convenient" datasource
                return ds;
            }
            //
            // month
            let d1 = new Date(day.getFullYear(), day.getMonth(), 1);
            let date1 = this._getWeekStart(d1, w);
            let month: Date[][] = [];
            let week: Date[] = [];
            do {
                let date = Utils.Dates.dateOnly(new Date(date1));
                week.push(date);
                if (week.length == 7) {
                    month.push(week.splice(0));
                }
                date1 = date.valueOf() + MSECS_PER_DAY + /* beware of day-light-saving occurrences */ MSECS_PER_HOUR;
            }
            while (month.length < 6);
            //
            return this.month = month;

        }

        private _synchronizeWeek() {
            const viewDate = this.viewDate;
            const ds = this._getDatasource(viewDate, this.weekStart);
            const week = ds.filter((w, j) =>
                w.filter(d => d.getDate() == viewDate.getDate() && d.getMonth() == viewDate.getMonth() && d.getFullYear() == viewDate.getFullYear()).length > 0
            )[0];
            if (!(this.week && this.week.length) || this.week[0] !== week[0]) {
                this.week = week;
            }
        }

        // #endregion
    }

    export abstract class PacemCalendarWithEventsBaseElement extends PacemCalendarBaseElement {

        private _datasource: CalendarDataItem[][] = [];
        private _handle: number;

        get datasource() {
            return this._datasource;
        }

        private _getSortedItems(items: PacemCalendarEventElement[]): PacemCalendarEventElement[] {
            return items.slice().sort((a, b) => {
                const a_start = a.start.valueOf(),
                    b_start = b.start.valueOf();
                if (a_start != b_start) {
                    return a_start < b_start ? -1 : 1;
                }
                const a_end = a.end.valueOf(),
                    b_end = b.end.valueOf(),
                    a_span = a_end - a_start,
                    b_span = b_end - b_start;
                if (a_span != b_span) {
                    return a_span > b_span ? -1 : 1;
                }
                return 0;
            });
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            switch (name) {
                case 'month':
                case 'week':
                case 'items':
                case 'zoom':
                case 'viewDate':
                    cancelAnimationFrame(this._handle);
                    this._handle = requestAnimationFrame(() => {
                        let oldval = this._datasource;
                        let newval = this._datasource = this.buildDataSource(this._getSortedItems(this.items || []));
                        this.dispatchEvent(new PropertyChangeEvent({ propertyName: 'datasource', oldValue: oldval, currentValue: newval }));
                    });
                    break;
            }
        }

        protected abstract buildDataSource(items: PacemCalendarEventElement[]): CalendarDataItem[][];
    }

    function getWeeklyEventDataItems(items: PacemCalendarEventElement[], week: Date[]): CalendarDataItem[] {
        let lbound = week.length - 1,
            wstart = week[0].valueOf(),
            wend = week[lbound].valueOf();
        return items.filter(evt => {

            let startDate = Utils.Dates.dateOnly(evt.start);
            let endDate = Utils.Dates.dateOnly(evt.end);

            return startDate.valueOf() <= wend && endDate.valueOf() >= wstart;

        }).map(evt => {

            let startDate = Utils.Dates.dateOnly(evt.start),
                start = week.find(d => d.valueOf() == startDate.valueOf()),
                startIndex = week.indexOf(start);
            let endDate = Utils.Dates.dateOnly(evt.end),
                end = week.find(d => d.valueOf() == endDate.valueOf()),
                endIndex = week.indexOf(end);
            let ndx0 = startIndex == -1 ? 0 : startIndex,
                ndx1 = endIndex == -1 ? lbound : endIndex;
            return {
                start: evt.start, end: evt.end,
                allDay: true,
                // indexes
                day: ndx0,
                continuing: { start: startIndex == -1, end: endIndex == -1 },
                // span (may be column- or row-)
                span: ndx1 + 1 - ndx0,
                caption: evt.caption,
                event: evt
            };

        });
    }

    // #region AGENDA

    function buildAgendaGrid() {
        let grid = '';
        for (let day = 0; day < 7; day++) {
            if (day == 0) {
                grid += `<div class="agenda-left all-day"></div>`;
            }
            grid += `<${P}-panel class="agenda-slot all-day day-${(day + 1)}" css-class="{{ {'viewday': :host.isViewDay(:host.week[${day}], :host.viewDate), 'today': :host.isToday(:host.week[${day}], :host.now)} }}"></${P}-panel>`;
        }
        for (let day = 0; day < 7; day++) {
            for (let hour of DAY_HOURS) {
                let whole = hour % 1 == 0;
                let css = `hour-${whole ? 'whole' : 'half'}`;
                if (day == 0 && whole) {
                    grid += `<${P}-text class="agenda-left ${css} hour-${hour * 2 + 1}"" text="{{ :host.getHourLabel(${DUMMY_DATE + hour * MSECS_PER_HOUR}) }}"></${P}-text>`;
                }
                grid += `<${P}-panel on-click=":host.time = Pacem.Utils.Dates.parse(:host.week[${day}].valueOf() + ${(hour * MSECS_PER_HOUR)})" disabled="{{ :host.isTimeSlotDisabled(:host.disabledRanges, :host.week[${day}], ${hour}) }}" class="agenda-slot ${css} day-${(day + 1)} hour-${hour * 2 + 1}" css-class="{{ {'viewday': :host.isViewDay(:host.week[${day}], :host.viewDate), 'today': :host.isToday(:host.week[${day}], :host.now)} }}"></${P}-panel>`;
            }
        }
        return grid;
    }

    @CustomElement({
        tagName: P + '-agenda', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-repeater class="${PCSS}-agenda agenda-grid" datasource="{{ :host.datasource }}">${buildAgendaGrid()}<${P}-clock hidden></${P}-clock>
    <template>
        <${P}-repeater class="agenda-day" datasource="{{ ^item }}">
            <template>
                <${P}-panel class="agenda-event-wrapper" 
css-class="{{ ['hour-start-'+ (^item.hour + 1), 'hour-end-'+ (^item.hour + ^item.span +1), 'day-start-'+ (!^item.continuing.start), 'day-end-'+ (!^item.continuing.end)] }}">
                    <${P}-panel class="agenda-event" css="{{ {'top': ^item.offset.start, 'bottom': ^item.offset.end} }}" tab-order="{{ (^^index + 1) * 1000 + (^item.hour + 1) * 100 + ^index }}"
                        on-focus=":host.oneventselect($this, ^item.event)" on-blur=":host.oneventunselect($this, ^item.event)">
                        <${P}-span class="event-caption" text="{{ ^item.caption }}"></${P}-span>
                    </${P}-panel>
                </${P}-panel>
            </template>
        </${P}-repeater>
    </template>
    <${P}-repeater class="agenda-allday" datasource="{{ :host.allDayDatasource }}">
        <template>
            <${P}-panel class="agenda-event" tab-order="{{ (^index + 1) * 500 + (^item.day + 1) * 50 + ^index }}" css-class="{{ ['day-start-'+ (^item.day + 1), 'day-end-'+ (^item.day + ^item.span + 1)] }}"
                on-focus=":host.oneventselect($this, ^item.event)" on-blur=":host.oneventunselect($this, ^item.event)">
                <${P}-text class="event-caption" text="{{ ^item.caption }}"></${P}-text>
            </${P}-panel>
        </template>
    </${P}-repeater>
</${P}-repeater><${P}-content></${P}-content>`
    })
    export class PacemAgendaElement extends PacemCalendarWithEventsBaseElement {

        protected buildDataSource(items: PacemCalendarEventElement[]): CalendarDataItem[][] {
            var week = this.week;
            if (this.zoom === CalendarZoom.Day) {
                week = [Utils.Dates.dateOnly(this.viewDate)];
            }
            let ds: CalendarDataItem[][] = [];
            if (!Utils.isNull(week)) {

                // alldays
                this.dispatchEvent(new PropertyChangeEvent({
                    propertyName: 'allDayDatasource',
                    oldValue: this._allDayDatasource,
                    currentValue: this._allDayDatasource = getWeeklyEventDataItems(items.filter(evt => {
                        return (evt.end.valueOf() - evt.start.valueOf()) >= MSECS_PER_DAY;
                    }), week)
                }));
                // hourlies
                for (let j = 0; j < week.length; j++) {
                    let day = week[j], dayValue = day.valueOf(),
                        // search for events in this week
                        dayItems: CalendarDataItem[] = items.filter(evt => {

                            let startDate = Utils.Dates.dateOnly(evt.start);
                            let endDate = Utils.Dates.dateOnly(evt.end);

                            return startDate.valueOf() <= dayValue && endDate.valueOf() >= dayValue;

                        }).map(evt => {

                            let evtStart = evt.start.valueOf(),
                                evtEnd = evt.end.valueOf();
                            let retval: CalendarDataItem = {
                                allDay: evt.allDay || (evtEnd - evtStart) >= MSECS_PER_DAY,
                                continuing: { start: evtStart < dayValue, end: evtEnd > (dayValue + MSECS_PER_DAY) },
                                caption: evt.caption,
                                hour: 0,
                                span: DAY_HOURS.length - 1,
                                offset: { start: "0", end: "0" },
                                event: evt
                            };

                            let startHour = evt.start.getHours() + evt.start.getMinutes() / 60,
                                startIndex = retval.continuing.start ? 0 : Math.floor(startHour * 2),
                                endHour = evt.end.getHours() + evt.end.getMinutes() / 60,
                                endIndex = -1 + (retval.continuing.end ? DAY_HOURS.length : Math.ceil(endHour * 2));
                            let endNdx = endIndex + 1,
                                end = endNdx >= DAY_HOURS.length ? 24 : DAY_HOURS[endNdx];
                            let fullSpan = end - DAY_HOURS[startIndex];
                            retval.hour = startIndex;
                            retval.span = 1 + endIndex - startIndex;

                            // offsets

                            if (!retval.continuing.start) {
                                // compute correct start offset
                                retval.offset.start = (((startHour - DAY_HOURS[startIndex]) / fullSpan) * 100) + "%";
                            }
                            if (!retval.continuing.end) {
                                // compute correct end offset
                                retval.offset.end = (((end - endHour) / fullSpan) * 100) + "%";
                            }

                            return retval;

                        });

                    //
                    ds.push(dayItems);
                }
            }
            return ds;
        }

        @ViewChild(P + '-clock') private _clock: PacemClockElement;

        @Watch({ converter: PropertyConverters.Datetime }) time: Date;

        private _allDayDatasource: CalendarDataItem[] = [];
        get allDayDatasource(): CalendarDataItem[] {
            return this._allDayDatasource;
        }

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            const clock = this._clock;
            if (name === 'time') {
                this.dispatchEvent(new TimeSelectEvent(val));
            } else
                if (!Utils.isNull(clock)) {

                    if (name === 'now') {
                        clock.now = val;
                        clock.className = `hour-${val.getHours()} minute-${val.getMinutes()}`;
                    }
                    if (name === 'now' || name === 'zoom' || name === 'viewDate') {
                        const d = this.now,
                            z = this.zoom;
                        const showClock = d && z && ((this.isViewDay(d) && z === CalendarZoom.Day)
                            || (this.isViewWeek(d) && z === CalendarZoom.Week));
                        clock.hidden = !showClock;
                    }
                }
        }
    }

    // #endregion

    // #region CALENDAR

    function buildCalendarGrid() {
        let grid = '';
        for (let week = 0; week < 6; week++) {
            for (let day = 0; day < 7; day++) {
                let css = `class="calendar-day week-${week + 1} day-${day + 1}"`;
                grid += `<${P}-panel disabled="{{ :host.isTimeSlotDisabled(:host.disabledRanges, :host.week[${day}]) }}" on-click=":host.date = :host.month[${week}][${day}]" ${css} css-class="{{ {'viewmonth': :host.isViewMonth(:host.month[${week}][${day}]), 'viewday': :host.isViewDay(:host.month[${week}][${day}], :host.viewDate), 'today': :host.isToday(:host.month[${week}][${day}], :host.now)} }}"><${P}-span culture="{{ :host.culture }}" class="text-ellipsed" text="{{ :host.getDayLabel(:host.month[${week}][${day}]) }}"></${P}-span></${P}-panel>`;
            }
        }
        return grid;
    }

    @CustomElement({
        tagName: P + '-calendar', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-repeater class="${PCSS}-calendar calendar-grid" datasource="{{ :host.datasource }}">${buildCalendarGrid()}
    <template>
        <${P}-repeater class="calendar-week" datasource="{{ ^item }}">
            <template>
                <${P}-panel class="calendar-event" tab-order="{{ (^^index + 1) * 1000 + (^item.day + 1) * 100 + ^index }}" 
                    on-focus=":host.oneventselect($this, ^item.event)" on-blur=":host.oneventunselect($this, ^item.event)"
                    css-class="{{ ['day-start-'+ (^item.day + 1), 'day-end-'+ (^item.day + ^item.span + 1)] }}">
                    <${P}-span class="event-startdate" culture="{{ :host.culture }}" hide="{{ ^item.continuing.start }}" text="{{ :host.getTimeLabel(^item.event.start) }}"></${P}-span>
                    <${P}-span class="event-caption" text="{{ ^item.caption }}"></${P}-span>
                </${P}-panel>
            </template>
        </${P}-repeater>
    </template>
</${P}-repeater><${P}-content></${P}-content>`
    })
    export class PacemCalendarElement extends PacemCalendarWithEventsBaseElement {

        protected buildDataSource(items: PacemCalendarEventElement[]): CalendarDataItem[][] {
            const month = this.month;
            let ds: CalendarDataItem[][] = [];
            if (!Utils.isNull(month)) {
                for (let j = 0; j < month.length; j++) {
                    let week = month[j],
                        // search for events in this week
                        weekItems: CalendarDataItem[] = getWeeklyEventDataItems(items, week);
                    //
                    ds.push(weekItems);
                }
            }
            return ds;
        }

        @Watch({ converter: PropertyConverters.Datetime }) date: Date;

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            super.propertyChangedCallback(name, old, val, first);
            if (name === 'date') {
                this.dispatchEvent(new DateSelectEvent(val));
            }
        }
    }

    // #endregion

    // #region CLOCK (to be worked on: many possibilities ahead)

    @CustomElement({ tagName: P + '-clock' })
    export class PacemClockElement extends PacemElement {

        @Watch({ converter: PropertyConverters.Datetime }) now: Date;

    }

    // #endregion

    // #region SCHEDULE

    function buildCalendarHeader() {
        let header = '';
        for (let day = 0; day < 7; day++) {
            header += `<${P}-span culture="{{ :host.culture }}" css-class="{{ {'viewday': :host.isViewDay(:host.week[${day}], :host.viewDate)} }}" class="schedule-heading day-${day + 1} text-ellipsed" text="{{ :host.getHeaderLabel(:host.week[${day}], :host.zoom) }}"></${P}-span>`;
        }
        const id = "dock_" + Utils.uniqueCode();
        return `<div class="schedule-header schedule-grid"><div class="heading-left"></div>${header}</div>`;
    }

    @CustomElement({
        tagName: P + '-schedule', shadow: Defaults.USE_SHADOW_ROOT,
        template: `<${P}-panel class="${PCSS}-schedule" css-class="{{ ['schedule-'+ (:host.zoom || '${CalendarZoom.Month}')] }}">
    <${P}-timer interval="10000" on-tick=":host.now = Pacem.Utils.parseDate(Date.now())"></${P}-timer>
    ${buildCalendarHeader()}
    <${P}-agenda disabled-ranges="{{ :host.disabledRanges }}" on-eventselect=":host.handle($event)" on-eventunselect=":host.handle($event)" now="{{ :host.now }}" culture="{{ :host.culture }}" view-date="{{ :host.viewDate }}" zoom="{{ :host.zoom }}" week-start="{{ :host.weekStart }}" items="{{ :host.items }}"></${P}-agenda>
    <${P}-calendar disabled-ranges="{{ :host.disabledRanges }}" on-eventselect=":host.handle($event)" on-eventunselect=":host.handle($event)" now="{{ :host.now }}" culture="{{ :host.culture }}" view-date="{{ :host.viewDate }}" zoom="{{ :host.zoom }}" week-start="{{ :host.weekStart }}" items="{{ :host.items }}"></${P}-calendar>
    <${P}-content></${P}-content>
</${P}-panel>`
    })
    export class PacemScheduleElement extends PacemCalendarBaseElement {

        @ViewChild(P + '-calendar') private _calendar: PacemCalendarElement;
        @ViewChild(P + '-agenda') private _agenda: PacemAgendaElement;

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this._calendar.addEventListener('dateselect', this.emitHandler, false);
            this._agenda.addEventListener('timeselect', this.emitHandler, false);
            // bootstrap
            this.now = new Date();
        }

        disconnectedCallback() {
            if (this._calendar) {
                this._calendar.removeEventListener('dateselect', this.emitHandler, false);
                this._agenda.removeEventListener('timeselect', this.emitHandler, false);
            }
            super.disconnectedCallback();
        }

    }

    // #endregion

    // #region RULES

    export abstract class PacemCalendarRuleBaseElement extends HTMLElement {

        viewActivatedCallback() {
            if (!Utils.isNull(this._target = CustomElementUtils.findAncestor(this, node => node instanceof PacemCalendarBaseElement))) {
                this.refreshDisabledRanges();
            } else {
                throw `Missing ancestor calendar element for ${this.constructor.name}.`;
            }
        }

        disconnectedCallback() {
            this._target = undefined;
        }

        private _target: PacemCalendarBaseElement;
        protected get target() {
            return this._target;
        }

        private _disabledRanges: DateRange[] = [];

        @Debounce(true)
        protected refreshDisabledRanges() {
            if (Utils.isNullOrEmpty(this._target)) {
                // TODO: throw
                return;
            }
            let actualRanges = this._target.disabledRanges || [];
            // cleanup old ones
            for (let range of this._disabledRanges) {
                let ndx = actualRanges.indexOf(range);
                if (ndx >= 0) {
                    actualRanges.splice(ndx, 1);
                }
            }
            // add new ones
            this._disabledRanges = this.computeDisabledRanges() || [];
            for (let range of this._disabledRanges) {
                actualRanges.push(range);
            }
            this._target.disabledRanges = actualRanges;
        }

        protected abstract computeDisabledRanges(): DateRange[];
    }

    @CustomElement({ tagName: P + '-calendar-daysofweek-rule' })
    export class PacemCalendarDayOfWeekRuleElement extends PacemCalendarRuleBaseElement {

        @Watch({ emit: false, converter: PropertyConverters.StringArray }) days: string[];

        viewActivatedCallback() {
            super.viewActivatedCallback();
            this.target.addEventListener(PropertyChangeEventName, this._calendarChangeHandler, false);
        }

        private _daysOfWeek: number[] = [];

        propertyChangedCallback(name: string, old: any, val: any, first?: boolean) {
            if (name === 'days') {
                this._daysOfWeek = (val || []).map(i => DAYS_OF_WEEK.indexOf(i)).filter(i => i >= 0);
                this.refreshDisabledRanges();
            }
        }

        private _calendarChangeHandler = (evt: PropertyChangeEvent) => {
            if (evt.detail.propertyName == 'month') {
                this.refreshDisabledRanges();
            }
        };

        protected computeDisabledRanges(): DateRange[] {
            let retval: DateRange[] = [];
            for (let week of this.target.month) {
                for (let day of week) {
                    if (this._daysOfWeek.indexOf(day.getDay()) == -1) {
                        let from = Utils.Dates.dateOnly(day),
                            to = Utils.Dates.dateOnly(new Date(from.valueOf() + MSECS_PER_DAY + /* get rid of daylight saving switches */ MSECS_PER_HOUR));
                        retval.push({ from: from, to: to });
                    }
                }
            }
            return retval;
        }

    }

    // #endregion
}