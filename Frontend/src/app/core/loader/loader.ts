import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../loader/loader-service';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
 template: `
  <div class="loader-overlay" *ngIf="loader.loading$ | async">
      <div class="eco-loader">

        <!-- Glowing Ring -->
        <div class="ring"></div>

        <!-- Animated Leaf SVG -->
        <svg class="leaf" viewBox="0 0 64 64">
          <path d="M32 2C20 14 12 26 12 38c0 14 10 24 20 24s20-10 20-24C52 26 44 14 32 2z"
                fill="#2ecc71"/>
        </svg>

      </div>
    </div>
  `,
  styles: [`
    .loader-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 20, 15, 0.65);
      backdrop-filter: blur(8px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .eco-loader {
      position: relative;
      width: 140px;
      height: 140px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    /* Rotating Ring */
    .ring {
      position: absolute;
      width: 140px;
      height: 140px;
      border-radius: 50%;
      border: 4px solid transparent;
      border-top: 4px solid #2ecc71;
      border-right: 4px solid #27ae60;
      animation: spin 1.4s linear infinite;
      box-shadow: 0 0 25px #2ecc71;
    }

    /* Leaf */
    .leaf {
      width: 70px;
      height: 70px;
      animation: float 2s ease-in-out infinite;
      filter: drop-shadow(0 0 15px #2ecc71);
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    @keyframes float {
      0%,100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-8px) scale(1.05); }
    }
  `]
})
export class LoaderComponent {

  constructor(public loader: LoaderService) {}

}