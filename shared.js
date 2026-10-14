/* Shared server mode: no account token, published story or reply is stored in localStorage. */
function initSharedBlog() {
    const $=id=>document.getElementById(id), request=BlogAuth.request;
    let viewer=null,nextPage=null,editing=null,editRevision=null,registering=false,loading=false,searchTimer=null,feedGeneration=0;
    const openComments=new Set(),commentPages=new Map();
    const guest={name:'Join the conversation',username:'Reader',bio:'Read stories, share an idea, and make space for a conversation.',avatar_url:'avatar.svg'};
    $('appModeBadge').textContent='Shared workspace';
    $('modeNotice').textContent='Stories are shared through this local server. Sign in to write, reply, or save a draft. Email delivery is not configured.';
    $('sharedFilters').hidden=false;$('draftChoice').hidden=false;
    initPresetAvatars();
    function updateIdentity(){
        appProfile=viewer?{name:viewer.name,username:'Signed-in author',bio:viewer.bio,avatar_url:viewer.avatar_url||'avatar.svg'}:{...guest};
        updateProfileUI();$('signInButton').hidden=Boolean(viewer);$('signOutButton').hidden=!viewer;$('accountButton').hidden=!viewer;
        $('btnOpenProfileModal').textContent=viewer?'Edit profile':'Sign in to personalize';
        for(const option of $('feedScope').options)if(option.value!=='public')option.disabled=!viewer;
        if(!viewer&&$('feedScope').value!=='public')$('feedScope').value='public';
    }
    function requireLogin(){if(viewer)return true;openAuth();return false;}
    async function loadIdentity(){viewer=await request('/me');updateIdentity();}
    async function loadFeed(append=false){
        const generation=++feedGeneration;
        const params=new URLSearchParams({scope:$('feedScope').value,q:$('feedSearch').value,tag:$('feedCategory').value});
        if(append&&nextPage)params.set('before',nextPage);
        $('refreshFeed').disabled=true;$('loadMorePosts').disabled=true;
        try{const data=await request('/posts?'+params);if(generation!==feedGeneration)return;appPosts=append?[...appPosts,...data.items.filter(p=>!appPosts.some(a=>a.id===p.id))]:data.items;nextPage=data.next;commentPages.clear();renderPosts();$('loadMorePosts').hidden=!nextPage;postsCountText.textContent=`${appPosts.length} ${nextPage?'loaded ':''}stor${appPosts.length===1?'y':'ies'}`;for(const id of openComments)if(appPosts.some(p=>p.id===id))await comments(id);}
        catch(error){showToast(error.message,'danger');if(!appPosts.length)postsContainer.innerHTML='<div class="empty-feed"><h3>Could not load stories.</h3><p>Check the local server, then choose Refresh.</p></div>';}
        finally{if(generation===feedGeneration){$('refreshFeed').disabled=false;$('loadMorePosts').disabled=false;}}
    }
    async function comments(postId,append=false){
        const section=$('replies-section-'+postId);if(!section)return;section.style.display='flex';
        const params=append&&commentPages.get(postId)?.next?'?after='+commentPages.get(postId).next:'';
        try{const data=await request(`/posts/${postId}/comments${params}`);const rows=append?[...commentPages.get(postId).items,...data.items]:data.items;commentPages.set(postId,{items:rows,next:data.next});
            $('replies-list-'+postId).innerHTML=rows.length?rows.map(r=>`<div class="reply-item"><img class="reply-avatar" src="${escapeHtml(r.author_avatar||'avatar.svg')}" alt=""><div class="reply-body"><div class="reply-header"><span class="reply-author">${escapeHtml(r.author)}</span>${r.can_delete?`<button class="btn-delete-reply" data-remove-comment="${r.id}" data-post="${postId}" aria-label="Delete reply">×</button>`:''}</div><p class="reply-content">${escapeHtml(r.content)}</p></div></div>`).join(''):'<p class="text-muted">No replies yet. Start a conversation.</p>';
            if(data.next)$('replies-list-'+postId).insertAdjacentHTML('beforeend',`<button class="btn-secondary" data-more-comments="${postId}">Load more replies</button>`);
        }catch(error){showToast(error.message,'danger');}
    }
    function resetEditor(){editing=null;editRevision=null;createPostForm.reset();$('cancelStoryEdit').hidden=true;document.querySelector('.create-prompt-text').textContent='Create a new blog story';$('btnPublishPost').textContent='Publish post';}
    window.editSharedPost=id=>{if(!requireLogin())return;const post=appPosts.find(p=>p.id===id);if(!post?.can_edit)return;editing=id;editRevision=post.revision;postTitleInput.value=post.title;postContentInput.value=post.content;postTagSelect.value=post.tag;$('saveAsDraft').checked=post.status==='draft';$('cancelStoryEdit').hidden=false;document.querySelector('.create-prompt-text').textContent='Edit your story';$('btnPublishPost').textContent='Save changes';createPostForm.scrollIntoView({behavior:'smooth',block:'start'});postTitleInput.focus();};
    $('cancelStoryEdit').onclick=resetEditor;
    $('saveAsDraft').onchange=()=>$('btnPublishPost').textContent=editing?'Save changes':$('saveAsDraft').checked?'Save draft':'Publish post';
    createPostForm.onsubmit=async event=>{event.preventDefault();if(!requireLogin()||loading)return;loading=true;$('btnPublishPost').disabled=true;
        const fields={title:postTitleInput.value,content:postContentInput.value,tag:postTagSelect.value,status:$('saveAsDraft').checked?'draft':'published',...(editing?{revision:editRevision}:{})};
        try{await request(editing?'/posts/'+editing:'/posts',{method:editing?'PUT':'POST',body:fields});resetEditor();$('feedScope').value=fields.status==='draft'?'drafts':'public';await loadFeed();showToast(fields.status==='draft'?'Draft saved privately':'Story saved','success');}catch(error){showToast(error.message,'danger');}finally{loading=false;$('btnPublishPost').disabled=false;}
    };
    window.toggleRepliesSection=async id=>{if(openComments.has(id)){openComments.delete(id);$('replies-section-'+id).style.display='none';}else{openComments.add(id);await comments(id);}};
    window.handleAddReply=async(event,id)=>{event.preventDefault();if(!requireLogin())return;const input=$('reply-input-'+id),button=event.target.querySelector('button');if(button.disabled)return;button.disabled=true;
        try{await request(`/posts/${id}/comments`,{method:'POST',body:{content:input.value}});input.value='';openComments.add(id);const post=appPosts.find(p=>p.id===id);if(post)post.comments_count++;await comments(id);const count=$('post-'+id)?.querySelector('.btn-reply-toggle span');if(count)count.textContent=`Reply (${post.comments_count})`;showToast('Reply posted','success');}catch(error){showToast(error.message,'danger');}finally{button.disabled=false;}
    };
    window.handleLikePost=async(id,button)=>{if(!requireLogin()||button.disabled)return;button.disabled=true;const post=appPosts.find(p=>p.id===id);
        try{const result=await request(`/posts/${id}/like`,{method:post.liked?'DELETE':'PUT'});Object.assign(post,result);button.querySelector('.like-count').textContent=result.likes;button.classList.toggle('liked',result.liked);button.setAttribute('aria-pressed',String(result.liked));button.setAttribute('aria-label',result.liked?'Unlike story':'Like story');}catch(error){showToast(error.message,'danger');}finally{button.disabled=false;}
    };
    window.promptDeletePost=id=>{deleteConfirmModal.querySelector('.modal-feedback')?.remove();pendingDeleteAction={type:'post',postId:id};deleteModalMessage.textContent='Delete this story and its replies? This cannot be undone.';deleteConfirmModal.showModal();};
    window.promptDeleteReply=(postId,replyId)=>{deleteConfirmModal.querySelector('.modal-feedback')?.remove();pendingDeleteAction={type:'reply',postId,replyId};deleteModalMessage.textContent='Delete this reply? This cannot be undone.';deleteConfirmModal.showModal();};
    $('btnConfirmDelete').onclick=async()=>{if(!pendingDeleteAction)return;const action={...pendingDeleteAction};$('btnConfirmDelete').disabled=true;try{await request(action.type==='post'?'/posts/'+action.postId:'/comments/'+action.replyId,{method:'DELETE'});closeDeleteModal();await loadFeed();showToast('Deleted','success');}catch(error){showToast(error.message,'danger');}finally{$('btnConfirmDelete').disabled=false;}};
    $('btnCloseDeleteModal').onclick=$('btnCancelDelete').onclick=closeDeleteModal;
    postsContainer.addEventListener('click',event=>{const more=event.target.closest('[data-more-comments]'),remove=event.target.closest('[data-remove-comment]');if(more)comments(Number(more.dataset.moreComments),true);if(remove)promptDeleteReply(Number(remove.dataset.post),Number(remove.dataset.removeComment));});
    $('btnOpenProfileModal').onclick=()=>{if(requireLogin())openProfileModal();};
    $('btnCloseProfileModal').onclick=$('btnCancelProfileModal').onclick=closeProfileModal;
    $('btnSaveProfile').onclick=async()=>{if(!viewer)return;$('btnSaveProfile').disabled=true;try{const result=await request('/me',{method:'PUT',body:{name:editProfileName.value,bio:editProfileBio.value,avatar_url:selectedAvatarDataUrl||selectedPresetAvatar||viewer.avatar_url||''}});Object.assign(viewer,result);updateIdentity();closeProfileModal();await loadFeed();showToast('Profile saved','success');}catch(error){showToast(error.message,'danger');}finally{$('btnSaveProfile').disabled=false;}};
    avatarDropzone.onclick=()=>avatarFileInput.click();avatarFileInput.onchange=event=>{if(event.target.files[0])handleAvatarFile(event.target.files[0]);};
    avatarDropzone.ondragover=event=>event.preventDefault();avatarDropzone.ondrop=event=>{event.preventDefault();if(event.dataTransfer.files[0])handleAvatarFile(event.dataTransfer.files[0]);};
    function openAuth(){if(!$('authDialog').open){$('authError').hidden=true;$('authDialog').showModal();$('authEmail').focus();}}
    $('signInButton').onclick=openAuth;$('closeAuth').onclick=()=>$('authDialog').close();
    $('toggleAuthMode').onclick=()=>{registering=!registering;$('registerNameLabel').hidden=!registering;$('authName').required=registering;$('authTitle').textContent=registering?'Make yourself at home.':'Welcome back.';$('authDescription').textContent=registering?'Create an account. Use at least 8 characters with uppercase, lowercase and a number.':'Sign in to write, reply, and like stories.';$('submitAuth').textContent=registering?'Create account':'Sign in';$('toggleAuthMode').textContent=registering?'Already have an account? Sign in':'New here? Create an account';$('authPassword').autocomplete=registering?'new-password':'current-password';};
    $('authForm').onsubmit=async event=>{event.preventDefault();$('submitAuth').disabled=true;$('authError').hidden=true;try{if(registering)await request('/auth/register',{method:'POST',body:{email:$('authEmail').value,password:$('authPassword').value,name:$('authName').value},auth:false});await BlogAuth.login($('authEmail').value,$('authPassword').value);await loadIdentity();$('authDialog').close();$('authPassword').value='';await loadFeed();showToast('Signed in','success');}catch(error){$('authError').textContent=error.message;$('authError').hidden=false;}finally{$('submitAuth').disabled=false;}};
    async function signOut(all=false){try{await request(all?'/auth/logout-all':'/auth/logout',{method:'POST'});BlogAuth.clear();viewer=null;updateIdentity();resetEditor();$('accountDialog').close();await loadFeed();showToast('Signed out','success');}catch(error){showToast(error.message,'danger');}}
    $('signOutButton').onclick=()=>signOut();$('signOutAll').onclick=()=>signOut(true);
    $('accountButton').onclick=async()=>{$('accountEmail').textContent=viewer.email;$('accountDialog').showModal();try{const data=await request('/sessions');$('sessionList').innerHTML=data.items.map(s=>`<div class="session-row"><div>${escapeHtml(s.device_name||'Browser')} ${s.current?'· This session':''}<small>${escapeHtml(formatTimestamp(s.created_at.replace(' ','T')+'Z'))}</small></div><button class="btn-secondary" data-revoke-session="${escapeHtml(s.id)}">Revoke</button></div>`).join('');}catch(error){showToast(error.message,'danger');}};
    $('sessionList').onclick=async event=>{const b=event.target.closest('[data-revoke-session]');if(!b)return;b.disabled=true;try{await request('/sessions/'+b.dataset.revokeSession,{method:'DELETE'});if(b.dataset.revokeSession===viewer.sessionId){BlogAuth.clear();viewer=null;updateIdentity();$('accountDialog').close();await loadFeed();}else b.closest('.session-row').remove();}catch(error){showToast(error.message,'danger');b.disabled=false;}};
    $('closeAccount').onclick=()=>$('accountDialog').close();
    $('passwordForm').onsubmit=async event=>{event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;try{await request('/auth/change-password',{method:'POST',body:{currentPassword:$('currentPassword').value,newPassword:$('newPassword').value}});BlogAuth.clear();viewer=null;updateIdentity();$('accountDialog').close();event.target.reset();await loadFeed();showToast('Password changed. Sign in again.','success');}catch(error){showToast(error.message,'danger');}finally{button.disabled=false;}};
    $('feedSearch').oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadFeed(),250);};$('feedCategory').onchange=$('feedScope').onchange=()=>loadFeed();$('refreshFeed').onclick=()=>loadFeed();$('loadMorePosts').onclick=()=>loadFeed(true);
    window.addEventListener('blog-session-expired',()=>{viewer=null;updateIdentity();});
    updateIdentity();
    (async()=>{try{if(await BlogAuth.resume())await loadIdentity();}catch(error){showToast('Could not restore the session. You can still sign in.','info');}await loadFeed();})();
}
