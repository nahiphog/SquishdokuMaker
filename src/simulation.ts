import './style.css';
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
function valid(board: Board, row: number, col: number, value: number): boolean { return !board[row].some((cell) => cell === value) && !board.some((line) => line[col] === value) && regions[row][col].every((region) => (regionCells.get(region) ?? []).every(([r, c]) => (r === row && c === col) || board[r][c] !== value)) && respectsSetTuples(board, row, col, value); }
function nextCell(board: Board): [number, number, number[]] | null { let best: [number, number, number[]] | null = null; for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (!board[r][c]) { const options = Array.from({ length: 9 }, (_, i) => i + 1).filter((value) => valid(board, r, c, value)); if (!options.length) return [r, c, []]; if (!best || options.length < best[2].length) best = [r, c, options]; } return best; }
function solve(board: Board): boolean { const cell = nextCell(board); if (!cell) return true; const [r, c, options] = cell; for (const value of shuffled(options)) { board[r][c] = value; if (solve(board)) return true; board[r][c] = 0; } return false; }
function countSolutions(board: Board, limit = 2): number { let count = 0; const search = (): void => { if (count >= limit) return; const cell = nextCell(board); if (!cell) { count++; return; } const [r, c, options] = cell; for (const value of options) { board[r][c] = value; search(); board[r][c] = 0; if (count >= limit) return; } }; search(); return count; }
function finalGrid(): Board { const solution = Array.from({ length: 7 }, () => Array<number>(7).fill(0)); solve(solution); const puzzle = solution.map((row) => [...row]); for (const [r, c] of shuffled(Array.from({ length: 49 }, (_, i) => [Math.floor(i / 7), i % 7] as [number, number]))) { const value = puzzle[r][c]; puzzle[r][c] = 0; if (countSolutions(puzzle) !== 1) puzzle[r][c] = value; } return puzzle; }

const trialsSelect = document.querySelector<HTMLSelectElement>('#trial-count')!;
const givenCellSelect = document.querySelector<HTMLSelectElement>('#given-cell-limit')!;
const runButton = document.querySelector<HTMLButtonElement>('#run-simulation')!;
const stopButton = document.querySelector<HTMLButtonElement>('#stop-simulation')!;
const status = document.querySelector<HTMLParagraphElement>('#simulation-status')!;
const histogram = document.querySelector<HTMLDivElement>('#histogram')!;
const samples = document.querySelector<HTMLDivElement>('#sample-grids')!;
const summary = document.querySelector<HTMLParagraphElement>('#tally-summary')!;
let running = false, completed = 0, qualifying = 0, total = 0, givenCellLimit = 10;
let tallies = new Map<number, number>();
let latest: Board[] = [];

function renderGrid(board: Board, number: number): HTMLElement { const card = document.createElement('article'); card.className = 'sample-grid-card'; card.innerHTML = `<div class="sample-topline"><span>Final grid ${number}</span><span>${board.flat().filter(Boolean).length} clues</span></div>`; const grid = document.createElement('div'); grid.className = 'grid mini-grid'; board.forEach((row, r) => row.forEach((value, c) => { const cell = document.createElement('div'); cell.className = 'cell'; if (r === 2 || r === 4) cell.classList.add('seam-row'); if (c === 2 || c === 4) cell.classList.add('seam-column'); if (value) cell.classList.add('given-cell'); cell.textContent = value ? String(value) : ''; grid.append(cell); })); const copy = document.createElement('button'); copy.type = 'button'; copy.className = 'sample-copy-button'; copy.textContent = 'Copy string'; copy.setAttribute('aria-label', `Copy final grid ${number} as a 49-character string`); copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(board.flat().map((value) => value || '.').join('')); status.textContent = `Final grid ${number} copied as a 49-character string.`; } catch { status.textContent = 'Clipboard access was unavailable. Please try again.'; } }); card.append(grid, copy); return card; }
function renderResults(): void { const max = Math.max(...tallies.values(), 1); histogram.replaceChildren(); [...tallies.entries()].sort(([a], [b]) => a - b).forEach(([tally, count]) => { const bar = document.createElement('div'); bar.className = 'histogram-bar'; bar.style.setProperty('--bar-height', `${Math.max(7, (count / max) * 100)}%`); bar.innerHTML = `<span class="bar-count">${count}</span><div class="bar-fill" title="${tally} clues: ${count} grids"></div><span class="bar-label">${tally}</span>`; histogram.append(bar); }); const generated = [...tallies.values()].reduce((sum, count) => sum + count, 0); const mean = generated ? [...tallies.entries()].reduce((sum, [tally, count]) => sum + tally * count, 0) / generated : 0; summary.textContent = generated ? `${generated.toLocaleString()} generated grids · mean ${mean.toFixed(1)} clues` : 'No grids yet'; samples.replaceChildren(...latest.map((board, index) => renderGrid(board, qualifying - index))); }
function finish(message: string): void { running = false; runButton.disabled = false; stopButton.disabled = true; trialsSelect.disabled = false; givenCellSelect.disabled = false; status.textContent = message; }
function runBatch(): void { if (!running) return; const started = performance.now(); do { const board = finalGrid(); const tally = board.flat().filter(Boolean).length; tallies.set(tally, (tallies.get(tally) ?? 0) + 1); if (tally <= givenCellLimit) { latest.unshift(board); latest = latest.slice(0, 11); qualifying++; } completed++; } while (running && completed < total && performance.now() - started < 45); renderResults(); if (completed >= total) { finish(`Complete — ${qualifying.toLocaleString()} of ${completed.toLocaleString()} final grids met the ${givenCellLimit}-given-cell cap.`); return; } status.textContent = `Generating final grids… ${completed.toLocaleString()} of ${total.toLocaleString()} tested; ${qualifying.toLocaleString()} qualify.`; requestAnimationFrame(runBatch); }
runButton.addEventListener('click', () => { total = Number(trialsSelect.value); givenCellLimit = Number(givenCellSelect.value); completed = 0; qualifying = 0; tallies = new Map(); latest = []; running = true; runButton.disabled = true; stopButton.disabled = false; trialsSelect.disabled = true; givenCellSelect.disabled = true; status.textContent = `Generating only grids with at most ${givenCellLimit} given cells…`; renderResults(); requestAnimationFrame(runBatch); });
stopButton.addEventListener('click', () => finish(`Stopped after ${completed.toLocaleString()} trials; ${qualifying.toLocaleString()} grids qualified.`));
