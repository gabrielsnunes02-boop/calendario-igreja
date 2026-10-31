// Navegação simples entre telas, com suporte ao botão voltar do Android.
import { modalStack } from './ui';
import { exitApp, onBackButton } from './platform';

export interface Screen {
  el: HTMLElement;
  destroy?(): void;
  /** Retorne true se a tela tratou o "voltar" sozinha. */
  back?(): boolean;
}

type Factory = () => Screen;

const stack: Factory[] = [];
let current: Screen | null = null;
const root = () => document.getElementById('app')!;

function mount(f: Factory) {
  current?.destroy?.();
  root().innerHTML = '';
  current = f();
  current.el.classList.add('screen', 'enter');
  root().append(current.el);
  requestAnimationFrame(() => current?.el.classList.remove('enter'));
}

export const nav = {
  push(f: Factory) { stack.push(f); mount(f); },
  replace(f: Factory) { stack.pop(); stack.push(f); mount(f); },
  reset(f: Factory) { stack.length = 0; stack.push(f); mount(f); },
  pop() {
    if (stack.length <= 1) { exitApp(); return; }
    stack.pop();
    mount(stack[stack.length - 1]);
  },
  /** Volta respeitando modais abertos e a tela atual. */
  back() {
    if (modalStack.length) { modalStack[modalStack.length - 1](); return; }
    if (current?.back?.()) return;
    nav.pop();
  },
};

onBackButton(() => nav.back());
