// ---- CONFIG: paste your Formspree (or similar) endpoint here, e.g. "https://formspree.io/f/abcdwxyz"
const WAITLIST_ENDPOINT = "";
document.querySelectorAll("form.wl").forEach(f=>{
  f.addEventListener("submit",async e=>{
    e.preventDefault();
    const msg=f.querySelector(".msg"),email=f.email.value.trim(),btn=f.querySelector("button");
    msg.className="msg";
    if(!/^\S+@\S+\.\S+$/.test(email)){msg.textContent="Enter a valid email address.";msg.className="msg err";return}
    btn.disabled=true;
    try{
      if(WAITLIST_ENDPOINT){
        const r=await fetch(WAITLIST_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({email,product:f.dataset.product||"Pane Glass",page:location.pathname})});
        if(!r.ok)throw new Error();
      }else console.warn("No WAITLIST_ENDPOINT set: email not saved anywhere (demo mode).");
      msg.textContent="You're on the list. We'll email you when it's back in stock.";f.reset();
    }catch{msg.textContent="Something went wrong. Try again in a moment.";msg.className="msg err"}
    btn.disabled=false;
  });
});
