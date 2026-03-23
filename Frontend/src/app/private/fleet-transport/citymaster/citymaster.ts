// import { Component } from '@angular/core';
import { Component, OnInit, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { CityService } from './city-service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

interface City {
  cityId: string;
  cityName: string;
  stateName: string;
  shortCode?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-citymaster',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './citymaster.html',
  styleUrl: './citymaster.css',
})

export class Citymaster implements OnInit {

  cityForm!: FormGroup;
  searchForm!: FormGroup;

  cities = signal<City[]>([]);
  allCities = signal<string[]>([]);
  allShortCodes = signal<string[]>([]);
  totalRecords = signal(0);
  totalPages = signal(1);
  currentPage = signal(1);
  requestedRecords = signal(5);

  sortColumn = signal<string>('CityName');
  sortDirection = signal<'asc' | 'desc'>('asc');

onlyActive = signal<boolean | undefined>(true);
  searchText = signal('');
  refreshTrigger = signal(0);
  pageSizeOptions = [5, 10, 20];  
  pageSize = signal(5); // default 5
  filterModalOpen = signal(false);

  filter = signal({
    stateNames: [] as string[],
    cityNames: [] as string[],
    shortCodes:[] as string[]
  });

  allStates = signal<string[]>([]);

  constructor(
    private fb: FormBuilder,
    private service: CityService,
    private toastr: ToastrService
  ) {

    effect(() => {
      this.refreshTrigger();
      this.loadCities(
        this.currentPage(),
        this.pageSize(),
        //this.requestedRecords(),
        this.searchText(),
        this.onlyActive()
      );
    });
  }

  onPageSizeChange(event: any) {
  this.pageSize.set(+event.target.value);
  this.currentPage.set(1); // reset to first page
}

  ngOnInit(): void {
    this.initForms();
    this.loadAllStates();
     this.loadAllFilterData();
  }

  getSortIcon(column: string): string {
  if (this.sortColumn() !== column) return '↕';
  return this.sortDirection() === 'asc' ? '↑' : '↓';
}

  sort(column: string) {

  if (this.sortColumn() === column) {
    this.sortDirection.set(
      this.sortDirection() === 'asc' ? 'desc' : 'asc'
    );
  } else {
    this.sortColumn.set(column);
    this.sortDirection.set('asc');
  }

  this.currentPage.set(1);
  this.refreshTrigger.update(x => x + 1);
}

  toggleCity(city: string) {
  const selected = [...this.filter().cityNames];
  const index = selected.indexOf(city);

  if (index > -1) {
    selected.splice(index, 1);
  } else {
    selected.push(city);
  }

  this.filter.update(f => ({ ...f, cityNames: selected }));
}

toggleShortCode(city: string) {
  const selected = [...this.filter().shortCodes];
  const index = selected.indexOf(city);

  if (index > -1) {
    selected.splice(index, 1);
  } else {
    selected.push(city);
  }

  this.filter.update(f => ({ ...f, shortCodes: selected }));
}

isCitySelected(city: string): boolean {
  return this.filter().cityNames.includes(city);
}

isShortCodeSelected(city:string):boolean{
  return this.filter().shortCodes.includes(city);
}



  

  // ================= FORM =================

  initForms() {

    this.cityForm = this.fb.group({
      cityId: [''],
      cityName: ['', Validators.required],
      stateName: ['', Validators.required],
      shortCode: ['',Validators.required]
    });

    this.searchForm = this.fb.group({
      searchText: ['']
    });

    this.searchForm.get('searchText')?.valueChanges.subscribe(val => {
      this.searchText.set(val || '');
      this.currentPage.set(1);
    });
  }

loadCities(page: number, size: number, search: string, active?: boolean) {

  this.service.getPaged(
  page,
  size,
  search,
  active,
  this.sortColumn(),
  this.sortDirection()
).subscribe({
    next:(res:any)=>{

      const result = res.data;

      const mapped: City[] = result.data.map((c:any)=>({
        cityId:c.cityId,
        cityName:c.cityName,
        stateName:c.stateName,
        shortCode:c.shortCode,
        isActive:c.isActive
      }));
      

      let filtered = mapped;

      const selectedStates = this.filter().stateNames;
      const selectedCities = this.filter().cityNames;

      if (selectedStates.length > 0) {
        filtered = filtered.filter(c =>
          selectedStates.includes(c.stateName)
        );
      }

      if (selectedCities.length > 0) {
        filtered = filtered.filter(c =>
          selectedCities.includes(c.cityName)
        );
      }

      //this.cities.set(filtered);
      this.cities.set(filtered);
      // this.totalRecords.set(filtered.length);
      // this.totalPages.set(Math.ceil(filtered.length / size) || 1);

      this.totalRecords.set(result.totalRecords);
      this.totalPages.set(result.totalPages);

      // // ✅ SET DATA
      // this.cities.set(mapped);

      // this.totalRecords.set(result.totalRecords);
      // this.totalPages.set(result.totalPages);

      // ✅ FIXED UNIQUE STATE EXTRACTION
      // const uniqueStates: string[] = Array.from(
      //   new Set(mapped.map((c: City) => c.stateName))
      // );

      // this.allStates.set(uniqueStates);
    },
    error:()=>this.toastr.error('Failed to load cities')
  });
}

onActiveFilterChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  this.onlyActive.set(checked ? true : false);  // true=active, false=inactive
  this.currentPage.set(1);
  this.refreshTrigger.update(x => x + 1);
}

openFilterModal() {
  this.filterModalOpen.set(true);
}

closeFilterModal() {
  this.filterModalOpen.set(false);
}

toggleState(state: string) {
  const selected = [...this.filter().stateNames];
  const index = selected.indexOf(state);

  if (index > -1) {
    selected.splice(index, 1);
  } else {
    selected.push(state);
  }

  this.filter.update(f => ({ ...f, stateNames: selected }));
}

isStateSelected(state: string): boolean {
  return this.filter().stateNames.includes(state);
}

applyFilter() {
  this.currentPage.set(1);
  this.refreshTrigger.update(x => x + 1);
  this.closeFilterModal();
}

resetFilter() {
  this.filter.set({
    stateNames: [],
    cityNames: [],
    shortCodes:[]
  });

  this.refreshTrigger.update(x => x + 1);
}

loadAllFilterData() {
  this.service.getAll().subscribe({
    next: (res: any) => {

      const cities = res.data || res;

      const uniqueStates: string[] = Array.from(
        new Set(cities.map((c: any) => c.stateName))
      );

      const uniqueCities: string[] = Array.from(
        new Set(cities.map((c: any) => c.cityName))
      );

      const uniqueShortCodes:string[] = Array.from(
        new Set(cities.map((c:any) => c.shortCode))
      )

      this.allStates.set(uniqueStates);
      this.allCities.set(uniqueCities);
      this.allShortCodes.set(uniqueShortCodes);
    },
    error: () => {
      this.toastr.error('Failed to load filter data');
    }
  });
}

  // ================= CREATE / UPDATE =================

  submit() {

    if (this.cityForm.invalid) return;

    const data = this.cityForm.value;
    const isCreate = !data.cityId;

    const obs = isCreate
      ? this.service.create(data)
      : this.service.update(data);

    obs.subscribe({
      next: () => {

        this.toastr.success(
          isCreate ? 'City created successfully'
                   : 'City updated successfully'
        );

        this.refreshTrigger.update(v=>v+1);
        this.resetForm();
      },
      error:()=>this.toastr.error('Save failed')
    });
  }

  // ================= EDIT =================

  edit(c:City){
    this.cityForm.patchValue(c);
  }

  // ================= DELETE =================

  deleteUI(c:City){

    Swal.fire({
      title:'Are you sure?',
      icon:'warning',
      showCancelButton:true
    }).then(result=>{
      if(result.isConfirmed){

        this.service.delete(c.cityId).subscribe(()=>{
          this.refreshTrigger.update(v=>v+1);
          Swal.fire('Deleted!','','success');
        });
      }
    });
  }

  // ================= TOGGLE =================

  toggleActive(c:City){

    this.service.toggleActive(c.cityId).subscribe(()=>{
      this.refreshTrigger.update(v=>v+1);
    });
  }

  // ================= PAGINATION =================

  previousPage(){
    if(this.currentPage()>1)
      this.currentPage.set(this.currentPage()-1);
  }

  nextPage(){
    if(this.currentPage()<this.totalPages())
      this.currentPage.set(this.currentPage()+1);
  }

  // ================= RESET =================

  resetForm(){
    this.cityForm.reset({
      cityId:'',
      cityName:'',
      stateName:'',
      pincode:''
    });
  }

 get startRecord(){
  if(this.totalRecords()===0) return 0;
  return (this.currentPage()-1)*this.pageSize()+1;
}

get endRecord(){
  const end=this.currentPage()*this.pageSize();
  return end>this.totalRecords()?this.totalRecords():end;
}

loadAllStates() {
  this.service.getAll().subscribe({
    next: (res: any) => {

      const cities = res.data || res;  // depends on your API structure

      const uniqueStates: string[] = Array.from(
        new Set(cities.map((c: any) => c.stateName))
      );

      this.allStates.set(uniqueStates);
    },
    error: () => {
      this.toastr.error('Failed to load states');
    }
  });
}

}

