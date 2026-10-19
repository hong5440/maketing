"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[579],{125:(e,t,n)=>{var r=n(2115),o="function"==typeof Object.is?Object.is:function(e,t){return e===t&&(0!==e||1/e==1/t)||e!=e&&t!=t},i=r.useState,a=r.useEffect,l=r.useLayoutEffect,s=r.useDebugValue;function c(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!o(e,n)}catch(e){return!0}}var u="undefined"==typeof window||void 0===window.document||void 0===window.document.createElement?function(e,t){return t()}:function(e,t){var n=t(),r=i({inst:{value:n,getSnapshot:t}}),o=r[0].inst,u=r[1];return l(function(){o.value=n,o.getSnapshot=t,c(o)&&u({inst:o})},[e,n,t]),a(function(){return c(o)&&u({inst:o}),e(function(){c(o)&&u({inst:o})})},[e]),s(n),n};t.useSyncExternalStore=void 0!==r.useSyncExternalStore?r.useSyncExternalStore:u},258:(e,t,n)=>{n.d(t,{Hl:()=>f});var r=n(6595),o=n(2115),i=n(7548);function a(e,t){let n;return(...r)=>{window.clearTimeout(n),n=window.setTimeout(()=>e(...r),t)}}let l=["x","y","top","bottom","left","right","width","height"];var s=n(4735),c=n(5155);function u({ref:e,children:t,fallback:n,resize:s,style:u,gl:f,events:d=r.f,eventSource:m,eventPrefix:h,shadows:p,linear:v,flat:g,legacy:b,orthographic:y,frameloop:w,dpr:x,performance:E,raycaster:P,camera:M,scene:S,onPointerMissed:j,onCreated:T,...C}){o.useMemo(()=>(0,r.e)(i),[]);let O=(0,r.u)(),[_,A]=function({debounce:e,scroll:t,polyfill:n,offsetSize:r}={debounce:0,scroll:!1,offsetSize:!1}){var i,s,c;let u=n||("undefined"==typeof window?class{}:window.ResizeObserver);if(!u)throw Error("This browser does not support ResizeObserver out of the box. See: https://github.com/react-spring/react-use-measure/#resize-observer-polyfills");let[f,d]=(0,o.useState)({left:0,top:0,width:0,height:0,bottom:0,right:0,x:0,y:0}),m=(0,o.useRef)({element:null,scrollContainers:null,resizeObserver:null,lastBounds:f,orientationHandler:null}),h=e?"number"==typeof e?e:e.scroll:null,p=e?"number"==typeof e?e:e.resize:null,v=(0,o.useRef)(!1);(0,o.useEffect)(()=>(v.current=!0,()=>void(v.current=!1)));let[g,b,y]=(0,o.useMemo)(()=>{let e=()=>{let e,t;if(!m.current.element)return;let{left:n,top:o,width:i,height:a,bottom:s,right:c,x:u,y:f}=m.current.element.getBoundingClientRect(),h={left:n,top:o,width:i,height:a,bottom:s,right:c,x:u,y:f};m.current.element instanceof HTMLElement&&r&&(h.height=m.current.element.offsetHeight,h.width=m.current.element.offsetWidth),Object.freeze(h),v.current&&(e=m.current.lastBounds,t=h,!l.every(n=>e[n]===t[n]))&&d(m.current.lastBounds=h)};return[e,p?a(e,p):e,h?a(e,h):e]},[d,r,h,p]);function w(){m.current.scrollContainers&&(m.current.scrollContainers.forEach(e=>e.removeEventListener("scroll",y,!0)),m.current.scrollContainers=null),m.current.resizeObserver&&(m.current.resizeObserver.disconnect(),m.current.resizeObserver=null),m.current.orientationHandler&&("orientation"in screen&&"removeEventListener"in screen.orientation?screen.orientation.removeEventListener("change",m.current.orientationHandler):"onorientationchange"in window&&window.removeEventListener("orientationchange",m.current.orientationHandler))}function x(){m.current.element&&(m.current.resizeObserver=new u(y),m.current.resizeObserver.observe(m.current.element),t&&m.current.scrollContainers&&m.current.scrollContainers.forEach(e=>e.addEventListener("scroll",y,{capture:!0,passive:!0})),m.current.orientationHandler=()=>{y()},"orientation"in screen&&"addEventListener"in screen.orientation?screen.orientation.addEventListener("change",m.current.orientationHandler):"onorientationchange"in window&&window.addEventListener("orientationchange",m.current.orientationHandler))}return i=y,s=!!t,(0,o.useEffect)(()=>{if(s)return window.addEventListener("scroll",i,{capture:!0,passive:!0}),()=>void window.removeEventListener("scroll",i,!0)},[i,s]),c=b,(0,o.useEffect)(()=>(window.addEventListener("resize",c),()=>void window.removeEventListener("resize",c)),[c]),(0,o.useEffect)(()=>{w(),x()},[t,y,b]),(0,o.useEffect)(()=>w,[]),[e=>{e&&e!==m.current.element&&(w(),m.current.element=e,m.current.scrollContainers=function e(t){let n=[];if(!t||t===document.body)return n;let{overflow:r,overflowX:o,overflowY:i}=window.getComputedStyle(t);return[r,o,i].some(e=>"auto"===e||"scroll"===e)&&n.push(t),[...n,...e(t.parentElement)]}(e),x())},f,g]}({scroll:!0,debounce:{scroll:50,resize:0},...s}),R=o.useRef(null),L=o.useRef(null);o.useImperativeHandle(e,()=>R.current);let z=(0,r.a)(j),k=o.useCallback(e=>null==z.current?void 0:z.current(e),[z]),[I,D]=o.useState(!1),[N,F]=o.useState(!1);if(I)throw I;if(N)throw N;let Y=o.useRef(null),[q,W]=(0,r.b)(),H=o.useRef(null),B=()=>m?(0,r.i)(m)?m.current:m:L.current;o.useInsertionEffect(()=>()=>{let e=Y.current;Y.current=null,null==e||e.unmount()},[]),(0,r.c)(()=>{let e=R.current;A.width>0&&A.height>0&&e&&(Y.current||(Y.current=(0,r.d)(e)),Y.current.configure({gl:f,scene:S,events:d,shadows:p,linear:v,flat:g,legacy:b,orthographic:y,frameloop:w,dpr:x,performance:E,raycaster:P,camera:M,size:A,onPointerMissed:k,onCreated:e=>{var t;H.current=e,null==e.events.connect||e.events.connect(null!=(t=B())?t:L.current),h&&e.setEvents({compute:(e,t)=>{let n=e[h+"X"],r=e[h+"Y"];t.pointer.set(n/t.size.width*2-1,-(2*(r/t.size.height))+1),t.raycaster.setFromCamera(t.pointer,t.camera)}}),null==T||T(e)}}).catch(F),"fulfilled"===Y.current.ready.status?Y.current.render((0,c.jsx)(O,{children:(0,c.jsx)(r.E,{set:F,children:(0,c.jsx)(o.Suspense,{fallback:(0,c.jsx)(r.B,{set:D}),children:null!=t?t:null})})})):"pending"===Y.current.ready.status&&W(Y.current.ready))}),o.useEffect(()=>{var e;let t=null==(e=H.current)?void 0:e.get(),n=B();t&&n&&t.events.connected!==n&&(null==t.events.connect||t.events.connect(n))}),o.useEffect(()=>{let e=R.current;return()=>{var t;e.isConnected||null==(t=Y.current)||t.unmount()}},[]);let V=m?"none":"auto";return(0,c.jsxs)("div",{ref:L,style:{position:"relative",width:"100%",height:"100%",overflow:"hidden",pointerEvents:V,...u},...C,children:[(0,c.jsx)("div",{ref:_,style:{width:"100%",height:"100%"},children:(0,c.jsx)("canvas",{ref:R,style:{display:"block"},children:n})}),q]})}function f(e){return(0,c.jsx)(s.Af,{children:(0,c.jsx)(u,{...e})})}n(9914)},2912:(e,t,n)=>{n.d(t,{A:()=>c});var r=n(2115),o=n(6595),i=n(5339);let a=parseInt(i.sPf.replace(/\D+/g,""));class l extends i.BKk{constructor(){super({uniforms:{time:{value:0},fade:{value:1}},vertexShader:`
      uniform float time;
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
        gl_PointSize = size * (30.0 / -mvPosition.z) * (3.0 + sin(time + 100.0));
        gl_Position = projectionMatrix * mvPosition;
      }`,fragmentShader:`
      uniform sampler2D pointTexture;
      uniform float fade;
      varying vec3 vColor;
      void main() {
        float opacity = 1.0;
        if (fade == 1.0) {
          float d = distance(gl_PointCoord, vec2(0.5, 0.5));
          opacity = 1.0 / (1.0 + exp(16.0 * (d - 0.25)));
        }
        gl_FragColor = vec4(vColor, opacity);

        #include <tonemapping_fragment>
	      #include <${a>=154?"colorspace_fragment":"encodings_fragment"}>
      }`})}}let s=e=>new i.Pq0().setFromSpherical(new i.YHV(e,Math.acos(1-2*Math.random()),2*Math.random()*Math.PI)),c=r.forwardRef(({radius:e=100,depth:t=50,count:n=5e3,saturation:a=0,factor:c=4,fade:u=!1,speed:f=1},d)=>{let m=r.useRef(null),[h,p,v]=r.useMemo(()=>{let r=[],o=[],l=Array.from({length:n},()=>(.5+.5*Math.random())*c),u=new i.Q1f,f=e+t,d=t/n;for(let e=0;e<n;e++)f-=d*Math.random(),r.push(...s(f).toArray()),u.setHSL(e/n,a,.9),o.push(u.r,u.g,u.b);return[new Float32Array(r),new Float32Array(o),new Float32Array(l)]},[n,t,c,e,a]);(0,o.F)(e=>m.current&&(m.current.uniforms.time.value=e.clock.elapsedTime*f));let[g]=r.useState(()=>new l);return r.createElement("points",{ref:d},r.createElement("bufferGeometry",null,r.createElement("bufferAttribute",{attach:"attributes-position",args:[h,3]}),r.createElement("bufferAttribute",{attach:"attributes-color",args:[p,3]}),r.createElement("bufferAttribute",{attach:"attributes-size",args:[v,1]})),r.createElement("primitive",{ref:m,object:g,attach:"material",blending:i.EZo,"uniforms-fade-value":u,depthWrite:!1,transparent:!0,vertexColors:!0}))})},3617:(e,t,n)=>{n.d(t,{o:()=>o});var r=n(5339);class o{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}}new r.qUd(-1,1,1,-1,0,1);class i extends r.LoY{constructor(){super(),this.setAttribute("position",new r.qtW([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new r.qtW([0,2,0,0,2,0],2))}}new i},3646:(e,t,n)=>{let r,o;n.d(t,{E:()=>y});var i=n(8945),a=n(2115),l=n(2669),s=n(5339),c=n(6595);let u=new s.Pq0,f=new s.Pq0,d=new s.Pq0,m=new s.I9Y;function h(e,t,n){let r=u.setFromMatrixPosition(e.matrixWorld);r.project(t);let o=n.width/2,i=n.height/2;return[r.x*o+o,-(r.y*i)+i]}let p=e=>1e-10>Math.abs(e)?0:e;function v(e,t,n=""){let r="matrix3d(";for(let n=0;16!==n;n++)r+=p(t[n]*e.elements[n])+(15!==n?",":")");return n+r}let g=(r=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],e=>v(e,r)),b=(o=e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1],(e,t)=>v(e,o(t),"translate(-50%,-50%)")),y=a.forwardRef(({children:e,eps:t=.001,style:n,className:r,prepend:o,center:v,fullscreen:y,portal:w,distanceFactor:x,sprite:E=!1,transform:P=!1,occlude:M,onOcclude:S,castShadow:j,receiveShadow:T,material:C,geometry:O,zIndexRange:_=[0x1000037,0],calculatePosition:A=h,as:R="div",wrapperClass:L,pointerEvents:z="auto",...k},I)=>{let{gl:D,camera:N,scene:F,size:Y,raycaster:q,events:W,viewport:H}=(0,c.D)(),[B]=a.useState(()=>document.createElement(R)),V=a.useRef(null),U=a.useRef(null),Z=a.useRef(0),X=a.useRef([0,0]),$=a.useRef(null),K=a.useRef(null),G=(null==w?void 0:w.current)||W.connected||D.domElement.parentNode,Q=a.useRef(null),J=a.useRef(!1),ee=a.useMemo(()=>M&&"blending"!==M||Array.isArray(M)&&M.length&&function(e){return e&&"object"==typeof e&&"current"in e}(M[0]),[M]);a.useLayoutEffect(()=>{let e=D.domElement;M&&"blending"===M?(e.style.zIndex=`${Math.floor(_[0]/2)}`,e.style.position="absolute",e.style.pointerEvents="none"):(e.style.zIndex=null,e.style.position=null,e.style.pointerEvents=null)},[M]),a.useLayoutEffect(()=>{if(U.current){let e=V.current=l.createRoot(B);if(F.updateMatrixWorld(),P)B.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let e=A(U.current,N,Y);B.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${e[0]}px,${e[1]}px,0);transform-origin:0 0;`}return G&&(o?G.prepend(B):G.appendChild(B)),()=>{G&&G.removeChild(B),e.unmount()}}},[G,P]),a.useLayoutEffect(()=>{L&&(B.className=L)},[L]);let et=a.useMemo(()=>P?{position:"absolute",top:0,left:0,width:Y.width,height:Y.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:v?"translate3d(-50%,-50%,0)":"none",...y&&{top:-Y.height/2,left:-Y.width/2,width:Y.width,height:Y.height},...n},[n,v,y,Y,P]),en=a.useMemo(()=>({position:"absolute",pointerEvents:z}),[z]);a.useLayoutEffect(()=>{var t,o;J.current=!1,P?null==(t=V.current)||t.render(a.createElement("div",{ref:$,style:et},a.createElement("div",{ref:K,style:en},a.createElement("div",{ref:I,className:r,style:n,children:e})))):null==(o=V.current)||o.render(a.createElement("div",{ref:I,style:et,className:r,children:e}))});let er=a.useRef(!0);(0,c.F)(e=>{if(U.current){N.updateMatrixWorld(),U.current.updateWorldMatrix(!0,!1);let e=P?X.current:A(U.current,N,Y);if(P||Math.abs(Z.current-N.zoom)>t||Math.abs(X.current[0]-e[0])>t||Math.abs(X.current[1]-e[1])>t){let t=function(e,t){let n=u.setFromMatrixPosition(e.matrixWorld),r=f.setFromMatrixPosition(t.matrixWorld),o=n.sub(r),i=t.getWorldDirection(d);return o.angleTo(i)>Math.PI/2}(U.current,N),n=!1;ee&&(Array.isArray(M)?n=M.map(e=>e.current):"blending"!==M&&(n=[F]));let r=er.current;n?er.current=function(e,t,n,r){let o=u.setFromMatrixPosition(e.matrixWorld),i=o.clone();i.project(t),m.set(i.x,i.y),n.setFromCamera(m,t);let a=n.intersectObjects(r,!0);if(a.length){let e=a[0].distance;return o.distanceTo(n.ray.origin)<e}return!0}(U.current,N,q,n)&&!t:er.current=!t,r!==er.current&&(S?S(!er.current):B.style.display=er.current?"block":"none");let o=Math.floor(_[0]/2),i=M?ee?[_[0],o]:[o-1,0]:_;if(B.style.zIndex=`${function(e,t,n){if(t instanceof s.ubm||t instanceof s.qUd){let r=u.setFromMatrixPosition(e.matrixWorld),o=f.setFromMatrixPosition(t.matrixWorld),i=r.distanceTo(o),a=(n[1]-n[0])/(t.far-t.near),l=n[1]-a*t.far;return Math.round(a*i+l)}}(U.current,N,i)}`,P){let[e,t]=[Y.width/2,Y.height/2],n=N.projectionMatrix.elements[5]*t,{isOrthographicCamera:r,top:o,left:i,bottom:a,right:l}=N,s=g(N.matrixWorldInverse),c=r?`scale(${n})translate(${p(-(l+i)/2)}px,${p((o+a)/2)}px)`:`translateZ(${n}px)`,u=U.current.matrixWorld;E&&((u=N.matrixWorldInverse.clone().transpose().copyPosition(u).scale(U.current.scale)).elements[3]=u.elements[7]=u.elements[11]=0,u.elements[15]=1),B.style.width=Y.width+"px",B.style.height=Y.height+"px",B.style.perspective=r?"":`${n}px`,$.current&&K.current&&($.current.style.transform=`${c}${s}translate(${e}px,${t}px)`,K.current.style.transform=b(u,1/((x||10)/400)))}else{let t=void 0===x?1:function(e,t){if(t instanceof s.qUd)return t.zoom;if(!(t instanceof s.ubm))return 1;{let n=u.setFromMatrixPosition(e.matrixWorld),r=f.setFromMatrixPosition(t.matrixWorld);return 1/(2*Math.tan(t.fov*Math.PI/180/2)*n.distanceTo(r))}}(U.current,N)*x;B.style.transform=`translate3d(${e[0]}px,${e[1]}px,0) scale(${t})`}X.current=e,Z.current=N.zoom}}if(!ee&&Q.current&&!J.current)if(P){if($.current){let e=$.current.children[0];if(null!=e&&e.clientWidth&&null!=e&&e.clientHeight){let{isOrthographicCamera:t}=N;if(t||O)k.scale&&(Array.isArray(k.scale)?k.scale instanceof s.Pq0?Q.current.scale.copy(k.scale.clone().divideScalar(1)):Q.current.scale.set(1/k.scale[0],1/k.scale[1],1/k.scale[2]):Q.current.scale.setScalar(1/k.scale));else{let t=(x||10)/400,n=e.clientWidth*t,r=e.clientHeight*t;Q.current.scale.set(n,r,1)}J.current=!0}}}else{let t=B.children[0];if(null!=t&&t.clientWidth&&null!=t&&t.clientHeight){let e=1/H.factor,n=t.clientWidth*e,r=t.clientHeight*e;Q.current.scale.set(n,r,1),J.current=!0}Q.current.lookAt(e.camera.position)}});let eo=a.useMemo(()=>({vertexShader:P?void 0:`
          /*
            This shader is from the THREE's SpriteMaterial.
            We need to turn the backing plane into a Sprite
            (make it always face the camera) if "transfrom"
            is false.
          */
          #include <common>

          void main() {
            vec2 center = vec2(0., 1.);
            float rotation = 0.0;

            // This is somewhat arbitrary, but it seems to work well
            // Need to figure out how to derive this dynamically if it even matters
            float size = 0.03;

            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            vec2 scale;
            scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
            scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) scale *= - mvPosition.z;

            vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
            vec2 rotatedPosition;
            rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
            rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
            mvPosition.xy += rotatedPosition;

            gl_Position = projectionMatrix * mvPosition;
          }
      `,fragmentShader:`
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `}),[P]);return a.createElement("group",(0,i.A)({},k,{ref:U}),M&&!ee&&a.createElement("mesh",{castShadow:j,receiveShadow:T,ref:Q},O||a.createElement("planeGeometry",null),C||a.createElement("shaderMaterial",{side:s.$EB,vertexShader:eo.vertexShader,fragmentShader:eo.fragmentShader})))})},3654:(e,t,n)=>{var r=n(2115),o=n(4806),i="function"==typeof Object.is?Object.is:function(e,t){return e===t&&(0!==e||1/e==1/t)||e!=e&&t!=t},a=o.useSyncExternalStore,l=r.useRef,s=r.useEffect,c=r.useMemo,u=r.useDebugValue;t.useSyncExternalStoreWithSelector=function(e,t,n,r,o){var f=l(null);if(null===f.current){var d={hasValue:!1,value:null};f.current=d}else d=f.current;var m=a(e,(f=c(function(){function e(e){if(!s){if(s=!0,a=e,e=r(e),void 0!==o&&d.hasValue){var t=d.value;if(o(t,e))return l=t}return l=e}if(t=l,i(a,e))return t;var n=r(e);return void 0!==o&&o(t,n)?(a=e,t):(a=e,l=n)}var a,l,s=!1,c=void 0===n?null:n;return[function(){return e(t())},null===c?void 0:function(){return e(c())}]},[t,n,r,o]))[0],f[1]);return s(function(){d.hasValue=!0,d.value=m},[m]),u(m),m}},3689:(e,t,n)=>{n.d(t,{DY:()=>a,IU:()=>s,uv:()=>l});let r=[];function o(e,t,n=(e,t)=>e===t){if(e===t)return!0;if(!e||!t)return!1;let r=e.length;if(t.length!==r)return!1;for(let o=0;o<r;o++)if(!n(e[o],t[o]))return!1;return!0}function i(e,t=null,n=!1,a={}){for(let i of(null===t&&(t=[e]),r))if(o(t,i.keys,i.equal)){if(n)return;if(Object.prototype.hasOwnProperty.call(i,"error"))throw i.error;if(Object.prototype.hasOwnProperty.call(i,"response"))return a.lifespan&&a.lifespan>0&&(i.timeout&&clearTimeout(i.timeout),i.timeout=setTimeout(i.remove,a.lifespan)),i.response;if(!n)throw i.promise}let l={keys:t,equal:a.equal,remove:()=>{let e=r.indexOf(l);-1!==e&&r.splice(e,1)},promise:("object"==typeof e&&"function"==typeof e.then?e:e(...t)).then(e=>{l.response=e,a.lifespan&&a.lifespan>0&&(l.timeout=setTimeout(l.remove,a.lifespan))}).catch(e=>l.error=e)};if(r.push(l),!n)throw l.promise}let a=(e,t,n)=>i(e,t,!1,n),l=(e,t,n)=>void i(e,t,!0,n),s=e=>{if(void 0===e||0===e.length)r.splice(0,r.length);else{let t=r.find(t=>o(e,t.keys,t.equal));t&&t.remove()}}},3718:(e,t,n)=>{n.d(t,{h:()=>s});var r=n(2115),o=n(8828);let i=e=>{let t,n=new Set,r=(e,r)=>{let o="function"==typeof e?e(t):e;if(!Object.is(o,t)){let e=t;t=(null!=r?r:"object"!=typeof o||null===o)?o:Object.assign({},t,o),n.forEach(n=>n(t,e))}},o=()=>t,i={setState:r,getState:o,getInitialState:()=>a,subscribe:e=>(n.add(e),()=>n.delete(e))},a=t=e(r,o,i);return i},{useSyncExternalStoreWithSelector:a}=o,l=(e,t)=>{let n=(e=>e?i(e):i)(e),o=(e,o=t)=>(function(e,t=e=>e,n){let o=a(e.subscribe,e.getState,e.getInitialState,t,n);return r.useDebugValue(o),o})(n,e,o);return Object.assign(o,n),o},s=(e,t)=>e?l(e,t):l},4735:(e,t,n)=>{n.d(t,{Af:()=>l,Go:()=>d,Nz:()=>o,u5:()=>s,y3:()=>f});var r=n(2115);function o(e,t,n){if(!e)return;if(!0===n(e))return e;let r=t?e.return:e.child;for(;r;){let e=o(r,t,n);if(e)return e;r=t?null:r.sibling}}function i(e){try{return Object.defineProperties(e,{_currentRenderer:{get:()=>null,set(){}},_currentRenderer2:{get:()=>null,set(){}}})}catch(t){return e}}(()=>{var e,t;return"undefined"!=typeof window&&((null==(e=window.document)?void 0:e.createElement)||(null==(t=window.navigator)?void 0:t.product)==="ReactNative")})()?r.useLayoutEffect:r.useEffect;let a=i(r.createContext(null));class l extends r.Component{render(){return r.createElement(a.Provider,{value:this._reactInternals},this.props.children)}}function s(){let e=r.useContext(a);if(null===e)throw Error("its-fine: useFiber must be called within a <FiberProvider />!");let t=r.useId();return r.useMemo(()=>{for(let n of[e,null==e?void 0:e.alternate]){if(!n)continue;let e=o(n,!1,e=>{let n=e.memoizedState;for(;n;){if(n.memoizedState===t)return!0;n=n.next}});if(e)return e}},[e,t])}let c=Symbol.for("react.context"),u=e=>null!==e&&"object"==typeof e&&"$$typeof"in e&&e.$$typeof===c;function f(){let e=function(){let e=s(),[t]=r.useState(()=>new Map);t.clear();let n=e;for(;n;){let e=n.type;u(e)&&e!==a&&!t.has(e)&&t.set(e,r.use(i(e))),n=n.return}return t}();return r.useMemo(()=>Array.from(e.keys()).reduce((t,n)=>o=>r.createElement(t,null,r.createElement(n.Provider,{...o,value:e.get(n)})),e=>r.createElement(l,{...e})),[e])}function d(){if(!r.Activity)throw Error("its-fine: useActivityBridge requires React 19.2 or later!");let e=s(),[t]=r.useState(()=>{let t,n=[],i=!1;o(e,!0,e=>{var t,o;if(e.elementType===r.Activity){let r=(null==(t=e.child)?void 0:t.tag)===22?e.child.stateNode:null;if("number"!=typeof(null==r?void 0:r._visibility))throw Error("its-fine: unsupported React Activity internals!");n.push(r)}else 22===e.tag&&(null==(o=e.return)?void 0:o.elementType)!==r.Activity&&(i=!0)});let a="hidden",l=new Set,s={mounted:!1,connected:!1,subscribe:e=>(l.add(e),()=>{l.delete(e)}),sync(e){s.mounted&&!s.connected&&i&&n.length>0?t||(t=function(e){if("function"==typeof requestAnimationFrame){let t=requestAnimationFrame(e);return()=>cancelAnimationFrame(t)}let t=setTimeout(e,16);return()=>clearTimeout(t)}(()=>{t=void 0,s.sync(!0)})):(null==t||t(),t=void 0);let r=a;if(s.mounted?s.connected?r="visible":e&&(r=n.every(e=>(1&e._visibility)!=0)?"visible":"hidden"):r="hidden",a!==r)for(let e of(a=r,l))e()},Bridge:({children:e})=>r.createElement(r.Activity,{mode:r.useSyncExternalStore(s.subscribe,()=>a,()=>"hidden")},e)};return s});return r.useInsertionEffect(()=>(t.mounted=!0,queueMicrotask(()=>t.sync(!1)),()=>{t.mounted=!1,queueMicrotask(()=>t.sync(!1))}),[t]),r.useLayoutEffect(()=>(t.connected=!0,t.sync(!1),()=>{t.connected=!1,t.sync(!0)}),[t]),t.Bridge}},4806:(e,t,n)=>{e.exports=n(125)},5914:(e,t,n)=>{n.d(t,{E:()=>i});var r=n(5339),o=n(7548);class i extends r.eaF{constructor(e,t={}){super(e),this.isWater=!0;let n=this,i=void 0!==t.textureWidth?t.textureWidth:512,a=void 0!==t.textureHeight?t.textureHeight:512,l=void 0!==t.clipBias?t.clipBias:0,s=void 0!==t.alpha?t.alpha:1,c=void 0!==t.time?t.time:0,u=void 0!==t.waterNormals?t.waterNormals:null,f=void 0!==t.sunDirection?t.sunDirection:new r.Pq0(.70707,.70707,0),d=new r.Q1f(void 0!==t.sunColor?t.sunColor:0xffffff),m=new r.Q1f(void 0!==t.waterColor?t.waterColor:8355711),h=void 0!==t.eye?t.eye:new r.Pq0(0,0,0),p=void 0!==t.distortionScale?t.distortionScale:20,v=void 0!==t.side?t.side:r.hB5,g=void 0!==t.fog&&t.fog,b=new r.Zcv,y=new r.Pq0,w=new r.Pq0,x=new r.Pq0,E=new r.kn4,P=new r.Pq0(0,0,-1),M=new r.IUQ,S=new r.Pq0,j=new r.Pq0,T=new r.IUQ,C=new r.kn4,O=new r.ubm,_=new r.nWS(i,a),A={name:"MirrorShader",uniforms:r.LlO.merge([o.UniformsLib.fog,o.UniformsLib.lights,{normalSampler:{value:null},mirrorSampler:{value:null},alpha:{value:1},time:{value:0},size:{value:1},distortionScale:{value:20},textureMatrix:{value:new r.kn4},sunColor:{value:new r.Q1f(8355711)},sunDirection:{value:new r.Pq0(.70707,.70707,0)},eye:{value:new r.Pq0},waterColor:{value:new r.Q1f(5592405)}}]),vertexShader:`
				uniform mat4 textureMatrix;
				uniform float time;

				varying vec4 mirrorCoord;
				varying vec4 worldPosition;

				#include <common>
				#include <fog_pars_vertex>
				#include <shadowmap_pars_vertex>
				#include <logdepthbuf_pars_vertex>

				void main() {
					mirrorCoord = modelMatrix * vec4( position, 1.0 );
					worldPosition = mirrorCoord.xyzw;
					mirrorCoord = textureMatrix * mirrorCoord;
					vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );
					gl_Position = projectionMatrix * mvPosition;

				#include <beginnormal_vertex>
				#include <defaultnormal_vertex>
				#include <logdepthbuf_vertex>
				#include <fog_vertex>
				#include <shadowmap_vertex>
			}`,fragmentShader:`
				uniform sampler2D mirrorSampler;
				uniform float alpha;
				uniform float time;
				uniform float size;
				uniform float distortionScale;
				uniform sampler2D normalSampler;
				uniform vec3 sunColor;
				uniform vec3 sunDirection;
				uniform vec3 eye;
				uniform vec3 waterColor;

				varying vec4 mirrorCoord;
				varying vec4 worldPosition;

				vec4 getNoise( vec2 uv ) {
					vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);
					vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );
					vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
					vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
					vec4 noise = texture2D( normalSampler, uv0 ) +
						texture2D( normalSampler, uv1 ) +
						texture2D( normalSampler, uv2 ) +
						texture2D( normalSampler, uv3 );
					return noise * 0.5 - 1.0;
				}

				void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
					vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );
					float direction = max( 0.0, dot( eyeDirection, reflection ) );
					specularColor += pow( direction, shiny ) * sunColor * spec;
					diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;
				}

				#include <common>
				#include <packing>
				#include <bsdfs>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <lights_pars_begin>
				#include <shadowmap_pars_fragment>
				#include <shadowmask_pars_fragment>

				void main() {

					#include <logdepthbuf_fragment>
					vec4 noise = getNoise( worldPosition.xz * size );
					vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );

					vec3 diffuseLight = vec3(0.0);
					vec3 specularLight = vec3(0.0);

					vec3 worldToEye = eye-worldPosition.xyz;
					vec3 eyeDirection = normalize( worldToEye );
					sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );

					float distance = length(worldToEye);

					vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;
					vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );

					float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
					float rf0 = 0.3;
					float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );
					vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;
					vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance);
					vec3 outgoingLight = albedo;
					gl_FragColor = vec4( outgoingLight, alpha );

					#include <tonemapping_fragment>
					#include <colorspace_fragment>
					#include <fog_fragment>	
				}`},R=new r.BKk({name:A.name,uniforms:r.LlO.clone(A.uniforms),vertexShader:A.vertexShader,fragmentShader:A.fragmentShader,lights:!0,side:v,fog:g});R.uniforms.mirrorSampler.value=_.texture,R.uniforms.textureMatrix.value=C,R.uniforms.alpha.value=s,R.uniforms.time.value=c,R.uniforms.normalSampler.value=u,R.uniforms.sunColor.value=d,R.uniforms.waterColor.value=m,R.uniforms.sunDirection.value=f,R.uniforms.distortionScale.value=p,R.uniforms.eye.value=h,n.material=R,n.onBeforeRender=function(e,t,r){if(w.setFromMatrixPosition(n.matrixWorld),x.setFromMatrixPosition(r.matrixWorld),E.extractRotation(n.matrixWorld),y.set(0,0,1),y.applyMatrix4(E),S.subVectors(w,x),S.dot(y)>0)return;S.reflect(y).negate(),S.add(w),E.extractRotation(r.matrixWorld),P.set(0,0,-1),P.applyMatrix4(E),P.add(x),j.subVectors(w,P),j.reflect(y).negate(),j.add(w),O.position.copy(S),O.up.set(0,1,0),O.up.applyMatrix4(E),O.up.reflect(y),O.lookAt(j),O.far=r.far,O.updateMatrixWorld(),O.projectionMatrix.copy(r.projectionMatrix),C.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),C.multiply(O.projectionMatrix),C.multiply(O.matrixWorldInverse),b.setFromNormalAndCoplanarPoint(y,w),b.applyMatrix4(O.matrixWorldInverse),M.set(b.normal.x,b.normal.y,b.normal.z,b.constant);let o=O.projectionMatrix;T.x=(Math.sign(M.x)+o.elements[8])/o.elements[0],T.y=(Math.sign(M.y)+o.elements[9])/o.elements[5],T.z=-1,T.w=(1+o.elements[10])/o.elements[14],M.multiplyScalar(2/M.dot(T)),o.elements[2]=M.x,o.elements[6]=M.y,o.elements[10]=M.z+1-l,o.elements[14]=M.w,h.setFromMatrixPosition(r.matrixWorld);let i=e.getRenderTarget(),a=e.xr.enabled,s=e.shadowMap.autoUpdate;n.visible=!1,e.xr.enabled=!1,e.shadowMap.autoUpdate=!1,e.setRenderTarget(_),e.state.buffers.depth.setMask(!0),!1===e.autoClear&&e.clear(),e.render(t,O),n.visible=!0,e.xr.enabled=a,e.shadowMap.autoUpdate=s,e.setRenderTarget(i);let c=r.viewport;void 0!==c&&e.state.viewport(c)}}}},6451:(e,t)=>{function n(e,t){var n=e.length;for(e.push(t);0<n;){var r=n-1>>>1,o=e[r];if(0<i(o,t))e[r]=t,e[n]=o,n=r;else break}}function r(e){return 0===e.length?null:e[0]}function o(e){if(0===e.length)return null;var t=e[0],n=e.pop();if(n!==t){e[0]=n;for(var r=0,o=e.length,a=o>>>1;r<a;){var l=2*(r+1)-1,s=e[l],c=l+1,u=e[c];if(0>i(s,n))c<o&&0>i(u,s)?(e[r]=u,e[c]=n,r=c):(e[r]=s,e[l]=n,r=l);else if(c<o&&0>i(u,n))e[r]=u,e[c]=n,r=c;else break}}return t}function i(e,t){var n=e.sortIndex-t.sortIndex;return 0!==n?n:e.id-t.id}if(t.unstable_now=void 0,"object"==typeof performance&&"function"==typeof performance.now){var a,l=performance;t.unstable_now=function(){return l.now()}}else{var s=Date,c=s.now();t.unstable_now=function(){return s.now()-c}}var u=[],f=[],d=1,m=null,h=3,p=!1,v=!1,g=!1,b=!1,y="function"==typeof setTimeout?setTimeout:null,w="function"==typeof clearTimeout?clearTimeout:null,x="undefined"!=typeof setImmediate?setImmediate:null;function E(e){for(var t=r(f);null!==t;){if(null===t.callback)o(f);else if(t.startTime<=e)o(f),t.sortIndex=t.expirationTime,n(u,t);else break;t=r(f)}}function P(e){if(g=!1,E(e),!v)if(null!==r(u))v=!0,M||(M=!0,a());else{var t=r(f);null!==t&&R(P,t.startTime-e)}}var M=!1,S=-1,j=5,T=-1;function C(){return!!b||!(t.unstable_now()-T<j)}function O(){if(b=!1,M){var e=t.unstable_now();T=e;var n=!0;try{e:{v=!1,g&&(g=!1,w(S),S=-1),p=!0;var i=h;try{t:{for(E(e),m=r(u);null!==m&&!(m.expirationTime>e&&C());){var l=m.callback;if("function"==typeof l){m.callback=null,h=m.priorityLevel;var s=l(m.expirationTime<=e);if(e=t.unstable_now(),"function"==typeof s){m.callback=s,E(e),n=!0;break t}m===r(u)&&o(u),E(e)}else o(u);m=r(u)}if(null!==m)n=!0;else{var c=r(f);null!==c&&R(P,c.startTime-e),n=!1}}break e}finally{m=null,h=i,p=!1}}}finally{n?a():M=!1}}}if("function"==typeof x)a=function(){x(O)};else if("undefined"!=typeof MessageChannel){var _=new MessageChannel,A=_.port2;_.port1.onmessage=O,a=function(){A.postMessage(null)}}else a=function(){y(O,0)};function R(e,n){S=y(function(){e(t.unstable_now())},n)}t.unstable_IdlePriority=5,t.unstable_ImmediatePriority=1,t.unstable_LowPriority=4,t.unstable_NormalPriority=3,t.unstable_Profiling=null,t.unstable_UserBlockingPriority=2,t.unstable_cancelCallback=function(e){e.callback=null},t.unstable_forceFrameRate=function(e){0>e||125<e?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):j=0<e?Math.floor(1e3/e):5},t.unstable_getCurrentPriorityLevel=function(){return h},t.unstable_next=function(e){switch(h){case 1:case 2:case 3:var t=3;break;default:t=h}var n=h;h=t;try{return e()}finally{h=n}},t.unstable_requestPaint=function(){b=!0},t.unstable_runWithPriority=function(e,t){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var n=h;h=e;try{return t()}finally{h=n}},t.unstable_scheduleCallback=function(e,o,i){var l=t.unstable_now();switch(i="object"==typeof i&&null!==i&&"number"==typeof(i=i.delay)&&0<i?l+i:l,e){case 1:var s=-1;break;case 2:s=250;break;case 5:s=0x3fffffff;break;case 4:s=1e4;break;default:s=5e3}return s=i+s,e={id:d++,callback:o,priorityLevel:e,startTime:i,expirationTime:s,sortIndex:-1},i>l?(e.sortIndex=i,n(f,e),null===r(u)&&e===r(f)&&(g?(w(S),S=-1):g=!0,R(P,i-l))):(e.sortIndex=s,n(u,e),v||p||(v=!0,M||(M=!0,a()))),e},t.unstable_shouldYield=C,t.unstable_wrapCallback=function(e){var t=h;return function(){var n=h;h=t;try{return e.apply(this,arguments)}finally{h=n}}}},6750:(e,t,n)=>{n.d(t,{N:()=>v});var r=n(8945),o=n(6595),i=n(2115),a=n(5339),l=Object.defineProperty;class s{constructor(){((e,t,n)=>((e,t,n)=>t in e?l(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n)(e,"symbol"!=typeof t?t+"":t,n))(this,"_listeners")}addEventListener(e,t){void 0===this._listeners&&(this._listeners={});let n=this._listeners;void 0===n[e]&&(n[e]=[]),-1===n[e].indexOf(t)&&n[e].push(t)}hasEventListener(e,t){if(void 0===this._listeners)return!1;let n=this._listeners;return void 0!==n[e]&&-1!==n[e].indexOf(t)}removeEventListener(e,t){if(void 0===this._listeners)return;let n=this._listeners[e];if(void 0!==n){let e=n.indexOf(t);-1!==e&&n.splice(e,1)}}dispatchEvent(e){if(void 0===this._listeners)return;let t=this._listeners[e.type];if(void 0!==t){e.target=this;let n=t.slice(0);for(let t=0,r=n.length;t<r;t++)n[t].call(this,e);e.target=null}}}var c=Object.defineProperty,u=(e,t,n)=>(((e,t,n)=>t in e?c(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n)(e,"symbol"!=typeof t?t+"":t,n),n);let f=new a.RlV,d=new a.Zcv,m=Math.cos(Math.PI/180*70),h=(e,t)=>(e%t+t)%t;class p extends s{constructor(e,t){super(),u(this,"object"),u(this,"domElement"),u(this,"enabled",!0),u(this,"target",new a.Pq0),u(this,"minDistance",0),u(this,"maxDistance",1/0),u(this,"minZoom",0),u(this,"maxZoom",1/0),u(this,"minPolarAngle",0),u(this,"maxPolarAngle",Math.PI),u(this,"minAzimuthAngle",-1/0),u(this,"maxAzimuthAngle",1/0),u(this,"enableDamping",!1),u(this,"dampingFactor",.05),u(this,"enableZoom",!0),u(this,"zoomSpeed",1),u(this,"enableRotate",!0),u(this,"rotateSpeed",1),u(this,"enablePan",!0),u(this,"panSpeed",1),u(this,"screenSpacePanning",!0),u(this,"keyPanSpeed",7),u(this,"zoomToCursor",!1),u(this,"autoRotate",!1),u(this,"autoRotateSpeed",2),u(this,"reverseOrbit",!1),u(this,"reverseHorizontalOrbit",!1),u(this,"reverseVerticalOrbit",!1),u(this,"keys",{LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"}),u(this,"mouseButtons",{LEFT:a.kBv.ROTATE,MIDDLE:a.kBv.DOLLY,RIGHT:a.kBv.PAN}),u(this,"touches",{ONE:a.wtR.ROTATE,TWO:a.wtR.DOLLY_PAN}),u(this,"target0"),u(this,"position0"),u(this,"zoom0"),u(this,"_domElementKeyEvents",null),u(this,"getPolarAngle"),u(this,"getAzimuthalAngle"),u(this,"setPolarAngle"),u(this,"setAzimuthalAngle"),u(this,"getDistance"),u(this,"getZoomScale"),u(this,"listenToKeyEvents"),u(this,"stopListenToKeyEvents"),u(this,"saveState"),u(this,"reset"),u(this,"update"),u(this,"connect"),u(this,"dispose"),u(this,"dollyIn"),u(this,"dollyOut"),u(this,"getScale"),u(this,"setScale"),this.object=e,this.domElement=t,this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this.getPolarAngle=()=>p.phi,this.getAzimuthalAngle=()=>p.theta,this.setPolarAngle=e=>{let t=h(e,2*Math.PI),r=p.phi;r<0&&(r+=2*Math.PI),t<0&&(t+=2*Math.PI);let o=Math.abs(t-r);2*Math.PI-o<o&&(t<r?t+=2*Math.PI:r+=2*Math.PI),v.phi=t-r,n.update()},this.setAzimuthalAngle=e=>{let t=h(e,2*Math.PI),r=p.theta;r<0&&(r+=2*Math.PI),t<0&&(t+=2*Math.PI);let o=Math.abs(t-r);2*Math.PI-o<o&&(t<r?t+=2*Math.PI:r+=2*Math.PI),v.theta=t-r,n.update()},this.getDistance=()=>n.object.position.distanceTo(n.target),this.listenToKeyEvents=e=>{e.addEventListener("keydown",ee),this._domElementKeyEvents=e},this.stopListenToKeyEvents=()=>{this._domElementKeyEvents.removeEventListener("keydown",ee),this._domElementKeyEvents=null},this.saveState=()=>{n.target0.copy(n.target),n.position0.copy(n.object.position),n.zoom0=n.object.zoom},this.reset=()=>{n.target.copy(n.target0),n.object.position.copy(n.position0),n.object.zoom=n.zoom0,n.object.updateProjectionMatrix(),n.dispatchEvent(r),n.update(),s=l.NONE},this.update=(()=>{let t=new a.Pq0,o=new a.Pq0(0,1,0),i=new a.PTz().setFromUnitVectors(e.up,o),u=i.clone().invert(),h=new a.Pq0,y=new a.PTz,w=2*Math.PI;return function(){let x=n.object.position;i.setFromUnitVectors(e.up,o),u.copy(i).invert(),t.copy(x).sub(n.target),t.applyQuaternion(i),p.setFromVector3(t),n.autoRotate&&s===l.NONE&&z(2*Math.PI/60/60*n.autoRotateSpeed),n.enableDamping?(p.theta+=v.theta*n.dampingFactor,p.phi+=v.phi*n.dampingFactor):(p.theta+=v.theta,p.phi+=v.phi);let E=n.minAzimuthAngle,P=n.maxAzimuthAngle;isFinite(E)&&isFinite(P)&&(E<-Math.PI?E+=w:E>Math.PI&&(E-=w),P<-Math.PI?P+=w:P>Math.PI&&(P-=w),E<=P?p.theta=Math.max(E,Math.min(P,p.theta)):p.theta=p.theta>(E+P)/2?Math.max(E,p.theta):Math.min(P,p.theta)),p.phi=Math.max(n.minPolarAngle,Math.min(n.maxPolarAngle,p.phi)),p.makeSafe(),!0===n.enableDamping?n.target.addScaledVector(b,n.dampingFactor):n.target.add(b),n.zoomToCursor&&_||n.object.isOrthographicCamera?p.radius=q(p.radius):p.radius=q(p.radius*g),t.setFromSpherical(p),t.applyQuaternion(u),x.copy(n.target).add(t),n.object.matrixAutoUpdate||n.object.updateMatrix(),n.object.lookAt(n.target),!0===n.enableDamping?(v.theta*=1-n.dampingFactor,v.phi*=1-n.dampingFactor,b.multiplyScalar(1-n.dampingFactor)):(v.set(0,0,0),b.set(0,0,0));let M=!1;if(n.zoomToCursor&&_){let r=null;if(n.object instanceof a.ubm&&n.object.isPerspectiveCamera){let e=t.length();r=q(e*g);let o=e-r;n.object.position.addScaledVector(C,o),n.object.updateMatrixWorld()}else if(n.object.isOrthographicCamera){let e=new a.Pq0(O.x,O.y,0);e.unproject(n.object),n.object.zoom=Math.max(n.minZoom,Math.min(n.maxZoom,n.object.zoom/g)),n.object.updateProjectionMatrix(),M=!0;let o=new a.Pq0(O.x,O.y,0);o.unproject(n.object),n.object.position.sub(o).add(e),n.object.updateMatrixWorld(),r=t.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),n.zoomToCursor=!1;null!==r&&(n.screenSpacePanning?n.target.set(0,0,-1).transformDirection(n.object.matrix).multiplyScalar(r).add(n.object.position):(f.origin.copy(n.object.position),f.direction.set(0,0,-1).transformDirection(n.object.matrix),Math.abs(n.object.up.dot(f.direction))<m?e.lookAt(n.target):(d.setFromNormalAndCoplanarPoint(n.object.up,n.target),f.intersectPlane(d,n.target))))}else n.object instanceof a.qUd&&n.object.isOrthographicCamera&&(M=1!==g)&&(n.object.zoom=Math.max(n.minZoom,Math.min(n.maxZoom,n.object.zoom/g)),n.object.updateProjectionMatrix());return g=1,_=!1,!!(M||h.distanceToSquared(n.object.position)>c||8*(1-y.dot(n.object.quaternion))>c)&&(n.dispatchEvent(r),h.copy(n.object.position),y.copy(n.object.quaternion),M=!1,!0)}})(),this.connect=e=>{n.domElement=e,n.domElement.style.touchAction="none",n.domElement.addEventListener("contextmenu",et),n.domElement.addEventListener("pointerdown",K),n.domElement.addEventListener("pointercancel",Q),n.domElement.addEventListener("wheel",J)},this.dispose=()=>{var e,t,r,o,i,a;n.domElement&&(n.domElement.style.touchAction="auto"),null==(e=n.domElement)||e.removeEventListener("contextmenu",et),null==(t=n.domElement)||t.removeEventListener("pointerdown",K),null==(r=n.domElement)||r.removeEventListener("pointercancel",Q),null==(o=n.domElement)||o.removeEventListener("wheel",J),null==(i=n.domElement)||i.ownerDocument.removeEventListener("pointermove",G),null==(a=n.domElement)||a.ownerDocument.removeEventListener("pointerup",Q),null!==n._domElementKeyEvents&&n._domElementKeyEvents.removeEventListener("keydown",ee)};let n=this,r={type:"change"},o={type:"start"},i={type:"end"},l={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},s=l.NONE,c=1e-6,p=new a.YHV,v=new a.YHV,g=1,b=new a.Pq0,y=new a.I9Y,w=new a.I9Y,x=new a.I9Y,E=new a.I9Y,P=new a.I9Y,M=new a.I9Y,S=new a.I9Y,j=new a.I9Y,T=new a.I9Y,C=new a.Pq0,O=new a.I9Y,_=!1,A=[],R={};function L(){return Math.pow(.95,n.zoomSpeed)}function z(e){n.reverseOrbit||n.reverseHorizontalOrbit?v.theta+=e:v.theta-=e}function k(e){n.reverseOrbit||n.reverseVerticalOrbit?v.phi+=e:v.phi-=e}let I=(()=>{let e=new a.Pq0;return function(t,n){e.setFromMatrixColumn(n,0),e.multiplyScalar(-t),b.add(e)}})(),D=(()=>{let e=new a.Pq0;return function(t,r){!0===n.screenSpacePanning?e.setFromMatrixColumn(r,1):(e.setFromMatrixColumn(r,0),e.crossVectors(n.object.up,e)),e.multiplyScalar(t),b.add(e)}})(),N=(()=>{let e=new a.Pq0;return function(t,r){let o=n.domElement;if(o&&n.object instanceof a.ubm&&n.object.isPerspectiveCamera){let i=n.object.position;e.copy(i).sub(n.target);let a=e.length();I(2*t*(a*=Math.tan(n.object.fov/2*Math.PI/180))/o.clientHeight,n.object.matrix),D(2*r*a/o.clientHeight,n.object.matrix)}else o&&n.object instanceof a.qUd&&n.object.isOrthographicCamera?(I(t*(n.object.right-n.object.left)/n.object.zoom/o.clientWidth,n.object.matrix),D(r*(n.object.top-n.object.bottom)/n.object.zoom/o.clientHeight,n.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),n.enablePan=!1)}})();function F(e){n.object instanceof a.ubm&&n.object.isPerspectiveCamera||n.object instanceof a.qUd&&n.object.isOrthographicCamera?g=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),n.enableZoom=!1)}function Y(e){if(!n.zoomToCursor||!n.domElement)return;_=!0;let t=n.domElement.getBoundingClientRect(),r=e.clientX-t.left,o=e.clientY-t.top,i=t.width,a=t.height;O.x=r/i*2-1,O.y=-(o/a*2)+1,C.set(O.x,O.y,1).unproject(n.object).sub(n.object.position).normalize()}function q(e){return Math.max(n.minDistance,Math.min(n.maxDistance,e))}function W(e){y.set(e.clientX,e.clientY)}function H(e){E.set(e.clientX,e.clientY)}function B(){if(1==A.length)y.set(A[0].pageX,A[0].pageY);else{let e=.5*(A[0].pageX+A[1].pageX),t=.5*(A[0].pageY+A[1].pageY);y.set(e,t)}}function V(){if(1==A.length)E.set(A[0].pageX,A[0].pageY);else{let e=.5*(A[0].pageX+A[1].pageX),t=.5*(A[0].pageY+A[1].pageY);E.set(e,t)}}function U(){let e=A[0].pageX-A[1].pageX,t=A[0].pageY-A[1].pageY,n=Math.sqrt(e*e+t*t);S.set(0,n)}function Z(e){if(1==A.length)w.set(e.pageX,e.pageY);else{let t=er(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);w.set(n,r)}x.subVectors(w,y).multiplyScalar(n.rotateSpeed);let t=n.domElement;t&&(z(2*Math.PI*x.x/t.clientHeight),k(2*Math.PI*x.y/t.clientHeight)),y.copy(w)}function X(e){if(1==A.length)P.set(e.pageX,e.pageY);else{let t=er(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);P.set(n,r)}M.subVectors(P,E).multiplyScalar(n.panSpeed),N(M.x,M.y),E.copy(P)}function $(e){var t;let r=er(e),o=e.pageX-r.x,i=e.pageY-r.y,a=Math.sqrt(o*o+i*i);j.set(0,a),T.set(0,Math.pow(j.y/S.y,n.zoomSpeed)),t=T.y,F(g/t),S.copy(j)}function K(e){var t,r,i;!1!==n.enabled&&(0===A.length&&(null==(t=n.domElement)||t.ownerDocument.addEventListener("pointermove",G),null==(r=n.domElement)||r.ownerDocument.addEventListener("pointerup",Q)),i=e,A.push(i),"touch"===e.pointerType?function(e){switch(en(e),A.length){case 1:switch(n.touches.ONE){case a.wtR.ROTATE:if(!1===n.enableRotate)return;B(),s=l.TOUCH_ROTATE;break;case a.wtR.PAN:if(!1===n.enablePan)return;V(),s=l.TOUCH_PAN;break;default:s=l.NONE}break;case 2:switch(n.touches.TWO){case a.wtR.DOLLY_PAN:if(!1===n.enableZoom&&!1===n.enablePan)return;n.enableZoom&&U(),n.enablePan&&V(),s=l.TOUCH_DOLLY_PAN;break;case a.wtR.DOLLY_ROTATE:if(!1===n.enableZoom&&!1===n.enableRotate)return;n.enableZoom&&U(),n.enableRotate&&B(),s=l.TOUCH_DOLLY_ROTATE;break;default:s=l.NONE}break;default:s=l.NONE}s!==l.NONE&&n.dispatchEvent(o)}(e):function(e){let t;switch(e.button){case 0:t=n.mouseButtons.LEFT;break;case 1:t=n.mouseButtons.MIDDLE;break;case 2:t=n.mouseButtons.RIGHT;break;default:t=-1}switch(t){case a.kBv.DOLLY:if(!1===n.enableZoom)return;Y(e),S.set(e.clientX,e.clientY),s=l.DOLLY;break;case a.kBv.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(!1===n.enablePan)return;H(e),s=l.PAN}else{if(!1===n.enableRotate)return;W(e),s=l.ROTATE}break;case a.kBv.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(!1===n.enableRotate)return;W(e),s=l.ROTATE}else{if(!1===n.enablePan)return;H(e),s=l.PAN}break;default:s=l.NONE}s!==l.NONE&&n.dispatchEvent(o)}(e))}function G(e){!1!==n.enabled&&("touch"===e.pointerType?function(e){switch(en(e),s){case l.TOUCH_ROTATE:if(!1===n.enableRotate)return;Z(e),n.update();break;case l.TOUCH_PAN:if(!1===n.enablePan)return;X(e),n.update();break;case l.TOUCH_DOLLY_PAN:if(!1===n.enableZoom&&!1===n.enablePan)return;n.enableZoom&&$(e),n.enablePan&&X(e),n.update();break;case l.TOUCH_DOLLY_ROTATE:if(!1===n.enableZoom&&!1===n.enableRotate)return;n.enableZoom&&$(e),n.enableRotate&&Z(e),n.update();break;default:s=l.NONE}}(e):function(e){if(!1!==n.enabled)switch(s){case l.ROTATE:if(!1===n.enableRotate)return;w.set(e.clientX,e.clientY),x.subVectors(w,y).multiplyScalar(n.rotateSpeed);let t=n.domElement;t&&(z(2*Math.PI*x.x/t.clientHeight),k(2*Math.PI*x.y/t.clientHeight)),y.copy(w),n.update();break;case l.DOLLY:var r,o;if(!1===n.enableZoom)return;(j.set(e.clientX,e.clientY),T.subVectors(j,S),T.y>0)?(r=L(),F(g/r)):T.y<0&&(o=L(),F(g*o)),S.copy(j),n.update();break;case l.PAN:if(!1===n.enablePan)return;P.set(e.clientX,e.clientY),M.subVectors(P,E).multiplyScalar(n.panSpeed),N(M.x,M.y),E.copy(P),n.update()}}(e))}function Q(e){var t,r,o;(function(e){delete R[e.pointerId];for(let t=0;t<A.length;t++)if(A[t].pointerId==e.pointerId)return void A.splice(t,1)})(e),0===A.length&&(null==(t=n.domElement)||t.releasePointerCapture(e.pointerId),null==(r=n.domElement)||r.ownerDocument.removeEventListener("pointermove",G),null==(o=n.domElement)||o.ownerDocument.removeEventListener("pointerup",Q)),n.dispatchEvent(i),s=l.NONE}function J(e){if(!1!==n.enabled&&!1!==n.enableZoom&&(s===l.NONE||s===l.ROTATE)){var t,r;e.preventDefault(),n.dispatchEvent(o),(Y(e),e.deltaY<0)?(t=L(),F(g*t)):e.deltaY>0&&(r=L(),F(g/r)),n.update(),n.dispatchEvent(i)}}function ee(e){if(!1!==n.enabled&&!1!==n.enablePan){let t=!1;switch(e.code){case n.keys.UP:N(0,n.keyPanSpeed),t=!0;break;case n.keys.BOTTOM:N(0,-n.keyPanSpeed),t=!0;break;case n.keys.LEFT:N(n.keyPanSpeed,0),t=!0;break;case n.keys.RIGHT:N(-n.keyPanSpeed,0),t=!0}t&&(e.preventDefault(),n.update())}}function et(e){!1!==n.enabled&&e.preventDefault()}function en(e){let t=R[e.pointerId];void 0===t&&(t=new a.I9Y,R[e.pointerId]=t),t.set(e.pageX,e.pageY)}function er(e){return R[(e.pointerId===A[0].pointerId?A[1]:A[0]).pointerId]}this.dollyIn=(e=L())=>{F(g*e),n.update()},this.dollyOut=(e=L())=>{F(g/e),n.update()},this.getScale=()=>g,this.setScale=e=>{F(e),n.update()},this.getZoomScale=()=>L(),void 0!==t&&this.connect(t),this.update()}}let v=i.forwardRef(({makeDefault:e,camera:t,regress:n,domElement:a,enableDamping:l=!0,keyEvents:s=!1,onChange:c,onStart:u,onEnd:f,...d},m)=>{let h=(0,o.D)(e=>e.invalidate),v=(0,o.D)(e=>e.camera),g=(0,o.D)(e=>e.gl),b=(0,o.D)(e=>e.events),y=(0,o.D)(e=>e.setEvents),w=(0,o.D)(e=>e.set),x=(0,o.D)(e=>e.get),E=(0,o.D)(e=>e.performance),P=t||v,M=a||b.connected||g.domElement,S=i.useMemo(()=>new p(P),[P]);return(0,o.F)(()=>{S.enabled&&S.update()},-1),i.useEffect(()=>(s&&S.connect(!0===s?M:s),S.connect(M),()=>void S.dispose()),[s,M,n,S,h]),i.useEffect(()=>{let e=e=>{h(),n&&E.regress(),c&&c(e)},t=e=>{u&&u(e)},r=e=>{f&&f(e)};return S.addEventListener("change",e),S.addEventListener("start",t),S.addEventListener("end",r),()=>{S.removeEventListener("start",t),S.removeEventListener("end",r),S.removeEventListener("change",e)}},[c,u,f,S,h,y]),i.useEffect(()=>{if(e){let e=x().controls;return w({controls:S}),()=>w({controls:e})}},[e,S]),i.createElement("primitive",(0,r.A)({ref:m,object:S,enableDamping:l},d))})},8717:(e,t,n)=>{n.d(t,{m:()=>f});var r=n(8945),o=n(2115),i=n(5339);let a=parseInt(i.sPf.replace(/\D+/g,""));var l=Object.defineProperty,s=(e,t,n)=>(((e,t,n)=>t in e?l(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n)(e,"symbol"!=typeof t?t+"":t,n),n);let c=(()=>{let e={uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new i.Pq0},up:{value:new i.Pq0(0,1,0)}},vertexShader:`
      uniform vec3 sunPosition;
      uniform float rayleigh;
      uniform float turbidity;
      uniform float mieCoefficient;
      uniform vec3 up;

      varying vec3 vWorldPosition;
      varying vec3 vSunDirection;
      varying float vSunfade;
      varying vec3 vBetaR;
      varying vec3 vBetaM;
      varying float vSunE;

      // constants for atmospheric scattering
      const float e = 2.71828182845904523536028747135266249775724709369995957;
      const float pi = 3.141592653589793238462643383279502884197169;

      // wavelength of used primaries, according to preetham
      const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
      // this pre-calcuation replaces older TotalRayleigh(vec3 lambda) function:
      // (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
      const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

      // mie stuff
      // K coefficient for the primaries
      const float v = 4.0;
      const vec3 K = vec3( 0.686, 0.678, 0.666 );
      // MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
      const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

      // earth shadow hack
      // cutoffAngle = pi / 1.95;
      const float cutoffAngle = 1.6110731556870734;
      const float steepness = 1.5;
      const float EE = 1000.0;

      float sunIntensity( float zenithAngleCos ) {
        zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
        return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
      }

      vec3 totalMie( float T ) {
        float c = ( 0.2 * T ) * 10E-18;
        return 0.434 * c * MieConst;
      }

      void main() {

        vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
        vWorldPosition = worldPosition.xyz;

        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        gl_Position.z = gl_Position.w; // set z to camera.far

        vSunDirection = normalize( sunPosition );

        vSunE = sunIntensity( dot( vSunDirection, up ) );

        vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );

        float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );

      // extinction (absorbtion + out scattering)
      // rayleigh coefficients
        vBetaR = totalRayleigh * rayleighCoefficient;

      // mie coefficients
        vBetaM = totalMie( turbidity ) * mieCoefficient;

      }
    `,fragmentShader:`
      varying vec3 vWorldPosition;
      varying vec3 vSunDirection;
      varying float vSunfade;
      varying vec3 vBetaR;
      varying vec3 vBetaM;
      varying float vSunE;

      uniform float mieDirectionalG;
      uniform vec3 up;

      const vec3 cameraPos = vec3( 0.0, 0.0, 0.0 );

      // constants for atmospheric scattering
      const float pi = 3.141592653589793238462643383279502884197169;

      const float n = 1.0003; // refractive index of air
      const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

      // optical length at zenith for molecules
      const float rayleighZenithLength = 8.4E3;
      const float mieZenithLength = 1.25E3;
      // 66 arc seconds -> degrees, and the cosine of that
      const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

      // 3.0 / ( 16.0 * pi )
      const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
      // 1.0 / ( 4.0 * pi )
      const float ONE_OVER_FOURPI = 0.07957747154594767;

      float rayleighPhase( float cosTheta ) {
        return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
      }

      float hgPhase( float cosTheta, float g ) {
        float g2 = pow( g, 2.0 );
        float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
        return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
      }

      void main() {

        vec3 direction = normalize( vWorldPosition - cameraPos );

      // optical length
      // cutoff angle at 90 to avoid singularity in next formula.
        float zenithAngle = acos( max( 0.0, dot( up, direction ) ) );
        float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
        float sR = rayleighZenithLength * inverse;
        float sM = mieZenithLength * inverse;

      // combined extinction factor
        vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

      // in scattering
        float cosTheta = dot( direction, vSunDirection );

        float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
        vec3 betaRTheta = vBetaR * rPhase;

        float mPhase = hgPhase( cosTheta, mieDirectionalG );
        vec3 betaMTheta = vBetaM * mPhase;

        vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
        Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );

      // nightsky
        float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
        float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
        vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
        vec3 L0 = vec3( 0.1 ) * Fex;

      // composition + solar disc
        float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
        L0 += ( vSunE * 19000.0 * Fex ) * sundisk;

        vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

        vec3 retColor = pow( texColor, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );

        gl_FragColor = vec4( retColor, 1.0 );

      #include <tonemapping_fragment>
      #include <${a>=154?"colorspace_fragment":"encodings_fragment"}>

      }
    `},t=new i.BKk({name:"SkyShader",fragmentShader:e.fragmentShader,vertexShader:e.vertexShader,uniforms:i.LlO.clone(e.uniforms),side:i.hsX,depthWrite:!1});class n extends i.eaF{constructor(){super(new i.iNn(1,1,1),t)}}return s(n,"SkyShader",e),s(n,"material",t),n})();function u(e,t,n=new i.Pq0){let r=Math.PI*(e-.5),o=2*Math.PI*(t-.5);return n.x=Math.cos(o),n.y=Math.sin(r),n.z=Math.sin(o),n}let f=o.forwardRef(({inclination:e=.6,azimuth:t=.1,distance:n=1e3,mieCoefficient:a=.005,mieDirectionalG:l=.8,rayleigh:s=.5,turbidity:f=10,sunPosition:d=u(e,t),...m},h)=>{let p=o.useMemo(()=>new i.Pq0().setScalar(n),[n]),[v]=o.useState(()=>new c);return o.createElement("primitive",(0,r.A)({object:v,ref:h,"material-uniforms-mieCoefficient-value":a,"material-uniforms-mieDirectionalG-value":l,"material-uniforms-rayleigh-value":s,"material-uniforms-sunPosition-value":d,"material-uniforms-turbidity-value":f,scale:p},m))})},8828:(e,t,n)=>{e.exports=n(3654)},8945:(e,t,n)=>{n.d(t,{A:()=>r});function r(){return(r=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)({}).hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e}).apply(null,arguments)}},8995:(e,t,n)=>{n.d(t,{mK:()=>L,s0:()=>A,Jp:()=>k});var r=n(6595),o=n(2115),i=n(5339),a=n(5155),l=n(3303);function s(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}new i.I9Y,new i.I9Y;function c(e,t){if(!(e instanceof t))throw TypeError("Cannot call a class as a function")}var u=function e(t,n,r){var o=this;c(this,e),s(this,"dot2",function(e,t){return o.x*e+o.y*t}),s(this,"dot3",function(e,t,n){return o.x*e+o.y*t+o.z*n}),this.x=t,this.y=n,this.z=r},f=[new u(1,1,0),new u(-1,1,0),new u(1,-1,0),new u(-1,-1,0),new u(1,0,1),new u(-1,0,1),new u(1,0,-1),new u(-1,0,-1),new u(0,1,1),new u(0,-1,1),new u(0,1,-1),new u(0,-1,-1)],d=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180],m=Array(512),h=Array(512);!function(e){e>0&&e<1&&(e*=65536),(e=Math.floor(e))<256&&(e|=e<<8);for(var t,n=0;n<256;n++)t=1&n?d[n]^255&e:d[n]^e>>8&255,m[n]=m[n+256]=t,h[n]=h[n+256]=f[t%12]}(0);function p(e){var t=function(e){if("number"==typeof e)e=Math.abs(e);else if("string"==typeof e){var t=e;e=0;for(var n=0;n<t.length;n++)e=(e+(n+1)*(t.charCodeAt(n)%96))%0x7fffffff}return 0===e&&(e=311),e}(e);return function(){var e=48271*t%0x7fffffff;return t=e,e/0x7fffffff}}new function e(t){var n=this;c(this,e),s(this,"seed",0),s(this,"init",function(e){n.seed=e,n.value=p(e)}),s(this,"value",p(this.seed)),this.init(t)}(Math.random());i.LoY;n(1948);var v=new WeakMap,g=0,b=["blendMode-blendFunction","blendMode-opacity-value"];function y(e){return function({blendFunction:t,opacity:n,ref:i,...l}){let s=v.get(e);if(!s){let t=`@react-three/postprocessing/${e.name}-${g++}`;(0,r.e)({[t]:e}),v.set(e,s=t)}let c=(0,r.D)(e=>e.camera),u=(0,o.useRef)(null),f=(0,o.useCallback)(e=>{if(u.current=e,"function"!=typeof i){i&&(i.current=e);return}let t=i(e);if("function"==typeof t)return()=>{u.current=null,t()}},[u,i]);return!function(e,t,n,i=function(e,t){let n=e;for(let e of t.split("-")){if(null==n)return;n=n[e]}return n},a=function(e,t,n){let r=t.split("-"),o=e;for(let e=0;e<r.length-1;e++){if(null==o)return;o=o[r[e]]}null!=o&&(o[r[r.length-1]]=n)}){let l=(0,o.useRef)(null),s=(0,r.D)(e=>e.invalidate);(0,o.useLayoutEffect)(()=>{let r="object"==typeof e&&null!=e&&"current"in e?e.current:e;if(!r)return;l.current?.instance!==r&&(l.current={instance:r,defaults:new Map,applied:new Map});let{defaults:o,applied:c}=l.current,u=!1;for(let e of n){if(!o.has(e)){let t=i(r,e);o.set(e,t),c.set(e,t)}let n=void 0!==t[e]?t[e]:o.get(e);Object.is(c.get(e),n)||(a(r,e,n),c.set(e,n),u=!0)}u&&s()})}(u,{"blendMode-blendFunction":t,"blendMode-opacity-value":n},b),(0,a.jsx)(s,{ref:f,camera:c,...l})}}var w=(0,o.createContext)(null),x=e=>(2&e.getAttributes())==2,E=e=>/mainUv/.test(e.getFragmentShader()??"");function P(e){let t=new WeakMap;return{acquire(n,r){let o=t.get(n);o?(o.count++,o.forcedValue=r):t.set(n,{count:1,original:n[e],forcedValue:r})},release(n){let r=t.get(n);r&&--r.count<=0&&(n[e]===r.forcedValue&&(n[e]=r.original),t.delete(n))}}}var M=P("autoClear"),S=P("toneMapping"),j=new i.I9Y,T=(e,t)=>new l.AH(e,t),C=new WeakSet,O=new WeakSet;function _(e){C.has(e)&&(e instanceof l.Vu&&e.setEffects([]),l.oF.prototype.dispose.call(e))}var A=(0,o.memo)(function({children:e,camera:t,scene:n,resolutionScale:s,enabled:c=!0,renderPriority:u=1,autoClear:f=!0,autoRenderToScreen:d=!0,depthBuffer:m,enableNormalPass:h,stencilBuffer:p,multisampling:v=4,frameBufferType:g=i.ix0,renderPass:b=T,mergeMode:y="auto",ref:P}){let{gl:A,scene:R,camera:L}=(0,r.D)(),z=n||R,k=t||L;A.getSize(j);let[I,D]=(0,o.useState)(null),[,N]=(0,o.useReducer)(e=>e+1,0);(0,o.useEffect)(()=>{M.acquire(A,!1);let e=new l.s0(A,{depthBuffer:m,stencilBuffer:p,multisampling:v,frameBufferType:g});e.autoRenderToScreen=d,e.addPass(b(z,k));let t=null,n=null;return h&&((t=new l.Xe(z,k)).enabled=!1,e.addPass(t),void 0!==s&&((n=new l.SP({normalBuffer:t.texture,resolutionScale:s})).enabled=!1,e.addPass(n))),e.setSize(j.width,j.height),D({composer:e,normalPass:t,downSamplingPass:n}),()=>{for(let t of e.passes)_(t);e.dispose(),M.release(A)}},[k,A,m,p,v,g,d,b,z,h,s]);let F=(0,o.useRef)({width:-1,height:-1,pixelRatio:-1});(0,r.F)((e,t)=>{if(!c||!I)return;let{composer:n}=I;A.getSize(j);let r=A.getPixelRatio(),o=F.current;(j.width!==o.width||j.height!==o.height||r!==o.pixelRatio)&&(n.setSize(j.width,j.height),o.width=j.width,o.height=j.height,o.pixelRatio=r);let i=A.autoClear;A.autoClear=f,p&&!f&&A.clearStencil(),n.render(t),A.autoClear=i},c?u:0);let Y=(0,o.useRef)(null),q=(0,o.useRef)([]),[W,H]=(0,o.useState)(0);(0,o.useLayoutEffect)(()=>{I&&function(e,t){let n=e.current;return!(t.length===n.length&&t.every((e,t)=>e===n[t]))&&(e.current=t,!0)}(q,function(e,t){let n=e.__r3f;return n?n.children.map(e=>e.object).filter(t):[]}(Y.current,e=>e instanceof l.Mj||e instanceof l.oF))&&H(e=>e+1)}),(0,o.useLayoutEffect)(()=>{if(!I)return;let{composer:e,normalPass:t,downSamplingPass:n}=I,r=function(e,t,n){let r=[];for(let o=0;o<e.length;o++){let i=e[o];if(i instanceof l.Mj){let a=[i],s=x(i),c=E(i);if("none"!==n){let t;for(;(t=e[o+1])instanceof l.Mj;){let e=x(t),r=E(t);if("auto"===n&&(s&&e||s&&r||c&&e))break;a.push(t),s||=e,c||=r,o++}}let u=new l.Vu(t,...a);C.add(u),r.push(u)}else i instanceof l.oF&&r.push(i)}return r}(q.current,k,y);if(r.some(e=>O.has(e))){let e=new l.nV;C.add(e),r.push(e)}for(let t of r)e.addPass(t);return r.length&&(t&&(t.enabled=!0),n&&(n.enabled=!0)),()=>{for(let t of r)e.removePass(t),_(t);t&&(t.enabled=!1),n&&(n.enabled=!1)}},[I,W,k,y]),(0,o.useEffect)(()=>(S.acquire(A,i.y_p),A.toneMapping=i.y_p,()=>{S.release(A)}),[A]);let B=(0,o.useMemo)(()=>I?{composer:I.composer,normalPass:I.normalPass,downSamplingPass:I.downSamplingPass,resolutionScale:s,camera:k,scene:z,requestRebuild:N,autoClear:f}:null,[I,s,k,z,N,f]);return((0,o.useImperativeHandle)(P,()=>I?.composer,[I]),B)?(0,a.jsx)(w.Provider,{value:B,children:(0,a.jsx)("group",{ref:Y,children:e})}):null});l.Mj;var R=y(l.bv);function L({blendFunction:e=0,luminanceThreshold:t,luminanceSmoothing:n,mipmapBlur:r,radius:i,levels:l,resolutionScale:s,resolutionX:c,resolutionY:u,...f}){let d=(0,o.useMemo)(()=>[{luminanceThreshold:t,luminanceSmoothing:n,mipmapBlur:r,radius:i,levels:l,resolutionScale:s,resolutionX:c,resolutionY:u}],[t,n,r,i,l,s,c,u]);return(0,a.jsx)(R,{blendFunction:e,args:d,...f})}l.Mj;l.Mj;l.Mj;l.Mj;l.Mj;l.Mj;var z=y(l.eF);function k({preset:e,edgeDetectionMode:t,predicationMode:n,...r}){let i=(0,o.useMemo)(()=>[{preset:e,edgeDetectionMode:t,predicationMode:n}],[e,t,n]);return(0,a.jsx)(z,{args:i,...r})}l.Mj;l.Mj},9914:(e,t,n)=>{e.exports=n(6451)}}]);