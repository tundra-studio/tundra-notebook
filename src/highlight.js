import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

export function highlightJS(code) {
  return Prism.highlight(code, Prism.languages.javascript, 'javascript');
}
