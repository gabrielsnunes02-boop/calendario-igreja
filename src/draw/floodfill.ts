// Balde de tinta: preenche áreas fechadas pelos traços (tolerante a pequenas falhas).

export function floodMask(
  composite: ImageData, sx: number, sy: number, gapClose = 2, grow = 3,
): { mask: Uint8Array; minX: number; minY: number; maxX: number; maxY: number } | null {
  const { width: W, height: H, data } = composite;
  sx = Math.floor(sx); sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return null;
  const N = W * H;

  // 1) Paredes = pixels "pintados" com cor diferente da cor do ponto tocado
  const si = (sy * W + sx) * 4;
  const sr = data[si], sg = data[si + 1], sb = data[si + 2], sa = data[si + 3];
  const wall = new Uint8Array(N);
  for (let i = 0, p = 0; i < N; i++, p += 4) {
    const a = data[p + 3];
    const diff = Math.abs(data[p] - sr) + Math.abs(data[p + 1] - sg) + Math.abs(data[p + 2] - sb) + Math.abs(a - sa) * 1.5;
    wall[i] = diff > 90 ? 1 : 0;
  }
  // 2) Engrossa as paredes para fechar pequenas falhas no traço
  let walls: Uint8Array<ArrayBufferLike> = wall;
  for (let k = 0; k < gapClose; k++) walls = dilate(walls, W, H);
  if (walls[sy * W + sx]) walls = wall; // tocou bem perto de um traço

  // 3) Preenchimento por varredura
  const mask = new Uint8Array(N);
  const stack = [sx, sy];
  let minX = sx, maxX = sx, minY = sy, maxY = sy;
  while (stack.length) {
    const y = stack.pop()!, x0 = stack.pop()!;
    let x = x0;
    let i = y * W + x;
    while (x >= 0 && !walls[i] && !mask[i]) { x--; i--; }
    x++; i++;
    let up = false, down = false;
    while (x < W && !walls[i] && !mask[i]) {
      mask[i] = 1;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (y > 0) {
        const u = i - W;
        if (!walls[u] && !mask[u]) { if (!up) { stack.push(x, y - 1); up = true; } } else up = false;
      }
      if (y < H - 1) {
        const d = i + W;
        if (!walls[d] && !mask[d]) { if (!down) { stack.push(x, y + 1); down = true; } } else down = false;
      }
      x++; i++;
    }
  }
  // 4) Cresce um pouco para entrar por baixo do traço
  let out: Uint8Array<ArrayBufferLike> = mask;
  for (let k = 0; k < gapClose + grow; k++) out = dilate(out, W, H);
  const pad = gapClose + grow;
  return {
    mask: out,
    minX: Math.max(0, minX - pad), minY: Math.max(0, minY - pad),
    maxX: Math.min(W - 1, maxX + pad), maxY: Math.min(H - 1, maxY + pad),
  };
}

function dilate(m: Uint8Array<ArrayBufferLike>, W: number, H: number): Uint8Array<ArrayBufferLike> {
  const o = new Uint8Array(m.length);
  for (let y = 0; y < H; y++) {
    const row = y * W;
    for (let x = 0; x < W; x++) {
      const i = row + x;
      if (m[i] || (x > 0 && m[i - 1]) || (x < W - 1 && m[i + 1]) || (y > 0 && m[i - W]) || (y < H - 1 && m[i + W])) o[i] = 1;
    }
  }
  return o;
}
