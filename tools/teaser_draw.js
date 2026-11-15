/* Inserted into the previews by tools/teaser_fields.js, between the
   coachfields markers. Edit it here, then run that script. */
/* A measured bunker, drawn the coach app's way: filled to the footprint the map
   measured, outlined inside it, in the paint the map printed (red, blue, or
   neutral grey). Ported from bunkerShape in web/index.html. */
function mBunkerSVG(b){const x=X(b.x),y=Y(b.y),h=Math.max(.2,b.w/2),v=Math.max(.2,b.h/2),SW=.35,IN=SW/2;
  const blue=b.c==='b',red=b.c==='r',fill=blue?'url(#bnkBlue)':red?'url(#bnkRed)':'url(#bnkFace)',edge=blue?'#1b1a55':red?'#5c0f0d':'#63676a';
  const detail=b.d==='b'?'#3f3eb0':b.d==='r'?'#b8332c':blue?'#2f2e8a':red?'#9a231e':'#70767a';
  const f=n=>(+n).toFixed(2),sw=`stroke-width="${SW}"`;
  const box=(w,hh,r)=>{const iw=Math.max(.1,w-IN),ih=Math.max(.1,hh-IN);return `<rect x="${f(x-w)}" y="${f(y-hh)}" width="${f(w*2)}" height="${f(hh*2)}" rx="${f(r)}" fill="${fill}"/><rect x="${f(x-iw)}" y="${f(y-ih)}" width="${f(iw*2)}" height="${f(ih*2)}" rx="${f(r)}" fill="none" stroke="${edge}" ${sw}/>`;};
  const band=(hw,hh,cy,r)=>`<rect x="${f(x-hw)}" y="${f(cy-hh)}" width="${f(hw*2)}" height="${f(hh*2)}" rx="${r}" fill="${detail}"/>`;
  const poly=P=>`<polygon points="${P.map(p=>f(p[0])+','+f(p[1])).join(' ')}" fill="${fill}" stroke="${edge}" ${sw} stroke-linejoin="round"/>`;
  if(b.a&&b.t==='beam'){const r=Math.min(.4,v*.22);return `<g transform="rotate(${b.a} ${f(x)} ${f(y)})">`+box(h,v,r)+`<rect x="${f(x+h-v*1.4)}" y="${f(y-v)}" width="${f(v*1.4)}" height="${f(v*2)}" rx="${f(v*.5)}" fill="${detail}"/></g>`;}
  switch(b.t){
    case 'dorito':return poly([[x,y-v],[x-h,y+v],[x+h,y+v]]);
    case 'tridown':return poly([[x,y+v],[x-h,y-v],[x+h,y-v]]);
    case 'triin':{const d=b.x<75?1:-1;return poly([[x+h*d,y],[x-h*d,y-v],[x-h*d,y+v]]);}
    case 'wing':{const d=b.x<75?-1:1;return poly([[x+h*d,y],[x-h*d,y-v],[x-h*d,y+v]]);}
    case 'plus':{const A=Math.max(.6,(b.k||4)/2),arm=(H,V,A)=>`M${f(x-A)} ${f(y-V)}h${f(A*2)}v${f(V-A)}h${f(H-A)}v${f(A*2)}h-${f(H-A)}v${f(V-A)}h-${f(A*2)}v-${f(V-A)}h-${f(H-A)}v-${f(A*2)}h${f(H-A)}z`;
      const p=`<path d="${arm(h,v,A)}" fill="${fill}"/><path d="${arm(h-IN,v-IN,Math.max(.5,A-IN))}" fill="none" stroke="${edge}" ${sw} stroke-linejoin="round"/>`;return b.a?`<g transform="rotate(${b.a} ${f(x)} ${f(y)})">${p}</g>`:p;}
    case 'cake':return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(h)}" fill="${fill}" stroke="${edge}" ${sw}/>`;
    case 'ball':return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(h)}" ry="${f(v)}" fill="${fill}" stroke="${edge}" ${sw}/>`;
    case 'gwing':case 'gbrick':return box(h,v,1.2);
    case 'temple':{const i=Math.min(h,v)*.44;return box(h,v,.8)+`<rect x="${f(x-i)}" y="${f(y-i)}" width="${f(i*2)}" height="${f(i*2)}" rx="${f(i*.34)}" fill="${detail}"/>`;}
    case 'beam':{const cap=Math.min(.65,h*.09);return box(h,v,Math.min(.4,v*.22))+`<rect x="${f(x-h)}" y="${f(y-v)}" width="${f(cap*2)}" height="${f(v*2)}" rx="${f(cap)}" fill="${detail}"/><rect x="${f(x+h-cap*2)}" y="${f(y-v)}" width="${f(cap*2)}" height="${f(v*2)}" rx="${f(cap)}" fill="${detail}"/>`;}
    case 'mw':return box(h,v,h)+band(h*.84,Math.min(.45,v*.07),y+v*.16,.2)+band(h*.84,Math.min(.45,v*.07),y+v*.5,.2);
    case 'bar':return box(h,v,Math.min(h,v));
    default:{const cap=Math.min(.55,v*.12);return box(h,v,h)+band(h*.86,cap,y-v+cap,f(cap))+band(h*.86,cap,y+v-cap,f(cap));}
  }}
function mBunker(b){const x=X(b.x),y=Y(b.y);const g=el('g',{});g.setAttribute('data-bn',b.n);if(b.id!=null)g.setAttribute('data-bid',b.id);g.style.cursor='pointer';
  el('circle',{cx:x,cy:y,r:Math.max(3.2,Math.min(6,Math.max(b.w,b.h)/2+1)),fill:'transparent',stroke:'none'},g);
  g.insertAdjacentHTML('beforeend',mBunkerSVG(b));
  el('text',{x,y:y+Math.max(b.w,b.h)/2+2.4,fill:'#8d9092',stroke:'none','font-size':2.2,'text-anchor':'middle','font-weight':700}).textContent=b.n;}
