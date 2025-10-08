import { mount } from 'svelte';
import './app.css';
import App from './app/App.svelte';
import { Engine } from './engine';

const engine = new Engine();

const app = mount(App, {
  target: document.getElementById('app')!,
  props: { engine },
});

export default app;