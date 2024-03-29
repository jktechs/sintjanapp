import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AskLogin, request, Savable, Token } from './Utils';
/**
 * Represents all the data that the Somtoday API needs to have saved.
 */
export class SomtodayData {
    public access_token: Token = new Token();
    public refresh_token: Token = new Token();
    public user_id: studentResult = new studentResult();
}

export class Somtoday extends AskLogin implements Savable<SomtodayData> {
    public static client_id: string = 'D50E0C06-32D1-4B41-A137-A9A850C892C2';
    public static LVOBuuid = 'd091c475-43f3-494f-8b1a-84946a5c2142';
    public static tokenEndpoint = 'https://inloggen.somtoday.nl/oauth2/token';
    public static baseEndpoint = 'https://api.somtoday.nl/rest/v1/';
    public static loginLink =
        'https://somtoday.nl/oauth2/authorize?redirect_uri=somtodayleerling://oauth/callback&client_id=D50E0C06-32D1-4B41-A137-A9A850C892C2&response_type=code&prompt=login&state=UNlYiXONB69K8uNwNJ2rCw&scope=openid&code_challenge=tCqjy6FPb1kdOfvSa43D8a7j8FLDmKFCAz8EdRGdtQA&code_challenge_method=S256&tenant_uuid=788de26b-bf5a-46d5-bb58-f35ff7bdd172&oidc_iss=https://login.microsoftonline.com/788de26b-bf5a-46d5-bb58-f35ff7bdd172/v2.0&session=no_session';
    public refresh_token: Token = new Token();
    private tokenError: () => void;
    public user_id: studentResult = new studentResult();
    public client?: HttpClient;
    public valid: boolean = true;
    public onUpdateToken: (a: Token) => void;
    constructor(tokenUpdate: (a: Token) => void, tokenError: () => void) {
        super();
        this.onUpdateToken = tokenUpdate;
        this.tokenError = tokenError;
    }
    simplify(): SomtodayData {
        return {
            access_token: this.access_token,
            refresh_token: this.refresh_token,
            user_id: this.user_id,
        };
    }
    public readFromObject(simple: SomtodayData): void {
        this.user_id = simple.user_id;
        this.refresh_token.setValue(simple.refresh_token);
        this.access_token.setValue(simple.access_token);
        if (!this.access_token.isValid) this.resolveToken();
        else this.onUpdateToken(this.access_token);
    }
    public async resolveToken(): Promise<Token> {
        if (!this.refresh_token.isValid) {
            alert('Please login to Somtoday.');
            this.valid = false;
            if (this.tokenError !== undefined) this.tokenError();
            throw new Error('No Token.');
        } else return await this.getToken('refresh_token', this.refresh_token.value);
    }
    public async getToken(grant_type: string, grant_value: string, extra_parms?: { [name: string]: string }): Promise<Token> {
        if (this.client === undefined) {
            alert('client is null');
            return new Token();
        }
        let params = new HttpParams();
        let headers = new HttpHeaders();
        headers = headers.append('Content-Type', 'application/x-www-form-urlencoded');
        params = params.append('grant_type', grant_type);
        params = params.append('scope', 'openid');
        params = params.append('client_id', Somtoday.client_id);
        if (grant_value !== '') params = params.append(grant_type, grant_value);
        if (extra_parms !== undefined) for (let i of Object.entries(extra_parms)) params = params.append(i[0], i[1]);
        let result = await request<{ refresh_token: string; access_token: string }>(
            this.client,
            Somtoday.tokenEndpoint,
            'POST',
            params.toString(),
            new HttpParams(),
            headers
        );
        this.refresh_token.setValues(result.refresh_token, 30 * 12 * 3600 * 1000 + new Date().getTime());
        this.access_token.setValues(result.access_token, 3600 * 1000 + new Date().getTime());
        let student = await this.getStudent();
        this.user_id = student.items[0];
        this.onUpdateToken(this.access_token);
        this.valid = true;
        return this.access_token;
    }
    public async getPasswordToken(username: string, password: string): Promise<Token> {
        return await this.getToken('password', password, {
            username: Somtoday.LVOBuuid + '\\' + username,
        });
    }
    public async getStudent(): Promise<{ items: studentResult[] }> {
        return await this.getData('leerlingen', {}, { additional: 'pasfoto' });
    }
    public static formatDate(data: Date) {
        return data.getFullYear() + '-' + (data.getMonth() + 1 + '').padStart(2, '0') + '-' + (data.getDate() + '').padStart(2, '0');
    }
    public async getSchedule(firstday: Date, lastday: Date): Promise<{ items: afsprakenResult[] }> {
        let begindate = Somtoday.formatDate(firstday);
        let enddate = Somtoday.formatDate(new Date(lastday.valueOf() + 1000 * 3600 * 24));

        let param = {
            additional: ['vak', 'docentAfkortingen'], // leerlingen
            begindatum: begindate,
            einddatum: enddate,
            sort: 'asc-id',
        };
        return await this.getData('afspraken', {}, param);
    }
    public async getGrades(): Promise<{ items: resultatenResult[] }> {
        let param = { leerling: this.user_id.links[0].id.toString() }; //additional: 'toetssoortnaam',
        let data2 = await this.getRange<resultatenResult>('resultaten/huidigVoorLeerling/' + this.user_id.links[0].id, {}, param);
        let data1 = await this.getRange<resultatenResult>('resultaten' /*/huidigVoorLeerling/' + this.user_id.links[0].id*/, {}, param);
        let output = { items: data1.items.concat(data2.items) };
        console.log(JSON.stringify(output));
        return output;
    }
    public async getMessages(firstday: Date): Promise<{ items: berichtResult[] }> {
        let begindate = Somtoday.formatDate(firstday);
        let param = {
            additional: 'verzender',
            'publicatie.startPublicatieNaOfOp': begindate,
        };
        return await this.getData('actierealisaties', {}, param);
    }
    public async getHomework(firstday: Date): Promise<{ items: rawHuiswerkResult[] }> {
        let begindate = Somtoday.formatDate(firstday);
        let param = { additional: 'swigemaaktVinkjes', begintNaOfOp: begindate };
        return {
            items: [
                ...(await this.getData<rawHuiswerkResult>('studiewijzeritemafspraaktoekenningen', {}, param)).items,
                ...(await this.getData<rawHuiswerkResult>('studiewijzeritemdagtoekenningen', {}, param)).items,
                ...(await this.getData<rawHuiswerkResult>('studiewijzeritemweektoekenningen', {}, param)).items,
            ],
        };
    }
    public async getData<T>(url: string, _headers: { [name: string]: string }, _params: { [name: string]: string | string[] }): Promise<{ items: T[] }> {
        if (this.client === undefined) {
            alert('client is null');
            throw new Error();
        }
        await this.checkAccessToken();
        let headers = new HttpHeaders();
        headers = headers.append('Authorization', 'Bearer ' + this.access_token.value);
        headers = headers.append('Accept', 'application/json');
        for (let i of Object.entries(_headers)) headers = headers.append(i[0], i[1]);
        let params = new HttpParams();

        for (let i of Object.entries(_params))
            if (Array.isArray(i[1])) for (let j of i[1]) params = params.append(i[0], j);
            else params = params.append(i[0], i[1]);
        return await request<{ items: T[] }>(this.client, Somtoday.baseEndpoint + url, 'GET', '', params, headers);
    }
    errorInds: number[] = [];
    public async getRange<T>(url: string, _headers: { [name: string]: string }, _params: { [name: string]: string | string[] }): Promise<{ items: T[] }> {
        let max = 99;
        let ranges: { min: number; max: number }[] = [{ min: 0, max: 99 }];
        let output: { items: T[] } = { items: [] };
        let l: number;
        while (true) {
            let c = ranges.pop();
            if (c == undefined) break;
            _headers['Range'] = 'items=' + c.min.toString() + '-' + c.max.toString();
            try {
                let data = await this.getData<T>(url, _headers, _params);
                if (data.items.length == c.max - c.min + 1 && c.max == max) {
                    ranges.push({ min: max + 1, max: max + 100 });
                    max += 100;
                }
                console.log('Succses: ' + JSON.stringify(c));
                output.items = output.items.concat(data.items);
            } catch (e) {
                if (c.max != c.min) {
                    let middle = Math.floor((c.max + c.min) / 2);
                    ranges.push({ min: c.min, max: middle });
                    ranges.push({ min: middle + 1, max: c.max });
                } else {
                    this.errorInds.push(c.max);
                    if (c.max == max) {
                        ranges.push({ min: max + 1, max: max + 100 });
                    }
                }
            }
        }
        console.log(JSON.stringify(this.errorInds.sort()));
        return output;
    }
    public async getCodeToken(code: string): Promise<Token> {
        return await this.getToken('authorization_code', '', {
            redirect_uri: 'somtodayleerling://oauth/callback',
            code_verifier: 't9b9-QCBB3hwdYa3UW2U2c9hhrhNzDdPww8Xp6wETWQ',
            code: code,
        });
    }
}
export type berichtResult = {
    additionalObjects: {
        verzender: string;
    };
    gelezen: boolean;
    actief: boolean;
    gelezenOp: string;
    actie: {
        startPublicatie: string;
        onderwerp: string;
        inhoud: string;
        prioriteit: string;
        notificatieType: string;
        bijlages: bijlage[];
    };
};
export type bijlage = {
    omschrijving?: string;
    assemblyResults: {
        fileExtension: string;
        mimeType: string;
        fileUrl: string;
        sslUrl: string;
        fileName: string;
    };
};
export type rawHuiswerkResult = {
    links: {
        type: 'studiewijzer.RSWIAfspraakToekenning' | 'studiewijzer.RSWIDagToekenning' | 'studiewijzer.RSWIWeekToekenning';
    }[];
    additionalObjects: {
        swigemaaktVinkjes: {
            items: {
                gemaakt: boolean;
            }[];
        };
    };
    studiewijzerItem?: {
        onderwerp: string;
        huiswerkType: string;
        omschrijving: string;
        bijlagen: bijlage[];
    };
    datumTijd: string;
    lesgroep: {
        vak: Vak;
    };
};
export type huiswerkResult = {
    links: {
        type: 'studiewijzer.RSWIAfspraakToekenning' | 'studiewijzer.RSWIDagToekenning' | 'studiewijzer.RSWIWeekToekenning';
    }[];
    additionalObjects: {
        swigemaaktVinkjes: {
            items: {
                gemaakt: boolean;
            }[];
        };
    };
    studiewijzerItem: {
        onderwerp: string;
        huiswerkType: string;
        omschrijving: string;
        bijlagen: bijlage[];
    };
    datumTijd: string;
    lesgroep: {
        vak: Vak;
    };
};
export type afsprakenResult = {
    links: [
        {
            id: number;
        }
    ];
    additionalObjects: {
        docentAfkortingen: string;
        vak: Vak | null;
    };
    afspraakType: {
        activiteit: string;
        presentieRegistratieDefault: boolean;
        actief: boolean;
        categorie: string;
        omschrijving: string;
        naam: string;
    };
    locatie?: string;
    beginDatumTijd: string;
    eindDatumTijd: string;
    titel: string;
    omschrijving: string;
    presentieRegistratieVerplicht: boolean;
    presentieRegistratieVerwerkt: boolean;
    afspraakStatus: string;
};
export type Vak = {
    afkorting: string;
    naam: string;
};
export type resultaatType =
    | 'Toetskolom'
    | 'SEGemiddeldeKolom'
    | 'PeriodeGemiddeldeKolom'
    | 'ToetssoortGemiddeldeKolom'
    | 'Werkstukcijferkolom'
    | 'RapportGemiddeldeKolom';
export type resultatenResult = {
    type: resultaatType;
    additionalObjects: {
        toetssoortnaam: 'Handelingsdeel' | 'Theoretische toets' | null;
    };
    resultaatLabelAfkorting?: string;
    datumInvoer: string;
    leerjaar: number;
    periode: number;
    vak: Vak;
    examenWeging?: number;
    weging?: number;
    omschrijving?: string;
    resultaat?: number;
    geldendResultaat?: number;
    isExamendossierResultaat: boolean;
    isVoortgangsdossierResultaat: boolean;
};
export class studentResult {
    links: [
        {
            id: number;
        }
    ] = [{ id: -1 }];
    additionalObjects: {
        pasfoto: {
            datauri: string;
        };
    } = { pasfoto: { datauri: '' } };
    UUID = '';
    leerlingnummer = -1;
    roepnaam = '';
    achternaam = '';
    email = '';
    geboortedatum = '';
    geslacht = '';
}
