import {
  Component, ElementRef, HostListener, ViewChild,
  signal, computed, OnInit, AfterViewInit, OnDestroy
} from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/guards/auth-service';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoaderService } from '../../core/loader/loader-service';
import { Subject } from 'rxjs';
import { VehicleCharts }   from '../vehicle-charts/vehicle-charts';
import { GeneratorCharts } from '../generator-charts/generator-charts';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, VehicleCharts, GeneratorCharts],
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Non-signal properties ─────────────────────────────────
  loggedInUser: string = '';
  roles: string[]      = [];
  selectedRole: string = '';
  sidebarOpen: boolean = true;
  pageTitle: string    = '';
  openedConfigMenu: string | null = null;
  openedSubMenu:    string | null = null;
  openedMainMenu:   string | null = null;

  @ViewChild(VehicleCharts)   vehicleChartsRef!: VehicleCharts;
  @ViewChild(GeneratorCharts) generatorChartsRef!: GeneratorCharts;

  // ── All UI state as signals ───────────────────────────────
  showProfileCard = signal(false);
  selectedYear    = signal<number>(new Date().getFullYear());
  activeTab       = signal<'vehicle' | 'generator'>('vehicle');
  showYearPicker  = signal(false);
  decadeStart     = signal<number>(
    Math.floor(new Date().getFullYear() / 12) * 12
  );

  // ── Computed ──────────────────────────────────────────────
  currentYear = computed(() => new Date().getFullYear());

  decadeYears = computed<number[]>(() => {
    const start = this.decadeStart();
    return Array.from({ length: 12 }, (_, i) => start + i);
  });

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    public router: Router,
    private route: ActivatedRoute,
    private loader: LoaderService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getLoggedInUser();
    if (!user) { this.router.navigate(['/login']); return; }

    this.loggedInUser = user.name;
    this.roles        = user.roles ?? [];
    this.selectedRole = user.currentRole ?? '';

    this.setPageTitle(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.setPageTitle(this.router.url));

    const saved = localStorage.getItem('sidebarState');
    if (saved) {
      const s = JSON.parse(saved);
      this.openedConfigMenu = s.config;
      this.openedSubMenu    = s.sub;
      this.openedMainMenu   = s.main;
    }
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Year picker ───────────────────────────────────────────
  toggleYearPicker(event: Event): void {
    event.stopPropagation();
    this.showYearPicker.update(v => !v);
  }

  selectYear(y: number): void {
    if (y > this.currentYear()) return;
    this.selectedYear.set(y);
    this.showYearPicker.set(false);
  }

  shiftDecade(dir: 1 | -1): void {
    this.decadeStart.update(s => s + dir * 12);
  }

  // ── Tab switch ────────────────────────────────────────────
  setTab(tab: 'vehicle' | 'generator'): void {
    this.activeTab.set(tab);
    setTimeout(() => {
      if (tab === 'vehicle') this.vehicleChartsRef?.refreshCharts();
      else                   this.generatorChartsRef?.refreshCharts();
    }, 0);
  }

  // ── Profile dropdown ──────────────────────────────────────
  toggleProfile(event: Event): void {
    event.stopPropagation();
    this.showProfileCard.update(v => !v);
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.showProfileCard.set(false);
    this.showYearPicker.set(false);
  }

  // ── Helpers ───────────────────────────────────────────────
  isDashboardRoot(): boolean {
    return this.router.url === '/dashboard' || this.router.url === '/dashboard/';
  }

  setPageTitle(url: string): void {
    if      (url.includes('user'))              this.pageTitle = 'User Administration';
    else if (url.includes('department'))        this.pageTitle = 'Organizational Units';
    else if (url.includes('vehiclereport'))     this.pageTitle = 'Fleet Report';
    else if (url.includes('vehiclemaster'))     this.pageTitle = 'Vehicles';
    else if (url.includes('fueltype'))          this.pageTitle = 'Fuel Management';
    else if (url.includes('vehicle'))           this.pageTitle = 'Report Fleet & Transport';
    else if (url.includes('emissionFactors'))   this.pageTitle = 'Emission Factors';
    else if (url.includes('generator-ec'))      this.pageTitle = 'Report Power Generation';
    else if (url.includes('citymaster'))        this.pageTitle = 'Cities';
    else if (url.includes('sitelocation'))      this.pageTitle = 'Site Location';
    else if (url.includes('generator'))         this.pageTitle = 'Generators';
    else if (url.includes('searchGenerator'))   this.pageTitle = 'Search Power Generator';
    else if (url.includes('MyActionGenerator')) this.pageTitle = 'Actions Power Generator';
    else if (url.includes('MyActionVehicle'))   this.pageTitle = 'Actions Fleet & Transport';
    else if (url.includes('searchVehicle'))     this.pageTitle = 'Search Fleet & Transport';
    else if (url.includes('Vehicletype'))       this.pageTitle = 'Vehicle Type';
    else                                        this.pageTitle = 'Dashboard';
  }

  goTo(path: string): void { this.router.navigate([path], { relativeTo: this.route }); }
  isActive(path: string): boolean { return this.router.url.includes(path); }

  toggleSidebar(): void { this.sidebarOpen = !this.sidebarOpen; }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goToDashboard(): void {
    this.openedConfigMenu = null;
    this.openedSubMenu    = null;
    this.openedMainMenu   = null;
    localStorage.removeItem('sidebarState');
    this.router.navigate(['/dashboard']);
  }

  onRoleChange(): void {
    this.loader.show();
    this.authService.switchRole(this.selectedRole).subscribe({
      next: (res: any) => {
        const updatedUser = { name: res.userName, roles: res.roles, currentRole: res.currentRole, token: res.token };
        localStorage.setItem('user',  JSON.stringify(updatedUser));
        localStorage.setItem('token', res.token);
        this.showProfileCard.set(false);
        this.openedConfigMenu = null;
        this.openedSubMenu    = null;
        this.openedMainMenu   = null;
        localStorage.removeItem('sidebarState');
        this.loader.hide();
        this.router.navigate(['/dashboard']);
      }
    });
  }

  toggleConfigMenu(menu: string): void {
    this.openedConfigMenu = this.openedConfigMenu === menu ? null : menu;
    this.openedMainMenu   = null;
    this.openedSubMenu    = null;
    this.saveSidebarState();
  }

  toggleSubMenu(submenu: string): void {
    this.openedSubMenu = this.openedSubMenu === submenu ? null : submenu;
    this.saveSidebarState();
  }

  toggleMainMenu(menu: string): void {
    this.openedMainMenu   = this.openedMainMenu === menu ? null : menu;
    this.openedConfigMenu = null;
    this.openedSubMenu    = null;
    this.saveSidebarState();
  }

  saveSidebarState(): void {
    localStorage.setItem('sidebarState', JSON.stringify({
      config: this.openedConfigMenu,
      sub:    this.openedSubMenu,
      main:   this.openedMainMenu
    }));
  }

  isConfigMenuOpen(menu: string): boolean  { return this.openedConfigMenu === menu; }
  isSubMenuOpen(submenu: string): boolean  { return this.openedSubMenu    === submenu; }
  isMainMenuOpen(menu: string): boolean    { return this.openedMainMenu   === menu; }
  isAdmin(): boolean     { return this.selectedRole === 'Admin'; }
  isCorporate(): boolean { return this.selectedRole === 'Corporate'; }
  isReporter(): boolean  { return this.selectedRole === 'Reporter'; }
}