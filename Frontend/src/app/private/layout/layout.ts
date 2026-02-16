import { Component } from '@angular/core';
import { Route, Router, RouterLink, RouterOutlet } from '@angular/router';
import { ToastService } from '../../core/toast/toastservice';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet,RouterLink],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {

  constructor(private _router: Router, private toastr: ToastService) { }
  loggedUserName = localStorage.getItem("loggedUserName") || 'Guest User';

  onLogout() {
    localStorage.clear();
    this.toastr.success("Logged out successfully");
    this._router.navigate(['/login']);
  }
}
