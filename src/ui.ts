// Pequenos utilitários de interface (sem framework).
import { sfx } from './audio';

type Attrs = Record<string, string | number | boolean | ((e: any) => void) | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K, attrs: Attrs = {}, ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export function button(label: string | Node, onClick: () => void, cls = 'btn'): HTMLButtonElement {
  return h('button', { class: cls, onclick: () => { sfx.tap(); onClick(); } }, label);
}

let toastTimer = 0;
export function toast(msg: string) {
  let t = document.getElementById('toast');
  if (!t) { t = h('div', { id: 'toast' }); document.body.append(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t!.classList.remove('show'), 2400);
}

export interface ModalOpts { title?: string; body: Node | string; actions?: { label: string; primary?: boolean; onClick?: () => void }[]; dismissable?: boolean }

export function modal(opts: ModalOpts): () => void {
  const back = h('div', { class: 'modal-back' });
  const close = () => { back.classList.add('out'); setTimeout(() => back.remove(), 200); modalStack.pop(); };
  const box = h('div', { class: 'modal' },
    opts.title ? h('h2', {}, opts.title) : null,
    typeof opts.body === 'string' ? h('p', {}, opts.body) : opts.body,
    h('div', { class: 'modal-actions' }, ...(opts.actions ?? [{ label: 'Ok', primary: true }]).map((a) =>
      button(a.label, () => { close(); a.onClick?.(); }, a.primary ? 'btn primary' : 'btn ghost'))),
  );
  back.append(box);
  if (opts.dismissable !== false) back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.body.append(back);
  modalStack.push(close);
  return close;
}

export const modalStack: (() => void)[] = [];

export function confirmBox(title: string, text: string, yes: string, onYes: () => void, no = 'Cancelar') {
  modal({ title, body: text, actions: [{ label: no }, { label: yes, primary: true, onClick: onYes }] });
}

/** Chuva de confetes para comemorações. */
export function confetti(n = 80) {
  const layer = h('div', { class: 'confetti' });
  const colors = ['#e0567f', '#f3d97a', '#9fe0c4', '#b7a3e0', '#ff7a1a', '#1f3fbf'];
  for (let i = 0; i < n; i++) {
    const p = h('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.8 + 's';
    p.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    layer.append(p);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 4200);
}

export function lockBadge(level: number) { return `🔒 Nível ${level + 1}`; }
