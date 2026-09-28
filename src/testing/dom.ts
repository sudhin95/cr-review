import { ComponentFixture } from '@angular/core/testing';

export const byTestId = (fixture: ComponentFixture<unknown>, id: string): HTMLElement | null =>
  fixture.nativeElement.querySelector(`[data-testid="${id}"]`);

export const allByTestId = (fixture: ComponentFixture<unknown>, id: string): HTMLElement[] =>
  Array.from(fixture.nativeElement.querySelectorAll(`[data-testid="${id}"]`));

export const text = (el: Element | null): string =>
  (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

export function click(fixture: ComponentFixture<unknown>, id: string): void {
  const el = byTestId(fixture, id);
  if (!el) throw new Error(`No element with data-testid="${id}"`);
  el.click();
  fixture.detectChanges();
}
