import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { GetResult, Preferences } from '@capacitor/preferences';
import { catchError, EMPTY } from 'rxjs';
import { Vak } from './Somtoday';
export abstract class Savable<M> {
    abstract simplify(): M;
    abstract readFromObject(simple: M): void;
    public static async Load<B, T extends Savable<B>>(key: string, host: T): Promise<T | null> {
        let result: GetResult = await Preferences.get({ key });
        if (result.value !== null) {
            let obj: B | undefined = tryJSONParse(result.value);
            if (obj !== undefined) host.readFromObject(obj);
            else await this.Save(key, host);
        } else await this.Save(key, host);
        return host;
    }
    public static async Save<B, T extends Savable<B>>(key: string, value: T) {
        await Preferences.set({ key, value: JSON.stringify(value.simplify()) });
    }
}
export abstract class AskLogin {
    async checkAccessToken(): Promise<Token> {
        if (!this.access_token.isValid) {
            return await this.resolveToken();
        } else return this.access_token;
    }
    public access_token: Token = new Token();
    public abstract name: string;
    abstract resolveToken(): Promise<Token>;
}
export class Token {
    private expire_time: number;
    private _value: string;
    onUpdateToken: ((a: Token) => void) | undefined;
    constructor(value = '', expire_time = 0) {
        this._value = value;
        this.expire_time = expire_time;
    }
    toString(): string {
        return '(' + this.value + ',' + this.expire_time + ')';
    }
    public setValues(value: string, expire_time: number) {
        this._value = value;
        this.expire_time = expire_time;
        if (this.onUpdateToken !== undefined) this.onUpdateToken(this);
    }
    public setValue(t: Token) {
        this._value = t._value;
        this.expire_time = t.expire_time;
        if (this.onUpdateToken !== undefined) this.onUpdateToken(this);
    }
    public get value(): string {
        return this._value;
    }
    public get isValid(): boolean {
        return new Date().getTime() < this.expire_time;
    }
}
export class JSONObject<T> implements Savable<T> {
    public value: T;
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
export function getWeekDates(yearNum: number, weekNum: number, numOfWeeks: number): { begin: Date; end: Date } {
    let begin = new Date(yearNum, 0, 1);
    begin.setDate(2 - begin.getDay() + weekNum * 7);
    let end = new Date(begin);
    end.setDate(end.getDate() + 7 * numOfWeeks);
    return { begin, end };
}
export function getWeek(currentdate: Date): number {
    var oneJan = new Date(currentdate.getFullYear(), 0, 1);
    oneJan.setDate(oneJan.getDate() - oneJan.getDay() + 1);
    if (oneJan.getFullYear() !== currentdate.getFullYear()) oneJan.setDate(oneJan.getDate() + 7);
    return Math.floor((currentdate.getTime() - oneJan.getTime()) / (24 * 3600 * 1000 * 7)) + 1;
}
export class Location {
    private static regex: RegExp = new RegExp('^([^0-9]+)([0-9])([0-9]{2})');
    building: string = 'E';
    floor: number = 0;
    roomId: number = 0;
    constructor(text: string | null = null) {
        let result: RegExpMatchArray | null = null;
        if (text !== null) result = Location.regex.exec(text);
        if (result !== null) {
            this.building = result[1];
            this.floor = parseInt(result[2]);
            this.roomId = parseInt(result[3]);
        }
    }
    toString() {
        return this.building.toString() + this.floor + (this.roomId + '').padStart(2, '0');
    }
}
export class Lesson {
    constructor(teacher: string, subject: string, location: Location, start: Date, end: Date) {
        this.date = start;
        this.dayNumber = start.getDay() - 1;
        if (this.dayNumber === -1) this.dayNumber = 7;
        this.start = start.getMinutes() + start.getHours() * 60;
        this.end = end.getMinutes() + end.getHours() * 60;
        this.location = location;
        this.teacher = teacher;
        //this.homework = [];
        this.subject = subject;
    }
    date: Date;
    subject: string;
    teacher: string;
    dayNumber: number;
    location: Location;
    start: number;
    end: number;
    //homework: Homework[];
}
export type Homework = {
    subject: string;
    date: Date;
    title: string;
    content: string;
    fileUrls: string[];
};
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
export type Grade = {
    date: Date;
    periode: number;
    leerjaar: number;
    value: number | string;
    weight: number;
    discriptor: string;
    kolom: 'Toetskolom' | 'Werkstukcijferkolom' | 'SEGemiddeldeKolom' | 'PeriodeGemiddeldeKolom' | 'ToetssoortGemiddeldeKolom';
    type: 'Handelingsdeel' | 'Theoretische toets' | null;
};
export function setVar(value: any, name: string) {
    // @ts-ignore
    window[name] = value;
}
export function tryJSONParse(text: string): any | undefined {
    let result: any | undefined = undefined;
    try {
        result = JSON.parse(text);
    } catch (e) {
        if (!(e instanceof SyntaxError)) throw e;
    }
    return result;
}
export function request<T>(client: HttpClient, url: string, method: 'GET' | 'PUT' | 'POST', body: any, params: HttpParams, headers: HttpHeaders): Promise<T> {
    return new Promise((resolve, reject) => {
        client
            .request<T>(method, url, { responseType: 'json', params, body, headers })
            .pipe(
                catchError((e, o) => {
                    if (e.status === 0) {
                        alert("Can't connect. Check your wifi.");
                    } else alert(JSON.stringify(e));
                    return EMPTY;
                })
            )
            .subscribe((value) => {
                resolve(value);
            });
    });
}
