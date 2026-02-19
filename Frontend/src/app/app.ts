import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {CommonModule } from '@angular/common';


@Component({
  selector: 'app-root',
  standalone: true,  // <-- Add this
  imports: [RouterOutlet,FormsModule,CommonModule ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('ProjectApp');
}
