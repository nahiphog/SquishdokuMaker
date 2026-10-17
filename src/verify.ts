import './style.css';
import { mountWalkthrough } from './walkthrough';
import { respectsSetTuples } from './set-tuples';

type Board = number[][];
const regions: number[][][] = [
  [[1], [1], [1, 2], [2], [2, 3], [3], [3]], [[1], [1], [1, 2], [2], [2, 3], [3], [3]],
  [[1, 4], [1, 4], [1, 2, 4, 5], [2, 5], [2, 3, 5, 6], [3, 6], [3, 6]], [[4], [4], [4, 5], [5], [5, 6], [6], [6]],
  [[4, 7], [4, 7], [4, 5, 7, 8], [5, 8], [5, 6, 8, 9], [6, 9], [6, 9]], [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
  [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
];
const regionCells = new Map<number, Array<[number, number]>>();
regions.forEach((row, r) => row.forEach((cellRegions, c) => cellRegions.forEach((region) => { const cells = regionCells.get(region) ?? []; cells.push([r, c]); regionCells.set(region, cells); })));
function valid(board: Board, row: number, col: number, value: number): boolean {
  return !board[row].some((cell) => cell === value) && !board.some((line) => line[col] === value) && regions[row][col].every((region) => (regionCells.get(region) ?? []).every(([r, c]) => (r === row && c === col) || board[r][c] !== value)) && respectsSetTuples(board, row, col, value);
}
function givenBoardIsValid(board: Board): boolean {
  for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) if (board[row][col]) { const value = board[row][col]; board[row][col] = 0; const okay = valid(board, row, col, value); board[row][col] = value; if (!okay) return false; }
  return true;
}
function nextCell(board: Board): [number, number, number[]] | null {
  let best: [number, number, number[]] | null = null;
  for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) if (!board[row][col]) {
    const candidates = Array.from({ length: 9 }, (_, index) => index + 1).filter((value) => valid(board, row, col, value));
    if (!candidates.length) return [row, col, []];
    if (!best || candidates.length < best[2].length) best = [row, col, candidates];
  }
  return best;
}
function findSolutions(board: Board, limit = 2): Board[] {
  const solutions: Board[] = [];
  const search = (): void => {
    if (solutions.length >= limit) return;
    const cell = nextCell(board);
    if (!cell) { solutions.push(board.map((row) => [...row])); return; }
    const [row, col, candidates] = cell;
    for (const value of candidates) { board[row][col] = value; search(); board[row][col] = 0; if (solutions.length >= limit) return; }
  };
  if (givenBoardIsValid(board)) search();
  return solutions;
}

const stringInput = document.querySelector<HTMLInputElement>('#puzzle-string')!;
const entryGrid = document.querySelector<HTMLDivElement>('#entry-grid')!;
const verifyButton = document.querySelector<HTMLButtonElement>('#verify-puzzle')!;
const clearInputButton = document.querySelector<HTMLButtonElement>('#clear-input')!;
const pasteClipboardButton = document.querySelector<HTMLButtonElement>('#paste-clipboard')!;
const status = document.querySelector<HTMLParagraphElement>('#verify-status')!;
const results = document.querySelector<HTMLElement>('#verify-results')!;
const inputs: HTMLInputElement[] = [];

for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
  const input = document.createElement('input'); input.className = 'entry-cell'; input.inputMode = 'numeric'; input.maxLength = 1; input.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
  if (row === 2 || row === 4) input.classList.add('seam-row'); if (col === 2 || col === 4) input.classList.add('seam-column');
  input.addEventListener('input', () => { input.value = input.value.replace(/[^1-9]/g, ''); });
  input.addEventListener('keydown', (event) => { if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); inputs[Math.min(48, inputs.indexOf(input) + (event.key === 'ArrowRight' ? 1 : 7))].focus(); } if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); inputs[Math.max(0, inputs.indexOf(input) - (event.key === 'ArrowLeft' ? 1 : 7))].focus(); } });
  inputs.push(input); entryGrid.append(input);
}
clearInputButton.addEventListener('click', () => {
  stringInput.value = '';
  inputs.forEach((input) => { input.value = ''; });
  results.replaceChildren();
  status.textContent = 'Input cleared.';
  stringInput.focus();
});
pasteClipboardButton.addEventListener('click', async () => {
  try {
    const pasted = (await navigator.clipboard.readText()).trim().replace(/\s/g, '');
    if (pasted.length !== 49 || /[^1-9.]/.test(pasted)) {
      status.textContent = 'Clipboard must contain exactly 49 characters (1–9 or .).';
      return;
    }
    stringInput.value = pasted;
    inputs.forEach((input) => { input.value = ''; });
    results.replaceChildren();
    status.textContent = 'Puzzle pasted from clipboard.';
    stringInput.focus();
  } catch {
    status.textContent = 'Clipboard access was unavailable. Please paste into the string field instead.';
  }
});
function parsePuzzle(): Board | null {
  const supplied = stringInput.value.trim();
  const characters = supplied ? [...supplied] : inputs.map((input) => input.value || '.');
  if (characters.length !== 49 || characters.some((character) => !/[1-9.]/.test(character))) return null;
  return Array.from({ length: 7 }, (_, row) => characters.slice(row * 7, row * 7 + 7).map((character) => character === '.' ? 0 : Number(character)));
}
function renderGrid(board: Board, givens: Board, alternate?: Board): HTMLElement {
  const grid = document.createElement('div'); grid.className = 'grid verify-grid';
  board.forEach((row, r) => row.forEach((value, c) => { const cell = document.createElement('div'); cell.className = 'cell'; if (r === 2 || r === 4) cell.classList.add('seam-row'); if (c === 2 || c === 4) cell.classList.add('seam-column'); if (!value) cell.classList.add('empty'); else if (givens[r][c]) cell.classList.add('given-cell'); else cell.classList.add('solved-cell'); if (alternate && value !== alternate[r][c]) cell.classList.add('diff'); cell.textContent = value ? String(value) : ''; grid.append(cell); }));
  return grid;
}
function downloadGridImage(board: Board, filename: string, givens: Board): void {
  const canvas = document.createElement('canvas'); canvas.width = 700; canvas.height = 700;
  const context = canvas.getContext('2d')!; const inset = 14; const cell = 96; const gridSize = cell * 7;
  context.fillStyle = '#fffdf8'; context.fillRect(0, 0, 700, 700); context.fillRect(inset, inset, gridSize, gridSize);
  context.strokeStyle = '#263d58'; context.lineWidth = 1;
  for (let index = 1; index < 7; index++) { context.beginPath(); context.moveTo(inset + index * cell, inset); context.lineTo(inset + index * cell, inset + gridSize); context.stroke(); context.beginPath(); context.moveTo(inset, inset + index * cell); context.lineTo(inset + gridSize, inset + index * cell); context.stroke(); }
  context.lineWidth = 4; context.strokeRect(inset, inset, gridSize, gridSize); context.strokeStyle = '#d96445'; context.lineWidth = 1; context.setLineDash([4, 4]);
  [2.5, 4.5].forEach((position) => { context.beginPath(); context.moveTo(inset + position * cell, inset); context.lineTo(inset + position * cell, inset + gridSize); context.stroke(); context.beginPath(); context.moveTo(inset, inset + position * cell); context.lineTo(inset + gridSize, inset + position * cell); context.stroke(); });
  context.setLineDash([]); context.font = '600 52px "Times New Roman"'; context.textAlign = 'center'; context.textBaseline = 'middle';
  board.forEach((row, r) => row.forEach((value, c) => { if (value) { context.fillStyle = givens[r][c] ? '#111111' : '#1769aa'; context.fillText(String(value), inset + (c + .5) * cell, inset + (r + .5) * cell); } }));
  const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = filename; link.click();
}
function exportMenu(board: Board, givens: Board, filename: string): HTMLDetailsElement {
  const menu = document.createElement('details'); menu.className = 'export-menu'; const summary = document.createElement('summary'); summary.textContent = 'Export'; const actions = document.createElement('div');
  const clipboard = document.createElement('button'); clipboard.type = 'button'; clipboard.textContent = 'Clipboard'; clipboard.addEventListener('click', async () => { try { await navigator.clipboard.writeText(board.flat().map((value) => value || '.').join('')); status.textContent = 'Grid copied to clipboard.'; } catch { status.textContent = 'Clipboard access was unavailable. Please try again.'; } menu.removeAttribute('open'); });
  const image = document.createElement('button'); image.type = 'button'; image.textContent = 'Image'; image.addEventListener('click', () => { downloadGridImage(board, filename, givens); menu.removeAttribute('open'); });
  actions.append(clipboard, image); menu.append(summary, actions); return menu;
}
function card(title: string, board: Board, givens: Board, alternate?: Board, label = 'Unique'): HTMLElement { const section = document.createElement('section'); section.className = 'puzzle-card verify-card'; const topline = document.createElement('div'); topline.className = 'card-topline'; const heading = document.createElement('span'); heading.textContent = title; const detail = document.createElement('span'); detail.textContent = alternate ? 'Differences in orange' : label; topline.append(heading, detail, exportMenu(board, givens, `squishdoku-${title.toLowerCase().replace(/ /g, '-')}.png`)); section.append(topline, renderGrid(board, givens, alternate)); return section; }
verifyButton.addEventListener('click', () => {
  const puzzle = parsePuzzle(); results.replaceChildren();
  if (!puzzle) { status.textContent = 'Use exactly 49 characters (1–9 or .), or fill the 49 cells.'; return; }
  verifyButton.disabled = true; status.textContent = 'Checking solutions…';
  requestAnimationFrame(() => {
    const solutions = findSolutions(puzzle);
    verifyButton.disabled = false;
    if (!solutions.length) { status.textContent = 'This puzzle has no solution.'; return; }
    const finalCard = card('Final grid', puzzle, puzzle, undefined, 'Puzzle');
    if (solutions.length === 1) { status.textContent = 'This puzzle has exactly one solution.'; const uniqueCard = card('Completed grid', solutions[0], puzzle); const walkthrough = document.createElement('div'); walkthrough.className = 'walkthrough-host'; results.append(finalCard, uniqueCard, walkthrough); mountWalkthrough(walkthrough, puzzle, 'Solution walkthrough', solutions[0]); return; }
    status.textContent = 'This puzzle does not have a unique solution. Two solutions are shown.';
    const first = card('Solution 1', solutions[0], puzzle, solutions[1]); const walkthrough = document.createElement('div'); walkthrough.className = 'walkthrough-host'; results.append(finalCard, first, card('Solution 2', solutions[1], puzzle, solutions[0]), walkthrough); mountWalkthrough(walkthrough, puzzle, 'Walkthrough for solution 1', solutions[0]);
  });
});
