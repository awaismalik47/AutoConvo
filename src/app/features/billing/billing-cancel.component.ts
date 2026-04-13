import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-billing-cancel',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <p class="brand">AutoConvo</p>
      <h1>Checkout cancelled</h1>
      <p>No charges were made. You can try again anytime.</p>
      <a routerLink="/home">Back to dashboard</a>
    </div>
  `,
  styles: [
    `
      .wrap {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        font-family:
          'Inter',
          system-ui,
          sans-serif;
        color: #0f1117;
      }
      .brand {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #6b7280;
        margin: 0 0 0.35rem;
      }
      h1 {
        font-size: 1.25rem;
        margin: 0 0 0.5rem;
      }
      p {
        color: #6b7280;
        margin: 0 0 1rem;
        text-align: center;
        max-width: 380px;
      }
      a {
        color: #0f1117;
        font-weight: 600;
      }
    `,
  ],
})
export class BillingCancelComponent {}
