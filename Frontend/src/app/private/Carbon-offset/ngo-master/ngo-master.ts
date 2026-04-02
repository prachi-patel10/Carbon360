import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-ngo',
  templateUrl: './ngo-master.html',
  styleUrls: ['./ngo-master.css'],
  imports: [ ReactiveFormsModule],
})
export class NgoComponent implements OnInit {

  ngoForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.ngoForm = this.fb.group({
      ngoName: ['', Validators.required],
      contactPerson: [''],
      email: ['', Validators.email],
      phone: [''],
      location: [''],
      isActive: [true],
      entryBy: [1],
      entryDate: [new Date()],
      updateBy: [null],
      updateDate: [null]
    });
  }

  onSubmit() {
    if (this.ngoForm.invalid) {
      alert("Please fill required fields");
      return;
    }

    console.log("Form Data:", this.ngoForm.value);

    // Call API here
  }

  reset() {
    this.ngoForm.reset({
      isActive: true
    });
  }
}