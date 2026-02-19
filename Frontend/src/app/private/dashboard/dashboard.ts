import { Component } from '@angular/core';
import { Router,RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/guards/auth-service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  loggedInUser: string = '';

  constructor(private authService: AuthService, private router: Router) {
    const user = this.authService.getLoggedInUser();
    if (!user) {
      this.router.navigate(['/login']); // Redirect if not logged in
    } else {
      this.loggedInUser = user.name;
    }
  }

   logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  navigateTo(path: string) {
    this.router.navigate([`/${path}`]);
  }
}
