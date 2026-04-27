const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ModuleView-Ay1E7Djf.js","assets/ModuleCta.vue_vue_type_script_setup_true_lang-QOAWif5_.js","assets/LessonView-Dg_R85yU.js","assets/codemirror-DUeF7_hC.js"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function o(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(r){if(r.ep)return;r.ep=!0;const s=o(r);fetch(r.href,s)}})();const It=document.getElementById("navbar");It&&window.addEventListener("scroll",()=>{It.classList.toggle("scrolled",window.scrollY>20)},{passive:!0});const no=document.getElementById("navToggle"),rt=document.getElementById("navLinks");no&&rt&&(no.addEventListener("click",()=>{const e=rt.classList.toggle("open");no.setAttribute("aria-expanded",e)}),rt.querySelectorAll("a").forEach(e=>{e.addEventListener("click",()=>rt.classList.remove("open"))}));const Io=document.getElementById("navSearchTrigger"),Lt=document.getElementById("navSearchExpand"),ur=document.getElementById("navSearchExit");function nn(){return document.getElementById("navSearchQuery")||Lt&&Lt.querySelector('input[name="q"]')}if(It&&Io&&Lt){let e=function(){It.classList.add("nav-search-open"),Io.setAttribute("aria-expanded","true"),Lt.removeAttribute("hidden"),Lt.style.display="flex",rt&&rt.classList.remove("open"),no&&no.setAttribute("aria-expanded","false");const n=nn();n&&requestAnimationFrame(()=>{try{n.focus()}catch{}})},t=function(){It.classList.remove("nav-search-open"),Io.setAttribute("aria-expanded","false"),Lt.setAttribute("hidden",""),Lt.style.display="";const n=nn();n&&(n.value="")};Io.addEventListener("click",n=>{n.preventDefault(),n.stopPropagation(),It.classList.contains("nav-search-open")||e()}),ur&&ur.addEventListener("click",t),document.addEventListener("keydown",n=>{n.key==="Escape"&&It.classList.contains("nav-search-open")&&t()});const o=nn();o&&o.addEventListener("keydown",n=>{n.key==="Escape"&&(n.preventDefault(),t())})}document.querySelectorAll(".nav-dropdown > .dropdown-toggle").forEach(e=>{e.addEventListener("click",t=>{const o=e.closest(".nav-dropdown");!o||!(rt!=null&&rt.classList.contains("open")||window.matchMedia("(max-width: 880px)").matches)||(t.preventDefault(),o.classList.toggle("open"))})});function Rn(e){if(!e||e==="/")return"/index.html";const t=e.replace(/\/$/,"");return t.endsWith(".html")?t:`${t}/index.html`}const Mi=Rn(location.pathname),rn=location.hash||"",is=Array.from(document.querySelectorAll(".nav-links a"));is.forEach(e=>e.classList.remove("active"));is.forEach(e=>{const t=e.getAttribute("href");if(!t||t.startsWith("mailto:")||t.startsWith("http"))return;let o="",n="";try{const r=new URL(t,window.location.href);o=Rn(r.pathname),n=r.hash||""}catch{const r=t.split("#");n=r[1]?`#${r[1]}`:"";try{o=Rn(new URL(r[0]||".",window.location.href).pathname)}catch{o=""}}if(o===Mi){if(n){n===rn&&e.classList.add("active");return}if(rn&&(t.endsWith("services.html")||t.endsWith("/services.html"))){e.classList.add("active");return}rn||e.classList.add("active")}});const sn=document.querySelectorAll(".section, .service-full, .case-study-section, .about-section, .what-happens, .results-metrics, .contact-main, .search-page-main, .addons-section, .guarantee-section, .cta-bottom, .cta-about, .cta-section");if(sn.length){sn.forEach(t=>t.classList.add("scroll-reveal"));const e=new IntersectionObserver(t=>{t.forEach(o=>{o.isIntersecting?o.target.classList.add("is-visible"):o.target.classList.remove("is-visible")})},{threshold:.12,rootMargin:"0px 0px -8% 0px"});sn.forEach(t=>e.observe(t))}const Pt=document.getElementById("contactForm");Pt&&Pt.addEventListener("submit",async e=>{e.preventDefault();const t=Pt.querySelector('[type="submit"]'),o=t.textContent;t.textContent="Sending…",t.disabled=!0;try{if((await fetch(Pt.action,{method:"POST",body:new FormData(Pt),headers:{Accept:"application/json"}})).ok)Pt.innerHTML=`<div style="text-align:center;padding:40px 0">
          <div style="font-size:3rem;margin-bottom:16px">✅</div>
          <h3 style="color:var(--primary)">Message sent!</h3>
          <p style="color:var(--text-lt);margin-top:8px">I'll be in touch within 4 hours during business hours.</p>
        </div>`;else throw new Error("Failed")}catch{t.textContent=o,t.disabled=!1,alert("Something went wrong. Please email support@reliadb.com directly.")}});document.querySelectorAll('a[href^="#"]').forEach(e=>{e.addEventListener("click",t=>{const o=e.getAttribute("href");if(!o||o.length<2)return;let n;try{n=document.querySelector(o)}catch{return}n&&(t.preventDefault(),n.scrollIntoView({behavior:"smooth",block:"start"}))})});/**
* @vue/shared v3.5.32
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/function Pn(e){const t=Object.create(null);for(const o of e.split(","))t[o]=1;return o=>o in t}const ee={},kt=[],Ke=()=>{},as=()=>!1,qo=e=>e.charCodeAt(0)===111&&e.charCodeAt(1)===110&&(e.charCodeAt(2)>122||e.charCodeAt(2)<97),Go=e=>e.startsWith("onUpdate:"),Ee=Object.assign,Hn=(e,t)=>{const o=e.indexOf(t);o>-1&&e.splice(o,1)},Ui=Object.prototype.hasOwnProperty,J=(e,t)=>Ui.call(e,t),W=Array.isArray,Vt=e=>To(e)==="[object Map]",ls=e=>To(e)==="[object Set]",pr=e=>To(e)==="[object Date]",k=e=>typeof e=="function",ne=e=>typeof e=="string",Xe=e=>typeof e=="symbol",j=e=>e!==null&&typeof e=="object",ds=e=>(j(e)||k(e))&&k(e.then)&&k(e.catch),cs=Object.prototype.toString,To=e=>cs.call(e),Di=e=>To(e).slice(8,-1),us=e=>To(e)==="[object Object]",Bn=e=>ne(e)&&e!=="NaN"&&e[0]!=="-"&&""+parseInt(e,10)===e,ro=Pn(",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"),Jo=e=>{const t=Object.create(null);return(o=>t[o]||(t[o]=e(o)))},Fi=/-\w/g,Re=Jo(e=>e.replace(Fi,t=>t.slice(1).toUpperCase())),Pi=/\B([A-Z])/g,xt=Jo(e=>e.replace(Pi,"-$1").toLowerCase()),Ko=Jo(e=>e.charAt(0).toUpperCase()+e.slice(1)),an=Jo(e=>e?`on${Ko(e)}`:""),Je=(e,t)=>!Object.is(e,t),ln=(e,...t)=>{for(let o=0;o<e.length;o++)e[o](...t)},ps=(e,t,o,n=!1)=>{Object.defineProperty(e,t,{configurable:!0,enumerable:!1,writable:n,value:o})},Hi=e=>{const t=parseFloat(e);return isNaN(t)?e:t};let mr;const jo=()=>mr||(mr=typeof globalThis<"u"?globalThis:typeof self<"u"?self:typeof window<"u"?window:typeof global<"u"?global:{});function _t(e){if(W(e)){const t={};for(let o=0;o<e.length;o++){const n=e[o],r=ne(n)?Vi(n):_t(n);if(r)for(const s in r)t[s]=r[s]}return t}else if(ne(e)||j(e))return e}const Bi=/;(?![^(]*\))/g,Wi=/:([^]+)/,ki=/\/\*[^]*?\*\//g;function Vi(e){const t={};return e.replace(ki,"").split(Bi).forEach(o=>{if(o){const n=o.split(Wi);n.length>1&&(t[n[0].trim()]=n[1].trim())}}),t}function Xo(e){let t="";if(ne(e))t=e;else if(W(e))for(let o=0;o<e.length;o++){const n=Xo(e[o]);n&&(t+=n+" ")}else if(j(e))for(const o in e)e[o]&&(t+=o+" ");return t.trim()}const Qi="itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly",Yi=Pn(Qi);function ms(e){return!!e||e===""}function qi(e,t){if(e.length!==t.length)return!1;let o=!0;for(let n=0;o&&n<e.length;n++)o=Wn(e[n],t[n]);return o}function Wn(e,t){if(e===t)return!0;let o=pr(e),n=pr(t);if(o||n)return o&&n?e.getTime()===t.getTime():!1;if(o=Xe(e),n=Xe(t),o||n)return e===t;if(o=W(e),n=W(t),o||n)return o&&n?qi(e,t):!1;if(o=j(e),n=j(t),o||n){if(!o||!n)return!1;const r=Object.keys(e).length,s=Object.keys(t).length;if(r!==s)return!1;for(const i in e){const a=e.hasOwnProperty(i),l=t.hasOwnProperty(i);if(a&&!l||!a&&l||!Wn(e[i],t[i]))return!1}}return String(e)===String(t)}const Es=e=>!!(e&&e.__v_isRef===!0),pe=e=>ne(e)?e:e==null?"":W(e)||j(e)&&(e.toString===cs||!k(e.toString))?Es(e)?pe(e.value):JSON.stringify(e,hs,2):String(e),hs=(e,t)=>Es(t)?hs(e,t.value):Vt(t)?{[`Map(${t.size})`]:[...t.entries()].reduce((o,[n,r],s)=>(o[dn(n,s)+" =>"]=r,o),{})}:ls(t)?{[`Set(${t.size})`]:[...t.values()].map(o=>dn(o))}:Xe(t)?dn(t):j(t)&&!W(t)&&!us(t)?String(t):t,dn=(e,t="")=>{var o;return Xe(e)?`Symbol(${(o=e.description)!=null?o:t})`:e};/**
* @vue/reactivity v3.5.32
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/let Ie;class Gi{constructor(t=!1){this.detached=t,this._active=!0,this._on=0,this.effects=[],this.cleanups=[],this._isPaused=!1,this.__v_skip=!0,this.parent=Ie,!t&&Ie&&(this.index=(Ie.scopes||(Ie.scopes=[])).push(this)-1)}get active(){return this._active}pause(){if(this._active){this._isPaused=!0;let t,o;if(this.scopes)for(t=0,o=this.scopes.length;t<o;t++)this.scopes[t].pause();for(t=0,o=this.effects.length;t<o;t++)this.effects[t].pause()}}resume(){if(this._active&&this._isPaused){this._isPaused=!1;let t,o;if(this.scopes)for(t=0,o=this.scopes.length;t<o;t++)this.scopes[t].resume();for(t=0,o=this.effects.length;t<o;t++)this.effects[t].resume()}}run(t){if(this._active){const o=Ie;try{return Ie=this,t()}finally{Ie=o}}}on(){++this._on===1&&(this.prevScope=Ie,Ie=this)}off(){this._on>0&&--this._on===0&&(Ie=this.prevScope,this.prevScope=void 0)}stop(t){if(this._active){this._active=!1;let o,n;for(o=0,n=this.effects.length;o<n;o++)this.effects[o].stop();for(this.effects.length=0,o=0,n=this.cleanups.length;o<n;o++)this.cleanups[o]();if(this.cleanups.length=0,this.scopes){for(o=0,n=this.scopes.length;o<n;o++)this.scopes[o].stop(!0);this.scopes.length=0}if(!this.detached&&this.parent&&!t){const r=this.parent.scopes.pop();r&&r!==this&&(this.parent.scopes[this.index]=r,r.index=this.index)}this.parent=void 0}}}function Ji(){return Ie}let Z;const cn=new WeakSet;class fs{constructor(t){this.fn=t,this.deps=void 0,this.depsTail=void 0,this.flags=5,this.next=void 0,this.cleanup=void 0,this.scheduler=void 0,Ie&&Ie.active&&Ie.effects.push(this)}pause(){this.flags|=64}resume(){this.flags&64&&(this.flags&=-65,cn.has(this)&&(cn.delete(this),this.trigger()))}notify(){this.flags&2&&!(this.flags&32)||this.flags&8||gs(this)}run(){if(!(this.flags&1))return this.fn();this.flags|=2,Er(this),Ss(this);const t=Z,o=xe;Z=this,xe=!0;try{return this.fn()}finally{Ts(this),Z=t,xe=o,this.flags&=-3}}stop(){if(this.flags&1){for(let t=this.deps;t;t=t.nextDep)Qn(t);this.deps=this.depsTail=void 0,Er(this),this.onStop&&this.onStop(),this.flags&=-2}}trigger(){this.flags&64?cn.add(this):this.scheduler?this.scheduler():this.runIfDirty()}runIfDirty(){Nn(this)&&this.run()}get dirty(){return Nn(this)}}let ys=0,so,io;function gs(e,t=!1){if(e.flags|=8,t){e.next=io,io=e;return}e.next=so,so=e}function kn(){ys++}function Vn(){if(--ys>0)return;if(io){let t=io;for(io=void 0;t;){const o=t.next;t.next=void 0,t.flags&=-9,t=o}}let e;for(;so;){let t=so;for(so=void 0;t;){const o=t.next;if(t.next=void 0,t.flags&=-9,t.flags&1)try{t.trigger()}catch(n){e||(e=n)}t=o}}if(e)throw e}function Ss(e){for(let t=e.deps;t;t=t.nextDep)t.version=-1,t.prevActiveLink=t.dep.activeLink,t.dep.activeLink=t}function Ts(e){let t,o=e.depsTail,n=o;for(;n;){const r=n.prevDep;n.version===-1?(n===o&&(o=r),Qn(n),Ki(n)):t=n,n.dep.activeLink=n.prevActiveLink,n.prevActiveLink=void 0,n=r}e.deps=t,e.depsTail=o}function Nn(e){for(let t=e.deps;t;t=t.nextDep)if(t.dep.version!==t.version||t.dep.computed&&(Rs(t.dep.computed)||t.dep.version!==t.version))return!0;return!!e._dirty}function Rs(e){if(e.flags&4&&!(e.flags&16)||(e.flags&=-17,e.globalVersion===Eo)||(e.globalVersion=Eo,!e.isSSR&&e.flags&128&&(!e.deps&&!e._dirty||!Nn(e))))return;e.flags|=2;const t=e.dep,o=Z,n=xe;Z=e,xe=!0;try{Ss(e);const r=e.fn(e._value);(t.version===0||Je(r,e._value))&&(e.flags|=128,e._value=r,t.version++)}catch(r){throw t.version++,r}finally{Z=o,xe=n,Ts(e),e.flags&=-3}}function Qn(e,t=!1){const{dep:o,prevSub:n,nextSub:r}=e;if(n&&(n.nextSub=r,e.prevSub=void 0),r&&(r.prevSub=n,e.nextSub=void 0),o.subs===e&&(o.subs=n,!n&&o.computed)){o.computed.flags&=-5;for(let s=o.computed.deps;s;s=s.nextDep)Qn(s,!0)}!t&&!--o.sc&&o.map&&o.map.delete(o.key)}function Ki(e){const{prevDep:t,nextDep:o}=e;t&&(t.nextDep=o,e.prevDep=void 0),o&&(o.prevDep=t,e.nextDep=void 0)}let xe=!0;const Ns=[];function st(){Ns.push(xe),xe=!1}function it(){const e=Ns.pop();xe=e===void 0?!0:e}function Er(e){const{cleanup:t}=e;if(e.cleanup=void 0,t){const o=Z;Z=void 0;try{t()}finally{Z=o}}}let Eo=0;class ji{constructor(t,o){this.sub=t,this.dep=o,this.version=o.version,this.nextDep=this.prevDep=this.nextSub=this.prevSub=this.prevActiveLink=void 0}}class Yn{constructor(t){this.computed=t,this.version=0,this.activeLink=void 0,this.subs=void 0,this.map=void 0,this.key=void 0,this.sc=0,this.__v_skip=!0}track(t){if(!Z||!xe||Z===this.computed)return;let o=this.activeLink;if(o===void 0||o.sub!==Z)o=this.activeLink=new ji(Z,this),Z.deps?(o.prevDep=Z.depsTail,Z.depsTail.nextDep=o,Z.depsTail=o):Z.deps=Z.depsTail=o,Os(o);else if(o.version===-1&&(o.version=this.version,o.nextDep)){const n=o.nextDep;n.prevDep=o.prevDep,o.prevDep&&(o.prevDep.nextDep=n),o.prevDep=Z.depsTail,o.nextDep=void 0,Z.depsTail.nextDep=o,Z.depsTail=o,Z.deps===o&&(Z.deps=n)}return o}trigger(t){this.version++,Eo++,this.notify(t)}notify(t){kn();try{for(let o=this.subs;o;o=o.prevSub)o.sub.notify()&&o.sub.dep.notify()}finally{Vn()}}}function Os(e){if(e.dep.sc++,e.sub.flags&4){const t=e.dep.computed;if(t&&!e.dep.subs){t.flags|=20;for(let n=t.deps;n;n=n.nextDep)Os(n)}const o=e.dep.subs;o!==e&&(e.prevSub=o,o&&(o.nextSub=e)),e.dep.subs=e}}const On=new WeakMap,Ct=Symbol(""),In=Symbol(""),ho=Symbol("");function he(e,t,o){if(xe&&Z){let n=On.get(e);n||On.set(e,n=new Map);let r=n.get(o);r||(n.set(o,r=new Yn),r.map=n,r.key=o),r.track()}}function nt(e,t,o,n,r,s){const i=On.get(e);if(!i){Eo++;return}const a=l=>{l&&l.trigger()};if(kn(),t==="clear")i.forEach(a);else{const l=W(e),p=l&&Bn(o);if(l&&o==="length"){const d=Number(n);i.forEach((u,E)=>{(E==="length"||E===ho||!Xe(E)&&E>=d)&&a(u)})}else switch((o!==void 0||i.has(void 0))&&a(i.get(o)),p&&a(i.get(ho)),t){case"add":l?p&&a(i.get("length")):(a(i.get(Ct)),Vt(e)&&a(i.get(In)));break;case"delete":l||(a(i.get(Ct)),Vt(e)&&a(i.get(In)));break;case"set":Vt(e)&&a(i.get(Ct));break}}Vn()}function Ht(e){const t=G(e);return t===e?t:(he(t,"iterate",ho),be(e)?t:t.map(Me))}function $o(e){return he(e=G(e),"iterate",ho),e}function Ye(e,t){return at(e)?qt(vt(e)?Me(t):t):Me(t)}const Xi={__proto__:null,[Symbol.iterator](){return un(this,Symbol.iterator,e=>Ye(this,e))},concat(...e){return Ht(this).concat(...e.map(t=>W(t)?Ht(t):t))},entries(){return un(this,"entries",e=>(e[1]=Ye(this,e[1]),e))},every(e,t){return Ze(this,"every",e,t,void 0,arguments)},filter(e,t){return Ze(this,"filter",e,t,o=>o.map(n=>Ye(this,n)),arguments)},find(e,t){return Ze(this,"find",e,t,o=>Ye(this,o),arguments)},findIndex(e,t){return Ze(this,"findIndex",e,t,void 0,arguments)},findLast(e,t){return Ze(this,"findLast",e,t,o=>Ye(this,o),arguments)},findLastIndex(e,t){return Ze(this,"findLastIndex",e,t,void 0,arguments)},forEach(e,t){return Ze(this,"forEach",e,t,void 0,arguments)},includes(...e){return pn(this,"includes",e)},indexOf(...e){return pn(this,"indexOf",e)},join(e){return Ht(this).join(e)},lastIndexOf(...e){return pn(this,"lastIndexOf",e)},map(e,t){return Ze(this,"map",e,t,void 0,arguments)},pop(){return zt(this,"pop")},push(...e){return zt(this,"push",e)},reduce(e,...t){return hr(this,"reduce",e,t)},reduceRight(e,...t){return hr(this,"reduceRight",e,t)},shift(){return zt(this,"shift")},some(e,t){return Ze(this,"some",e,t,void 0,arguments)},splice(...e){return zt(this,"splice",e)},toReversed(){return Ht(this).toReversed()},toSorted(e){return Ht(this).toSorted(e)},toSpliced(...e){return Ht(this).toSpliced(...e)},unshift(...e){return zt(this,"unshift",e)},values(){return un(this,"values",e=>Ye(this,e))}};function un(e,t,o){const n=$o(e),r=n[t]();return n!==e&&!be(e)&&(r._next=r.next,r.next=()=>{const s=r._next();return s.done||(s.value=o(s.value)),s}),r}const $i=Array.prototype;function Ze(e,t,o,n,r,s){const i=$o(e),a=i!==e&&!be(e),l=i[t];if(l!==$i[t]){const u=l.apply(e,s);return a?Me(u):u}let p=o;i!==e&&(a?p=function(u,E){return o.call(this,Ye(e,u),E,e)}:o.length>2&&(p=function(u,E){return o.call(this,u,E,e)}));const d=l.call(i,p,n);return a&&r?r(d):d}function hr(e,t,o,n){const r=$o(e),s=r!==e&&!be(e);let i=o,a=!1;r!==e&&(s?(a=n.length===0,i=function(p,d,u){return a&&(a=!1,p=Ye(e,p)),o.call(this,p,Ye(e,d),u,e)}):o.length>3&&(i=function(p,d,u){return o.call(this,p,d,u,e)}));const l=r[t](i,...n);return a?Ye(e,l):l}function pn(e,t,o){const n=G(e);he(n,"iterate",ho);const r=n[t](...o);return(r===-1||r===!1)&&Jn(o[0])?(o[0]=G(o[0]),n[t](...o)):r}function zt(e,t,o=[]){st(),kn();const n=G(e)[t].apply(e,o);return Vn(),it(),n}const zi=Pn("__proto__,__v_isRef,__isVue"),Is=new Set(Object.getOwnPropertyNames(Symbol).filter(e=>e!=="arguments"&&e!=="caller").map(e=>Symbol[e]).filter(Xe));function Zi(e){Xe(e)||(e=String(e));const t=G(this);return he(t,"has",e),t.hasOwnProperty(e)}class Ls{constructor(t=!1,o=!1){this._isReadonly=t,this._isShallow=o}get(t,o,n){if(o==="__v_skip")return t.__v_skip;const r=this._isReadonly,s=this._isShallow;if(o==="__v_isReactive")return!r;if(o==="__v_isReadonly")return r;if(o==="__v_isShallow")return s;if(o==="__v_raw")return n===(r?s?da:bs:s?Cs:_s).get(t)||Object.getPrototypeOf(t)===Object.getPrototypeOf(n)?t:void 0;const i=W(t);if(!r){let l;if(i&&(l=Xi[o]))return l;if(o==="hasOwnProperty")return Zi}const a=Reflect.get(t,o,fe(t)?t:n);if((Xe(o)?Is.has(o):zi(o))||(r||he(t,"get",o),s))return a;if(fe(a)){const l=i&&Bn(o)?a:a.value;return r&&j(l)?bt(l):l}return j(a)?r?bt(a):zo(a):a}}class As extends Ls{constructor(t=!1){super(!1,t)}set(t,o,n,r){let s=t[o];const i=W(t)&&Bn(o);if(!this._isShallow){const p=at(s);if(!be(n)&&!at(n)&&(s=G(s),n=G(n)),!i&&fe(s)&&!fe(n))return p||(s.value=n),!0}const a=i?Number(o)<t.length:J(t,o),l=Reflect.set(t,o,n,fe(t)?t:r);return t===G(r)&&(a?Je(n,s)&&nt(t,"set",o,n):nt(t,"add",o,n)),l}deleteProperty(t,o){const n=J(t,o);t[o];const r=Reflect.deleteProperty(t,o);return r&&n&&nt(t,"delete",o,void 0),r}has(t,o){const n=Reflect.has(t,o);return(!Xe(o)||!Is.has(o))&&he(t,"has",o),n}ownKeys(t){return he(t,"iterate",W(t)?"length":Ct),Reflect.ownKeys(t)}}class ea extends Ls{constructor(t=!1){super(!0,t)}set(t,o){return!0}deleteProperty(t,o){return!0}}const ta=new As,oa=new ea,na=new As(!0);const Ln=e=>e,Lo=e=>Reflect.getPrototypeOf(e);function ra(e,t,o){return function(...n){const r=this.__v_raw,s=G(r),i=Vt(s),a=e==="entries"||e===Symbol.iterator&&i,l=e==="keys"&&i,p=r[e](...n),d=o?Ln:t?qt:Me;return!t&&he(s,"iterate",l?In:Ct),Ee(Object.create(p),{next(){const{value:u,done:E}=p.next();return E?{value:u,done:E}:{value:a?[d(u[0]),d(u[1])]:d(u),done:E}}})}}function Ao(e){return function(...t){return e==="delete"?!1:e==="clear"?void 0:this}}function sa(e,t){const o={get(r){const s=this.__v_raw,i=G(s),a=G(r);e||(Je(r,a)&&he(i,"get",r),he(i,"get",a));const{has:l}=Lo(i),p=t?Ln:e?qt:Me;if(l.call(i,r))return p(s.get(r));if(l.call(i,a))return p(s.get(a));s!==i&&s.get(r)},get size(){const r=this.__v_raw;return!e&&he(G(r),"iterate",Ct),r.size},has(r){const s=this.__v_raw,i=G(s),a=G(r);return e||(Je(r,a)&&he(i,"has",r),he(i,"has",a)),r===a?s.has(r):s.has(r)||s.has(a)},forEach(r,s){const i=this,a=i.__v_raw,l=G(a),p=t?Ln:e?qt:Me;return!e&&he(l,"iterate",Ct),a.forEach((d,u)=>r.call(s,p(d),p(u),i))}};return Ee(o,e?{add:Ao("add"),set:Ao("set"),delete:Ao("delete"),clear:Ao("clear")}:{add(r){const s=G(this),i=Lo(s),a=G(r),l=!t&&!be(r)&&!at(r)?a:r;return i.has.call(s,l)||Je(r,l)&&i.has.call(s,r)||Je(a,l)&&i.has.call(s,a)||(s.add(l),nt(s,"add",l,l)),this},set(r,s){!t&&!be(s)&&!at(s)&&(s=G(s));const i=G(this),{has:a,get:l}=Lo(i);let p=a.call(i,r);p||(r=G(r),p=a.call(i,r));const d=l.call(i,r);return i.set(r,s),p?Je(s,d)&&nt(i,"set",r,s):nt(i,"add",r,s),this},delete(r){const s=G(this),{has:i,get:a}=Lo(s);let l=i.call(s,r);l||(r=G(r),l=i.call(s,r)),a&&a.call(s,r);const p=s.delete(r);return l&&nt(s,"delete",r,void 0),p},clear(){const r=G(this),s=r.size!==0,i=r.clear();return s&&nt(r,"clear",void 0,void 0),i}}),["keys","values","entries",Symbol.iterator].forEach(r=>{o[r]=ra(r,e,t)}),o}function qn(e,t){const o=sa(e,t);return(n,r,s)=>r==="__v_isReactive"?!e:r==="__v_isReadonly"?e:r==="__v_raw"?n:Reflect.get(J(o,r)&&r in n?o:n,r,s)}const ia={get:qn(!1,!1)},aa={get:qn(!1,!0)},la={get:qn(!0,!1)};const _s=new WeakMap,Cs=new WeakMap,bs=new WeakMap,da=new WeakMap;function ca(e){switch(e){case"Object":case"Array":return 1;case"Map":case"Set":case"WeakMap":case"WeakSet":return 2;default:return 0}}function ua(e){return e.__v_skip||!Object.isExtensible(e)?0:ca(Di(e))}function zo(e){return at(e)?e:Gn(e,!1,ta,ia,_s)}function vs(e){return Gn(e,!1,na,aa,Cs)}function bt(e){return Gn(e,!0,oa,la,bs)}function Gn(e,t,o,n,r){if(!j(e)||e.__v_raw&&!(t&&e.__v_isReactive))return e;const s=ua(e);if(s===0)return e;const i=r.get(e);if(i)return i;const a=new Proxy(e,s===2?n:o);return r.set(e,a),a}function vt(e){return at(e)?vt(e.__v_raw):!!(e&&e.__v_isReactive)}function at(e){return!!(e&&e.__v_isReadonly)}function be(e){return!!(e&&e.__v_isShallow)}function Jn(e){return e?!!e.__v_raw:!1}function G(e){const t=e&&e.__v_raw;return t?G(t):e}function pa(e){return!J(e,"__v_skip")&&Object.isExtensible(e)&&ps(e,"__v_skip",!0),e}const Me=e=>j(e)?zo(e):e,qt=e=>j(e)?bt(e):e;function fe(e){return e?e.__v_isRef===!0:!1}function ft(e){return ws(e,!1)}function ma(e){return ws(e,!0)}function ws(e,t){return fe(e)?e:new Ea(e,t)}class Ea{constructor(t,o){this.dep=new Yn,this.__v_isRef=!0,this.__v_isShallow=!1,this._rawValue=o?t:G(t),this._value=o?t:Me(t),this.__v_isShallow=o}get value(){return this.dep.track(),this._value}set value(t){const o=this._rawValue,n=this.__v_isShallow||be(t)||at(t);t=n?t:G(t),Je(t,o)&&(this._rawValue=t,this._value=n?t:Me(t),this.dep.trigger())}}function Te(e){return fe(e)?e.value:e}const ha={get:(e,t,o)=>t==="__v_raw"?e:Te(Reflect.get(e,t,o)),set:(e,t,o,n)=>{const r=e[t];return fe(r)&&!fe(o)?(r.value=o,!0):Reflect.set(e,t,o,n)}};function xs(e){return vt(e)?e:new Proxy(e,ha)}class fa{constructor(t,o,n){this.fn=t,this.setter=o,this._value=void 0,this.dep=new Yn(this),this.__v_isRef=!0,this.deps=void 0,this.depsTail=void 0,this.flags=16,this.globalVersion=Eo-1,this.next=void 0,this.effect=this,this.__v_isReadonly=!o,this.isSSR=n}notify(){if(this.flags|=16,!(this.flags&8)&&Z!==this)return gs(this,!0),!0}get value(){const t=this.dep.track();return Rs(this),t&&(t.version=this.dep.version),this._value}set value(t){this.setter&&this.setter(t)}}function ya(e,t,o=!1){let n,r;return k(e)?n=e:(n=e.get,r=e.set),new fa(n,r,o)}const _o={},Do=new WeakMap;let Nt;function ga(e,t=!1,o=Nt){if(o){let n=Do.get(o);n||Do.set(o,n=[]),n.push(e)}}function Sa(e,t,o=ee){const{immediate:n,deep:r,once:s,scheduler:i,augmentJob:a,call:l}=o,p=M=>r?M:be(M)||r===!1||r===0?ht(M,1):ht(M);let d,u,E,f,O=!1,T=!1;if(fe(e)?(u=()=>e.value,O=be(e)):vt(e)?(u=()=>p(e),O=!0):W(e)?(T=!0,O=e.some(M=>vt(M)||be(M)),u=()=>e.map(M=>{if(fe(M))return M.value;if(vt(M))return p(M);if(k(M))return l?l(M,2):M()})):k(e)?t?u=l?()=>l(e,2):e:u=()=>{if(E){st();try{E()}finally{it()}}const M=Nt;Nt=d;try{return l?l(e,3,[f]):e(f)}finally{Nt=M}}:u=Ke,t&&r){const M=u,K=r===!0?1/0:r;u=()=>ht(M(),K)}const x=Ji(),U=()=>{d.stop(),x&&x.active&&Hn(x.effects,d)};if(s&&t){const M=t;t=(...K)=>{M(...K),U()}}let _=T?new Array(e.length).fill(_o):_o;const b=M=>{if(!(!(d.flags&1)||!d.dirty&&!M))if(t){const K=d.run();if(r||O||(T?K.some((ce,te)=>Je(ce,_[te])):Je(K,_))){E&&E();const ce=Nt;Nt=d;try{const te=[K,_===_o?void 0:T&&_[0]===_o?[]:_,f];_=K,l?l(t,3,te):t(...te)}finally{Nt=ce}}}else d.run()};return a&&a(b),d=new fs(u),d.scheduler=i?()=>i(b,!1):b,f=M=>ga(M,!1,d),E=d.onStop=()=>{const M=Do.get(d);if(M){if(l)l(M,4);else for(const K of M)K();Do.delete(d)}},t?n?b(!0):_=d.run():i?i(b.bind(null,!0),!0):d.run(),U.pause=d.pause.bind(d),U.resume=d.resume.bind(d),U.stop=U,U}function ht(e,t=1/0,o){if(t<=0||!j(e)||e.__v_skip||(o=o||new Map,(o.get(e)||0)>=t))return e;if(o.set(e,t),t--,fe(e))ht(e.value,t,o);else if(W(e))for(let n=0;n<e.length;n++)ht(e[n],t,o);else if(ls(e)||Vt(e))e.forEach(n=>{ht(n,t,o)});else if(us(e)){for(const n in e)ht(e[n],t,o);for(const n of Object.getOwnPropertySymbols(e))Object.prototype.propertyIsEnumerable.call(e,n)&&ht(e[n],t,o)}return e}/**
* @vue/runtime-core v3.5.32
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/function Ro(e,t,o,n){try{return n?e(...n):e()}catch(r){No(r,t,o)}}function $e(e,t,o,n){if(k(e)){const r=Ro(e,t,o,n);return r&&ds(r)&&r.catch(s=>{No(s,t,o)}),r}if(W(e)){const r=[];for(let s=0;s<e.length;s++)r.push($e(e[s],t,o,n));return r}}function No(e,t,o,n=!0){const r=t?t.vnode:null,{errorHandler:s,throwUnhandledErrorInProduction:i}=t&&t.appContext.config||ee;if(t){let a=t.parent;const l=t.proxy,p=`https://vuejs.org/error-reference/#runtime-${o}`;for(;a;){const d=a.ec;if(d){for(let u=0;u<d.length;u++)if(d[u](e,l,p)===!1)return}a=a.parent}if(s){st(),Ro(s,null,10,[e,l,p]),it();return}}Ta(e,o,r,n,i)}function Ta(e,t,o,n=!0,r=!1){if(r)throw e;console.error(e)}const Se=[];let Qe=-1;const Qt=[];let mt=null,Bt=0;const Ms=Promise.resolve();let Fo=null;function Us(e){const t=Fo||Ms;return e?t.then(this?e.bind(this):e):t}function Ra(e){let t=Qe+1,o=Se.length;for(;t<o;){const n=t+o>>>1,r=Se[n],s=fo(r);s<e||s===e&&r.flags&2?t=n+1:o=n}return t}function Kn(e){if(!(e.flags&1)){const t=fo(e),o=Se[Se.length-1];!o||!(e.flags&2)&&t>=fo(o)?Se.push(e):Se.splice(Ra(t),0,e),e.flags|=1,Ds()}}function Ds(){Fo||(Fo=Ms.then(Ps))}function Na(e){W(e)?Qt.push(...e):mt&&e.id===-1?mt.splice(Bt+1,0,e):e.flags&1||(Qt.push(e),e.flags|=1),Ds()}function fr(e,t,o=Qe+1){for(;o<Se.length;o++){const n=Se[o];if(n&&n.flags&2){if(e&&n.id!==e.uid)continue;Se.splice(o,1),o--,n.flags&4&&(n.flags&=-2),n(),n.flags&4||(n.flags&=-2)}}}function Fs(e){if(Qt.length){const t=[...new Set(Qt)].sort((o,n)=>fo(o)-fo(n));if(Qt.length=0,mt){mt.push(...t);return}for(mt=t,Bt=0;Bt<mt.length;Bt++){const o=mt[Bt];o.flags&4&&(o.flags&=-2),o.flags&8||o(),o.flags&=-2}mt=null,Bt=0}}const fo=e=>e.id==null?e.flags&2?-1:1/0:e.id;function Ps(e){try{for(Qe=0;Qe<Se.length;Qe++){const t=Se[Qe];t&&!(t.flags&8)&&(t.flags&4&&(t.flags&=-2),Ro(t,t.i,t.i?15:14),t.flags&4||(t.flags&=-2))}}finally{for(;Qe<Se.length;Qe++){const t=Se[Qe];t&&(t.flags&=-2)}Qe=-1,Se.length=0,Fs(),Fo=null,(Se.length||Qt.length)&&Ps()}}let we=null,Hs=null;function Po(e){const t=we;return we=e,Hs=e&&e.type.__scopeId||null,t}function jn(e,t=we,o){if(!t||e._n)return e;const n=(...r)=>{n._d&&Wo(-1);const s=Po(t);let i;try{i=e(...r)}finally{Po(s),n._d&&Wo(1)}return i};return n._n=!0,n._c=!0,n._d=!0,n}function Tt(e,t,o,n){const r=e.dirs,s=t&&t.dirs;for(let i=0;i<r.length;i++){const a=r[i];s&&(a.oldValue=s[i].value);let l=a.dir[n];l&&(st(),$e(l,o,8,[e.el,a,e,t]),it())}}function bo(e,t){if(me){let o=me.provides;const n=me.parent&&me.parent.provides;n===o&&(o=me.provides=Object.create(n)),o[e]=t}}function je(e,t,o=!1){const n=Rl();if(n||Yt){let r=Yt?Yt._context.provides:n?n.parent==null||n.ce?n.vnode.appContext&&n.vnode.appContext.provides:n.parent.provides:void 0;if(r&&e in r)return r[e];if(arguments.length>1)return o&&k(t)?t.call(n&&n.proxy):t}}const Oa=Symbol.for("v-scx"),Ia=()=>je(Oa);function ao(e,t,o){return Bs(e,t,o)}function Bs(e,t,o=ee){const{immediate:n,deep:r,flush:s,once:i}=o,a=Ee({},o),l=t&&n||!t&&s!=="post";let p;if(Jt){if(s==="sync"){const f=Ia();p=f.__watcherHandles||(f.__watcherHandles=[])}else if(!l){const f=()=>{};return f.stop=Ke,f.resume=Ke,f.pause=Ke,f}}const d=me;a.call=(f,O,T)=>$e(f,d,O,T);let u=!1;s==="post"?a.scheduler=f=>{Oe(f,d&&d.suspense)}:s!=="sync"&&(u=!0,a.scheduler=(f,O)=>{O?f():Kn(f)}),a.augmentJob=f=>{t&&(f.flags|=4),u&&(f.flags|=2,d&&(f.id=d.uid,f.i=d))};const E=Sa(e,t,a);return Jt&&(p?p.push(E):l&&E()),E}function La(e,t,o){const n=this.proxy,r=ne(e)?e.includes(".")?Ws(n,e):()=>n[e]:e.bind(n,n);let s;k(t)?s=t:(s=t.handler,o=t);const i=Oo(this),a=Bs(r,s.bind(n),o);return i(),a}function Ws(e,t){const o=t.split(".");return()=>{let n=e;for(let r=0;r<o.length&&n;r++)n=n[o[r]];return n}}const Aa=Symbol("_vte"),_a=e=>e.__isTeleport,Ca=Symbol("_leaveCb");function Xn(e,t){e.shapeFlag&6&&e.component?(e.transition=t,Xn(e.component.subTree,t)):e.shapeFlag&128?(e.ssContent.transition=t.clone(e.ssContent),e.ssFallback.transition=t.clone(e.ssFallback)):e.transition=t}function Mt(e,t){return k(e)?Ee({name:e.name},t,{setup:e}):e}function $n(e){e.ids=[e.ids[0]+e.ids[2]+++"-",0,0]}function yr(e,t){let o;return!!((o=Object.getOwnPropertyDescriptor(e,t))&&!o.configurable)}const Ho=new WeakMap;function lo(e,t,o,n,r=!1){if(W(e)){e.forEach((T,x)=>lo(T,t&&(W(t)?t[x]:t),o,n,r));return}if(co(n)&&!r){n.shapeFlag&512&&n.type.__asyncResolved&&n.component.subTree.component&&lo(e,t,o,n.component.subTree);return}const s=n.shapeFlag&4?nr(n.component):n.el,i=r?null:s,{i:a,r:l}=e,p=t&&t.r,d=a.refs===ee?a.refs={}:a.refs,u=a.setupState,E=G(u),f=u===ee?as:T=>yr(d,T)?!1:J(E,T),O=(T,x)=>!(x&&yr(d,x));if(p!=null&&p!==l){if(gr(t),ne(p))d[p]=null,f(p)&&(u[p]=null);else if(fe(p)){const T=t;O(p,T.k)&&(p.value=null),T.k&&(d[T.k]=null)}}if(k(l))Ro(l,a,12,[i,d]);else{const T=ne(l),x=fe(l);if(T||x){const U=()=>{if(e.f){const _=T?f(l)?u[l]:d[l]:O()||!e.k?l.value:d[e.k];if(r)W(_)&&Hn(_,s);else if(W(_))_.includes(s)||_.push(s);else if(T)d[l]=[s],f(l)&&(u[l]=d[l]);else{const b=[s];O(l,e.k)&&(l.value=b),e.k&&(d[e.k]=b)}}else T?(d[l]=i,f(l)&&(u[l]=i)):x&&(O(l,e.k)&&(l.value=i),e.k&&(d[e.k]=i))};if(i){const _=()=>{U(),Ho.delete(e)};_.id=-1,Ho.set(e,_),Oe(_,o)}else gr(e),U()}}}function gr(e){const t=Ho.get(e);t&&(t.flags|=8,Ho.delete(e))}const Sr=e=>e.nodeType===8;jo().requestIdleCallback;jo().cancelIdleCallback;function ba(e,t){if(Sr(e)&&e.data==="["){let o=1,n=e.nextSibling;for(;n;){if(n.nodeType===1){if(t(n)===!1)break}else if(Sr(n))if(n.data==="]"){if(--o===0)break}else n.data==="["&&o++;n=n.nextSibling}}else t(e)}const co=e=>!!e.type.__asyncLoader;function iu(e){k(e)&&(e={loader:e});const{loader:t,loadingComponent:o,errorComponent:n,delay:r=200,hydrate:s,timeout:i,suspensible:a=!0,onError:l}=e;let p=null,d,u=0;const E=()=>(u++,p=null,f()),f=()=>{let O;return p||(O=p=t().catch(T=>{if(T=T instanceof Error?T:new Error(String(T)),l)return new Promise((x,U)=>{l(T,()=>x(E()),()=>U(T),u+1)});throw T}).then(T=>O!==p&&p?p:(T&&(T.__esModule||T[Symbol.toStringTag]==="Module")&&(T=T.default),d=T,T)))};return Mt({name:"AsyncComponentWrapper",__asyncLoader:f,__asyncHydrate(O,T,x){let U=!1;(T.bu||(T.bu=[])).push(()=>U=!0);const _=()=>{U||x()},b=s?()=>{const M=s(_,K=>ba(O,K));M&&(T.bum||(T.bum=[])).push(M)}:_;d?b():f().then(()=>!T.isUnmounted&&b())},get __asyncResolved(){return d},setup(){const O=me;if($n(O),d)return()=>Co(d,O);const T=b=>{p=null,No(b,O,13,!n)};if(a&&O.suspense||Jt)return f().then(b=>()=>Co(b,O)).catch(b=>(T(b),()=>n?de(n,{error:b}):null));const x=ft(!1),U=ft(),_=ft(!!r);return r&&setTimeout(()=>{_.value=!1},r),i!=null&&setTimeout(()=>{if(!x.value&&!U.value){const b=new Error(`Async component timed out after ${i}ms.`);T(b),U.value=b}},i),f().then(()=>{x.value=!0,O.parent&&zn(O.parent.vnode)&&O.parent.update()}).catch(b=>{T(b),U.value=b}),()=>{if(x.value&&d)return Co(d,O);if(U.value&&n)return de(n,{error:U.value});if(o&&!_.value)return Co(o,O)}}})}function Co(e,t){const{ref:o,props:n,children:r,ce:s}=t.vnode,i=de(e,n,r);return i.ref=o,i.ce=s,delete t.vnode.ce,i}const zn=e=>e.type.__isKeepAlive;function va(e,t){ks(e,"a",t)}function wa(e,t){ks(e,"da",t)}function ks(e,t,o=me){const n=e.__wdc||(e.__wdc=()=>{let r=o;for(;r;){if(r.isDeactivated)return;r=r.parent}return e()});if(Zo(t,n,o),o){let r=o.parent;for(;r&&r.parent;)zn(r.parent.vnode)&&xa(n,t,o,r),r=r.parent}}function xa(e,t,o,n){const r=Zo(t,e,n,!0);Qs(()=>{Hn(n[t],r)},o)}function Zo(e,t,o=me,n=!1){if(o){const r=o[e]||(o[e]=[]),s=t.__weh||(t.__weh=(...i)=>{st();const a=Oo(o),l=$e(t,o,e,i);return a(),it(),l});return n?r.unshift(s):r.push(s),s}}const lt=e=>(t,o=me)=>{(!Jt||e==="sp")&&Zo(e,(...n)=>t(...n),o)},Ma=lt("bm"),Vs=lt("m"),Ua=lt("bu"),Da=lt("u"),Fa=lt("bum"),Qs=lt("um"),Pa=lt("sp"),Ha=lt("rtg"),Ba=lt("rtc");function Wa(e,t=me){Zo("ec",e,t)}const Ys="components";function Zn(e,t){return Gs(Ys,e,!0,t)||e}const qs=Symbol.for("v-ndc");function au(e){return ne(e)?Gs(Ys,e,!1)||e:e||qs}function Gs(e,t,o=!0,n=!1){const r=we||me;if(r){const s=r.type;{const a=Al(s,!1);if(a&&(a===t||a===Re(t)||a===Ko(Re(t))))return s}const i=Tr(r[e]||s[e],t)||Tr(r.appContext[e],t);return!i&&n?s:i}}function Tr(e,t){return e&&(e[t]||e[Re(t)]||e[Ko(Re(t))])}function ka(e,t,o,n){let r;const s=o,i=W(e);if(i||ne(e)){const a=i&&vt(e);let l=!1,p=!1;a&&(l=!be(e),p=at(e),e=$o(e)),r=new Array(e.length);for(let d=0,u=e.length;d<u;d++)r[d]=t(l?p?qt(Me(e[d])):Me(e[d]):e[d],d,void 0,s)}else if(typeof e=="number"){r=new Array(e);for(let a=0;a<e;a++)r[a]=t(a+1,a,void 0,s)}else if(j(e))if(e[Symbol.iterator])r=Array.from(e,(a,l)=>t(a,l,void 0,s));else{const a=Object.keys(e);r=new Array(a.length);for(let l=0,p=a.length;l<p;l++){const d=a[l];r[l]=t(e[d],d,l,s)}}else r=[];return r}const An=e=>e?pi(e)?nr(e):An(e.parent):null,uo=Ee(Object.create(null),{$:e=>e,$el:e=>e.vnode.el,$data:e=>e.data,$props:e=>e.props,$attrs:e=>e.attrs,$slots:e=>e.slots,$refs:e=>e.refs,$parent:e=>An(e.parent),$root:e=>An(e.root),$host:e=>e.ce,$emit:e=>e.emit,$options:e=>Ks(e),$forceUpdate:e=>e.f||(e.f=()=>{Kn(e.update)}),$nextTick:e=>e.n||(e.n=Us.bind(e.proxy)),$watch:e=>La.bind(e)}),mn=(e,t)=>e!==ee&&!e.__isScriptSetup&&J(e,t),Va={get({_:e},t){if(t==="__v_skip")return!0;const{ctx:o,setupState:n,data:r,props:s,accessCache:i,type:a,appContext:l}=e;if(t[0]!=="$"){const E=i[t];if(E!==void 0)switch(E){case 1:return n[t];case 2:return r[t];case 4:return o[t];case 3:return s[t]}else{if(mn(n,t))return i[t]=1,n[t];if(r!==ee&&J(r,t))return i[t]=2,r[t];if(J(s,t))return i[t]=3,s[t];if(o!==ee&&J(o,t))return i[t]=4,o[t];_n&&(i[t]=0)}}const p=uo[t];let d,u;if(p)return t==="$attrs"&&he(e.attrs,"get",""),p(e);if((d=a.__cssModules)&&(d=d[t]))return d;if(o!==ee&&J(o,t))return i[t]=4,o[t];if(u=l.config.globalProperties,J(u,t))return u[t]},set({_:e},t,o){const{data:n,setupState:r,ctx:s}=e;return mn(r,t)?(r[t]=o,!0):n!==ee&&J(n,t)?(n[t]=o,!0):J(e.props,t)||t[0]==="$"&&t.slice(1)in e?!1:(s[t]=o,!0)},has({_:{data:e,setupState:t,accessCache:o,ctx:n,appContext:r,props:s,type:i}},a){let l;return!!(o[a]||e!==ee&&a[0]!=="$"&&J(e,a)||mn(t,a)||J(s,a)||J(n,a)||J(uo,a)||J(r.config.globalProperties,a)||(l=i.__cssModules)&&l[a])},defineProperty(e,t,o){return o.get!=null?e._.accessCache[t]=0:J(o,"value")&&this.set(e,t,o.value,null),Reflect.defineProperty(e,t,o)}};function Rr(e){return W(e)?e.reduce((t,o)=>(t[o]=null,t),{}):e}let _n=!0;function Qa(e){const t=Ks(e),o=e.proxy,n=e.ctx;_n=!1,t.beforeCreate&&Nr(t.beforeCreate,e,"bc");const{data:r,computed:s,methods:i,watch:a,provide:l,inject:p,created:d,beforeMount:u,mounted:E,beforeUpdate:f,updated:O,activated:T,deactivated:x,beforeDestroy:U,beforeUnmount:_,destroyed:b,unmounted:M,render:K,renderTracked:ce,renderTriggered:te,errorCaptured:De,serverPrefetch:dt,expose:Fe,inheritAttrs:ct,components:gt,directives:Pe,filters:Xt}=t;if(p&&Ya(p,n,null),i)for(const X in i){const Y=i[X];k(Y)&&(n[X]=Y.bind(o))}if(r){const X=r.call(o,o);j(X)&&(e.data=zo(X))}if(_n=!0,s)for(const X in s){const Y=s[X],ze=k(Y)?Y.bind(o,o):k(Y.get)?Y.get.bind(o,o):Ke,ut=!k(Y)&&k(Y.set)?Y.set.bind(o):Ke,He=le({get:ze,set:ut});Object.defineProperty(n,X,{enumerable:!0,configurable:!0,get:()=>He.value,set:Ne=>He.value=Ne})}if(a)for(const X in a)Js(a[X],n,o,X);if(l){const X=k(l)?l.call(o):l;Reflect.ownKeys(X).forEach(Y=>{bo(Y,X[Y])})}d&&Nr(d,e,"c");function ae(X,Y){W(Y)?Y.forEach(ze=>X(ze.bind(o))):Y&&X(Y.bind(o))}if(ae(Ma,u),ae(Vs,E),ae(Ua,f),ae(Da,O),ae(va,T),ae(wa,x),ae(Wa,De),ae(Ba,ce),ae(Ha,te),ae(Fa,_),ae(Qs,M),ae(Pa,dt),W(Fe))if(Fe.length){const X=e.exposed||(e.exposed={});Fe.forEach(Y=>{Object.defineProperty(X,Y,{get:()=>o[Y],set:ze=>o[Y]=ze,enumerable:!0})})}else e.exposed||(e.exposed={});K&&e.render===Ke&&(e.render=K),ct!=null&&(e.inheritAttrs=ct),gt&&(e.components=gt),Pe&&(e.directives=Pe),dt&&$n(e)}function Ya(e,t,o=Ke){W(e)&&(e=Cn(e));for(const n in e){const r=e[n];let s;j(r)?"default"in r?s=je(r.from||n,r.default,!0):s=je(r.from||n):s=je(r),fe(s)?Object.defineProperty(t,n,{enumerable:!0,configurable:!0,get:()=>s.value,set:i=>s.value=i}):t[n]=s}}function Nr(e,t,o){$e(W(e)?e.map(n=>n.bind(t.proxy)):e.bind(t.proxy),t,o)}function Js(e,t,o,n){let r=n.includes(".")?Ws(o,n):()=>o[n];if(ne(e)){const s=t[e];k(s)&&ao(r,s)}else if(k(e))ao(r,e.bind(o));else if(j(e))if(W(e))e.forEach(s=>Js(s,t,o,n));else{const s=k(e.handler)?e.handler.bind(o):t[e.handler];k(s)&&ao(r,s,e)}}function Ks(e){const t=e.type,{mixins:o,extends:n}=t,{mixins:r,optionsCache:s,config:{optionMergeStrategies:i}}=e.appContext,a=s.get(t);let l;return a?l=a:!r.length&&!o&&!n?l=t:(l={},r.length&&r.forEach(p=>Bo(l,p,i,!0)),Bo(l,t,i)),j(t)&&s.set(t,l),l}function Bo(e,t,o,n=!1){const{mixins:r,extends:s}=t;s&&Bo(e,s,o,!0),r&&r.forEach(i=>Bo(e,i,o,!0));for(const i in t)if(!(n&&i==="expose")){const a=qa[i]||o&&o[i];e[i]=a?a(e[i],t[i]):t[i]}return e}const qa={data:Or,props:Ir,emits:Ir,methods:oo,computed:oo,beforeCreate:ye,created:ye,beforeMount:ye,mounted:ye,beforeUpdate:ye,updated:ye,beforeDestroy:ye,beforeUnmount:ye,destroyed:ye,unmounted:ye,activated:ye,deactivated:ye,errorCaptured:ye,serverPrefetch:ye,components:oo,directives:oo,watch:Ja,provide:Or,inject:Ga};function Or(e,t){return t?e?function(){return Ee(k(e)?e.call(this,this):e,k(t)?t.call(this,this):t)}:t:e}function Ga(e,t){return oo(Cn(e),Cn(t))}function Cn(e){if(W(e)){const t={};for(let o=0;o<e.length;o++)t[e[o]]=e[o];return t}return e}function ye(e,t){return e?[...new Set([].concat(e,t))]:t}function oo(e,t){return e?Ee(Object.create(null),e,t):t}function Ir(e,t){return e?W(e)&&W(t)?[...new Set([...e,...t])]:Ee(Object.create(null),Rr(e),Rr(t??{})):t}function Ja(e,t){if(!e)return t;if(!t)return e;const o=Ee(Object.create(null),e);for(const n in t)o[n]=ye(e[n],t[n]);return o}function js(){return{app:null,config:{isNativeTag:as,performance:!1,globalProperties:{},optionMergeStrategies:{},errorHandler:void 0,warnHandler:void 0,compilerOptions:{}},mixins:[],components:{},directives:{},provides:Object.create(null),optionsCache:new WeakMap,propsCache:new WeakMap,emitsCache:new WeakMap}}let Ka=0;function ja(e,t){return function(n,r=null){k(n)||(n=Ee({},n)),r!=null&&!j(r)&&(r=null);const s=js(),i=new WeakSet,a=[];let l=!1;const p=s.app={_uid:Ka++,_component:n,_props:r,_container:null,_context:s,_instance:null,version:Cl,get config(){return s.config},set config(d){},use(d,...u){return i.has(d)||(d&&k(d.install)?(i.add(d),d.install(p,...u)):k(d)&&(i.add(d),d(p,...u))),p},mixin(d){return s.mixins.includes(d)||s.mixins.push(d),p},component(d,u){return u?(s.components[d]=u,p):s.components[d]},directive(d,u){return u?(s.directives[d]=u,p):s.directives[d]},mount(d,u,E){if(!l){const f=p._ceVNode||de(n,r);return f.appContext=s,E===!0?E="svg":E===!1&&(E=void 0),e(f,d,E),l=!0,p._container=d,d.__vue_app__=p,nr(f.component)}},onUnmount(d){a.push(d)},unmount(){l&&($e(a,p._instance,16),e(null,p._container),delete p._container.__vue_app__)},provide(d,u){return s.provides[d]=u,p},runWithContext(d){const u=Yt;Yt=p;try{return d()}finally{Yt=u}}};return p}}let Yt=null;const Xa=(e,t)=>t==="modelValue"||t==="model-value"?e.modelModifiers:e[`${t}Modifiers`]||e[`${Re(t)}Modifiers`]||e[`${xt(t)}Modifiers`];function $a(e,t,...o){if(e.isUnmounted)return;const n=e.vnode.props||ee;let r=o;const s=t.startsWith("update:"),i=s&&Xa(n,t.slice(7));i&&(i.trim&&(r=o.map(d=>ne(d)?d.trim():d)),i.number&&(r=o.map(Hi)));let a,l=n[a=an(t)]||n[a=an(Re(t))];!l&&s&&(l=n[a=an(xt(t))]),l&&$e(l,e,6,r);const p=n[a+"Once"];if(p){if(!e.emitted)e.emitted={};else if(e.emitted[a])return;e.emitted[a]=!0,$e(p,e,6,r)}}const za=new WeakMap;function Xs(e,t,o=!1){const n=o?za:t.emitsCache,r=n.get(e);if(r!==void 0)return r;const s=e.emits;let i={},a=!1;if(!k(e)){const l=p=>{const d=Xs(p,t,!0);d&&(a=!0,Ee(i,d))};!o&&t.mixins.length&&t.mixins.forEach(l),e.extends&&l(e.extends),e.mixins&&e.mixins.forEach(l)}return!s&&!a?(j(e)&&n.set(e,null),null):(W(s)?s.forEach(l=>i[l]=null):Ee(i,s),j(e)&&n.set(e,i),i)}function en(e,t){return!e||!qo(t)?!1:(t=t.slice(2).replace(/Once$/,""),J(e,t[0].toLowerCase()+t.slice(1))||J(e,xt(t))||J(e,t))}function Lr(e){const{type:t,vnode:o,proxy:n,withProxy:r,propsOptions:[s],slots:i,attrs:a,emit:l,render:p,renderCache:d,props:u,data:E,setupState:f,ctx:O,inheritAttrs:T}=e,x=Po(e);let U,_;try{if(o.shapeFlag&4){const M=r||n,K=M;U=Ge(p.call(K,M,d,u,f,E,O)),_=a}else{const M=t;U=Ge(M.length>1?M(u,{attrs:a,slots:i,emit:l}):M(u,null)),_=t.props?a:Za(a)}}catch(M){po.length=0,No(M,e,1),U=de(yt)}let b=U;if(_&&T!==!1){const M=Object.keys(_),{shapeFlag:K}=b;M.length&&K&7&&(s&&M.some(Go)&&(_=el(_,s)),b=Gt(b,_,!1,!0))}return o.dirs&&(b=Gt(b,null,!1,!0),b.dirs=b.dirs?b.dirs.concat(o.dirs):o.dirs),o.transition&&Xn(b,o.transition),U=b,Po(x),U}const Za=e=>{let t;for(const o in e)(o==="class"||o==="style"||qo(o))&&((t||(t={}))[o]=e[o]);return t},el=(e,t)=>{const o={};for(const n in e)(!Go(n)||!(n.slice(9)in t))&&(o[n]=e[n]);return o};function tl(e,t,o){const{props:n,children:r,component:s}=e,{props:i,children:a,patchFlag:l}=t,p=s.emitsOptions;if(t.dirs||t.transition)return!0;if(o&&l>=0){if(l&1024)return!0;if(l&16)return n?Ar(n,i,p):!!i;if(l&8){const d=t.dynamicProps;for(let u=0;u<d.length;u++){const E=d[u];if($s(i,n,E)&&!en(p,E))return!0}}}else return(r||a)&&(!a||!a.$stable)?!0:n===i?!1:n?i?Ar(n,i,p):!0:!!i;return!1}function Ar(e,t,o){const n=Object.keys(t);if(n.length!==Object.keys(e).length)return!0;for(let r=0;r<n.length;r++){const s=n[r];if($s(t,e,s)&&!en(o,s))return!0}return!1}function $s(e,t,o){const n=e[o],r=t[o];return o==="style"&&j(n)&&j(r)?!Wn(n,r):n!==r}function ol({vnode:e,parent:t,suspense:o},n){for(;t;){const r=t.subTree;if(r.suspense&&r.suspense.activeBranch===e&&(r.suspense.vnode.el=r.el=n,e=r),r===e)(e=t.vnode).el=n,t=t.parent;else break}o&&o.activeBranch===e&&(o.vnode.el=n)}const zs={},Zs=()=>Object.create(zs),ei=e=>Object.getPrototypeOf(e)===zs;function nl(e,t,o,n=!1){const r={},s=Zs();e.propsDefaults=Object.create(null),ti(e,t,r,s);for(const i in e.propsOptions[0])i in r||(r[i]=void 0);o?e.props=n?r:vs(r):e.type.props?e.props=r:e.props=s,e.attrs=s}function rl(e,t,o,n){const{props:r,attrs:s,vnode:{patchFlag:i}}=e,a=G(r),[l]=e.propsOptions;let p=!1;if((n||i>0)&&!(i&16)){if(i&8){const d=e.vnode.dynamicProps;for(let u=0;u<d.length;u++){let E=d[u];if(en(e.emitsOptions,E))continue;const f=t[E];if(l)if(J(s,E))f!==s[E]&&(s[E]=f,p=!0);else{const O=Re(E);r[O]=bn(l,a,O,f,e,!1)}else f!==s[E]&&(s[E]=f,p=!0)}}}else{ti(e,t,r,s)&&(p=!0);let d;for(const u in a)(!t||!J(t,u)&&((d=xt(u))===u||!J(t,d)))&&(l?o&&(o[u]!==void 0||o[d]!==void 0)&&(r[u]=bn(l,a,u,void 0,e,!0)):delete r[u]);if(s!==a)for(const u in s)(!t||!J(t,u))&&(delete s[u],p=!0)}p&&nt(e.attrs,"set","")}function ti(e,t,o,n){const[r,s]=e.propsOptions;let i=!1,a;if(t)for(let l in t){if(ro(l))continue;const p=t[l];let d;r&&J(r,d=Re(l))?!s||!s.includes(d)?o[d]=p:(a||(a={}))[d]=p:en(e.emitsOptions,l)||(!(l in n)||p!==n[l])&&(n[l]=p,i=!0)}if(s){const l=G(o),p=a||ee;for(let d=0;d<s.length;d++){const u=s[d];o[u]=bn(r,l,u,p[u],e,!J(p,u))}}return i}function bn(e,t,o,n,r,s){const i=e[o];if(i!=null){const a=J(i,"default");if(a&&n===void 0){const l=i.default;if(i.type!==Function&&!i.skipFactory&&k(l)){const{propsDefaults:p}=r;if(o in p)n=p[o];else{const d=Oo(r);n=p[o]=l.call(null,t),d()}}else n=l;r.ce&&r.ce._setProp(o,n)}i[0]&&(s&&!a?n=!1:i[1]&&(n===""||n===xt(o))&&(n=!0))}return n}const sl=new WeakMap;function oi(e,t,o=!1){const n=o?sl:t.propsCache,r=n.get(e);if(r)return r;const s=e.props,i={},a=[];let l=!1;if(!k(e)){const d=u=>{l=!0;const[E,f]=oi(u,t,!0);Ee(i,E),f&&a.push(...f)};!o&&t.mixins.length&&t.mixins.forEach(d),e.extends&&d(e.extends),e.mixins&&e.mixins.forEach(d)}if(!s&&!l)return j(e)&&n.set(e,kt),kt;if(W(s))for(let d=0;d<s.length;d++){const u=Re(s[d]);_r(u)&&(i[u]=ee)}else if(s)for(const d in s){const u=Re(d);if(_r(u)){const E=s[d],f=i[u]=W(E)||k(E)?{type:E}:Ee({},E),O=f.type;let T=!1,x=!0;if(W(O))for(let U=0;U<O.length;++U){const _=O[U],b=k(_)&&_.name;if(b==="Boolean"){T=!0;break}else b==="String"&&(x=!1)}else T=k(O)&&O.name==="Boolean";f[0]=T,f[1]=x,(T||J(f,"default"))&&a.push(u)}}const p=[i,a];return j(e)&&n.set(e,p),p}function _r(e){return e[0]!=="$"&&!ro(e)}const er=e=>e==="_"||e==="_ctx"||e==="$stable",tr=e=>W(e)?e.map(Ge):[Ge(e)],il=(e,t,o)=>{if(t._n)return t;const n=jn((...r)=>tr(t(...r)),o);return n._c=!1,n},ni=(e,t,o)=>{const n=e._ctx;for(const r in e){if(er(r))continue;const s=e[r];if(k(s))t[r]=il(r,s,n);else if(s!=null){const i=tr(s);t[r]=()=>i}}},ri=(e,t)=>{const o=tr(t);e.slots.default=()=>o},si=(e,t,o)=>{for(const n in t)(o||!er(n))&&(e[n]=t[n])},al=(e,t,o)=>{const n=e.slots=Zs();if(e.vnode.shapeFlag&32){const r=t._;r?(si(n,t,o),o&&ps(n,"_",r,!0)):ni(t,n)}else t&&ri(e,t)},ll=(e,t,o)=>{const{vnode:n,slots:r}=e;let s=!0,i=ee;if(n.shapeFlag&32){const a=t._;a?o&&a===1?s=!1:si(r,t,o):(s=!t.$stable,ni(t,r)),i=t}else t&&(ri(e,t),i={default:1});if(s)for(const a in r)!er(a)&&i[a]==null&&delete r[a]},Oe=ml;function dl(e){return cl(e)}function cl(e,t){const o=jo();o.__VUE__=!0;const{insert:n,remove:r,patchProp:s,createElement:i,createText:a,createComment:l,setText:p,setElementText:d,parentNode:u,nextSibling:E,setScopeId:f=Ke,insertStaticContent:O}=e,T=(c,m,h,y=null,R=null,g=null,A=void 0,L=null,I=!!m.dynamicChildren)=>{if(c===m)return;c&&!Zt(c,m)&&(y=S(c),Ne(c,R,g,!0),c=null),m.patchFlag===-2&&(I=!1,m.dynamicChildren=null);const{type:N,ref:P,shapeFlag:v}=m;switch(N){case tn:x(c,m,h,y);break;case yt:U(c,m,h,y);break;case vo:c==null&&_(m,h,y,A);break;case qe:gt(c,m,h,y,R,g,A,L,I);break;default:v&1?K(c,m,h,y,R,g,A,L,I):v&6?Pe(c,m,h,y,R,g,A,L,I):(v&64||v&128)&&N.process(c,m,h,y,R,g,A,L,I,D)}P!=null&&R?lo(P,c&&c.ref,g,m||c,!m):P==null&&c&&c.ref!=null&&lo(c.ref,null,g,c,!0)},x=(c,m,h,y)=>{if(c==null)n(m.el=a(m.children),h,y);else{const R=m.el=c.el;m.children!==c.children&&p(R,m.children)}},U=(c,m,h,y)=>{c==null?n(m.el=l(m.children||""),h,y):m.el=c.el},_=(c,m,h,y)=>{[c.el,c.anchor]=O(c.children,m,h,y,c.el,c.anchor)},b=({el:c,anchor:m},h,y)=>{let R;for(;c&&c!==m;)R=E(c),n(c,h,y),c=R;n(m,h,y)},M=({el:c,anchor:m})=>{let h;for(;c&&c!==m;)h=E(c),r(c),c=h;r(m)},K=(c,m,h,y,R,g,A,L,I)=>{if(m.type==="svg"?A="svg":m.type==="math"&&(A="mathml"),c==null)ce(m,h,y,R,g,A,L,I);else{const N=c.el&&c.el._isVueCE?c.el:null;try{N&&N._beginPatch(),dt(c,m,R,g,A,L,I)}finally{N&&N._endPatch()}}},ce=(c,m,h,y,R,g,A,L)=>{let I,N;const{props:P,shapeFlag:v,transition:F,dirs:B}=c;if(I=c.el=i(c.type,g,P&&P.is,P),v&8?d(I,c.children):v&16&&De(c.children,I,null,y,R,En(c,g),A,L),B&&Tt(c,null,y,"created"),te(I,c,c.scopeId,A,y),P){for(const $ in P)$!=="value"&&!ro($)&&s(I,$,null,P[$],g,y);"value"in P&&s(I,"value",null,P.value,g),(N=P.onVnodeBeforeMount)&&Ve(N,y,c)}B&&Tt(c,null,y,"beforeMount");const Q=ul(R,F);Q&&F.beforeEnter(I),n(I,m,h),((N=P&&P.onVnodeMounted)||Q||B)&&Oe(()=>{try{N&&Ve(N,y,c),Q&&F.enter(I),B&&Tt(c,null,y,"mounted")}finally{}},R)},te=(c,m,h,y,R)=>{if(h&&f(c,h),y)for(let g=0;g<y.length;g++)f(c,y[g]);if(R){let g=R.subTree;if(m===g||di(g.type)&&(g.ssContent===m||g.ssFallback===m)){const A=R.vnode;te(c,A,A.scopeId,A.slotScopeIds,R.parent)}}},De=(c,m,h,y,R,g,A,L,I=0)=>{for(let N=I;N<c.length;N++){const P=c[N]=L?ot(c[N]):Ge(c[N]);T(null,P,m,h,y,R,g,A,L)}},dt=(c,m,h,y,R,g,A)=>{const L=m.el=c.el;let{patchFlag:I,dynamicChildren:N,dirs:P}=m;I|=c.patchFlag&16;const v=c.props||ee,F=m.props||ee;let B;if(h&&Rt(h,!1),(B=F.onVnodeBeforeUpdate)&&Ve(B,h,m,c),P&&Tt(m,c,h,"beforeUpdate"),h&&Rt(h,!0),(v.innerHTML&&F.innerHTML==null||v.textContent&&F.textContent==null)&&d(L,""),N?Fe(c.dynamicChildren,N,L,h,y,En(m,R),g):A||Y(c,m,L,null,h,y,En(m,R),g,!1),I>0){if(I&16)ct(L,v,F,h,R);else if(I&2&&v.class!==F.class&&s(L,"class",null,F.class,R),I&4&&s(L,"style",v.style,F.style,R),I&8){const Q=m.dynamicProps;for(let $=0;$<Q.length;$++){const z=Q[$],re=v[z],ue=F[z];(ue!==re||z==="value")&&s(L,z,re,ue,R,h)}}I&1&&c.children!==m.children&&d(L,m.children)}else!A&&N==null&&ct(L,v,F,h,R);((B=F.onVnodeUpdated)||P)&&Oe(()=>{B&&Ve(B,h,m,c),P&&Tt(m,c,h,"updated")},y)},Fe=(c,m,h,y,R,g,A)=>{for(let L=0;L<m.length;L++){const I=c[L],N=m[L],P=I.el&&(I.type===qe||!Zt(I,N)||I.shapeFlag&198)?u(I.el):h;T(I,N,P,null,y,R,g,A,!0)}},ct=(c,m,h,y,R)=>{if(m!==h){if(m!==ee)for(const g in m)!ro(g)&&!(g in h)&&s(c,g,m[g],null,R,y);for(const g in h){if(ro(g))continue;const A=h[g],L=m[g];A!==L&&g!=="value"&&s(c,g,L,A,R,y)}"value"in h&&s(c,"value",m.value,h.value,R)}},gt=(c,m,h,y,R,g,A,L,I)=>{const N=m.el=c?c.el:a(""),P=m.anchor=c?c.anchor:a("");let{patchFlag:v,dynamicChildren:F,slotScopeIds:B}=m;B&&(L=L?L.concat(B):B),c==null?(n(N,h,y),n(P,h,y),De(m.children||[],h,P,R,g,A,L,I)):v>0&&v&64&&F&&c.dynamicChildren&&c.dynamicChildren.length===F.length?(Fe(c.dynamicChildren,F,h,R,g,A,L),(m.key!=null||R&&m===R.subTree)&&ii(c,m,!0)):Y(c,m,h,P,R,g,A,L,I)},Pe=(c,m,h,y,R,g,A,L,I)=>{m.slotScopeIds=L,c==null?m.shapeFlag&512?R.ctx.activate(m,h,y,A,I):Xt(m,h,y,R,g,A,I):Ut(c,m,I)},Xt=(c,m,h,y,R,g,A)=>{const L=c.component=Tl(c,y,R);if(zn(c)&&(L.ctx.renderer=D),Nl(L,!1,A),L.asyncDep){if(R&&R.registerDep(L,ae,A),!c.el){const I=L.subTree=de(yt);U(null,I,m,h),c.placeholder=I.el}}else ae(L,c,m,h,R,g,A)},Ut=(c,m,h)=>{const y=m.component=c.component;if(tl(c,m,h))if(y.asyncDep&&!y.asyncResolved){X(y,m,h);return}else y.next=m,y.update();else m.el=c.el,y.vnode=m},ae=(c,m,h,y,R,g,A)=>{const L=()=>{if(c.isMounted){let{next:v,bu:F,u:B,parent:Q,vnode:$}=c;{const We=ai(c);if(We){v&&(v.el=$.el,X(c,v,A)),We.asyncDep.then(()=>{Oe(()=>{c.isUnmounted||N()},R)});return}}let z=v,re;Rt(c,!1),v?(v.el=$.el,X(c,v,A)):v=$,F&&ln(F),(re=v.props&&v.props.onVnodeBeforeUpdate)&&Ve(re,Q,v,$),Rt(c,!0);const ue=Lr(c),Be=c.subTree;c.subTree=ue,T(Be,ue,u(Be.el),S(Be),c,R,g),v.el=ue.el,z===null&&ol(c,ue.el),B&&Oe(B,R),(re=v.props&&v.props.onVnodeUpdated)&&Oe(()=>Ve(re,Q,v,$),R)}else{let v;const{el:F,props:B}=m,{bm:Q,m:$,parent:z,root:re,type:ue}=c,Be=co(m);Rt(c,!1),Q&&ln(Q),!Be&&(v=B&&B.onVnodeBeforeMount)&&Ve(v,z,m),Rt(c,!0);{re.ce&&re.ce._hasShadowRoot()&&re.ce._injectChildStyle(ue,c.parent?c.parent.type:void 0);const We=c.subTree=Lr(c);T(null,We,h,y,c,R,g),m.el=We.el}if($&&Oe($,R),!Be&&(v=B&&B.onVnodeMounted)){const We=m;Oe(()=>Ve(v,z,We),R)}(m.shapeFlag&256||z&&co(z.vnode)&&z.vnode.shapeFlag&256)&&c.a&&Oe(c.a,R),c.isMounted=!0,m=h=y=null}};c.scope.on();const I=c.effect=new fs(L);c.scope.off();const N=c.update=I.run.bind(I),P=c.job=I.runIfDirty.bind(I);P.i=c,P.id=c.uid,I.scheduler=()=>Kn(P),Rt(c,!0),N()},X=(c,m,h)=>{m.component=c;const y=c.vnode.props;c.vnode=m,c.next=null,rl(c,m.props,y,h),ll(c,m.children,h),st(),fr(c),it()},Y=(c,m,h,y,R,g,A,L,I=!1)=>{const N=c&&c.children,P=c?c.shapeFlag:0,v=m.children,{patchFlag:F,shapeFlag:B}=m;if(F>0){if(F&128){ut(N,v,h,y,R,g,A,L,I);return}else if(F&256){ze(N,v,h,y,R,g,A,L,I);return}}B&8?(P&16&&_e(N,R,g),v!==N&&d(h,v)):P&16?B&16?ut(N,v,h,y,R,g,A,L,I):_e(N,R,g,!0):(P&8&&d(h,""),B&16&&De(v,h,y,R,g,A,L,I))},ze=(c,m,h,y,R,g,A,L,I)=>{c=c||kt,m=m||kt;const N=c.length,P=m.length,v=Math.min(N,P);let F;for(F=0;F<v;F++){const B=m[F]=I?ot(m[F]):Ge(m[F]);T(c[F],B,h,null,R,g,A,L,I)}N>P?_e(c,R,g,!0,!1,v):De(m,h,y,R,g,A,L,I,v)},ut=(c,m,h,y,R,g,A,L,I)=>{let N=0;const P=m.length;let v=c.length-1,F=P-1;for(;N<=v&&N<=F;){const B=c[N],Q=m[N]=I?ot(m[N]):Ge(m[N]);if(Zt(B,Q))T(B,Q,h,null,R,g,A,L,I);else break;N++}for(;N<=v&&N<=F;){const B=c[v],Q=m[F]=I?ot(m[F]):Ge(m[F]);if(Zt(B,Q))T(B,Q,h,null,R,g,A,L,I);else break;v--,F--}if(N>v){if(N<=F){const B=F+1,Q=B<P?m[B].el:y;for(;N<=F;)T(null,m[N]=I?ot(m[N]):Ge(m[N]),h,Q,R,g,A,L,I),N++}}else if(N>F)for(;N<=v;)Ne(c[N],R,g,!0),N++;else{const B=N,Q=N,$=new Map;for(N=Q;N<=F;N++){const Le=m[N]=I?ot(m[N]):Ge(m[N]);Le.key!=null&&$.set(Le.key,N)}let z,re=0;const ue=F-Q+1;let Be=!1,We=0;const $t=new Array(ue);for(N=0;N<ue;N++)$t[N]=0;for(N=B;N<=v;N++){const Le=c[N];if(re>=ue){Ne(Le,R,g,!0);continue}let ke;if(Le.key!=null)ke=$.get(Le.key);else for(z=Q;z<=F;z++)if($t[z-Q]===0&&Zt(Le,m[z])){ke=z;break}ke===void 0?Ne(Le,R,g,!0):($t[ke-Q]=N+1,ke>=We?We=ke:Be=!0,T(Le,m[ke],h,null,R,g,A,L,I),re++)}const lr=Be?pl($t):kt;for(z=lr.length-1,N=ue-1;N>=0;N--){const Le=Q+N,ke=m[Le],dr=m[Le+1],cr=Le+1<P?dr.el||li(dr):y;$t[N]===0?T(null,ke,h,cr,R,g,A,L,I):Be&&(z<0||N!==lr[z]?He(ke,h,cr,2):z--)}}},He=(c,m,h,y,R=null)=>{const{el:g,type:A,transition:L,children:I,shapeFlag:N}=c;if(N&6){He(c.component.subTree,m,h,y);return}if(N&128){c.suspense.move(m,h,y);return}if(N&64){A.move(c,m,h,D);return}if(A===qe){n(g,m,h);for(let v=0;v<I.length;v++)He(I[v],m,h,y);n(c.anchor,m,h);return}if(A===vo){b(c,m,h);return}if(y!==2&&N&1&&L)if(y===0)L.beforeEnter(g),n(g,m,h),Oe(()=>L.enter(g),R);else{const{leave:v,delayLeave:F,afterLeave:B}=L,Q=()=>{c.ctx.isUnmounted?r(g):n(g,m,h)},$=()=>{g._isLeaving&&g[Ca](!0),v(g,()=>{Q(),B&&B()})};F?F(g,Q,$):$()}else n(g,m,h)},Ne=(c,m,h,y=!1,R=!1)=>{const{type:g,props:A,ref:L,children:I,dynamicChildren:N,shapeFlag:P,patchFlag:v,dirs:F,cacheIndex:B,memo:Q}=c;if(v===-2&&(R=!1),L!=null&&(st(),lo(L,null,h,c,!0),it()),B!=null&&(m.renderCache[B]=void 0),P&256){m.ctx.deactivate(c);return}const $=P&1&&F,z=!co(c);let re;if(z&&(re=A&&A.onVnodeBeforeUnmount)&&Ve(re,m,c),P&6)St(c.component,h,y);else{if(P&128){c.suspense.unmount(h,y);return}$&&Tt(c,null,m,"beforeUnmount"),P&64?c.type.remove(c,m,h,D,y):N&&!N.hasOnce&&(g!==qe||v>0&&v&64)?_e(N,m,h,!1,!0):(g===qe&&v&384||!R&&P&16)&&_e(I,m,h),y&&Dt(c)}const ue=Q!=null&&B==null;(z&&(re=A&&A.onVnodeUnmounted)||$||ue)&&Oe(()=>{re&&Ve(re,m,c),$&&Tt(c,null,m,"unmounted"),ue&&(c.el=null)},h)},Dt=c=>{const{type:m,el:h,anchor:y,transition:R}=c;if(m===qe){Ft(h,y);return}if(m===vo){M(c);return}const g=()=>{r(h),R&&!R.persisted&&R.afterLeave&&R.afterLeave()};if(c.shapeFlag&1&&R&&!R.persisted){const{leave:A,delayLeave:L}=R,I=()=>A(h,g);L?L(c.el,g,I):I()}else g()},Ft=(c,m)=>{let h;for(;c!==m;)h=E(c),r(c),c=h;r(m)},St=(c,m,h)=>{const{bum:y,scope:R,job:g,subTree:A,um:L,m:I,a:N}=c;Cr(I),Cr(N),y&&ln(y),R.stop(),g&&(g.flags|=8,Ne(A,c,m,h)),L&&Oe(L,m),Oe(()=>{c.isUnmounted=!0},m)},_e=(c,m,h,y=!1,R=!1,g=0)=>{for(let A=g;A<c.length;A++)Ne(c[A],m,h,y,R)},S=c=>{if(c.shapeFlag&6)return S(c.component.subTree);if(c.shapeFlag&128)return c.suspense.next();const m=E(c.anchor||c.el),h=m&&m[Aa];return h?E(h):m};let w=!1;const C=(c,m,h)=>{let y;c==null?m._vnode&&(Ne(m._vnode,null,null,!0),y=m._vnode.component):T(m._vnode||null,c,m,null,null,null,h),m._vnode=c,w||(w=!0,fr(y),Fs(),w=!1)},D={p:T,um:Ne,m:He,r:Dt,mt:Xt,mc:De,pc:Y,pbc:Fe,n:S,o:e};return{render:C,hydrate:void 0,createApp:ja(C)}}function En({type:e,props:t},o){return o==="svg"&&e==="foreignObject"||o==="mathml"&&e==="annotation-xml"&&t&&t.encoding&&t.encoding.includes("html")?void 0:o}function Rt({effect:e,job:t},o){o?(e.flags|=32,t.flags|=4):(e.flags&=-33,t.flags&=-5)}function ul(e,t){return(!e||e&&!e.pendingBranch)&&t&&!t.persisted}function ii(e,t,o=!1){const n=e.children,r=t.children;if(W(n)&&W(r))for(let s=0;s<n.length;s++){const i=n[s];let a=r[s];a.shapeFlag&1&&!a.dynamicChildren&&((a.patchFlag<=0||a.patchFlag===32)&&(a=r[s]=ot(r[s]),a.el=i.el),!o&&a.patchFlag!==-2&&ii(i,a)),a.type===tn&&(a.patchFlag===-1&&(a=r[s]=ot(a)),a.el=i.el),a.type===yt&&!a.el&&(a.el=i.el)}}function pl(e){const t=e.slice(),o=[0];let n,r,s,i,a;const l=e.length;for(n=0;n<l;n++){const p=e[n];if(p!==0){if(r=o[o.length-1],e[r]<p){t[n]=r,o.push(n);continue}for(s=0,i=o.length-1;s<i;)a=s+i>>1,e[o[a]]<p?s=a+1:i=a;p<e[o[s]]&&(s>0&&(t[n]=o[s-1]),o[s]=n)}}for(s=o.length,i=o[s-1];s-- >0;)o[s]=i,i=t[i];return o}function ai(e){const t=e.subTree.component;if(t)return t.asyncDep&&!t.asyncResolved?t:ai(t)}function Cr(e){if(e)for(let t=0;t<e.length;t++)e[t].flags|=8}function li(e){if(e.placeholder)return e.placeholder;const t=e.component;return t?li(t.subTree):null}const di=e=>e.__isSuspense;function ml(e,t){t&&t.pendingBranch?W(e)?t.effects.push(...e):t.effects.push(e):Na(e)}const qe=Symbol.for("v-fgt"),tn=Symbol.for("v-txt"),yt=Symbol.for("v-cmt"),vo=Symbol.for("v-stc"),po=[];let Ae=null;function Ce(e=!1){po.push(Ae=e?null:[])}function El(){po.pop(),Ae=po[po.length-1]||null}let yo=1;function Wo(e,t=!1){yo+=e,e<0&&Ae&&t&&(Ae.hasOnce=!0)}function ci(e){return e.dynamicChildren=yo>0?Ae||kt:null,El(),yo>0&&Ae&&Ae.push(e),e}function wt(e,t,o,n,r,s){return ci(H(e,t,o,n,r,s,!0))}function go(e,t,o,n,r){return ci(de(e,t,o,n,r,!0))}function ko(e){return e?e.__v_isVNode===!0:!1}function Zt(e,t){return e.type===t.type&&e.key===t.key}const ui=({key:e})=>e??null,wo=({ref:e,ref_key:t,ref_for:o})=>(typeof e=="number"&&(e=""+e),e!=null?ne(e)||fe(e)||k(e)?{i:we,r:e,k:t,f:!!o}:e:null);function H(e,t=null,o=null,n=0,r=null,s=e===qe?0:1,i=!1,a=!1){const l={__v_isVNode:!0,__v_skip:!0,type:e,props:t,key:t&&ui(t),ref:t&&wo(t),scopeId:Hs,slotScopeIds:null,children:o,component:null,suspense:null,ssContent:null,ssFallback:null,dirs:null,transition:null,el:null,anchor:null,target:null,targetStart:null,targetAnchor:null,staticCount:0,shapeFlag:s,patchFlag:n,dynamicProps:r,dynamicChildren:null,appContext:null,ctx:we};return a?(or(l,o),s&128&&e.normalize(l)):o&&(l.shapeFlag|=ne(o)?8:16),yo>0&&!i&&Ae&&(l.patchFlag>0||s&6)&&l.patchFlag!==32&&Ae.push(l),l}const de=hl;function hl(e,t=null,o=null,n=0,r=null,s=!1){if((!e||e===qs)&&(e=yt),ko(e)){const a=Gt(e,t,!0);return o&&or(a,o),yo>0&&!s&&Ae&&(a.shapeFlag&6?Ae[Ae.indexOf(e)]=a:Ae.push(a)),a.patchFlag=-2,a}if(_l(e)&&(e=e.__vccOpts),t){t=fl(t);let{class:a,style:l}=t;a&&!ne(a)&&(t.class=Xo(a)),j(l)&&(Jn(l)&&!W(l)&&(l=Ee({},l)),t.style=_t(l))}const i=ne(e)?1:di(e)?128:_a(e)?64:j(e)?4:k(e)?2:0;return H(e,t,o,n,r,i,s,!0)}function fl(e){return e?Jn(e)||ei(e)?Ee({},e):e:null}function Gt(e,t,o=!1,n=!1){const{props:r,ref:s,patchFlag:i,children:a,transition:l}=e,p=t?yl(r||{},t):r,d={__v_isVNode:!0,__v_skip:!0,type:e.type,props:p,key:p&&ui(p),ref:t&&t.ref?o&&s?W(s)?s.concat(wo(t)):[s,wo(t)]:wo(t):s,scopeId:e.scopeId,slotScopeIds:e.slotScopeIds,children:a,target:e.target,targetStart:e.targetStart,targetAnchor:e.targetAnchor,staticCount:e.staticCount,shapeFlag:e.shapeFlag,patchFlag:t&&e.type!==qe?i===-1?16:i|16:i,dynamicProps:e.dynamicProps,dynamicChildren:e.dynamicChildren,appContext:e.appContext,dirs:e.dirs,transition:l,component:e.component,suspense:e.suspense,ssContent:e.ssContent&&Gt(e.ssContent),ssFallback:e.ssFallback&&Gt(e.ssFallback),placeholder:e.placeholder,el:e.el,anchor:e.anchor,ctx:e.ctx,ce:e.ce};return l&&n&&Xn(d,l.clone(d)),d}function Ot(e=" ",t=0){return de(tn,null,e,t)}function lu(e,t){const o=de(vo,null,e);return o.staticCount=t,o}function Vo(e="",t=!1){return t?(Ce(),go(yt,null,e)):de(yt,null,e)}function Ge(e){return e==null||typeof e=="boolean"?de(yt):W(e)?de(qe,null,e.slice()):ko(e)?ot(e):de(tn,null,String(e))}function ot(e){return e.el===null&&e.patchFlag!==-1||e.memo?e:Gt(e)}function or(e,t){let o=0;const{shapeFlag:n}=e;if(t==null)t=null;else if(W(t))o=16;else if(typeof t=="object")if(n&65){const r=t.default;r&&(r._c&&(r._d=!1),or(e,r()),r._c&&(r._d=!0));return}else{o=32;const r=t._;!r&&!ei(t)?t._ctx=we:r===3&&we&&(we.slots._===1?t._=1:(t._=2,e.patchFlag|=1024))}else k(t)?(t={default:t,_ctx:we},o=32):(t=String(t),n&64?(o=16,t=[Ot(t)]):o=8);e.children=t,e.shapeFlag|=o}function yl(...e){const t={};for(let o=0;o<e.length;o++){const n=e[o];for(const r in n)if(r==="class")t.class!==n.class&&(t.class=Xo([t.class,n.class]));else if(r==="style")t.style=_t([t.style,n.style]);else if(qo(r)){const s=t[r],i=n[r];i&&s!==i&&!(W(s)&&s.includes(i))?t[r]=s?[].concat(s,i):i:i==null&&s==null&&!Go(r)&&(t[r]=i)}else r!==""&&(t[r]=n[r])}return t}function Ve(e,t,o,n=null){$e(e,t,7,[o,n])}const gl=js();let Sl=0;function Tl(e,t,o){const n=e.type,r=(t?t.appContext:e.appContext)||gl,s={uid:Sl++,vnode:e,type:n,parent:t,appContext:r,root:null,next:null,subTree:null,effect:null,update:null,job:null,scope:new Gi(!0),render:null,proxy:null,exposed:null,exposeProxy:null,withProxy:null,provides:t?t.provides:Object.create(r.provides),ids:t?t.ids:["",0,0],accessCache:null,renderCache:[],components:null,directives:null,propsOptions:oi(n,r),emitsOptions:Xs(n,r),emit:null,emitted:null,propsDefaults:ee,inheritAttrs:n.inheritAttrs,ctx:ee,data:ee,props:ee,attrs:ee,slots:ee,refs:ee,setupState:ee,setupContext:null,suspense:o,suspenseId:o?o.pendingId:0,asyncDep:null,asyncResolved:!1,isMounted:!1,isUnmounted:!1,isDeactivated:!1,bc:null,c:null,bm:null,m:null,bu:null,u:null,um:null,bum:null,da:null,a:null,rtg:null,rtc:null,ec:null,sp:null};return s.ctx={_:s},s.root=t?t.root:s,s.emit=$a.bind(null,s),e.ce&&e.ce(s),s}let me=null;const Rl=()=>me||we;let Qo,vn;{const e=jo(),t=(o,n)=>{let r;return(r=e[o])||(r=e[o]=[]),r.push(n),s=>{r.length>1?r.forEach(i=>i(s)):r[0](s)}};Qo=t("__VUE_INSTANCE_SETTERS__",o=>me=o),vn=t("__VUE_SSR_SETTERS__",o=>Jt=o)}const Oo=e=>{const t=me;return Qo(e),e.scope.on(),()=>{e.scope.off(),Qo(t)}},br=()=>{me&&me.scope.off(),Qo(null)};function pi(e){return e.vnode.shapeFlag&4}let Jt=!1;function Nl(e,t=!1,o=!1){t&&vn(t);const{props:n,children:r}=e.vnode,s=pi(e);nl(e,n,s,t),al(e,r,o||t);const i=s?Ol(e,t):void 0;return t&&vn(!1),i}function Ol(e,t){const o=e.type;e.accessCache=Object.create(null),e.proxy=new Proxy(e.ctx,Va);const{setup:n}=o;if(n){st();const r=e.setupContext=n.length>1?Ll(e):null,s=Oo(e),i=Ro(n,e,0,[e.props,r]),a=ds(i);if(it(),s(),(a||e.sp)&&!co(e)&&$n(e),a){if(i.then(br,br),t)return i.then(l=>{vr(e,l)}).catch(l=>{No(l,e,0)});e.asyncDep=i}else vr(e,i)}else mi(e)}function vr(e,t,o){k(t)?e.type.__ssrInlineRender?e.ssrRender=t:e.render=t:j(t)&&(e.setupState=xs(t)),mi(e)}function mi(e,t,o){const n=e.type;e.render||(e.render=n.render||Ke);{const r=Oo(e);st();try{Qa(e)}finally{it(),r()}}}const Il={get(e,t){return he(e,"get",""),e[t]}};function Ll(e){const t=o=>{e.exposed=o||{}};return{attrs:new Proxy(e.attrs,Il),slots:e.slots,emit:e.emit,expose:t}}function nr(e){return e.exposed?e.exposeProxy||(e.exposeProxy=new Proxy(xs(pa(e.exposed)),{get(t,o){if(o in t)return t[o];if(o in uo)return uo[o](e)},has(t,o){return o in t||o in uo}})):e.proxy}function Al(e,t=!0){return k(e)?e.displayName||e.name:e.name||t&&e.__name}function _l(e){return k(e)&&"__vccOpts"in e}const le=(e,t)=>ya(e,t,Jt);function Ei(e,t,o){try{Wo(-1);const n=arguments.length;return n===2?j(t)&&!W(t)?ko(t)?de(e,null,[t]):de(e,t):de(e,null,t):(n>3?o=Array.prototype.slice.call(arguments,2):n===3&&ko(o)&&(o=[o]),de(e,t,o))}finally{Wo(1)}}const Cl="3.5.32";/**
* @vue/runtime-dom v3.5.32
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/let wn;const wr=typeof window<"u"&&window.trustedTypes;if(wr)try{wn=wr.createPolicy("vue",{createHTML:e=>e})}catch{}const hi=wn?e=>wn.createHTML(e):e=>e,bl="http://www.w3.org/2000/svg",vl="http://www.w3.org/1998/Math/MathML",tt=typeof document<"u"?document:null,xr=tt&&tt.createElement("template"),wl={insert:(e,t,o)=>{t.insertBefore(e,o||null)},remove:e=>{const t=e.parentNode;t&&t.removeChild(e)},createElement:(e,t,o,n)=>{const r=t==="svg"?tt.createElementNS(bl,e):t==="mathml"?tt.createElementNS(vl,e):o?tt.createElement(e,{is:o}):tt.createElement(e);return e==="select"&&n&&n.multiple!=null&&r.setAttribute("multiple",n.multiple),r},createText:e=>tt.createTextNode(e),createComment:e=>tt.createComment(e),setText:(e,t)=>{e.nodeValue=t},setElementText:(e,t)=>{e.textContent=t},parentNode:e=>e.parentNode,nextSibling:e=>e.nextSibling,querySelector:e=>tt.querySelector(e),setScopeId(e,t){e.setAttribute(t,"")},insertStaticContent(e,t,o,n,r,s){const i=o?o.previousSibling:t.lastChild;if(r&&(r===s||r.nextSibling))for(;t.insertBefore(r.cloneNode(!0),o),!(r===s||!(r=r.nextSibling)););else{xr.innerHTML=hi(n==="svg"?`<svg>${e}</svg>`:n==="mathml"?`<math>${e}</math>`:e);const a=xr.content;if(n==="svg"||n==="mathml"){const l=a.firstChild;for(;l.firstChild;)a.appendChild(l.firstChild);a.removeChild(l)}t.insertBefore(a,o)}return[i?i.nextSibling:t.firstChild,o?o.previousSibling:t.lastChild]}},xl=Symbol("_vtc");function Ml(e,t,o){const n=e[xl];n&&(t=(t?[t,...n]:[...n]).join(" ")),t==null?e.removeAttribute("class"):o?e.setAttribute("class",t):e.className=t}const Mr=Symbol("_vod"),Ul=Symbol("_vsh"),Dl=Symbol(""),Fl=/(?:^|;)\s*display\s*:/;function Pl(e,t,o){const n=e.style,r=ne(o);let s=!1;if(o&&!r){if(t)if(ne(t))for(const i of t.split(";")){const a=i.slice(0,i.indexOf(":")).trim();o[a]==null&&xo(n,a,"")}else for(const i in t)o[i]==null&&xo(n,i,"");for(const i in o)i==="display"&&(s=!0),xo(n,i,o[i])}else if(r){if(t!==o){const i=n[Dl];i&&(o+=";"+i),n.cssText=o,s=Fl.test(o)}}else t&&e.removeAttribute("style");Mr in e&&(e[Mr]=s?n.display:"",e[Ul]&&(n.display="none"))}const Ur=/\s*!important$/;function xo(e,t,o){if(W(o))o.forEach(n=>xo(e,t,n));else if(o==null&&(o=""),t.startsWith("--"))e.setProperty(t,o);else{const n=Hl(e,t);Ur.test(o)?e.setProperty(xt(n),o.replace(Ur,""),"important"):e[n]=o}}const Dr=["Webkit","Moz","ms"],hn={};function Hl(e,t){const o=hn[t];if(o)return o;let n=Re(t);if(n!=="filter"&&n in e)return hn[t]=n;n=Ko(n);for(let r=0;r<Dr.length;r++){const s=Dr[r]+n;if(s in e)return hn[t]=s}return t}const Fr="http://www.w3.org/1999/xlink";function Pr(e,t,o,n,r,s=Yi(t)){n&&t.startsWith("xlink:")?o==null?e.removeAttributeNS(Fr,t.slice(6,t.length)):e.setAttributeNS(Fr,t,o):o==null||s&&!ms(o)?e.removeAttribute(t):e.setAttribute(t,s?"":Xe(o)?String(o):o)}function Hr(e,t,o,n,r){if(t==="innerHTML"||t==="textContent"){o!=null&&(e[t]=t==="innerHTML"?hi(o):o);return}const s=e.tagName;if(t==="value"&&s!=="PROGRESS"&&!s.includes("-")){const a=s==="OPTION"?e.getAttribute("value")||"":e.value,l=o==null?e.type==="checkbox"?"on":"":String(o);(a!==l||!("_value"in e))&&(e.value=l),o==null&&e.removeAttribute(t),e._value=o;return}let i=!1;if(o===""||o==null){const a=typeof e[t];a==="boolean"?o=ms(o):o==null&&a==="string"?(o="",i=!0):a==="number"&&(o=0,i=!0)}try{e[t]=o}catch{}i&&e.removeAttribute(r||t)}function Bl(e,t,o,n){e.addEventListener(t,o,n)}function Wl(e,t,o,n){e.removeEventListener(t,o,n)}const Br=Symbol("_vei");function kl(e,t,o,n,r=null){const s=e[Br]||(e[Br]={}),i=s[t];if(n&&i)i.value=n;else{const[a,l]=Vl(t);if(n){const p=s[t]=ql(n,r);Bl(e,a,p,l)}else i&&(Wl(e,a,i,l),s[t]=void 0)}}const Wr=/(?:Once|Passive|Capture)$/;function Vl(e){let t;if(Wr.test(e)){t={};let n;for(;n=e.match(Wr);)e=e.slice(0,e.length-n[0].length),t[n[0].toLowerCase()]=!0}return[e[2]===":"?e.slice(3):xt(e.slice(2)),t]}let fn=0;const Ql=Promise.resolve(),Yl=()=>fn||(Ql.then(()=>fn=0),fn=Date.now());function ql(e,t){const o=n=>{if(!n._vts)n._vts=Date.now();else if(n._vts<=o.attached)return;$e(Gl(n,o.value),t,5,[n])};return o.value=e,o.attached=Yl(),o}function Gl(e,t){if(W(t)){const o=e.stopImmediatePropagation;return e.stopImmediatePropagation=()=>{o.call(e),e._stopped=!0},t.map(n=>r=>!r._stopped&&n&&n(r))}else return t}const kr=e=>e.charCodeAt(0)===111&&e.charCodeAt(1)===110&&e.charCodeAt(2)>96&&e.charCodeAt(2)<123,Jl=(e,t,o,n,r,s)=>{const i=r==="svg";t==="class"?Ml(e,n,i):t==="style"?Pl(e,o,n):qo(t)?Go(t)||kl(e,t,o,n,s):(t[0]==="."?(t=t.slice(1),!0):t[0]==="^"?(t=t.slice(1),!1):Kl(e,t,n,i))?(Hr(e,t,n),!e.tagName.includes("-")&&(t==="value"||t==="checked"||t==="selected")&&Pr(e,t,n,i,s,t!=="value")):e._isVueCE&&(jl(e,t)||e._def.__asyncLoader&&(/[A-Z]/.test(t)||!ne(n)))?Hr(e,Re(t),n,s,t):(t==="true-value"?e._trueValue=n:t==="false-value"&&(e._falseValue=n),Pr(e,t,n,i))};function Kl(e,t,o,n){if(n)return!!(t==="innerHTML"||t==="textContent"||t in e&&kr(t)&&k(o));if(t==="spellcheck"||t==="draggable"||t==="translate"||t==="autocorrect"||t==="sandbox"&&e.tagName==="IFRAME"||t==="form"||t==="list"&&e.tagName==="INPUT"||t==="type"&&e.tagName==="TEXTAREA")return!1;if(t==="width"||t==="height"){const r=e.tagName;if(r==="IMG"||r==="VIDEO"||r==="CANVAS"||r==="SOURCE")return!1}return kr(t)&&ne(o)?!1:t in e}function jl(e,t){const o=e._def.props;if(!o)return!1;const n=Re(t);return Array.isArray(o)?o.some(r=>Re(r)===n):Object.keys(o).some(r=>Re(r)===n)}const Xl=Ee({patchProp:Jl},wl);let Vr;function $l(){return Vr||(Vr=dl(Xl))}const zl=((...e)=>{const t=$l().createApp(...e),{mount:o}=t;return t.mount=n=>{const r=ed(n);if(!r)return;const s=t._component;!k(s)&&!s.render&&!s.template&&(s.template=r.innerHTML),r.nodeType===1&&(r.textContent="");const i=o(r,!1,Zl(r));return r instanceof Element&&(r.removeAttribute("v-cloak"),r.setAttribute("data-v-app","")),i},t});function Zl(e){if(e instanceof SVGElement)return"svg";if(typeof MathMLElement=="function"&&e instanceof MathMLElement)return"mathml"}function ed(e){return ne(e)?document.querySelector(e):e}const td="modulepreload",od=function(e){return"/training/"+e},Qr={},Mo=function(t,o,n){let r=Promise.resolve();if(o&&o.length>0){let i=function(p){return Promise.all(p.map(d=>Promise.resolve(d).then(u=>({status:"fulfilled",value:u}),u=>({status:"rejected",reason:u}))))};document.getElementsByTagName("link");const a=document.querySelector("meta[property=csp-nonce]"),l=(a==null?void 0:a.nonce)||(a==null?void 0:a.getAttribute("nonce"));r=i(o.map(p=>{if(p=od(p),p in Qr)return;Qr[p]=!0;const d=p.endsWith(".css"),u=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${p}"]${u}`))return;const E=document.createElement("link");if(E.rel=d?"stylesheet":td,d||(E.as="script"),E.crossOrigin="",E.href=p,l&&E.setAttribute("nonce",l),document.head.appendChild(E),d)return new Promise((f,O)=>{E.addEventListener("load",f),E.addEventListener("error",()=>O(new Error(`Unable to preload CSS for ${p}`)))})}))}function s(i){const a=new Event("vite:preloadError",{cancelable:!0});if(a.payload=i,window.dispatchEvent(a),!a.defaultPrevented)throw i}return r.then(i=>{for(const a of i||[])a.status==="rejected"&&s(a.reason);return t().catch(s)})},fi=`-- ReliaDB MySQL Training - Sample Database Schema
-- Uses SQLite-compatible syntax (sql.js runs SQLite in WASM)
-- Lessons teach MySQL syntax; sandbox uses SQLite equivalents

CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  budget REAL NOT NULL,
  location TEXT NOT NULL
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  salary REAL NOT NULL,
  hire_date TEXT NOT NULL,
  manager_id INTEGER,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (manager_id) REFERENCES employees(id)
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'shipped', 'delivered', 'cancelled')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
`,yi=`-- ReliaDB MySQL Training - Seed Data
-- Deterministic data for stable exercise expected results

-- Departments (10 rows)
INSERT INTO departments VALUES (1, 'Engineering', 1500000, 'New York');
INSERT INTO departments VALUES (2, 'Marketing', 800000, 'London');
INSERT INTO departments VALUES (3, 'Sales', 1200000, 'New York');
INSERT INTO departments VALUES (4, 'HR', 500000, 'Berlin');
INSERT INTO departments VALUES (5, 'Finance', 900000, 'Tokyo');
INSERT INTO departments VALUES (6, 'Operations', 700000, 'Madrid');
INSERT INTO departments VALUES (7, 'Support', 600000, 'Toronto');
INSERT INTO departments VALUES (8, 'Legal', 400000, 'Paris');
INSERT INTO departments VALUES (9, 'Product', 1100000, 'Singapore');
INSERT INTO departments VALUES (10, 'Design', 650000, 'Sydney');

-- Employees (50 rows - enough for meaningful queries, small enough for WASM)
INSERT INTO employees VALUES (1, 'Alice Johnson', 'alice@company.com', 1, 120000, '2019-03-15', NULL);
INSERT INTO employees VALUES (2, 'Bob Smith', 'bob@company.com', 1, 115000, '2019-06-01', 1);
INSERT INTO employees VALUES (3, 'Carol Davis', 'carol@company.com', 1, 105000, '2020-01-10', 1);
INSERT INTO employees VALUES (4, 'David Wilson', 'david@company.com', 2, 85000, '2020-04-20', NULL);
INSERT INTO employees VALUES (5, 'Eva Martinez', 'eva@company.com', 2, 78000, '2020-08-15', 4);
INSERT INTO employees VALUES (6, 'Frank Brown', 'frank@company.com', 3, 92000, '2019-11-01', NULL);
INSERT INTO employees VALUES (7, 'Grace Lee', 'grace@company.com', 3, 88000, '2020-02-14', 6);
INSERT INTO employees VALUES (8, 'Henry Taylor', 'henry@company.com', 3, 95000, '2019-09-20', 6);
INSERT INTO employees VALUES (9, 'Iris Chen', 'iris@company.com', 4, 72000, '2021-01-05', NULL);
INSERT INTO employees VALUES (10, 'Jack Anderson', 'jack@company.com', 4, 68000, '2021-03-15', 9);
INSERT INTO employees VALUES (11, 'Kate Thomas', 'kate@company.com', 5, 110000, '2019-07-01', NULL);
INSERT INTO employees VALUES (12, 'Liam Moore', 'liam@company.com', 5, 98000, '2020-05-10', 11);
INSERT INTO employees VALUES (13, 'Mia Jackson', 'mia@company.com', 6, 75000, '2021-06-01', NULL);
INSERT INTO employees VALUES (14, 'Noah White', 'noah@company.com', 6, 70000, '2021-09-15', 13);
INSERT INTO employees VALUES (15, 'Olivia Harris', 'olivia@company.com', 7, 65000, '2022-01-10', NULL);
INSERT INTO employees VALUES (16, 'Peter Clark', 'peter@company.com', 7, 62000, '2022-03-20', 15);
INSERT INTO employees VALUES (17, 'Quinn Lewis', 'quinn@company.com', 8, 130000, '2019-02-01', NULL);
INSERT INTO employees VALUES (18, 'Rachel Robinson', 'rachel@company.com', 8, 125000, '2019-08-15', 17);
INSERT INTO employees VALUES (19, 'Sam Walker', 'sam@company.com', 9, 108000, '2020-03-01', NULL);
INSERT INTO employees VALUES (20, 'Tina Hall', 'tina@company.com', 9, 102000, '2020-07-20', 19);
INSERT INTO employees VALUES (21, 'Uma Allen', 'uma@company.com', 10, 90000, '2020-11-01', NULL);
INSERT INTO employees VALUES (22, 'Victor Young', 'victor@company.com', 10, 85000, '2021-02-15', 21);
INSERT INTO employees VALUES (23, 'Wendy King', 'wendy@company.com', 1, 98000, '2021-04-01', 1);
INSERT INTO employees VALUES (24, 'Xavier Wright', 'xavier@company.com', 1, 112000, '2019-12-01', 1);
INSERT INTO employees VALUES (25, 'Yara Scott', 'yara@company.com', 2, 82000, '2021-05-15', 4);
INSERT INTO employees VALUES (26, 'Zach Green', 'zach@company.com', 3, 90000, '2020-10-01', 6);
INSERT INTO employees VALUES (27, 'Amy Baker', 'amy@company.com', 1, 95000, '2022-02-01', 2);
INSERT INTO employees VALUES (28, 'Brian Adams', 'brian@company.com', 5, 105000, '2020-09-10', 11);
INSERT INTO employees VALUES (29, 'Chloe Turner', 'chloe@company.com', 3, 87000, '2021-07-01', 6);
INSERT INTO employees VALUES (30, 'Daniel Phillips', 'daniel@company.com', 9, 100000, '2021-01-15', 19);
INSERT INTO employees VALUES (31, 'Elena Campbell', 'elena@company.com', 2, 80000, '2022-04-01', 4);
INSERT INTO employees VALUES (32, 'Felix Parker', 'felix@company.com', 6, 73000, '2022-06-15', 13);
INSERT INTO employees VALUES (33, 'Gina Evans', 'gina@company.com', 7, 64000, '2022-08-01', 15);
INSERT INTO employees VALUES (34, 'Hugo Edwards', 'hugo@company.com', 1, 118000, '2020-06-15', 1);
INSERT INTO employees VALUES (35, 'Isla Collins', 'isla@company.com', 10, 88000, '2021-11-01', 21);
INSERT INTO employees VALUES (36, 'James Stewart', 'james@company.com', 4, 70000, '2022-01-20', 9);
INSERT INTO employees VALUES (37, 'Kelly Morris', 'kelly@company.com', 5, 95000, '2021-08-01', 11);
INSERT INTO employees VALUES (38, 'Leo Rogers', 'leo@company.com', 9, 105000, '2021-10-15', 19);
INSERT INTO employees VALUES (39, 'Maya Reed', 'maya@company.com', 3, 91000, '2022-05-01', 6);
INSERT INTO employees VALUES (40, 'Nathan Cook', 'nathan@company.com', 1, 108000, '2021-09-01', 2);
INSERT INTO employees VALUES (41, 'Ophelia Morgan', 'ophelia@company.com', 2, 76000, '2022-07-15', 4);
INSERT INTO employees VALUES (42, 'Paul Bell', 'paul@company.com', 6, 71000, '2022-10-01', 13);
INSERT INTO employees VALUES (43, 'Rosa Murphy', 'rosa@company.com', 8, 120000, '2020-12-01', 17);
INSERT INTO employees VALUES (44, 'Steve Bailey', 'steve@company.com', 7, 63000, '2023-01-15', 15);
INSERT INTO employees VALUES (45, 'Tara Rivera', 'tara@company.com', 10, 87000, '2022-09-01', 21);
INSERT INTO employees VALUES (46, 'Ulrich Cooper', 'ulrich@company.com', 5, 92000, '2022-03-01', 11);
INSERT INTO employees VALUES (47, 'Vera Richardson', 'vera@company.com', 1, 100000, '2022-11-01', 2);
INSERT INTO employees VALUES (48, 'Will Cox', 'will@company.com', 3, 86000, '2023-02-01', 6);
INSERT INTO employees VALUES (49, 'Xena Howard', 'xena@company.com', 9, 97000, '2022-12-01', 19);
INSERT INTO employees VALUES (50, 'Yuri Ward', 'yuri@company.com', 4, 69000, '2023-03-01', 9);

-- Customers (30 rows)
INSERT INTO customers VALUES (1, 'Acme Corp', 'info@acme.com', 'New York', 'USA', '2022-01-15');
INSERT INTO customers VALUES (2, 'TechStart Inc', 'hello@techstart.com', 'London', 'UK', '2022-02-20');
INSERT INTO customers VALUES (3, 'DataFlow GmbH', 'contact@dataflow.de', 'Berlin', 'Germany', '2022-03-10');
INSERT INTO customers VALUES (4, 'CloudNine Ltd', 'sales@cloudnine.co.uk', 'London', 'UK', '2022-04-05');
INSERT INTO customers VALUES (5, 'Sunrise Digital', 'info@sunrise.jp', 'Tokyo', 'Japan', '2022-05-12');
INSERT INTO customers VALUES (6, 'Alpine Solutions', 'hello@alpine.ch', 'Zurich', 'Switzerland', '2022-06-01');
INSERT INTO customers VALUES (7, 'Pacific Trading', 'contact@pacific.com.au', 'Sydney', 'Australia', '2022-07-20');
INSERT INTO customers VALUES (8, 'Nordic Software', 'info@nordic.se', 'Stockholm', 'Sweden', '2022-08-15');
INSERT INTO customers VALUES (9, 'Metro Systems', 'sales@metro.es', 'Madrid', 'Spain', '2022-09-01');
INSERT INTO customers VALUES (10, 'Global Retail', 'orders@global.com', 'New York', 'USA', '2022-10-10');
INSERT INTO customers VALUES (11, 'BrightPath AI', 'hi@brightpath.com', 'Toronto', 'Canada', '2022-11-05');
INSERT INTO customers VALUES (12, 'Velocity Labs', 'team@velocity.io', 'Singapore', 'Singapore', '2022-12-01');
INSERT INTO customers VALUES (13, 'FreshMart', 'support@freshmart.com', 'Paris', 'France', '2023-01-15');
INSERT INTO customers VALUES (14, 'SkyBridge Corp', 'info@skybridge.com', 'Dubai', 'UAE', '2023-02-20');
INSERT INTO customers VALUES (15, 'GreenTech Ltd', 'hello@greentech.co.uk', 'London', 'UK', '2023-03-10');
INSERT INTO customers VALUES (16, 'Pinnacle Group', 'contact@pinnacle.com', 'New York', 'USA', '2023-04-01');
INSERT INTO customers VALUES (17, 'Eastern Dynamics', 'sales@eastern.cn', 'Shanghai', 'China', '2023-05-15');
INSERT INTO customers VALUES (18, 'Atlas Logistics', 'ops@atlas.com', 'Berlin', 'Germany', '2023-06-01');
INSERT INTO customers VALUES (19, 'River Valley Inc', 'info@rivervalley.com', 'Toronto', 'Canada', '2023-07-20');
INSERT INTO customers VALUES (20, 'Coral Systems', 'hello@coral.com.au', 'Sydney', 'Australia', '2023-08-10');
INSERT INTO customers VALUES (21, 'Summit Partners', 'deal@summit.com', 'New York', 'USA', '2023-09-01');
INSERT INTO customers VALUES (22, 'Cascade Data', 'team@cascade.com', 'Madrid', 'Spain', '2023-10-15');
INSERT INTO customers VALUES (23, 'Prism Analytics', 'info@prism.com', 'Singapore', 'Singapore', '2023-11-01');
INSERT INTO customers VALUES (24, 'Horizon Media', 'ads@horizon.com', 'Tokyo', 'Japan', '2023-12-10');
INSERT INTO customers VALUES (25, 'Redwood Labs', 'dev@redwood.com', 'London', 'UK', '2024-01-05');
INSERT INTO customers VALUES (26, 'Quantum Edge', 'info@quantum.com', 'Paris', 'France', '2024-02-15');
INSERT INTO customers VALUES (27, 'Blue Ocean Ltd', 'contact@blueocean.com', 'Dubai', 'UAE', '2024-03-01');
INSERT INTO customers VALUES (28, 'FireStorm Tech', 'support@firestorm.com', 'Berlin', 'Germany', '2024-04-10');
INSERT INTO customers VALUES (29, 'Maple Systems', 'info@maple.ca', 'Toronto', 'Canada', '2024-05-20');
INSERT INTO customers VALUES (30, 'Opal Networks', 'hello@opal.com', 'Stockholm', 'Sweden', '2024-06-01');

-- Products (20 rows)
INSERT INTO products VALUES (1, 'Laptop Pro 15', 'Electronics', 1299.99, 150);
INSERT INTO products VALUES (2, 'Wireless Mouse', 'Electronics', 29.99, 500);
INSERT INTO products VALUES (3, 'USB-C Hub', 'Electronics', 49.99, 300);
INSERT INTO products VALUES (4, 'Mechanical Keyboard', 'Electronics', 89.99, 200);
INSERT INTO products VALUES (5, 'Monitor 27"', 'Electronics', 449.99, 100);
INSERT INTO products VALUES (6, 'SQL Mastery Guide', 'Books', 39.99, 400);
INSERT INTO products VALUES (7, 'Database Design Patterns', 'Books', 44.99, 350);
INSERT INTO products VALUES (8, 'Cloud Architecture', 'Books', 54.99, 250);
INSERT INTO products VALUES (9, 'Running Shoes', 'Sports', 119.99, 180);
INSERT INTO products VALUES (10, 'Yoga Mat', 'Sports', 34.99, 220);
INSERT INTO products VALUES (11, 'Water Bottle', 'Sports', 24.99, 400);
INSERT INTO products VALUES (12, 'Standing Desk', 'Home', 599.99, 75);
INSERT INTO products VALUES (13, 'Desk Lamp', 'Home', 45.99, 300);
INSERT INTO products VALUES (14, 'Ergonomic Chair', 'Home', 399.99, 90);
INSERT INTO products VALUES (15, 'Backpack', 'Clothing', 79.99, 250);
INSERT INTO products VALUES (16, 'T-Shirt Pack', 'Clothing', 29.99, 500);
INSERT INTO products VALUES (17, 'Hoodie', 'Clothing', 59.99, 180);
INSERT INTO products VALUES (18, 'Coffee Beans 1kg', 'Food', 18.99, 600);
INSERT INTO products VALUES (19, 'Green Tea Box', 'Food', 12.99, 450);
INSERT INTO products VALUES (20, 'Protein Bars 12pk', 'Food', 24.99, 350);

-- Orders (40 rows)
INSERT INTO orders VALUES (1, 1, '2023-01-15', 1329.98, 'delivered');
INSERT INTO orders VALUES (2, 2, '2023-01-20', 79.98, 'delivered');
INSERT INTO orders VALUES (3, 3, '2023-02-10', 449.99, 'delivered');
INSERT INTO orders VALUES (4, 1, '2023-02-28', 89.99, 'delivered');
INSERT INTO orders VALUES (5, 5, '2023-03-15', 154.98, 'delivered');
INSERT INTO orders VALUES (6, 4, '2023-04-01', 599.99, 'delivered');
INSERT INTO orders VALUES (7, 6, '2023-04-20', 39.99, 'delivered');
INSERT INTO orders VALUES (8, 7, '2023-05-10', 1749.98, 'delivered');
INSERT INTO orders VALUES (9, 8, '2023-05-25', 119.99, 'delivered');
INSERT INTO orders VALUES (10, 2, '2023-06-15', 94.98, 'delivered');
INSERT INTO orders VALUES (11, 10, '2023-07-01', 479.98, 'delivered');
INSERT INTO orders VALUES (12, 9, '2023-07-20', 59.98, 'delivered');
INSERT INTO orders VALUES (13, 11, '2023-08-05', 399.99, 'delivered');
INSERT INTO orders VALUES (14, 3, '2023-08-25', 84.98, 'delivered');
INSERT INTO orders VALUES (15, 12, '2023-09-10', 1299.99, 'delivered');
INSERT INTO orders VALUES (16, 14, '2023-10-01', 179.98, 'delivered');
INSERT INTO orders VALUES (17, 1, '2023-10-20', 54.99, 'delivered');
INSERT INTO orders VALUES (18, 15, '2023-11-05', 449.99, 'shipped');
INSERT INTO orders VALUES (19, 13, '2023-11-20', 89.99, 'shipped');
INSERT INTO orders VALUES (20, 16, '2023-12-01', 629.98, 'shipped');
INSERT INTO orders VALUES (21, 5, '2023-12-15', 44.99, 'shipped');
INSERT INTO orders VALUES (22, 17, '2024-01-10', 119.99, 'shipped');
INSERT INTO orders VALUES (23, 18, '2024-01-25', 69.98, 'shipped');
INSERT INTO orders VALUES (24, 19, '2024-02-10', 39.99, 'shipped');
INSERT INTO orders VALUES (25, 20, '2024-02-28', 1299.99, 'pending');
INSERT INTO orders VALUES (26, 21, '2024-03-15', 94.98, 'pending');
INSERT INTO orders VALUES (27, 22, '2024-03-30', 449.99, 'pending');
INSERT INTO orders VALUES (28, 23, '2024-04-10', 24.99, 'pending');
INSERT INTO orders VALUES (29, 10, '2024-04-25', 159.98, 'cancelled');
INSERT INTO orders VALUES (30, 24, '2024-05-05', 599.99, 'cancelled');
INSERT INTO orders VALUES (31, 25, '2024-05-20', 89.99, 'cancelled');
INSERT INTO orders VALUES (32, 1, '2024-06-01', 179.98, 'delivered');
INSERT INTO orders VALUES (33, 26, '2024-06-15', 45.99, 'delivered');
INSERT INTO orders VALUES (34, 27, '2024-07-01', 99.98, 'delivered');
INSERT INTO orders VALUES (35, 28, '2024-07-15', 54.99, 'delivered');
INSERT INTO orders VALUES (36, 29, '2024-08-01', 399.99, 'shipped');
INSERT INTO orders VALUES (37, 30, '2024-08-15', 79.99, 'shipped');
INSERT INTO orders VALUES (38, 2, '2024-09-01', 149.98, 'pending');
INSERT INTO orders VALUES (39, 4, '2024-09-15', 1299.99, 'pending');
INSERT INTO orders VALUES (40, 6, '2024-10-01', 44.99, 'pending');

-- Order Items (60 rows)
INSERT INTO order_items VALUES (1, 1, 1, 1, 1299.99);
INSERT INTO order_items VALUES (2, 1, 2, 1, 29.99);
INSERT INTO order_items VALUES (3, 2, 3, 1, 49.99);
INSERT INTO order_items VALUES (4, 2, 2, 1, 29.99);
INSERT INTO order_items VALUES (5, 3, 5, 1, 449.99);
INSERT INTO order_items VALUES (6, 4, 4, 1, 89.99);
INSERT INTO order_items VALUES (7, 5, 9, 1, 119.99);
INSERT INTO order_items VALUES (8, 5, 10, 1, 34.99);
INSERT INTO order_items VALUES (9, 6, 12, 1, 599.99);
INSERT INTO order_items VALUES (10, 7, 6, 1, 39.99);
INSERT INTO order_items VALUES (11, 8, 1, 1, 1299.99);
INSERT INTO order_items VALUES (12, 8, 5, 1, 449.99);
INSERT INTO order_items VALUES (13, 9, 9, 1, 119.99);
INSERT INTO order_items VALUES (14, 10, 7, 1, 44.99);
INSERT INTO order_items VALUES (15, 10, 3, 1, 49.99);
INSERT INTO order_items VALUES (16, 11, 5, 1, 449.99);
INSERT INTO order_items VALUES (17, 11, 2, 1, 29.99);
INSERT INTO order_items VALUES (18, 12, 16, 2, 29.99);
INSERT INTO order_items VALUES (19, 13, 14, 1, 399.99);
INSERT INTO order_items VALUES (20, 14, 15, 1, 79.99);
INSERT INTO order_items VALUES (21, 14, 18, 1, 18.99);
INSERT INTO order_items VALUES (22, 15, 1, 1, 1299.99);
INSERT INTO order_items VALUES (23, 16, 4, 2, 89.99);
INSERT INTO order_items VALUES (24, 17, 8, 1, 54.99);
INSERT INTO order_items VALUES (25, 18, 5, 1, 449.99);
INSERT INTO order_items VALUES (26, 19, 4, 1, 89.99);
INSERT INTO order_items VALUES (27, 20, 12, 1, 599.99);
INSERT INTO order_items VALUES (28, 20, 2, 1, 29.99);
INSERT INTO order_items VALUES (29, 21, 7, 1, 44.99);
INSERT INTO order_items VALUES (30, 22, 9, 1, 119.99);
INSERT INTO order_items VALUES (31, 23, 10, 2, 34.99);
INSERT INTO order_items VALUES (32, 24, 6, 1, 39.99);
INSERT INTO order_items VALUES (33, 25, 1, 1, 1299.99);
INSERT INTO order_items VALUES (34, 26, 3, 1, 49.99);
INSERT INTO order_items VALUES (35, 26, 19, 3, 12.99);
INSERT INTO order_items VALUES (36, 27, 5, 1, 449.99);
INSERT INTO order_items VALUES (37, 28, 20, 1, 24.99);
INSERT INTO order_items VALUES (38, 29, 15, 2, 79.99);
INSERT INTO order_items VALUES (39, 30, 12, 1, 599.99);
INSERT INTO order_items VALUES (40, 31, 4, 1, 89.99);
INSERT INTO order_items VALUES (41, 32, 4, 2, 89.99);
INSERT INTO order_items VALUES (42, 33, 13, 1, 45.99);
INSERT INTO order_items VALUES (43, 34, 17, 1, 59.99);
INSERT INTO order_items VALUES (44, 34, 6, 1, 39.99);
INSERT INTO order_items VALUES (45, 35, 8, 1, 54.99);
INSERT INTO order_items VALUES (46, 36, 14, 1, 399.99);
INSERT INTO order_items VALUES (47, 37, 15, 1, 79.99);
INSERT INTO order_items VALUES (48, 38, 9, 1, 119.99);
INSERT INTO order_items VALUES (49, 38, 2, 1, 29.99);
INSERT INTO order_items VALUES (50, 39, 1, 1, 1299.99);
INSERT INTO order_items VALUES (51, 40, 7, 1, 44.99);
INSERT INTO order_items VALUES (52, 5, 11, 1, 24.99);
INSERT INTO order_items VALUES (53, 11, 13, 1, 45.99);
INSERT INTO order_items VALUES (54, 16, 18, 1, 18.99);
INSERT INTO order_items VALUES (55, 20, 16, 1, 29.99);
INSERT INTO order_items VALUES (56, 23, 19, 1, 12.99);
INSERT INTO order_items VALUES (57, 29, 16, 1, 29.99);
INSERT INTO order_items VALUES (58, 32, 2, 1, 29.99);
INSERT INTO order_items VALUES (59, 36, 11, 1, 24.99);
INSERT INTO order_items VALUES (60, 40, 19, 2, 12.99);
`;let ve=null;const gi=ft(!1),Uo=ft(!1),Yo=ft(null);async function nd(){if(!(ve||Uo.value)){Uo.value=!0,Yo.value=null;try{const e=(await Mo(async()=>{const{default:o}=await import("./sql-wasm-browser-C7MG2Zvb.js").then(n=>n.s);return{default:o}},[])).default,t=await e({locateFile:()=>new URL("/training/sql-wasm.wasm",window.location.origin).href});ve=new t.Database,ve.run(fi),ve.run(yi),gi.value=!0}catch(e){Yo.value=e instanceof Error?e.message:"Failed to initialize SQL engine"}finally{Uo.value=!1}}}function rd(e){if(!ve)return{error:"Database not initialized"};try{const t=ve.exec(e);if(t.length===0)return{columns:[],values:[]};const o=t[t.length-1];return{columns:o.columns,values:o.values}}catch(t){return{error:t instanceof Error?t.message:"Query execution failed"}}}async function sd(){if(ve)try{const e=ve.exec("SELECT name FROM sqlite_master WHERE type='table'");if(e.length>0)for(const t of e[0].values)ve.run(`DROP TABLE IF EXISTS "${t[0]}"`);ve.run(fi),ve.run(yi)}catch(e){Yo.value=e instanceof Error?e.message:"Failed to reset database"}}function id(){return{isReady:bt(gi),isLoading:bt(Uo),initError:bt(Yo),initialize:nd,execute:rd,resetDatabase:sd}}const ad={class:"training-app"},ld={key:0,class:"flex items-center justify-center min-h-[60vh]"},dd={key:1,class:"max-w-lg mx-auto mt-24 p-6 bg-red-50 border border-red-200 rounded-xl text-center"},cd={class:"text-red-600 text-sm"},ud=Mt({__name:"App",setup(e){const{isReady:t,isLoading:o,initError:n,initialize:r}=id();return Vs(()=>{r()}),(s,i)=>{const a=Zn("router-view");return Ce(),wt("div",ad,[Te(o)?(Ce(),wt("div",ld,[...i[1]||(i[1]=[H("div",{class:"text-center"},[H("div",{class:"inline-block w-10 h-10 border-4 border-accent/30 border-t-accent rounded-full animate-spin mb-4"}),H("p",{class:"text-muted text-sm"},"Loading SQL engine...")],-1)])])):Te(n)?(Ce(),wt("div",dd,[i[2]||(i[2]=H("p",{class:"text-red-800 font-semibold mb-2"},"Failed to initialize SQL engine",-1)),H("p",cd,pe(Te(n)),1),H("button",{class:"mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors",onClick:i[0]||(i[0]=l=>Te(r)())}," Retry ")])):Te(t)?(Ce(),go(a,{key:2})):Vo("",!0)])}}});/*!
 * vue-router v4.6.4
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */const Wt=typeof document<"u";function Si(e){return typeof e=="object"||"displayName"in e||"props"in e||"__vccOpts"in e}function pd(e){return e.__esModule||e[Symbol.toStringTag]==="Module"||e.default&&Si(e.default)}const q=Object.assign;function yn(e,t){const o={};for(const n in t){const r=t[n];o[n]=Ue(r)?r.map(e):e(r)}return o}const mo=()=>{},Ue=Array.isArray;function Yr(e,t){const o={};for(const n in e)o[n]=n in t?t[n]:e[n];return o}const Ti=/#/g,md=/&/g,Ed=/\//g,hd=/=/g,fd=/\?/g,Ri=/\+/g,yd=/%5B/g,gd=/%5D/g,Ni=/%5E/g,Sd=/%60/g,Oi=/%7B/g,Td=/%7C/g,Ii=/%7D/g,Rd=/%20/g;function rr(e){return e==null?"":encodeURI(""+e).replace(Td,"|").replace(yd,"[").replace(gd,"]")}function Nd(e){return rr(e).replace(Oi,"{").replace(Ii,"}").replace(Ni,"^")}function xn(e){return rr(e).replace(Ri,"%2B").replace(Rd,"+").replace(Ti,"%23").replace(md,"%26").replace(Sd,"`").replace(Oi,"{").replace(Ii,"}").replace(Ni,"^")}function Od(e){return xn(e).replace(hd,"%3D")}function Id(e){return rr(e).replace(Ti,"%23").replace(fd,"%3F")}function Ld(e){return Id(e).replace(Ed,"%2F")}function So(e){if(e==null)return null;try{return decodeURIComponent(""+e)}catch{}return""+e}const Ad=/\/$/,_d=e=>e.replace(Ad,"");function gn(e,t,o="/"){let n,r={},s="",i="";const a=t.indexOf("#");let l=t.indexOf("?");return l=a>=0&&l>a?-1:l,l>=0&&(n=t.slice(0,l),s=t.slice(l,a>0?a:t.length),r=e(s.slice(1))),a>=0&&(n=n||t.slice(0,a),i=t.slice(a,t.length)),n=wd(n??t,o),{fullPath:n+s+i,path:n,query:r,hash:So(i)}}function Cd(e,t){const o=t.query?e(t.query):"";return t.path+(o&&"?")+o+(t.hash||"")}function qr(e,t){return!t||!e.toLowerCase().startsWith(t.toLowerCase())?e:e.slice(t.length)||"/"}function bd(e,t,o){const n=t.matched.length-1,r=o.matched.length-1;return n>-1&&n===r&&Kt(t.matched[n],o.matched[r])&&Li(t.params,o.params)&&e(t.query)===e(o.query)&&t.hash===o.hash}function Kt(e,t){return(e.aliasOf||e)===(t.aliasOf||t)}function Li(e,t){if(Object.keys(e).length!==Object.keys(t).length)return!1;for(var o in e)if(!vd(e[o],t[o]))return!1;return!0}function vd(e,t){return Ue(e)?Gr(e,t):Ue(t)?Gr(t,e):(e==null?void 0:e.valueOf())===(t==null?void 0:t.valueOf())}function Gr(e,t){return Ue(t)?e.length===t.length&&e.every((o,n)=>o===t[n]):e.length===1&&e[0]===t}function wd(e,t){if(e.startsWith("/"))return e;if(!e)return t;const o=t.split("/"),n=e.split("/"),r=n[n.length-1];(r===".."||r===".")&&n.push("");let s=o.length-1,i,a;for(i=0;i<n.length;i++)if(a=n[i],a!==".")if(a==="..")s>1&&s--;else break;return o.slice(0,s).join("/")+"/"+n.slice(i).join("/")}const pt={path:"/",name:void 0,params:{},query:{},hash:"",fullPath:"/",matched:[],meta:{},redirectedFrom:void 0};let Mn=(function(e){return e.pop="pop",e.push="push",e})({}),Sn=(function(e){return e.back="back",e.forward="forward",e.unknown="",e})({});function xd(e){if(!e)if(Wt){const t=document.querySelector("base");e=t&&t.getAttribute("href")||"/",e=e.replace(/^\w+:\/\/[^\/]+/,"")}else e="/";return e[0]!=="/"&&e[0]!=="#"&&(e="/"+e),_d(e)}const Md=/^[^#]+#/;function Ud(e,t){return e.replace(Md,"#")+t}function Dd(e,t){const o=document.documentElement.getBoundingClientRect(),n=e.getBoundingClientRect();return{behavior:t.behavior,left:n.left-o.left-(t.left||0),top:n.top-o.top-(t.top||0)}}const on=()=>({left:window.scrollX,top:window.scrollY});function Fd(e){let t;if("el"in e){const o=e.el,n=typeof o=="string"&&o.startsWith("#"),r=typeof o=="string"?n?document.getElementById(o.slice(1)):document.querySelector(o):o;if(!r)return;t=Dd(r,e)}else t=e;"scrollBehavior"in document.documentElement.style?window.scrollTo(t):window.scrollTo(t.left!=null?t.left:window.scrollX,t.top!=null?t.top:window.scrollY)}function Jr(e,t){return(history.state?history.state.position-t:-1)+e}const Un=new Map;function Pd(e,t){Un.set(e,t)}function Hd(e){const t=Un.get(e);return Un.delete(e),t}function Bd(e){return typeof e=="string"||e&&typeof e=="object"}function Ai(e){return typeof e=="string"||typeof e=="symbol"}let oe=(function(e){return e[e.MATCHER_NOT_FOUND=1]="MATCHER_NOT_FOUND",e[e.NAVIGATION_GUARD_REDIRECT=2]="NAVIGATION_GUARD_REDIRECT",e[e.NAVIGATION_ABORTED=4]="NAVIGATION_ABORTED",e[e.NAVIGATION_CANCELLED=8]="NAVIGATION_CANCELLED",e[e.NAVIGATION_DUPLICATED=16]="NAVIGATION_DUPLICATED",e})({});const _i=Symbol("");oe.MATCHER_NOT_FOUND+"",oe.NAVIGATION_GUARD_REDIRECT+"",oe.NAVIGATION_ABORTED+"",oe.NAVIGATION_CANCELLED+"",oe.NAVIGATION_DUPLICATED+"";function jt(e,t){return q(new Error,{type:e,[_i]:!0},t)}function et(e,t){return e instanceof Error&&_i in e&&(t==null||!!(e.type&t))}const Wd=["params","query","hash"];function kd(e){if(typeof e=="string")return e;if(e.path!=null)return e.path;const t={};for(const o of Wd)o in e&&(t[o]=e[o]);return JSON.stringify(t,null,2)}function Vd(e){const t={};if(e===""||e==="?")return t;const o=(e[0]==="?"?e.slice(1):e).split("&");for(let n=0;n<o.length;++n){const r=o[n].replace(Ri," "),s=r.indexOf("="),i=So(s<0?r:r.slice(0,s)),a=s<0?null:So(r.slice(s+1));if(i in t){let l=t[i];Ue(l)||(l=t[i]=[l]),l.push(a)}else t[i]=a}return t}function Kr(e){let t="";for(let o in e){const n=e[o];if(o=Od(o),n==null){n!==void 0&&(t+=(t.length?"&":"")+o);continue}(Ue(n)?n.map(r=>r&&xn(r)):[n&&xn(n)]).forEach(r=>{r!==void 0&&(t+=(t.length?"&":"")+o,r!=null&&(t+="="+r))})}return t}function Qd(e){const t={};for(const o in e){const n=e[o];n!==void 0&&(t[o]=Ue(n)?n.map(r=>r==null?null:""+r):n==null?n:""+n)}return t}const Yd=Symbol(""),jr=Symbol(""),sr=Symbol(""),ir=Symbol(""),Dn=Symbol("");function eo(){let e=[];function t(n){return e.push(n),()=>{const r=e.indexOf(n);r>-1&&e.splice(r,1)}}function o(){e=[]}return{add:t,list:()=>e.slice(),reset:o}}function Et(e,t,o,n,r,s=i=>i()){const i=n&&(n.enterCallbacks[r]=n.enterCallbacks[r]||[]);return()=>new Promise((a,l)=>{const p=E=>{E===!1?l(jt(oe.NAVIGATION_ABORTED,{from:o,to:t})):E instanceof Error?l(E):Bd(E)?l(jt(oe.NAVIGATION_GUARD_REDIRECT,{from:t,to:E})):(i&&n.enterCallbacks[r]===i&&typeof E=="function"&&i.push(E),a())},d=s(()=>e.call(n&&n.instances[r],t,o,p));let u=Promise.resolve(d);e.length<3&&(u=u.then(p)),u.catch(E=>l(E))})}function Tn(e,t,o,n,r=s=>s()){const s=[];for(const i of e)for(const a in i.components){let l=i.components[a];if(!(t!=="beforeRouteEnter"&&!i.instances[a]))if(Si(l)){const p=(l.__vccOpts||l)[t];p&&s.push(Et(p,o,n,i,a,r))}else{let p=l();s.push(()=>p.then(d=>{if(!d)throw new Error(`Couldn't resolve component "${a}" at "${i.path}"`);const u=pd(d)?d.default:d;i.mods[a]=d,i.components[a]=u;const E=(u.__vccOpts||u)[t];return E&&Et(E,o,n,i,a,r)()}))}}return s}function qd(e,t){const o=[],n=[],r=[],s=Math.max(t.matched.length,e.matched.length);for(let i=0;i<s;i++){const a=t.matched[i];a&&(e.matched.find(p=>Kt(p,a))?n.push(a):o.push(a));const l=e.matched[i];l&&(t.matched.find(p=>Kt(p,l))||r.push(l))}return[o,n,r]}/*!
 * vue-router v4.6.4
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */let Gd=()=>location.protocol+"//"+location.host;function Ci(e,t){const{pathname:o,search:n,hash:r}=t,s=e.indexOf("#");if(s>-1){let i=r.includes(e.slice(s))?e.slice(s).length:1,a=r.slice(i);return a[0]!=="/"&&(a="/"+a),qr(a,"")}return qr(o,e)+n+r}function Jd(e,t,o,n){let r=[],s=[],i=null;const a=({state:E})=>{const f=Ci(e,location),O=o.value,T=t.value;let x=0;if(E){if(o.value=f,t.value=E,i&&i===O){i=null;return}x=T?E.position-T.position:0}else n(f);r.forEach(U=>{U(o.value,O,{delta:x,type:Mn.pop,direction:x?x>0?Sn.forward:Sn.back:Sn.unknown})})};function l(){i=o.value}function p(E){r.push(E);const f=()=>{const O=r.indexOf(E);O>-1&&r.splice(O,1)};return s.push(f),f}function d(){if(document.visibilityState==="hidden"){const{history:E}=window;if(!E.state)return;E.replaceState(q({},E.state,{scroll:on()}),"")}}function u(){for(const E of s)E();s=[],window.removeEventListener("popstate",a),window.removeEventListener("pagehide",d),document.removeEventListener("visibilitychange",d)}return window.addEventListener("popstate",a),window.addEventListener("pagehide",d),document.addEventListener("visibilitychange",d),{pauseListeners:l,listen:p,destroy:u}}function Xr(e,t,o,n=!1,r=!1){return{back:e,current:t,forward:o,replaced:n,position:window.history.length,scroll:r?on():null}}function Kd(e){const{history:t,location:o}=window,n={value:Ci(e,o)},r={value:t.state};r.value||s(n.value,{back:null,current:n.value,forward:null,position:t.length-1,replaced:!0,scroll:null},!0);function s(l,p,d){const u=e.indexOf("#"),E=u>-1?(o.host&&document.querySelector("base")?e:e.slice(u))+l:Gd()+e+l;try{t[d?"replaceState":"pushState"](p,"",E),r.value=p}catch(f){console.error(f),o[d?"replace":"assign"](E)}}function i(l,p){s(l,q({},t.state,Xr(r.value.back,l,r.value.forward,!0),p,{position:r.value.position}),!0),n.value=l}function a(l,p){const d=q({},r.value,t.state,{forward:l,scroll:on()});s(d.current,d,!0),s(l,q({},Xr(n.value,l,null),{position:d.position+1},p),!1),n.value=l}return{location:n,state:r,push:a,replace:i}}function jd(e){e=xd(e);const t=Kd(e),o=Jd(e,t.state,t.location,t.replace);function n(s,i=!0){i||o.pauseListeners(),history.go(s)}const r=q({location:"",base:e,go:n,createHref:Ud.bind(null,e)},t,o);return Object.defineProperty(r,"location",{enumerable:!0,get:()=>t.location.value}),Object.defineProperty(r,"state",{enumerable:!0,get:()=>t.state.value}),r}function Xd(e){return e=location.host?e||location.pathname+location.search:"",e.includes("#")||(e+="#"),jd(e)}let At=(function(e){return e[e.Static=0]="Static",e[e.Param=1]="Param",e[e.Group=2]="Group",e})({});var ie=(function(e){return e[e.Static=0]="Static",e[e.Param=1]="Param",e[e.ParamRegExp=2]="ParamRegExp",e[e.ParamRegExpEnd=3]="ParamRegExpEnd",e[e.EscapeNext=4]="EscapeNext",e})(ie||{});const $d={type:At.Static,value:""},zd=/[a-zA-Z0-9_]/;function Zd(e){if(!e)return[[]];if(e==="/")return[[$d]];if(!e.startsWith("/"))throw new Error(`Invalid path "${e}"`);function t(f){throw new Error(`ERR (${o})/"${p}": ${f}`)}let o=ie.Static,n=o;const r=[];let s;function i(){s&&r.push(s),s=[]}let a=0,l,p="",d="";function u(){p&&(o===ie.Static?s.push({type:At.Static,value:p}):o===ie.Param||o===ie.ParamRegExp||o===ie.ParamRegExpEnd?(s.length>1&&(l==="*"||l==="+")&&t(`A repeatable param (${p}) must be alone in its segment. eg: '/:ids+.`),s.push({type:At.Param,value:p,regexp:d,repeatable:l==="*"||l==="+",optional:l==="*"||l==="?"})):t("Invalid state to consume buffer"),p="")}function E(){p+=l}for(;a<e.length;){if(l=e[a++],l==="\\"&&o!==ie.ParamRegExp){n=o,o=ie.EscapeNext;continue}switch(o){case ie.Static:l==="/"?(p&&u(),i()):l===":"?(u(),o=ie.Param):E();break;case ie.EscapeNext:E(),o=n;break;case ie.Param:l==="("?o=ie.ParamRegExp:zd.test(l)?E():(u(),o=ie.Static,l!=="*"&&l!=="?"&&l!=="+"&&a--);break;case ie.ParamRegExp:l===")"?d[d.length-1]=="\\"?d=d.slice(0,-1)+l:o=ie.ParamRegExpEnd:d+=l;break;case ie.ParamRegExpEnd:u(),o=ie.Static,l!=="*"&&l!=="?"&&l!=="+"&&a--,d="";break;default:t("Unknown state");break}}return o===ie.ParamRegExp&&t(`Unfinished custom RegExp for param "${p}"`),u(),i(),r}const $r="[^/]+?",ec={sensitive:!1,strict:!1,start:!0,end:!0};var ge=(function(e){return e[e._multiplier=10]="_multiplier",e[e.Root=90]="Root",e[e.Segment=40]="Segment",e[e.SubSegment=30]="SubSegment",e[e.Static=40]="Static",e[e.Dynamic=20]="Dynamic",e[e.BonusCustomRegExp=10]="BonusCustomRegExp",e[e.BonusWildcard=-50]="BonusWildcard",e[e.BonusRepeatable=-20]="BonusRepeatable",e[e.BonusOptional=-8]="BonusOptional",e[e.BonusStrict=.7000000000000001]="BonusStrict",e[e.BonusCaseSensitive=.25]="BonusCaseSensitive",e})(ge||{});const tc=/[.+*?^${}()[\]/\\]/g;function oc(e,t){const o=q({},ec,t),n=[];let r=o.start?"^":"";const s=[];for(const p of e){const d=p.length?[]:[ge.Root];o.strict&&!p.length&&(r+="/");for(let u=0;u<p.length;u++){const E=p[u];let f=ge.Segment+(o.sensitive?ge.BonusCaseSensitive:0);if(E.type===At.Static)u||(r+="/"),r+=E.value.replace(tc,"\\$&"),f+=ge.Static;else if(E.type===At.Param){const{value:O,repeatable:T,optional:x,regexp:U}=E;s.push({name:O,repeatable:T,optional:x});const _=U||$r;if(_!==$r){f+=ge.BonusCustomRegExp;try{`${_}`}catch(M){throw new Error(`Invalid custom RegExp for param "${O}" (${_}): `+M.message)}}let b=T?`((?:${_})(?:/(?:${_}))*)`:`(${_})`;u||(b=x&&p.length<2?`(?:/${b})`:"/"+b),x&&(b+="?"),r+=b,f+=ge.Dynamic,x&&(f+=ge.BonusOptional),T&&(f+=ge.BonusRepeatable),_===".*"&&(f+=ge.BonusWildcard)}d.push(f)}n.push(d)}if(o.strict&&o.end){const p=n.length-1;n[p][n[p].length-1]+=ge.BonusStrict}o.strict||(r+="/?"),o.end?r+="$":o.strict&&!r.endsWith("/")&&(r+="(?:/|$)");const i=new RegExp(r,o.sensitive?"":"i");function a(p){const d=p.match(i),u={};if(!d)return null;for(let E=1;E<d.length;E++){const f=d[E]||"",O=s[E-1];u[O.name]=f&&O.repeatable?f.split("/"):f}return u}function l(p){let d="",u=!1;for(const E of e){(!u||!d.endsWith("/"))&&(d+="/"),u=!1;for(const f of E)if(f.type===At.Static)d+=f.value;else if(f.type===At.Param){const{value:O,repeatable:T,optional:x}=f,U=O in p?p[O]:"";if(Ue(U)&&!T)throw new Error(`Provided param "${O}" is an array but it is not repeatable (* or + modifiers)`);const _=Ue(U)?U.join("/"):U;if(!_)if(x)E.length<2&&(d.endsWith("/")?d=d.slice(0,-1):u=!0);else throw new Error(`Missing required param "${O}"`);d+=_}}return d||"/"}return{re:i,score:n,keys:s,parse:a,stringify:l}}function nc(e,t){let o=0;for(;o<e.length&&o<t.length;){const n=t[o]-e[o];if(n)return n;o++}return e.length<t.length?e.length===1&&e[0]===ge.Static+ge.Segment?-1:1:e.length>t.length?t.length===1&&t[0]===ge.Static+ge.Segment?1:-1:0}function bi(e,t){let o=0;const n=e.score,r=t.score;for(;o<n.length&&o<r.length;){const s=nc(n[o],r[o]);if(s)return s;o++}if(Math.abs(r.length-n.length)===1){if(zr(n))return 1;if(zr(r))return-1}return r.length-n.length}function zr(e){const t=e[e.length-1];return e.length>0&&t[t.length-1]<0}const rc={strict:!1,end:!0,sensitive:!1};function sc(e,t,o){const n=oc(Zd(e.path),o),r=q(n,{record:e,parent:t,children:[],alias:[]});return t&&!r.record.aliasOf==!t.record.aliasOf&&t.children.push(r),r}function ic(e,t){const o=[],n=new Map;t=Yr(rc,t);function r(u){return n.get(u)}function s(u,E,f){const O=!f,T=es(u);T.aliasOf=f&&f.record;const x=Yr(t,u),U=[T];if("alias"in u){const M=typeof u.alias=="string"?[u.alias]:u.alias;for(const K of M)U.push(es(q({},T,{components:f?f.record.components:T.components,path:K,aliasOf:f?f.record:T})))}let _,b;for(const M of U){const{path:K}=M;if(E&&K[0]!=="/"){const ce=E.record.path,te=ce[ce.length-1]==="/"?"":"/";M.path=E.record.path+(K&&te+K)}if(_=sc(M,E,x),f?f.alias.push(_):(b=b||_,b!==_&&b.alias.push(_),O&&u.name&&!ts(_)&&i(u.name)),vi(_)&&l(_),T.children){const ce=T.children;for(let te=0;te<ce.length;te++)s(ce[te],_,f&&f.children[te])}f=f||_}return b?()=>{i(b)}:mo}function i(u){if(Ai(u)){const E=n.get(u);E&&(n.delete(u),o.splice(o.indexOf(E),1),E.children.forEach(i),E.alias.forEach(i))}else{const E=o.indexOf(u);E>-1&&(o.splice(E,1),u.record.name&&n.delete(u.record.name),u.children.forEach(i),u.alias.forEach(i))}}function a(){return o}function l(u){const E=dc(u,o);o.splice(E,0,u),u.record.name&&!ts(u)&&n.set(u.record.name,u)}function p(u,E){let f,O={},T,x;if("name"in u&&u.name){if(f=n.get(u.name),!f)throw jt(oe.MATCHER_NOT_FOUND,{location:u});x=f.record.name,O=q(Zr(E.params,f.keys.filter(b=>!b.optional).concat(f.parent?f.parent.keys.filter(b=>b.optional):[]).map(b=>b.name)),u.params&&Zr(u.params,f.keys.map(b=>b.name))),T=f.stringify(O)}else if(u.path!=null)T=u.path,f=o.find(b=>b.re.test(T)),f&&(O=f.parse(T),x=f.record.name);else{if(f=E.name?n.get(E.name):o.find(b=>b.re.test(E.path)),!f)throw jt(oe.MATCHER_NOT_FOUND,{location:u,currentLocation:E});x=f.record.name,O=q({},E.params,u.params),T=f.stringify(O)}const U=[];let _=f;for(;_;)U.unshift(_.record),_=_.parent;return{name:x,path:T,params:O,matched:U,meta:lc(U)}}e.forEach(u=>s(u));function d(){o.length=0,n.clear()}return{addRoute:s,resolve:p,removeRoute:i,clearRoutes:d,getRoutes:a,getRecordMatcher:r}}function Zr(e,t){const o={};for(const n of t)n in e&&(o[n]=e[n]);return o}function es(e){const t={path:e.path,redirect:e.redirect,name:e.name,meta:e.meta||{},aliasOf:e.aliasOf,beforeEnter:e.beforeEnter,props:ac(e),children:e.children||[],instances:{},leaveGuards:new Set,updateGuards:new Set,enterCallbacks:{},components:"components"in e?e.components||null:e.component&&{default:e.component}};return Object.defineProperty(t,"mods",{value:{}}),t}function ac(e){const t={},o=e.props||!1;if("component"in e)t.default=o;else for(const n in e.components)t[n]=typeof o=="object"?o[n]:o;return t}function ts(e){for(;e;){if(e.record.aliasOf)return!0;e=e.parent}return!1}function lc(e){return e.reduce((t,o)=>q(t,o.meta),{})}function dc(e,t){let o=0,n=t.length;for(;o!==n;){const s=o+n>>1;bi(e,t[s])<0?n=s:o=s+1}const r=cc(e);return r&&(n=t.lastIndexOf(r,n-1)),n}function cc(e){let t=e;for(;t=t.parent;)if(vi(t)&&bi(e,t)===0)return t}function vi({record:e}){return!!(e.name||e.components&&Object.keys(e.components).length||e.redirect)}function os(e){const t=je(sr),o=je(ir),n=le(()=>{const l=Te(e.to);return t.resolve(l)}),r=le(()=>{const{matched:l}=n.value,{length:p}=l,d=l[p-1],u=o.matched;if(!d||!u.length)return-1;const E=u.findIndex(Kt.bind(null,d));if(E>-1)return E;const f=ns(l[p-2]);return p>1&&ns(d)===f&&u[u.length-1].path!==f?u.findIndex(Kt.bind(null,l[p-2])):E}),s=le(()=>r.value>-1&&hc(o.params,n.value.params)),i=le(()=>r.value>-1&&r.value===o.matched.length-1&&Li(o.params,n.value.params));function a(l={}){if(Ec(l)){const p=t[Te(e.replace)?"replace":"push"](Te(e.to)).catch(mo);return e.viewTransition&&typeof document<"u"&&"startViewTransition"in document&&document.startViewTransition(()=>p),p}return Promise.resolve()}return{route:n,href:le(()=>n.value.href),isActive:s,isExactActive:i,navigate:a}}function uc(e){return e.length===1?e[0]:e}const pc=Mt({name:"RouterLink",compatConfig:{MODE:3},props:{to:{type:[String,Object],required:!0},replace:Boolean,activeClass:String,exactActiveClass:String,custom:Boolean,ariaCurrentValue:{type:String,default:"page"},viewTransition:Boolean},useLink:os,setup(e,{slots:t}){const o=zo(os(e)),{options:n}=je(sr),r=le(()=>({[rs(e.activeClass,n.linkActiveClass,"router-link-active")]:o.isActive,[rs(e.exactActiveClass,n.linkExactActiveClass,"router-link-exact-active")]:o.isExactActive}));return()=>{const s=t.default&&uc(t.default(o));return e.custom?s:Ei("a",{"aria-current":o.isExactActive?e.ariaCurrentValue:null,href:o.href,onClick:o.navigate,class:r.value},s)}}}),mc=pc;function Ec(e){if(!(e.metaKey||e.altKey||e.ctrlKey||e.shiftKey)&&!e.defaultPrevented&&!(e.button!==void 0&&e.button!==0)){if(e.currentTarget&&e.currentTarget.getAttribute){const t=e.currentTarget.getAttribute("target");if(/\b_blank\b/i.test(t))return}return e.preventDefault&&e.preventDefault(),!0}}function hc(e,t){for(const o in t){const n=t[o],r=e[o];if(typeof n=="string"){if(n!==r)return!1}else if(!Ue(r)||r.length!==n.length||n.some((s,i)=>s.valueOf()!==r[i].valueOf()))return!1}return!0}function ns(e){return e?e.aliasOf?e.aliasOf.path:e.path:""}const rs=(e,t,o)=>e??t??o,fc=Mt({name:"RouterView",inheritAttrs:!1,props:{name:{type:String,default:"default"},route:Object},compatConfig:{MODE:3},setup(e,{attrs:t,slots:o}){const n=je(Dn),r=le(()=>e.route||n.value),s=je(jr,0),i=le(()=>{let p=Te(s);const{matched:d}=r.value;let u;for(;(u=d[p])&&!u.components;)p++;return p}),a=le(()=>r.value.matched[i.value]);bo(jr,le(()=>i.value+1)),bo(Yd,a),bo(Dn,r);const l=ft();return ao(()=>[l.value,a.value,e.name],([p,d,u],[E,f,O])=>{d&&(d.instances[u]=p,f&&f!==d&&p&&p===E&&(d.leaveGuards.size||(d.leaveGuards=f.leaveGuards),d.updateGuards.size||(d.updateGuards=f.updateGuards))),p&&d&&(!f||!Kt(d,f)||!E)&&(d.enterCallbacks[u]||[]).forEach(T=>T(p))},{flush:"post"}),()=>{const p=r.value,d=e.name,u=a.value,E=u&&u.components[d];if(!E)return ss(o.default,{Component:E,route:p});const f=u.props[d],O=f?f===!0?p.params:typeof f=="function"?f(p):f:null,x=Ei(E,q({},O,t,{onVnodeUnmounted:U=>{U.component.isUnmounted&&(u.instances[d]=null)},ref:l}));return ss(o.default,{Component:x,route:p})||x}}});function ss(e,t){if(!e)return null;const o=e(t);return o.length===1?o[0]:o}const yc=fc;function gc(e){const t=ic(e.routes,e),o=e.parseQuery||Vd,n=e.stringifyQuery||Kr,r=e.history,s=eo(),i=eo(),a=eo(),l=ma(pt);let p=pt;Wt&&e.scrollBehavior&&"scrollRestoration"in history&&(history.scrollRestoration="manual");const d=yn.bind(null,S=>""+S),u=yn.bind(null,Ld),E=yn.bind(null,So);function f(S,w){let C,D;return Ai(S)?(C=t.getRecordMatcher(S),D=w):D=S,t.addRoute(D,C)}function O(S){const w=t.getRecordMatcher(S);w&&t.removeRoute(w)}function T(){return t.getRoutes().map(S=>S.record)}function x(S){return!!t.getRecordMatcher(S)}function U(S,w){if(w=q({},w||l.value),typeof S=="string"){const h=gn(o,S,w.path),y=t.resolve({path:h.path},w),R=r.createHref(h.fullPath);return q(h,y,{params:E(y.params),hash:So(h.hash),redirectedFrom:void 0,href:R})}let C;if(S.path!=null)C=q({},S,{path:gn(o,S.path,w.path).path});else{const h=q({},S.params);for(const y in h)h[y]==null&&delete h[y];C=q({},S,{params:u(h)}),w.params=u(w.params)}const D=t.resolve(C,w),V=S.hash||"";D.params=d(E(D.params));const c=Cd(n,q({},S,{hash:Nd(V),path:D.path})),m=r.createHref(c);return q({fullPath:c,hash:V,query:n===Kr?Qd(S.query):S.query||{}},D,{redirectedFrom:void 0,href:m})}function _(S){return typeof S=="string"?gn(o,S,l.value.path):q({},S)}function b(S,w){if(p!==S)return jt(oe.NAVIGATION_CANCELLED,{from:w,to:S})}function M(S){return te(S)}function K(S){return M(q(_(S),{replace:!0}))}function ce(S,w){const C=S.matched[S.matched.length-1];if(C&&C.redirect){const{redirect:D}=C;let V=typeof D=="function"?D(S,w):D;return typeof V=="string"&&(V=V.includes("?")||V.includes("#")?V=_(V):{path:V},V.params={}),q({query:S.query,hash:S.hash,params:V.path!=null?{}:S.params},V)}}function te(S,w){const C=p=U(S),D=l.value,V=S.state,c=S.force,m=S.replace===!0,h=ce(C,D);if(h)return te(q(_(h),{state:typeof h=="object"?q({},V,h.state):V,force:c,replace:m}),w||C);const y=C;y.redirectedFrom=w;let R;return!c&&bd(n,D,C)&&(R=jt(oe.NAVIGATION_DUPLICATED,{to:y,from:D}),He(D,D,!0,!1)),(R?Promise.resolve(R):Fe(y,D)).catch(g=>et(g)?et(g,oe.NAVIGATION_GUARD_REDIRECT)?g:ut(g):Y(g,y,D)).then(g=>{if(g){if(et(g,oe.NAVIGATION_GUARD_REDIRECT))return te(q({replace:m},_(g.to),{state:typeof g.to=="object"?q({},V,g.to.state):V,force:c}),w||y)}else g=gt(y,D,!0,m,V);return ct(y,D,g),g})}function De(S,w){const C=b(S,w);return C?Promise.reject(C):Promise.resolve()}function dt(S){const w=Ft.values().next().value;return w&&typeof w.runWithContext=="function"?w.runWithContext(S):S()}function Fe(S,w){let C;const[D,V,c]=qd(S,w);C=Tn(D.reverse(),"beforeRouteLeave",S,w);for(const h of D)h.leaveGuards.forEach(y=>{C.push(Et(y,S,w))});const m=De.bind(null,S,w);return C.push(m),_e(C).then(()=>{C=[];for(const h of s.list())C.push(Et(h,S,w));return C.push(m),_e(C)}).then(()=>{C=Tn(V,"beforeRouteUpdate",S,w);for(const h of V)h.updateGuards.forEach(y=>{C.push(Et(y,S,w))});return C.push(m),_e(C)}).then(()=>{C=[];for(const h of c)if(h.beforeEnter)if(Ue(h.beforeEnter))for(const y of h.beforeEnter)C.push(Et(y,S,w));else C.push(Et(h.beforeEnter,S,w));return C.push(m),_e(C)}).then(()=>(S.matched.forEach(h=>h.enterCallbacks={}),C=Tn(c,"beforeRouteEnter",S,w,dt),C.push(m),_e(C))).then(()=>{C=[];for(const h of i.list())C.push(Et(h,S,w));return C.push(m),_e(C)}).catch(h=>et(h,oe.NAVIGATION_CANCELLED)?h:Promise.reject(h))}function ct(S,w,C){a.list().forEach(D=>dt(()=>D(S,w,C)))}function gt(S,w,C,D,V){const c=b(S,w);if(c)return c;const m=w===pt,h=Wt?history.state:{};C&&(D||m?r.replace(S.fullPath,q({scroll:m&&h&&h.scroll},V)):r.push(S.fullPath,V)),l.value=S,He(S,w,C,m),ut()}let Pe;function Xt(){Pe||(Pe=r.listen((S,w,C)=>{if(!St.listening)return;const D=U(S),V=ce(D,St.currentRoute.value);if(V){te(q(V,{replace:!0,force:!0}),D).catch(mo);return}p=D;const c=l.value;Wt&&Pd(Jr(c.fullPath,C.delta),on()),Fe(D,c).catch(m=>et(m,oe.NAVIGATION_ABORTED|oe.NAVIGATION_CANCELLED)?m:et(m,oe.NAVIGATION_GUARD_REDIRECT)?(te(q(_(m.to),{force:!0}),D).then(h=>{et(h,oe.NAVIGATION_ABORTED|oe.NAVIGATION_DUPLICATED)&&!C.delta&&C.type===Mn.pop&&r.go(-1,!1)}).catch(mo),Promise.reject()):(C.delta&&r.go(-C.delta,!1),Y(m,D,c))).then(m=>{m=m||gt(D,c,!1),m&&(C.delta&&!et(m,oe.NAVIGATION_CANCELLED)?r.go(-C.delta,!1):C.type===Mn.pop&&et(m,oe.NAVIGATION_ABORTED|oe.NAVIGATION_DUPLICATED)&&r.go(-1,!1)),ct(D,c,m)}).catch(mo)}))}let Ut=eo(),ae=eo(),X;function Y(S,w,C){ut(S);const D=ae.list();return D.length?D.forEach(V=>V(S,w,C)):console.error(S),Promise.reject(S)}function ze(){return X&&l.value!==pt?Promise.resolve():new Promise((S,w)=>{Ut.add([S,w])})}function ut(S){return X||(X=!S,Xt(),Ut.list().forEach(([w,C])=>S?C(S):w()),Ut.reset()),S}function He(S,w,C,D){const{scrollBehavior:V}=e;if(!Wt||!V)return Promise.resolve();const c=!C&&Hd(Jr(S.fullPath,0))||(D||!C)&&history.state&&history.state.scroll||null;return Us().then(()=>V(S,w,c)).then(m=>m&&Fd(m)).catch(m=>Y(m,S,w))}const Ne=S=>r.go(S);let Dt;const Ft=new Set,St={currentRoute:l,listening:!0,addRoute:f,removeRoute:O,clearRoutes:t.clearRoutes,hasRoute:x,getRoutes:T,resolve:U,options:e,push:M,replace:K,go:Ne,back:()=>Ne(-1),forward:()=>Ne(1),beforeEach:s.add,beforeResolve:i.add,afterEach:a.add,onError:ae.add,isReady:ze,install(S){S.component("RouterLink",mc),S.component("RouterView",yc),S.config.globalProperties.$router=St,Object.defineProperty(S.config.globalProperties,"$route",{enumerable:!0,get:()=>Te(l)}),Wt&&!Dt&&l.value===pt&&(Dt=!0,M(r.location).catch(D=>{}));const w={};for(const D in pt)Object.defineProperty(w,D,{get:()=>l.value[D],enumerable:!0});S.provide(sr,St),S.provide(ir,vs(w)),S.provide(Dn,l);const C=S.unmount;Ft.add(S),S.unmount=function(){Ft.delete(S),Ft.size<1&&(p=pt,Pe&&Pe(),Pe=null,l.value=pt,Dt=!1,X=!1),C()}}};function _e(S){return S.reduce((w,C)=>w.then(()=>dt(C)),Promise.resolve())}return St}function du(e){return je(ir)}const Sc={id:1,title:"MySQL Foundations",slug:"foundations",description:"What is MySQL, how tables work, data types, and your first SELECT queries.",icon:"Database",color:"#2980B9",lessons:[{id:1,moduleId:1,title:"What is MySQL?",slug:"what-is-mysql",content:[{type:"text",html:`<h2>Welcome to MySQL</h2>
<p>MySQL is the world's most popular open-source relational database. It powers companies like Facebook, Twitter, YouTube, and Netflix. If you're building a web application, chances are MySQL is behind it.</p>
<p>A <strong>relational database</strong> stores data in <strong>tables</strong> — structured collections of rows and columns, similar to a spreadsheet. The "relational" part means tables can reference each other through relationships.</p>`},{type:"callout",calloutType:"mysql",html:"<strong>InnoDB</strong> is MySQL's default storage engine. It provides ACID transactions, row-level locking, and crash recovery. Almost every MySQL table you'll work with uses InnoDB."},{type:"text",html:`<h3>Key Concepts</h3>
<ul>
<li><strong>Database</strong> — a container for related tables (like a folder)</li>
<li><strong>Table</strong> — a structured collection of data with defined columns</li>
<li><strong>Row</strong> — a single record in a table (also called a "record" or "tuple")</li>
<li><strong>Column</strong> — a field in a table with a specific data type (also called an "attribute")</li>
<li><strong>Primary Key</strong> — a column (or columns) that uniquely identifies each row</li>
</ul>`},{type:"text",html:`<h3>Our Practice Database</h3>
<p>Throughout this training, you'll work with a realistic database containing 6 tables:</p>
<ul>
<li><strong>employees</strong> — 50 employees with names, salaries, departments, and managers</li>
<li><strong>departments</strong> — 10 departments (Engineering, Marketing, Sales, etc.)</li>
<li><strong>customers</strong> — 30 business customers from around the world</li>
<li><strong>products</strong> — 20 products across 7 categories</li>
<li><strong>orders</strong> — 40 orders with statuses (pending, shipped, delivered, cancelled)</li>
<li><strong>order_items</strong> — 60 line items connecting orders to products</li>
</ul>`},{type:"sandbox",description:"Try running a query! Type the SQL below and press Ctrl+Enter (or click Run):",defaultQuery:"SELECT name, email FROM employees LIMIT 5;"}]},{id:2,moduleId:1,title:"Tables, Rows, and Columns",slug:"tables-rows-columns",content:[{type:"text",html:`<h2>Understanding Table Structure</h2>
<p>Every table in MySQL has a fixed set of <strong>columns</strong> (defined when the table is created) and a variable number of <strong>rows</strong> (added as data is inserted).</p>
<p>Think of it like a spreadsheet:</p>
<ul>
<li>Columns are the headers (name, email, salary)</li>
<li>Rows are the data entries (one per employee)</li>
<li>Each cell holds a single value of a specific type</li>
</ul>`},{type:"text",html:`<h3>Exploring Table Structure</h3>
<p>In MySQL, you'd use <code>DESCRIBE employees;</code> or <code>SHOW COLUMNS FROM employees;</code> to see a table's structure. In our sandbox, you can use <code>PRAGMA table_info(employees);</code> which serves the same purpose.</p>`},{type:"sandbox",description:"Explore the employees table structure:",defaultQuery:"PRAGMA table_info(employees);"},{type:"text",html:`<h3>Counting Rows</h3>
<p>To see how much data is in a table, use <code>SELECT COUNT(*) FROM table_name;</code></p>`},{type:"sandbox",description:"How many employees do we have?",defaultQuery:"SELECT COUNT(*) AS total_employees FROM employees;"},{type:"callout",calloutType:"tip",html:'The <code>AS</code> keyword creates an <strong>alias</strong> — a custom name for a column in the output. <code>COUNT(*) AS total_employees</code> makes the result column named "total_employees" instead of "COUNT(*)".'}]},{id:3,moduleId:1,title:"MySQL Data Types",slug:"data-types",content:[{type:"text",html:`<h2>Data Types in MySQL</h2>
<p>Every column in a MySQL table has a <strong>data type</strong> that defines what kind of values it can store. Choosing the right type matters for storage efficiency and query performance.</p>`},{type:"text",html:`<h3>Numeric Types</h3>
<ul>
<li><code>INT</code> / <code>INTEGER</code> — whole numbers (-2 billion to 2 billion)</li>
<li><code>BIGINT</code> — very large whole numbers</li>
<li><code>DECIMAL(M,D)</code> — exact decimal numbers (e.g., money: <code>DECIMAL(10,2)</code>)</li>
<li><code>FLOAT</code> / <code>DOUBLE</code> — approximate decimal numbers (for science, not money)</li>
</ul>

<h3>String Types</h3>
<ul>
<li><code>VARCHAR(N)</code> — variable-length string up to N characters (most common)</li>
<li><code>TEXT</code> — long text (up to 65KB)</li>
<li><code>CHAR(N)</code> — fixed-length string, always N characters</li>
<li><code>ENUM('a','b','c')</code> — one value from a predefined list (MySQL-specific)</li>
</ul>

<h3>Date & Time Types</h3>
<ul>
<li><code>DATE</code> — date only (2024-01-15)</li>
<li><code>DATETIME</code> — date and time (2024-01-15 14:30:00)</li>
<li><code>TIMESTAMP</code> — like DATETIME but converts to UTC</li>
</ul>`},{type:"callout",calloutType:"mysql",html:"<strong>MySQL-specific types</strong>: <code>ENUM</code> and <code>SET</code> are unique to MySQL. <code>JSON</code> type (MySQL 5.7+) stores structured JSON data with validation. These don't exist in most other databases."},{type:"comparison",left:{title:"Good: Use DECIMAL for money",content:"<code>price DECIMAL(10,2)</code><br>Stores exact values: 19.99 is always 19.99"},right:{title:"Bad: Use FLOAT for money",content:"<code>price FLOAT</code><br>Approximate: 19.99 might become 19.989999..."}},{type:"sandbox",description:"See what types of data are in our tables:",defaultQuery:"SELECT id, name, salary, hire_date FROM employees LIMIT 3;"}]},{id:4,moduleId:1,title:"Your First SELECT",slug:"first-select",content:[{type:"text",html:`<h2>The SELECT Statement</h2>
<p><code>SELECT</code> is the most important SQL statement — it retrieves data from tables. You'll use it in almost every query.</p>`},{type:"code",title:"Basic syntax",sql:"SELECT column1, column2 FROM table_name;"},{type:"text",html:`<h3>Select All Columns</h3>
<p>Use <code>*</code> to select all columns. Handy for exploration, but avoid it in production code (it's slower and fragile).</p>`},{type:"sandbox",description:"Select all columns from the departments table:",defaultQuery:"SELECT * FROM departments;"},{type:"text",html:`<h3>Select Specific Columns</h3>
<p>Always prefer naming your columns. It's faster, clearer, and won't break if the table structure changes.</p>`},{type:"sandbox",description:"Select just names and salaries:",defaultQuery:"SELECT name, salary FROM employees LIMIT 10;"},{type:"callout",calloutType:"tip",html:"<code>LIMIT N</code> restricts the output to N rows. Essential when exploring large tables — you don't want to dump millions of rows!"},{type:"text",html:`<h3>Column Aliases</h3>
<p>Use <code>AS</code> to rename columns in the output:</p>`},{type:"sandbox",description:"Aliases make output more readable:",defaultQuery:`SELECT name AS employee_name, salary AS annual_salary
FROM employees
LIMIT 5;`}]},{id:5,moduleId:1,title:"DISTINCT and Expressions",slug:"distinct-expressions",content:[{type:"text",html:`<h2>Removing Duplicates with DISTINCT</h2>
<p><code>SELECT DISTINCT</code> removes duplicate rows from the result. Useful for finding unique values in a column.</p>`},{type:"sandbox",description:"What countries do our customers come from?",defaultQuery:"SELECT DISTINCT country FROM customers ORDER BY country;"},{type:"text",html:`<h3>Expressions in SELECT</h3>
<p>You can use calculations and expressions in your SELECT. MySQL evaluates them for each row.</p>`},{type:"sandbox",description:"Calculate monthly salary from annual salary:",defaultQuery:`SELECT name, salary, ROUND(salary / 12, 2) AS monthly_salary
FROM employees
LIMIT 5;`},{type:"text",html:`<h3>String Concatenation</h3>
<p>In MySQL, use <code>CONCAT()</code> to join strings together:</p>`},{type:"sandbox",description:"Combine name and department_id:",defaultQuery:`SELECT name || ' (Dept ' || department_id || ')' AS employee_info
FROM employees
LIMIT 5;`},{type:"callout",calloutType:"mysql",html:"In MySQL you'd write <code>CONCAT(name, ' (Dept ', department_id, ')')</code>. Our sandbox uses SQLite's <code>||</code> operator for concatenation, which also works in many databases. MySQL supports <code>||</code> too if <code>PIPES_AS_CONCAT</code> mode is enabled."}]},{id:6,moduleId:1,title:"String Functions",slug:"string-functions",content:[{type:"text",html:`<h2>Working with Text</h2>
<p>MySQL provides many functions for manipulating strings:</p>
<ul>
<li><code>UPPER(str)</code> / <code>LOWER(str)</code> — change case</li>
<li><code>LENGTH(str)</code> — number of characters</li>
<li><code>TRIM(str)</code> — remove leading/trailing spaces</li>
<li><code>SUBSTR(str, start, len)</code> — extract a substring</li>
<li><code>REPLACE(str, from, to)</code> — replace occurrences</li>
<li><code>INSTR(str, search)</code> — find position of substring</li>
</ul>`},{type:"sandbox",description:"Try string functions:",defaultQuery:`SELECT
  name,
  UPPER(name) AS upper_name,
  LENGTH(name) AS name_len,
  SUBSTR(name, 1, INSTR(name, ' ') - 1) AS first_name
FROM employees
LIMIT 5;`},{type:"sandbox",description:"Extract email domain:",defaultQuery:`SELECT
  email,
  SUBSTR(email, INSTR(email, '@') + 1) AS domain
FROM employees
LIMIT 5;`}]},{id:7,moduleId:1,title:"Date & Numeric Functions",slug:"date-numeric-functions",content:[{type:"text",html:`<h2>Date Functions</h2>
<p>MySQL has powerful date manipulation functions:</p>
<ul>
<li><code>DATE('2024-01-15 14:30:00')</code> — extract date part</li>
<li><code>STRFTIME('%Y', date)</code> — format/extract (SQLite) / <code>YEAR(date)</code>, <code>MONTH(date)</code> in MySQL</li>
<li><code>DATE(date, '+1 month')</code> — date arithmetic (SQLite) / <code>DATE_ADD(date, INTERVAL 1 MONTH)</code> in MySQL</li>
<li><code>julianday(d2) - julianday(d1)</code> — days between (SQLite) / <code>DATEDIFF(d2, d1)</code> in MySQL</li>
</ul>`},{type:"sandbox",description:"Employee tenure in years:",defaultQuery:`SELECT
  name,
  hire_date,
  ROUND((julianday('2026-04-19') - julianday(hire_date)) / 365.25, 1) AS years_employed
FROM employees
ORDER BY hire_date
LIMIT 10;`},{type:"text",html:`<h2>Numeric Functions</h2>
<ul>
<li><code>ROUND(n, decimals)</code> — round to N decimal places</li>
<li><code>CEIL(n)</code> / <code>FLOOR(n)</code> — round up / down</li>
<li><code>ABS(n)</code> — absolute value</li>
<li><code>n % m</code> or <code>MOD(n, m)</code> — modulo (remainder)</li>
</ul>`},{type:"sandbox",description:"Numeric function examples:",defaultQuery:`SELECT
  price,
  ROUND(price, 0) AS rounded,
  CAST(price AS INTEGER) AS truncated,
  ABS(price - 50) AS dist_from_50,
  price * 1.21 AS with_vat,
  ROUND(price * 1.21, 2) AS vat_rounded
FROM products
LIMIT 8;`},{type:"callout",calloutType:"mysql",html:"<strong>MySQL date functions</strong> differ from SQLite. MySQL uses <code>YEAR()</code>, <code>MONTH()</code>, <code>DATEDIFF()</code>, <code>DATE_ADD()</code>, <code>DATE_FORMAT()</code>. SQLite uses <code>STRFTIME()</code> and <code>julianday()</code>. The concepts are identical — only syntax differs."}]}],exercises:[{id:1,moduleId:1,title:"Select Employee Names",description:"<p>Write a query to get all employee <strong>names</strong> from the <code>employees</code> table.</p>",difficulty:"easy",starterQuery:`-- Get all employee names
SELECT `,expectedQuery:"SELECT name FROM employees;",expectedResult:{columns:["name"],values:[["Alice Johnson"],["Bob Smith"],["Carol Davis"],["David Wilson"],["Eva Martinez"],["Frank Brown"],["Grace Lee"],["Henry Taylor"],["Iris Chen"],["Jack Anderson"],["Kate Thomas"],["Liam Moore"],["Mia Jackson"],["Noah White"],["Olivia Harris"],["Peter Clark"],["Quinn Lewis"],["Rachel Robinson"],["Sam Walker"],["Tina Hall"],["Uma Allen"],["Victor Young"],["Wendy King"],["Xavier Wright"],["Yara Scott"],["Zach Green"],["Amy Baker"],["Brian Adams"],["Chloe Turner"],["Daniel Phillips"],["Elena Campbell"],["Felix Parker"],["Gina Evans"],["Hugo Edwards"],["Isla Collins"],["James Stewart"],["Kelly Morris"],["Leo Rogers"],["Maya Reed"],["Nathan Cook"],["Ophelia Morgan"],["Paul Bell"],["Rosa Murphy"],["Steve Bailey"],["Tara Rivera"],["Ulrich Cooper"],["Vera Richardson"],["Will Cox"],["Xena Howard"],["Yuri Ward"]]},hints:["Use SELECT column_name FROM table_name",'The column you need is called "name"',"SELECT name FROM employees;"],validationMode:"unordered"},{id:2,moduleId:1,title:"Department List",description:"<p>Write a query to show the <strong>name</strong> and <strong>location</strong> of all departments.</p>",difficulty:"easy",starterQuery:`-- Get department names and locations
`,expectedQuery:"SELECT name, location FROM departments;",expectedResult:{columns:["name","location"],values:[["Engineering","New York"],["Marketing","London"],["Sales","New York"],["HR","Berlin"],["Finance","Tokyo"],["Operations","Madrid"],["Support","Toronto"],["Legal","Paris"],["Product","Singapore"],["Design","Sydney"]]},hints:["Select two columns from the departments table","SELECT name, location FROM ...","SELECT name, location FROM departments;"],validationMode:"unordered"},{id:3,moduleId:1,title:"Unique Countries",description:"<p>Write a query to list all <strong>unique countries</strong> where our customers are located. Use <code>DISTINCT</code> to remove duplicates.</p>",difficulty:"easy",starterQuery:`-- Get unique customer countries
`,expectedQuery:"SELECT DISTINCT country FROM customers;",expectedResult:{columns:["country"],values:[["USA"],["UK"],["Germany"],["Japan"],["Switzerland"],["Australia"],["Sweden"],["Spain"],["Canada"],["Singapore"],["France"],["UAE"],["China"]]},hints:["Use SELECT DISTINCT to remove duplicates",'The column is "country" in the "customers" table',"SELECT DISTINCT country FROM customers;"],validationMode:"unordered"}]},Tc={id:2,title:"Filtering & Sorting",slug:"filtering-sorting",description:"WHERE clauses, comparison operators, pattern matching, ORDER BY, LIMIT, and NULL handling.",icon:"Filter",color:"#27AE60",lessons:[{id:1,moduleId:2,title:"WHERE Clause Basics",slug:"where-basics",content:[{type:"text",html:`<h2>Filtering Rows with WHERE</h2>
<p>The <code>WHERE</code> clause filters rows based on a condition. Only rows where the condition is <strong>true</strong> appear in the result.</p>`},{type:"code",title:"Syntax",sql:"SELECT columns FROM table WHERE condition;"},{type:"sandbox",description:"Find employees in department 1 (Engineering):",defaultQuery:"SELECT name, salary FROM employees WHERE department_id = 1;"},{type:"text",html:`<h3>Comparison Operators</h3>
<ul>
<li><code>=</code> — equals</li>
<li><code>!=</code> or <code>&lt;&gt;</code> — not equals</li>
<li><code>&gt;</code> — greater than</li>
<li><code>&lt;</code> — less than</li>
<li><code>&gt;=</code> — greater than or equal</li>
<li><code>&lt;=</code> — less than or equal</li>
</ul>`},{type:"sandbox",description:"Find employees earning more than $100,000:",defaultQuery:"SELECT name, salary FROM employees WHERE salary > 100000 ORDER BY salary DESC;"}]},{id:2,moduleId:2,title:"AND, OR, and NOT",slug:"logical-operators",content:[{type:"text",html:`<h2>Combining Conditions</h2>
<p>Use <code>AND</code>, <code>OR</code>, and <code>NOT</code> to combine multiple conditions.</p>
<ul>
<li><code>AND</code> — both conditions must be true</li>
<li><code>OR</code> — at least one condition must be true</li>
<li><code>NOT</code> — reverses a condition</li>
</ul>`},{type:"sandbox",description:"Engineers earning over $100K:",defaultQuery:`SELECT name, salary
FROM employees
WHERE department_id = 1 AND salary > 100000;`},{type:"sandbox",description:"Employees in Engineering OR Marketing:",defaultQuery:`SELECT name, department_id
FROM employees
WHERE department_id = 1 OR department_id = 2;`},{type:"callout",calloutType:"warning",html:"<strong>Operator precedence</strong>: <code>AND</code> is evaluated before <code>OR</code>. Use parentheses to make your intent clear!<br><code>WHERE (dept = 1 OR dept = 2) AND salary > 100000</code> is different from<br><code>WHERE dept = 1 OR dept = 2 AND salary > 100000</code>"}]},{id:3,moduleId:2,title:"IN, BETWEEN, and LIKE",slug:"range-pattern",content:[{type:"text",html:`<h2>Range and Pattern Operators</h2>
<h3>IN — match any value in a list</h3>
<p>Shorter than writing multiple <code>OR</code> conditions:</p>`},{type:"sandbox",description:"Employees in Engineering, Sales, or Product:",defaultQuery:`SELECT name, department_id
FROM employees
WHERE department_id IN (1, 3, 9);`},{type:"text",html:"<h3>BETWEEN — match a range (inclusive)</h3>"},{type:"sandbox",description:"Employees with salaries between $80K and $100K:",defaultQuery:`SELECT name, salary
FROM employees
WHERE salary BETWEEN 80000 AND 100000
ORDER BY salary;`},{type:"text",html:`<h3>LIKE — pattern matching</h3>
<p>Two wildcards: <code>%</code> matches any sequence of characters, <code>_</code> matches exactly one character.</p>`},{type:"sandbox",description:'Find employees whose name starts with "A":',defaultQuery:"SELECT name FROM employees WHERE name LIKE 'A%';"},{type:"callout",calloutType:"tip",html:`Common patterns: <code>'%son'</code> (ends with "son"), <code>'%an%'</code> (contains "an"), <code>'_o%'</code> (second letter is "o").`}]},{id:4,moduleId:2,title:"ORDER BY and LIMIT",slug:"order-limit",content:[{type:"text",html:`<h2>Sorting Results</h2>
<p><code>ORDER BY</code> sorts results. Default is ascending (<code>ASC</code>). Use <code>DESC</code> for descending.</p>`},{type:"sandbox",description:"Top 5 highest-paid employees:",defaultQuery:`SELECT name, salary
FROM employees
ORDER BY salary DESC
LIMIT 5;`},{type:"text",html:`<h3>Sorting by Multiple Columns</h3>
<p>You can sort by multiple columns. The second column breaks ties in the first.</p>`},{type:"sandbox",description:"Sort by department, then by salary (highest first):",defaultQuery:`SELECT name, department_id, salary
FROM employees
ORDER BY department_id ASC, salary DESC
LIMIT 15;`},{type:"text",html:`<h3>LIMIT with OFFSET</h3>
<p><code>LIMIT count OFFSET skip</code> is used for pagination. Skip the first N rows, then return count rows.</p>`},{type:"sandbox",description:"Page 2 of results (rows 6-10):",defaultQuery:`SELECT name, salary
FROM employees
ORDER BY salary DESC
LIMIT 5 OFFSET 5;`}]},{id:5,moduleId:2,title:"NULL — The Tricky Value",slug:"null-handling",content:[{type:"text",html:`<h2>Understanding NULL</h2>
<p><code>NULL</code> means "unknown" or "no value". It's <strong>not</strong> the same as 0, empty string, or false. NULL is the absence of any value.</p>`},{type:"callout",calloutType:"warning",html:"<strong>The #1 NULL trap</strong>: <code>NULL = NULL</code> is <strong>not true</strong>! You must use <code>IS NULL</code> or <code>IS NOT NULL</code> instead of <code>=</code> or <code>!=</code>."},{type:"sandbox",description:"Find employees who have no manager (top-level managers):",defaultQuery:`SELECT name, department_id
FROM employees
WHERE manager_id IS NULL;`},{type:"comparison",left:{title:"Correct",content:"<code>WHERE manager_id IS NULL</code><br>Returns employees with no manager."},right:{title:"Wrong (returns nothing!)",content:"<code>WHERE manager_id = NULL</code><br>NULL = NULL evaluates to NULL (not true), so no rows match."}},{type:"text",html:`<h3>COALESCE — Replace NULL with a Default</h3>
<p><code>COALESCE(value, default)</code> returns the first non-NULL argument. In MySQL you can also use <code>IFNULL(value, default)</code>.</p>`},{type:"sandbox",description:'Show "None" instead of NULL for manager_id:',defaultQuery:`SELECT name, COALESCE(manager_id, 0) AS manager_id
FROM employees
WHERE manager_id IS NULL;`}]},{id:6,moduleId:2,title:"CASE WHEN — Conditional Logic",slug:"case-when",content:[{type:"text",html:`<h2>CASE WHEN — SQL's If/Else</h2>
<p><code>CASE WHEN</code> lets you add conditional logic to your queries. It's like if/else for SQL.</p>`},{type:"code",title:"Syntax",sql:`CASE
  WHEN condition1 THEN result1
  WHEN condition2 THEN result2
  ELSE default_result
END`},{type:"sandbox",description:"Categorize employees by salary level:",defaultQuery:`SELECT
  name, salary,
  CASE
    WHEN salary >= 120000 THEN 'Executive'
    WHEN salary >= 100000 THEN 'Senior'
    WHEN salary >= 80000 THEN 'Mid-level'
    ELSE 'Junior'
  END AS level
FROM employees
ORDER BY salary DESC
LIMIT 15;`},{type:"sandbox",description:"Categorize orders by size:",defaultQuery:`SELECT
  id, total,
  CASE
    WHEN total >= 1000 THEN 'Large'
    WHEN total >= 200 THEN 'Medium'
    ELSE 'Small'
  END AS order_size,
  status
FROM orders
ORDER BY total DESC
LIMIT 12;`},{type:"callout",calloutType:"tip",html:"<code>CASE</code> is incredibly versatile. You can use it in SELECT, WHERE, ORDER BY, GROUP BY, and inside aggregate functions (as we'll see in Module 3)."}]}],exercises:[{id:1,moduleId:2,title:"High Earners",description:"<p>Find all employees with a salary <strong>greater than $100,000</strong>. Show their <code>name</code> and <code>salary</code>.</p>",difficulty:"easy",starterQuery:`-- Find high earners
`,expectedQuery:"SELECT name, salary FROM employees WHERE salary > 100000;",expectedResult:{columns:["name","salary"],values:[["Quinn Lewis",13e4],["Rachel Robinson",125e3],["Alice Johnson",12e4],["Rosa Murphy",12e4],["Hugo Edwards",118e3],["Bob Smith",115e3],["Xavier Wright",112e3],["Kate Thomas",11e4],["Sam Walker",108e3],["Nathan Cook",108e3],["Carol Davis",105e3],["Brian Adams",105e3],["Leo Rogers",105e3],["Tina Hall",102e3]]},hints:["Use WHERE salary > 100000","SELECT name, salary FROM employees WHERE ...","SELECT name, salary FROM employees WHERE salary > 100000;"],validationMode:"unordered"},{id:2,moduleId:2,title:"London Customers",description:"<p>Find all customers located in <strong>London</strong>. Show their <code>name</code> and <code>country</code>.</p>",difficulty:"easy",starterQuery:`-- Find London customers
`,expectedQuery:"SELECT name, country FROM customers WHERE city = 'London';",expectedResult:{columns:["name","country"],values:[["TechStart Inc","UK"],["CloudNine Ltd","UK"],["GreenTech Ltd","UK"],["Redwood Labs","UK"]]},hints:["String values need quotes: WHERE city = 'London'","SELECT name, country FROM customers WHERE ...","SELECT name, country FROM customers WHERE city = 'London';"],validationMode:"unordered"},{id:3,moduleId:2,title:"Delivered Orders",description:"<p>Find all <strong>delivered</strong> orders placed in <strong>2023</strong>. Show <code>id</code>, <code>order_date</code>, and <code>total</code>. Sort by total descending.</p>",difficulty:"medium",starterQuery:`-- Find delivered orders from 2023
`,expectedQuery:"SELECT id, order_date, total FROM orders WHERE status = 'delivered' AND order_date >= '2023-01-01' AND order_date < '2024-01-01' ORDER BY total DESC;",expectedResult:{columns:["id","order_date","total"],values:[[8,"2023-05-10",1749.98],[1,"2023-01-15",1329.98],[15,"2023-09-10",1299.99],[6,"2023-04-01",599.99],[11,"2023-07-01",479.98],[3,"2023-02-10",449.99],[13,"2023-08-05",399.99],[16,"2023-10-01",179.98],[5,"2023-03-15",154.98],[9,"2023-05-25",119.99],[10,"2023-06-15",94.98],[4,"2023-02-28",89.99],[14,"2023-08-25",84.98],[2,"2023-01-20",79.98],[12,"2023-07-20",59.98],[17,"2023-10-20",54.99],[7,"2023-04-20",39.99]]},hints:["Combine conditions with AND: status = 'delivered' AND date conditions","Filter dates with: order_date >= '2023-01-01' AND order_date < '2024-01-01'","SELECT id, order_date, total FROM orders WHERE status = 'delivered' AND order_date >= '2023-01-01' AND order_date < '2024-01-01' ORDER BY total DESC;"],validationMode:"exact"},{id:4,moduleId:2,title:"Product Search",description:"<p>Find all products in the <strong>Electronics</strong> or <strong>Books</strong> categories with a price <strong>under $50</strong>. Show <code>name</code>, <code>category</code>, and <code>price</code>.</p>",difficulty:"medium",starterQuery:`-- Find affordable electronics and books
`,expectedQuery:"SELECT name, category, price FROM products WHERE category IN ('Electronics', 'Books') AND price < 50;",expectedResult:{columns:["name","category","price"],values:[["Wireless Mouse","Electronics",29.99],["USB-C Hub","Electronics",49.99],["SQL Mastery Guide","Books",39.99],["Database Design Patterns","Books",44.99]]},hints:["Use IN ('Electronics', 'Books') instead of multiple OR","Combine with AND price < 50","SELECT name, category, price FROM products WHERE category IN ('Electronics', 'Books') AND price < 50;"],validationMode:"unordered"},{id:5,moduleId:2,title:"Top-Level Managers",description:"<p>Find all employees who have <strong>no manager</strong> (manager_id is NULL). Show their <code>name</code> and <code>department_id</code>, sorted by name.</p>",difficulty:"easy",starterQuery:`-- Find top-level managers
`,expectedQuery:"SELECT name, department_id FROM employees WHERE manager_id IS NULL ORDER BY name;",expectedResult:{columns:["name","department_id"],values:[["Alice Johnson",1],["David Wilson",2],["Frank Brown",3],["Iris Chen",4],["Kate Thomas",5],["Mia Jackson",6],["Olivia Harris",7],["Quinn Lewis",8],["Sam Walker",9],["Uma Allen",10]]},hints:["Use IS NULL, not = NULL","WHERE manager_id IS NULL","SELECT name, department_id FROM employees WHERE manager_id IS NULL ORDER BY name;"],validationMode:"exact"}]},Rc={id:3,title:"Aggregation & Grouping",slug:"aggregation",description:"COUNT, SUM, AVG, GROUP BY, HAVING, GROUP_CONCAT, and WITH ROLLUP.",icon:"BarChart",color:"#8E44AD",lessons:[{id:1,moduleId:3,title:"Aggregate Functions",slug:"aggregate-functions",content:[{type:"text",html:`<h2>Summarizing Data with Aggregates</h2>
<p>Aggregate functions process multiple rows and return a single result. They're how you answer questions like "how many?", "what's the total?", and "what's the average?".</p>
<h3>The Big Five</h3>
<ul>
<li><code>COUNT(*)</code> — count all rows</li>
<li><code>COUNT(column)</code> — count non-NULL values</li>
<li><code>SUM(column)</code> — add up all values</li>
<li><code>AVG(column)</code> — calculate the average</li>
<li><code>MIN(column)</code> / <code>MAX(column)</code> — find smallest/largest value</li>
</ul>`},{type:"sandbox",description:"Try all five aggregates on the employees table:",defaultQuery:`SELECT
  COUNT(*) AS total_employees,
  ROUND(AVG(salary), 2) AS avg_salary,
  MIN(salary) AS min_salary,
  MAX(salary) AS max_salary,
  SUM(salary) AS total_payroll
FROM employees;`},{type:"callout",calloutType:"warning",html:"<strong>COUNT(*) vs COUNT(column)</strong>: <code>COUNT(*)</code> counts all rows including NULLs. <code>COUNT(column)</code> only counts rows where that column is not NULL. This matters!"},{type:"sandbox",description:"See the difference — count all employees vs count those with managers:",defaultQuery:`SELECT
  COUNT(*) AS all_employees,
  COUNT(manager_id) AS has_manager
FROM employees;`},{type:"text",html:`<h3>Aggregates with WHERE</h3>
<p>You can filter rows <strong>before</strong> aggregating by adding a <code>WHERE</code> clause:</p>`},{type:"sandbox",description:"Average salary in Engineering (department 1):",defaultQuery:`SELECT
  COUNT(*) AS eng_count,
  ROUND(AVG(salary), 2) AS eng_avg_salary
FROM employees
WHERE department_id = 1;`}]},{id:2,moduleId:3,title:"GROUP BY",slug:"group-by",content:[{type:"text",html:`<h2>Grouping Rows</h2>
<p><code>GROUP BY</code> splits rows into groups based on column values, then applies aggregate functions to each group separately. This is how you answer "per-category" questions.</p>
<p>Watch how GROUP BY sorts rows into buckets:</p>`},{type:"animation",animation:"GroupByAnimation"},{type:"code",title:"Syntax",sql:`SELECT column, AGGREGATE(other_column)
FROM table
GROUP BY column;`},{type:"sandbox",description:"How many employees in each department?",defaultQuery:`SELECT department_id, COUNT(*) AS employee_count
FROM employees
GROUP BY department_id
ORDER BY employee_count DESC;`},{type:"callout",calloutType:"warning",html:"<strong>Rule</strong>: Every column in your <code>SELECT</code> must either be in the <code>GROUP BY</code> clause or inside an aggregate function. You can't select <code>name</code> if you're grouping by <code>department_id</code> — which name would MySQL pick from each group?"},{type:"text",html:`<h3>Multiple Grouping Columns</h3>
<p>You can group by multiple columns to create finer-grained groups:</p>`},{type:"sandbox",description:"Orders by status and year:",defaultQuery:`SELECT
  status,
  SUBSTR(order_date, 1, 4) AS year,
  COUNT(*) AS order_count,
  ROUND(SUM(total), 2) AS revenue
FROM orders
GROUP BY status, SUBSTR(order_date, 1, 4)
ORDER BY year, status;`}]},{id:3,moduleId:3,title:"HAVING vs WHERE",slug:"having-vs-where",content:[{type:"text",html:`<h2>Filtering Groups with HAVING</h2>
<p><code>WHERE</code> filters individual rows <strong>before</strong> grouping. <code>HAVING</code> filters groups <strong>after</strong> aggregation. This is a critical distinction.</p>`},{type:"comparison",left:{title:"WHERE (filters rows)",content:"Runs <strong>before</strong> GROUP BY.<br>Can reference table columns.<br>Cannot use aggregate functions."},right:{title:"HAVING (filters groups)",content:"Runs <strong>after</strong> GROUP BY.<br>Can use aggregate functions.<br>Filters based on group results."}},{type:"code",title:"Execution order",sql:`-- MySQL processes clauses in this order:
-- 1. FROM    → pick the table
-- 2. WHERE   → filter individual rows
-- 3. GROUP BY → form groups
-- 4. HAVING  → filter groups
-- 5. SELECT  → compute output columns
-- 6. ORDER BY → sort results
-- 7. LIMIT   → restrict row count`},{type:"sandbox",description:"Find departments with more than 5 employees:",defaultQuery:`SELECT department_id, COUNT(*) AS emp_count
FROM employees
GROUP BY department_id
HAVING COUNT(*) > 5
ORDER BY emp_count DESC;`},{type:"text",html:`<h3>Combining WHERE and HAVING</h3>
<p>You can use both: <code>WHERE</code> filters rows first, then <code>HAVING</code> filters the resulting groups.</p>`},{type:"sandbox",description:"Departments with more than 3 employees earning over $80K:",defaultQuery:`SELECT department_id, COUNT(*) AS high_earners
FROM employees
WHERE salary > 80000
GROUP BY department_id
HAVING COUNT(*) > 3;`}]},{id:4,moduleId:3,title:"Conditional Aggregation",slug:"conditional-aggregation",content:[{type:"text",html:`<h2>Aggregating with Conditions</h2>
<p>Sometimes you want to count or sum only specific rows within a group. Instead of multiple queries, use <code>CASE</code> inside aggregate functions.</p>`},{type:"sandbox",description:"Count orders by status in a single query:",defaultQuery:`SELECT
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
  COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled
FROM orders;`},{type:"callout",calloutType:"tip",html:'This "pivot" technique is incredibly useful for reporting. Instead of running 4 separate queries, you get all counts in a single pass over the data.'},{type:"text",html:`<h3>SUM with CASE</h3>
<p>You can also use <code>SUM(CASE WHEN ... THEN value END)</code> to sum different subsets:</p>`},{type:"sandbox",description:"Revenue by order status:",defaultQuery:`SELECT
  ROUND(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 2) AS delivered_revenue,
  ROUND(SUM(CASE WHEN status = 'pending' THEN total ELSE 0 END), 2) AS pending_revenue,
  ROUND(SUM(total), 2) AS total_revenue
FROM orders;`}]},{id:5,moduleId:3,title:"GROUP_CONCAT and Advanced Aggregates",slug:"group-concat",content:[{type:"text",html:`<h2>MySQL-Specific: GROUP_CONCAT</h2>
<p><code>GROUP_CONCAT()</code> concatenates values from multiple rows into a single string. It's a MySQL-specific function that's extremely useful for reports.</p>`},{type:"callout",calloutType:"mysql",html:"<code>GROUP_CONCAT</code> is MySQL-specific. PostgreSQL uses <code>STRING_AGG()</code>. Our sandbox uses SQLite's <code>GROUP_CONCAT()</code> which works the same way."},{type:"sandbox",description:"List all employee names per department:",defaultQuery:`SELECT
  department_id,
  GROUP_CONCAT(name, ', ') AS employees
FROM employees
GROUP BY department_id
ORDER BY department_id;`},{type:"text",html:`<h3>Useful Aggregate Patterns</h3>
<p>Here are patterns you'll use constantly in production MySQL:</p>`},{type:"sandbox",description:"Comprehensive department report:",defaultQuery:`SELECT
  department_id,
  COUNT(*) AS headcount,
  ROUND(AVG(salary), 0) AS avg_salary,
  MIN(hire_date) AS first_hire,
  MAX(hire_date) AS last_hire,
  GROUP_CONCAT(name) AS team
FROM employees
GROUP BY department_id
ORDER BY headcount DESC;`}]}],exercises:[{id:1,moduleId:3,title:"Total Payroll",description:"<p>Calculate the <strong>total salary</strong> of all employees. Name the result column <code>total_payroll</code>.</p>",difficulty:"easy",starterQuery:`-- Calculate total payroll
`,expectedQuery:"SELECT SUM(salary) AS total_payroll FROM employees;",expectedResult:{columns:["total_payroll"],values:[[4614e3]]},hints:["Use SUM() to add up all values in a column","SELECT SUM(salary) AS total_payroll FROM ...","SELECT SUM(salary) AS total_payroll FROM employees;"],validationMode:"exact"},{id:2,moduleId:3,title:"Employees Per Department",description:"<p>Count the number of employees in <strong>each department</strong>. Show <code>department_id</code> and <code>employee_count</code>. Sort by count descending.</p>",difficulty:"easy",starterQuery:`-- Count employees per department
`,expectedQuery:"SELECT department_id, COUNT(*) AS employee_count FROM employees GROUP BY department_id ORDER BY employee_count DESC;",expectedResult:{columns:["department_id","employee_count"],values:[[1,9],[3,7],[5,5],[9,5],[2,5],[10,4],[6,4],[4,4],[7,4],[8,3]]},hints:["Use GROUP BY department_id","COUNT(*) counts rows in each group","SELECT department_id, COUNT(*) AS employee_count FROM employees GROUP BY department_id ORDER BY employee_count DESC;"],validationMode:"exact"},{id:3,moduleId:3,title:"Big Departments",description:"<p>Find departments that have <strong>5 or more employees</strong>. Show <code>department_id</code> and <code>headcount</code>.</p>",difficulty:"medium",starterQuery:`-- Find departments with 5+ employees
`,expectedQuery:"SELECT department_id, COUNT(*) AS headcount FROM employees GROUP BY department_id HAVING COUNT(*) >= 5;",expectedResult:{columns:["department_id","headcount"],values:[[1,9],[2,5],[3,7],[5,5],[9,5]]},hints:["Use HAVING to filter groups (not WHERE)","HAVING COUNT(*) >= 5","SELECT department_id, COUNT(*) AS headcount FROM employees GROUP BY department_id HAVING COUNT(*) >= 5;"],validationMode:"unordered"},{id:4,moduleId:3,title:"Product Category Stats",description:"<p>For each product <code>category</code>, show the <strong>number of products</strong>, <strong>average price</strong> (rounded to 2 decimals), and <strong>total stock</strong>. Name the columns <code>category</code>, <code>product_count</code>, <code>avg_price</code>, <code>total_stock</code>.</p>",difficulty:"medium",starterQuery:`-- Product stats per category
`,expectedQuery:"SELECT category, COUNT(*) AS product_count, ROUND(AVG(price), 2) AS avg_price, SUM(stock) AS total_stock FROM products GROUP BY category;",expectedResult:{columns:["category","product_count","avg_price","total_stock"],values:[["Books",3,46.66,1e3],["Clothing",3,56.66,930],["Electronics",5,383.99,1250],["Food",3,18.99,1400],["Home",3,348.66,465],["Sports",3,59.99,800]]},hints:["GROUP BY category, use COUNT, AVG, SUM","ROUND(AVG(price), 2) for 2 decimal places","SELECT category, COUNT(*) AS product_count, ROUND(AVG(price), 2) AS avg_price, SUM(stock) AS total_stock FROM products GROUP BY category;"],validationMode:"unordered"},{id:5,moduleId:3,title:"Order Status Pivot",description:"<p>Create a single-row summary showing the count of orders for each status. Columns: <code>delivered</code>, <code>shipped</code>, <code>pending</code>, <code>cancelled</code>. Use conditional aggregation (CASE inside COUNT).</p>",difficulty:"hard",starterQuery:`-- Pivot order counts by status
SELECT
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
`,expectedQuery:"SELECT COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered, COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped, COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending, COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled FROM orders;",expectedResult:{columns:["delivered","shipped","pending","cancelled"],values:[[21,9,7,3]]},hints:["Use COUNT(CASE WHEN status = 'value' THEN 1 END) for each status","You need 4 COUNT(CASE...) expressions in one SELECT","SELECT COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered, COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped, COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending, COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled FROM orders;"],validationMode:"exact"}]},Nc={id:4,title:"JOINs — The Core Skill",slug:"joins",description:"INNER JOIN, LEFT/RIGHT JOIN, self joins, multi-table joins, and how MySQL executes them.",icon:"GitMerge",color:"#E74C3C",lessons:[{id:1,moduleId:4,title:"Why JOINs Matter",slug:"why-joins",content:[{type:"text",html:`<h2>Combining Data from Multiple Tables</h2>
<p>In a relational database, data is split across tables to avoid duplication. The <code>employees</code> table stores a <code>department_id</code> number, not the department name. To get the name, you <strong>JOIN</strong> the two tables together.</p>
<p>JOINs are the most important SQL skill. You'll use them in almost every real-world query.</p>`},{type:"comparison",left:{title:"Without JOIN (just IDs)",content:'<code>SELECT name, department_id FROM employees;</code><br>Shows "Alice Johnson, 1" — but what is department 1?'},right:{title:"With JOIN (readable data)",content:'<code>SELECT e.name, d.name FROM employees e JOIN departments d ON ...</code><br>Shows "Alice Johnson, Engineering"'}},{type:"sandbox",description:"Compare — without JOIN vs with JOIN:",defaultQuery:`-- Without JOIN: just IDs
SELECT name, department_id FROM employees LIMIT 5;`},{type:"sandbox",description:"Now with JOIN — much more useful:",defaultQuery:`SELECT e.name, d.name AS department, e.salary
FROM employees e
INNER JOIN departments d ON e.department_id = d.id
LIMIT 5;`},{type:"callout",calloutType:"tip",html:'<strong>Table aliases</strong>: <code>employees e</code> creates a short alias "e" so you can write <code>e.name</code> instead of <code>employees.name</code>. Essential when joining multiple tables.'}]},{id:2,moduleId:4,title:"INNER JOIN",slug:"inner-join",content:[{type:"text",html:`<h2>INNER JOIN — Matching Rows Only</h2>
<p><code>INNER JOIN</code> returns only rows that have a match in <strong>both</strong> tables. If an employee's <code>department_id</code> doesn't match any department, that employee is excluded.</p>
<p>Watch how INNER JOIN matches rows:</p>`},{type:"animation",animation:"JoinAnimation",props:{joinType:"inner"}},{type:"code",title:"Syntax",sql:`SELECT columns
FROM table_a
INNER JOIN table_b ON table_a.column = table_b.column;`},{type:"sandbox",description:"All employees with their department names:",defaultQuery:`SELECT
  e.name AS employee,
  d.name AS department,
  d.location
FROM employees e
INNER JOIN departments d ON e.department_id = d.id
ORDER BY d.name, e.name;`},{type:"text",html:`<h3>JOIN with Aggregates</h3>
<p>JOINs become really powerful when combined with GROUP BY:</p>`},{type:"sandbox",description:"Employee count and average salary per department:",defaultQuery:`SELECT
  d.name AS department,
  COUNT(*) AS headcount,
  ROUND(AVG(e.salary), 0) AS avg_salary
FROM employees e
INNER JOIN departments d ON e.department_id = d.id
GROUP BY d.name
ORDER BY avg_salary DESC;`}]},{id:3,moduleId:4,title:"LEFT JOIN",slug:"left-join",content:[{type:"text",html:`<h2>LEFT JOIN — Keep All Left Rows</h2>
<p><code>LEFT JOIN</code> returns <strong>all rows from the left table</strong>, plus matching rows from the right table. If there's no match, the right-side columns are filled with <code>NULL</code>.</p>
<p>This is essential when you want to find rows that <em>don't</em> have a match — like customers with no orders.</p>
<p>Watch how LEFT JOIN keeps unmatched rows with NULL:</p>`},{type:"animation",animation:"JoinAnimation",props:{joinType:"left"}},{type:"sandbox",description:"All customers, even those with no orders:",defaultQuery:`SELECT
  c.name AS customer,
  COUNT(o.id) AS order_count,
  COALESCE(ROUND(SUM(o.total), 2), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name
ORDER BY total_spent DESC
LIMIT 15;`},{type:"text",html:`<h3>Finding Missing Relationships</h3>
<p>The most powerful LEFT JOIN pattern: find rows with <strong>no match</strong> by checking for NULL in the right table.</p>`},{type:"sandbox",description:"Customers who have never placed an order:",defaultQuery:`SELECT c.name, c.city, c.country
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NULL
ORDER BY c.name;`},{type:"callout",calloutType:"tip",html:'<strong>Pattern to remember</strong>: <code>LEFT JOIN ... WHERE right_table.id IS NULL</code> = "find rows with no match". This is one of the most common SQL patterns in production code.'}]},{id:4,moduleId:4,title:"Self JOIN",slug:"self-join",content:[{type:"text",html:`<h2>Self JOIN — Joining a Table to Itself</h2>
<p>A self join joins a table to <strong>itself</strong>. This is how you query hierarchical data like employee-manager relationships, where <code>manager_id</code> references another row in the same <code>employees</code> table.</p>`},{type:"sandbox",description:"Show each employee with their manager name:",defaultQuery:`SELECT
  e.name AS employee,
  m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id
ORDER BY m.name, e.name
LIMIT 20;`},{type:"callout",calloutType:"info",html:"We use <code>LEFT JOIN</code> here because top-level managers have <code>manager_id = NULL</code>. An INNER JOIN would exclude them."},{type:"text",html:`<h3>Who Reports to Whom?</h3>
<p>You can reverse the self join to find direct reports:</p>`},{type:"sandbox",description:"Count direct reports for each manager:",defaultQuery:`SELECT
  m.name AS manager,
  COUNT(e.id) AS direct_reports
FROM employees m
INNER JOIN employees e ON e.manager_id = m.id
GROUP BY m.id, m.name
ORDER BY direct_reports DESC;`}]},{id:5,moduleId:4,title:"Multi-Table JOINs",slug:"multi-table-joins",content:[{type:"text",html:`<h2>Joining 3+ Tables</h2>
<p>Real-world queries often join many tables. Each JOIN adds another table to the result. The key is to follow the <strong>foreign key chain</strong>.</p>`},{type:"code",title:"Chain: orders → customers → order_items → products",sql:`SELECT ...
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id;`},{type:"sandbox",description:"Full order details — customer, product, quantity, price:",defaultQuery:`SELECT
  o.id AS order_id,
  c.name AS customer,
  p.name AS product,
  oi.quantity,
  oi.unit_price,
  o.order_date
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id
INNER JOIN order_items oi ON oi.order_id = o.id
INNER JOIN products p ON oi.product_id = p.id
ORDER BY o.order_date DESC
LIMIT 15;`},{type:"text",html:`<h3>Revenue by Product Category</h3>
<p>Joining multiple tables with aggregation — a common analytics query:</p>`},{type:"sandbox",description:"Revenue breakdown by product category:",defaultQuery:`SELECT
  p.category,
  COUNT(DISTINCT o.id) AS orders,
  SUM(oi.quantity) AS units_sold,
  ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
FROM order_items oi
INNER JOIN products p ON oi.product_id = p.id
INNER JOIN orders o ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY p.category
ORDER BY revenue DESC;`}]},{id:6,moduleId:4,title:"JOIN Algorithms",slug:"join-algorithms",content:[{type:"text",html:`<h2>How MySQL Executes JOINs</h2>
<p>Understanding how MySQL actually runs JOINs helps you write faster queries. MySQL uses two main algorithms:</p>

<h3>Nested Loop Join (default)</h3>
<p>For each row in the <strong>outer table</strong>, MySQL scans the <strong>inner table</strong> for matches. Like a double for-loop:</p>
<pre>for each row in employees:
    for each row in departments:
        if employee.dept_id == department.id:
            output the combined row</pre>
<p>With an index on the join column, the inner scan becomes an index lookup — much faster.</p>

<h3>Hash Join (MySQL 8.0.18+)</h3>
<p>MySQL builds a hash table from the smaller table, then probes it for each row of the larger table. Faster for large tables without indexes.</p>

<h3>Why Indexes on JOIN Columns Matter</h3>
<p>Without an index on <code>department_id</code>, MySQL must scan <strong>all</strong> department rows for every employee. With an index, it jumps directly to the matching row. That's the difference between O(n*m) and O(n*log(m)).</p>`},{type:"callout",calloutType:"mysql",html:"<strong>Performance tip</strong>: Always ensure foreign key columns have indexes. MySQL automatically creates an index on FK columns, but if you add a JOIN column without a FK constraint, you need to create the index manually."},{type:"callout",calloutType:"tip",html:'Want to see how MySQL executes your JOINs? Use our free <a href="/tools/explain/">EXPLAIN Analyzer</a> to visualize the query plan and see which join algorithm MySQL chose.'}]},{id:7,moduleId:4,title:"RIGHT JOIN & FULL OUTER JOIN",slug:"right-full-join",content:[{type:"text",html:`<h2>RIGHT JOIN</h2>
<p><code>RIGHT JOIN</code> is the mirror of LEFT JOIN — it keeps all rows from the <strong>right table</strong> and fills NULLs for unmatched left rows. In practice, most developers rewrite RIGHT JOINs as LEFT JOINs by swapping table order (easier to read).</p>`},{type:"comparison",left:{title:"LEFT JOIN",content:"<code>FROM employees e LEFT JOIN departments d</code><br>Keeps all employees, NULL if no department."},right:{title:"RIGHT JOIN (equivalent)",content:"<code>FROM departments d RIGHT JOIN employees e</code><br>Same result, different syntax."}},{type:"sandbox",description:"RIGHT JOIN — all departments, even with no employees:",defaultQuery:`SELECT d.name AS department, COUNT(e.id) AS headcount
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.id
GROUP BY d.name
ORDER BY headcount;`},{type:"text",html:`<h2>FULL OUTER JOIN</h2>
<p><code>FULL OUTER JOIN</code> keeps all rows from <strong>both</strong> tables. Unmatched rows on either side get NULLs. Useful for finding mismatches between two datasets.</p>`},{type:"callout",calloutType:"mysql",html:"<strong>MySQL doesn't support FULL OUTER JOIN</strong> directly. You emulate it with a UNION of LEFT JOIN and RIGHT JOIN. Our SQLite sandbox does support it natively."},{type:"code",title:"MySQL FULL OUTER JOIN emulation",sql:`-- MySQL workaround:
SELECT * FROM table_a a LEFT JOIN table_b b ON a.id = b.a_id
UNION
SELECT * FROM table_a a RIGHT JOIN table_b b ON a.id = b.a_id;`}]},{id:8,moduleId:4,title:"WHERE vs ON in JOINs",slug:"where-vs-on",content:[{type:"text",html:`<h2>Filter Placement: ON vs WHERE</h2>
<p>With <code>INNER JOIN</code>, putting a filter in <code>ON</code> vs <code>WHERE</code> gives the same result. But with <code>LEFT/RIGHT JOIN</code>, it makes a <strong>huge difference</strong>.</p>`},{type:"comparison",left:{title:"Filter in ON clause",content:"<code>LEFT JOIN orders o ON c.id = o.customer_id AND o.status = 'delivered'</code><br><br>Filters <strong>before</strong> joining. Unmatched rows still appear (with NULLs)."},right:{title:"Filter in WHERE clause",content:"<code>LEFT JOIN orders o ON c.id = o.customer_id WHERE o.status = 'delivered'</code><br><br>Filters <strong>after</strong> joining. Removes NULL rows, turning LEFT JOIN into INNER JOIN!"}},{type:"sandbox",description:"ON filter — keeps all customers, NULLs for non-delivered:",defaultQuery:`-- Filter in ON: keeps ALL customers
SELECT c.name, o.id AS order_id, o.status
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id AND o.status = 'delivered'
ORDER BY c.name
LIMIT 15;`},{type:"sandbox",description:"WHERE filter — only customers with delivered orders:",defaultQuery:`-- Filter in WHERE: drops customers without delivered orders
SELECT c.name, o.id AS order_id, o.status
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.status = 'delivered'
ORDER BY c.name
LIMIT 15;`},{type:"callout",calloutType:"warning",html:"<strong>Common mistake</strong>: Adding a WHERE filter on the right table of a LEFT JOIN effectively converts it to an INNER JOIN. If you want to filter the right table while keeping all left rows, put the condition in the ON clause."}]},{id:9,moduleId:4,title:"Advanced JOIN Patterns",slug:"advanced-join-patterns",content:[{type:"text",html:`<h2>Joining on Multiple Keys</h2>
<p>Sometimes you need to match rows on more than one column. Use <code>AND</code> in the <code>ON</code> clause:</p>`},{type:"code",title:"Multi-key JOIN",sql:`-- Match on both year and department
SELECT a.*, b.*
FROM budget_actual a
JOIN budget_plan b
  ON a.year = b.year
  AND a.department_id = b.department_id;`},{type:"text",html:`<h3>Non-Equi Joins (Comparison Operators)</h3>
<p>Most JOINs use <code>=</code>, but you can also use <code>></code>, <code><</code>, <code>BETWEEN</code>, <code>!=</code>. These are called non-equi joins.</p>`},{type:"sandbox",description:"Find employees earning more than their department average using a non-equi self join:",defaultQuery:`-- Employees above their department's average salary
SELECT e.name, e.salary, e.department_id, dept_avg.avg_sal
FROM employees e
INNER JOIN (
  SELECT department_id, ROUND(AVG(salary), 0) AS avg_sal
  FROM employees
  GROUP BY department_id
) dept_avg ON e.department_id = dept_avg.department_id
  AND e.salary > dept_avg.avg_sal
ORDER BY e.department_id, e.salary DESC;`},{type:"sandbox",description:"Range join — find which price tier each product falls into:",defaultQuery:`-- Create price tiers and join products to them
WITH tiers AS (
  SELECT 'Budget' AS tier, 0 AS min_price, 30 AS max_price
  UNION ALL SELECT 'Mid-range', 30, 100
  UNION ALL SELECT 'Premium', 100, 500
  UNION ALL SELECT 'Luxury', 500, 99999
)
SELECT p.name, p.price, t.tier
FROM products p
INNER JOIN tiers t ON p.price >= t.min_price AND p.price < t.max_price
ORDER BY p.price;`},{type:"callout",calloutType:"tip",html:"Non-equi joins are common in real-world analytics: matching events to time ranges, assigning tiers/bands, finding overlapping date ranges, or comparing rows within the same table."}]}],exercises:[{id:1,moduleId:4,title:"Employee Departments",description:"<p>Show each employee's <code>name</code> and their <code>department</code> name (from the departments table). Use an INNER JOIN.</p>",difficulty:"easy",starterQuery:`-- Show employee names with department names
SELECT e.name, d.name AS department
FROM employees e
`,expectedQuery:"SELECT e.name, d.name AS department FROM employees e INNER JOIN departments d ON e.department_id = d.id;",expectedResult:{columns:["name","department"],values:[["Alice Johnson","Engineering"],["Bob Smith","Engineering"],["Carol Davis","Engineering"],["David Wilson","Marketing"],["Eva Martinez","Marketing"],["Frank Brown","Sales"],["Grace Lee","Sales"],["Henry Taylor","Sales"],["Iris Chen","HR"],["Jack Anderson","HR"],["Kate Thomas","Finance"],["Liam Moore","Finance"],["Mia Jackson","Operations"],["Noah White","Operations"],["Olivia Harris","Support"],["Peter Clark","Support"],["Quinn Lewis","Legal"],["Rachel Robinson","Legal"],["Sam Walker","Product"],["Tina Hall","Product"],["Uma Allen","Design"],["Victor Young","Design"],["Wendy King","Engineering"],["Xavier Wright","Engineering"],["Yara Scott","Marketing"],["Zach Green","Sales"],["Amy Baker","Engineering"],["Brian Adams","Finance"],["Chloe Turner","Sales"],["Daniel Phillips","Product"],["Elena Campbell","Marketing"],["Felix Parker","Operations"],["Gina Evans","Support"],["Hugo Edwards","Engineering"],["Isla Collins","Design"],["James Stewart","HR"],["Kelly Morris","Finance"],["Leo Rogers","Product"],["Maya Reed","Sales"],["Nathan Cook","Engineering"],["Ophelia Morgan","Marketing"],["Paul Bell","Operations"],["Rosa Murphy","Legal"],["Steve Bailey","Support"],["Tara Rivera","Design"],["Ulrich Cooper","Finance"],["Vera Richardson","Engineering"],["Will Cox","Sales"],["Xena Howard","Product"],["Yuri Ward","HR"]]},hints:["JOIN departments d ON e.department_id = d.id","INNER JOIN matches employees to departments by department_id","SELECT e.name, d.name AS department FROM employees e INNER JOIN departments d ON e.department_id = d.id;"],validationMode:"unordered"},{id:2,moduleId:4,title:"Customers Without Delivered Orders",description:"<p>Find customers who have <strong>no delivered orders</strong>. Show their <code>name</code> and <code>city</code>. Use a LEFT JOIN with the delivery status filter <strong>in the ON clause</strong> (not WHERE).</p>",difficulty:"medium",starterQuery:`-- Find customers with no delivered orders
`,expectedQuery:"SELECT c.name, c.city FROM customers c LEFT JOIN orders o ON c.id = o.customer_id AND o.status = 'delivered' WHERE o.id IS NULL ORDER BY c.name;",expectedResult:{columns:["name","city"],values:[["Atlas Logistics","Berlin"],["Cascade Data","Madrid"],["Coral Systems","Sydney"],["Eastern Dynamics","Shanghai"],["FreshMart","Paris"],["GreenTech Ltd","London"],["Horizon Media","Tokyo"],["Maple Systems","Toronto"],["Opal Networks","Stockholm"],["Pinnacle Group","New York"],["Prism Analytics","Singapore"],["Redwood Labs","London"],["River Valley Inc","Toronto"],["Summit Partners","New York"]]},hints:["Put the status filter in the ON clause: ON c.id = o.customer_id AND o.status = 'delivered'","WHERE o.id IS NULL filters to customers with no matching delivered orders","SELECT c.name, c.city FROM customers c LEFT JOIN orders o ON c.id = o.customer_id AND o.status = 'delivered' WHERE o.id IS NULL ORDER BY c.name;"],validationMode:"exact"},{id:3,moduleId:4,title:"Employee and Manager",description:"<p>Show each employee's <code>name</code> and their <strong>manager's name</strong>. If an employee has no manager, show <code>NULL</code>. Name the columns <code>employee</code> and <code>manager</code>.</p>",difficulty:"medium",starterQuery:`-- Show employees with their managers
`,expectedQuery:"SELECT e.name AS employee, m.name AS manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.id;",expectedResult:{columns:["employee","manager"],values:[["Alice Johnson",null],["Bob Smith","Alice Johnson"],["Carol Davis","Alice Johnson"],["David Wilson",null],["Eva Martinez","David Wilson"],["Frank Brown",null],["Grace Lee","Frank Brown"],["Henry Taylor","Frank Brown"],["Iris Chen",null],["Jack Anderson","Iris Chen"],["Kate Thomas",null],["Liam Moore","Kate Thomas"],["Mia Jackson",null],["Noah White","Mia Jackson"],["Olivia Harris",null],["Peter Clark","Olivia Harris"],["Quinn Lewis",null],["Rachel Robinson","Quinn Lewis"],["Sam Walker",null],["Tina Hall","Sam Walker"],["Uma Allen",null],["Victor Young","Uma Allen"],["Wendy King","Alice Johnson"],["Xavier Wright","Alice Johnson"],["Yara Scott","David Wilson"],["Zach Green","Frank Brown"],["Amy Baker","Bob Smith"],["Brian Adams","Kate Thomas"],["Chloe Turner","Frank Brown"],["Daniel Phillips","Sam Walker"],["Elena Campbell","David Wilson"],["Felix Parker","Mia Jackson"],["Gina Evans","Olivia Harris"],["Hugo Edwards","Alice Johnson"],["Isla Collins","Uma Allen"],["James Stewart","Iris Chen"],["Kelly Morris","Kate Thomas"],["Leo Rogers","Sam Walker"],["Maya Reed","Frank Brown"],["Nathan Cook","Bob Smith"],["Ophelia Morgan","David Wilson"],["Paul Bell","Mia Jackson"],["Rosa Murphy","Quinn Lewis"],["Steve Bailey","Olivia Harris"],["Tara Rivera","Uma Allen"],["Ulrich Cooper","Kate Thomas"],["Vera Richardson","Bob Smith"],["Will Cox","Frank Brown"],["Xena Howard","Sam Walker"],["Yuri Ward","Iris Chen"]]},hints:["This is a self join — join employees to employees","LEFT JOIN employees m ON e.manager_id = m.id","SELECT e.name AS employee, m.name AS manager FROM employees e LEFT JOIN employees m ON e.manager_id = m.id;"],validationMode:"unordered"},{id:4,moduleId:4,title:"Order Details",description:"<p>Show all orders with the <strong>customer name</strong> and the <strong>number of items</strong> in each order. Columns: <code>order_id</code>, <code>customer</code>, <code>item_count</code>, <code>total</code>. Sort by total descending. Limit to 10.</p>",difficulty:"medium",starterQuery:`-- Order details with customer names and item counts
`,expectedQuery:"SELECT o.id AS order_id, c.name AS customer, COUNT(oi.id) AS item_count, o.total FROM orders o INNER JOIN customers c ON o.customer_id = c.id INNER JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id, c.name, o.total ORDER BY o.total DESC LIMIT 10;",expectedResult:{columns:["order_id","customer","item_count","total"],values:[[8,"Pacific Trading",2,1749.98],[1,"Acme Corp",2,1329.98],[15,"Velocity Labs",1,1299.99],[25,"Coral Systems",1,1299.99],[39,"CloudNine Ltd",1,1299.99],[20,"Pinnacle Group",3,629.98],[6,"CloudNine Ltd",1,599.99],[30,"Horizon Media",1,599.99],[11,"Global Retail",3,479.98],[3,"DataFlow GmbH",1,449.99]]},hints:["You need two JOINs: orders→customers AND orders→order_items","GROUP BY o.id to count items per order","SELECT o.id AS order_id, c.name AS customer, COUNT(oi.id) AS item_count, o.total FROM orders o INNER JOIN customers c ON o.customer_id = c.id INNER JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id, c.name, o.total ORDER BY o.total DESC LIMIT 10;"],validationMode:"exact"},{id:5,moduleId:4,title:"Revenue by Department",description:"<p>This is unrelated to orders — calculate the <strong>total salary cost</strong> per department. Show <code>department</code> name and <code>total_salary</code>. Sort by total_salary descending.</p>",difficulty:"easy",starterQuery:`-- Total salary per department
`,expectedQuery:"SELECT d.name AS department, SUM(e.salary) AS total_salary FROM employees e INNER JOIN departments d ON e.department_id = d.id GROUP BY d.name ORDER BY total_salary DESC;",expectedResult:{columns:["department","total_salary"],values:[["Engineering",971e3],["Sales",629e3],["Finance",5e5],["Product",512e3],["Marketing",401e3],["Legal",375e3],["Design",35e4],["Operations",289e3],["HR",279e3],["Support",254e3]]},hints:["JOIN employees to departments, then GROUP BY department name","SUM(e.salary) gives total salary per group","SELECT d.name AS department, SUM(e.salary) AS total_salary FROM employees e INNER JOIN departments d ON e.department_id = d.id GROUP BY d.name ORDER BY total_salary DESC;"],validationMode:"exact"},{id:6,moduleId:4,title:"Top Spending Customers",description:"<p>Find the <strong>top 5 customers by total spending</strong> (only counting delivered orders). Show <code>customer</code>, <code>orders</code> (count), and <code>total_spent</code> (rounded to 2 decimals).</p>",difficulty:"hard",starterQuery:`-- Top 5 customers by spending (delivered only)
`,expectedQuery:"SELECT c.name AS customer, COUNT(o.id) AS orders, ROUND(SUM(o.total), 2) AS total_spent FROM customers c INNER JOIN orders o ON c.id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.id, c.name ORDER BY total_spent DESC LIMIT 5;",expectedResult:{columns:["customer","orders","total_spent"],values:[["Pacific Trading",1,1749.98],["Acme Corp",4,1654.95],["Velocity Labs",1,1299.99],["CloudNine Ltd",1,599.99],["Global Retail",1,479.98]]},hints:["Filter with WHERE o.status = 'delivered' before grouping","JOIN customers to orders, GROUP BY customer","SELECT c.name AS customer, COUNT(o.id) AS orders, ROUND(SUM(o.total), 2) AS total_spent FROM customers c INNER JOIN orders o ON c.id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.id, c.name ORDER BY total_spent DESC LIMIT 5;"],validationMode:"exact"},{id:7,moduleId:4,title:"Best-Selling Products",description:"<p>Find the <strong>top 5 products</strong> by total quantity sold. Show <code>product</code>, <code>category</code>, <code>total_sold</code>. Exclude cancelled orders.</p>",difficulty:"hard",starterQuery:`-- Top 5 best-selling products
`,expectedQuery:"SELECT p.name AS product, p.category, SUM(oi.quantity) AS total_sold FROM order_items oi INNER JOIN products p ON oi.product_id = p.id INNER JOIN orders o ON oi.order_id = o.id WHERE o.status != 'cancelled' GROUP BY p.id, p.name, p.category ORDER BY total_sold DESC LIMIT 5;",expectedResult:{columns:["product","category","total_sold"],values:[["Mechanical Keyboard","Electronics",7],["Laptop Pro 15","Electronics",5],["Wireless Mouse","Electronics",5],['Monitor 27"',"Electronics",4],["Green Tea Box","Food",4]]},hints:["Join order_items → products AND order_items → orders","WHERE o.status != 'cancelled' excludes cancelled orders","SELECT p.name AS product, p.category, SUM(oi.quantity) AS total_sold FROM order_items oi INNER JOIN products p ON oi.product_id = p.id INNER JOIN orders o ON oi.order_id = o.id WHERE o.status != 'cancelled' GROUP BY p.id, p.name, p.category ORDER BY total_sold DESC LIMIT 5;"],validationMode:"exact"},{id:8,moduleId:4,title:"Direct Reports Count",description:"<p>For each manager, show their <code>name</code> and <code>direct_reports</code> count. Only show managers with <strong>3 or more</strong> direct reports. Sort by count descending.</p>",difficulty:"hard",starterQuery:`-- Managers with 3+ direct reports
`,expectedQuery:"SELECT m.name, COUNT(e.id) AS direct_reports FROM employees m INNER JOIN employees e ON e.manager_id = m.id GROUP BY m.id, m.name HAVING COUNT(e.id) >= 3 ORDER BY direct_reports DESC;",expectedResult:{columns:["name","direct_reports"],values:[["Frank Brown",6],["Alice Johnson",5],["David Wilson",4],["Kate Thomas",4],["Sam Walker",4],["Uma Allen",3],["Mia Jackson",3],["Olivia Harris",3],["Iris Chen",3],["Bob Smith",3]]},hints:["Self join: employees m INNER JOIN employees e ON e.manager_id = m.id","Use HAVING COUNT(e.id) >= 3 to filter","SELECT m.name, COUNT(e.id) AS direct_reports FROM employees m INNER JOIN employees e ON e.manager_id = m.id GROUP BY m.id, m.name HAVING COUNT(e.id) >= 3 ORDER BY direct_reports DESC;"],validationMode:"exact"}]},Oc={id:5,title:"Subqueries & CTEs",slug:"subqueries-ctes",description:"Scalar subqueries, correlated subqueries, EXISTS vs IN, and Common Table Expressions.",icon:"Layers",color:"#F39C12",lessons:[{id:1,moduleId:5,title:"Subquery Basics",slug:"subquery-basics",content:[{type:"text",html:`<h2>What is a Subquery?</h2>
<p>A <strong>subquery</strong> is a query nested inside another query. The inner query runs first, and its result is used by the outer query. Think of it as a question-within-a-question.</p>`},{type:"code",title:"Subquery in WHERE",sql:`-- Find employees earning above average
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);`},{type:"sandbox",description:"Employees earning above the company average:",defaultQuery:`SELECT name, salary,
  ROUND(salary - (SELECT AVG(salary) FROM employees), 0) AS above_avg
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
ORDER BY salary DESC;`},{type:"callout",calloutType:"info",html:"<strong>Scalar subquery</strong>: Returns a single value (one row, one column). Used with comparison operators like <code>=</code>, <code>></code>, <code><</code>."}]},{id:2,moduleId:5,title:"IN and EXISTS",slug:"in-exists",content:[{type:"text",html:`<h2>Subqueries that Return Multiple Rows</h2>
<h3>IN — match against a list</h3>
<p>When a subquery returns multiple rows, use <code>IN</code> instead of <code>=</code>:</p>`},{type:"sandbox",description:"Employees in departments located in New York:",defaultQuery:`SELECT name, department_id
FROM employees
WHERE department_id IN (
  SELECT id FROM departments WHERE location = 'New York'
);`},{type:"text",html:`<h3>EXISTS — check if rows exist</h3>
<p><code>EXISTS</code> returns true if the subquery returns <strong>any</strong> rows. It's often faster than <code>IN</code> for large datasets because it stops at the first match.</p>`},{type:"sandbox",description:"Customers who have placed at least one order:",defaultQuery:`SELECT c.name
FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.id
)
ORDER BY c.name;`},{type:"comparison",left:{title:"IN",content:"Runs inner query once, compares all values.<br>Better for small inner result sets.<br>Can be rewritten as a JOIN."},right:{title:"EXISTS",content:'Runs inner query per outer row, stops at first match.<br>Better for large inner tables with indexes.<br>More efficient for "has any" checks.'}}]},{id:3,moduleId:5,title:"Correlated Subqueries",slug:"correlated",content:[{type:"text",html:`<h2>Correlated Subqueries</h2>
<p>A <strong>correlated subquery</strong> references a column from the outer query. It runs once per outer row — like a nested loop. Powerful but can be slow on large tables.</p>`},{type:"sandbox",description:"Employees earning more than their department average:",defaultQuery:`SELECT e.name, e.salary, e.department_id
FROM employees e
WHERE e.salary > (
  SELECT AVG(e2.salary)
  FROM employees e2
  WHERE e2.department_id = e.department_id
)
ORDER BY e.department_id, e.salary DESC;`},{type:"callout",calloutType:"warning",html:"<strong>Performance</strong>: Correlated subqueries run once per outer row. For 1000 employees, the inner query executes 1000 times. Consider rewriting as a JOIN for large tables."}]},{id:4,moduleId:5,title:"Common Table Expressions (CTEs)",slug:"ctes",content:[{type:"text",html:`<h2>CTEs — Named Subqueries</h2>
<p>A <code>WITH</code> clause (Common Table Expression) lets you name a subquery and reference it like a table. CTEs make complex queries readable.</p>`},{type:"code",title:"CTE Syntax",sql:`WITH cte_name AS (
  SELECT ... FROM ...
)
SELECT ... FROM cte_name WHERE ...;`},{type:"sandbox",description:"Department stats using a CTE:",defaultQuery:`WITH dept_stats AS (
  SELECT
    department_id,
    COUNT(*) AS headcount,
    ROUND(AVG(salary), 0) AS avg_salary
  FROM employees
  GROUP BY department_id
)
SELECT d.name, ds.headcount, ds.avg_salary
FROM dept_stats ds
INNER JOIN departments d ON ds.department_id = d.id
WHERE ds.headcount >= 4
ORDER BY ds.avg_salary DESC;`},{type:"callout",calloutType:"mysql",html:"CTEs were added in <strong>MySQL 8.0</strong> (2018). If you're on MySQL 5.7, you must use subqueries or temporary tables instead."},{type:"text",html:`<h3>Multiple CTEs</h3>
<p>You can chain multiple CTEs separated by commas:</p>`},{type:"sandbox",description:"Customer spending tiers:",defaultQuery:`WITH customer_spending AS (
  SELECT
    c.id, c.name,
    COALESCE(SUM(o.total), 0) AS total_spent
  FROM customers c
  LEFT JOIN orders o ON c.id = o.customer_id
    AND o.status = 'delivered'
  GROUP BY c.id, c.name
),
tiers AS (
  SELECT *,
    CASE
      WHEN total_spent >= 1000 THEN 'Gold'
      WHEN total_spent >= 100 THEN 'Silver'
      WHEN total_spent > 0 THEN 'Bronze'
      ELSE 'Inactive'
    END AS tier
  FROM customer_spending
)
SELECT tier, COUNT(*) AS customers, ROUND(AVG(total_spent), 2) AS avg_spent
FROM tiers
GROUP BY tier
ORDER BY avg_spent DESC;`}]},{id:5,moduleId:5,title:"Subquery vs JOIN",slug:"subquery-vs-join",content:[{type:"text",html:`<h2>When to Use Subqueries vs JOINs</h2>
<p>Many subqueries can be rewritten as JOINs, and vice versa. Here's when to use which:</p>`},{type:"comparison",left:{title:"Use Subqueries when...",content:"<ul><li>You need a single aggregate value</li><li>You're checking existence (EXISTS)</li><li>Readability is more important than micro-optimization</li><li>CTEs make the logic clearer</li></ul>"},right:{title:"Use JOINs when...",content:"<ul><li>You need columns from both tables in the output</li><li>Performance matters on large tables</li><li>You're replacing IN with a large subquery</li><li>MySQL optimizer handles JOINs better (usually)</li></ul>"}},{type:"sandbox",description:"Same result — subquery vs JOIN:",defaultQuery:`-- Subquery approach:
SELECT name FROM employees
WHERE department_id IN (
  SELECT id FROM departments WHERE location = 'New York'
);

-- Equivalent JOIN (often faster):
-- SELECT e.name FROM employees e
-- INNER JOIN departments d ON e.department_id = d.id
-- WHERE d.location = 'New York';`}]},{id:6,moduleId:5,title:"ANY, ALL, and SELECT INTO",slug:"any-all",content:[{type:"text",html:`<h2>ANY and ALL Operators</h2>
<p><code>ANY</code> and <code>ALL</code> compare a value against a set of values returned by a subquery.</p>
<ul>
<li><code>ANY</code> — returns true if the comparison is true for <strong>at least one</strong> value</li>
<li><code>ALL</code> — returns true if the comparison is true for <strong>every</strong> value</li>
</ul>`},{type:"sandbox",description:"Employees earning more than ANY Finance employee:",defaultQuery:`-- salary > ANY means "salary > the minimum Finance salary"
SELECT name, salary, department_id
FROM employees
WHERE salary > ALL (
  SELECT salary FROM employees WHERE department_id = 4
)
ORDER BY salary
LIMIT 10;`},{type:"callout",calloutType:"tip",html:"<code>> ANY(subquery)</code> is equivalent to <code>> MIN(subquery)</code>. <code>> ALL(subquery)</code> is equivalent to <code>> MAX(subquery)</code>. Most developers prefer MIN/MAX for clarity."},{type:"text",html:`<h2>INSERT INTO ... SELECT</h2>
<p>Copy data from one table to another using a SELECT statement:</p>`},{type:"code",title:"MySQL syntax",sql:`-- Copy high-earner data into a new table
CREATE TABLE high_earners AS
SELECT name, salary, department_id
FROM employees
WHERE salary > 100000;

-- Or insert into an existing table:
INSERT INTO archived_orders
SELECT * FROM orders WHERE status = 'cancelled';`},{type:"sandbox",description:"Create a table from a query:",defaultQuery:`CREATE TABLE dept_summary AS
SELECT department_id, COUNT(*) AS headcount, ROUND(AVG(salary), 0) AS avg_salary
FROM employees
GROUP BY department_id;

SELECT * FROM dept_summary ORDER BY avg_salary DESC;`}]}],exercises:[{id:1,moduleId:5,title:"Above Average Salary",description:"<p>Find all employees whose salary is <strong>above the company average</strong>. Show <code>name</code> and <code>salary</code>. Sort by salary descending.</p>",difficulty:"easy",starterQuery:`-- Employees above average salary
`,expectedQuery:"SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees) ORDER BY salary DESC;",expectedResult:{columns:["name","salary"],values:[["Quinn Lewis",13e4],["Rachel Robinson",125e3],["Alice Johnson",12e4],["Rosa Murphy",12e4],["Hugo Edwards",118e3],["Bob Smith",115e3],["Xavier Wright",112e3],["Kate Thomas",11e4],["Sam Walker",108e3],["Nathan Cook",108e3],["Carol Davis",105e3],["Brian Adams",105e3],["Leo Rogers",105e3],["Tina Hall",102e3],["Daniel Phillips",1e5],["Vera Richardson",1e5],["Liam Moore",98e3],["Wendy King",98e3],["Xena Howard",97e3],["Henry Taylor",95e3],["Amy Baker",95e3],["Kelly Morris",95e3],["Frank Brown",92e3],["Ulrich Cooper",92e3]]},hints:["The subquery is: (SELECT AVG(salary) FROM employees)","WHERE salary > (subquery)","SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees) ORDER BY salary DESC;"],validationMode:"exact"},{id:2,moduleId:5,title:"New York Employees",description:"<p>Find employees in departments located in <strong>New York</strong>. Use an <code>IN</code> subquery on the departments table. Show <code>name</code> and <code>department_id</code>.</p>",difficulty:"easy",starterQuery:`-- Employees in New York departments
`,expectedQuery:"SELECT name, department_id FROM employees WHERE department_id IN (SELECT id FROM departments WHERE location = 'New York');",expectedResult:{columns:["name","department_id"],values:[["Alice Johnson",1],["Bob Smith",1],["Carol Davis",1],["Frank Brown",3],["Grace Lee",3],["Henry Taylor",3],["Wendy King",1],["Xavier Wright",1],["Zach Green",3],["Amy Baker",1],["Chloe Turner",3],["Hugo Edwards",1],["Maya Reed",3],["Nathan Cook",1],["Vera Richardson",1],["Will Cox",3]]},hints:["Inner query: SELECT id FROM departments WHERE location = 'New York'","WHERE department_id IN (inner query)","SELECT name, department_id FROM employees WHERE department_id IN (SELECT id FROM departments WHERE location = 'New York');"],validationMode:"unordered"},{id:3,moduleId:5,title:"Highest Paid Per Department",description:"<p>Find the <strong>highest-paid employee in each department</strong> using a correlated subquery. Show <code>name</code>, <code>department_id</code>, and <code>salary</code>.</p>",difficulty:"hard",starterQuery:`-- Highest paid in each department
`,expectedQuery:"SELECT name, department_id, salary FROM employees e WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department_id = e.department_id);",expectedResult:{columns:["name","department_id","salary"],values:[["Alice Johnson",1,12e4],["David Wilson",2,85e3],["Henry Taylor",3,95e3],["Iris Chen",4,72e3],["Kate Thomas",5,11e4],["Mia Jackson",6,75e3],["Olivia Harris",7,65e3],["Quinn Lewis",8,13e4],["Sam Walker",9,108e3],["Uma Allen",10,9e4]]},hints:["Correlated subquery: reference outer table in inner WHERE","WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department_id = e.department_id)","SELECT name, department_id, salary FROM employees e WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department_id = e.department_id);"],validationMode:"unordered"},{id:4,moduleId:5,title:"Department Stats CTE",description:"<p>Using a CTE, find departments where the <strong>average salary exceeds $90,000</strong>. Show <code>department</code> name, <code>headcount</code>, and <code>avg_salary</code> (rounded). Sort by avg_salary descending.</p>",difficulty:"medium",starterQuery:`-- Departments with avg salary > 90K
WITH dept_stats AS (
`,expectedQuery:"WITH dept_stats AS (SELECT department_id, COUNT(*) AS headcount, ROUND(AVG(salary), 0) AS avg_salary FROM employees GROUP BY department_id) SELECT d.name AS department, ds.headcount, ds.avg_salary FROM dept_stats ds INNER JOIN departments d ON ds.department_id = d.id WHERE ds.avg_salary > 90000 ORDER BY ds.avg_salary DESC;",expectedResult:{columns:["department","headcount","avg_salary"],values:[["Legal",3,125e3],["Engineering",9,107889],["Product",5,102400],["Finance",5,1e5]]},hints:["CTE should GROUP BY department_id with AVG and COUNT","Join CTE to departments for the name, filter WHERE avg_salary > 90000","WITH dept_stats AS (SELECT department_id, COUNT(*) AS headcount, ROUND(AVG(salary), 0) AS avg_salary FROM employees GROUP BY department_id) SELECT d.name AS department, ds.headcount, ds.avg_salary FROM dept_stats ds INNER JOIN departments d ON ds.department_id = d.id WHERE ds.avg_salary > 90000 ORDER BY ds.avg_salary DESC;"],validationMode:"exact"},{id:5,moduleId:5,title:"Customers With Orders (EXISTS)",description:"<p>Using <code>EXISTS</code>, find customers who have placed <strong>at least one delivered order</strong>. Show <code>name</code> and <code>city</code>. Sort by name.</p>",difficulty:"medium",starterQuery:`-- Customers with delivered orders using EXISTS
`,expectedQuery:"SELECT c.name, c.city FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'delivered') ORDER BY c.name;",expectedResult:{columns:["name","city"],values:[["Acme Corp","New York"],["Blue Ocean Ltd","Dubai"],["CloudNine Ltd","London"],["DataFlow GmbH","Berlin"],["FireStorm Tech","Berlin"],["Global Retail","New York"],["GreenTech Ltd","London"],["Pacific Trading","Sydney"],["TechStart Inc","London"],["Velocity Labs","Singapore"]]},hints:["EXISTS (SELECT 1 FROM orders WHERE ... AND status = 'delivered')","The subquery references c.id from the outer query","SELECT c.name, c.city FROM customers c WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = 'delivered') ORDER BY c.name;"],validationMode:"exact"}]},Ic={id:6,title:"Data Modification",slug:"data-modification",description:"INSERT, UPDATE, DELETE, transactions, and MySQL-specific UPSERT patterns.",icon:"PenTool",color:"#1ABC9C",lessons:[{id:1,moduleId:6,title:"INSERT",slug:"insert",content:[{type:"text",html:`<h2>Adding Data with INSERT</h2>
<p><code>INSERT</code> adds new rows to a table. There are several forms:</p>`},{type:"code",title:"Single row",sql:`INSERT INTO departments (id, name, budget, location)
VALUES (11, 'Research', 550000, 'Boston');`},{type:"sandbox",description:"Try inserting a new department and querying it:",defaultQuery:`INSERT INTO departments VALUES (11, 'Research', 550000, 'Boston');
SELECT * FROM departments WHERE id = 11;`},{type:"callout",calloutType:"tip",html:`Data changes in the sandbox are <strong>temporary</strong> — they only live in your browser's memory. Refreshing the page or clicking "Reset Database" restores the original data.`},{type:"text",html:"<h3>Bulk INSERT</h3><p>Insert multiple rows in one statement for better performance:</p>"},{type:"sandbox",description:"Insert multiple products at once:",defaultQuery:`INSERT INTO products VALUES
  (21, 'Webcam HD', 'Electronics', 69.99, 150),
  (22, 'Desk Organizer', 'Home', 19.99, 300),
  (23, 'Notebook Set', 'Books', 14.99, 500);

SELECT * FROM products WHERE id > 20;`}]},{id:2,moduleId:6,title:"UPDATE",slug:"update",content:[{type:"text",html:`<h2>Modifying Data with UPDATE</h2>
<p><code>UPDATE</code> changes existing row values. <strong>Always use a WHERE clause</strong> — without it, every row gets updated!</p>`},{type:"code",title:"Syntax",sql:"UPDATE table SET column = value WHERE condition;"},{type:"callout",calloutType:"warning",html:"<strong>Danger!</strong> <code>UPDATE employees SET salary = 0;</code> without WHERE sets <em>everyone's</em> salary to zero. Always test your WHERE clause with a SELECT first."},{type:"sandbox",description:"Give Engineering (dept 1) a 10% raise:",defaultQuery:`-- Check before:
SELECT name, salary FROM employees WHERE department_id = 1;

-- Apply raise:
-- UPDATE employees SET salary = salary * 1.1 WHERE department_id = 1;

-- Check after (uncomment UPDATE above to try):
-- SELECT name, salary FROM employees WHERE department_id = 1;`},{type:"text",html:"<h3>UPDATE with Expressions</h3><p>You can use calculations, functions, and even subqueries in SET:</p>"},{type:"sandbox",description:"Update product stock after a sale:",defaultQuery:`SELECT name, stock FROM products WHERE id = 2;

UPDATE products SET stock = stock - 5 WHERE id = 2;

SELECT name, stock FROM products WHERE id = 2;`}]},{id:3,moduleId:6,title:"DELETE",slug:"delete",content:[{type:"text",html:`<h2>Removing Data with DELETE</h2>
<p><code>DELETE</code> removes rows from a table. Like UPDATE, <strong>always use WHERE</strong>.</p>`},{type:"code",title:"Syntax",sql:"DELETE FROM table WHERE condition;"},{type:"comparison",left:{title:"DELETE",content:"Removes specific rows.<br>Can use WHERE clause.<br>Can be rolled back in a transaction.<br>Fires triggers."},right:{title:"TRUNCATE",content:"Removes ALL rows instantly.<br>No WHERE clause.<br>Cannot be rolled back (DDL).<br>Does not fire triggers.<br>Resets AUTO_INCREMENT."}},{type:"sandbox",description:"Delete cancelled orders:",defaultQuery:`-- Check how many cancelled orders exist:
SELECT COUNT(*) AS cancelled_count FROM orders WHERE status = 'cancelled';

-- Delete them:
DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled');
DELETE FROM orders WHERE status = 'cancelled';

-- Verify:
SELECT COUNT(*) AS remaining FROM orders;`},{type:"callout",calloutType:"warning",html:"<strong>Foreign key constraint</strong>: You can't delete a row if other rows reference it. Delete the referencing rows first (order_items before orders), or use <code>ON DELETE CASCADE</code> in the FK definition."}]},{id:4,moduleId:6,title:"Transactions",slug:"transactions",content:[{type:"animation",animation:"TransactionAnimation"},{type:"text",html:`<h2>Transactions — All or Nothing</h2>
<p>A <strong>transaction</strong> groups multiple statements into a single atomic unit. Either <em>all</em> succeed, or <em>none</em> do. This prevents partial updates that leave data in an inconsistent state.</p>
<h3>ACID Properties</h3>
<ul>
<li><strong>Atomicity</strong> — all changes commit together, or all roll back</li>
<li><strong>Consistency</strong> — database moves from one valid state to another</li>
<li><strong>Isolation</strong> — concurrent transactions don't interfere</li>
<li><strong>Durability</strong> — committed changes survive crashes</li>
</ul>`},{type:"code",title:"Transaction syntax",sql:`BEGIN TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;  -- or ROLLBACK; to undo everything`},{type:"sandbox",description:"Transaction example — transfer budget between departments:",defaultQuery:`-- Transfer $100K from Engineering to Design
BEGIN TRANSACTION;

UPDATE departments SET budget = budget - 100000 WHERE id = 1;
UPDATE departments SET budget = budget + 100000 WHERE id = 10;

COMMIT;

SELECT name, budget FROM departments WHERE id IN (1, 10);`},{type:"callout",calloutType:"mysql",html:"<strong>MySQL/InnoDB</strong>: Every single statement is implicitly a transaction (autocommit mode). Use <code>START TRANSACTION</code> (or <code>BEGIN</code>) to group multiple statements. InnoDB also supports <code>SAVEPOINT</code> for partial rollbacks."},{type:"text",html:`<h3>MySQL-Specific: ON DUPLICATE KEY UPDATE</h3>
<p>MySQL's "upsert" — insert a row, but if the primary key already exists, update it instead:</p>`},{type:"code",title:"MySQL UPSERT syntax",sql:`-- MySQL syntax (not available in our SQLite sandbox):
INSERT INTO products (id, name, category, price, stock)
VALUES (1, 'Laptop Pro 15', 'Electronics', 1349.99, 145)
ON DUPLICATE KEY UPDATE
  price = VALUES(price),
  stock = VALUES(stock);`},{type:"callout",calloutType:"mysql",html:"<code>ON DUPLICATE KEY UPDATE</code> is MySQL-specific. PostgreSQL uses <code>ON CONFLICT ... DO UPDATE</code>. SQLite uses <code>INSERT OR REPLACE</code>. The concept is the same — atomically insert or update."}]}],exercises:[{id:1,moduleId:6,title:"Insert a Department",description:'<p>Insert a new department: id=<strong>11</strong>, name=<strong>"Research"</strong>, budget=<strong>750000</strong>, location=<strong>"Boston"</strong>. Then SELECT all columns from departments where id = 11.</p>',difficulty:"easy",starterQuery:`-- Insert Research department, then query it
`,expectedQuery:"INSERT INTO departments VALUES (11, 'Research', 750000, 'Boston'); SELECT * FROM departments WHERE id = 11;",expectedResult:{columns:["id","name","budget","location"],values:[[11,"Research",75e4,"Boston"]]},hints:["INSERT INTO departments VALUES (id, 'name', budget, 'location')","Run both statements: INSERT then SELECT","INSERT INTO departments VALUES (11, 'Research', 750000, 'Boston'); SELECT * FROM departments WHERE id = 11;"],validationMode:"exact"},{id:2,moduleId:6,title:"Give a Raise",description:"<p>Give all employees in the <strong>Support department (id=7)</strong> a <strong>15% raise</strong>. Then show their <code>name</code> and new <code>salary</code>.</p>",difficulty:"medium",starterQuery:`-- 15% raise for Support, then show results
`,expectedQuery:"UPDATE employees SET salary = salary * 1.15 WHERE department_id = 7; SELECT name, salary FROM employees WHERE department_id = 7;",expectedResult:{columns:["name","salary"],values:[["Olivia Harris",74750],["Peter Clark",71300],["Gina Evans",73600],["Steve Bailey",72450]]},hints:["UPDATE employees SET salary = salary * 1.15 WHERE ...","department_id = 7 is the Support department","UPDATE employees SET salary = salary * 1.15 WHERE department_id = 7; SELECT name, salary FROM employees WHERE department_id = 7;"],validationMode:"unordered"},{id:3,moduleId:6,title:"Delete Cancelled Orders",description:"<p>Delete all <strong>cancelled</strong> orders (and their order items first). Then show the <code>COUNT</code> of remaining orders as <code>remaining_orders</code>.</p>",difficulty:"medium",starterQuery:`-- Delete cancelled orders and their items
`,expectedQuery:"DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled'); DELETE FROM orders WHERE status = 'cancelled'; SELECT COUNT(*) AS remaining_orders FROM orders;",expectedResult:{columns:["remaining_orders"],values:[[37]]},hints:["Delete order_items first (foreign key), then orders","WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled')","DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled'); DELETE FROM orders WHERE status = 'cancelled'; SELECT COUNT(*) AS remaining_orders FROM orders;"],validationMode:"exact"},{id:4,moduleId:6,title:"Budget Transfer",description:"<p>Transfer <strong>$200,000</strong> from Engineering (id=1) to Design (id=10) using a transaction. Then show both departments' <code>name</code> and <code>budget</code>.</p>",difficulty:"medium",starterQuery:`-- Transfer budget using a transaction
`,expectedQuery:"BEGIN TRANSACTION; UPDATE departments SET budget = budget - 200000 WHERE id = 1; UPDATE departments SET budget = budget + 200000 WHERE id = 10; COMMIT; SELECT name, budget FROM departments WHERE id IN (1, 10);",expectedResult:{columns:["name","budget"],values:[["Engineering",13e5],["Design",85e4]]},hints:["BEGIN TRANSACTION; ... COMMIT; wraps the updates","Subtract from id=1, add to id=10","BEGIN TRANSACTION; UPDATE departments SET budget = budget - 200000 WHERE id = 1; UPDATE departments SET budget = budget + 200000 WHERE id = 10; COMMIT; SELECT name, budget FROM departments WHERE id IN (1, 10);"],validationMode:"exact"}]},Lc={id:7,title:"Schema Design",slug:"schema-design",description:"CREATE TABLE, primary keys, foreign keys, indexes, normalization, and utf8mb4.",icon:"Layout",color:"#2C3E50",lessons:[{id:1,moduleId:7,title:"CREATE TABLE",slug:"create-table",content:[{type:"text",html:`<h2>Creating Tables</h2>
<p>Tables are created with <code>CREATE TABLE</code>. Each column gets a name, a data type, and optional constraints.</p>`},{type:"code",title:"MySQL syntax",sql:`CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`},{type:"sandbox",description:"Create a table and insert data:",defaultQuery:`CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK(role IN ('admin', 'editor', 'viewer')),
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO users (id, email, name, role) VALUES
  (1, 'admin@example.com', 'Admin User', 'admin'),
  (2, 'editor@example.com', 'Content Editor', 'editor'),
  (3, 'viewer@example.com', 'Basic User', 'viewer');

SELECT * FROM users;`},{type:"callout",calloutType:"mysql",html:"<strong>MySQL vs SQLite</strong>: MySQL uses <code>AUTO_INCREMENT</code> and <code>ENUM</code>. Our sandbox uses SQLite equivalents: <code>INTEGER PRIMARY KEY</code> (auto-increments) and <code>CHECK</code> constraints."}]},{id:2,moduleId:7,title:"Primary Keys & AUTO_INCREMENT",slug:"primary-keys",content:[{type:"text",html:`<h2>Primary Keys</h2>
<p>A <strong>primary key</strong> uniquely identifies each row. No two rows can share the same PK value, and it can never be NULL.</p>
<h3>AUTO_INCREMENT</h3>
<p>MySQL automatically generates a unique integer for each new row. You don't specify the value on INSERT — MySQL handles it.</p>`},{type:"code",title:"MySQL AUTO_INCREMENT",sql:`CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT
);

-- MySQL generates id automatically:
INSERT INTO posts (title, body) VALUES ('Hello', 'First post');
INSERT INTO posts (title, body) VALUES ('World', 'Second post');`},{type:"callout",calloutType:"warning",html:"<strong>AUTO_INCREMENT gaps</strong>: If you delete row id=5, MySQL does NOT reuse that number. IDs can have gaps after deletions, failed inserts, or transaction rollbacks. Never assume IDs are sequential."},{type:"text",html:`<h3>Composite Primary Keys</h3>
<p>Sometimes two columns together form the primary key — common in junction/pivot tables:</p>`},{type:"code",title:"Composite PK",sql:`CREATE TABLE course_enrollments (
  student_id INT,
  course_id INT,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, course_id)  -- combination must be unique
);`}]},{id:3,moduleId:7,title:"Foreign Keys",slug:"foreign-keys",content:[{type:"text",html:`<h2>Foreign Keys — Enforcing Relationships</h2>
<p>A <strong>foreign key</strong> ensures a value in one table references a valid row in another table. It prevents "orphan" records.</p>`},{type:"code",title:"Foreign key definition",sql:`CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  total DECIMAL(10,2),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON DELETE RESTRICT     -- prevent deleting a customer with orders
    ON UPDATE CASCADE      -- update customer_id if customer.id changes
);`},{type:"text",html:`<h3>CASCADE Options</h3>
<ul>
<li><code>RESTRICT</code> (default) — prevent the delete/update</li>
<li><code>CASCADE</code> — automatically delete/update child rows</li>
<li><code>SET NULL</code> — set the FK column to NULL</li>
<li><code>NO ACTION</code> — same as RESTRICT in InnoDB</li>
</ul>`},{type:"sandbox",description:"See how foreign keys work in our database:",defaultQuery:`-- This would fail in MySQL with FK enforcement:
-- DELETE FROM departments WHERE id = 1;
-- Error: Cannot delete because employees reference this department

-- Check which employees reference department 1:
SELECT name FROM employees WHERE department_id = 1;`},{type:"callout",calloutType:"mysql",html:"<strong>Performance tip</strong>: MySQL/InnoDB automatically creates an index on foreign key columns. This speeds up JOIN queries and FK checks on INSERT/UPDATE."}]},{id:4,moduleId:7,title:"Indexes — How They Work",slug:"indexes",content:[{type:"animation",animation:"BTreeAnimation"},{type:"text",html:`<h2>Indexes — The #1 Performance Tool</h2>
<p>An <strong>index</strong> is a data structure (B+ tree in InnoDB) that lets MySQL find rows without scanning the entire table. Like a book's index — jump to the right page instead of reading every page.</p>
<h3>Without an index (Full Table Scan)</h3>
<p>MySQL reads every single row to find matches. Fine for 100 rows, disastrous for 10 million.</p>
<h3>With an index (B+ Tree Lookup)</h3>
<p>MySQL traverses a tree structure: root → internal → leaf → row. Typically 3-4 hops regardless of table size.</p>`},{type:"code",title:"Creating indexes",sql:`-- Single column index
CREATE INDEX idx_email ON employees(email);

-- Composite index (multi-column)
CREATE INDEX idx_dept_salary ON employees(department_id, salary);

-- Unique index (also enforces uniqueness)
CREATE UNIQUE INDEX idx_email_unique ON employees(email);`},{type:"text",html:`<h3>The Leftmost Prefix Rule</h3>
<p>A composite index on <code>(a, b, c)</code> can satisfy queries on <code>a</code>, <code>(a, b)</code>, or <code>(a, b, c)</code> — but NOT just <code>b</code> or <code>c</code> alone. Think of it like a phone book sorted by last name, then first name.</p>`},{type:"comparison",left:{title:"Uses the index (a, b, c)",content:"<code>WHERE a = 1</code><br><code>WHERE a = 1 AND b = 2</code><br><code>WHERE a = 1 AND b = 2 AND c = 3</code><br><code>WHERE a = 1 ORDER BY b</code>"},right:{title:"Cannot use the index",content:'<code>WHERE b = 2</code> (skips leftmost)<br><code>WHERE c = 3</code> (skips leftmost)<br><code>WHERE b = 2 AND c = 3</code> (no "a")'}},{type:"callout",calloutType:"tip",html:'Want to see if your query uses an index? Use our <a href="/tools/explain/">EXPLAIN Analyzer</a> — it shows the access type (ALL = full scan, ref/range = index used).'}]},{id:5,moduleId:7,title:"Normalization",slug:"normalization",content:[{type:"text",html:`<h2>Normalization — Reducing Redundancy</h2>
<p>Normalization organizes tables to minimize data duplication. Each "normal form" eliminates a specific type of redundancy.</p>
<h3>1NF — No Repeating Groups</h3>
<p>Each cell contains a single value (no arrays, no comma-separated lists).</p>`},{type:"comparison",left:{title:"Violates 1NF",content:`<code>skills: "Python, SQL, Java"</code><br>Can't easily query "find employees who know SQL".`},right:{title:"Correct (1NF)",content:"Separate <code>employee_skills</code> table with one row per skill.<br>Easy to query and index."}},{type:"text",html:`<h3>2NF — No Partial Dependencies</h3>
<p>Every non-key column depends on the <em>entire</em> primary key, not just part of it. Only relevant for composite keys.</p>
<h3>3NF — No Transitive Dependencies</h3>
<p>Non-key columns depend on the primary key, not on other non-key columns.</p>`},{type:"comparison",left:{title:"Violates 3NF",content:"employees table with:<br><code>department_id, department_name, department_location</code><br>department_name depends on department_id, not employee id."},right:{title:"Correct (3NF)",content:"employees has <code>department_id</code>.<br>departments table has <code>name, location</code>.<br>No redundancy — department name stored once."}},{type:"callout",calloutType:"tip",html:"<strong>In practice</strong>: Aim for 3NF as your starting point. Denormalize strategically only when performance requires it (e.g., adding a redundant column to avoid a costly JOIN in a hot query path)."}]},{id:6,moduleId:7,title:"ALTER TABLE & DROP TABLE",slug:"alter-table",content:[{type:"text",html:`<h2>Modifying Existing Tables</h2>
<p><code>ALTER TABLE</code> changes an existing table's structure without dropping it. You can add columns, remove columns, modify data types, and rename things.</p>`},{type:"code",title:"MySQL ALTER TABLE commands",sql:`-- Add a column
ALTER TABLE employees ADD COLUMN phone VARCHAR(20);

-- Remove a column
ALTER TABLE employees DROP COLUMN phone;

-- Rename a column (MySQL 8.0+)
ALTER TABLE employees RENAME COLUMN name TO full_name;

-- Change column type
ALTER TABLE employees MODIFY COLUMN salary DECIMAL(12,2);

-- Add an index
ALTER TABLE employees ADD INDEX idx_dept (department_id);

-- Rename a table
ALTER TABLE old_name RENAME TO new_name;`},{type:"sandbox",description:"Try ALTER TABLE in the sandbox:",defaultQuery:`-- Add a column to departments
ALTER TABLE departments ADD COLUMN country TEXT DEFAULT 'Unknown';

-- Check the result
SELECT * FROM departments LIMIT 5;`},{type:"text",html:`<h3>DROP TABLE</h3>
<p><code>DROP TABLE</code> permanently deletes a table and all its data. Use <code>IF EXISTS</code> to avoid errors.</p>`},{type:"code",title:"Drop safely",sql:"DROP TABLE IF EXISTS temp_results;"},{type:"callout",calloutType:"warning",html:"<strong>ALTER TABLE in production</strong>: On large tables (millions of rows), ALTER TABLE can lock the table for minutes or hours. MySQL 8.0 supports <code>INSTANT</code> algorithm for some changes (adding columns). For large migrations, use tools like <code>pt-online-schema-change</code> or <code>gh-ost</code>."}]},{id:7,moduleId:7,title:"SQL Comments",slug:"sql-comments",content:[{type:"text",html:`<h2>Commenting SQL Code</h2>
<p>Comments make SQL readable and are ignored by the database engine.</p>`},{type:"code",title:"Comment types",sql:`-- Single line comment (most common)
SELECT name FROM employees; -- inline comment

# Hash comment (MySQL only, not standard SQL)
SELECT name FROM employees;

/* Multi-line comment
   Useful for temporarily disabling
   parts of a query */
SELECT name /* , salary, department_id */
FROM employees;`},{type:"sandbox",description:"Try commenting out parts of a query:",defaultQuery:`SELECT
  name,
  salary
  -- , department_id  -- uncomment to include
  -- , hire_date
FROM employees
LIMIT 5;`},{type:"callout",calloutType:"tip",html:"<strong>Pro tip</strong>: Comments are great for debugging. Comment out parts of a complex query to isolate which part is causing issues."}]}],exercises:[{id:1,moduleId:7,title:"Create a Tags Table",description:'<p>Create a table called <code>tags</code> with columns: <code>id</code> (integer primary key), <code>name</code> (text, not null, unique). Then insert 3 tags: "mysql", "performance", "indexing". Finally, SELECT all from tags.</p>',difficulty:"easy",starterQuery:`-- Create tags table, insert data, query it
`,expectedQuery:"CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE); INSERT INTO tags VALUES (1, 'mysql'), (2, 'performance'), (3, 'indexing'); SELECT * FROM tags;",expectedResult:{columns:["id","name"],values:[[1,"mysql"],[2,"performance"],[3,"indexing"]]},hints:["CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)","INSERT INTO tags VALUES (1, 'mysql'), (2, 'performance'), (3, 'indexing')","CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE); INSERT INTO tags VALUES (1, 'mysql'), (2, 'performance'), (3, 'indexing'); SELECT * FROM tags;"],validationMode:"exact"},{id:2,moduleId:7,title:"Find Tables Without Indexes",description:"<p>List all indexes in our database using <code>SELECT * FROM sqlite_master WHERE type = 'index'</code>. Show columns <code>name</code> and <code>tbl_name</code>.</p>",difficulty:"easy",starterQuery:`-- List all indexes
`,expectedQuery:"SELECT name, tbl_name FROM sqlite_master WHERE type = 'index';",expectedResult:{columns:["name","tbl_name"],values:[]},hints:["sqlite_master contains metadata about all database objects","WHERE type = 'index' filters to just indexes","SELECT name, tbl_name FROM sqlite_master WHERE type = 'index';"],validationMode:"unordered"},{id:3,moduleId:7,title:"Create a Junction Table",description:"<p>Create a many-to-many relationship: a <code>post_tags</code> junction table with <code>post_id</code> (integer) and <code>tag_id</code> (integer), with a composite primary key on both columns. Insert 3 rows: (1,1), (1,2), (2,1). Then SELECT all rows.</p>",difficulty:"medium",starterQuery:`-- Create junction table with composite PK
`,expectedQuery:"CREATE TABLE post_tags (post_id INTEGER, tag_id INTEGER, PRIMARY KEY (post_id, tag_id)); INSERT INTO post_tags VALUES (1,1), (1,2), (2,1); SELECT * FROM post_tags;",expectedResult:{columns:["post_id","tag_id"],values:[[1,1],[1,2],[2,1]]},hints:["PRIMARY KEY (post_id, tag_id) creates a composite key","INSERT INTO post_tags VALUES (1,1), (1,2), (2,1)","CREATE TABLE post_tags (post_id INTEGER, tag_id INTEGER, PRIMARY KEY (post_id, tag_id)); INSERT INTO post_tags VALUES (1,1), (1,2), (2,1); SELECT * FROM post_tags;"],validationMode:"exact"},{id:4,moduleId:7,title:"Design Challenge: Blog Schema",description:"<p>Create 3 tables for a blog: <code>authors</code> (id, name), <code>posts</code> (id, author_id FK, title, published_at), <code>comments</code> (id, post_id FK, author_name, body). Insert 1 author, 1 post, 2 comments. Then query all comments with their post title using a JOIN.</p>",difficulty:"hard",starterQuery:`-- Design a blog schema
`,expectedQuery:"CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL); CREATE TABLE posts (id INTEGER PRIMARY KEY, author_id INTEGER REFERENCES authors(id), title TEXT NOT NULL, published_at TEXT); CREATE TABLE comments (id INTEGER PRIMARY KEY, post_id INTEGER REFERENCES posts(id), author_name TEXT NOT NULL, body TEXT NOT NULL); INSERT INTO authors VALUES (1, 'Jane'); INSERT INTO posts VALUES (1, 1, 'Hello World', '2024-01-01'); INSERT INTO comments VALUES (1, 1, 'Bob', 'Great post!'), (2, 1, 'Alice', 'Thanks for sharing'); SELECT c.author_name, c.body, p.title FROM comments c INNER JOIN posts p ON c.post_id = p.id;",expectedResult:{columns:["author_name","body","title"],values:[["Bob","Great post!","Hello World"],["Alice","Thanks for sharing","Hello World"]]},hints:["Create tables in order: authors first (no FKs), then posts (FK to authors), then comments (FK to posts)","INSERT data into each table, then JOIN comments to posts","See solution for full SQL"],validationMode:"exact"},{id:5,moduleId:7,title:"ALTER TABLE: Add Column",description:"<p>Add a <code>country</code> column (TEXT, default 'Unknown') to the <code>departments</code> table using ALTER TABLE. Then show <code>name</code> and <code>country</code> for all departments.</p>",difficulty:"medium",starterQuery:`-- Add a country column to departments
`,expectedQuery:"ALTER TABLE departments ADD COLUMN country TEXT DEFAULT 'Unknown'; SELECT name, country FROM departments;",expectedResult:{columns:["name","country"],values:[["Engineering","Unknown"],["Marketing","Unknown"],["Sales","Unknown"],["HR","Unknown"],["Finance","Unknown"],["Operations","Unknown"],["Support","Unknown"],["Legal","Unknown"],["Product","Unknown"],["Design","Unknown"]]},hints:["ALTER TABLE departments ADD COLUMN country TEXT DEFAULT 'Unknown'","Follow with SELECT name, country FROM departments","ALTER TABLE departments ADD COLUMN country TEXT DEFAULT 'Unknown'; SELECT name, country FROM departments;"],validationMode:"exact"},{id:6,moduleId:7,title:"CREATE and DROP Table",description:"<p>Create a table <code>temp_log</code> with columns <code>id</code> (integer primary key) and <code>message</code> (text). Insert 2 rows. Then DROP the table. Finally, verify it's gone by counting tables named 'temp_log' in <code>sqlite_master</code>. The final SELECT should return <code>0</code>.</p>",difficulty:"medium",starterQuery:`-- Create, populate, drop, verify
`,expectedQuery:"CREATE TABLE temp_log (id INTEGER PRIMARY KEY, message TEXT); INSERT INTO temp_log VALUES (1, 'start'), (2, 'end'); DROP TABLE temp_log; SELECT COUNT(*) AS tables_exist FROM sqlite_master WHERE type='table' AND name='temp_log';",expectedResult:{columns:["tables_exist"],values:[[0]]},hints:["CREATE TABLE temp_log (id INTEGER PRIMARY KEY, message TEXT)","After inserting and dropping, query sqlite_master to verify","CREATE TABLE temp_log (id INTEGER PRIMARY KEY, message TEXT); INSERT INTO temp_log VALUES (1, 'start'), (2, 'end'); DROP TABLE temp_log; SELECT COUNT(*) AS tables_exist FROM sqlite_master WHERE type='table' AND name='temp_log';"],validationMode:"exact"},{id:7,moduleId:7,title:"Schema with Constraints",description:"<p>Create a table <code>reviews</code> with: <code>id</code> (integer PK), <code>product_id</code> (integer, not null, FK to products), <code>rating</code> (integer, CHECK between 1-5), <code>comment</code> (text). Insert 2 reviews for product 1 (ratings 5 and 3). SELECT all from reviews.</p>",difficulty:"hard",starterQuery:`-- Create reviews table with constraints
`,expectedQuery:"CREATE TABLE reviews (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id), rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5), comment TEXT); INSERT INTO reviews VALUES (1, 1, 5, 'Excellent laptop'), (2, 1, 3, 'Decent but pricey'); SELECT * FROM reviews;",expectedResult:{columns:["id","product_id","rating","comment"],values:[[1,1,5,"Excellent laptop"],[2,1,3,"Decent but pricey"]]},hints:["CHECK(rating >= 1 AND rating <= 5) constrains valid ratings","REFERENCES products(id) creates the foreign key","See solution for the full CREATE TABLE + INSERT + SELECT"],validationMode:"exact"}]},Ac={id:8,title:"Performance & EXPLAIN",slug:"performance-explain",description:"Full scan vs index scan, reading EXPLAIN output, index strategies, optimizer hints. Links to our EXPLAIN Analyzer.",icon:"Zap",color:"#E67E22",lessons:[{id:1,moduleId:8,title:"Why Queries Are Slow",slug:"why-queries-slow",content:[{type:"animation",animation:"ScanCompareAnimation"},{type:"text",html:`<h2>The Speed Problem</h2>
<p>A query that takes 50ms on 1,000 rows might take <strong>50 seconds</strong> on 1,000,000 rows. Understanding <em>why</em> queries are slow is the difference between a responsive app and a crashed server.</p>
<h3>The #1 Cause: Full Table Scans</h3>
<p>Without an index, MySQL must read <strong>every single row</strong> to find matches. This is called a <code>Full Table Scan</code> (type=ALL in EXPLAIN).</p>
<p>With an index, MySQL jumps directly to matching rows — like looking up a word in a dictionary vs reading every page.</p>`},{type:"comparison",left:{title:"Full Table Scan (type=ALL)",content:"<strong>1,000,000 rows examined</strong><br>Reads entire table sequentially.<br>Gets slower as table grows.<br>CPU + disk I/O intensive."},right:{title:"Index Lookup (type=ref)",content:"<strong>1-10 rows examined</strong><br>B+ tree traversal: 3-4 hops.<br>Constant time regardless of table size.<br>Minimal I/O."}},{type:"text",html:`<h3>Other Common Causes</h3>
<ul>
<li><strong>Missing indexes</strong> on WHERE, JOIN, and ORDER BY columns</li>
<li><strong>Functions on indexed columns</strong>: <code>WHERE YEAR(date) = 2024</code> can't use an index on <code>date</code></li>
<li><strong>SELECT *</strong> instead of specific columns (reads more data)</li>
<li><strong>Filesort</strong>: sorting without an index creates a temporary sort operation</li>
<li><strong>Temporary tables</strong>: GROUP BY without proper indexes</li>
<li><strong>N+1 queries</strong>: running a query per row instead of using JOINs</li>
</ul>`}]},{id:2,moduleId:8,title:"Reading EXPLAIN Output",slug:"reading-explain",content:[{type:"text",html:`<h2>MySQL EXPLAIN — Your X-Ray Vision</h2>
<p><code>EXPLAIN</code> shows MySQL's execution plan — how it will run your query. It reveals whether indexes are used, how many rows are examined, and what operations are performed.</p>`},{type:"code",title:"Usage",sql:`EXPLAIN SELECT * FROM employees WHERE department_id = 1;

-- Or for detailed timing information (MySQL 8.0+):
EXPLAIN ANALYZE SELECT * FROM employees WHERE department_id = 1;`},{type:"text",html:`<h3>Key EXPLAIN Columns</h3>
<table>
<tr><th>Column</th><th>What it tells you</th><th>What to look for</th></tr>
<tr><td><code>type</code></td><td>How MySQL accesses the table</td><td><strong>ALL</strong> = bad (full scan). <strong>ref</strong>, <strong>range</strong>, <strong>const</strong> = good</td></tr>
<tr><td><code>key</code></td><td>Which index MySQL chose</td><td>NULL = no index used (usually bad)</td></tr>
<tr><td><code>rows</code></td><td>Estimated rows to examine</td><td>Should be much smaller than table size</td></tr>
<tr><td><code>Extra</code></td><td>Additional operations</td><td><strong>Using filesort</strong> and <strong>Using temporary</strong> = potential issues</td></tr>
<tr><td><code>filtered</code></td><td>% of rows that pass conditions</td><td>Low values mean lots of wasted work</td></tr>
</table>`},{type:"text",html:`<h3>Access Type Rankings (best to worst)</h3>
<ol>
<li><code>system</code> / <code>const</code> — single row lookup (primary key = value)</li>
<li><code>eq_ref</code> — one row per join (unique index)</li>
<li><code>ref</code> — multiple rows via index (non-unique key)</li>
<li><code>range</code> — index range scan (BETWEEN, >, <)</li>
<li><code>index</code> — full index scan (reads entire index, no table)</li>
<li><code>ALL</code> — <strong>full table scan</strong> (reads every row!)</li>
</ol>`},{type:"callout",calloutType:"tip",html:'Paste your EXPLAIN output into our <a href="/tools/explain/">MySQL EXPLAIN Analyzer</a> for automatic issue detection, index recommendations, and tree visualization.'}]},{id:3,moduleId:8,title:"Index Strategies",slug:"index-strategies",content:[{type:"text",html:`<h2>Choosing the Right Indexes</h2>
<h3>1. Index WHERE Clause Columns</h3>
<p>If you frequently query <code>WHERE status = 'active'</code>, create an index on <code>status</code>.</p>
<h3>2. Composite Indexes for Multi-Column Queries</h3>
<p>For <code>WHERE department_id = 1 AND salary > 80000</code>, a composite index <code>(department_id, salary)</code> is better than two separate indexes.</p>`},{type:"code",title:"Composite index",sql:`-- Covers both WHERE conditions efficiently:
CREATE INDEX idx_dept_salary ON employees(department_id, salary);

-- MySQL uses this for:
-- WHERE department_id = 1
-- WHERE department_id = 1 AND salary > 80000
-- WHERE department_id = 1 ORDER BY salary`},{type:"text",html:`<h3>3. Covering Indexes</h3>
<p>If the index contains all columns the query needs, MySQL can answer the query from the index alone without reading the table. This is called a <strong>covering index</strong> (shows "Using index" in EXPLAIN).</p>`},{type:"code",title:"Covering index example",sql:`-- If your query is:
SELECT department_id, salary FROM employees
WHERE department_id = 1;

-- This index "covers" it (contains both columns):
CREATE INDEX idx_dept_salary ON employees(department_id, salary);
-- MySQL never touches the table — reads everything from the index`},{type:"text",html:`<h3>4. Don't Over-Index</h3>
<ul>
<li>Each index slows down INSERT/UPDATE/DELETE (index must be maintained)</li>
<li>Indexes use disk space and memory</li>
<li>Rule of thumb: index columns you filter, join, or sort by</li>
<li>Remove unused indexes (MySQL 8.0: use <code>sys.schema_unused_indexes</code>)</li>
</ul>`},{type:"callout",calloutType:"mysql",html:`<strong>MySQL 8.0+ features</strong>: Invisible indexes (<code>ALTER TABLE ... ALTER INDEX idx INVISIBLE</code>) let you "hide" an index from the optimizer to test if it's needed before dropping it. Descending indexes allow efficient DESC ordering.`}]},{id:4,moduleId:8,title:"Query Optimization Patterns",slug:"optimization-patterns",content:[{type:"text",html:`<h2>Common Optimization Patterns</h2>
<h3>1. Avoid Functions on Indexed Columns</h3>`},{type:"comparison",left:{title:"Bad (can't use index)",content:"<code>WHERE YEAR(hire_date) = 2023</code><br>MySQL must compute YEAR() for every row."},right:{title:"Good (uses index)",content:"<code>WHERE hire_date >= '2023-01-01' AND hire_date < '2024-01-01'</code><br>Direct range scan on the index."}},{type:"text",html:"<h3>2. Rewrite Subqueries as JOINs</h3>"},{type:"comparison",left:{title:"Subquery (may be slower)",content:"<code>WHERE id IN (SELECT emp_id FROM bonuses)</code><br>May execute inner query per row."},right:{title:"JOIN (usually faster)",content:"<code>INNER JOIN bonuses b ON e.id = b.emp_id</code><br>Single pass with hash/merge join."}},{type:"text",html:`<h3>3. Use LIMIT for Pagination</h3>
<p>Instead of fetching all rows and filtering in your app:</p>`},{type:"comparison",left:{title:"Bad",content:"<code>SELECT * FROM orders</code><br>Fetch all 1M orders, show first 20 in UI."},right:{title:"Good",content:"<code>SELECT * FROM orders ORDER BY id DESC LIMIT 20</code><br>MySQL returns only 20 rows."}},{type:"text",html:"<h3>4. SELECT Only What You Need</h3>"},{type:"comparison",left:{title:"Bad",content:"<code>SELECT * FROM employees</code><br>Reads all columns including large TEXT/BLOB."},right:{title:"Good",content:"<code>SELECT name, email FROM employees</code><br>Reads only needed columns. May use covering index."}},{type:"text",html:`<h3>5. MySQL Optimizer Hints</h3>
<p>When the optimizer makes a wrong choice, you can override it:</p>`},{type:"code",title:"Optimizer hints",sql:`-- Force MySQL to use a specific index:
SELECT * FROM employees FORCE INDEX (idx_dept_salary)
WHERE department_id = 1;

-- Tell MySQL the join order:
SELECT STRAIGHT_JOIN e.name, d.name
FROM departments d
JOIN employees e ON e.department_id = d.id;`},{type:"callout",calloutType:"tip",html:'<strong>Ready to analyze your own queries?</strong> Our <a href="/tools/explain/">MySQL EXPLAIN Analyzer</a> detects all these issues automatically — full table scans, missing indexes, filesort, temporary tables — and suggests specific fixes with index recommendations.'}]}],exercises:[{id:1,moduleId:8,title:"Find the Full Scan",description:"<p>Write a query that finds employees hired in 2022 by checking the year. Then write a <strong>better version</strong> that uses a date range instead. Show both — the second query should be your final answer. Show <code>name</code> and <code>hire_date</code>, sorted by hire_date.</p>",difficulty:"medium",starterQuery:`-- Optimized: use date range instead of YEAR()
`,expectedQuery:"SELECT name, hire_date FROM employees WHERE hire_date >= '2022-01-01' AND hire_date < '2023-01-01' ORDER BY hire_date;",expectedResult:{columns:["name","hire_date"],values:[["Olivia Harris","2022-01-10"],["James Stewart","2022-01-20"],["Amy Baker","2022-02-01"],["Ulrich Cooper","2022-03-01"],["Peter Clark","2022-03-20"],["Elena Campbell","2022-04-01"],["Maya Reed","2022-05-01"],["Felix Parker","2022-06-15"],["Ophelia Morgan","2022-07-15"],["Gina Evans","2022-08-01"],["Tara Rivera","2022-09-01"],["Paul Bell","2022-10-01"],["Vera Richardson","2022-11-01"],["Xena Howard","2022-12-01"]]},hints:["Don't use YEAR(hire_date) = 2022 — it prevents index usage","Use a range: hire_date >= '2022-01-01' AND hire_date < '2023-01-01'","SELECT name, hire_date FROM employees WHERE hire_date >= '2022-01-01' AND hire_date < '2023-01-01' ORDER BY hire_date;"],validationMode:"exact"},{id:2,moduleId:8,title:"Optimize with JOIN",description:"<p>Rewrite this subquery as a JOIN: <code>SELECT name FROM employees WHERE department_id IN (SELECT id FROM departments WHERE budget > 1000000)</code>. Show <code>name</code> and <code>department</code> name.</p>",difficulty:"medium",starterQuery:`-- Rewrite the subquery as a JOIN
`,expectedQuery:"SELECT e.name, d.name AS department FROM employees e INNER JOIN departments d ON e.department_id = d.id WHERE d.budget > 1000000;",expectedResult:{columns:["name","department"],values:[["Alice Johnson","Engineering"],["Bob Smith","Engineering"],["Carol Davis","Engineering"],["Frank Brown","Sales"],["Grace Lee","Sales"],["Henry Taylor","Sales"],["Sam Walker","Product"],["Tina Hall","Product"],["Wendy King","Engineering"],["Xavier Wright","Engineering"],["Zach Green","Sales"],["Amy Baker","Engineering"],["Chloe Turner","Sales"],["Daniel Phillips","Product"],["Hugo Edwards","Engineering"],["Leo Rogers","Product"],["Maya Reed","Sales"],["Nathan Cook","Engineering"],["Vera Richardson","Engineering"],["Will Cox","Sales"],["Xena Howard","Product"],["Wendy King","Engineering"]]},hints:["Replace IN (SELECT ...) with INNER JOIN departments d ON ...","Add WHERE d.budget > 1000000","SELECT e.name, d.name AS department FROM employees e INNER JOIN departments d ON e.department_id = d.id WHERE d.budget > 1000000;"],validationMode:"unordered"},{id:3,moduleId:8,title:"Efficient Pagination",description:"<p>Get <strong>page 3</strong> of orders (10 orders per page), sorted by <code>order_date DESC</code>. Show <code>id</code>, <code>order_date</code>, <code>total</code>, <code>status</code>.</p>",difficulty:"easy",starterQuery:`-- Page 3 of orders (10 per page)
`,expectedQuery:"SELECT id, order_date, total, status FROM orders ORDER BY order_date DESC LIMIT 10 OFFSET 20;",expectedResult:{columns:["id","order_date","total","status"],values:[[20,"2023-12-01",629.98,"shipped"],[19,"2023-11-20",89.99,"shipped"],[18,"2023-11-05",449.99,"shipped"],[17,"2023-10-20",54.99,"delivered"],[16,"2023-10-01",179.98,"delivered"],[15,"2023-09-10",1299.99,"delivered"],[14,"2023-08-25",84.98,"delivered"],[13,"2023-08-05",399.99,"delivered"],[12,"2023-07-20",59.98,"delivered"],[11,"2023-07-01",479.98,"delivered"]]},hints:["Page 3 = skip first 20 rows (2 pages x 10)","LIMIT 10 OFFSET 20","SELECT id, order_date, total, status FROM orders ORDER BY order_date DESC LIMIT 10 OFFSET 20;"],validationMode:"exact"},{id:4,moduleId:8,title:"Selective Columns",description:"<p>Write an efficient query that finds the <strong>top 3 most expensive products</strong>. Only select <code>name</code> and <code>price</code> (not SELECT *). Sort by price descending.</p>",difficulty:"easy",starterQuery:`-- Top 3 most expensive (no SELECT *)
`,expectedQuery:"SELECT name, price FROM products ORDER BY price DESC LIMIT 3;",expectedResult:{columns:["name","price"],values:[["Laptop Pro 15",1299.99],["Standing Desk",599.99],['Monitor 27"',449.99]]},hints:["SELECT only name and price, not *","ORDER BY price DESC LIMIT 3","SELECT name, price FROM products ORDER BY price DESC LIMIT 3;"],validationMode:"exact"},{id:5,moduleId:8,title:"Analyze This Query",description:"<p>This query finds high-value customers but is poorly written. <strong>Rewrite it efficiently</strong>: Find customers who have spent more than $500 total (all orders). Show <code>customer</code> name and <code>total_spent</code> (rounded to 2 decimals). Sort by total_spent desc.</p><p>Bad version: <code>SELECT * FROM customers WHERE id IN (SELECT customer_id FROM orders GROUP BY customer_id HAVING SUM(total) > 500)</code></p>",difficulty:"hard",starterQuery:`-- Rewrite efficiently with JOIN + GROUP BY
`,expectedQuery:"SELECT c.name AS customer, ROUND(SUM(o.total), 2) AS total_spent FROM customers c INNER JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name HAVING SUM(o.total) > 500 ORDER BY total_spent DESC;",expectedResult:{columns:["customer","total_spent"],values:[["Acme Corp",2854.93],["Pacific Trading",1749.98],["CloudNine Ltd",1899.98],["TechStart Inc",324.94],["Velocity Labs",1299.99],["Coral Systems",1299.99],["Pinnacle Group",629.98],["Global Retail",639.96]]},hints:["Replace IN (subquery) with INNER JOIN + GROUP BY + HAVING","JOIN customers to orders, GROUP BY customer, HAVING SUM(total) > 500","SELECT c.name AS customer, ROUND(SUM(o.total), 2) AS total_spent FROM customers c INNER JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name HAVING SUM(o.total) > 500 ORDER BY total_spent DESC;"],validationMode:"unordered"},{id:6,moduleId:8,title:"Revenue Report",description:"<p>Build a comprehensive revenue report: for each <strong>product category</strong>, show <code>category</code>, <code>total_revenue</code> (quantity * unit_price, rounded), <code>orders_count</code> (distinct orders), and <code>avg_order_value</code> (revenue / distinct orders, rounded). Only include non-cancelled orders. Sort by revenue descending.</p>",difficulty:"hard",starterQuery:`-- Revenue report by product category
`,expectedQuery:"SELECT p.category, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_revenue, COUNT(DISTINCT o.id) AS orders_count, ROUND(SUM(oi.quantity * oi.unit_price) / COUNT(DISTINCT o.id), 2) AS avg_order_value FROM order_items oi INNER JOIN products p ON oi.product_id = p.id INNER JOIN orders o ON oi.order_id = o.id WHERE o.status != 'cancelled' GROUP BY p.category ORDER BY total_revenue DESC;",expectedResult:{columns:["category","total_revenue","orders_count","avg_order_value"],values:[["Electronics",8879.76,22,403.63],["Home",1671.94,6,278.66],["Books",314.89,7,44.98],["Sports",494.9,6,82.48],["Clothing",439.89,7,62.84],["Food",178.81,7,25.54]]},hints:["Join order_items → products AND order_items → orders","WHERE o.status != 'cancelled', GROUP BY p.category","avg_order_value = SUM(revenue) / COUNT(DISTINCT o.id)"],validationMode:"exact"}]},_c={id:9,title:"Window Functions & Advanced SQL",slug:"window-functions",description:"ROW_NUMBER, RANK, LEAD/LAG, running totals, UNION, Views, stored procedures, and JSON functions.",icon:"Layers",color:"#9B59B6",lessons:[{id:1,moduleId:9,title:"What Are Window Functions?",slug:"window-intro",content:[{type:"text",html:`<h2>Window Functions — Aggregates Without Collapsing Rows</h2>
<p><code>GROUP BY</code> collapses rows into groups. But what if you want to calculate an aggregate <strong>while keeping every row</strong>? That's what window functions do.</p>
<p>A window function computes a value across a set of rows related to the current row — the "window" — without reducing the number of rows in the output.</p>`},{type:"code",title:"Window function syntax",sql:`SELECT
  name, department_id, salary,
  AVG(salary) OVER (PARTITION BY department_id) AS dept_avg
FROM employees;
-- Every row kept, but dept_avg shows the department average`},{type:"comparison",left:{title:"GROUP BY (collapses rows)",content:"<code>SELECT department_id, AVG(salary)<br>FROM employees<br>GROUP BY department_id;</code><br><br>Returns <strong>10 rows</strong> (one per department)."},right:{title:"Window Function (keeps rows)",content:"<code>SELECT name, department_id, salary,<br>AVG(salary) OVER (PARTITION BY department_id)<br>FROM employees;</code><br><br>Returns <strong>50 rows</strong> (one per employee) + dept avg on each."}},{type:"sandbox",description:"Compare each employee salary to their department average:",defaultQuery:`SELECT
  name, department_id, salary,
  ROUND(AVG(salary) OVER (PARTITION BY department_id), 0) AS dept_avg,
  salary - ROUND(AVG(salary) OVER (PARTITION BY department_id), 0) AS diff
FROM employees
ORDER BY department_id, salary DESC;`},{type:"callout",calloutType:"mysql",html:"Window functions were added in <strong>MySQL 8.0</strong> (2018). If you're on MySQL 5.7, you must use correlated subqueries or self-joins instead (much slower)."}]},{id:2,moduleId:9,title:"ROW_NUMBER, RANK, DENSE_RANK",slug:"ranking",content:[{type:"text",html:`<h2>Ranking Functions</h2>
<p>These assign a position number to each row within a partition.</p>
<ul>
<li><code>ROW_NUMBER()</code> — unique sequential number (1, 2, 3, 4...)</li>
<li><code>RANK()</code> — allows ties with gaps (1, 2, 2, 4...)</li>
<li><code>DENSE_RANK()</code> — allows ties without gaps (1, 2, 2, 3...)</li>
</ul>`},{type:"sandbox",description:"Rank employees by salary within each department:",defaultQuery:`SELECT
  name, department_id, salary,
  ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS row_num,
  RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rank,
  DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS dense_rank
FROM employees
WHERE department_id IN (1, 3)
ORDER BY department_id, salary DESC;`},{type:"text",html:`<h3>Top-N Per Group Pattern</h3>
<p>The most common use: get the top N rows per group. Use ROW_NUMBER in a CTE, then filter:</p>`},{type:"sandbox",description:"Top 3 highest-paid employees per department:",defaultQuery:`WITH ranked AS (
  SELECT
    name, department_id, salary,
    ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn
  FROM employees
)
SELECT name, department_id, salary
FROM ranked
WHERE rn <= 3
ORDER BY department_id, salary DESC;`},{type:"callout",calloutType:"tip",html:'<strong>Interview favorite</strong>: "Get the top N per group" is the #1 most asked SQL interview question. Use <code>ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)</code> in a CTE, then <code>WHERE rn <= N</code>.'}]},{id:3,moduleId:9,title:"LEAD, LAG, and Running Totals",slug:"lead-lag",content:[{type:"text",html:`<h2>Accessing Other Rows</h2>
<h3>LAG — Look at the Previous Row</h3>
<p><code>LAG(column, offset)</code> returns the value from a previous row. Perfect for "compare to previous" calculations.</p>
<h3>LEAD — Look at the Next Row</h3>
<p><code>LEAD(column, offset)</code> returns the value from a following row.</p>`},{type:"sandbox",description:"Order-to-order revenue change:",defaultQuery:`SELECT
  id,
  order_date,
  total,
  LAG(total, 1) OVER (ORDER BY order_date) AS prev_total,
  ROUND(total - LAG(total, 1) OVER (ORDER BY order_date), 2) AS change
FROM orders
WHERE status = 'delivered'
ORDER BY order_date
LIMIT 12;`},{type:"text",html:`<h3>Running Totals with SUM() OVER</h3>
<p>A running total accumulates values row by row. Use <code>SUM() OVER (ORDER BY ...)</code>:</p>`},{type:"sandbox",description:"Cumulative revenue over time:",defaultQuery:`SELECT
  order_date,
  total,
  SUM(total) OVER (ORDER BY order_date) AS running_total
FROM orders
WHERE status = 'delivered'
ORDER BY order_date
LIMIT 15;`},{type:"text",html:`<h3>Moving Average</h3>
<p>Use a frame specification to calculate averages over a sliding window:</p>`},{type:"sandbox",description:"3-order moving average:",defaultQuery:`SELECT
  order_date,
  total,
  ROUND(AVG(total) OVER (
    ORDER BY order_date
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ), 2) AS moving_avg_3
FROM orders
WHERE status = 'delivered'
ORDER BY order_date
LIMIT 15;`}]},{id:4,moduleId:9,title:"UNION and Set Operations",slug:"union",content:[{type:"text",html:`<h2>Combining Result Sets</h2>
<h3>UNION — Combine and Deduplicate</h3>
<p><code>UNION</code> stacks results from two queries vertically. Removes duplicates by default.</p>
<h3>UNION ALL — Combine Without Deduplication</h3>
<p><code>UNION ALL</code> is faster because it skips the deduplication step. Use it when you know there won't be duplicates or don't care.</p>`},{type:"sandbox",description:"Combine employee cities with customer cities:",defaultQuery:`-- All unique cities from both employees (via departments) and customers
SELECT d.location AS city, 'Office' AS source
FROM departments d
UNION
SELECT c.city, 'Customer'
FROM customers c
ORDER BY city;`},{type:"callout",calloutType:"warning",html:"<strong>Rules</strong>: Both queries in a UNION must have the same number of columns, and the columns must have compatible types. Column names come from the first query."},{type:"text",html:`<h3>INTERSECT and EXCEPT</h3>
<p><code>INTERSECT</code> returns rows that appear in <strong>both</strong> queries. <code>EXCEPT</code> returns rows in the first query that are <strong>not</strong> in the second.</p>`},{type:"sandbox",description:"Cities where we have both offices and customers:",defaultQuery:`SELECT location AS city FROM departments
INTERSECT
SELECT city FROM customers
ORDER BY city;`},{type:"sandbox",description:"Customer cities where we have NO office:",defaultQuery:`SELECT DISTINCT city FROM customers
EXCEPT
SELECT location FROM departments
ORDER BY city;`}]},{id:5,moduleId:9,title:"Views",slug:"views",content:[{type:"text",html:`<h2>Views — Saved Queries</h2>
<p>A <code>VIEW</code> is a named, saved query that acts like a virtual table. It doesn't store data — it runs the underlying query each time you select from it.</p>`},{type:"code",title:"Creating a view",sql:`CREATE VIEW employee_details AS
SELECT
  e.id, e.name, e.salary,
  d.name AS department, d.location
FROM employees e
JOIN departments d ON e.department_id = d.id;

-- Now use it like a table:
SELECT * FROM employee_details WHERE department = 'Engineering';`},{type:"sandbox",description:"Create and query a view:",defaultQuery:`CREATE VIEW dept_summary AS
SELECT
  d.id, d.name,
  COUNT(e.id) AS headcount,
  ROUND(AVG(e.salary), 0) AS avg_salary,
  SUM(e.salary) AS total_salary
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name;

SELECT * FROM dept_summary ORDER BY headcount DESC;`},{type:"text",html:`<h3>When to Use Views</h3>
<ul>
<li><strong>Simplify complex queries</strong> — wrap a 10-line JOIN into a simple table name</li>
<li><strong>Security</strong> — expose only certain columns to specific users</li>
<li><strong>Consistency</strong> — ensure everyone uses the same business logic</li>
<li><strong>Don't use for performance</strong> — views aren't materialized in MySQL (no caching)</li>
</ul>`},{type:"callout",calloutType:"mysql",html:"MySQL views are not materialized — they re-execute the underlying query each time. For cached/precomputed results, use a materialized view pattern: a real table + a scheduled refresh query or trigger."}]},{id:6,moduleId:9,title:"MySQL JSON Functions",slug:"json-functions",content:[{type:"text",html:`<h2>JSON in MySQL</h2>
<p>MySQL 5.7+ has a native <code>JSON</code> data type with built-in functions for querying and manipulating JSON data. This lets you combine relational and document-style storage.</p>`},{type:"code",title:"MySQL JSON syntax (reference)",sql:`-- MySQL JSON column and queries:
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data JSON NOT NULL
);

INSERT INTO events (data) VALUES ('{"type":"click","page":"/home","user_id":42}');

-- Extract values:
SELECT data->>'$.type' AS event_type,       -- ->> extracts as text
       data->'$.user_id' AS uid             -- -> extracts as JSON
FROM events;

-- Search in JSON:
SELECT * FROM events
WHERE JSON_EXTRACT(data, '$.type') = '"click"';

-- Useful functions:
-- JSON_EXTRACT(doc, '$.key')
-- JSON_SET(doc, '$.key', value)
-- JSON_ARRAY_LENGTH(doc->'$.items')
-- JSON_CONTAINS(doc, '"value"', '$.tags')`},{type:"sandbox",description:"Our sandbox uses SQLite JSON (similar syntax):",defaultQuery:`-- SQLite JSON works similarly to MySQL
SELECT
  json_object('name', name, 'salary', salary, 'dept', department_id) AS employee_json
FROM employees
LIMIT 5;`},{type:"callout",calloutType:"mysql",html:"<strong>When to use JSON</strong>: For flexible/variable attributes (settings, metadata, event payloads). <strong>Don't use</strong> for data you'll frequently filter/join on — relational columns with indexes are much faster for that."}]},{id:7,moduleId:9,title:"Stored Procedures & Triggers",slug:"stored-procedures",content:[{type:"text",html:`<h2>Stored Procedures</h2>
<p>A <strong>stored procedure</strong> is a saved block of SQL that runs on the server. Call it by name instead of sending raw SQL from your application.</p>`},{type:"code",title:"MySQL stored procedure",sql:`DELIMITER //
CREATE PROCEDURE give_raise(
  IN dept_id INT,
  IN raise_pct DECIMAL(5,2)
)
BEGIN
  UPDATE employees
  SET salary = salary * (1 + raise_pct / 100)
  WHERE department_id = dept_id;

  SELECT CONCAT('Raise applied: ', raise_pct, '% to dept ', dept_id) AS result;
END //
DELIMITER ;

-- Call it:
CALL give_raise(1, 10);  -- 10% raise for Engineering`},{type:"text",html:`<h3>Triggers</h3>
<p>A <strong>trigger</strong> runs automatically before or after INSERT, UPDATE, or DELETE on a table.</p>`},{type:"code",title:"MySQL trigger",sql:`CREATE TRIGGER before_order_delete
BEFORE DELETE ON orders
FOR EACH ROW
BEGIN
  INSERT INTO order_audit (order_id, action, deleted_at)
  VALUES (OLD.id, 'DELETE', NOW());
END;`},{type:"text",html:`<h3>Stored Functions</h3>
<p>Like procedures but return a single value. Can be used inside SELECT:</p>`},{type:"code",title:"MySQL function",sql:`CREATE FUNCTION tax_amount(price DECIMAL(10,2))
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
  RETURN price * 0.21;  -- 21% VAT
END;

-- Use in queries:
SELECT name, price, tax_amount(price) AS tax
FROM products;`},{type:"callout",calloutType:"warning",html:"<strong>Stored procedures are controversial</strong>: They move business logic into the database, making it harder to version control, test, and deploy. Many modern teams prefer keeping logic in application code. Use them for performance-critical operations that need to minimize network round-trips."}]},{id:8,moduleId:9,title:"Permissions & Security",slug:"permissions",content:[{type:"text",html:`<h2>MySQL Users & Permissions</h2>
<p>MySQL has a built-in permission system. Each user can be granted specific privileges on specific databases, tables, or even columns.</p>`},{type:"code",title:"User management",sql:`-- Create a user
CREATE USER 'app_user'@'%' IDENTIFIED BY 'secure_password';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON mydb.* TO 'app_user'@'%';

-- Read-only user
GRANT SELECT ON mydb.* TO 'readonly'@'10.0.0.%';

-- Revoke permissions
REVOKE DELETE ON mydb.* FROM 'app_user'@'%';

-- Show grants
SHOW GRANTS FOR 'app_user'@'%';`},{type:"text",html:`<h3>Permission Best Practices</h3>
<ul>
<li><strong>Least privilege</strong> — only grant what's needed. App users don't need DROP or ALTER.</li>
<li><strong>Separate users</strong> — different users for app, admin, backup, monitoring.</li>
<li><strong>Host restrictions</strong> — <code>'app'@'10.0.0.%'</code> limits connections to your network.</li>
<li><strong>No root for apps</strong> — never connect your application as root.</li>
<li><strong>Audit</strong> — use the MySQL audit plugin in production.</li>
</ul>`},{type:"callout",calloutType:"mysql",html:"Common permission levels: <code>ALL PRIVILEGES</code> (everything), <code>SELECT</code> (read), <code>INSERT/UPDATE/DELETE</code> (write), <code>CREATE/ALTER/DROP</code> (DDL), <code>GRANT OPTION</code> (can grant to others). Use <code>FLUSH PRIVILEGES</code> after direct grants table edits."}]},{id:9,moduleId:9,title:"Pivoting Data",slug:"pivoting",content:[{type:"text",html:`<h2>Pivoting — Rows to Columns</h2>
<p>Pivoting transforms row-level data into a columnar summary. MySQL doesn't have a <code>PIVOT</code> keyword (SQL Server does), so you use <code>CASE</code> inside aggregate functions — a technique you already know from Module 3!</p>`},{type:"sandbox",description:"Pivot order counts by status:",defaultQuery:`-- Each status becomes a column
SELECT
  SUBSTR(order_date, 1, 4) AS year,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered,
  COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled,
  COUNT(*) AS total
FROM orders
GROUP BY SUBSTR(order_date, 1, 4)
ORDER BY year;`},{type:"text",html:`<h3>Revenue Pivot by Category</h3>
<p>Pivoting is essential for creating management reports and dashboards:</p>`},{type:"sandbox",description:"Revenue by category per year:",defaultQuery:`SELECT
  SUBSTR(o.order_date, 1, 4) AS year,
  ROUND(SUM(CASE WHEN p.category = 'Electronics' THEN oi.quantity * oi.unit_price ELSE 0 END), 0) AS electronics,
  ROUND(SUM(CASE WHEN p.category = 'Books' THEN oi.quantity * oi.unit_price ELSE 0 END), 0) AS books,
  ROUND(SUM(CASE WHEN p.category = 'Home' THEN oi.quantity * oi.unit_price ELSE 0 END), 0) AS home,
  ROUND(SUM(CASE WHEN p.category = 'Sports' THEN oi.quantity * oi.unit_price ELSE 0 END), 0) AS sports,
  ROUND(SUM(oi.quantity * oi.unit_price), 0) AS total
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
WHERE o.status != 'cancelled'
GROUP BY SUBSTR(o.order_date, 1, 4)
ORDER BY year;`},{type:"text",html:`<h3>Unpivoting — Columns to Rows</h3>
<p>The reverse of pivoting. Convert columnar data back to rows using UNION ALL:</p>`},{type:"code",title:"Unpivot pattern",sql:`-- Turn columns back into rows
SELECT name, 'budget' AS metric, budget AS value FROM departments
UNION ALL
SELECT name, 'location', location FROM departments
ORDER BY name;`},{type:"callout",calloutType:"mysql",html:"<strong>SQL Server</strong> has native <code>PIVOT</code> and <code>UNPIVOT</code> operators. MySQL and PostgreSQL use the CASE-based approach shown here. The result is identical — MySQL's approach is just more verbose."}]}],exercises:[{id:1,moduleId:9,title:"Salary Rank Per Department",description:"<p>Rank all employees by salary within their department (highest first). Show <code>name</code>, <code>department_id</code>, <code>salary</code>, and <code>salary_rank</code> using <code>RANK()</code>. Only show departments 1 and 3. Order by department_id, then rank.</p>",difficulty:"medium",starterQuery:`-- Rank employees by salary within department
`,expectedQuery:"SELECT name, department_id, salary, RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS salary_rank FROM employees WHERE department_id IN (1, 3) ORDER BY department_id, salary_rank;",expectedResult:{columns:["name","department_id","salary","salary_rank"],values:[["Alice Johnson",1,12e4,1],["Hugo Edwards",1,118e3,2],["Bob Smith",1,115e3,3],["Xavier Wright",1,112e3,4],["Nathan Cook",1,108e3,5],["Carol Davis",1,105e3,6],["Vera Richardson",1,1e5,7],["Wendy King",1,98e3,8],["Amy Baker",1,95e3,9],["Henry Taylor",3,95e3,1],["Frank Brown",3,92e3,2],["Maya Reed",3,91e3,3],["Zach Green",3,9e4,4],["Grace Lee",3,88e3,5],["Chloe Turner",3,87e3,6],["Will Cox",3,86e3,7]]},hints:["Use RANK() OVER (PARTITION BY department_id ORDER BY salary DESC)","Filter departments with WHERE, not in the window function","SELECT name, department_id, salary, RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS salary_rank FROM employees WHERE department_id IN (1, 3) ORDER BY department_id, salary_rank;"],validationMode:"exact"},{id:2,moduleId:9,title:"Top 2 Per Department",description:"<p>Find the <strong>top 2 highest-paid employees in each department</strong>. Show <code>name</code>, <code>department_id</code>, <code>salary</code>. Use ROW_NUMBER in a CTE. Order by department_id, salary desc.</p>",difficulty:"hard",starterQuery:`-- Top 2 per department using ROW_NUMBER
WITH ranked AS (
`,expectedQuery:"WITH ranked AS (SELECT name, department_id, salary, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn FROM employees) SELECT name, department_id, salary FROM ranked WHERE rn <= 2 ORDER BY department_id, salary DESC;",expectedResult:{columns:["name","department_id","salary"],values:[["Alice Johnson",1,12e4],["Hugo Edwards",1,118e3],["David Wilson",2,85e3],["Yara Scott",2,82e3],["Henry Taylor",3,95e3],["Frank Brown",3,92e3],["Iris Chen",4,72e3],["James Stewart",4,7e4],["Kate Thomas",5,11e4],["Brian Adams",5,105e3],["Mia Jackson",6,75e3],["Felix Parker",6,73e3],["Olivia Harris",7,65e3],["Gina Evans",7,64e3],["Quinn Lewis",8,13e4],["Rachel Robinson",8,125e3],["Sam Walker",9,108e3],["Leo Rogers",9,105e3],["Uma Allen",10,9e4],["Isla Collins",10,88e3]]},hints:["ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn","Put it in a CTE, then WHERE rn <= 2","WITH ranked AS (SELECT name, department_id, salary, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rn FROM employees) SELECT name, department_id, salary FROM ranked WHERE rn <= 2 ORDER BY department_id, salary DESC;"],validationMode:"exact"},{id:3,moduleId:9,title:"Running Revenue Total",description:"<p>Show delivered orders with a <strong>running total</strong> of revenue. Columns: <code>order_date</code>, <code>total</code>, <code>running_total</code>. Order by order_date.</p>",difficulty:"medium",starterQuery:`-- Running total of delivered order revenue
`,expectedQuery:"SELECT order_date, total, SUM(total) OVER (ORDER BY order_date) AS running_total FROM orders WHERE status = 'delivered' ORDER BY order_date;",expectedResult:{columns:["order_date","total","running_total"],values:[["2023-01-15",1329.98,1329.98],["2023-01-20",79.98,1409.96],["2023-02-10",449.99,1859.95],["2023-02-28",89.99,1949.94],["2023-03-15",154.98,2104.92],["2023-04-01",599.99,2704.91],["2023-04-20",39.99,2744.9],["2023-05-10",1749.98,4494.88],["2023-05-25",119.99,4614.87],["2023-06-15",94.98,4709.85],["2023-07-01",479.98,5189.83],["2023-07-20",59.98,5249.81],["2023-08-05",399.99,5649.8],["2023-08-25",84.98,5734.78],["2023-09-10",1299.99,7034.77],["2023-10-01",179.98,7214.75],["2023-10-20",54.99,7269.74],["2024-06-01",179.98,7449.72],["2024-06-15",45.99,7495.71],["2024-07-01",99.98,7595.69],["2024-07-15",54.99,7650.68]]},hints:["SUM(total) OVER (ORDER BY order_date) creates a running total","Filter with WHERE status = 'delivered'","SELECT order_date, total, SUM(total) OVER (ORDER BY order_date) AS running_total FROM orders WHERE status = 'delivered' ORDER BY order_date;"],validationMode:"exact"},{id:4,moduleId:9,title:"UNION: All Locations",description:'<p>Combine department <code>location</code>s and customer <code>city</code>s into one list of unique cities. Show columns <code>city</code> and <code>source</code> ("Office" or "Customer"). Sort by city.</p>',difficulty:"easy",starterQuery:`-- All unique locations from offices and customers
`,expectedQuery:"SELECT location AS city, 'Office' AS source FROM departments UNION SELECT city, 'Customer' FROM customers ORDER BY city;",expectedResult:{columns:["city","source"],values:[["Berlin","Office"],["Berlin","Customer"],["Boston","Customer"],["Dubai","Customer"],["London","Office"],["London","Customer"],["Madrid","Office"],["Madrid","Customer"],["New York","Office"],["New York","Customer"],["Paris","Office"],["Paris","Customer"],["Shanghai","Customer"],["Singapore","Office"],["Singapore","Customer"],["Stockholm","Office"],["Stockholm","Customer"],["Sydney","Office"],["Sydney","Customer"],["Tokyo","Office"],["Tokyo","Customer"],["Toronto","Office"],["Toronto","Customer"],["Zurich","Customer"]]},hints:["First SELECT: location AS city, 'Office' AS source FROM departments","UNION combines and deduplicates","SELECT location AS city, 'Office' AS source FROM departments UNION SELECT city, 'Customer' FROM customers ORDER BY city;"],validationMode:"unordered"},{id:5,moduleId:9,title:"Create and Query a View",description:"<p>Create a view called <code>order_summary</code> that shows each order with customer name, item count, and total. Then query it for orders over $500. Show <code>customer</code>, <code>item_count</code>, <code>total</code>.</p>",difficulty:"medium",starterQuery:`-- Create order_summary view, then query it
`,expectedQuery:"CREATE VIEW order_summary AS SELECT o.id, c.name AS customer, COUNT(oi.id) AS item_count, o.total FROM orders o INNER JOIN customers c ON o.customer_id = c.id INNER JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id, c.name, o.total; SELECT customer, item_count, total FROM order_summary WHERE total > 500 ORDER BY total DESC;",expectedResult:{columns:["customer","item_count","total"],values:[["Pacific Trading",2,1749.98],["Acme Corp",2,1329.98],["Velocity Labs",1,1299.99],["Coral Systems",1,1299.99],["CloudNine Ltd",1,1299.99],["Pinnacle Group",3,629.98],["CloudNine Ltd",1,599.99],["Horizon Media",1,599.99]]},hints:["CREATE VIEW order_summary AS SELECT ... with JOINs","Join orders → customers → order_items, GROUP BY order","Then SELECT from order_summary WHERE total > 500"],validationMode:"exact"},{id:6,moduleId:9,title:"Previous Order Comparison",description:"<p>For each delivered order, show the <code>order_date</code>, <code>total</code>, and the <strong>previous order total</strong> (using LAG). Name it <code>prev_total</code>. Order by order_date. Limit to 10.</p>",difficulty:"medium",starterQuery:`-- Compare each order to the previous one
`,expectedQuery:"SELECT order_date, total, LAG(total, 1) OVER (ORDER BY order_date) AS prev_total FROM orders WHERE status = 'delivered' ORDER BY order_date LIMIT 10;",expectedResult:{columns:["order_date","total","prev_total"],values:[["2023-01-15",1329.98,null],["2023-01-20",79.98,1329.98],["2023-02-10",449.99,79.98],["2023-02-28",89.99,449.99],["2023-03-15",154.98,89.99],["2023-04-01",599.99,154.98],["2023-04-20",39.99,599.99],["2023-05-10",1749.98,39.99],["2023-05-25",119.99,1749.98],["2023-06-15",94.98,119.99]]},hints:["LAG(total, 1) OVER (ORDER BY order_date) gets the previous row value","Filter with WHERE status = 'delivered'","SELECT order_date, total, LAG(total, 1) OVER (ORDER BY order_date) AS prev_total FROM orders WHERE status = 'delivered' ORDER BY order_date LIMIT 10;"],validationMode:"exact"},{id:7,moduleId:9,title:"Pivot: Orders by Year & Status",description:"<p>Create a pivot table showing <strong>order counts by year and status</strong>. Columns: <code>year</code>, <code>delivered</code>, <code>shipped</code>, <code>pending</code>, <code>cancelled</code>. Use SUBSTR(order_date, 1, 4) for year. Order by year.</p>",difficulty:"hard",starterQuery:`-- Pivot order counts by year and status
SELECT
  SUBSTR(order_date, 1, 4) AS year,
`,expectedQuery:"SELECT SUBSTR(order_date, 1, 4) AS year, COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered, COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped, COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending, COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled FROM orders GROUP BY SUBSTR(order_date, 1, 4) ORDER BY year;",expectedResult:{columns:["year","delivered","shipped","pending","cancelled"],values:[["2023",17,4,0,0],["2024",4,5,7,3]]},hints:["COUNT(CASE WHEN status = 'delivered' THEN 1 END) for each status column","GROUP BY SUBSTR(order_date, 1, 4) groups by year","SELECT SUBSTR(order_date, 1, 4) AS year, COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered, COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shipped, COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending, COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled FROM orders GROUP BY SUBSTR(order_date, 1, 4) ORDER BY year;"],validationMode:"exact"},{id:8,moduleId:9,title:"Create a High Earners View",description:"<p>Create a view called <code>high_earners</code> that contains employees with salary > $100,000. Include <code>name</code>, <code>salary</code>, <code>department_id</code>. Then SELECT <code>name</code> and <code>salary</code> from the view, ordered by salary descending.</p>",difficulty:"medium",starterQuery:`-- Create and query high_earners view
`,expectedQuery:"CREATE VIEW high_earners AS SELECT name, salary, department_id FROM employees WHERE salary > 100000; SELECT name, salary FROM high_earners ORDER BY salary DESC;",expectedResult:{columns:["name","salary"],values:[["Quinn Lewis",13e4],["Rachel Robinson",125e3],["Alice Johnson",12e4],["Rosa Murphy",12e4],["Hugo Edwards",118e3],["Bob Smith",115e3],["Xavier Wright",112e3],["Kate Thomas",11e4],["Sam Walker",108e3],["Nathan Cook",108e3],["Carol Davis",105e3],["Brian Adams",105e3],["Leo Rogers",105e3],["Tina Hall",102e3]]},hints:["CREATE VIEW high_earners AS SELECT ... FROM employees WHERE salary > 100000","Then SELECT name, salary FROM high_earners ORDER BY salary DESC","CREATE VIEW high_earners AS SELECT name, salary, department_id FROM employees WHERE salary > 100000; SELECT name, salary FROM high_earners ORDER BY salary DESC;"],validationMode:"exact"},{id:9,moduleId:9,title:"INTERSECT: Shared Cities",description:"<p>Find cities where we have <strong>both</strong> a department office AND a customer. Use <code>INTERSECT</code>. Show the column as <code>city</code>. Order alphabetically.</p>",difficulty:"easy",starterQuery:`-- Cities with both offices and customers
`,expectedQuery:"SELECT location AS city FROM departments INTERSECT SELECT city FROM customers ORDER BY city;",expectedResult:{columns:["city"],values:[["Berlin"],["London"],["Madrid"],["New York"],["Paris"],["Singapore"],["Sydney"],["Tokyo"],["Toronto"]]},hints:["INTERSECT returns rows that appear in both queries","First: SELECT location AS city FROM departments","SELECT location AS city FROM departments INTERSECT SELECT city FROM customers ORDER BY city;"],validationMode:"exact"},{id:10,moduleId:9,title:"Salary Quartiles with NTILE",description:"<p>Divide all employees into <strong>4 salary quartiles</strong> (highest salary = quartile 1). Show <code>name</code>, <code>salary</code>, <code>quartile</code>. Use NTILE(4). Order by salary descending, limit to 12.</p>",difficulty:"medium",starterQuery:`-- Salary quartiles
`,expectedQuery:"SELECT name, salary, NTILE(4) OVER (ORDER BY salary DESC) AS quartile FROM employees ORDER BY salary DESC LIMIT 12;",expectedResult:{columns:["name","salary","quartile"],values:[["Quinn Lewis",13e4,1],["Rachel Robinson",125e3,1],["Alice Johnson",12e4,1],["Rosa Murphy",12e4,1],["Hugo Edwards",118e3,1],["Bob Smith",115e3,1],["Xavier Wright",112e3,1],["Kate Thomas",11e4,1],["Sam Walker",108e3,1],["Nathan Cook",108e3,1],["Carol Davis",105e3,1],["Brian Adams",105e3,1]]},hints:["NTILE(4) OVER (ORDER BY salary DESC) splits into 4 equal groups","The highest salaries get quartile 1","SELECT name, salary, NTILE(4) OVER (ORDER BY salary DESC) AS quartile FROM employees ORDER BY salary DESC LIMIT 12;"],validationMode:"exact"}]},Cc={id:10,title:"SQL Injection & Best Practices",slug:"sql-injection",description:"SQL injection attacks, parameterized queries, prepared statements, and security best practices for production.",icon:"Shield",color:"#C0392B",lessons:[{id:1,moduleId:10,title:"What is SQL Injection?",slug:"sql-injection-intro",content:[{type:"text",html:`<h2>SQL Injection — The #1 Web Security Vulnerability</h2>
<p>SQL injection (SQLi) happens when user input is inserted directly into a SQL query string, allowing an attacker to modify the query's logic. It's been the #1 web application vulnerability for over two decades.</p>
<h3>How It Works</h3>
<p>Imagine a login form that builds a query like this:</p>`},{type:"code",title:"Vulnerable code (NEVER do this)",sql:`-- Backend code builds this query from user input:
-- username = "admin"
-- password = "' OR '1'='1"

SELECT * FROM users
WHERE username = 'admin'
AND password = '' OR '1'='1';

-- The OR '1'='1' is always true!
-- Attacker logs in without knowing the password.`},{type:"text",html:`<h3>What Attackers Can Do</h3>
<ul>
<li><strong>Bypass authentication</strong> — log in as any user</li>
<li><strong>Read all data</strong> — dump entire tables (UNION-based injection)</li>
<li><strong>Modify data</strong> — UPDATE/DELETE records</li>
<li><strong>Drop tables</strong> — destroy data completely</li>
<li><strong>Execute system commands</strong> — in some configurations</li>
</ul>`},{type:"sandbox",description:"See how injection works — the second query bypasses the password check:",defaultQuery:`-- Normal query: checks both username and password
SELECT * FROM employees WHERE name = 'Alice Johnson' AND department_id = 1;

-- Injected: the OR 1=1 makes it return ALL rows
SELECT * FROM employees WHERE name = 'Alice Johnson' OR 1=1;`},{type:"callout",calloutType:"warning",html:"<strong>Real-world impact</strong>: SQL injection has caused massive breaches — Yahoo (3 billion accounts), Equifax (147 million), Sony, LinkedIn, and thousands more. It's preventable with parameterized queries."}]},{id:2,moduleId:10,title:"Preventing SQL Injection",slug:"preventing-injection",content:[{type:"text",html:`<h2>The Fix: Parameterized Queries</h2>
<p>Never concatenate user input into SQL strings. Use <strong>parameterized queries</strong> (also called prepared statements) where user input is passed as parameters, not embedded in the SQL text.</p>`},{type:"comparison",left:{title:"VULNERABLE (string concatenation)",content:`<pre>query = "SELECT * FROM users WHERE name = '" + username + "'";</pre><br>User input becomes part of the SQL syntax.`},right:{title:"SAFE (parameterized query)",content:`<pre>query = "SELECT * FROM users WHERE name = ?";
db.execute(query, [username]);</pre><br>User input is always treated as data, never SQL.`}},{type:"code",title:"Parameterized queries in different languages",sql:`-- MySQL Prepared Statement (native SQL)
PREPARE stmt FROM 'SELECT * FROM users WHERE email = ?';
SET @email = 'user@example.com';
EXECUTE stmt USING @email;

-- Python (mysql-connector)
-- cursor.execute("SELECT * FROM users WHERE email = %s", (email,))

-- Node.js (mysql2)
-- connection.execute("SELECT * FROM users WHERE email = ?", [email])

-- PHP (PDO)
-- $stmt = $pdo->prepare("SELECT * FROM users WHERE email = :email");
-- $stmt->execute(['email' => $email]);

-- Java (JDBC)
-- PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE email = ?");
-- ps.setString(1, email);`},{type:"callout",calloutType:"tip",html:"<strong>Rule of thumb</strong>: If you see string concatenation building a SQL query in any codebase, it's almost certainly a security vulnerability. Parameterized queries are the only reliable defense."},{type:"text",html:`<h3>Additional Defenses (Defense in Depth)</h3>
<ul>
<li><strong>Input validation</strong> — reject unexpected characters (but don't rely on this alone)</li>
<li><strong>Least privilege</strong> — app database user should only have SELECT/INSERT/UPDATE, never DROP or ALTER</li>
<li><strong>WAF</strong> — Web Application Firewall can block common injection patterns</li>
<li><strong>ORM</strong> — Object-Relational Mappers (like SQLAlchemy, Hibernate, Eloquent) use parameterized queries by default</li>
<li><strong>Escape output</strong> — even if data is compromised, escape it when displaying (prevents XSS)</li>
</ul>`}]},{id:3,moduleId:10,title:"Production SQL Best Practices",slug:"best-practices",content:[{type:"text",html:`<h2>Writing Production-Quality SQL</h2>
<h3>1. Always Use Transactions for Multi-Statement Operations</h3>
<p>If your operation involves multiple INSERTs or UPDATEs that must succeed together, wrap them in a transaction.</p>

<h3>2. Test WHERE Before UPDATE/DELETE</h3>
<p>Run a SELECT with the same WHERE clause first. Verify it returns the rows you expect before running the destructive statement.</p>`},{type:"code",title:"Safe UPDATE pattern",sql:`-- Step 1: Verify what will be affected
SELECT id, name, salary FROM employees WHERE department_id = 3;
-- Check: is this the right set of rows?

-- Step 2: Run the UPDATE
UPDATE employees SET salary = salary * 1.1 WHERE department_id = 3;

-- Step 3: Verify the result
SELECT id, name, salary FROM employees WHERE department_id = 3;`},{type:"text",html:`<h3>3. Use LIMIT with DELETE</h3>
<p>When deleting many rows, use LIMIT to batch the operation. This prevents long-running locks:</p>`},{type:"code",title:"Batched DELETE",sql:`-- Delete in batches of 1000 to avoid locking the table
DELETE FROM logs WHERE created_at < '2023-01-01' LIMIT 1000;
-- Repeat until 0 rows affected`},{type:"text",html:`<h3>4. Never SELECT * in Production Code</h3>
<p>Always name your columns. <code>SELECT *</code> is slow (reads unnecessary data), fragile (breaks if columns are added/removed), and unclear (what columns does this query return?).</p>

<h3>5. Add Indexes Before They're Needed</h3>
<p>Index columns you filter (<code>WHERE</code>), join (<code>ON</code>), or sort (<code>ORDER BY</code>) by. Adding an index to a large production table can take minutes to hours.</p>

<h3>6. Monitor Slow Queries</h3>`},{type:"code",title:"MySQL slow query log",sql:`-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Log queries over 1 second

-- Find slow queries
-- Check /var/lib/mysql/hostname-slow.log
-- Or use: SHOW FULL PROCESSLIST;`},{type:"callout",calloutType:"tip",html:'Use our <a href="/tools/explain/">MySQL EXPLAIN Analyzer</a> to find performance issues before they hit production. Paste your EXPLAIN output and get automatic optimization recommendations.'}]},{id:4,moduleId:10,title:"Backup & Recovery",slug:"backup-recovery",content:[{type:"text",html:`<h2>Protecting Your Data</h2>
<h3>MySQL Backup Methods</h3>
<ul>
<li><strong>mysqldump</strong> — logical backup (SQL statements). Simple, portable, slow on large databases.</li>
<li><strong>MySQL Enterprise Backup / Percona XtraBackup</strong> — physical backup (copy data files). Fast, supports hot backups.</li>
<li><strong>Replication</strong> — real-time copy to a secondary server. Not a backup (deletes replicate too!).</li>
<li><strong>Point-in-time recovery</strong> — binary logs let you replay transactions to any point.</li>
</ul>`},{type:"code",title:"mysqldump basics",sql:`-- Backup a single database
-- $ mysqldump -u root -p mydb > backup.sql

-- Backup all databases
-- $ mysqldump -u root -p --all-databases > full_backup.sql

-- Backup with compression
-- $ mysqldump -u root -p mydb | gzip > backup.sql.gz

-- Restore
-- $ mysql -u root -p mydb < backup.sql`},{type:"text",html:`<h3>Backup Best Practices</h3>
<ul>
<li><strong>Test your restores</strong> — a backup you've never restored is not a backup</li>
<li><strong>Automate</strong> — schedule backups with cron, never rely on manual runs</li>
<li><strong>3-2-1 rule</strong> — 3 copies, 2 different media, 1 offsite</li>
<li><strong>Monitor</strong> — alert if backups fail or are older than expected</li>
<li><strong>Encrypt</strong> — especially for offsite/cloud backups</li>
</ul>`},{type:"callout",calloutType:"mysql",html:'<strong>Need help with MySQL backups?</strong> ReliaDB provides automated backup solutions, replication setup, and disaster recovery planning. <a href="/contact.html">Book a free assessment</a>.'}]}],exercises:[{id:1,moduleId:10,title:"Spot the Injection",description:"<p>This query is vulnerable to SQL injection: <code>SELECT * FROM employees WHERE name = '&lt;input&gt;'</code>. If the input is <code>' OR 1=1 --</code>, the attacker bypasses the filter. Run the pre-filled query to see what happens.</p>",difficulty:"easy",starterQuery:`-- Run the injected query to see the damage
SELECT * FROM employees WHERE name = '' OR 1=1;`,expectedQuery:"SELECT * FROM employees WHERE name = '' OR 1=1;",expectedResult:{columns:["id","name","email","department_id","salary","hire_date","manager_id"],values:[]},hints:["The injected query returns ALL employees because OR 1=1 is always true","Just run the pre-filled query to see the result","SELECT * FROM employees WHERE name = '' OR 1=1;"],validationMode:"contains"},{id:2,moduleId:10,title:"Safe UPDATE Pattern",description:"<p>Practice the safe UPDATE pattern: first SELECT to verify, then UPDATE. Give all <strong>Design department (id=10)</strong> employees a <strong>$5,000 raise</strong>. Show the <code>name</code> and new <code>salary</code> after the update.</p>",difficulty:"medium",starterQuery:`-- Step 1: Verify (run this first to check)
-- SELECT name, salary FROM employees WHERE department_id = 10;

-- Step 2: Update
UPDATE employees SET salary = salary + 5000 WHERE department_id = 10;

-- Step 3: Verify result
SELECT name, salary FROM employees WHERE department_id = 10;`,expectedQuery:"UPDATE employees SET salary = salary + 5000 WHERE department_id = 10; SELECT name, salary FROM employees WHERE department_id = 10;",expectedResult:{columns:["name","salary"],values:[["Uma Allen",95e3],["Victor Young",9e4],["Isla Collins",93e3],["Tara Rivera",92e3]]},hints:["UPDATE employees SET salary = salary + 5000 WHERE department_id = 10","Follow with SELECT to verify the results","UPDATE employees SET salary = salary + 5000 WHERE department_id = 10; SELECT name, salary FROM employees WHERE department_id = 10;"],validationMode:"unordered"},{id:3,moduleId:10,title:"Delete with Verification",description:"<p>Practice safe deletion: delete all <strong>cancelled orders</strong> and their order items. First delete the order_items (FK dependency), then the orders. Finally, show the remaining order count as <code>remaining_orders</code>.</p>",difficulty:"medium",starterQuery:`-- Safe delete: items first, then orders
`,expectedQuery:"DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled'); DELETE FROM orders WHERE status = 'cancelled'; SELECT COUNT(*) AS remaining_orders FROM orders;",expectedResult:{columns:["remaining_orders"],values:[[37]]},hints:["Delete order_items first because they reference orders (FK)","WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled')","DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE status = 'cancelled'); DELETE FROM orders WHERE status = 'cancelled'; SELECT COUNT(*) AS remaining_orders FROM orders;"],validationMode:"exact"},{id:4,moduleId:10,title:"Transaction Rollback",description:"<p>Start a transaction, set Engineering (id=1) budget to <strong>$0</strong>, then <strong>ROLLBACK</strong>. Verify the budget is still $1,500,000. Show <code>budget</code> from departments where id=1.</p>",difficulty:"medium",starterQuery:`-- Transaction with rollback
`,expectedQuery:"BEGIN TRANSACTION; UPDATE departments SET budget = 0 WHERE id = 1; ROLLBACK; SELECT budget FROM departments WHERE id = 1;",expectedResult:{columns:["budget"],values:[[15e5]]},hints:["BEGIN TRANSACTION starts, ROLLBACK undoes all changes","After ROLLBACK, the budget should be unchanged","BEGIN TRANSACTION; UPDATE departments SET budget = 0 WHERE id = 1; ROLLBACK; SELECT budget FROM departments WHERE id = 1;"],validationMode:"exact"},{id:5,moduleId:10,title:"Verify Before DELETE",description:"<p>Practice the safe pattern: first run a SELECT to check which rows will be affected, then run the DELETE. Delete employees from the <strong>Support department (id=7)</strong> who earn <strong>less than $65,000</strong>. Show the remaining Support employees (<code>name</code> and <code>salary</code>).</p>",difficulty:"hard",starterQuery:`-- Step 1: Check what will be deleted
-- SELECT name, salary FROM employees WHERE department_id = 7 AND salary < 65000;

-- Step 2: Delete
`,expectedQuery:"DELETE FROM employees WHERE department_id = 7 AND salary < 65000; SELECT name, salary FROM employees WHERE department_id = 7 ORDER BY salary DESC;",expectedResult:{columns:["name","salary"],values:[["Olivia Harris",65e3]]},hints:["DELETE FROM employees WHERE department_id = 7 AND salary < 65000","Peter Clark ($62K), Steve Bailey ($63K), and Gina Evans ($64K) should be deleted","DELETE FROM employees WHERE department_id = 7 AND salary < 65000; SELECT name, salary FROM employees WHERE department_id = 7 ORDER BY salary DESC;"],validationMode:"exact"}]},to=[Sc,Tc,Rc,Nc,Oc,Ic,Lc,Ac,_c,Cc],wi="reliadb-training-progress";function bc(){return new Date().toISOString().split("T")[0]}function Fn(){return{completedLessons:{},completedExercises:{},currentModule:1,currentLesson:"",streakDays:0,lastActiveDate:""}}function vc(){try{const e=localStorage.getItem(wi);if(e)return{...Fn(),...JSON.parse(e)}}catch{}return Fn()}function wc(e){try{localStorage.setItem(wi,JSON.stringify(e))}catch{}}const se=ft(vc());ao(se,e=>wc(e),{deep:!0});function ar(){function e(d,u){const E=`m${d}-l${u}`;se.value.completedLessons[E]=!0,se.value.currentModule=d,se.value.currentLesson=E,a()}function t(d,u){return!!se.value.completedLessons[`m${d}-l${u}`]}function o(d,u,E,f,O){const T=`m${d}-e${u}`,x=se.value.completedExercises[T];x?(x.attempts++,x.hintsUsed=Math.max(x.hintsUsed,f),E&&!x.completed&&(x.completed=!0,x.completedAt=new Date().toISOString()),O&&(x.showedSolution=!0)):se.value.completedExercises[T]={completed:E,attempts:1,hintsUsed:f,showedSolution:O,completedAt:E?new Date().toISOString():void 0},a()}function n(d,u){var f;const E=`m${d}-e${u}`;return!!((f=se.value.completedExercises[E])!=null&&f.completed)}function r(d,u){const E=`m${d}-e${u}`;return se.value.completedExercises[E]||null}function s(d,u,E){let f=0;const O=u+E;for(let T=1;T<=u;T++)t(d,T)&&f++;for(let T=1;T<=E;T++)n(d,T)&&f++;return{completed:f,total:O,percent:O>0?Math.round(f/O*100):0}}function i(d){let u=0,E=0;for(const f of d){const O=s(f.id,f.lessonCount,f.exerciseCount);u+=O.completed,E+=O.total}return{completed:u,total:E,percent:E>0?Math.round(u/E*100):0,streak:se.value.streakDays}}function a(){const d=bc(),u=se.value.lastActiveDate;if(u!==d){if(u){const E=new Date(u),f=new Date(d),O=Math.floor((f.getTime()-E.getTime())/(1e3*60*60*24));O===1?se.value.streakDays++:O>1&&(se.value.streakDays=1)}else se.value.streakDays=1;se.value.lastActiveDate=d}}function l(){return se.value.currentLesson?{moduleId:se.value.currentModule,lessonKey:se.value.currentLesson}:null}function p(){se.value=Fn()}return{progress:bt(se),markLessonComplete:e,isLessonComplete:t,markExerciseAttempt:o,isExerciseComplete:n,getExerciseAttempt:r,getModuleProgress:s,getOverallStats:i,updateStreak:a,getResumePoint:l,resetProgress:p}}const xc={class:"p-6"},Mc={class:"flex items-start justify-between mb-3"},Uc={class:"flex items-center gap-3"},Dc={class:"text-lg font-bold text-primary leading-tight"},Fc={class:"text-sm text-gray-600 leading-relaxed mb-4"},Pc={class:"flex items-center gap-4 text-xs text-muted mb-4"},Hc={class:"mb-3"},Bc={class:"h-2 bg-gray-100 rounded-full overflow-hidden"},Wc={class:"flex items-center justify-between"},kc={class:"text-xs text-muted"},Vc=Mt({__name:"ModuleCard",props:{module:{}},setup(e){const t=e,{getModuleProgress:o}=ar(),n=le(()=>o(t.module.id,t.module.lessons.length,t.module.exercises.length)),r=le(()=>n.value.percent===100?"Completed":n.value.percent>0?"In Progress":"Start"),s=le(()=>n.value.percent===100?"bg-success text-white":n.value.percent>0?"bg-cta text-white":"bg-accent text-white");return(i,a)=>{const l=Zn("router-link");return Ce(),go(l,{to:{name:"module",params:{moduleId:e.module.id}},class:"module-card block bg-white rounded-xl border border-border shadow-sm overflow-hidden no-underline"},{default:jn(()=>[H("div",{class:"h-1",style:_t({backgroundColor:e.module.color})},null,4),H("div",xc,[H("div",Mc,[H("div",Uc,[H("span",{class:"w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg",style:_t({backgroundColor:e.module.color})},pe(e.module.id),5),H("h3",Dc,pe(e.module.title),1)])]),H("p",Fc,pe(e.module.description),1),H("div",Pc,[H("span",null,pe(e.module.lessons.length)+" lessons",1),H("span",null,pe(e.module.exercises.length)+" exercises",1)]),H("div",Hc,[H("div",Bc,[H("div",{class:"progress-fill h-full rounded-full",style:_t({width:n.value.percent+"%",backgroundColor:e.module.color})},null,4)])]),H("div",Wc,[H("span",kc,pe(n.value.completed)+"/"+pe(n.value.total)+" completed",1),H("span",{class:Xo(["text-xs font-semibold px-3 py-1 rounded-full",s.value])},pe(r.value),3)])])]),_:1},8,["to"])}}}),Qc={key:0,class:"flex items-center gap-1.5 text-sm"},Yc={class:"font-semibold text-gray-700"},qc=Mt({__name:"StreakCounter",setup(e){const{progress:t}=ar();return(o,n)=>Te(t).streakDays>0?(Ce(),wt("div",Qc,[n[0]||(n[0]=H("span",{class:"text-orange-500 text-lg"},"🔥",-1)),H("span",Yc,pe(Te(t).streakDays)+" day streak",1)])):Vo("",!0)}}),Gc={class:"max-w-container mx-auto px-6 pt-8 pb-16"},Jc={class:"text-center mb-10"},Kc={class:"flex items-center justify-center gap-6 text-sm text-muted"},jc={class:"text-primary"},Xc={class:"text-primary"},$c={class:"text-primary"},zc={key:0,class:"bg-bg-alt rounded-xl border border-border p-5 mb-8"},Zc={class:"flex items-center justify-between mb-3"},eu={class:"text-sm text-gray-600"},tu={class:"text-primary"},ou={class:"h-2 bg-gray-200 rounded-full overflow-hidden mb-3"},nu={class:"grid grid-cols-1 md:grid-cols-2 gap-6"},ru=Mt({__name:"TrainingIndex",setup(e){const{getOverallStats:t,getResumePoint:o}=ar(),n=le(()=>t(to.map(a=>({id:a.id,lessonCount:a.lessons.length,exerciseCount:a.exercises.length})))),r=le(()=>o()),s=le(()=>to.reduce((a,l)=>a+l.lessons.length,0)),i=le(()=>to.reduce((a,l)=>a+l.exercises.length,0));return(a,l)=>{const p=Zn("router-link");return Ce(),wt("div",Gc,[H("div",Jc,[l[4]||(l[4]=H("h1",{class:"text-3xl md:text-4xl font-extrabold text-primary mb-3"}," Learn MySQL ",-1)),l[5]||(l[5]=H("p",{class:"text-lg text-gray-600 max-w-2xl mx-auto mb-4"}," Free interactive training with a live SQL sandbox. Write real queries, see animated visualizations, and master MySQL from foundations to performance optimization. ",-1)),H("div",Kc,[H("span",null,[H("strong",jc,pe(Te(to).length),1),l[0]||(l[0]=Ot(" Modules",-1))]),H("span",null,[H("strong",Xc,pe(s.value),1),l[1]||(l[1]=Ot(" Lessons",-1))]),H("span",null,[H("strong",$c,pe(i.value),1),l[2]||(l[2]=Ot(" Exercises",-1))]),l[3]||(l[3]=H("span",{class:"text-success font-semibold"},"100% Free",-1))])]),n.value.percent>0?(Ce(),wt("div",zc,[H("div",Zc,[H("div",null,[H("p",eu,[l[6]||(l[6]=Ot(" Your progress: ",-1)),H("strong",tu,pe(n.value.percent)+"%",1),Ot(" complete ("+pe(n.value.completed)+"/"+pe(n.value.total)+") ",1)])]),de(qc)]),H("div",ou,[H("div",{class:"progress-fill h-full bg-accent rounded-full",style:_t({width:n.value.percent+"%"})},null,4)]),r.value?(Ce(),go(p,{key:0,to:{name:"module",params:{moduleId:r.value.moduleId}},class:"inline-block text-sm font-semibold text-accent hover:underline"},{default:jn(()=>[...l[7]||(l[7]=[Ot(" Resume where you left off → ",-1)])]),_:1},8,["to"])):Vo("",!0)])):Vo("",!0),H("div",nu,[(Ce(!0),wt(qe,null,ka(Te(to),d=>(Ce(),go(Vc,{key:d.id,module:d},null,8,["module"]))),128))]),l[8]||(l[8]=H("div",{class:"text-center mt-12 bg-primary/5 rounded-xl border border-primary/20 p-8"},[H("h2",{class:"text-xl font-bold text-primary mb-2"},"Need expert MySQL help?"),H("p",{class:"text-gray-600 text-sm mb-4"},"ReliaDB provides MySQL consulting — audits, optimization, and ongoing support for production databases."),H("a",{href:"/contact.html",class:"inline-block px-6 py-2.5 bg-cta text-white font-semibold rounded-lg hover:bg-cta-dark transition-colors"}," Book Free Assessment ")],-1))])}}}),su=gc({history:Xd(),scrollBehavior(){return{top:0}},routes:[{path:"/",name:"index",component:ru},{path:"/module/:moduleId",name:"module",component:()=>Mo(()=>import("./ModuleView-Ay1E7Djf.js"),__vite__mapDeps([0,1])),props:!0},{path:"/module/:moduleId/lesson/:lessonId",name:"lesson",component:()=>Mo(()=>import("./LessonView-Dg_R85yU.js"),__vite__mapDeps([2,1,3])),props:!0},{path:"/module/:moduleId/exercise/:exerciseId",name:"exercise",component:()=>Mo(()=>import("./LessonView-Dg_R85yU.js"),__vite__mapDeps([2,1,3])),props:e=>({moduleId:e.params.moduleId,exerciseId:e.params.exerciseId,isExercise:!0})}]}),xi=zl(ud);xi.use(su);xi.mount("#app");export{iu as A,lu as B,qe as F,Mo as _,H as a,_t as b,wt as c,Mt as d,de as e,Vo as f,le as g,Zn as h,go as i,Ot as j,Te as k,ar as l,to as m,Xo as n,Ce as o,Vs as p,Qs as q,ka as r,ft as s,pe as t,du as u,ao as v,jn as w,id as x,yl as y,au as z};
