if(!self.define){let e,i={};const n=(n,c)=>(n=new URL(n+".js",c).href,i[n]||new Promise((i=>{if("document"in self){const e=document.createElement("script");e.src=n,e.onload=i,document.head.appendChild(e)}else e=n,importScripts(n),i()})).then((()=>{let e=i[n];if(!e)throw new Error(`Module ${n} didn’t register its module`);return e})));self.define=(c,o)=>{const s=e||("document"in self?document.currentScript.src:"")||location.href;if(i[s])return;let r={};const a=e=>n(e,s),t={module:{uri:s},exports:r,require:a};i[s]=Promise.all(c.map((e=>t[e]||a(e)))).then((e=>(o(...e),r)))}}define(["./workbox-3e8df8c8"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/index-CkGOk9GA.css",revision:null},{url:"assets/index-D_rS7N7W.js",revision:null},{url:"index.html",revision:"d78c077f0198b158dac300cec6c217c0"},{url:"registerSW.js",revision:"1872c500de691dce40960bb85481de07"},{url:"icons/apple-touch-icon-114x114.png",revision:"1f4a8a89f159893494ab722074ba4264"},{url:"icons/apple-touch-icon-120x120.png",revision:"38c53e9d08d0edf30de19ef2d50a2322"},{url:"icons/apple-touch-icon-144x144.png",revision:"f81544ac5aee66847372ffc025ea3c69"},{url:"icons/apple-touch-icon-152x152.png",revision:"fbbbf31addca2ae82ba5ce7d8e0c6906"},{url:"icons/apple-touch-icon-57x57.png",revision:"09a246ae0dda076664dc1aa46674d0f0"},{url:"icons/apple-touch-icon-60x60.png",revision:"bc668575aaab7be259589b7fc4aa136f"},{url:"icons/apple-touch-icon-72x72.png",revision:"ba4e939fb8fa852ced99b9812fc2d448"},{url:"icons/apple-touch-icon-76x76.png",revision:"75782076fcea216956db20c047e71b5f"},{url:"manifest.webmanifest",revision:"af13a1c6162c10f25aee534e83c68c71"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html")))}));
