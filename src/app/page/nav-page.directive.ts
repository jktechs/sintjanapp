import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';

/**
 * Add the template content to the DOM unless the condition is true.
 */
@Directive({ selector: '[appNavPage]' })
export class NavPageDirective {
    ref: TemplateRef<any>;
    constructor(private templateRef: TemplateRef<any>, private viewContainer: ViewContainerRef) {
        this.ref = templateRef;
    }
    @Input() appNavPage: { name: string; id: number; icon: string } = { name: '', id: -1, icon: '' };
}
