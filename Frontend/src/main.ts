import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { importProvidersFrom } from '@angular/core';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';

bootstrapApplication(App, {
  providers: [
    ...appConfig.providers,
    importProvidersFrom(
      NgxDaterangepickerMd.forRoot({
        locale: { format: 'DD-MMM-YYYY' } // keep it simple
      })
    )
  ]
}).catch((err) => console.error(err));