import { Component, HostListener } from '@angular/core';
import { Router,RouterOutlet,ActivatedRoute  } from '@angular/router';
import { AuthService } from '../../core/guards/auth-service';
import { FormsModule } from '@angular/forms';
import {CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  imports:[FormsModule,CommonModule,RouterOutlet],
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {

  loggedInUser: string = '';
  selectedRole: string = 'Admin';
  showProfileCard: boolean = false;

  constructor(private authService: AuthService, private router: Router,  private route: ActivatedRoute
) {
    const user = this.authService.getLoggedInUser();
    if (!user) {
      this.router.navigate(['/login']);
    } else {
      this.loggedInUser = user.name;
    }
  }

  ngOnInit() {
    const savedRole = localStorage.getItem('selectedRole');
    if (savedRole) {
      this.selectedRole = savedRole;
    }
  }

  goTo(path: string) {
  this.router.navigate([path], { relativeTo: this.route });
}

isActive(path: string): boolean {
  return this.router.url.includes(path);
}

  /* ✅ FIXED DROPDOWN */

  toggleProfile(event: Event) {
    event.stopPropagation();
    this.showProfileCard = !this.showProfileCard;
  }

  @HostListener('document:click')
  closeDropdown() {
    this.showProfileCard = false;
  }

  /* Sidebar */
  toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar?.classList.toggle('show');
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  onRoleChange() {
    localStorage.setItem('selectedRole', this.selectedRole);
  }

}
