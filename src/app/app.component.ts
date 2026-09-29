import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CurrentUserService } from './core/current-user.service';
import { APPROVE_POLICY } from './core/permissions';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, FormsModule, AsyncPipe, NgIf, NgFor],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  constructor(readonly userService: CurrentUserService) {}

  roleOf(user: any): string {
    return user.policies.includes(APPROVE_POLICY) ? 'approver' : 'read-only';
  }
}
