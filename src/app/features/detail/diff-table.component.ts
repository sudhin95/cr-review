import { CurrencyPipe, NgFor, NgIf, PercentPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ChangeKind, DiffRow, DiffTotals } from '../../core/diff';

const KIND_LABEL: Record<ChangeKind, string> = {
  added: 'Added',
  removed: 'Removed',
  modified: 'Changed',
  unchanged: 'No change',
};

@Component({
  selector: 'app-diff-table',
  standalone: true,
  imports: [NgFor, NgIf, CurrencyPipe, PercentPipe],
  templateUrl: './diff-table.component.html',
  styleUrls: ['./diff-table.component.css'],
})
export class DiffTableComponent {
  @Input({ required: true }) rows!: DiffRow[];
  @Input({ required: true }) totals!: DiffTotals;
  kindLabel(kind: ChangeKind): string {
    return KIND_LABEL[kind];
  }

  showsChange(row: DiffRow, field: 'quantity' | 'unitPrice'): boolean {
    return row.kind === 'modified' && row.changedFields.includes(field);
  }

  trackBySku(_: number, row: DiffRow): string {
    return row.sku;
  }
}
