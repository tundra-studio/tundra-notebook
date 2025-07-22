import { createSignal, For, onMount, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { Runtime } from "@observablehq/runtime";
import { marked } from "marked";
import katex from "katex";

function createObservableDisplay(value) {
  const container = document.createElement('div');
  container.className = 'observable-display';
  
  if (Array.isArray(value)) {
    container.appendChild(createArrayDisplay(value));
  } else if (value && typeof value === 'object') {
    container.appendChild(createObjectDisplay(value));
  } else if (typeof value === 'string') {
    container.appendChild(createStringDisplay(value));
  } else if (typeof value === 'number') {
    container.appendChild(createNumberDisplay(value));
  } else if (typeof value === 'boolean') {
    container.appendChild(createBooleanDisplay(value));
  } else if (value === null) {
    container.appendChild(createNullDisplay());
  } else if (value === undefined) {
    container.appendChild(createUndefinedDisplay());
  } else {
    container.appendChild(createPrimitiveDisplay(value));
  }
  
  return container;
}

function createArrayDisplay(arr) {
  const wrapper = document.createElement('div');
  wrapper.className = 'array-display';
  
  const header = document.createElement('div');
  header.className = 'array-header';
  header.innerHTML = `
    <span class="expand-toggle">▶</span>
    <span class="array-type">Array</span>
    <span class="array-length">(${arr.length})</span>
    <span class="array-preview">[${arr.slice(0, 3).map(formatPreview).join(', ')}${arr.length > 3 ? ', …' : ''}]</span>
  `;
  
  const content = document.createElement('div');
  content.className = 'array-content';
  content.style.display = 'none';
  
  arr.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'array-item';
    row.innerHTML = `
      <span class="array-index">${index}:</span>
      <span class="array-value"></span>
    `;
    
    const valueSpan = row.querySelector('.array-value');
    if (typeof item === 'object' && item !== null) {
      valueSpan.appendChild(createObservableDisplay(item));
    } else {
      valueSpan.innerHTML = formatValue(item);
    }
    
    content.appendChild(row);
  });
  
  header.addEventListener('click', () => {
    const isExpanded = content.style.display !== 'none';
    content.style.display = isExpanded ? 'none' : 'block';
    header.querySelector('.expand-toggle').textContent = isExpanded ? '▶' : '▼';
  });
  
  wrapper.appendChild(header);
  wrapper.appendChild(content);
  return wrapper;
}

function createObjectDisplay(obj) {
  const wrapper = document.createElement('div');
  wrapper.className = 'object-display';

  const keys = Object.keys(obj);
  const header = document.createElement('div');
  header.className = 'object-header';
  header.innerHTML = `
    <span class="expand-toggle">▶</span>
    <span class="object-type">Object</span>
    <span class="object-keys">{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''}}</span>
  `;

  const content = document.createElement('div');
  content.className = 'object-content';
  content.style.display = 'none';

  keys.forEach(key => {
    const row = document.createElement('div');
    row.className = 'object-item';
    row.innerHTML = `
      <span class="object-key">${key}:</span>
      <span class="object-value"></span>
    `;
    const valueSpan = row.querySelector('.object-value');
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      valueSpan.appendChild(createObservableDisplay(value));
    } else {
      valueSpan.innerHTML = formatValue(value);
    }
    content.appendChild(row);
  });

  header.addEventListener('click', () => {
    const isExpanded = content.style.display !== 'none';
    content.style.display = isExpanded ? 'none' : 'block';
    header.querySelector('.expand-toggle').textContent = isExpanded ? '▶' : '▼';
  });

  wrapper.appendChild(header);
  wrapper.appendChild(content);
  return wrapper;
}

function createStringDisplay(str) {
  const span = document.createElement('span');
  span.className = 'string-value';
  span.textContent = `"${str}"`;
  return span;
}

function createNumberDisplay(num) {
  const span = document.createElement('span');
  span.className = 'number-value';
  span.textContent = num.toString();
  return span;
}

function createBooleanDisplay(bool) {
  const span = document.createElement('span');
  span.className = 'boolean-value';
  span.textContent = bool.toString();
  return span;
}

function createNullDisplay() {
  const span = document.createElement('span');
  span.className = 'null-value';
  span.textContent = 'null';
  return span;
}

function createUndefinedDisplay() {
  const span = document.createElement('span');
  span.className = 'undefined-value';
  span.textContent = 'undefined';
  return span;
}

function createPrimitiveDisplay(value) {
  const span = document.createElement('span');
  span.className = 'primitive-value';
  span.textContent = String(value);
  return span;
}

function formatPreview(item) {
  if (typeof item === 'string') return `"${item.length > 20 ? item.slice(0, 20) + '…' : item}"`;
  if (typeof item === 'object' && item !== null) {
    if (Array.isArray(item)) return `Array(${item.length})`;
    return 'Object';
  }
  return String(item);
}

function formatValue(value) {
  if (typeof value === 'string') return `<span class="string-value">"${value}"</span>`;
  if (typeof value === 'number') return `<span class="number-value">${value}</span>`;
  if (typeof value === 'boolean') return `<span class="boolean-value">${value}</span>`;
  if (value === null) return `<span class="null-value">null</span>`;
  if (value === undefined) return `<span class="undefined-value">undefined</span>`;
  return `<span class="primitive-value">${String(value)}</span>`;
}

export function renderMarkdown(content) {
  const renderer = new marked.Renderer();
  
  renderer.code = function(code, language) {
    if (language === 'math' || language === 'latex') {
      try {
        return katex.renderToString(code, { displayMode: true });
      } catch (e) {
        return `<div class="katex-error">Math rendering error: ${e.message}</div>`;
      }
    }
    return `<pre><code class="language-${language || ''}">${code}</code></pre>`;
  };

  let html = marked(content, { renderer });
  
  html = html.replace(/\$\$(.*?)\$\$/gs, (match, math) => {
    try {
      return katex.renderToString(math, { displayMode: true });
    } catch (e) {
      return `<span class="katex-error">Math error: ${e.message}</span>`;
    }
  });
  
  html = html.replace(/\$(.*?)\$/g, (match, math) => {
    try {
      return katex.renderToString(math, { displayMode: false });
    } catch (e) {
      return `<span class="katex-error">Math error: ${e.message}</span>`;
    }
  });
  
  return html;
}

function ScriptCell({ cell, updateCell, runCell, menuOpenId, setMenuOpenId }) {
  const [isFocused, setIsFocused] = createSignal(false);
  const menuOpen = () => menuOpenId() === cell.id;
  let textareaRef = null;
  let lastCursor = null;

  return (
    <div class="notebook-cell script-cell">
      <div class="cell-container">
        <div class="cell-sidebar">
          <div class="cell-type-indicator">
            <i class="fa-solid fa-scroll" style="font-size:18px; opacity:0.7;"></i>
          </div>
          <button
            class="cell-menu-btn"
            onClick={() => setMenuOpenId(menuOpen() ? null : cell.id)}
            title="Options"
          >
            <iconify-icon icon="solar:menu-dots-linear" width="16" height="16"></iconify-icon>
          </button>
          {menuOpen() && (
            <div class="cell-menu">
              <a class="menu-item has-text-danger" onClick={() => setMenuOpenId(null)}>
                <iconify-icon icon="solar:info-circle-linear" width="16" height="16"></iconify-icon>
                Script cell cannot be deleted
              </a>
            </div>
          )}
        </div>
        <div class="cell-content">
          <div class="cell-output"><div id={`output-${cell.id}`}></div></div>
          <textarea
            ref={el => { textareaRef = el; }}
            data-cell-id={cell.id}
            class={`cell-textarea auto-resize ${isFocused() ? 'focused' : ''}`}
            rows={1}
            placeholder="// Script setup code (runs first)..."
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); runCell(cell); }}
            value={cell.code}
            onInput={e => {
              lastCursor = [e.target.selectionStart, e.target.selectionEnd];
              updateCell(cell.id, 'code', e.currentTarget.value);
              // Auto-resize
              if (textareaRef) {
                textareaRef.style.height = 'auto';
                textareaRef.style.height = textareaRef.scrollHeight + 'px';
              }
              queueMicrotask(() => {
                if (textareaRef && lastCursor) {
                  textareaRef.focus();
                  textareaRef.selectionStart = lastCursor[0];
                  textareaRef.selectionEnd = lastCursor[1];
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
                updateCell(cell.id, 'code', newValue);
                queueMicrotask(() => {
                  if (textareaRef && lastCursor) {
                    textareaRef.focus();
                    textareaRef.selectionStart = lastCursor[0];
                    textareaRef.selectionEnd = lastCursor[1];
                  }
                });
              } else if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                runCell(cell);
                queueMicrotask(() => {
                  if (textareaRef) {
                    textareaRef.focus();
                  }
                });
              } else if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                runCell(cell, { moveToNext: true });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

import { highlightJS } from './highlight.js';
import { createEffect } from 'solid-js';
function JavaScriptCell({ cell, updateCell, runCell, addCell, deleteCell, menuOpenId, setMenuOpenId }) {
  const [isFocused, setIsFocused] = createSignal(false);
  const menuOpen = () => menuOpenId() === cell.id;
  let textareaRef = null;
  let overlayRef = null;
  let wrapperRef = null;
  let lastCursor = null;

  // Effect: sync heights after every code change
  createEffect(() => {
    if (textareaRef) {
      textareaRef.style.height = 'auto';
      textareaRef.style.height = textareaRef.scrollHeight + 'px';
    }
    if (overlayRef && textareaRef) {
      overlayRef.style.height = textareaRef.style.height;
      overlayRef.innerHTML = `<pre class='language-javascript' style='margin:0;padding:0;background:none;'><code class='language-javascript'>${highlightJS(cell.code || '')}</code></pre>`;
    }
    if (wrapperRef && textareaRef) {
      wrapperRef.style.height = textareaRef.scrollHeight + 'px';
    }
  });

  // Sync overlay scroll with textarea
  const syncScroll = () => {
    if (textareaRef && overlayRef) {
      overlayRef.scrollTop = textareaRef.scrollTop;
      overlayRef.scrollLeft = textareaRef.scrollLeft;
    }
  };

  return (
    <div class="notebook-cell js-cell">
      <div class="cell-container">
        <div class="cell-sidebar">
          <div class="cell-type-indicator">
            <i class="fa-brands fa-js" style="font-size:18px; color:#f7e018;"></i>
          </div>
          <button
            class="cell-menu-btn"
            onClick={() => setMenuOpenId(menuOpen() ? null : cell.id)}
            title="Options"
          >
            <iconify-icon icon="solar:menu-dots-linear" width="16" height="16"></iconify-icon>
          </button>
          <button
            class="cell-add-btn"
            onClick={() => addCell(cell.id)}
            title="Add cell below"
          >
            <iconify-icon icon="solar:add-circle-linear" width="12" height="12"></iconify-icon>
          </button>
          {menuOpen() && (
            <div class="cell-menu">
              <a class="menu-item" onClick={() => { updateCell(cell.id, 'type', 'markdown'); setMenuOpenId(null); }}>
                <iconify-icon icon="solar:document-text-linear" width="16" height="16"></iconify-icon>
                Convert to Markdown
              </a>
              <a class="menu-item" onClick={() => { addCell(cell.id, cell.type); setMenuOpenId(null); }}>
                <iconify-icon icon="solar:copy-linear" width="16" height="16"></iconify-icon>
                Duplicate
              </a>
              <hr class="menu-divider" />
              <a class="menu-item has-text-danger" onClick={() => { deleteCell(cell.id); setMenuOpenId(null); }}>
                <iconify-icon icon="solar:trash-bin-trash-linear" width="16" height="16"></iconify-icon>
                Delete
              </a>
            </div>
          )}
        </div>
        <div class="cell-content">
          <div class="cell-output"><div id={`output-${cell.id}`}></div></div>
          <div class="cell-editor-wrapper" ref={el => { wrapperRef = el; }} style="position:relative; width:100%;">
            <div class="cell-highlight-overlay" 
              ref={el => { overlayRef = el; }}
              aria-hidden="true"
              innerHTML={`<pre class='language-javascript' style='margin:0;padding:0;background:none;'><code class='language-javascript'>${highlightJS(cell.code || '')}</code></pre>`}
              style={`pointer-events:none; position:absolute; top:0; left:0; width:100%; min-height:3em; color:inherit; background:transparent; font-family:inherit; font-size:inherit; z-index:1; white-space:pre-wrap; word-break:break-word; padding:0; margin:0;`}
            />
            <textarea
              ref={el => { textareaRef = el; }}
              data-cell-id={cell.id}
              class={`cell-textarea auto-resize ${isFocused() ? 'focused' : ''}`}
              rows={1}
              placeholder="// JavaScript code..."
              style="position:relative; background:transparent; color:transparent; caret-color:#222; z-index:2; width:100%; min-height:3em; resize:none; overflow:hidden;"
              onFocus={() => setIsFocused(true)}
              onBlur={() => { setIsFocused(false); runCell(cell); }}
              value={cell.code}
              onInput={e => {
                lastCursor = [e.target.selectionStart, e.target.selectionEnd];
                updateCell(cell.id, 'code', e.currentTarget.value);
                // Auto-resize textarea and sync overlay/wrapper
                if (textareaRef) {
                  textareaRef.style.height = 'auto';
                  textareaRef.style.height = textareaRef.scrollHeight + 'px';
                  if (overlayRef) overlayRef.style.height = textareaRef.style.height;
                  if (overlayRef) overlayRef.innerHTML = `<pre class='language-javascript' style='margin:0;padding:0;background:none;'><code class='language-javascript'>${highlightJS(e.currentTarget.value)}</code></pre>`;
                  if (overlayRef && overlayRef.parentElement) overlayRef.parentElement.style.height = textareaRef.scrollHeight + 'px';
                }
                queueMicrotask(() => {
                  if (textareaRef && lastCursor) {
                    textareaRef.focus();
                    textareaRef.selectionStart = lastCursor[0];
                    textareaRef.selectionEnd = lastCursor[1];
                  }
                });
              }}
              onScroll={syncScroll}
              onKeyDown={e => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const textarea = e.target;
                  const start = textarea.selectionStart;
                  const end = textarea.selectionEnd;
                  const value = textarea.value;
                  const newValue = value.substring(0, start) + '  ' + value.substring(end);
                  lastCursor = [start + 2, start + 2];
                  updateCell(cell.id, 'code', newValue);
                  if (overlayRef && textareaRef && overlayRef.parentElement) {
                    overlayRef.style.height = textareaRef.style.height;
                    overlayRef.innerHTML = `<pre class='language-javascript' style='margin:0;padding:0;background:none;'><code class='language-javascript'>${highlightJS(newValue)}</code></pre>`;
                    overlayRef.parentElement.style.height = textareaRef.scrollHeight + 'px';
                  }
                  queueMicrotask(() => {
                    if (textareaRef && lastCursor) {
                      textareaRef.focus();
                      textareaRef.selectionStart = lastCursor[0];
                      textareaRef.selectionEnd = lastCursor[1];
                    }
                  });
                } else if (e.key === 'Enter' && e.shiftKey) {
                  e.preventDefault();
                  runCell(cell);
                  queueMicrotask(() => {
                    if (textareaRef) {
                      textareaRef.focus();
                    }
                  });
                } else if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  runCell(cell, { moveToNext: true });
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkdownCell({ cell, updateCell, addCell, deleteCell, menuOpenId, setMenuOpenId }) {
  const [isEditing, setIsEditing] = createSignal(false);
  const [isFocused, setIsFocused] = createSignal(false);
  const menuOpen = () => menuOpenId() === cell.id;
  let textareaRef = null;
  let lastCursor = null;

  return (
    <div class="notebook-cell markdown-cell">
      <div class="cell-container">
        <div class="cell-sidebar">
          <div class="cell-type-indicator">
            <i class="fa-brands fa-markdown" style="font-size:18px;"></i>
          </div>
          <button
            class="cell-menu-btn"
            onClick={() => setMenuOpenId(menuOpen() ? null : cell.id)}
            title="Options"
          >
            <iconify-icon icon="solar:menu-dots-linear" width="16" height="16"></iconify-icon>
          </button>
          <button
            class="cell-add-btn"
            onClick={() => addCell(cell.id)}
            title="Add cell below"
          >
            <iconify-icon icon="solar:add-circle-linear" width="12" height="12"></iconify-icon>
          </button>
          {menuOpen() && (
            <div class="cell-menu">
              <a class="menu-item" onClick={() => { updateCell(cell.id, 'type', 'javascript'); setMenuOpenId(null); }}>
                <iconify-icon icon="solar:code-linear" width="16" height="16"></iconify-icon>
                Convert to JavaScript
              </a>
              <a class="menu-item" onClick={() => { addCell(cell.id, cell.type); setMenuOpenId(null); }}>
                <iconify-icon icon="solar:copy-linear" width="16" height="16"></iconify-icon>
                Duplicate
              </a>
              <hr class="menu-divider" />
              <a class="menu-item has-text-danger" onClick={() => { deleteCell(cell.id); setMenuOpenId(null); }}>
                <iconify-icon icon="solar:trash-bin-trash-linear" width="16" height="16"></iconify-icon>
                Delete
              </a>
            </div>
          )}
        </div>
        <div class="cell-content">
          {isEditing() ? (
            <textarea
              ref={el => { textareaRef = el; }}
              class={`cell-textarea ${isFocused() ? 'focused' : ''}`}
              rows={Math.max(3, cell.content.split("\n").length)}
              placeholder="# Markdown content..."
              onFocus={() => setIsFocused(true)}
              onBlur={() => { setIsFocused(false); setIsEditing(false); }}
              value={cell.content}
              onInput={e => {
                lastCursor = [e.target.selectionStart, e.target.selectionEnd];
                updateCell(cell.id, 'content', e.currentTarget.value);
                queueMicrotask(() => {
                  if (textareaRef && lastCursor) {
                    textareaRef.focus();
                    textareaRef.selectionStart = lastCursor[0];
                    textareaRef.selectionEnd = lastCursor[1];
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
                  updateCell(cell.id, 'content', newValue);
                  queueMicrotask(() => {
                    if (textareaRef && lastCursor) {
                      textareaRef.focus();
                      textareaRef.selectionStart = lastCursor[0];
                      textareaRef.selectionEnd = lastCursor[1];
                    }
                  });
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsEditing(false);
                }
              }}
            />
          ) : (
            <div 
              class="markdown-output"
              onClick={() => setIsEditing(true)}
              innerHTML={renderMarkdown(cell.content || "Click to edit markdown...")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function Notebook() {
  const [cells, setCells] = createStore([
    { 
      id: 'script-1', 
      type: 'script', 
      code: `// Import Observable Plot
import("https://cdn.skypack.dev/@observablehq/plot@latest")`
    },
    { 
      id: 'js-1', 
      type: 'javascript', 
      code: `// Simple data
[
  { name: "A", value: 10 },
  { name: "B", value: 20 },
  { name: "C", value: 15 }
]`
    },
    { 
      id: 'js-2', 
      type: 'javascript', 
      code: `// Display table
{
  const data = js_1;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  return html\`<div>
    <h3>📊 Simple Data Table</h3>
    <table style="border-collapse: collapse; width: 100%;">
      <tr style="background: #f0f0f0;">
        <th style="padding: 8px; border: 1px solid #ddd;">Name</th>
        <th style="padding: 8px; border: 1px solid #ddd;">Value</th>
      </tr>
      \${data.map(d => 
        \`<tr>
          <td style="padding: 8px; border: 1px solid #ddd;">\${d.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">\${d.value}</td>
        </tr>\`
      ).join('')}
      <tr style="background: #e0e0e0; font-weight: bold;">
        <td style="padding: 8px; border: 1px solid #ddd;">Total</td>
        <td style="padding: 8px; border: 1px solid #ddd;">\${total}</td>
      </tr>
    </table>
  </div>\`;
}`
    },
    { 
      id: 'js-3', 
      type: 'javascript', 
      code: `// Observable Plot chart
{
  const Plot = script_1;
  const data = js_1;
  
  return Plot.plot({
    marks: [
      Plot.barY(data, { x: "name", y: "value", fill: "steelblue" })
    ],
    width: 400,
    height: 300
  });
}`
    },
    { 
      id: 'md-1', 
      type: 'markdown', 
      content: `# 🧮 Minimal Notebook Demo

## Features

1. **Data Table** - Simple HTML table with calculations
2. **Visualization** - Observable Plot bar chart  
3. **Math with KaTeX** - Inline: $E = mc^2$ and block:

$$\\sum_{i=1}^{n} x_i = \\frac{n(n+1)}{2}$$

## Usage

- **Shift+Enter**: Run cell, keep focus
- **Ctrl+Enter**: Run cell, move to next
- Click cells to edit them

Try editing the data in the second cell!`
    }
  ]);
  
  const [menuOpenId, setMenuOpenId] = createSignal(null);
  const [runtime, setRuntime] = createSignal(null);
  const [main, setMain] = createSignal(null);
  const [variables, setVariables] = createStore({});

  onMount(() => {
    const rt = new Runtime();
    const module = rt.module();
    setRuntime(rt);
    setMain(module);
    
    // Auto-execute all cells on load in order
    setTimeout(() => {
      const currentCells = cells;
      if (currentCells && currentCells.length > 0) {
        // Execute cells in order with delays to ensure dependencies are resolved
        currentCells.forEach((cell, index) => {
          if (cell.type === 'script' || cell.type === 'javascript') {
            setTimeout(() => {
              console.log('Auto-executing cell:', cell.id);
              runCell(cell);
            }, index * 200); // Stagger execution
          }
        });
      }
    }, 1000);
  });

  onCleanup(() => {
    if (runtime()) {
      runtime().dispose();
    }
  });

  const updateCell = (id, field, value) => {
    setCells(cell => cell.id === id, field, value);
  };

  const addCell = (afterId, type = 'javascript') => {
    const afterIndex = cells.findIndex(cell => cell.id === afterId);
    const newId = `${type}-${Date.now()}`;
    const newCell = {
      id: newId,
      type,
      [type === 'markdown' ? 'content' : 'code']: ''
    };
    
    setCells(cells => [
      ...cells.slice(0, afterIndex + 1),
      newCell,
      ...cells.slice(afterIndex + 1)
    ]);
  };

  const deleteCell = (id) => {
    const cell = cells.find(c => c.id === id);
    if (cell?.type === 'script') return;
    setCells(cells => cells.filter(cell => cell.id !== id));
  };

  const runCell = (cell, options = {}) => {
    if (!main()) return;

    const outputElement = document.getElementById(`output-${cell.id}`);
    if (!outputElement) return;

    outputElement.innerHTML = '';

    try {
      if (cell.type === 'script' || cell.type === 'javascript') {
        // Redefine existing variable or create new one
        let variable = variables[cell.id];
        if (!variable) {
          variable = main().variable({
            fulfilled: (value) => {
              if (value && typeof value.outerHTML !== 'undefined') {
                outputElement.appendChild(value);
              } else if (value !== undefined) {
                outputElement.appendChild(createObservableDisplay(value));
              }
            },
            rejected: (error) => {
              outputElement.innerHTML = `<div class="error">Error: ${error.message}</div>`;
            }
          });
          setVariables(cell.id, variable);
        }
        
        // Define dependencies based on references in the code
        const dependencies = [];
        const codeStr = cell.code;
        
        // Check for explicit cell references
        cells.forEach(otherCell => {
          if (otherCell.id !== cell.id) {
            const varName = otherCell.id.replace('-', '_');
            if (codeStr.includes(varName)) {
              dependencies.push(otherCell.id);
            }
          }
        });
        
        variable.define(cell.id, dependencies, async function(...args) {
          const html = (strings, ...values) => {
            const result = strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
            const div = document.createElement('div');
            div.innerHTML = result;
            return div.children.length === 1 ? div.firstChild : div;
          };
          
          // Create scope with dependencies and make them available by name
          const scope = { html };
          
          // Map each dependency to its value
          dependencies.forEach((depId, index) => {
            const varName = depId.replace('-', '_');
            scope[varName] = args[index];
            console.log(`Setting ${varName} =`, args[index]);
          });
          
          console.log('Cell', cell.id, 'scope:', Object.keys(scope));
          console.log('Cell', cell.id, 'code:', cell.code);
          
          // Use AsyncFunction constructor with proper this binding
          try {
            let wrappedCode;
            const lines = cell.code.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('//'));
            const codeWithoutComments = lines.join('\n');
            
            // Check if the code starts with { (block expression) - look past comments
            if (codeWithoutComments.trim().startsWith('{') && codeWithoutComments.trim().endsWith('}')) {
              // For block expressions, extract the inner content
              const innerCode = codeWithoutComments.trim().slice(1, -1).trim();
              wrappedCode = `
                console.log('Executing cell ${cell.id}');
                ${innerCode}
              `;
            } else {
              // For simple expressions, wrap in return
              wrappedCode = `
                console.log('Executing cell ${cell.id}');
                return (${cell.code});
              `;
            }
            
            console.log('Wrapped code for', cell.id, ':', wrappedCode);
            
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const func = new AsyncFunction(...Object.keys(scope), wrappedCode);
            const result = await func.apply(this, Object.values(scope));
            console.log('Cell', cell.id, 'result:', result);
            return result;
          } catch (error) {
            console.error('Cell', cell.id, 'error:', error);
            throw error;
          }
        });
      }
    } catch (error) {
      outputElement.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }

    if (options.moveToNext) {
      const currentIndex = cells.findIndex(c => c.id === cell.id);
      if (currentIndex < cells.length - 1) {
        const nextCell = cells[currentIndex + 1];
        setTimeout(() => {
          const nextTextarea = document.querySelector(`[data-cell-id="${nextCell.id}"]`);
          if (nextTextarea) {
            nextTextarea.focus();
          }
        }, 50);
      }
    }
  };

  return (
    <>
      <header class="notebook-header-bar">
        <div class="notebook-header-left">tundra notebook version X.X.X</div>
        <div class="notebook-header-right">
          <button class="hamburger-btn" aria-label="Menu" onClick={() => setMenuOpenId(menuOpenId() === '__header__' ? null : '__header__')}>
            <span class="hamburger-icon">☰</span>
          </button>
          {menuOpenId() === '__header__' && (
            <div class="header-menu-dropdown">
              <button class="header-menu-item">Load md</button>
              <button class="header-menu-item">Save as md</button>
              <button class="header-menu-item">Save as html</button>
            </div>
          )}
        </div>
      </header>
      <div class="notebook" style={{ 'padding-top': '54px' }}>
        <div class="notebook-content">
          <For each={cells}>
            {(cell, i) => {
              const idx = i();
              const insertBtn = idx > 0 ? (
                <button
                  class="cell-insert-btn"
                  title="Add cell above"
                  onClick={() => addCell(cells[idx-1].id)}
                  tabIndex={-1}
                >
                  <iconify-icon icon="solar:add-circle-linear" width="18" height="18" />
                </button>
              ) : null;
              let cellNode = null;
              switch (cell.type) {
                case 'script':
                  cellNode = <ScriptCell 
                    cell={cell} 
                    updateCell={updateCell} 
                    runCell={runCell}
                    menuOpenId={menuOpenId}
                    setMenuOpenId={setMenuOpenId}
                  />;
                  break;
                case 'javascript':
                  cellNode = <JavaScriptCell 
                    cell={cell} 
                    updateCell={updateCell} 
                    runCell={runCell}
                    addCell={addCell}
                    deleteCell={deleteCell}
                    menuOpenId={menuOpenId}
                    setMenuOpenId={setMenuOpenId}
                  />;
                  break;
                case 'markdown':
                  cellNode = <MarkdownCell 
                    cell={cell} 
                    updateCell={updateCell}
                    addCell={addCell}
                    deleteCell={deleteCell}
                    menuOpenId={menuOpenId}
                    setMenuOpenId={setMenuOpenId}
                  />;
                  break;
                default:
                  cellNode = null;
              }
              return (
                <div style="position:relative;">
                  {insertBtn}
                  {cellNode}
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </>
  );
}