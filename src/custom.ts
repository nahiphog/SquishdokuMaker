import './style.css';
import { getWalkthroughRating, mountWalkthrough } from './walkthrough';
import { respectsSetTuples } from './set-tuples';

type Board = number[][];
const regions: number[][][] = [
  [[1], [1], [1, 2], [2], [2, 3], [3], [3]], [[1], [1], [1, 2], [2], [2, 3], [3], [3]],
  [[1, 4], [1, 4], [1, 2, 4, 5], [2, 5], [2, 3, 5, 6], [3, 6], [3, 6]], [[4], [4], [4, 5], [5], [5, 6], [6], [6]],
  [[4, 7], [4, 7], [4, 5, 7, 8], [5, 8], [5, 6, 8, 9], [6, 9], [6, 9]], [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
  [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
];
const regionCells = new Map<number, Array<[number, number]>>();
regions.forEach((row, r) => row.forEach((cellRegions, c) => cellRegions.forEach((region) => {
  const cells = regionCells.get(region) ?? []; cells.push([r, c]); regionCells.set(region, cells);
})));
const shuffled = <T,>(items: T[]): T[] => { const copy = [...items]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; };
function valid(board: Board, row: number, col: number, value: number): boolean {
  return !board[row].some((cell) => cell === value) && !board.some((line) => line[col] === value) && regions[row][col].every((region) => (regionCells.get(region) ?? []).every(([r, c]) => (r === row && c === col) || board[r][c] !== value)) && respectsSetTuples(board, row, col, value);
}
function nextCell(board: Board): [number, number, number[]] | null {
  let best: [number, number, number[]] | null = null;
  for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) if (!board[row][col]) {
    const candidates = Array.from({ length: 9 }, (_, i) => i + 1).filter((value) => valid(board, row, col, value));
    if (!candidates.length) return [row, col, []];
    if (!best || candidates.length < best[2].length) best = [row, col, candidates];
  }
  return best;
}
function solve(board: Board): boolean { const cell = nextCell(board); if (!cell) return true; const [row, col, candidates] = cell; for (const value of shuffled(candidates)) { board[row][col] = value; if (solve(board)) return true; board[row][col] = 0; } return false; }
function countSolutions(board: Board, limit = 2): number { let count = 0; const search = (): void => { if (count >= limit) return; const cell = nextCell(board); if (!cell) { count++; return; } const [row, col, candidates] = cell; for (const value of candidates) { board[row][col] = value; search(); board[row][col] = 0; if (count >= limit) return; } }; search(); return count; }

const grid = document.querySelector<HTMLDivElement>('#custom-grid')!;
const builtGrid = document.querySelector<HTMLDivElement>('#built-grid')!;
const builtResult = document.querySelector<HTMLElement>('#built-result')!;
const buildButton = document.querySelector<HTMLButtonElement>('#build-now')!;
const haltButton = document.querySelector<HTMLButtonElement>('#halt-build')!;
const clearButton = document.querySelector<HTMLButtonElement>('#clear-highlights')!;
const copyButton = document.querySelector<HTMLButtonElement>('#copy-built')!;
const imageButton = document.querySelector<HTMLButtonElement>('#image-built')!;
const status = document.querySelector<HTMLParagraphElement>('#build-status')!;
const filledCount = document.querySelector<HTMLSpanElement>('#filled-count')!;
const highlightedCells = document.querySelector<HTMLParagraphElement>('#highlighted-cells')!;
const difficultyMin = document.querySelector<HTMLSelectElement>('#difficulty-min')!;
const difficultyMax = document.querySelector<HTMLSelectElement>('#difficulty-max')!;
const walkthrough = document.querySelector<HTMLElement>('#custom-walkthrough')!;
const cells: HTMLDivElement[] = [];
let isBuilding = false;
let attempts = 0;
let latestPuzzle: Board | null = null;

for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
  const cell = document.createElement('div'); cell.className = 'cell custom-cell';
  if (row === 2 || row === 4) cell.classList.add('seam-row'); if (col === 2 || col === 4) cell.classList.add('seam-column');
  cell.setAttribute('role', 'button'); cell.setAttribute('tabindex', '0'); cell.setAttribute('aria-pressed', 'false'); cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
  const toggle = (): void => { if (isBuilding) return; const selected = cell.classList.toggle('highlighted'); cell.setAttribute('aria-pressed', String(selected)); updateFilledCount(); };
  cell.addEventListener('click', toggle); cell.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } });
  cells.push(cell); grid.append(cell);
}
function updateFilledCount(): void {
  const selected = cells.flatMap((cell, index) => cell.classList.contains('highlighted') ? [index] : []);
  const count = selected.length; filledCount.textContent = `${count} cell${count === 1 ? '' : 's'} filled`;
  const coordinates = selected.map((index) => `R${Math.floor(index / 7) + 1}C${(index % 7) + 1}`);
  highlightedCells.textContent = `Highlighted cells: ${coordinates.length ? coordinates.join(', ') : 'none'}`;
}
function renderPuzzle(puzzle: Board): void {
  builtGrid.replaceChildren();
  puzzle.forEach((row, r) => row.forEach((value, c) => {
    const cell = document.createElement('div'); cell.className = 'cell';
    if (r === 2 || r === 4) cell.classList.add('seam-row'); if (c === 2 || c === 4) cell.classList.add('seam-column');
    if (!value) cell.classList.add('empty'); cell.textContent = value ? String(value) : '';
    cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}: ${value || 'empty'}`); builtGrid.append(cell);
  }));
}
function downloadGridImage(board: Board): void {
  const canvas = document.createElement('canvas'); canvas.width = 700; canvas.height = 700;
  const context = canvas.getContext('2d')!; const inset = 14; const cell = 96; const gridSize = cell * 7;
  context.fillStyle = '#fffdf8'; context.fillRect(0, 0, 700, 700); context.fillRect(inset, inset, gridSize, gridSize);
  context.strokeStyle = '#263d58'; context.lineWidth = 1;
  for (let index = 1; index < 7; index++) { context.beginPath(); context.moveTo(inset + index * cell, inset); context.lineTo(inset + index * cell, inset + gridSize); context.stroke(); context.beginPath(); context.moveTo(inset, inset + index * cell); context.lineTo(inset + gridSize, inset + index * cell); context.stroke(); }
  context.lineWidth = 4; context.strokeRect(inset, inset, gridSize, gridSize); context.strokeStyle = '#d96445'; context.lineWidth = 1; context.setLineDash([4, 4]);
  [2.5, 4.5].forEach((position) => { context.beginPath(); context.moveTo(inset + position * cell, inset); context.lineTo(inset + position * cell, inset + gridSize); context.stroke(); context.beginPath(); context.moveTo(inset, inset + position * cell); context.lineTo(inset + gridSize, inset + position * cell); context.stroke(); });
  context.setLineDash([]); context.fillStyle = '#263d58'; context.font = '600 52px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle'; board.forEach((row, r) => row.forEach((value, c) => { if (value) context.fillText(String(value), inset + (c + .5) * cell, inset + (r + .5) * cell); }));
  const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = 'squishdoku-custom-build.png'; link.click();
}
function setBuilding(building: boolean): void { isBuilding = building; buildButton.disabled = building; haltButton.disabled = !building; clearButton.disabled = building; }
function stopBuilding(): void { setBuilding(false); status.textContent = `Stopped after ${attempts} attempt${attempts === 1 ? '' : 's'}.`; }
function buildBatch(selected: Set<number>): void {
  if (!isBuilding) return;
  for (let run = 0; run < 3 && isBuilding; run++) {
    attempts++; const solution = Array.from({ length: 7 }, () => Array<number>(7).fill(0)); solve(solution);
    const puzzle = solution.map((row, r) => row.map((value, c) => selected.has(r * 7 + c) ? value : 0));
    if (countSolutions(puzzle, 2) === 1) {
      const rating = getWalkthroughRating(puzzle, solution);
      const minimum = Number(difficultyMin.value); const maximum = Number(difficultyMax.value);
      if (rating !== null && rating >= minimum && rating <= maximum) {
        latestPuzzle = puzzle; renderPuzzle(puzzle); mountWalkthrough(walkthrough, puzzle, 'Solution walkthrough', solution); builtResult.hidden = false; setBuilding(false);
        status.textContent = `Found a unique puzzle rated ${rating} in ${attempts} attempt${attempts === 1 ? '' : 's'}.`; return;
      }
    }
  }
  status.textContent = `Building… ${attempts} attempt${attempts === 1 ? '' : 's'} checked.`; window.setTimeout(() => buildBatch(selected), 0);
}
buildButton.addEventListener('click', () => {
  const selected = new Set(cells.flatMap((cell, index) => cell.classList.contains('highlighted') ? [index] : []));
  if (selected.size < 8) { status.textContent = 'Highlight at least 8 cells before building.'; return; }
  if (Number(difficultyMin.value) > Number(difficultyMax.value)) { status.textContent = 'Choose a minimum rating that is no higher than the maximum.'; return; }
  setBuilding(true); attempts = 0; status.textContent = `Building… seeking a rating from ${difficultyMin.value} to ${difficultyMax.value}.`; buildBatch(selected);
});
haltButton.addEventListener('click', stopBuilding);
clearButton.addEventListener('click', () => {
  if (isBuilding) return;
  cells.forEach((cell) => { cell.classList.remove('highlighted'); cell.setAttribute('aria-pressed', 'false'); });
  latestPuzzle = null; walkthrough.replaceChildren(); builtResult.hidden = true; updateFilledCount();
  status.textContent = 'All highlights removed.';
});
copyButton.addEventListener('click', async () => {
  if (!latestPuzzle) return;
  try { await navigator.clipboard.writeText(latestPuzzle.flat().map((value) => value || '.').join('')); status.textContent = 'Grid copied to clipboard.'; }
  catch { status.textContent = 'Clipboard access was unavailable. Please try again.'; }
  copyButton.closest('details')?.removeAttribute('open');
});
imageButton.addEventListener('click', () => { if (!latestPuzzle) return; downloadGridImage(latestPuzzle); imageButton.closest('details')?.removeAttribute('open'); });
