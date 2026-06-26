const app = document.getElementById('app');

function render() {
  app.innerHTML = `
    <p style="text-align:center;color:var(--color-muted)">
      Ready to track.
    </p>
    <div style="display:flex;justify-content:center;margin-top:16px">
      <button id="btn">Add Entry</button>
    </div>
  `;
}

render();
