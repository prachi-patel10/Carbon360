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

  // Menu states
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
        else if (url.includes('role')) this.pageTitle = 'Access Control : Role Management';
        else if (url.includes('department')) this.pageTitle = 'Organizational Units : Manage Departments';
        else if (url.includes('vehiclereport')) this.pageTitle = 'Fleet Report';
        else if (url.includes('waste')) this.pageTitle = 'Waste Management';
        else if (url.includes('vehiclemaster')) this.pageTitle = 'Vehicle Master';
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
        window.location.reload();
      }
    });
  }

  // Menu toggles
  toggleConfigMenu(menu: string) {
    this.openedConfigMenu = this.openedConfigMenu === menu ? null : menu;
    this.openedSubMenu = null;
  }

  toggleSubMenu(submenu: string) {
    this.openedSubMenu = this.openedSubMenu === submenu ? null : submenu;
  }

  toggleMainMenu(menu: string) {
    this.openedMainMenu = this.openedMainMenu === menu ? null : menu;
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