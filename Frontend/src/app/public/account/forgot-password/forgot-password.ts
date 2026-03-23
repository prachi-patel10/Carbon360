import { ChangeDetectorRef, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LoginService } from '../login/login-service';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css']
})
export class ForgotPasswordComponent {

 
  form: FormGroup = new FormGroup({
    Email: new FormControl('', [Validators.required, Validators.email])
  });

  message = '';
  error = '';
  loading = false;

  constructor(
    private loginService: LoginService,
    private cdr: ChangeDetectorRef
  ) { }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.message = '';

    const email = this.form.value.Email;

    this.loginService.forgotPassword(email).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.message = `Reset link sent to ${email}. Please check your inbox.`;
        this.form.reset();
        this.cdr.detectChanges();      // ✅ instant UI update
      },
      error: (err: any) => {
        this.loading = false;

        if (err.error?.message) {
          this.error = err.error.message;
        } else if (typeof err.error === 'string') {
          this.error = err.error;
        } else if (err.message) {
          this.error = err.message;
        } else {
          this.error = 'Something went wrong. Try again.';
        }

        this.cdr.detectChanges();      // ✅ instant UI update
      }
    });
  }

  resetForm() {
    this.error = '';
    this.message = '';
    this.loading = false;
    this.form.reset();
    this.cdr.detectChanges();
  }
}