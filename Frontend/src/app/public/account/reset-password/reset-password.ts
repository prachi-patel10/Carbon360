import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoginService } from '../login/login-service';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css']
})
export class ResetPasswordComponent implements OnInit {

  form: FormGroup = new FormGroup({
    NewPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    ConfirmPassword: new FormControl('', Validators.required)
  });

  token = '';
  message = '';
  error = '';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private loginService: LoginService
  ) { }

  ngOnInit() {
    // ✅ Read token from URL: /reset-password?token=abc123
    this.token = this.route.snapshot.queryParams['token'] || '';

    if (!this.token) {
      this.error = 'Invalid or missing reset token.';
    }
  }

  get passwordMismatch() {
    return this.form.get('NewPassword')?.value !== this.form.get('ConfirmPassword')?.value;
  }

  submit() {
    if (this.form.invalid || this.passwordMismatch) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';

    this.loginService.resetPassword(this.token, this.form.value.NewPassword).subscribe({
      next: (res: any) => {
        this.message = res.message;
        this.loading = false;
        // ✅ Redirect to login after 2 seconds
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Invalid or expired link.';
        this.loading = false;
      }
    });
  }
}