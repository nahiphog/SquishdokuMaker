import './style.css';

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
  return !board[row].some((cell) => cell === value) && !board.some((line) => line[col] === value) && regions[row][col].every((region) => (regionCells.get(region) ?? []).every(([r, c]) => (r === row && c === col) || board[r][c] !== value));
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
const buildButton = document.querySelector<HTMLButtonElement>('#build-toggle')!;
const clearButton = document.querySelector<HTMLButtonElement>('#clear-highlights')!;
const status = document.querySelector<HTMLParagraphElement>('#build-status')!;
const cells: HTMLDivElement[] = [];
let isBuilding = false;
let attempts = 0;

for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) {
  const cell = document.createElement('div'); cell.className = 'cell custom-cell';
  if (row === 2 || row === 4) cell.classList.add('seam-row'); if (col === 2 || col === 4) cell.classList.add('seam-column');
  cell.setAttribute('role', 'button'); cell.setAttribute('tabindex', '0'); cell.setAttribute('aria-pressed', 'false'); cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);
  const toggle = (): void => { if (isBuilding) return; const selected = cell.classList.toggle('highlighted'); cell.setAttribute('aria-pressed', String(selected)); cell.textContent = ''; };
  cell.addEventListener('click', toggle); cell.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } });
  cells.push(cell); grid.append(cell);
}
function showPuzzle(solution: Board, selected: Set<number>): void { cells.forEach((cell, index) => { cell.textContent = selected.has(index) ? String(solution[Math.floor(index / 7)][index % 7]) : ''; }); }
function stopBuilding(): void { isBuilding = false; buildButton.textContent = 'Build now'; status.textContent = `Stopped after ${attempts} attempt${attempts === 1 ? '' : 's'}.`; }
function buildBatch(selected: Set<number>): void {
  if (!isBuilding) return;
  for (let run = 0; run < 3 && isBuilding; run++) {
    attempts++; const solution = Array.from({ length: 7 }, () => Array<number>(7).fill(0)); solve(solution);
    const puzzle = solution.map((row, r) => row.map((value, c) => selected.has(r * 7 + c) ? value : 0));
    if (countSolutions(puzzle, 2) === 1) { showPuzzle(solution, selected); isBuilding = false; buildButton.textContent = 'Build now'; status.textContent = `Found a unique puzzle in ${attempts} attempt${attempts === 1 ? '' : 's'}.`; return; }
  }
  status.textContent = `Building… ${attempts} attempt${attempts === 1 ? '' : 's'} checked.`; window.setTimeout(() => buildBatch(selected), 0);
}
buildButton.addEventListener('click', () => {
  if (isBuilding) { stopBuilding(); return; }
  const selected = new Set(cells.flatMap((cell, index) => cell.classList.contains('highlighted') ? [index] : []));
  if (!selected.size) { status.textContent = 'Highlight at least one cell before building.'; return; }
  isBuilding = true; attempts = 0; buildButton.textContent = 'Stop building'; status.textContent = 'Building…'; buildBatch(selected);
});
clearButton.addEventListener('click', () => {
  if (isBuilding) return;
  cells.forEach((cell) => { cell.classList.remove('highlighted'); cell.setAttribute('aria-pressed', 'false'); cell.textContent = ''; });
  status.textContent = 'All highlights removed.';
});
