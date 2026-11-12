// ---- CONFIG: paste your Formspree (or similar) endpoint here, e.g. "https://formspree.io/f/abcdwxyz"
const WAITLIST_ENDPOINT = "https://formspree.io/f/xoedqkqa";

// ---- Device list. Add or remove freely; people can also type any device not listed.
const mk=(p,l)=>l.map(s=>(p+" "+s).trim());
const DEVICES=[
 ...mk("iPhone",["5","5C","5S","SE (1st gen)","6","6 Plus","6s","6s Plus","7","7 Plus","8","8 Plus","X","XR","XS","XS Max","11","11 Pro","11 Pro Max","SE (2nd gen)","12 mini","12","12 Pro","12 Pro Max","13 mini","13","13 Pro","13 Pro Max","SE (3rd gen)","14","14 Plus","14 Pro","14 Pro Max","15","15 Plus","15 Pro","15 Pro Max","16","16 Plus","16 Pro","16 Pro Max","16e","17","17 Pro","17 Pro Max","Air"]),
 ...mk("Samsung Galaxy",["S20","S20+","S20 Ultra","S21","S21+","S21 Ultra","S22","S22+","S22 Ultra","S23","S23+","S23 Ultra","S24","S24+","S24 Ultra","S25","S25+","S25 Ultra","A15","A25","A35","A55","Z Flip5","Z Flip6","Z Fold5","Z Fold6","Note 20 Ultra"]),
 ...mk("Google Pixel",["6","6 Pro","6a","7","7 Pro","7a","8","8 Pro","8a","9","9 Pro","9 Pro XL","9a","10","10 Pro","10 Pro XL"]),
 ...mk("OnePlus",["9","10 Pro","11","12","13"]),
 ...mk("Motorola",["Moto G Power","Moto G Stylus","Razr","Edge"]),
 ...mk("Xiaomi",["13","14","15","Redmi Note 13"]),
];
const OTHER="Other / not listed";

// ---- Fuzzy search: every typed word must match a word in the device name (exact, prefix, contains, or one typo).
const norm=s=>s.toLowerCase().replace(/[^a-z0-9+ ]/g," ").split(/\s+/).filter(Boolean);
function typo(a,b){ // true if edit distance <= 1
  if(Math.abs(a.length-b.length)>1)return false;
  if(a.length===b.length)for(let k=0;k<a.length-1;k++)if(a[k]===b[k+1]&&a[k+1]===b[k]&&a.slice(0,k)===b.slice(0,k)&&a.slice(k+2)===b.slice(k+2))return true; // swapped letters
  let i=0,j=0,e=0;
  while(i<a.length&&j<b.length){
    if(a[i]===b[j]){i++;j++;continue}
    if(++e>1)return false;
    if(a.length>b.length)i++;else if(a.length<b.length)j++;else{i++;j++}
  }
  return e+(a.length-i)+(b.length-j)<=1;
}
function score(q,name){
  const nt=norm(name),flat=nt.join("");let total=0;
  for(const t of q){
    let best=0;
    for(const w of nt){
      if(w===t)best=Math.max(best,4);
      else if(w.startsWith(t))best=Math.max(best,3);
      else if(t.length>2&&w.includes(t))best=Math.max(best,2);
      else if(t.length>3&&typo(t,w))best=Math.max(best,1.5);
    }
    if(!best&&t.length>2&&flat.includes(t))best=1; // e.g. "iphone15" or "s24ultra"
    if(!best)return 0;
    total+=best;
  }
  return total-nt.length*0.01; // prefer shorter names on ties
}
function search(text){
  const q=norm(text);if(!q.length)return[];
  const joined=q.join("");
  return DEVICES.map((d,i)=>({d,i,s:Math.max(score(q,d),norm(d).join("").includes(joined)?1:0)}))
    .filter(x=>x.s>0).sort((a,b)=>b.s-a.s||a.i-b.i).slice(0,8).map(x=>x.d);
}

// ---- Accessible combobox
function makeCombo(form,n){
  const wrap=document.createElement("div");wrap.className="field combo";
  wrap.innerHTML=`<input type="text" name="device" placeholder="Your phone, e.g. iPhone 15 Pro" aria-label="Your phone model" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="dev-${n}" required><ul id="dev-${n}" role="listbox" hidden></ul>`;
  const input=wrap.querySelector("input"),list=wrap.querySelector("ul");let items=[],active=-1;
  const close=()=>{list.hidden=true;input.setAttribute("aria-expanded","false");active=-1;input.removeAttribute("aria-activedescendant")};
  const setActive=i=>{
    active=i;[...list.children].forEach((li,k)=>li.setAttribute("aria-selected",k===i));
    i>=0?(input.setAttribute("aria-activedescendant",list.children[i].id),list.children[i].scrollIntoView({block:"nearest"})):input.removeAttribute("aria-activedescendant");
  };
  const pick=v=>{input.value=v;close()};
  function render(){
    const v=input.value.trim();if(!v){close();return}
    items=search(v);if(!items.length||!items.some(d=>d.toLowerCase()===v.toLowerCase()))items.push(OTHER);
    list.innerHTML="";
    items.forEach((d,k)=>{const li=document.createElement("li");li.id=`dev-${n}-${k}`;li.setAttribute("role","option");li.textContent=d;
      if(d===OTHER&&v)li.innerHTML=`Use “${v.replace(/</g,"&lt;")}”<small>(not listed)</small>`;
      li.addEventListener("mousedown",e=>{e.preventDefault();pick(d===OTHER?v:d)});list.append(li)});
    list.hidden=false;input.setAttribute("aria-expanded","true");setActive(-1);
  }
  input.addEventListener("input",render);
  input.addEventListener("focus",render);
  input.addEventListener("blur",close);
  input.addEventListener("keydown",e=>{
    if(list.hidden)return;const last=items.length-1;
    if(e.key==="ArrowDown"){e.preventDefault();setActive(active>=last?0:active+1)}
    else if(e.key==="ArrowUp"){e.preventDefault();setActive(active<=0?last:active-1)}
    else if(e.key==="Enter"&&active>=0){e.preventDefault();const d=items[active];pick(d===OTHER?input.value.trim():d)}
    else if(e.key==="Escape")close();
  });
  form.prepend(wrap);
}

// ---- Waitlist forms
document.querySelectorAll("form.wl").forEach((f,n)=>{
  makeCombo(f,n);
  f.addEventListener("submit",async e=>{
    e.preventDefault();
    const msg=f.querySelector(".msg"),email=f.email.value.trim(),device=f.device.value.trim(),btn=f.querySelector("button");
    msg.className="msg";
    if(!device){msg.textContent="Tell us which phone you have.";msg.className="msg err";f.device.focus();return}
    if(!/^\S+@\S+\.\S+$/.test(email)){msg.textContent="Enter a valid email address.";msg.className="msg err";return}
    btn.disabled=true;
    try{
      if(WAITLIST_ENDPOINT){
        const r=await fetch(WAITLIST_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({email,device,product:f.dataset.product||"Pane Glass",page:location.pathname})});
        if(!r.ok)throw new Error();
      }else console.warn("No WAITLIST_ENDPOINT set: signup not saved anywhere (demo mode).",{email,device});
      msg.textContent="You're on the list. We'll email you when it's back in stock.";f.reset();
    }catch{msg.textContent="Something went wrong. Try again in a moment.";msg.className="msg err"}
    btn.disabled=false;
  });
});
