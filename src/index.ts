import './style.css';
import { Workbox } from 'workbox-window';

function app() {
  if ('serviceWorker' in navigator) {
    const wb = new Workbox('/sw.js');

    wb.addEventListener('activated', (ev: any) => {
      console.log("Workbox activated");
    })

    wb.register().then(() => {
      console.log("Workbox register");
    });
  }
}


app();