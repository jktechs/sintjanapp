import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClientModule } from '@angular/common/http';
import { MatInputModule } from '@angular/material/input';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatTabsModule } from '@angular/material/tabs';
import { MatRippleModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';

import { AppComponent } from './app.component';
import { PageComponent } from './pages/pages.component';
import { NavPageDirective } from './page/nav-page.directive';

import { MatIconModule } from '@angular/material/icon';

import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';

import { MatSelectModule } from '@angular/material/select';

@NgModule({
    declarations: [AppComponent, PageComponent, NavPageDirective],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule,
        MatDatepickerModule,
        MatFormFieldModule,
        MatNativeDateModule,
        MatInputModule,
        MatTabsModule,
        MatRippleModule,
        MatCardModule,
        MatButtonModule,
        MatListModule,
        MatDividerModule,
        MatCheckboxModule,
        MatChipsModule,
        MatIconModule,
        MatDialogModule,
        MatMenuModule,
        MatSelectModule,
    ],
    providers: [],
    bootstrap: [AppComponent],
})
export class AppModule {}
