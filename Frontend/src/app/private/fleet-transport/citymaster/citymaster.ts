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
  pincode?: string;
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
  totalRecords = signal(0);
  totalPages = signal(1);
  currentPage = signal(1);
  requestedRecords = signal(5);

  onlyActive = signal(false);
  searchText = signal('');
  refreshTrigger = signal(0);

  constructor(
    private fb: FormBuilder,
    private service: CityService,
    private toastr: ToastrService
  ) {

    effect(() => {
      this.loadCities(
        this.currentPage(),
        this.requestedRecords(),
        this.searchText(),
        this.onlyActive()
      );
    });
  }

  ngOnInit(): void {
    this.initForms();
  }

  // ================= FORM =================

  initForms() {

    this.cityForm = this.fb.group({
      cityId: [''],
      cityName: ['', Validators.required],
      stateName: ['', Validators.required],
      pincode: ['']
    });

    this.searchForm = this.fb.group({
      searchText: ['']
    });

    this.searchForm.get('searchText')?.valueChanges.subscribe(val => {
      this.searchText.set(val || '');
      this.currentPage.set(1);
    });
  }

  // ================= LOAD =================

  loadCities(page:number,size:number,search:string,active:boolean) {

    this.service.getPaged(page,size,search,active).subscribe({
      next:(res:any)=>{

        const result = res.data;

        const mapped = result.data.map((c:any)=>({
          cityId:c.cityId,
          cityName:c.cityName,
          stateName:c.stateName,
          pincode:c.pincode,
          isActive:c.isActive
        }));

        this.cities.set(mapped);
        this.totalRecords.set(result.totalRecords);
        this.totalPages.set(result.totalPages);
      },
      error:()=>this.toastr.error('Failed to load cities')
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
    return (this.currentPage()-1)*this.requestedRecords()+1;
  }

  get endRecord(){
    const end=this.currentPage()*this.requestedRecords();
    return end>this.totalRecords()?this.totalRecords():end;
  }

}

