(()=>{
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');
// pop-in on scroll
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.18});
document.querySelectorAll('.pop').forEach(el=>reduce?el.classList.add('in'):io.observe(el));
if(reduce){placeMini(1);return}


// parallax hero layers
const layers=[...document.querySelectorAll('[data-depth]')];
let ticking=false;
function onScroll(){if(ticking)return;ticking=true;requestAnimationFrame(()=>{const y=scrollY;
 if(y<innerHeight*1.3)layers.forEach(l=>l.style.transform=`translate3d(0,${y*l.dataset.depth}px,0)`);
 mapProgress();ticking=false})}
addEventListener('scroll',onScroll,{passive:true});

// book tilt on pointer
document.querySelectorAll('.tilt').forEach(c=>{
 c.addEventListener('pointermove',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`perspective(700px) rotateY(${x*12}deg) rotateX(${-y*10}deg) scale(1.02)`});
 c.addEventListener('pointerleave',()=>c.style.transform='')});

// map: route draws and mini balloon flies as you scroll, then loops gently
const route=document.getElementById('route'),dash=document.getElementById('routeDash'),mini=document.getElementById('mini'),map=document.querySelector('.map');
const L=route.getTotalLength();
route.style.strokeDasharray=L;route.style.strokeDashoffset=L;
function placeMini(p){const pt=route.getPointAtLength(L*p);mini.setAttribute('transform',`translate(${pt.x} ${pt.y})`)}
let shown=0;
function mapProgress(){const r=map.getBoundingClientRect();let p=(innerHeight-r.top)/(innerHeight*.9);p=Math.max(0,Math.min(1,p));
 shown=p;route.style.strokeDashoffset=L*(1-p);placeMini(p)}
mapProgress();
// idle hover of mini balloon
let t0=performance.now();(function loop(now){const b=Math.sin((now-t0)/700)*4;mini.style.translate=`0 ${b}px`;dash.style.strokeDashoffset=-(now/60)%16;requestAnimationFrame(loop)})(t0);
})();
