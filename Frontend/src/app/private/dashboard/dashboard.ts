import {
  Component, ElementRef, HostListener, ViewChild,
  signal, computed, OnInit, AfterViewInit, OnDestroy
} from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/guards/auth-service';
import { filter, finalize, takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoaderService } from '../../core/loader/loader-service';
import { Subject, forkJoin } from 'rxjs';
import { VehicleCharts } from '../vehicle-charts/vehicle-charts';
import { GeneratorCharts } from '../generator-charts/generator-charts';
import { DashboardService, DashboardSummaryResponse } from './dashboard-service';

// ── Extended summary that tracks vehicle vs generator separately ──────────────
export interface SplitSummary {
  vehicle: DashboardSummaryResponse;
  generator: DashboardSummaryResponse;
}

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
  roles: string[] = [];
  selectedRole: string = '';
  sidebarOpen: boolean = true;
  pageTitle: string = '';
  openedConfigMenu: string | null = null;
  openedSubMenu: string | null = null;
  openedMainMenu: string | null = null;
  firstName: string = '';

  @ViewChild(VehicleCharts) vehicleChartsRef!: VehicleCharts;
  @ViewChild(GeneratorCharts) generatorChartsRef!: GeneratorCharts;

  // ── All UI state as signals ───────────────────────────────
  showProfileCard = signal(false);
  selectedYear = signal<number>(new Date().getFullYear());
  activeTab = signal<'vehicle' | 'generator'>('vehicle');
  showYearPicker = signal(false);
  decadeStart = signal<number>(Math.floor(new Date().getFullYear() / 12) * 12);

  // ── Split summary signals (vehicle vs generator) ─────────
  isSummaryLoading = signal(false);
  vehicleSummary = signal<DashboardSummaryResponse | null>(null);
  generatorSummary = signal<DashboardSummaryResponse | null>(null);

  // ── Active-tab computed KPIs ─────────────────────────────
  activeTabCO2e = computed(() => {
    const s = this.activeTab() === 'vehicle' ? this.vehicleSummary() : this.generatorSummary();
    return s?.totalCO2e ?? 0;
  });
  activeTabCO2 = computed(() => {
    const s = this.activeTab() === 'vehicle' ? this.vehicleSummary() : this.generatorSummary();
    return s?.totalCO2 ?? 0;
  });
  activeTabNO2 = computed(() => {
    const s = this.activeTab() === 'vehicle' ? this.vehicleSummary() : this.generatorSummary();
    return s?.totalNO2 ?? 0;
  });
  activeTabCH4 = computed(() => {
    const s = this.activeTab() === 'vehicle' ? this.vehicleSummary() : this.generatorSummary();
    return s?.totalCH4 ?? 0;
  });
  activeTabFuel = computed(() => {
    const s = this.activeTab() === 'vehicle' ? this.vehicleSummary() : this.generatorSummary();
    return s?.totalFuelConsumed ?? 0;
  });
  activeTabDistance = computed(() => this.vehicleSummary()?.totalDistanceKM ?? 0);
  activeTabPower = computed(() => this.generatorSummary()?.totalPowerOutputKWH ?? 0);

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
    private loader: LoaderService,
    private svc: DashboardService
  ) { }

  ngOnInit(): void {
    const user = this.authService.getLoggedInUser();
    if (!user) { this.router.navigate(['/login']); return; }
    // const user = JSON.parse(localStorage.getItem('user') || '{}');
  this.firstName = user.firstName || user.name || 'User';

    this.loggedInUser = user.name;
    this.roles = user.roles ?? [];
    this.selectedRole = user.currentRole ?? '';

    this.setPageTitle(this.router.url);
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.setPageTitle(this.router.url));

    const saved = localStorage.getItem('sidebarState');
    if (saved) {
      const s = JSON.parse(saved);
      this.openedConfigMenu = s.config;
      this.openedSubMenu = s.sub;
      this.openedMainMenu = s.main;
    }

    this.loadSummaries();
  }

  ngAfterViewInit(): void { }

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
    this.loadSummaries();
  }

  shiftDecade(dir: 1 | -1): void {
    this.decadeStart.update(s => s + dir * 12);
  }

  // ── Tab switch ────────────────────────────────────────────
  setTab(tab: 'vehicle' | 'generator'): void {
    this.activeTab.set(tab);
    setTimeout(() => {
      if (tab === 'vehicle') {
        this.vehicleChartsRef?.loadAll();
      } else {
        this.generatorChartsRef?.loadAll();
      }
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

  // ── Dashboard root check ──────────────────────────────────
  isDashboardRoot(): boolean {
    return this.router.url === '/dashboard' || this.router.url === '/dashboard/';
  }

  setPageTitle(url: string): void {
    if (url.includes('user')) this.pageTitle = 'User Administration';
    else if (url.includes('department')) this.pageTitle = 'Organizational Units';
    else if (url.includes('vehiclereport')) this.pageTitle = 'Fleet Report';
    else if (url.includes('vehiclemaster')) this.pageTitle = 'Vehicles';
    else if (url.includes('fueltype')) this.pageTitle = 'Fuel Management';
    else if (url.includes('vehicle')) this.pageTitle = 'Report Fleet & Transport';
    else if (url.includes('emissionFactors')) this.pageTitle = 'Emission Factors';
    else if (url.includes('generator-ec')) this.pageTitle = 'Report Power Generation';
    else if (url.includes('citymaster')) this.pageTitle = 'Cities';
    else if (url.includes('sitelocation')) this.pageTitle = 'Site Location';
    else if (url.includes('generator')) this.pageTitle = 'Generators';
    else if (url.includes('searchGenerator')) this.pageTitle = 'Search Power Generator';
    else if (url.includes('MyActionGenerator')) this.pageTitle = 'Actions Power Generator';
    else if (url.includes('MyActionVehicle')) this.pageTitle = 'Actions Fleet & Transport';
    else if (url.includes('searchVehicle')) this.pageTitle = 'Search Fleet & Transport';
    else if (url.includes('Vehicletype')) this.pageTitle = 'Vehicle Type';
    else this.pageTitle = 'Statistics';
  }

  isAnyConfigActive(): boolean {
    const url = this.router.url;
    return url.includes('/user') || url.includes('/department') ||
      url.includes('/emissionFactors') || url.includes('/fueltype') ||
      url.includes('/vehiclemaster') || url.includes('/citymaster') ||
      url.includes('/Vehicletype') || url.includes('/generator') ||
      url.includes('/sitelocation');
  }

  isAnyFleetActive(): boolean {
    const url = this.router.url;
    return url.includes('/vehicle') || url.includes('/searchVehicle') ||
      url.includes('/MyActionVehicle');
  }

  isAnyPowerActive(): boolean {
    const url = this.router.url;
    return url.includes('/generator-ec') || url.includes('/searchGenerator') ||
      url.includes('/MyActionGenerator');
  }

  getActiveConfigLabel(): string {
    const url = this.router.url;
    if (url.includes('/user')) return 'User Administration';
    if (url.includes('/department')) return 'Organizational Units';
    if (url.includes('/emissionFactors')) return 'Emission Factors';
    if (url.includes('/fueltype')) return 'Fuel Management';
    if (url.includes('/vehiclemaster')) return 'Vehicles';
    if (url.includes('/citymaster')) return 'Cities';
    if (url.includes('/Vehicletype')) return 'Vehicle Type';
    if (url.includes('/sitelocation')) return 'Site Location';
    if (url.includes('/generator')) return 'Generators';
    return 'Configuration';
  }

  getActiveFleetLabel(): string {
    const url = this.router.url;
    if (url.includes('/searchVehicle')) return 'Search';
    if (url.includes('/MyActionVehicle')) return 'My Action';
    if (url.includes('/vehicle')) return 'Report';
    return 'Fleet & Transport';
  }

  getActivePowerLabel(): string {
    const url = this.router.url;
    if (url.includes('/searchGenerator')) return 'Search';
    if (url.includes('/MyActionGenerator')) return 'My Action';
    if (url.includes('/generator-ec')) return 'Report';
    return 'Power Generation';
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
    this.openedSubMenu = null;
    this.openedMainMenu = null;
    localStorage.removeItem('sidebarState');
    this.router.navigate(['/dashboard']);
  }

  onRoleChange(): void {
    this.loader.show();
    this.authService.switchRole(this.selectedRole).subscribe({
      next: (res: any) => {
        const updatedUser = { name: res.userName, roles: res.roles, currentRole: res.currentRole, token: res.token };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('token', res.token);
        this.showProfileCard.set(false);
        this.openedConfigMenu = null;
        this.openedSubMenu = null;
        this.openedMainMenu = null;
        localStorage.removeItem('sidebarState');
        this.loader.hide();
        this.router.navigate(['/dashboard']);
      }
    });
  }

  toggleConfigMenu(menu: string): void {
    this.openedConfigMenu = this.openedConfigMenu === menu ? null : menu;
    this.openedMainMenu = null;
    this.openedSubMenu = null;
    this.saveSidebarState();
  }

  toggleSubMenu(submenu: string): void {
    this.openedSubMenu = this.openedSubMenu === submenu ? null : submenu;
    this.saveSidebarState();
  }

  toggleMainMenu(menu: string): void {
    this.openedMainMenu = this.openedMainMenu === menu ? null : menu;
    this.openedConfigMenu = null;
    this.openedSubMenu = null;
    this.saveSidebarState();
  }

  saveSidebarState(): void {
    localStorage.setItem('sidebarState', JSON.stringify({
      config: this.openedConfigMenu,
      sub: this.openedSubMenu,
      main: this.openedMainMenu
    }));
  }

  isConfigMenuOpen(menu: string): boolean { return this.openedConfigMenu === menu; }
  isSubMenuOpen(submenu: string): boolean { return this.openedSubMenu === submenu; }
  isMainMenuOpen(menu: string): boolean { return this.openedMainMenu === menu; }
  isAdmin(): boolean { return this.selectedRole === 'Admin'; }
  isCorporate(): boolean { return this.selectedRole === 'Corporate'; }
  isReporter(): boolean { return this.selectedRole === 'Reporter'; }

  formatNum(value: number): string {
    if (value == null) return '0';
    return value.toFixed(2); // shows 2 decimal places
  }


// Active check
isAnyCarbonActive(): boolean {
  return this.router.url.includes('NgoMaster') ||
         this.router.url.includes('Plantationproject') ||
         this.router.url.includes('Ngoentryform');
}

// Label for tooltip
getActiveCarbonLabel(): string {
  if (this.router.url.includes('NgoMaster')) return 'NGO Master';
  if (this.router.url.includes('Plantationproject')) return 'Plantation Project';
  if (this.router.url.includes('Ngoentryform')) return 'Report';
  return 'Carbon Offset';
}


  // ── Load split summaries (vehicle + generator separately) ────────────────────
  loadSummaries(): void {
  this.isSummaryLoading.set(true);

  // Reset to zero immediately when year changes
  this.vehicleSummary.set(null);
  this.generatorSummary.set(null);

  forkJoin({
    vehicle:   this.svc.getVehicleSummary(this.selectedYear()),
    generator: this.svc.getGeneratorSummary(this.selectedYear()),
  })
    .pipe(takeUntil(this.destroy$), finalize(() => this.isSummaryLoading.set(false)))
    .subscribe({
      next: ({ vehicle, generator }) => {
        this.vehicleSummary.set(vehicle.status && vehicle.data ? vehicle.data : {
          totalCO2e: 0, totalCO2: 0, totalNO2: 0, totalCH4: 0,
          totalFuelConsumed: 0, totalDistanceKM: 0, totalPowerOutputKWH: 0
        });
        this.generatorSummary.set(generator.status && generator.data ? generator.data : {
          totalCO2e: 0, totalCO2: 0, totalNO2: 0, totalCH4: 0,
          totalFuelConsumed: 0, totalDistanceKM: 0, totalPowerOutputKWH: 0
        });
      },
      error: () => {
        // On error also reset to zero
        const zero = {
          totalCO2e: 0, totalCO2: 0, totalNO2: 0, totalCH4: 0,
          totalFuelConsumed: 0, totalDistanceKM: 0, totalPowerOutputKWH: 0
        };
        this.vehicleSummary.set(zero);
        this.generatorSummary.set(zero);
      }
    });
}

  // ── Grid click handlers — navigate to search with query params ────────────────

  /**
   * Called by VehicleCharts when a user clicks on a grid row/cell.
   * payload can carry: year, month, fuelType, vehicleType, city, etc.
   */
  onVehicleGridClick(payload: Record<string, any>): void {
    this.router.navigate(['searchVehicle'], {
      relativeTo: this.route,
      queryParams: { year: this.selectedYear(), ...payload }
    });
  }

  /**
   * Called by GeneratorCharts when a user clicks on a grid row/cell.
   * payload can carry: year, month, generatorName, siteName, etc.
   */
  onGeneratorGridClick(payload: Record<string, any>): void {
    this.router.navigate(['searchGenerator'], {
      relativeTo: this.route,
      queryParams: { year: this.selectedYear(), ...payload }
    });
  }

  //GOV LINK
  openGovSync(): void {
  this.router.navigate(['govSync'], { relativeTo: this.route });
}
}