/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './App.jsx'
import 'bulma/css/bulma.min.css';
import 'katex/dist/katex.min.css';
import 'prismjs/themes/prism-tomorrow.css';

// Iconify webcomponent and Solar icon set for offline use
import '@iconify/iconify/dist/iconify.min.js';
import solarIcons from '@iconify-json/solar/icons.json';
if (window.Iconify) {
  window.Iconify.addCollection(solarIcons);
}

const root = document.getElementById('root')

// render(() => <App />, root)
render(() => <App />, document.getElementById("root"));