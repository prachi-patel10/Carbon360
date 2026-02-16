import { Injectable } from '@angular/core';
import  Toastify from 'toastify-js';
@Injectable({
  providedIn: 'root',
})
export class ToastService {
  success(message: string) {
    Toastify({
      text: message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: {
        background: "green"
      }
    }).showToast();
  }


  error(message: string) {
    Toastify({
      text: message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: {
        background: "red"
      }
    }).showToast();
  }

  info(message: string) {
    Toastify({
      text: message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: {
        background: "blue"
      }
    }).showToast();
  }

  warning(message: string) {
    Toastify({
      text: message,
      duration: 3000,
      gravity: "top",
      position: "right",
      style: {
        background: "orange"
      }
    }).showToast();
  }
}