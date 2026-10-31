// Conquistas e trilha de níveis.
import { nav, Screen } from '../nav';
import { button, h } from '../ui';
import { ACHIEVEMENTS, LEVELS } from '../game/content';
import { levelIndex, state } from '../game/state';

export function achievementsScreen(): Screen {
  const lvl = levelIndex();
  const el = h('div', { class: 'achievements' },
    h('header', { class: 'topbar' },
      button('←', () => nav.back(), 'icon-btn'),
      h('div', { class: 'topbar-title' }, 'Conquistas'),
      h('span', { class: 'icon-btn ghost' }),
    ),
    h('div', { class: 'scroll' },
      h('h3', { class: 'section' }, `🏅 ${state.achievements.length}/${ACHIEVEMENTS.length} conquistas`),
      h('div', { class: 'ach-grid' }, ...ACHIEVEMENTS.map((a) => {
        const got = state.achievements.includes(a.id);
        return h('div', { class: 'ach' + (got ? ' got' : '') },
          h('div', { class: 'ach-icon' }, got ? a.icon : '❔'),
          h('b', {}, got || a.id !== 'secret' ? a.name : '???'),
          h('small', {}, a.desc));
      })),
      h('h3', { class: 'section' }, '🪜 Carreira na moda'),
      h('ol', { class: 'levels' }, ...LEVELS.map((l, i) => h('li', { class: i <= lvl ? 'got' : '' },
        h('div', {}, h('b', {}, `${i + 1}. ${l.name}`), h('small', {}, ` ${l.xp} XP`)),
        l.unlock ? h('small', { class: 'unlock' }, (i <= lvl ? '🔓 ' : '🔒 ') + l.unlock) : null))),
    ),
  );
  return { el };
}
