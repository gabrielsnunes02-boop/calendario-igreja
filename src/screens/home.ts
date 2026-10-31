// Tela inicial: nível, desafio do dia, pedido de cliente e atalhos.
import { nav, Screen } from '../nav';
import { button, h, modal } from '../ui';
import { challengeDoneToday, dailyChallenge, levelProgress, newClient, save, state } from '../game/state';
import { startSession } from '../session';
import { poseScreen } from './pose';
import { lookbookScreen } from './lookbook';
import { achievementsScreen } from './achievements';
import { showSecret } from './runway';
import { NOME_DA_MARCA, NOME_DELA } from '../config';
import { sfx } from '../audio';

function greeting() {
  const hr = new Date().getHours();
  const g = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
  return NOME_DELA ? `${g}, ${NOME_DELA}!` : `${g}, estilista!`;
}

export function homeScreen(): Screen {
  const lp = levelProgress();
  const ch = dailyChallenge();
  const done = challengeDoneToday();

  let taps = 0;
  const logo = h('div', { class: 'logo' }, h('span', { class: 'logo-mark' }, '✂︎'), h('span', {}, NOME_DA_MARCA));
  logo.addEventListener('click', () => {
    taps++;
    if (taps === 7) { taps = 0; showSecret(); }
  });

  const soundBtn = button(state.sound ? '🔊' : '🔈', () => {
    state.sound = !state.sound; save();
    soundBtn.textContent = state.sound ? '🔊' : '🔈';
  }, 'icon-btn');

  const clientCard = () => {
    const c = state.client;
    const wrap = h('div', { class: 'card client' });
    if (!c) {
      wrap.append(
        h('div', { class: 'card-kicker' }, '💼 Pedido de cliente'),
        h('p', {}, 'Tem cliente batendo na porta do ateliê…'),
        button('Atender cliente', () => { sfx.pop(); newClient(); nav.replace(homeScreen); }, 'btn ghost'),
      );
    } else {
      wrap.append(
        h('div', { class: 'card-kicker' }, '💼 Pedido de cliente · +80 XP'),
        h('h3', {}, c.name),
        h('p', {}, `Quer um look para ${c.occasion}: ${c.style}`),
        h('div', { class: 'row' },
          button('Criar look', () => {
            startSession('client', { title: c.name, text: `Look para ${c.occasion} — ${c.style}` });
            nav.push(poseScreen);
          }, 'btn primary'),
          button('Outra cliente', () => { newClient(); nav.replace(homeScreen); }, 'btn ghost small')),
      );
    }
    return wrap;
  };

  const el = h('div', { class: 'home' },
    h('header', { class: 'home-top' }, logo, soundBtn),
    h('div', { class: 'hello' }, greeting()),
    h('div', { class: 'card level', onclick: () => nav.push(achievementsScreen) },
      h('div', { class: 'level-row' }, h('b', {}, `Nível ${lp.idx + 1} · ${lp.name}`), h('small', {}, lp.next ? `${state.xp}/${lp.next} XP` : `${state.xp} XP`)),
      h('div', { class: 'xpbar' }, h('i', { style: `width:${Math.round(lp.pct * 100)}%` })),
      h('div', { class: 'level-meta' }, `👗 ${state.looks} looks · 🔥 ${state.streak} dia(s) de sequência · 🏅 ${state.achievements.length} conquistas`),
    ),
    h('div', { class: 'card challenge' + (done ? ' done' : '') },
      h('div', { class: 'card-kicker' }, done ? '✅ Desafio de hoje concluído!' : '🎯 Desafio do dia · bônus de XP'),
      h('h3', {}, ch.theme),
      h('p', {}, `Crie ${ch.piece} usando `, h('span', { class: 'cswatch', style: `background:${ch.color.hex}` }), h('b', {}, ch.color.name), '.'),
      done
        ? h('p', { class: 'muted' }, 'Volte amanhã para um novo tema e mantenha a sequência 🔥')
        : button('Aceitar desafio', () => {
          startSession('challenge', { title: 'Desafio do dia', text: `${ch.theme} — ${ch.piece} em ${ch.color.name}`, color: ch.color });
          nav.push(poseScreen);
        }, 'btn primary'),
    ),
    clientCard(),
    h('div', { class: 'grid2' },
      h('button', { class: 'tile', onclick: () => { sfx.tap(); startSession('free', null); nav.push(poseScreen); } }, h('span', {}, '✏️'), 'Croqui livre'),
      h('button', { class: 'tile', onclick: () => { sfx.tap(); nav.push(lookbookScreen); } }, h('span', {}, '📖'), 'Lookbook'),
      h('button', { class: 'tile', onclick: () => { sfx.tap(); nav.push(achievementsScreen); } }, h('span', {}, '🏅'), 'Conquistas'),
      h('button', { class: 'tile', onclick: () => { sfx.tap(); howTo(); } }, h('span', {}, '💡'), 'Como jogar'),
    ),
  );

  if (!state.seenIntro) {
    state.seenIntro = true; save();
    setTimeout(howTo, 400);
  }

  return { el };
}

export function howTo() {
  modal({
    title: `Bem-vinda ao ${NOME_DA_MARCA}! ✨`,
    body: h('ol', { class: 'howto' },
      h('li', {}, h('b', {}, 'Monte a pose: '), 'escolha o corpo e a pose do manequim 3D e gire com o dedo até achar o ângulo perfeito.'),
      h('li', {}, h('b', {}, 'Congele e desenhe: '), 'a silhueta vira base para o seu croqui. Use lápis, caneta, marcador, aquarela, tecidos e o balde de tinta. Dois dedos dão zoom.'),
      h('li', {}, h('b', {}, 'Desfile: '), 'seu look entra na passarela, o júri dá as notas e você ganha XP para subir de nível e desbloquear poses, tecidos e cenários.'),
      h('li', {}, h('b', {}, 'Volte todo dia: '), 'o desafio do dia muda a cada 24h. Mantenha a sequência 🔥'),
    ),
    actions: [{ label: 'Vamos criar!', primary: true }],
  });
}
