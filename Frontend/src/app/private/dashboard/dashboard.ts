import { Component, HostListener } from '@angular/core';
import { Router, NavigationEnd ,RouterOutlet, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/guards/auth-service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';


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
 sidebarOpen: boolean = true;

pageTitle: string = '';


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
  this.router.events
    .pipe(filter(event => event instanceof NavigationEnd))
    .subscribe(() => {
      const url = this.router.url;

      if (url.includes('user')) {
        this.pageTitle = 'User Administration';
      } else if (url.includes('role')) {
        this.pageTitle = 'Access Control : Role Management';
      } else if (url.includes('department')) {
        this.pageTitle = 'Organizational Units : Manage Departments';
      } else if (url.includes('vehiclereport')) {
        this.pageTitle = 'Fleet Report';
      } else if (url.includes('waste')) {
        this.pageTitle = 'Waste Management';
      } else if (url.includes('vehiclemaster')) {
        this.pageTitle = 'Vehicle master';
      }else if (url.includes('vehicle')) {
        this.pageTitle = 'Vehicle Trip Emission Calculation Form';
      } 
      else {
        this.pageTitle = 'Dashboard';
      }
    });

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
  this.sidebarOpen = !this.sidebarOpen;
}


  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /*CORRECT ROLE SWITCH */

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

  /*SUBMENU */
  openedMenu: string | null = null;

toggleMenu(menu: string) {
  this.openedMenu = this.openedMenu === menu ? null : menu;
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