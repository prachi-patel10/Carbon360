import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastService } from '../toast/toastservice';

export const authGuard: CanActivateFn = (route, state) => {
  
  const router = inject(Router);
  const token = localStorage.getItem("token");
  const toast = inject(ToastService); 

   if(token){
    return true;
   }

   
  toast.error("Please login first ");
  

  router.navigate(['/unauthorized']);
  return false;
};
