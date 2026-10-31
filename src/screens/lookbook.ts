// Lookbook: galeria de todos os looks criados.
import { nav, Screen } from '../nav';
import { button, confirmBox, h, modal, toast } from '../ui';
import { Look, allLooks, deleteLook } from '../db';
import { shareImage } from '../platform';
import { runwayScreen } from './runway';

export function lookbookScreen(): Screen {
  const grid = h('div', { class: 'look-grid' });
  const urls: string[] = [];
  const url = (b: Blob) => { const u = URL.createObjectURL(b); urls.push(u); return u; };

  const el = h('div', { class: 'lookbook' },
    h('header', { class: 'topbar' },
      button('←', () => nav.back(), 'icon-btn'),
      h('div', { class: 'topbar-title' }, 'Lookbook'),
      h('span', { class: 'icon-btn ghost' }),
    ),
    grid,
  );

  async function load() {
    const looks = await allLooks().catch(() => [] as Look[]);
    grid.innerHTML = '';
    if (!looks.length) {
      grid.append(h('div', { class: 'empty' }, h('div', { class: 'big-emoji' }, '👗'), h('p', {}, 'Seu lookbook ainda está vazio. Crie seu primeiro croqui!')));
      return;
    }
    for (const l of looks) {
      const card = h('button', { class: 'look' },
        h('img', { src: url(l.image), alt: l.name, loading: 'lazy' }),
        h('div', { class: 'look-cap' }, h('b', {}, l.name), h('small', {}, '★'.repeat(Math.round(l.stars / 3)))));
      card.addEventListener('click', () => open(l));
      grid.append(card);
    }
  }

  function open(l: Look) {
    const date = new Date(l.created).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    modal({
      title: l.name,
      body: h('div', { class: 'look-detail' },
        h('img', { src: url(l.image), alt: l.name }),
        h('p', { class: 'muted' }, `${date} · ${l.stars}/15 ★`),
        h('p', {}, l.subtitle),
        h('div', { class: 'row' },
          button('💃 Desfilar', () => replay(l), 'btn ghost small'),
          button('📤 Compartilhar', () => shareImage(l.image, l.name), 'btn ghost small'),
          button('🗑️', () => confirmBox('Excluir look?', `“${l.name}” vai sumir do lookbook.`, 'Excluir', async () => { await deleteLook(l.id); toast('Look excluído'); load(); }), 'btn ghost small danger'),
        )),
      actions: [{ label: 'Fechar', primary: true }],
    });
  }

  async function replay(l: Look) {
    document.querySelector<HTMLElement>('.modal-back')?.click();
    const img = await createImageBitmap(l.sprite);
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d')!.drawImage(img, 0, 0);
    nav.push(() => runwayScreen({ name: l.name, sprite: c, replay: true }));
  }

  load();
  return { el, destroy() { urls.forEach((u) => URL.revokeObjectURL(u)); } };
}
