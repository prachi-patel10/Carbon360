import { Component } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError, RouterOutlet } from '@angular/router';
import { LoaderComponent } from './core/loader/loader';
import { LoaderService } from './core/loader/loader-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, LoaderComponent],
  template: `
    <app-loader></app-loader>
    <router-outlet></router-outlet>
  `
})
export class App {

  constructor(private router: Router, private loader: LoaderService) {

    this.router.events.subscribe(event => {

      if (event instanceof NavigationStart) {
        this.loader.show();
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        setTimeout(() => {
          this.loader.hide();
        }, 600);   // 🔥 Change time here if needed
      }

    });

  }
}