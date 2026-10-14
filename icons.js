// Small local SVG set; no third-party executable script is needed for account pages.
window.lucide={createIcons(){
 const paths={
  'x':'M6 6l12 12M18 6L6 18','check':'M5 12l4 4L19 6','edit-3':'M4 20h16M6 16l1-5L17 1l5 5-10 10-6 1',
  'image':'M3 3h18v18H3zM3 17l6-6 4 4 3-3 5 5M8 7h.1','message-square':'M3 3h18v14H8l-5 4V3',
  'message-circle':'M21 11a9 9 0 01-9 9H3l2-4a9 9 0 1116-5','heart':'M12 21L3 12a5 5 0 017-7l2 2 2-2a5 5 0 017 7z',
  'send':'M22 2L9 15M22 2L2 9l7 6 6 7 7-20','tag':'M2 3h8l12 12-9 9L2 11V3M6 7h.1',
  'trash':'M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7M14 10v7','trash-2':'M3 6h18M8 6V3h8v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  'corner-down-left':'M19 3v10H5M10 8l-5 5 5 5','file-text':'M5 2h9l5 5v15H5zM14 2v5h5M8 12h8M8 16h6',
  'upload-cloud':'M8 17H5a4 4 0 010-8 7 7 0 0113-2 5 5 0 011 10h-3M12 21V10M8 14l4-4 4 4',
  'user-check':'M14 8a4 4 0 11-8 0 4 4 0 018 0M2 22v-3a6 6 0 016-6h3M16 17l2 2 4-5',
  'alert-triangle':'M12 2L2 22h20L12 2M12 9v5M12 18h.1'};
 for(const el of document.querySelectorAll('[data-lucide]')){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [name,value]of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(name,value);svg.setAttribute('class',el.className);const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[el.dataset.lucide]||paths['file-text']);svg.append(path);el.replaceWith(svg);}
}};
