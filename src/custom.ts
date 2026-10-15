import './style.css';

const grid = document.querySelector<HTMLDivElement>('#custom-grid')!;

for (let row = 0; row < 7; row++) {
  for (let col = 0; col < 7; col++) {
    const cell = document.createElement('div');
    cell.className = 'cell custom-cell';
    if (row === 2 || row === 4) cell.classList.add('seam-row');
    if (col === 2 || col === 4) cell.classList.add('seam-column');
    cell.setAttribute('role', 'button');
    cell.setAttribute('tabindex', '0');
    cell.setAttribute('aria-pressed', 'false');
    cell.setAttribute('aria-label', `Row ${row + 1}, column ${col + 1}`);

    const toggle = (): void => {
      const selected = cell.classList.toggle('highlighted');
      cell.setAttribute('aria-pressed', String(selected));
    };
    cell.addEventListener('click', toggle);
    cell.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
    grid.append(cell);
  }
}
