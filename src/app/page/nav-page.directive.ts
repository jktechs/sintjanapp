import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

@Directive({ selector: '[appNavPage]' })
export class NavPageDirective {
    refrence: TemplateRef<any>;
    constructor(private templateRef: TemplateRef<any>, private viewContainer: ViewContainerRef) {
        this.refrence = templateRef;
    }
    @Input() appNavPage: { name: string; id: number; icon: string } = { name: '', id: -1, icon: '' };
}
