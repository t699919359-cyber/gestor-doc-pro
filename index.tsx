//import React from 'react';
//import ReactDOM from 'react-dom/client';
//import App from './App';

//const rootElement = document.getElementById('root');
//if (!rootElement) {
  //throw new Error("Could not find root element to mount to");
//}

//const root = ReactDOM.createRoot(rootElement);
//root.render(
  //<React.StrictMode>
    //<App />
  //</React.StrictMode>
//);
import React from 'react';
import ReactDOM from 'react-dom/client';
import Aplicación from './Aplicación';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("No se pudo encontrar el elemento raíz para montar");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Aplicación />
  </React.StrictMode>
);
