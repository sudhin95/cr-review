import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'change-requests' },
  {
    path: 'change-requests',
    loadComponent: () => import('./features/list/cr-list.component').then((m) => m.CrListComponent),
    title: 'Change requests',
  },
  {
    path: 'change-requests/:id',
    loadComponent: () =>
      import('./features/detail/cr-detail.component').then((m) => m.CrDetailComponent),
    title: 'Review change request',
  },
  { path: '**', redirectTo: 'change-requests' },
];
