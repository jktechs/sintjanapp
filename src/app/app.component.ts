import { HttpClient } from '@angular/common/http';
import { AfterContentChecked, Component, ElementRef, EventEmitter, Injectable, ViewChild, ViewContainerRef } from '@angular/core';
import { AbstractControl, FormControl, FormGroupDirective, NgForm, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { DateAdapter, ErrorStateMatcher, MatRipple, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { App } from '@capacitor/app';
import { Homework, JSONObject, Lesson, Location, Savable, setVar, Subject, delay } from 'src/lib/Utils';
import { huiswerkResult, Somtoday, Vak } from 'src/lib/Somtoday';
import { AppLauncher } from '@capacitor/app-launcher';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Browser } from '@capacitor/browser';
import { MatDateRangeSelectionStrategy, DateRange, MAT_DATE_RANGE_SELECTION_STRATEGY } from '@angular/material/datepicker';
import { PageComponent, Page, LayoutType } from './pages/pages.component';
import { Preferences } from '@capacitor/preferences';
import { MatDialog } from '@angular/material/dialog';

class AppDateAdapter extends NativeDateAdapter {
    constructor(matDateLocale: string) {
        super(matDateLocale);
    }
    override parse(value: any): Date | null {
        throw new Error('Cant parse string.');
    }
    override format(date: Date, displayFormat: any): string {
        return date.getDate() + ' ' + date.toLocaleString('default', { month: 'long' }) + ' ' + date.getFullYear();
    }
    override getFirstDayOfWeek(): number {
        return 1;
    }
}
class ZermeloErrorStateMatcher implements ErrorStateMatcher {
    isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
        const isSubmitted = form && form.submitted;
        return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
    }
}
function ZermeloValidator(nameRe: RegExp): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const forbidden = nameRe.test(control.value);
        return forbidden ? null : { zermelo: { value: control.value } };
    };
}
@Injectable()
export class WeekSelectionStrategy<D> implements MatDateRangeSelectionStrategy<D> {
    constructor(private _dateAdapter: DateAdapter<D>) {}
    selectionFinished(date: D | null): DateRange<D> {
        return this._createFiveDayRange(date);
    }
    createPreview(activeDate: D | null): DateRange<D> {
        return this._createFiveDayRange(activeDate);
    }
    private _createFiveDayRange(date: D | null): DateRange<D> {
        if (date) {
            let currentDay = this._dateAdapter.getDayOfWeek(date);
            if (currentDay === 0) currentDay += 7;
            const short = AppComponent.instance.dateType === 'semiWeek' ? 1 : 0;
            const start = this._dateAdapter.addCalendarDays(date, 1 - currentDay);
            const end = this._dateAdapter.addCalendarDays(date, 7 - currentDay - 2 * short);
            return new DateRange<D>(start, end);
        }
        return new DateRange<D>(null, null);
    }
}
type Site = {
    name: string;
    img: string;
    formControl?: FormControl<boolean>;
    webLink?: string;
    appLink?: string;
};
type Wiget = {
    x: number;
    y: number;
    w: number;
    h: number;
    data: Site;
};
type Block = {
    w: number;
    h: number;
    title: string;
    location: string;
    teacher: string;
    time: string;
    left: number;
    top: number;
};
@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    providers: [
        { provide: DateAdapter, useClass: AppDateAdapter, deps: [MAT_DATE_LOCALE] },
        { provide: MAT_DATE_RANGE_SELECTION_STRATEGY, useClass: WeekSelectionStrategy },
    ],
})
@Injectable()
export class AppComponent implements AfterContentChecked {
    Object = Object;
    public static instance: AppComponent;
    public subjects: { [key: string]: Subject } = {};
    public homeworks: Homework[] = [];
    public lessons: Lesson[] = [];

    public get blocks(): Block[] {
        if (this.startDate.value === null) return [];
        return this.lessons.map((lesson) => {
            let top = (lesson.start - 8 * 60 - 30) / (8 * 50 + 20 + 30);
            let height = (lesson.end - lesson.start) / (8 * 50 + 20 + 30);
            let left = lesson.dayNumber / 5;
            return {
                w: 1 / 5,
                h: height,
                title: lesson.subject,
                location: lesson.location.toString(),
                teacher: lesson.teacher,
                left,
                top,
                time: lesson.date.getHours() + ':' + lesson.date.getMinutes(),
            };
        });
    }
    async getGrades() {
        this.subjects = {};
        let data = await this.somtoday.getGrades();
        data.items
            .filter((i) => (i.resultaat && i.resultaat !== -1) || (i.geldendResultaat && i.geldendResultaat !== -1) || i.resultaatLabelAfkorting)
            .forEach((i) => {
                let subject = i.vak;
                let subjectData: Subject;
                if (!(subject.afkorting in this.subjects)) {
                    subjectData = new Subject(subject);
                    this.subjects[subjectData.shortName] = subjectData;
                } else subjectData = this.subjects[subject.afkorting];

                let value: string | number = -1;
                if (i.resultaatLabelAfkorting !== undefined) value = i.resultaatLabelAfkorting;
                else if (i.resultaat && i.resultaat !== -1) value = i.resultaat;
                else if (i.geldendResultaat && i.geldendResultaat !== -1) value = i.geldendResultaat;

                if (i.isExamendossierResultaat) {
                    subjectData.grades.push({
                        kolom: i.type,
                        periode: i.periode,
                        leerjaar: i.leerjaar,
                        type: i.additionalObjects.toetssoortnaam,
                        discriptor: i.omschrijving ? i.omschrijving : 'None',
                        value,
                        weight: i.examenWeging ? i.examenWeging : 0,
                        date: new Date(i.datumInvoer),
                        exam: true,
                    });
                }
                if (i.isVoortgangsdossierResultaat) {
                    subjectData.grades.push({
                        kolom: i.type,
                        periode: i.periode,
                        leerjaar: i.leerjaar,
                        type: i.additionalObjects.toetssoortnaam,
                        discriptor: i.omschrijving ? i.omschrijving : 'None',
                        value,
                        weight: i.weging ? i.weging : 0,
                        date: new Date(i.datumInvoer),
                        exam: false,
                    });
                }
            });
        this.Object.values(this.subjects).forEach((x) => {
            x.grades.sort((a, b) => {
                if (a.kolom === 'Toetskolom' || a.kolom === 'Werkstukcijferkolom') return -1;
                if (b.kolom === 'Toetskolom' || b.kolom === 'Werkstukcijferkolom') return 1;
                return a.date > b.date ? 1 : -1;
            });
        });
    }
    async getHomework() {
        let data = await this.somtoday.getHomework(this.homeworkCont.value);
        this.homeworks = (data.items.filter((i) => i.studiewijzerItem !== undefined) as huiswerkResult[])
            .map((i) => {
                return {
                    title: i.studiewijzerItem.onderwerp,
                    content: i.studiewijzerItem.omschrijving,
                    fileUrls: i.studiewijzerItem.bijlagen.map((b) => b.assemblyResults.fileUrl),
                    date: new Date(i.datumTijd),
                    subject: i.lesgroep.vak.afkorting,
                };
            })
            .sort((a, b) => (a.date > b.date ? 1 : -1));
    }
    async getLessons() {
        if (this.startDate.value === null || this.stopDate.value === null) return;
        let diff = this.stopDate.value.valueOf() - this.startDate.value.valueOf();
        if (diff < 0 || diff >= 345600001) return;
        let data = await this.somtoday.getSchedule(this.startDate.value, this.stopDate.value);
        this.lessons = data.items.map(
            (i) =>
                new Lesson(
                    i.additionalObjects.docentAfkortingen,
                    i.additionalObjects.vak ? i.additionalObjects.vak.afkorting : i.titel,
                    new Location(i.locatie === undefined ? 'E000' : i.locatie),
                    new Date(i.beginDatumTijd),
                    new Date(i.eindDatumTijd)
                )
        );
    }
    public somtoday: Somtoday = new Somtoday(
        async () => {
            Savable.Save('somtoday', this.somtoday)
                .then(() => {
                    return this.getLessons();
                })
                .then(() => {
                    return this.getGrades();
                })
                .then(() => {
                    return this.getHomework();
                });
        },
        () => this.openPage({ id: 4 })
    );
    homeworkCont = new FormControl(new Date(), { nonNullable: true });
    //settings------------------------------------------------------------------------------------------------------------------------
    get appSites() {
        return this.wigets.filter((x) => x.data.formControl).map((x) => x.data.formControl) as FormControl<boolean>[];
    }
    get all() {
        return this.appSites.every((x) => x.value);
    }
    get indeterminate() {
        if (this.all) return false;
        return this.appSites.some((x) => x.value);
    }
    setAll(b: MatCheckboxChange) {
        this.appSites.forEach((x) => x.setValue(b.checked));
    }
    layoutFormControl = new FormControl<LayoutType>('stretch', { nonNullable: true });
    iconColorControl = new FormControl<string>('transparent', { nonNullable: true });
    layout: LayoutType = 'stretch';
    setLayout(v: LayoutType = 'stretch') {
        this.layout = v;
        this.settings.value.menu = v;
        Savable.Save('settings', this.settings);
    }
    zermeloFormControl = new FormControl('', [Validators.required, ZermeloValidator(new RegExp('(?:[0-9]{3} ?){4}'))]);
    matcher = new ZermeloErrorStateMatcher();
    //@ViewChild('somCode') someInput?: ElementRef<HTMLInputElement>;
    zermeloSubmit(e: SubmitEvent) {
        if (this.zermeloFormControl.valid) console.log(this.zermeloFormControl.value?.replaceAll(' ', ''));
    }
    public settings: JSONObject<{
        openApp: boolean[];
        menu: LayoutType;
        iconColor: string;
    }> = new JSONObject({
        openApp: [false, false, false, false, false],
        menu: 'stretch',
        iconColor: 'white',
    });
    //--------------------------------------------------------------------------------------------
    constructor(private http: HttpClient, private dialog: MatDialog, private viewRefrence: ViewContainerRef) {
        setVar(this, 'This'); //#####################################################################
        AppLauncher.canOpenUrl({ url: 'com.cijferroyale.CijferRoyale' }).then((x) => {
            if (x.value) {
                this.wigets.push({
                    x: 2,
                    y: 1,
                    w: 1,
                    h: 1,
                    data: {
                        name: 'Cijfer Royale',
                        img: 'https://cijferroyale.nl/images/logo.png',
                        appLink: 'com.cijferroyale.CijferRoyale',
                    },
                });
            }
            Savable.Load('settings', this.settings).then(() => {
                if (this.layoutFormControl !== null) this.layoutFormControl.setValue(this.settings.value.menu);
                this.iconColorControl.setValue(this.settings.value.iconColor);
                let index = 0;
                this.wigets.forEach((v) => {
                    let fc = v.data.formControl;
                    let i = index;
                    fc?.setValue(this.settings.value.openApp[i]);
                    fc?.valueChanges.subscribe((v) => {
                        this.settings.value.openApp[i] = v !== null ? v : false;
                        Savable.Save('settings', this.settings);
                    });
                    //if(v.appLink !== undefined){
                    //this.checked.push(fc);
                    //}
                    index++;
                });
            });
        });
        this.layoutFormControl.valueChanges.subscribe((v) => {
            if (v !== null) this.setLayout(v);
        });
        this.homeworkCont.valueChanges.subscribe(() => {
            this.getHomework();
        });
        this.stopDate.valueChanges.subscribe(() => {
            this.getLessons();
        });
        this.startDate.valueChanges.subscribe(() => {
            this.getLessons();
        });
        this.iconColorControl.valueChanges.subscribe((v) => {
            this.settings.value.iconColor = v;
            Savable.Save('settings', this.settings);
        });
        AppComponent.instance = this;
        Savable.Load('somtoday', this.somtoday);
        this.somtoday.client = http;
        App.addListener('appUrlOpen', (data) => {
            let url = new URL(data.url);
            let params = url.searchParams;
            let codeParam = params.get('code');
            if (codeParam !== null) {
                this.somtoday.getCodeToken(codeParam);
            } else {
                alert('code parse error');
            }
        });
        App.addListener('backButton', (data) => {
            if (!this.pages?.back()) {
                App.exitApp();
            }
            //alert('back' + data.canGoBack);
            //window.history.back();
        });
    }
    //home--------------------------------------------------------------------------------------
    wigets: Wiget[] = [
        {
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            data: {
                name: 'Zermelo',
                img: 'assets/zrm.svg',
                webLink:
                    'https://account.activedirectory.windowsazure.com/applications/signin/40a96122-51bb-430a-b504-6a225c51e676?tenantId=788de26b-bf5a-46d5-bb58-f35ff7bdd172',
            },
        },
        {
            x: 1,
            y: 0,
            w: 1,
            h: 1,
            data: {
                name: 'ItsLearning',
                img: 'assets/itl.svg',
                webLink: 'https://lvo.itslearning.com/',
                appLink: 'com.itslearning.itslearningintapp',
                formControl: new FormControl<boolean>(false, { nonNullable: true }),
            },
        },
        {
            x: 2,
            y: 0,
            w: 1,
            h: 1,
            data: {
                name: 'Somtoday',
                img: 'assets/som.svg',
                webLink: 'https://inloggen.somtoday.nl/',
                appLink: 'nl.topicus.somtoday.leerling',
                formControl: new FormControl<boolean>(false, { nonNullable: true }),
            },
        },
        {
            x: 0,
            y: 1,
            w: 1,
            h: 1,
            data: {
                name: 'Office',
                img: 'assets/off.svg',
                webLink: 'https://www.office.com/',
            },
        },
        {
            x: 1,
            y: 1,
            w: 1,
            h: 1,
            data: {
                name: 'Sint-Jan',
                img: 'assets/logosintjansquire.svg',
                webLink: 'https://www.sintjan-lvo.nl/',
            },
        },
        {
            x: 0,
            y: 2,
            w: 1,
            h: 1,
            data: {
                name: 'Sint-Jan OLC',
                img: 'assets/OLC.svg',
                webLink: 'https://sintjan-lvo.auralibrary.nl/auraicx.aspx',
                appLink: 'nl.aura.auralibrary.android',
                formControl: new FormControl<boolean>(false, { nonNullable: true }),
            },
        },
    ];
    clientWidth = '100%';
    ngAfterContentChecked(): void {
        if (this.home !== undefined) {
            this.clientWidth = this.home.nativeElement.clientWidth + 'px';
        }
    }
    @ViewChild('home', { read: ElementRef }) home?: ElementRef<HTMLElement>;
    gridSize: number = 3;
    spacing = '4vw';
    //schedule----------------------------------------------------------------------------------------
    @ViewChild(MatRipple) ripple?: MatRipple;
    date = new FormControl(new Date());
    dateType: 'fullWeek' | 'semiWeek' | 'day' = 'semiWeek';
    startDate = new FormControl(new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)));
    stopDate = new FormControl(new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 5 + (this.dateType === 'semiWeek' ? 0 : 2))));
    clicks: number = 0;
    lastClickOffset = 0;
    onClick(e: MouseEvent): void {
        if (!(e.target instanceof HTMLElement) || this.ripple === undefined) return;
        this.clicks += 1;
        setTimeout(() => {
            this.clicks -= 1;
        }, 300);
        if (this.clicks >= 2) {
            let dir: boolean = e.offsetX > e.target.clientWidth / 2;

            let bounds = e.target.getBoundingClientRect();
            this.ripple.launch(bounds.x + (dir ? 1 : 0) * bounds.width, bounds.y + bounds.height / 2, {});

            let dir2: boolean = this.lastClickOffset > e.target.clientWidth / 2;

            if (dir != dir2) return;

            if (this.dateType === 'day') {
                let tmp = this.date.value;
                if (tmp !== null) tmp = new Date(tmp.getTime() + (dir ? 1 : -1) * 1000 * 3600 * 24);
                this.date.setValue(tmp);
            } else {
                let tmp = this.startDate.value;
                if (tmp !== null) tmp = new Date(tmp.getTime() + (dir ? 1 : -1) * 1000 * 3600 * 24 * 7);
                this.startDate.setValue(tmp);

                tmp = this.stopDate.value;
                if (tmp !== null) tmp = new Date(tmp.getTime() + (dir ? 1 : -1) * 1000 * 3600 * 24 * 7);
                this.stopDate.setValue(tmp);
            }
        }
        this.lastClickOffset = e.offsetX;
    }
    //---------------------------------------------------------------------------
    tabs = {
        names: ['Home', 'Grades', 'Class', 'Message'],
        visible: 2,
    };
    selectEvent = new EventEmitter<{ id: number; data?: any }>();
    backEvent = new EventEmitter<void>();
    @ViewChild('navigation') pages?: PageComponent;
    openPage(page: Page) {
        if (this.pages === undefined) return;
        this.pages.select(page);
    }
    get pageData() {
        if (this.pages === undefined) return undefined;
        if (this.pages.selected.value === undefined) return undefined;
        return this.pages.selected.value?.data;
    }
    openSomtodayLogin() {
        Browser.open({ url: Somtoday.loginLink });
    }
    async openSite(site: Site) {
        if (site.formControl?.value || site.appLink === undefined || !(await AppLauncher.canOpenUrl({ url: site.appLink })).value)
            if (site.webLink !== undefined) return await Browser.open({ url: site.webLink });
        if (site.appLink !== undefined) return await AppLauncher.openUrl({ url: site.appLink });
        alert('No path available.');
        return;
    }
    tryLogin(text?: string) {
        let t = text ? text : '';
        //if (this.someInput !== undefined) t = this.someInput.nativeElement.value;
        this.somtoday.getCodeToken(t);
    }
    resetData() {
        Preferences.clear();
    }
    isCalcOpen: boolean = false;
    isExamControl = new FormControl<boolean>(false, { nonNullable: true });
    weightControl = new FormControl<number>(1, { nonNullable: true });
    gradeControl = new FormControl<number>(1, { nonNullable: true });
    calcOpen() {
        this.isCalcOpen = !this.isCalcOpen;
    }
    get gradeInfo() {
        if (!this.pages) return { totalWeight: 1, total: 0 };
        let data = this.pages.selected.value.data as Subject;
        let w = 0;
        let v = 0;
        data.grades.forEach((x) => {
            let isString = isNaN((x.value as string).replace(',', '.') as unknown as number);
            if (isString || (x.kolom !== 'Toetskolom' && x.kolom !== 'Werkstukcijferkolom')) return;
            if (x.exam !== this.isExamControl.value) return;
            w += x.weight;
            v += ((x.value as string).replace(',', '.') as unknown as number) * x.weight;
        });
        return { totalWeight: w, total: Math.ceil(v * 10) / 10 };
    }
    clamp(n: number) {
        if (n > 10) return '>10';
        else if (n < 1) return '<1';
        else return String(n).replace('.', ',');
    }
}
