import { createSignal, createEffect, For, onCleanup } from "solid-js";
import { render } from "solid-js/web";
import { Runtime } from "@observablehq/runtime";
import { marked } from "marked";
import katex from "katex";
import MarkdownCell from "./MarkdownCell";
import JsCell from "./JsCell";
import ScriptCell from "./ScriptCell";
import ObjectInspector from "./ObjectInspector";

// Configure marked to handle math expressions
marked.setOptions({
  renderer: new marked.Renderer(),
  highlight: null,
  breaks: true
});

// Function to render markdown with math
export function renderMarkdown(text) {
  if (!text) return '';
  
  // First, replace math expressions with placeholders 
  const mathExpressions = [];
  let processedText = text;
  
  // Handle display math $$...$$ first
  processedText = processedText.replace(/\$\$([\s\S]*?)\$\$/g, (match, expr) => {
    const index = mathExpressions.length;
    mathExpressions.push({ type: 'display', expr: expr.trim() });
    return `<!--MATH_DISPLAY_${index}-->`;
  });
  
  // Handle inline math $...$
  processedText = processedText.replace(/\$([^$\n]+?)\$/g, (match, expr) => {
    const index = mathExpressions.length;
    mathExpressions.push({ type: 'inline', expr: expr.trim() });
    return `<!--MATH_INLINE_${index}-->`;
  });
  
  // Render markdown
  let html = marked(processedText);
  
  // Replace placeholders with rendered math AFTER markdown processing
  mathExpressions.forEach((math, index) => {
    try {
      const rendered = katex.renderToString(math.expr, {
        displayMode: math.type === 'display',
        throwOnError: false,
        strict: false
      });
      
      const placeholder = `<!--MATH_${math.type.toUpperCase()}_${index}-->`;
      // Use a more robust replacement that handles HTML encoding
      html = html.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), rendered);
      
    } catch (error) {
      const placeholder = `<!--MATH_${math.type.toUpperCase()}_${index}-->`;
      const errorSpan = `<span style="color: red; background: #fee; padding: 2px 4px; border-radius: 3px;">Math Error: ${error.message}</span>`;
      html = html.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), errorSpan);
    }
  });
  
  return html;
}

// Simple Inspector implementation for displaying Observable outputs
class Inspector {
  constructor(node) {
    this.node = node;
  }
  pending() {
    if (!this.node) return;
    this.node.textContent = "...";
  }
  fulfilled(value) {
    if (!this.node) return;
    
    if (value instanceof Element) {
      this.node.innerHTML = "";
      this.node.appendChild(value);
    } else if (value instanceof Promise) {
      this.node.innerHTML = '<div style="color: #888; font-style: italic;">⏳ Loading async result...</div>';
      value.then(result => {
        // Re-render with the resolved value
        this.fulfilled(result);
      }).catch(error => {
        this.node.innerHTML = `<div style="color: #dc2626;">Promise Error: ${error.message}</div>`;
      });
    } else if (typeof value === "object" || Array.isArray(value)) {
      // Use interactive ObjectInspector for objects and arrays
      this.node.innerHTML = "";
      const container = document.createElement('div');
      container.style.cssText = 'font-family: "JetBrains Mono", monospace; font-size: 0.85rem; background: #f8f9fa; color: #2d3748; padding: 0.75rem; border-radius: 6px; border: 1px solid #e2e8f0; overflow-x: auto;';
      this.node.appendChild(container);
      
      try {
        render(() => ObjectInspector({ value }), container);
      } catch (e) {
        // Fallback to JSON if ObjectInspector fails
        container.innerHTML = `<pre style="margin: 0; white-space: pre-wrap;">${JSON.stringify(value, null, 2)}</pre>`;
      }
    } else {
      // For primitives, use simple display
      const color = typeof value === 'string' ? '#c3e88d' : 
                   typeof value === 'number' ? '#f78c6c' : 
                   typeof value === 'boolean' ? '#ff9cac' : '#d4d4d4';
      const displayValue = typeof value === 'string' ? `"${value}"` : String(value);
      this.node.innerHTML = `<span style="color: ${color}; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;">${displayValue}</span>`;
    }
  }
  rejected(error) {
    if (!this.node) return;
    this.node.textContent = `Error: ${error.message || error}`;
    this.node.style.color = "#dc2626";
  }
}

function extractDependencies(code, allCells, currentCellId) {
  const dependencies = [];
  const namedCells = new Map();
  
  // Build map of cell names based on their index
  allCells.forEach((cell, index) => {
    if (cell.id !== currentCellId && cell.type === "javascript") {
      namedCells.set(`cell_${index}`, true);
    }
  });
  
  // Parse the code to find references to other cells
  const identifierRegex = /\b(cell_\d+)\b/g;
  let match;
  
  while ((match = identifierRegex.exec(code)) !== null) {
    const identifier = match[1];
    if (namedCells.has(identifier) && !dependencies.includes(identifier)) {
      dependencies.push(identifier);
    }
  }
  
  return dependencies;
}

function Notebook() {
  // Cellules de test complètes pour Observable Runtime
  // Robust test cells (avoid syntax error in object literal)
  const [cells, setCells] = createSignal([
    { id: 1, code: "// Test 1: Calcul simple\n4 + 5", type: "javascript" },
    { id: 2, code: "// Test 2: Dépendance simple\ncell_0 * 2", type: "javascript" },
    { id: 3, code: "// Test 3: Objet complexe\n({\n  nom: 'Test Observable',\n  valeur: cell_1,\n  timestamp: new Date(),\n  nested: { a: 1, b: [2, 3, 4] },\n  method: function() { return 'Hello from object'; }\n})", type: "javascript" },
    { id: 4, code: "// Test 4: Tableau avec map\n[1, 2, 3, cell_0, cell_1].map(function(x, i) {\n  return { index: i, value: x, doubled: x * 2 };\n})", type: "javascript" },
    { id: 5, code: "// Test 5: HTML Element avec styles\n{\n  const div = document.createElement('div');\n  const h3 = document.createElement('h3');\n  h3.textContent = 'Test Widget Observable';\n  h3.style.color = '#3273dc';\n  const p = document.createElement('p');\n  p.innerHTML = 'Valeur calculée: <strong>' + cell_0 + '</strong>';\n  const btn = document.createElement('button');\n  btn.textContent = 'Click me';\n  btn.onclick = function() { alert('Hello from Observable!'); };\n  div.appendChild(h3);\n  div.appendChild(p);\n  div.appendChild(btn);\n  div.style.cssText = 'padding: 1rem; border: 2px solid #3273dc; border-radius: 8px; background: #f8f9fa;';\n  return div;\n}", type: "javascript" },
    { id: 6, code: "// Test 6: SVG Graph\n{\n  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');\n  svg.setAttribute('width', '300');\n  svg.setAttribute('height', '200');\n  svg.style.border = '1px solid #ddd';\n  const data = [cell_0, cell_1, 15, 25, 30];\n  const max = Math.max.apply(Math, data);\n  for (let i = 0; i < data.length; i++) {\n    const value = data[i];\n    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');\n    rect.setAttribute('x', i * 50 + 20);\n    rect.setAttribute('y', 200 - (value / max) * 150);\n    rect.setAttribute('width', '40');\n    rect.setAttribute('height', (value / max) * 150);\n    rect.setAttribute('fill', 'hsl(' + (i * 60) + ', 70%, 50%)');\n    svg.appendChild(rect);\n    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');\n    text.setAttribute('x', i * 50 + 40);\n    text.setAttribute('y', 190);\n    text.setAttribute('text-anchor', 'middle');\n    text.setAttribute('font-size', '12');\n    text.textContent = value;\n    svg.appendChild(text);\n  }\n  return svg;\n}", type: "javascript" },
    { id: 7, code: "// Test 7: Table HTML\n{\n  const table = document.createElement('table');\n  table.style.cssText = 'width: 100%; border-collapse: collapse; font-family: Inter, sans-serif;';\n  const data = [\n    ['Cellule', 'Valeur', 'Type'],\n    ['cell_0', cell_0, typeof cell_0],\n    ['cell_1', cell_1, typeof cell_1],\n    ['Objet', JSON.stringify(cell_2), typeof cell_2]\n  ];\n  for (let i = 0; i < data.length; i++) {\n    const row = data[i];\n    const tr = document.createElement('tr');\n    for (let j = 0; j < row.length; j++) {\n      const cellData = row[j];\n      const td = document.createElement(i === 0 ? 'th' : 'td');\n      td.textContent = cellData;\n      const headerStyle = i === 0 ? 'background: #f8f9fa; font-weight: bold;' : '';\n      td.style.cssText = 'padding: 0.5rem; border: 1px solid #ddd; ' + headerStyle;\n      tr.appendChild(td);\n    }\n    table.appendChild(tr);\n  }\n  return table;\n}", type: "javascript" },
    { id: 8, code: "// Test 8: Async operation\n{\n  const promise = new Promise(function(resolve) {\n    setTimeout(function() {\n      resolve('Async result: ' + (cell_0 + cell_1) + ' (calculé après 1s)');\n    }, 1000);\n  });\n  return promise;\n}", type: "javascript" },
    { id: 9, code: `# Test Markdown avec maths\n\nCeci est du **markdown** avec des équations complexes:\n\n## Formule d'Einstein\n$$E = mc^2$$\n\n## Équation quadratique\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n## Math inline\nLa valeur de π est approximativement $\\pi \\approx 3.14159$.\n\n## Liste avec math\n- Premier calcul: $2^3 = 8$\n- Deuxième calcul: $\\sqrt{16} = 4$\n- Troisième calcul: $\\int_0^1 x dx = \\frac{1}{2}$`, type: "markdown" }
  ]);
  
  const runtime = new Runtime();
  const module = runtime.module();
  let cellVariables = new Map();

  onCleanup(() => {
    runtime.dispose();
  });

  // Drag state
  const [draggedId, setDraggedId] = createSignal(null);
  const [menuOpenId, setMenuOpenId] = createSignal(null);
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = createSignal(false);

  const addCell = (afterId = null, type = "javascript") => {
    const id = Date.now() + Math.random(); // Ensure unique ID
    const newCell = { id, code: "", type, output: "" };
    setCells(cells => {
      const idx = cells.findIndex(c => c.id === afterId);
      if (idx >= 0) {
        // Insert AFTER the current cell
        return [...cells.slice(0, idx + 1), newCell, ...cells.slice(idx + 1)];
      } else {
        // Add at the end if no afterId provided
        return [...cells, newCell];
      }
    });
  };

  // Charge dynamiquement un script JS externe si une cellule est de type 'script'
  function loadScriptCell(cell) {
    if (!cell.code.trim()) return;
    const url = cell.code.trim();
    if (document.querySelector(`script[data-notebook-cdn='${url}']`)) return; // déjà chargé
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.setAttribute('data-notebook-cdn', url);
    script.onload = () => { /* Optionnel: feedback */ };
    script.onerror = () => { alert('Erreur de chargement du script: ' + url); };
    document.head.appendChild(script);
  }

  const deleteCell = (id) => {
    const cell = cells().find(c => c.id === id);
    if (cell && cellVariables.has(id)) {
      const variable = cellVariables.get(id);
      variable.delete();
      cellVariables.delete(id);
    }
    setCells(cells => cells.filter(c => c.id !== id));
  };

  const moveCell = (id, direction) => {
    setCells(cells => {
      const idx = cells.findIndex(c => c.id === id);
      if (idx < 0) return cells;
      const newCells = [...cells];
      const [removed] = newCells.splice(idx, 1);
      const newIndex = direction === "up" ? Math.max(0, idx - 1) : Math.min(cells.length, idx + 1);
      newCells.splice(newIndex, 0, removed);
      return newCells;
    });
  };

  // Drag & drop support
  const onDragStart = (id, e) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (id, e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (id, e) => {
    e.preventDefault();
    const fromId = draggedId();
    if (fromId === id) return;
    setCells(cells => {
      const fromIdx = cells.findIndex(c => c.id === fromId);
      const toIdx = cells.findIndex(c => c.id === id);
      if (fromIdx < 0 || toIdx < 0) return cells;
      const newCells = [...cells];
      const [removed] = newCells.splice(fromIdx, 1);
      newCells.splice(toIdx, 0, removed);
      return newCells;
    });
    setDraggedId(null);
  };
  const onDragEnd = () => setDraggedId(null);

  const updateCell = (id, field, value) => {
    setCells(cells => cells.map(cell => 
      cell.id === id ? { ...cell, [field]: value } : cell
    ));
  };

  // Fonction pour passer le focus à la cellule suivante
  const focusNextCell = (currentCellId) => {
    const cellsArray = cells();
    const currentIndex = cellsArray.findIndex(c => c.id === currentCellId);
    if (currentIndex >= 0 && currentIndex < cellsArray.length - 1) {
      const nextCell = cellsArray[currentIndex + 1];
      // Focus sur la textarea de la cellule suivante
      setTimeout(() => {
        const nextTextarea = document.querySelector(`textarea[data-cell-id="${nextCell.id}"]`);
        if (nextTextarea) {
          nextTextarea.focus();
        }
      }, 100);
    }
  };

  // État pour éviter l'exécution multiple
  const [initialized, setInitialized] = createSignal(false);
  
  // Exécution initiale des cellules lors du premier chargement (NON-REACTIF)
  if (!initialized() && cells().length > 0) {
    setInitialized(true);
    // Exécuter les cellules JavaScript dans l'ordre avec un délai
    setTimeout(() => {
      cells().forEach(cell => {
        if (cell.type === 'javascript' && cell.code.trim()) {
          runCell(cell);
        }
      });
    }, 100);
  }

  // Exécution d'une cellule JS avec options
  const runCell = (cell, options = {}) => {
    if (cell.type !== 'javascript') return;
    
    const { keepFocus = false, moveToNext = false } = options;
    
    // Supprime la variable existante
    if (cellVariables.has(cell.id)) {
      const variable = cellVariables.get(cell.id);
      variable.delete();
      cellVariables.delete(cell.id);
    }
    
    const cellIndex = cells().findIndex(c => c.id === cell.id);
    const cellName = `cell_${cellIndex}`;
    
    try {
      const dependencies = extractDependencies(cell.code, cells(), cell.id);
      const outputEl = document.getElementById(`output-${cell.id}`);
      if (!outputEl) return;
      
      const variable = module.variable(new Inspector(outputEl));
      const assignmentMatch = /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(.+)/.exec(cell.code);
      
      let functionBody;
      if (assignmentMatch) {
        const rightSide = assignmentMatch[2];
        functionBody = `
          try {
            return (${rightSide});
          } catch (error) {
            return error;
          }
        `;
      } else {
        functionBody = `
          try {
            return (${cell.code});
          } catch (error) {
            return error;
          }
        `;
      }
      
      variable.define(cellName, dependencies, new Function(...dependencies, functionBody));
      cellVariables.set(cell.id, variable);
      
      // Exécuter les cellules dépendantes après un court délai
      setTimeout(() => {
        runDependentCells(cell.id);
      }, 50);
      
      // Gérer le focus après l'exécution
      if (moveToNext) {
        setTimeout(() => focusNextCell(cell.id), 100);
      } else if (keepFocus) {
        setTimeout(() => {
          const textarea = document.querySelector(`textarea[data-cell-id="${cell.id}"]`);
          if (textarea) textarea.focus();
        }, 100);
      }
      
    } catch (error) {
      const el = document.getElementById(`output-${cell.id}`);
      if (el) el.textContent = `Error: ${error.message}`;
    }
  };
  
  // Fonction pour exécuter les cellules qui dépendent de la cellule modifiée
  const runDependentCells = (changedCellId) => {
    const changedCellIndex = cells().findIndex(c => c.id === changedCellId);
    if (changedCellIndex === -1) return;
    
    const changedCellName = `cell_${changedCellIndex}`;
    
    // Trouve toutes les cellules qui dépendent de cette cellule
    cells().forEach((cell, index) => {
      if (cell.type === 'javascript' && cell.id !== changedCellId) {
        const dependencies = extractDependencies(cell.code, cells(), cell.id);
        if (dependencies.includes(changedCellName)) {
          runCell(cell);
        }
      }
    });
  };

  // Save notebook as markdown
  const saveNotebook = () => {
    const markdown = cells().map((cell, index) => {
      if (cell.type === 'markdown') {
        return cell.code;
      } else {
        return `\`\`\`javascript\n${cell.code}\n\`\`\``;
      }
    }).join('\n\n');
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notebook.md';
    a.click();
    URL.revokeObjectURL(url);
    setHamburgerMenuOpen(false);
  };

  // Load notebook from markdown
  const loadNotebook = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target.result;
          const newCells = parseMarkdownNotebook(content);
          setCells(newCells);
        };
        reader.readAsText(file);
      }
    };
    input.click();
    setHamburgerMenuOpen(false);
  };

  // Parse markdown content into cells
  const parseMarkdownNotebook = (content) => {
    const lines = content.split('\n');
    const newCells = [];
    let currentCell = { id: Date.now(), code: '', type: 'markdown' };
    let inCodeBlock = false;
    let codeBlockLang = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          if (currentCell.code.trim()) {
            newCells.push(currentCell);
          }
          currentCell = { id: Date.now() + newCells.length, code: '', type: 'markdown' };
          inCodeBlock = false;
        } else {
          // Start of code block
          if (currentCell.code.trim()) {
            newCells.push(currentCell);
          }
          codeBlockLang = line.slice(3);
          currentCell = { 
            id: Date.now() + newCells.length, 
            code: '', 
            type: codeBlockLang === 'javascript' || codeBlockLang === 'js' ? 'javascript' : 'markdown' 
          };
          inCodeBlock = true;
        }
      } else {
        if (currentCell.code) {
          currentCell.code += '\n';
        }
        currentCell.code += line;
      }
    }
    
    if (currentCell.code.trim()) {
      newCells.push(currentCell);
    }
    
    return newCells.length > 0 ? newCells : [{ id: Date.now(), code: '', type: 'javascript' }];
  };

  // Interface Notion-like optimisée
  return (
    <div class="hero is-fullheight" style="background: #ffffff;">
      <div class="hero-body" style="padding: 2rem 1rem;">
        <div class="container" style="max-width: 1400px; margin: 0 auto;">
          {/* Header - minimal Notion style */}
          <div class="level" style="margin-bottom: 3rem; border-bottom: 1px solid #f0f0f0; padding-bottom: 1rem;">
            <div class="level-left">
              <div class="level-item">
                <h1 class="title is-4" style="margin-bottom: 0; font-weight: 600; color: #37352f; font-family: 'Inter', sans-serif;">
                  📘 tundra notebook
                </h1>
              </div>
            </div>
            <div class="level-right">
              <div class="level-item">
                <div class="dropdown" classList={{ "is-active": hamburgerMenuOpen() }}>
                  <div class="dropdown-trigger">
                    <button
                      class="button is-light"
                      style="border-radius: 8px;"
                      onClick={() => setHamburgerMenuOpen(!hamburgerMenuOpen())}
                      title="Menu"
                    >
                      <iconify-icon icon="solar:menu-dots-linear" width="20" height="20"></iconify-icon>
                    </button>
                  </div>
                  {hamburgerMenuOpen() && (
                    <div class="dropdown-menu" style="min-width: 200px;">
                      <div class="dropdown-content">
                        <a class="dropdown-item" onClick={saveNotebook}>
                          <iconify-icon icon="solar:download-linear" width="16" height="16" style="margin-right: 0.5rem;"></iconify-icon>
                          Sauvegarder (.md)
                        </a>
                        <a class="dropdown-item" onClick={loadNotebook}>
                          <iconify-icon icon="solar:upload-linear" width="16" height="16" style="margin-right: 0.5rem;"></iconify-icon>
                          Charger (.md)
                        </a>
                        <hr class="dropdown-divider" />
                        <a class="dropdown-item" onClick={() => setHamburgerMenuOpen(false)}>
                          <iconify-icon icon="solar:info-circle-linear" width="16" height="16" style="margin-right: 0.5rem;"></iconify-icon>
                          À propos
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <For each={cells()}>{(cell, i) => {
            if (cell.type === 'script') {
              return <ScriptCell cell={cell} updateCell={updateCell} addCell={addCell} deleteCell={deleteCell} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} />;
            } else if (cell.type === 'javascript') {
              return <JsCell cell={cell} updateCell={updateCell} runCell={runCell} addCell={addCell} deleteCell={deleteCell} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} />;
            } else if (cell.type === 'markdown') {
              return <MarkdownCell cell={cell} updateCell={updateCell} addCell={addCell} deleteCell={deleteCell} menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId} />;
            } else {
              return null;
            }
          }}</For>
        </div>
      </div>
      
      {/* Status bar - minimal */}
      <div class="hero-foot">
        <div class="level" style="background: #fafafa; border-top: 1px solid #e8e8e8; padding: 0.5rem 1.5rem; margin: 0; font-size: 0.85rem;">
          <div class="level-left">
            <div class="level-item">
              <span style="color: #888; font-weight: 500;">
                📄 tundra notebook
              </span>
            </div>
          </div>
          <div class="level-right">
            <div class="level-item">
              <div class="tags has-addons">
                <span class="tag is-light">{cells().length} cellules</span>
                <span class="tag is-primary">{cells().filter(c => c.type === 'javascript').length} JS</span>
                <span class="tag is-danger">{cells().filter(c => c.type === 'markdown').length} MD</span>
                {cells().filter(c => c.type === 'script').length > 0 && <span class="tag is-warning">{cells().filter(c => c.type === 'script').length} CDN</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Notebook;
