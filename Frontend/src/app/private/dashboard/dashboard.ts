import { Component, HostListener } from '@angular/core';
import { Router, RouterOutlet, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/guards/auth-service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  imports: [FormsModule, CommonModule, RouterOutlet],
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {

  loggedInUser: string = '';
  roles: string[] = [];
  selectedRole: string = '';
  showProfileCard: boolean = false;
  sidebarOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

 ngOnInit() {

  const user = this.authService.getLoggedInUser();

  if (!user) {
    this.router.navigate(['/login']);
    return;
  }

  this.loggedInUser = user.name;

  // SAFE ASSIGNMENT
  this.roles = user.roles ?? [];
  this.selectedRole = user.currentRole ?? '';
}
  goTo(path: string) {
    this.router.navigate([path], { relativeTo: this.route });
  }

  isActive(path: string): boolean {
    return this.router.url.includes(path);
  }

 

  /* Dropdown */

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
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /* ✅ CORRECT ROLE SWITCH */

  onRoleChange() {

    this.authService.switchRole(this.selectedRole)
      .subscribe({
        next: (res: any) => {

          const updatedUser = {
            name: res.userName,
            roles: res.roles,
            currentRole: res.currentRole,
            token: res.token
          };

          localStorage.setItem('user', JSON.stringify(updatedUser));
          localStorage.setItem('token', res.token);

          // reload dashboard to apply new permissions
          window.location.reload();
        }
      });
  }

  isAdmin(): boolean {
  return this.selectedRole === 'Admin';
}

isCorporate(): boolean {
  return this.selectedRole === 'Corporate';
}

isReporter(): boolean {
  return this.selectedRole === 'Reporter';
}

}