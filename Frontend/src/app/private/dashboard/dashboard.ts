import { Component, HostListener } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute,RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/guards/auth-service';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
   imports: [
    CommonModule,
    FormsModule,  
    RouterOutlet 
  ],
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {

  loggedInUser: string = '';
  roles: string[] = [];
  selectedRole: string = '';
  showProfileCard: boolean = false;
  sidebarOpen: boolean = true;
  pageTitle: string = '';
  openedConfigMenu: string | null = null;  // Configuration -> admin/vehicle/generator/waste
  openedSubMenu: string | null = null;     // For submenus inside configuration
  openedMainMenu: string | null = null;    // Fleet / Waste / Power

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
    this.roles = user.roles ?? [];
    this.selectedRole = user.currentRole ?? '';

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.router.url;
        if (url.includes('user')) this.pageTitle = 'User Administration';
        // else if (url.includes('role')) this.pageTitle = 'Access Control : Role Management';
        else if (url.includes('department')) this.pageTitle = 'Organizational Units';
        else if (url.includes('vehiclereport')) this.pageTitle = 'Fleet Report';
        else if (url.includes('waste')) this.pageTitle = 'Waste Management';
        else if (url.includes('vehiclemaster')) this.pageTitle = 'Vehicles';
        else if (url.includes('fueltype')) this.pageTitle = 'Fuel Management';
        else if (url.includes('vehicletypeservice')) this.pageTitle = 'Vehicle Type';
        else if (url.includes('vehicle')) this.pageTitle = 'Report Fleet & Transport';
        else if (url.includes('emissionFactors')) this.pageTitle = ' Emisssion Factors ';
        else if (url.includes('generator-ec')) this.pageTitle = ' Report Power Generation ';
        else if (url.includes('citymaster')) this.pageTitle = ' Cities ';
        else if (url.includes('sitelocation')) this.pageTitle = ' Site Location ';
        else if (url.includes('generator')) this.pageTitle = ' Generators ';
        else if (url.includes('searchGenerator')) this.pageTitle = ' Search Power Generator';
        else if (url.includes('MyActionGenerator')) this.pageTitle = ' Actions Power Generator';
        else if (url.includes('MyActionVehicle')) this.pageTitle = 'Actions Fleet & Transport';
        else if (url.includes('searchVehicle')) this.pageTitle = 'Search Fleet & Transport';

        else this.pageTitle = 'Dashboard';
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

  goToDashboard() {
  this.router.navigate(['/dashboard']); // change route if needed
}
  /* Role Switch */
  onRoleChange() {
    this.authService.switchRole(this.selectedRole).subscribe({
      next: (res: any) => {
        const updatedUser = {
          name: res.userName,
          roles: res.roles,
          currentRole: res.currentRole,
          token: res.token
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('token', res.token);
   this.showProfileCard = false;

      // redirect to dashboard layout only
      this.router.navigate(['/dashboard']);      }
    });
  }

  // Menu toggles
toggleConfigMenu(menu: string) {
  this.openedConfigMenu = this.openedConfigMenu === menu ? null : menu;

  // close other menus
  this.openedMainMenu = null;

  this.openedSubMenu = null;
}
  toggleSubMenu(submenu: string) {
    this.openedSubMenu = this.openedSubMenu === submenu ? null : submenu;
  }
toggleMainMenu(menu: string) {
  this.openedMainMenu = this.openedMainMenu === menu ? null : menu;

  // close configuration menu
  this.openedConfigMenu = null;
  this.openedSubMenu = null;
}
  isConfigMenuOpen(menu: string): boolean {
    return this.openedConfigMenu === menu;
  }

  isSubMenuOpen(submenu: string): boolean {
    return this.openedSubMenu === submenu;
  }

  isMainMenuOpen(menu: string): boolean {
    return this.openedMainMenu === menu;
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