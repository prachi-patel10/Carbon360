import { Component } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-unauthorized',
  imports: [],
  templateUrl: './unauthorized.html',
  styleUrl: './unauthorized.css',
})
export class Unauthorized {
constructor(private router: Router) {}

  ngOnInit(): void {

    Swal.fire({
      icon: "error",
      title: "Unauthorized Access!",
      text: "You do not have permission to view this page.",
      confirmButtonText: "Back to Login",
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/login']);
      }
    });

  }
}
