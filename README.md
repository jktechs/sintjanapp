# Sintjanapp

The Sint-Jan app is meant to be the jumping-off point for doing anything online for Sint-Jan.

Currently it give links to:

-   Zermelo
-   ItsLearning
-   Somtoday
-   The OLC website / The aura library app
-   Office
-   Optionaly Cijfer Royale

It also has builtin links to Somtoday. Including:

-   Grades
-   Schedule
-   Homework

## Development webserver

---

Run `npm start` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

The main `AppComponent` instance will be availible in the console as `This`. This will allow you to do things like run `This.tryLogin("CODE")`.

This is because in a webserver some things like logging in to somtoday are not possible.

An other handy function is `This.resetData()`. For when your settings become corrupted.

## Build

---

Run `npm run build` to build the project. This will update the android studio porject.

## Android project

---

Run `npm run android` to open the project in android studio.

## Running unit tests

---

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

Currently there are no tests.

## Requirements

---

Both [Node.js](https://nodejs.org/en/download) and [Android studio](https://developer.android.com/studio) need to be installed.

To install the angular cli run `npm install -g @angular/cli`.

Then to initialize the project run `npm install`.

Now you can build and open the project in Android studio or view it in the browser.
