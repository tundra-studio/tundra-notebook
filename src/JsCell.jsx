import { createSignal } from "solid-js";

export default function JsCell({ cell, updateCell, runCell, addCell, deleteCell, menuOpenId, setMenuOpenId }) {
  const [isFocused, setIsFocused] = createSignal(false);
  const menuOpen = () => menuOpenId() === cell.id;
  let textareaRef = null;
  let lastCursor = null;

  return (
    <div class="block" style="position: relative; padding: 0; margin: 0.5rem 0;">
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
                  onClick={() => { updateCell(cell.id, 'type', 'markdown'); setMenuOpenId(null); }}>
                  <iconify-icon icon="solar:document-text-linear" width="16" height="16" style="margin-right: 0.5rem;"></iconify-icon>
                  Convertir en Markdown
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
          <div style="flex: 1; padding: 0.5rem;">
            <div class="field has-addons" style="margin-bottom: 0.5rem;">
              <div class="control" style="flex: 1;">
                <textarea
                  ref={el => {
                    textareaRef = el;
                    if (el) {
                      console.log('[JsCell] textareaRef set', el);
                    }
                  }}
                  data-cell-id={cell.id}
                  class="textarea"
                  style={`font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 1rem; line-height: 1.5; border: none; box-shadow: none; resize: vertical; min-height: 2.5rem; width: 100%; ${isFocused() ? 'border-left: 3px solid #3273dc;' : 'border-left: 3px solid transparent;'} padding: 0.75rem; background: #fafafa; border-radius: 4px;`}
                  rows={Math.max(3, cell.code.split("\n").length)}
                  placeholder="// JavaScript code..."
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => { setIsFocused(false); runCell(cell); }}
                  value={cell.code}
                  onInput={e => {
                    lastCursor = [e.target.selectionStart, e.target.selectionEnd];
                    console.log('[JsCell] onInput', { lastCursor, value: e.currentTarget.value });
                    updateCell(cell.id, 'code', e.currentTarget.value);
                    queueMicrotask(() => {
                      if (textareaRef && lastCursor) {
                        textareaRef.focus();
                        textareaRef.selectionStart = lastCursor[0];
                        textareaRef.selectionEnd = lastCursor[1];
                        console.log('[JsCell] Restored cursor after input', { selectionStart: textareaRef.selectionStart, selectionEnd: textareaRef.selectionEnd, active: document.activeElement === textareaRef });
                      } else {
                        console.warn('[JsCell] textareaRef or lastCursor missing after input', { textareaRef, lastCursor });
                      }
                    });
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Tab') {
                      e.preventDefault();
                      const textarea = e.target;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const value = textarea.value;
                      const newValue = value.substring(0, start) + '  ' + value.substring(end);
                      lastCursor = [start + 2, start + 2];
                      console.log('[JsCell] onKeyDown Tab', { start, end, lastCursor, newValue });
                      updateCell(cell.id, 'code', newValue);
                      queueMicrotask(() => {
                        if (textareaRef && lastCursor) {
                          textareaRef.focus();
                          textareaRef.selectionStart = lastCursor[0];
                          textareaRef.selectionEnd = lastCursor[1];
                          console.log('[JsCell] Restored cursor after Tab', { selectionStart: textareaRef.selectionStart, selectionEnd: textareaRef.selectionEnd, active: document.activeElement === textareaRef });
                        } else {
                          console.warn('[JsCell] textareaRef or lastCursor missing after Tab', { textareaRef, lastCursor });
                        }
                      });
                    } else if (e.key === 'Enter' && e.shiftKey) {
                      e.preventDefault();
                      runCell(cell);
                    } else if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      runCell(cell, { moveToNext: true });
                    }
                  }}
                />

              </div>
            </div>
            {/* Output area */}
            <div class="content" style="min-height: 1rem; padding: 0.5rem; background: white; border-radius: 4px; border: 1px solid #f0f0f0;">
              <div id={`output-${cell.id}`} style="font-size: 0.9rem; line-height: 1.4;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}