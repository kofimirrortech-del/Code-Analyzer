import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api.js';
import { Calendar, Package, Wheat, Factory, Archive, Truck } from 'lucide-react';

function Section({ title, icon: Icon, color, children }) {
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Icon size={16} color={color} />
        <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function EmptyRow({ cols }) {
  return <tr><td colSpan={cols} style={{ textAlign: 'center', color: '#4a5568', padding: '1.5rem' }}>No records</td></tr>;
}

export default function History() {
  const [selected, setSelected] = useState('');
  const { data: dates = [], isLoading: datesLoading } = useQuery({ queryKey: ['history-dates'], queryFn: () => api.get('/history/dates') });
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['history-summary', selected],
    queryFn: () => api.get(`/history/summary?date=${selected}`),
    enabled: !!selected,
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">History</h1>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Calendar size={18} color="#f59e0b" />
          <label style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Select a date to view records:</label>
          {datesLoading ? <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : (
            <select className="input" style={{ width: 'auto' }} value={selected} onChange={e => setSelected(e.target.value)}>
              <option value="">-- Pick a date --</option>
              {dates.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          {dates.length === 0 && !datesLoading && <span style={{ color: '#4a5568', fontSize: '0.875rem' }}>No history yet</span>}
        </div>
      </div>

      {!selected && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#4a5568' }}>
          <Calendar size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p>Select a date above to view the day's records</p>
        </div>
      )}

      {selected && summaryLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>}

      {summary && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Inventory', value: summary.stats.totalInventory.toFixed(1) },
              { label: 'Total Produced', value: summary.stats.totalProduced.toFixed(1) },
              { label: 'Total Orders', value: summary.stats.totalOrders },
              { label: 'Revenue', value: `₵${summary.stats.totalRevenue.toFixed(2)}` },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.25rem' }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <Section title="Store" icon={Package} color="#f59e0b">
            <div className="table-wrap"><table>
              <thead><tr>{['Item','Qty','Added Stock','Unit','Supplier'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{summary.store.length === 0 ? <EmptyRow cols={5} /> : summary.store.map(r => <tr key={r.id}><td style={{ color: '#fff' }}>{r.itemName}</td><td>{r.quantity}</td><td>{r.addedStock}</td><td>{r.unit}</td><td>{r.supplier}</td></tr>)}</tbody>
            </table></div>
          </Section>

          <Section title="Ingredients" icon={Wheat} color="#8b5cf6">
            <div className="table-wrap"><table>
              <thead><tr>{['Name','Stock','Unit'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{summary.ingredients.length === 0 ? <EmptyRow cols={3} /> : summary.ingredients.map(r => <tr key={r.id}><td style={{ color: '#fff' }}>{r.name}</td><td>{r.stock}</td><td>{r.unit}</td></tr>)}</tbody>
            </table></div>
          </Section>

          <Section title="Production" icon={Factory} color="#3b82f6">
            <div className="table-wrap"><table>
              <thead><tr>{['Product','Qty','Unit','Baker','Note'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{summary.production.length === 0 ? <EmptyRow cols={5} /> : summary.production.map(r => <tr key={r.id}><td style={{ color: '#fff' }}>{r.product}</td><td>{r.quantityProduced}</td><td>{r.unit}</td><td>{r.baker}</td><td style={{ color: '#64748b' }}>{r.note || '—'}</td></tr>)}</tbody>
            </table></div>
          </Section>

          <Section title="Packaging" icon={Archive} color="#ec4899">
            <div className="table-wrap"><table>
              <thead><tr>{['Type','Stock','Added','Supply','Closing'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{summary.packages.length === 0 ? <EmptyRow cols={5} /> : summary.packages.map(r => <tr key={r.id}><td style={{ color: '#fff' }}>{r.packageType}</td><td>{r.stock}</td><td>{r.addedStock}</td><td>{r.supply}</td><td>{r.closingStock}</td></tr>)}</tbody>
            </table></div>
          </Section>

          <Section title="Dispatch / Orders" icon={Truck} color="#10b981">
            <div className="table-wrap"><table>
              <thead><tr>{['Item','Qty','Unit Cost','Total','Notes'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{summary.orders.length === 0 ? <EmptyRow cols={5} /> : summary.orders.map(r => <tr key={r.id}><td style={{ color: '#fff' }}>{r.item}</td><td>{r.quantity}</td><td>₵{r.unitCost.toFixed(2)}</td><td><span className="badge badge-green">₵{r.total.toFixed(2)}</span></td><td style={{ color: '#64748b' }}>{r.notes || '—'}</td></tr>)}</tbody>
            </table></div>
          </Section>
        </div>
      )}
    </div>
  );
}
