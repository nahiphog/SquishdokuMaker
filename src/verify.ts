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
function parsePuzzle(): Board | null {
  const supplied = stringInput.value.trim();
  const characters = supplied ? [...supplied] : inputs.map((input) => input.value || '.');
  if (characters.length !== 49 || characters.some((character) => !/[1-9.]/.test(character))) return null;
  return Array.from({ length: 7 }, (_, row) => characters.slice(row * 7, row * 7 + 7).map((character) => character === '.' ? 0 : Number(character)));
}
function renderGrid(board: Board, givens: Board, alternate?: Board): HTMLElement {
  const grid = document.createElement('div'); grid.className = 'grid verify-grid';
  board.forEach((row, r) => row.forEach((value, c) => { const cell = document.createElement('div'); cell.className = 'cell'; if (r === 2 || r === 4) cell.classList.add('seam-row'); if (c === 2 || c === 4) cell.classList.add('seam-column'); if (givens[r][c]) cell.classList.add('given-cell'); else cell.classList.add('solved-cell'); if (alternate && value !== alternate[r][c]) cell.classList.add('diff'); cell.textContent = String(value); grid.append(cell); }));
  return grid;
}
function card(title: string, board: Board, givens: Board, alternate?: Board): HTMLElement { const section = document.createElement('section'); section.className = 'puzzle-card verify-card'; section.innerHTML = `<div class="card-topline"><span>${title}</span><span>${alternate ? 'Differences in orange' : 'Unique'}</span></div>`; section.append(renderGrid(board, givens, alternate)); return section; }
verifyButton.addEventListener('click', () => {
  const puzzle = parsePuzzle(); results.replaceChildren();
  if (!puzzle) { status.textContent = 'Use exactly 49 characters (1–9 or .), or fill the 49 cells.'; return; }
  verifyButton.disabled = true; status.textContent = 'Checking solutions…';
  requestAnimationFrame(() => {
    const solutions = findSolutions(puzzle);
    verifyButton.disabled = false;
    if (!solutions.length) { status.textContent = 'This puzzle has no solution.'; return; }
    if (solutions.length === 1) { status.textContent = 'This puzzle has exactly one solution.'; const uniqueCard = card('Completed grid', solutions[0], puzzle); const walkthrough = document.createElement('div'); walkthrough.className = 'walkthrough-host'; uniqueCard.append(walkthrough); mountWalkthrough(walkthrough, puzzle, 'Solution walkthrough', solutions[0]); results.append(uniqueCard); return; }
    status.textContent = 'This puzzle does not have a unique solution. Two solutions are shown.';
    const first = card('Solution 1', solutions[0], puzzle, solutions[1]); const walkthrough = document.createElement('div'); walkthrough.className = 'walkthrough-host'; first.append(walkthrough); mountWalkthrough(walkthrough, puzzle, 'Walkthrough for solution 1', solutions[0]); results.append(first, card('Solution 2', solutions[1], puzzle, solutions[0]));
  });
});
