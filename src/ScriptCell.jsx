import { createEffect } from "solid-js";

export default function ScriptCell({ cell, updateCell, addCell, deleteCell, menuOpenId, setMenuOpenId }) {
  const menuOpen = () => menuOpenId && menuOpenId() === cell.id;

  // Charge dynamiquement le script si besoin
  createEffect(() => {
    if (!cell.code.trim()) return;
    const url = cell.code.trim();
    if (document.querySelector(`script[data-notebook-cdn='${url}']`)) return;
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.setAttribute('data-notebook-cdn', url);
    script.onload = () => { /* Optionnel: feedback */ };
    script.onerror = () => { alert('Erreur de chargement du script: ' + url); };
    document.head.appendChild(script);
  });

  return (
    <div style="position: relative; margin: 0.8em 0; display: flex; align-items: stretch; gap: 0.5em;">
      {/* Drag handle and menu */}
      <div style="display: flex; flex-direction: column; align-items: center; cursor: grab; user-select: none; min-width: 2em; padding-top: 0.2em;">
        <button
          style="border: none; background: none; font-size: 1.3em; padding: 0; margin-bottom: 0.2em; color: #888; transition: color 0.2s;"
          onClick={() => setMenuOpenId && setMenuOpenId(menuOpen() ? null : cell.id)}
          onMouseEnter={e => e.target.style.color = "#333"}
          onMouseLeave={e => e.target.style.color = "#888"}
          title="Menu"
        >⋯</button>
        <span style="font-size: 1.1em; color: #bbb; line-height: 0.5;">⋮⋮</span>
        {menuOpen() && (
          <div style="position: absolute; z-index: 10; left: 2.5em; top: 0.5em; min-width: 140px; padding: 0.5em 0.7em; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <button style="width: 100%; text-align: left; border: none; background: none; color: #222; padding: 0.4em 0; border-radius: 4px;" 
              onClick={() => { updateCell(cell.id, 'type', 'javascript'); setMenuOpenId && setMenuOpenId(null); }}
              onMouseEnter={e => e.target.style.background = "#f5f5f5"}
              onMouseLeave={e => e.target.style.background = "none"}
            >Passer en JS</button>
            <button style="width: 100%; text-align: left; border: none; background: none; color: #222; padding: 0.4em 0; border-radius: 4px;" 
              onClick={() => { deleteCell && deleteCell(cell.id); setMenuOpenId && setMenuOpenId(null); }}
              onMouseEnter={e => e.target.style.background = "#f5f5f5"}
              onMouseLeave={e => e.target.style.background = "none"}
            >🗑 Supprimer</button>
            <button style="width: 100%; text-align: left; border: none; background: none; color: #222; padding: 0.4em 0; border-radius: 4px;" 
              onClick={() => { addCell && addCell(cell.id, cell.type); setMenuOpenId && setMenuOpenId(null); }}
              onMouseEnter={e => e.target.style.background = "#f5f5f5"}
              onMouseLeave={e => e.target.style.background = "none"}
            >Dupliquer</button>
          </div>
        )}
      </div>

      {/* Cell content */}
      <div style="flex: 1; display: flex; flex-direction: column;">
        <div style="background: #f6f8fa; border: 2px dashed #6c63ff; border-radius: 8px; padding: 1em 1.2em; color: #333; font-size: 1em; display: flex; align-items: center; gap: 0.7em;">
          <span style="font-size: 1.5em; color: #6c63ff;">📦</span>
          <span style="font-weight: 500;">Charger une librairie externe (CDN JS)</span>
          <input
            type="text"
            value={cell.code}
            placeholder="https://cdn.jsdelivr.net/npm/arquero@latest"
            onInput={e => updateCell(cell.id, 'code', e.currentTarget.value)}
            style="flex: 1; margin-left: 1em; font-size: 1em; border: none; background: transparent; outline: none; color: #333;"
          />
        </div>
        
        {/* Add button below */}
        <div style="display: flex; justify-content: center; margin: 0.5em 0; opacity: 0.4; transition: opacity 0.2s;"
          onMouseEnter={e => e.target.style.opacity = "1"}
          onMouseLeave={e => e.target.style.opacity = "0.4"}
        >
          <button
            style="border: none; background: none; color: #999; font-size: 1.3em; padding: 0.2em 0.5em; border-radius: 4px; transition: background 0.2s;"
            onClick={() => addCell && addCell(cell.id)}
            onMouseEnter={e => e.target.style.background = "#f0f0f0"}
            onMouseLeave={e => e.target.style.background = "none"}
            title="Ajouter une cellule en dessous"
          >+</button>
        </div>
      </div>
    </div>
  );
}
