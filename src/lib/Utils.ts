import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { GetResult, Preferences } from '@capacitor/preferences';
import { catchError, EMPTY } from 'rxjs';
import { Vak, resultaatType } from './Somtoday';
import { DateAdapter, ErrorStateMatcher, NativeDateAdapter } from '@angular/material/core';
import { AbstractControl, FormControl, FormGroupDirective, NgForm, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Injectable } from '@angular/core';
import { DateRange, MatDateRangeSelectionStrategy } from '@angular/material/datepicker';
/**
 * Represents an object that can be saved to storage.
 */
export abstract class Savable<M> {
    /**
     * Simplifies this object to a simpler type. (M)
     * @returns A Simplified version of this object of type M.
     */
    abstract simplify(): M;
    /**
     * Copies the data of the input object to itself
     * @param simple The object to copy from.
     */
    abstract readFromObject(simple: M): void;
    /**
     * Copies the saved version of an object into the host.
     * @param key The key of the object to load.
     * @param host The object to capy to.
     */
    public static async Load<B, T extends Savable<B>>(key: string, host: T) {
        let result: GetResult = await Preferences.get({ key });
        if (result.value !== null) {
            let obj: B | undefined = tryJSONParse(result.value);
            if (obj !== undefined) host.readFromObject(obj);
            else await this.Save(key, host);
        } else await this.Save(key, host);
    }
    /**
     * Saves the simplified version of the value object
     * @param key The key to save the object under.
     * @param value The object to save.
     */
    public static async Save<B, T extends Savable<B>>(key: string, value: T) {
        await Preferences.set({ key, value: JSON.stringify(value.simplify()) });
    }
}
/**
 * Represents a service that has login credentials.
 */
export abstract class AskLogin {
    /**
     * Checks if the access token is still valid. if invalid it tries to refresh it.
     * @returns A valid token.
     */
    async checkAccessToken(): Promise<Token> {
        if (!this.access_token.isValid) {
            return await this.resolveToken();
        } else return this.access_token;
    }
    public access_token: Token = new Token();
    /**
     * Tries to refresh the access token.
     * @returns A valid token.
     */
    abstract resolveToken(): Promise<Token>;
}
/**
 * Represents a login token containing a string and an expire time.
 */
export class Token {
    private expire_time: number;
    private _value: string;
    /**
     * @param expire_time The time at which the token becomes invalid.
     * @param value The object to save.
     */
    constructor(value = '', expire_time = 0) {
        this._value = value;
        this.expire_time = expire_time;
    }
    toString(): string {
        return '(' + this.value + ',' + this.expire_time + ')';
    }
    /**
     * @param expire_time The time at which the token becomes invalid.
     * @param value The object to save.
     */
    public async setValues(value: string, expire_time: number) {
        this._value = value;
        this.expire_time = expire_time;
    }
    /**
     * Copies an other token.
     * @param t The token to copy.
     */
    public async setValue(t: Token) {
        this._value = t._value;
        this.expire_time = t.expire_time;
    }
    public get value(): string {
        return this._value;
    }
    /**
     * Checks if the token should currently be valid.
     * @warning This doesn't check if the token was used (in case of refresh tokens)
     * or if the provider thinks the token is valid (Somtoday seems to be realy bad at detecting out of date refresh tokens).
     */
    public get isValid(): boolean {
        return new Date().getTime() < this.expire_time;
    }
}
/**
 * Represents an object that itself is simple enough to save directly as json.
 */
export class JSONObject<T> implements Savable<T> {
    public value: T;
    /**
     * @param value The value to hold in the container.
     */
    constructor(value: T) {
        this.value = value;
    }
    simplify(): T {
        return this.value;
    }
    readFromObject(simple: T): void {
        this.value = simple;
    }
}
/**
 * Custom data adapter to get weeks going from monday to sunday and with the format: day month year. were month is correctly translated.
 */
export class AppDateAdapter extends NativeDateAdapter {
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
/*
export class ZermeloErrorStateMatcher implements ErrorStateMatcher {
    isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
        const isSubmitted = form && form.submitted;
        return !!(control && control.invalid && (control.dirty || control.touched || isSubmitted));
    }
}
export function RegexValidator(nameRe: RegExp): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const forbidden = nameRe.test(control.value);
        return forbidden ? null : { zermelo: { value: control.value } };
    };
}
*/
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
            const short = 2; //AppComponent.instance.dateType === 'semiWeek' ? 2 : 0;
            const start = this._dateAdapter.addCalendarDays(date, 1 - currentDay);
            const end = this._dateAdapter.addCalendarDays(date, 7 - currentDay - short);
            return new DateRange<D>(start, end);
        }
        return new DateRange<D>(null, null);
    }
}
/**
 * @param yearNum The year number.
 * @param weekNum The week number.
 * @param numOfWeeks The number of weeks.
 * @returns The correct date rage
 */
export function getWeekDates(yearNum: number, weekNum: number, numOfWeeks: number): { begin: Date; end: Date } {
    let begin = new Date(yearNum, 0, 1);
    begin.setDate(2 - begin.getDay() + weekNum * 7);
    let end = new Date(begin);
    end.setDate(end.getDate() + 7 * numOfWeeks);
    return { begin, end };
}
/**
 * @param currentdate The date.
 * @returns The number of the current week as of the date.
 */
export function getWeek(currentdate: Date): number {
    var oneJan = new Date(currentdate.getFullYear(), 0, 1);
    oneJan.setDate(oneJan.getDate() - oneJan.getDay() + 1);
    if (oneJan.getFullYear() !== currentdate.getFullYear()) oneJan.setDate(oneJan.getDate() + 7);
    return Math.floor((currentdate.getTime() - oneJan.getTime()) / (24 * 3600 * 1000 * 7)) + 1;
}
/**
 * Represents a location in the school.
 */
export class Location {
    private static regex: RegExp = new RegExp('^([^0-9]+)([0-9])([0-9]{2})');
    building: string = 'E';
    floor: number = 0;
    roomId: number = 0;
    /**
     * @param text The yext version of the location. e.g. A001
     */
    constructor(text: string | null = null) {
        let result: RegExpMatchArray | null = null;
        if (text !== null) result = Location.regex.exec(text);
        if (result !== null) {
            this.building = result[1];
            this.floor = parseInt(result[2]);
            this.roomId = parseInt(result[3]);
        }
    }
    /**
     * @returns The text version of this location
     */
    toString() {
        return this.building.toString() + this.floor + (this.roomId + '').padStart(2, '0');
    }
}
/**
 * Represents a lesson at the school.
 */
export class Lesson {
    /**
     * @param teacher The name of the teacher(s) that give this lesson
     * @param subject The name of a subject or just a description of the lesson.
     * @param location The location of this lesson.
     * @param start The start of this lesson.
     * @param end The end of this lesson.
     */
    constructor(title: string, description: string, teacher: string, subject: string, location: Location, start: Date, end: Date) {
        this.date = start;
        this.dayNumber = start.getDay() - 1;
        if (this.dayNumber === -1) this.dayNumber = 7;
        this.start = start.getMinutes() + start.getHours() * 60;
        this.end = end.getMinutes() + end.getHours() * 60;
        this.location = location;
        this.teacher = teacher;
        //this.homework = [];
        this.subject = subject;
        this.title = title;
        this.description = description;
    }
    date: Date;
    subject: string;
    teacher: string;
    dayNumber: number;
    location: Location;
    start: number;
    end: number;
    title: string;
    description: string;
    //title: string;
    //homework: Homework[];
}
/**
 * Represents homework.
 */
export type Homework = {
    subject: string;
    date: Date;
    title: string;
    content: string;
    fileUrls: string[];
};
/**
 * Represents a subject.
 */
export class Subject {
    constructor(vak: Vak) {
        this.name = vak.naam;
        this.shortName = vak.afkorting;
    }
    name: string = '';
    shortName: string = '';
    grades: Grade[] = [];
    average?: Grade;
}
/**
 * Represents a Grade.
 */
export type Grade = {
    date: Date;
    periode: number;
    leerjaar: number;
    value: number | string;
    weight: number;
    discriptor: string;
    kolom: resultaatType;
    type: 'Handelingsdeel' | 'Theoretische toets' | null;
    exam: boolean;
};
/**
 * Sets a global variable. Used for debugging in the webversion.
 */
export function setVar(value: any, name: string) {
    // @ts-ignore
    window[name] = value;
}
/**
 * Tries to parse a JSON string. If it fails it returns undefined.
 * @param text The JSON string to parse.
 * @returns The object version of the JSON string.
 */
export function tryJSONParse(text: string): any | undefined {
    let result: any | undefined = undefined;
    try {
        result = JSON.parse(text);
    } catch (e) {
        if (!(e instanceof SyntaxError)) throw e;
    }
    return result;
}
/**
 * Makes a HTTP request to an endpoint.
 * @param client The client object supplied by angular.
 * @param url The endpoint.
 * @param method The method type. e.g. GET
 * @param body The main data of the request.
 * @param params The request parramaters. (The part after the ?)
 * @param headers The request headers. e.g. accept
 * @returns The object version of the JSON string.
 */
export function request<T>(client: HttpClient, url: string, method: 'GET' | 'PUT' | 'POST', body: any, params: HttpParams, headers: HttpHeaders): Promise<T> {
    return new Promise((resolve, reject) => {
        client
            .request<T>(method, url, { responseType: 'json', params, body, headers })
            .pipe(
                catchError((e) => {
                    if (e.status === 0) {
                        alert("Can't connect to " + url + '. Check your wifi. ' + '\n' + JSON.stringify(e));
                    }
                    reject(e);
                    return EMPTY;
                })
            )
            .subscribe((value) => {
                resolve(value);
            });
    });
}
/**
 * Asynchronosly blocks until a set amount of miliseconds have past.
 * @param ms The number of miliseconds
 */
export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
