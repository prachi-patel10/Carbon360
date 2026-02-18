import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { provideToastr } from 'ngx-toastr';


@Component({
  selector: 'app-root',
  standalone: true,  // <-- Add this
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('ProjectApp');
}
