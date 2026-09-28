import { Pipe, PipeTransform } from '@angular/core';

/** Formats an amount in major units (e.g. dollars). `signed` always shows + or − for deltas. */
@Pipe({ name: 'money', standalone: true })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined, currency = 'USD', signed = false): string {
    if (amount === null || amount === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      signDisplay: signed ? 'exceptZero' : 'auto',
    }).format(amount);
  }
}
