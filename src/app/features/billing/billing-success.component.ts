import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-billing-success',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <p class="brand">AutoConvo</p>
      <h1>Payment successful</h1>
      <p>Your subscription update is processing. You can return to AutoConvo.</p>
      <a routerLink="/home">Continue to dashboard</a>
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
        color: #16a34a;
        font-weight: 600;
      }
    `,
  ],
})
export class BillingSuccessComponent {}
