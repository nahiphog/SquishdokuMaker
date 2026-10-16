import './style.css';
import { getWalkthroughRating, mountWalkthrough } from './walkthrough';
import { respectsSetTuples } from './set-tuples';

type Board = number[][];

const regions: number[][][] = [
  [[1], [1], [1, 2], [2], [2, 3], [3], [3]],
  [[1], [1], [1, 2], [2], [2, 3], [3], [3]],
  [[1, 4], [1, 4], [1, 2, 4, 5], [2, 5], [2, 3, 5, 6], [3, 6], [3, 6]],
  [[4], [4], [4, 5], [5], [5, 6], [6], [6]],
  [[4, 7], [4, 7], [4, 5, 7, 8], [5, 8], [5, 6, 8, 9], [6, 9], [6, 9]],
  [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
  [[7], [7], [7, 8], [8], [8, 9], [9], [9]],
];

const regionCells = new Map<number, Array<[number, number]>>();
regions.forEach((row, r) => row.forEach((cellRegions, c) => {
  cellRegions.forEach((region) => {
    const cells = regionCells.get(region) ?? [];
    cells.push([r, c]);
    regionCells.set(region, cells);
  });
}));

const shuffled = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

function isValid(board: Board, row: number, col: number, value: number): boolean {
  if (board[row].some((cell) => cell === value)) return false;
  if (board.some((line) => line[col] === value)) return false;
  return regions[row][col].every((region) =>
    (regionCells.get(region) ?? []).every(([r, c]) => (r === row && c === col) || board[r][c] !== value),
  ) && respectsSetTuples(board, row, col, value);
}

function candidates(board: Board, row: number, col: number): number[] {
  return Array.from({ length: 9 }, (_, index) => index + 1).filter((value) => isValid(board, row, col, value));
}

function nextCell(board: Board): [number, number, number[]] | null {
  let best: [number, number, number[]] | null = null;
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      if (board[row][col] !== 0) continue;
      const options = candidates(board, row, col);
      if (options.length === 0) return [row, col, []];
      if (!best || options.length < best[2].length) best = [row, col, options];
    }
  }
  return best;
}

function solve(board: Board): boolean {
  const cell = nextCell(board);
  if (!cell) return true;
  const [row, col, options] = cell;
  for (const value of shuffled(options)) {
    board[row][col] = value;
    if (solve(board)) return true;
    board[row][col] = 0;
  }
  return false;
}

function generateBoard(): Board {
  const board = Array.from({ length: 7 }, () => Array<number>(7).fill(0));
  if (!solve(board)) throw new Error('Unable to create a Squishdoku grid.');
  return board;
}

function countSolutions(board: Board, limit = 2): number {
  let count = 0;
  const search = (): void => {
    if (count >= limit) return;
    const cell = nextCell(board);
    if (!cell) {
      count++;
      return;
    }
    const [row, col, options] = cell;
    for (const value of options) {
      board[row][col] = value;
      search();
      board[row][col] = 0;
      if (count >= limit) return;
    }
  };
  search();
  return count;
}

function digSingle(solution: Board): Board {
  const puzzle = solution.map((row) => [...row]);
  const cells = shuffled(Array.from({ length: 49 }, (_, index) => [Math.floor(index / 7), index % 7] as [number, number]));
  for (const [row, col] of cells) {
    const clue = puzzle[row][col];
    puzzle[row][col] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[row][col] = clue;
  }
  return puzzle;
}

function digDual(solution: Board): Board {
  const puzzle = solution.map((row) => [...row]);
  const visited = new Set<string>();
  const cells = shuffled(Array.from({ length: 49 }, (_, index) => [Math.floor(index / 7), index % 7] as [number, number]));
  for (const [row, col] of cells) {
    const pairedRow = 6 - row; const pairedCol = 6 - col;
    const key = [[row, col], [pairedRow, pairedCol]].map(([r, c]) => `${r}:${c}`).sort().join('|');
    if (visited.has(key) || (row === pairedRow && col === pairedCol)) continue;
    visited.add(key);
    const first = puzzle[row][col]; const second = puzzle[pairedRow][pairedCol];
    puzzle[row][col] = 0; puzzle[pairedRow][pairedCol] = 0;
    if (countSolutions(puzzle, 2) !== 1) { puzzle[row][col] = first; puzzle[pairedRow][pairedCol] = second; }
  }
  return puzzle;
}

const solutionGrid = document.querySelector<HTMLDivElement>('#solution-grid')!;
const puzzleGrid = document.querySelector<HTMLDivElement>('#puzzle-grid')!;
const generateButton = document.querySelector<HTMLButtonElement>('#generate')!;
const diggingMethod = document.querySelector<HTMLSelectElement>('#digging-method')!;
const givensCount = document.querySelector<HTMLParagraphElement>('#givens-count')!;
const generateRating = document.querySelector<HTMLParagraphElement>('#generate-rating')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const walkthrough = document.querySelector<HTMLElement>('#generate-walkthrough')!;
const exportButtons = document.querySelectorAll<HTMLButtonElement>('[data-export]');
let currentSolution: Board | null = null;
let currentPuzzle: Board | null = null;

function render(grid: HTMLDivElement, board: Board, givens?: Board): void {
  grid.replaceChildren();
  board.forEach((row, rowIndex) => row.forEach((value, colIndex) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    if (rowIndex === 2 || rowIndex === 4) cell.classList.add('seam-row');
    if (colIndex === 2 || colIndex === 4) cell.classList.add('seam-column');
    if (value === 0) cell.classList.add('empty');
    else if (givens?.[rowIndex][colIndex]) cell.classList.add('given-cell');
    else if (givens) cell.classList.add('solved-cell');
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `Row ${rowIndex + 1}, column ${colIndex + 1}: ${value || 'empty'}`);
    cell.textContent = value ? String(value) : '';
    grid.append(cell);
  }));
}

function downloadGridImage(board: Board, filename: string, givens?: Board): void {
  const canvas = document.createElement('canvas');
  canvas.width = 700; canvas.height = 700;
  const context = canvas.getContext('2d')!;
  const inset = 14; const cell = 96; const gridSize = cell * 7;
  context.fillStyle = '#fffdf8'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#fffdf8'; context.fillRect(inset, inset, gridSize, gridSize);
  context.strokeStyle = '#263d58'; context.lineWidth = 1;
  for (let index = 1; index < 7; index++) {
    context.beginPath(); context.moveTo(inset + index * cell, inset); context.lineTo(inset + index * cell, inset + gridSize); context.stroke();
    context.beginPath(); context.moveTo(inset, inset + index * cell); context.lineTo(inset + gridSize, inset + index * cell); context.stroke();
  }
  context.lineWidth = 4; context.strokeRect(inset, inset, gridSize, gridSize);
  context.strokeStyle = '#d96445'; context.lineWidth = 1; context.setLineDash([4, 4]);
  [2.5, 4.5].forEach((position) => {
    context.beginPath(); context.moveTo(inset + position * cell, inset); context.lineTo(inset + position * cell, inset + gridSize); context.stroke();
    context.beginPath(); context.moveTo(inset, inset + position * cell); context.lineTo(inset + gridSize, inset + position * cell); context.stroke();
  });
  context.setLineDash([]); context.font = '600 52px Georgia'; context.textAlign = 'center'; context.textBaseline = 'middle';
  board.forEach((row, r) => row.forEach((value, c) => { if (value) { context.fillStyle = givens && !givens[r][c] ? '#1769aa' : '#111111'; context.fillText(String(value), inset + (c + .5) * cell, inset + (r + .5) * cell); } }));
  const link = document.createElement('a'); link.href = canvas.toDataURL('image/png'); link.download = filename; link.click();
}

function makeGrid(): void {
  generateButton.disabled = true;
  generateButton.classList.add('is-working');
  status.textContent = 'Generating a solution, then checking each clue…';
  requestAnimationFrame(() => {
    try {
      const startedAt = performance.now();
      const solution = generateBoard();
      const puzzle = diggingMethod.value === 'dual' ? digDual(solution) : digSingle(solution);
      const elapsed = performance.now() - startedAt;
      currentSolution = solution;
      currentPuzzle = puzzle;
      render(solutionGrid, solution, puzzle);
      render(puzzleGrid, puzzle, puzzle);
      mountWalkthrough(walkthrough, puzzle, 'Solution walkthrough', solution);
      const clues = puzzle.flat().filter(Boolean).length;
      const rating = getWalkthroughRating(puzzle, solution);
      const method = diggingMethod.value === 'dual' ? 'dual-cell' : 'single-cell';
      givensCount.textContent = `${clues} givens`;
      generateRating.textContent = rating === null ? 'Difficulty rating unavailable' : `Difficulty rating: ${rating}`;
      status.textContent = `Done in ${(elapsed / 1000).toFixed(2)}s — ${method} digging, with exactly one solution.`;
    } catch {
      status.textContent = 'That one got tangled. Please try again.';
    } finally {
      generateButton.disabled = false;
      generateButton.classList.remove('is-working');
    }
  });
}

generateButton.addEventListener('click', makeGrid);
exportButtons.forEach((button) => button.addEventListener('click', async () => {
  const board = button.dataset.export === 'solution' ? currentSolution : currentPuzzle;
  if (!board) return;
  if (button.dataset.format === 'image') {
    downloadGridImage(board, `squishdoku-${button.dataset.export}.png`, button.dataset.export === 'solution' ? currentPuzzle ?? undefined : board);
  } else {
    const text = board.flat().map((value) => value || '.').join('');
    try { await navigator.clipboard.writeText(text); status.textContent = 'Grid copied to clipboard.'; }
    catch { status.textContent = 'Clipboard access was unavailable. Please try again.'; }
  }
  button.closest('details')?.removeAttribute('open');
}));
makeGrid();
