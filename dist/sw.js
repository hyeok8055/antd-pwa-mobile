if(!self.define){let e,i={};const n=(n,c)=>(n=new URL(n+".js",c).href,i[n]||new Promise((i=>{if("document"in self){const e=document.createElement("script");e.src=n,e.onload=i,document.head.appendChild(e)}else e=n,importScripts(n),i()})).then((()=>{let e=i[n];if(!e)throw new Error(`Module ${n} didn’t register its module`);return e})));self.define=(c,o)=>{const s=e||("document"in self?document.currentScript.src:"")||location.href;if(i[s])return;let a={};const r=e=>n(e,s),l={module:{uri:s},exports:a,require:r};i[s]=Promise.all(c.map((e=>l[e]||r(e)))).then((e=>(o(...e),a)))}}define(["./workbox-3e8df8c8"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/main-CEbeiTFk.css",revision:null},{url:"assets/main-DZXS_-R4.js",revision:null},{url:"firebase-messaging-sw.js",revision:"77d67bcc290a0a283d933ec83f3ca203"},{url:"index.html",revision:"370160a2fca3d3957caf1e6db5c7f7e7"},{url:"registerSW.js",revision:"1872c500de691dce40960bb85481de07"},{url:"icons/apple-touch-icon-114x114.png",revision:"1f4a8a89f159893494ab722074ba4264"},{url:"icons/apple-touch-icon-120x120.png",revision:"38c53e9d08d0edf30de19ef2d50a2322"},{url:"icons/apple-touch-icon-144x144.png",revision:"f81544ac5aee66847372ffc025ea3c69"},{url:"icons/apple-touch-icon-152x152.png",revision:"fbbbf31addca2ae82ba5ce7d8e0c6906"},{url:"icons/apple-touch-icon-57x57.png",revision:"09a246ae0dda076664dc1aa46674d0f0"},{url:"icons/apple-touch-icon-60x60.png",revision:"bc668575aaab7be259589b7fc4aa136f"},{url:"icons/apple-touch-icon-72x72.png",revision:"ba4e939fb8fa852ced99b9812fc2d448"},{url:"icons/apple-touch-icon-76x76.png",revision:"75782076fcea216956db20c047e71b5f"},{url:"icons/maskable_icon_x128.png",revision:"05390ddd961c1576210c20bdce90710f"},{url:"icons/maskable_icon_x192.png",revision:"dbf4de4e74e56cee42b4297a2e390864"},{url:"icons/maskable_icon_x384.png",revision:"b9be1e199721ba2386c6fdbc1ce5848f"},{url:"icons/maskable_icon_x48.png",revision:"2cc75425b67d26464995ef2286850d89"},{url:"icons/maskable_icon_x512.png",revision:"288585f085103b9a90b0e5636e5a1fc1"},{url:"icons/maskable_icon_x72.png",revision:"3089833e12b48b3e100e00468dfa6145"},{url:"icons/maskable_icon_x96.png",revision:"9650a78ca730047fd2b2d918125f6c69"},{url:"manifest.webmanifest",revision:"89f06eb5fbe16dd6519e2134d6a592d0"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html")))}));
