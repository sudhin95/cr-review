import { NgFor, NgIf, PercentPipe } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ChangeKind, DiffRow, DiffTotals } from '../../core/diff';
import { MoneyPipe } from '../../shared/money.pipe';

const KIND_LABEL: Record<ChangeKind, string> = {
  added: 'Added',
  removed: 'Removed',
  modified: 'Changed',
  unchanged: 'No change',
};

@Component({
  selector: 'app-diff-table',
  standalone: true,
  imports: [NgFor, NgIf, MoneyPipe, PercentPipe],
  template: `
    <div class="table-wrap">
      <table data-testid="diff-table">
        <caption class="visually-hidden">
          Proposed line item changes
        </caption>
        <thead>
          <tr>
            <th scope="col">Line item</th>
            <th scope="col" class="num">Quantity</th>
            <th scope="col" class="num">Unit price</th>
            <th scope="col" class="num">Line total</th>
            <th scope="col" class="num">Change</th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let row of rows; trackBy: trackBySku"
            [attr.data-kind]="row.kind"
            data-testid="diff-row"
          >
            <td>
              <span class="kind" data-testid="diff-kind">{{ kindLabel(row.kind) }}</span>
              <span class="desc">{{ row.description }}</span>
              <span class="sku">{{ row.sku }}</span>
            </td>
            <td class="num">
              <ng-container *ngIf="showsChange(row, 'quantity'); else plainQty">
                <s>{{ row.before?.quantity }}</s> {{ row.after?.quantity }}
              </ng-container>
              <ng-template #plainQty>{{ (row.after ?? row.before)?.quantity }}</ng-template>
            </td>
            <td class="num">
              <ng-container *ngIf="showsChange(row, 'unitPrice'); else plainPrice">
                <s>{{ row.before?.unitPrice | money: currency }}</s>
                {{ row.after?.unitPrice | money: currency }}
              </ng-container>
              <ng-template #plainPrice>{{
                (row.after ?? row.before)?.unitPrice | money: currency
              }}</ng-template>
            </td>
            <td class="num">
              {{
                (row.kind === 'removed' ? row.beforeTotal : row.afterTotal)
                  | money: currency
              }}
            </td>
            <td
              class="num delta"
              [class.up]="row.delta > 0"
              [class.down]="row.delta < 0"
              data-testid="diff-delta"
            >
              {{ row.delta === 0 ? '—' : (row.delta | money: currency : true) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <dl class="totals" data-testid="diff-totals">
      <div>
        <dt>Current total</dt>
        <dd data-testid="total-before">{{ totals.before | money: currency }}</dd>
      </div>
      <div>
        <dt>Proposed total</dt>
        <dd data-testid="total-after">{{ totals.after | money: currency }}</dd>
      </div>
      <div class="total-delta" [class.up]="totals.delta > 0" [class.down]="totals.delta < 0">
        <dt>Difference</dt>
        <dd>
          <span data-testid="total-delta">{{ totals.delta | money: currency : true }}</span>
          <span class="pct" *ngIf="totals.deltaPercent !== null" data-testid="total-delta-pct">
            {{ totals.deltaPercent > 0 ? '+' : ''
            }}{{ totals.deltaPercent / 100 | percent: '1.0-1' }}
          </span>
        </dd>
      </div>
    </dl>
  `,
  styles: [
    `
      .table-wrap {
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 40rem;
      }
      th,
      td {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--line);
        text-align: left;
      }
      th {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--ink-soft);
      }
      .num {
        text-align: right;
        white-space: nowrap;
      }
      tbody tr {
        box-shadow: inset 4px 0 0 transparent;
      }
      tr[data-kind='added'] {
        box-shadow: inset 4px 0 0 var(--teal);
        background: #f5fbfa;
      }
      tr[data-kind='removed'] {
        box-shadow: inset 4px 0 0 var(--crimson);
        background: #fdf6f8;
      }
      tr[data-kind='modified'] {
        box-shadow: inset 4px 0 0 var(--amber);
      }
      tr[data-kind='unchanged'] {
        color: var(--ink-soft);
      }
      tr[data-kind='removed'] .desc {
        text-decoration: line-through;
      }
      .kind {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--ink-soft);
      }
      tr[data-kind='added'] .kind {
        color: var(--teal);
      }
      tr[data-kind='removed'] .kind {
        color: var(--crimson);
      }
      tr[data-kind='modified'] .kind {
        color: var(--amber-ink);
      }
      .desc {
        font-weight: 600;
        color: var(--ink);
      }
      .sku {
        display: block;
        font-size: 0.8125rem;
        color: var(--ink-soft);
      }
      s {
        color: var(--ink-soft);
        margin-right: 0.35rem;
      }
      .up {
        color: var(--crimson);
      }
      .down {
        color: var(--teal);
      }
      .delta {
        font-weight: 600;
      }
      .totals {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
        margin: 0;
        border-top: 2px solid var(--ink);
      }
      .totals > div {
        padding: 1rem;
      }
      dt {
        font-size: 0.8125rem;
        color: var(--ink-soft);
      }
      dd {
        margin: 0.2rem 0 0;
        font-size: 1.25rem;
        font-weight: 700;
      }
      .total-delta dd {
        font-size: 1.75rem;
        letter-spacing: -0.02em;
      }
      .pct {
        font-size: 1rem;
        font-weight: 600;
        margin-left: 0.4rem;
      }
    `,
  ],
})
export class DiffTableComponent {
  @Input({ required: true }) rows!: DiffRow[];
  @Input({ required: true }) totals!: DiffTotals;
  @Input() currency = 'USD';

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
