import { createSignal, createEffect } from "solid-js";
import { renderMarkdown } from "./Notebook";

export default function MarkdownCell({ cell, updateCell, addCell, deleteCell, menuOpenId, setMenuOpenId }) {
  const [isFocused, setIsFocused] = createSignal(false);
  let outputRef;
  const menuOpen = () => menuOpenId() === cell.id;

  // Render markdown when code changes
  createEffect(() => {
    if (outputRef && cell.code) {
      try {
        const html = renderMarkdown(cell.code);
        outputRef.innerHTML = html;
      } catch (error) {
        outputRef.innerHTML = `<span style="color: red;">Markdown Error: ${error.message}</span>`;
      }
    } else if (outputRef) {
      outputRef.innerHTML = '';
    }
  });

  return (
    <div class="block" style="position: relative; padding: 0; margin: 0.5rem 0;">
      {/* Main cell container */}
      <div class="box" style="border: 1px solid #e8e8e8; border-radius: 8px; padding: 0; margin: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: box-shadow 0.2s;"
        onMouseEnter={e => e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"}
        onMouseLeave={e => e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)"}
      >
        <div class="is-flex" style="align-items: stretch; gap: 0;">
          {/* Left sidebar with drag handle */}
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-width: 35px; padding: 0.5rem 0.2rem; background: #fafafa; border-radius: 8px 0 0 8px; cursor: grab; user-select: none;">
            <button
              class="button is-white is-small"
              style="border: none; background: none; padding: 0.2rem;"
              onClick={() => setMenuOpenId(menuOpen() ? null : cell.id)}
              title="Options"
            >
              <iconify-icon icon="solar:menu-dots-linear" width="16" height="16" style="color: #888;"></iconify-icon>
            </button>
            <div style="margin-top: 0.25rem; color: #ccc; font-size: 0.8rem;">⋮⋮</div>
            
            {/* Add button below icons */}
            <button
              class="button is-small is-white"
              style="border: 1px dashed #ddd; padding: 0.1rem 0.3rem; font-size: 0.7rem; margin-top: 0.5rem; opacity: 0.3; transition: opacity 0.2s;"
              onMouseEnter={e => e.target.style.opacity = "1"}
              onMouseLeave={e => e.target.style.opacity = "0.3"}
              onClick={() => addCell(cell.id)}
              title="Ajouter une cellule"
            >
              <iconify-icon icon="solar:add-circle-linear" width="12" height="12"></iconify-icon>
            </button>
            
            {menuOpen() && (
              <div class="dropdown-content" style="position: absolute; z-index: 20; left: 2.5rem; top: 0.5rem; min-width: 160px; padding: 0.5rem; background: white; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);">
                <a class="dropdown-item" style="padding: 0.5rem; border-radius: 4px; cursor: pointer;" 
                  onClick={() => { updateCell(cell.id, 'type', 'javascript'); setMenuOpenId(null); }}>
                  <iconify-icon icon="solar:code-linear" width="16" height="16" style="margin-right: 0.5rem;"></iconify-icon>
                  Convertir en JavaScript
                </a>
                <a class="dropdown-item" style="padding: 0.5rem; border-radius: 4px; cursor: pointer;" 
                  onClick={() => { addCell(cell.id, cell.type); setMenuOpenId(null); }}>
                  <iconify-icon icon="solar:copy-linear" width="16" height="16" style="margin-right: 0.5rem;"></iconify-icon>
                  Dupliquer
                </a>
                <hr class="dropdown-divider" style="margin: 0.25rem 0;" />
                <a class="dropdown-item has-text-danger" style="padding: 0.5rem; border-radius: 4px; cursor: pointer;" 
                  onClick={() => { deleteCell(cell.id); setMenuOpenId(null); }}>
                  <iconify-icon icon="solar:trash-bin-trash-linear" width="16" height="16" style="margin-right: 0.5rem;"></iconify-icon>
                  Supprimer
                </a>
              </div>
            )}
          </div>
          
          {/* Main content area */}
          <div style="flex: 1; padding: 0.75rem;">
            <div class="field" style="margin-bottom: 0.5rem;">
              <div class="control" style="width: 100%;">
                <textarea
                  data-cell-id={cell.id}
                  class="textarea"
                  style={`font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 0.95rem; line-height: 1.6; border: none; box-shadow: none; resize: vertical; min-height: 2.5rem; width: 100%; ${isFocused() ? 'border-left: 3px solid #ff3860;' : 'border-left: 3px solid transparent;'} padding: 0.75rem; background: #fafafa; border-radius: 4px;`}
                  rows={Math.max(3, cell.code.split("\n").length)}
                  placeholder="# Markdown\n\nÉcrivez en markdown... Utilisez $..$ pour les maths inline et $$..$$ pour les équations."
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  value={cell.code}
                  onInput={e => updateCell(cell.id, 'code', e.currentTarget.value)}
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const start = e.target.selectionStart;
                      const end = e.target.selectionEnd;
                      const value = e.target.value;
                      e.target.value = value.substring(0, start) + '  ' + value.substring(end);
                      e.target.selectionStart = e.target.selectionEnd = start + 2;
                      updateCell(cell.id, 'code', e.target.value);
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Rendered output */}
            <div class="content" style="min-height: 1rem; padding: 0.75rem; background: white; border-radius: 4px; border: 1px solid #f0f0f0;">
              <div ref={el => (outputRef = el)} style="font-size: 0.95rem; line-height: 1.6;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}