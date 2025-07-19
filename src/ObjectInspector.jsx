import { createSignal, For, Show } from "solid-js";

function ObjectInspector({ value, depth = 0, maxDepth = 3 }) {
  const [isExpanded, setIsExpanded] = createSignal(depth < 2);

  if (value === null) {
    return <span style="color: #808080; font-style: italic;">null</span>;
  }
  
  if (value === undefined) {
    return <span style="color: #808080; font-style: italic;">undefined</span>;
  }
  
  if (typeof value === 'string') {
    return <span style="color: #22543d;">&quot;{value}&quot;</span>;
  }
  
  if (typeof value === 'number') {
    return <span style="color: #1a365d;">{value}</span>;
  }
  
  if (typeof value === 'boolean') {
    return <span style="color: #742a2a;">{String(value)}</span>;
  }
  
  if (typeof value === 'function') {
    const funcStr = value.toString();
    const funcName = value.name || 'anonymous';
    return (
      <span style="color: #553c9a; font-style: italic;">
        ƒ {funcName}() {'{...}'}
      </span>
    );
  }

  if (value instanceof Date) {
    return <span style="color: #744210;">{value.toString()}</span>;
  }

  if (Array.isArray(value)) {
    if (depth >= maxDepth) {
      return <span style="color: #808080;">[...]</span>;
    }

    return (
      <div style="display: inline-block;">
        <span 
          style="cursor: pointer; user-select: none; color: #2c5282;"
          onClick={() => setIsExpanded(!isExpanded())}
        >
          <span style="color: #4a5568; margin-right: 0.25rem;">
            {isExpanded() ? '▼' : '▶'}
          </span>
          <span style="color: #2c5282;">Array({value.length})</span>
        </span>
        <Show when={isExpanded()}>
          <div style="margin-left: 1rem; border-left: 1px solid #cbd5e0; padding-left: 0.5rem;">
            <For each={value}>
              {(item, index) => (
                <div style="margin: 0.125rem 0;">
                  <span style="color: #2b6cb0; margin-right: 0.5rem;">{index()}:</span>
                  <ObjectInspector value={item} depth={depth + 1} maxDepth={maxDepth} />
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    );
  }

  if (typeof value === 'object') {
    if (depth >= maxDepth) {
      return <span style="color: #808080;">{'{...}'}</span>;
    }

    const keys = Object.keys(value);
    const entries = Object.entries(value);
    
    return (
      <div style="display: inline-block;">
        <span 
          style="cursor: pointer; user-select: none; color: #2c5282;"
          onClick={() => setIsExpanded(!isExpanded())}
        >
          <span style="color: #4a5568; margin-right: 0.25rem;">
            {isExpanded() ? '▼' : '▶'}
          </span>
          <span style="color: #2c5282;">Object {'{' + keys.length + '}'}</span>
        </span>
        <Show when={isExpanded()}>
          <div style="margin-left: 1rem; border-left: 1px solid #cbd5e0; padding-left: 0.5rem;">
            <For each={entries}>
              {([key, val]) => (
                <div style="margin: 0.125rem 0;">
                  <span style="color: #553c9a; margin-right: 0.5rem;">{key}:</span>
                  <ObjectInspector value={val} depth={depth + 1} maxDepth={maxDepth} />
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

export default ObjectInspector;