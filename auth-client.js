/* JWT access stays in memory; rotated refresh tokens use an HttpOnly cookie. */
window.BlogAuth = (() => {
    let token=null, refreshPromise=null;
    async function refresh(){
        if(!refreshPromise){
            const operation=async()=>{const response=await fetch('/api/auth/refresh',{method:'POST',credentials:'same-origin'});if(!response.ok){token=null;return false;}token=(await response.json()).accessToken;return true;};
            refreshPromise=(navigator.locks?navigator.locks.request('swopblog-refresh',operation):operation()).finally(()=>{refreshPromise=null;});
        }
        return refreshPromise;
    }
    async function request(path,{method='GET',body,auth=true,retry=true}={}){
        const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json',...(auth&&token?{Authorization:'Bearer '+token}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
        if(response.status===401&&auth&&retry){if(await refresh())return request(path,{method,body,auth,retry:false});window.dispatchEvent(new Event('blog-session-expired'));}
        const data=await response.json().catch(()=>({}));
        if(!response.ok){const error=new Error(data.error?.message||`Request failed (${response.status})`);error.status=response.status;throw error;}
        return data;
    }
    return {request,resume:refresh,async login(email,password){const result=await request('/auth/login',{method:'POST',body:{email,password},auth:false});token=result.accessToken;},clear(){token=null;}};
})();
