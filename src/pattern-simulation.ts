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
regions.forEach((row, r) => row.forEach((cellRegions, c) => cellRegions.forEach((region) => { const cells = regionCells.get(region) ?? []; cells.push([r, c]); regionCells.set(region, cells); })));
const shuffled = <T,>(items: T[]): T[] => { const copy = [...items]; for (let index = copy.length - 1; index > 0; index--) { const pick = Math.floor(Math.random() * (index + 1)); [copy[index], copy[pick]] = [copy[pick], copy[index]]; } return copy; };
function valid(board: Board, row: number, col: number, value: number): boolean { return !board[row].includes(value) && !board.some((line) => line[col] === value) && regions[row][col].every((region) => (regionCells.get(region) ?? []).every(([r, c]) => (r === row && c === col) || board[r][c] !== value)) && respectsSetTuples(board, row, col, value); }
function nextCell(board: Board): [number, number, number[]] | null { let best: [number, number, number[]] | null = null; for (let row = 0; row < 7; row++) for (let col = 0; col < 7; col++) if (!board[row][col]) { const choices = Array.from({ length: 9 }, (_, index) => index + 1).filter((value) => valid(board, row, col, value)); if (!choices.length) return [row, col, []]; if (!best || choices.length < best[2].length) best = [row, col, choices]; } return best; }
function solve(board: Board): boolean { const cell = nextCell(board); if (!cell) return true; const [row, col, choices] = cell; for (const value of shuffled(choices)) { board[row][col] = value; if (solve(board)) return true; board[row][col] = 0; } return false; }
function squishyTally(board: Board): string { const counts = Array<number>(9).fill(0); board.flat().forEach((value) => counts[value - 1]++); return counts.sort((left, right) => right - left).join(''); }

const trialsSelect = document.querySelector<HTMLSelectElement>('#pattern-trial-count')!;
const runButton = document.querySelector<HTMLButtonElement>('#run-pattern-simulation')!;
const stopButton = document.querySelector<HTMLButtonElement>('#stop-pattern-simulation')!;
const status = document.querySelector<HTMLParagraphElement>('#pattern-status')!;
const summary = document.querySelector<HTMLParagraphElement>('#pattern-summary')!;
const histogram = document.querySelector<HTMLDivElement>('#pattern-histogram')!;
let running = false, completed = 0, total = 0;
let tallies = new Map<string, number>();

function render(): void { const max = Math.max(...tallies.values(), 1); const values = [...tallies.entries()].sort(([leftTally, leftCount], [rightTally, rightCount]) => rightCount - leftCount || leftTally.localeCompare(rightTally)); histogram.replaceChildren(); values.forEach(([tally, count]) => { const row = document.createElement('div'); row.className = 'pattern-bar'; row.innerHTML = `<code>${tally}</code><div class="pattern-bar-track"><div class="pattern-bar-fill" style="width: ${Math.max(1, count / max * 100)}%"></div></div><span>${count.toLocaleString()}</span>`; histogram.append(row); }); summary.textContent = completed ? `${completed.toLocaleString()} complete grids · ${tallies.size} SquishyTally pattern${tallies.size === 1 ? '' : 's'}` : 'No grids yet'; }
function finish(message: string): void { running = false; runButton.disabled = false; stopButton.disabled = true; trialsSelect.disabled = false; status.textContent = message; }
function runBatch(): void { if (!running) return; const batchStarted = performance.now(); do { const board = Array.from({ length: 7 }, () => Array<number>(7).fill(0)); solve(board); const tally = squishyTally(board); tallies.set(tally, (tallies.get(tally) ?? 0) + 1); completed++; } while (running && completed < total && performance.now() - batchStarted < 45); render(); if (completed >= total) { finish(`Complete — ${completed.toLocaleString()} complete grids were analysed.`); return; } status.textContent = `Generating complete grids… ${completed.toLocaleString()} of ${total.toLocaleString()} analysed.`; requestAnimationFrame(runBatch); }
runButton.addEventListener('click', () => { total = Number(trialsSelect.value); completed = 0; tallies = new Map(); running = true; runButton.disabled = true; stopButton.disabled = false; trialsSelect.disabled = true; status.textContent = 'Generating complete grids…'; render(); requestAnimationFrame(runBatch); });
stopButton.addEventListener('click', () => finish(`Stopped after ${completed.toLocaleString()} complete grids.`));
