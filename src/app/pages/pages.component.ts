import { Component, ContentChildren, EventEmitter, Injectable, Input, NgZone, OnInit, QueryList, ViewEncapsulation } from '@angular/core';
import { FormControl } from '@angular/forms';
import { NavPageDirective } from '../page/nav-page.directive';

@Component({
    selector: 'app-pages',
    templateUrl: './pages.component.html',
    styleUrls: ['./pages.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
@Injectable()
export class PageComponent implements OnInit {
    @Input() selectEvent?: EventEmitter<Page>;
    @Input() backEvent?: EventEmitter<void>;
    @Input() stretch?: boolean;
    @Input() align?: AlignType;
    ngOnInit(): void {
        this.selectEvent?.subscribe((page) => this.select(page));
        this.backEvent?.subscribe(() => this.back());
    }
    @Input() visible: number = 2;

    items: NavPageDirective[] = [];
    selected = new FormControl<Page>({ id: 0 }, { nonNullable: true });
    history: Page[] = [];
    visibles: boolean[] = [];
    constructor(private zone: NgZone) {}
    isVisible(id: number) {
        if (id < this.visible) return true;
        return this.visibles[id - this.visible];
    }
    @ContentChildren(NavPageDirective) set listItems(list: QueryList<NavPageDirective>) {
        this.visibles = [];
        this.items = list
            .map((x) => x)
            .sort((a, b) => {
                return a.appNavPage.id < b.appNavPage.id ? -1 : 1;
            });
        for (let i = 0; i < list.length - this.visible; i++) this.visibles.push(false);
    }
    public select(p: Page, updateHistory = true): void {
        this.zone.run(() => {
            let id = p.id;
            if (p.id === this.selected.value.id) return;
            if (p.id >= this.visible) this.visibles[p.id - this.visible] = true;
            if (updateHistory) this.history.push(structuredClone(this.selected.value));
            this.selected.setValue(p);
            setTimeout(() => {
                for (let i = 0; i < this.visibles.length; i++) this.visibles[i] = id === i + this.visible;
            }, 400);
        });
    }
    back(): boolean {
        let lastPage = this.history.pop();
        if (lastPage !== undefined) {
            this.select(lastPage, false);
        }
        return !!lastPage;
    }
}
export type Page = {
    id: number;
    data?: any;
};
export type AlignType = 'start' | 'end' | 'center';
export type LayoutType = AlignType | 'stretch';
