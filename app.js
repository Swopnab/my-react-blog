const SHARED = window.SWOPBLOG?.mode === "shared";
// SwopBlog Application Logic (Left Profile Card + Center Feed)

const STORAGE_KEYS = {
    PROFILE: 'swopblog_profile_v2',
    POSTS: 'swopblog_posts_v2'
};

// Preset Avatars for Fast Selection
const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80'
];

// Initial Seed Data
const DEFAULT_PROFILE = {
    name: 'Swopnab Karki',
    username: '@swopnab',
    bio: 'Creator & developer sharing stories and thoughts on SwopBlog.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
};

const DEFAULT_POSTS = [
    {
        id: 101,
        title: 'Welcome to SwopBlog!',
        content: 'SwopBlog is built with clean Vanilla HTML and CSS. You can easily publish new stories, reply to discussions, and customize your profile photo on the left card.',
        author: 'Swopnab Karki',
        author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        tag: 'General',
        likes: 18,
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        replies: [
            {
                id: 201,
                author: 'Elena Rostova',
                author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
                content: 'The left profile card layout looks super sleek and intuitive!',
                created_at: new Date(Date.now() - 3600000 * 2).toISOString()
            }
        ]
    },
    {
        id: 102,
        title: 'Minimalist Layouts with Great Spacing',
        content: 'Placing the author card cleanly on the left and keeping the full feed on the right makes navigation effortless and focused on content.',
        author: 'David Chen',
        author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        tag: 'Design & UI',
        likes: 11,
        created_at: new Date(Date.now() - 3600000 * 7).toISOString(),
        replies: []
    }
];

// App State
let appProfile = null;
let appPosts = [];
let pendingDeleteAction = null; // { type: 'post'|'reply', postId?: number, replyId?: number }
let selectedPresetAvatar = null;
let selectedAvatarDataUrl = null;

// DOM Elements
const userProfileAvatar = document.getElementById('userProfileAvatar');
const userProfileName = document.getElementById('userProfileName');
const userProfileHandle = document.getElementById('userProfileHandle');
const userProfileBio = document.getElementById('userProfileBio');
const btnOpenProfileModal = document.getElementById('btnOpenProfileModal');

const postsContainer = document.getElementById('postsContainer');
const postsCountText = document.getElementById('postsCountText');
const createPostForm = document.getElementById('createPostForm');
const postTitleInput = document.getElementById('postTitleInput');
const postContentInput = document.getElementById('postContentInput');
const postTagSelect = document.getElementById('postTagSelect');

// Profile Modal Elements
const profileModal = document.getElementById('profileModal');
const btnCloseProfileModal = document.getElementById('btnCloseProfileModal');
const btnCancelProfileModal = document.getElementById('btnCancelProfileModal');
const btnSaveProfile = document.getElementById('btnSaveProfile');
const modalPreviewImg = document.getElementById('modalPreviewImg');
const editProfileName = document.getElementById('editProfileName');
const editProfileBio = document.getElementById('editProfileBio');
const avatarFileInput = document.getElementById('avatarFileInput');
const avatarDropzone = document.getElementById('avatarDropzone');
const selectedFileName = document.getElementById('selectedFileName');
const presetAvatarsGrid = document.getElementById('presetAvatarsGrid');

// Delete Modal Elements
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const btnCloseDeleteModal = document.getElementById('btnCloseDeleteModal');
const btnCancelDelete = document.getElementById('btnCancelDelete');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');
const deleteModalMessage = document.getElementById('deleteModalMessage');

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    if (SHARED) { initSharedBlog(); return; }
    loadProfile();
    loadPosts();
    initPresetAvatars();
    setupEventListeners();
    refreshIcons();
});

function refreshIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Open / Close Profile Modal
    if (btnOpenProfileModal) btnOpenProfileModal.addEventListener('click', openProfileModal);
    if (btnCloseProfileModal) btnCloseProfileModal.addEventListener('click', closeProfileModal);
    if (btnCancelProfileModal) btnCancelProfileModal.addEventListener('click', closeProfileModal);
    if (btnSaveProfile) btnSaveProfile.addEventListener('click', handleSaveProfile);

    // Profile Dropzone / File Picker
    if (avatarDropzone && avatarFileInput) {
        avatarDropzone.addEventListener('click', () => avatarFileInput.click());
        avatarFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleAvatarFile(e.target.files[0]);
            }
        });

        avatarDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            avatarDropzone.classList.add('drag-over');
        });
        avatarDropzone.addEventListener('dragleave', () => {
            avatarDropzone.classList.remove('drag-over');
        });
        avatarDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            avatarDropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleAvatarFile(e.dataTransfer.files[0]);
            }
        });
    }

    // Create Post
    if (createPostForm) {
        createPostForm.addEventListener('submit', handleCreatePost);
    }

    // Delete Modal
    if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener('click', closeDeleteModal);
    if (btnCancelDelete) btnCancelDelete.addEventListener('click', closeDeleteModal);
    if (btnConfirmDelete) btnConfirmDelete.addEventListener('click', executePendingDelete);

    // Modal background click
    [profileModal, deleteConfirmModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.close();
            });
        }
    });
}

// Preset Avatars Setup
function initPresetAvatars() {
    if (!presetAvatarsGrid) return;
    presetAvatarsGrid.innerHTML = '';
    PRESET_AVATARS.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'preset-avatar-option';
        img.alt = 'Preset avatar';
        img.addEventListener('click', () => {
            document.querySelectorAll('.preset-avatar-option').forEach(el => el.classList.remove('selected'));
            img.classList.add('selected');
            selectedPresetAvatar = url;
            selectedAvatarDataUrl = null;
            if (selectedFileName) selectedFileName.textContent = 'Selected Preset Avatar';
            if (modalPreviewImg) modalPreviewImg.src = url;
        });
        presetAvatarsGrid.appendChild(img);
    });
}

function handleAvatarFile(file) {
    if (!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type) || file.size > 150*1024) {
        showToast('Choose a PNG, JPEG, GIF or WebP image under 150 KB', 'danger');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        selectedAvatarDataUrl = e.target.result;
        selectedPresetAvatar = null;
        if (modalPreviewImg) modalPreviewImg.src = selectedAvatarDataUrl;
        if (selectedFileName) selectedFileName.textContent = `Selected: ${file.name}`;
        document.querySelectorAll('.preset-avatar-option').forEach(el => el.classList.remove('selected'));
    };
    reader.readAsDataURL(file);
}

// Profile Storage & Updates
function loadProfile() {
    const stored = readStorage(STORAGE_KEYS.PROFILE);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid profile');
            appProfile = {...DEFAULT_PROFILE};
            for (const key of ['name','username','bio','avatar_url']) if (typeof parsed[key] === 'string') appProfile[key] = parsed[key];
        } catch (e) {
            appProfile = { ...DEFAULT_PROFILE };
        }
    } else {
        appProfile = { ...DEFAULT_PROFILE };
        saveProfile();
    }
    updateProfileUI();
}

function saveProfile() {
    writeStorage(STORAGE_KEYS.PROFILE, appProfile);
}

function updateProfileUI() {
    const avatar = appProfile.avatar_url || DEFAULT_PROFILE.avatar_url;
    
    if (userProfileAvatar) userProfileAvatar.src = avatar;
    if (userProfileName) userProfileName.textContent = appProfile.name || DEFAULT_PROFILE.name;
    if (userProfileHandle) userProfileHandle.textContent = appProfile.username || DEFAULT_PROFILE.username;
    if (userProfileBio) userProfileBio.textContent = appProfile.bio || DEFAULT_PROFILE.bio;

    if (editProfileName) editProfileName.value = appProfile.name || '';
    if (editProfileBio) editProfileBio.value = appProfile.bio || '';
    if (modalPreviewImg) modalPreviewImg.src = avatar;
}

function openProfileModal() {
    profileModal.querySelector('.modal-feedback')?.remove();
    if (editProfileName) editProfileName.value = appProfile.name || '';
    if (editProfileBio) editProfileBio.value = appProfile.bio || '';
    if (modalPreviewImg) modalPreviewImg.src = appProfile.avatar_url || DEFAULT_PROFILE.avatar_url;
    selectedAvatarDataUrl = null;
    selectedPresetAvatar = null;
    if (selectedFileName) selectedFileName.textContent = '';
    document.querySelectorAll('.preset-avatar-option').forEach(el => el.classList.remove('selected'));
    if (profileModal) profileModal.showModal();
    refreshIcons();
}

function closeProfileModal() {
    if (profileModal) profileModal.close();
}

function handleSaveProfile() {
    const name = editProfileName.value.trim();
    const bio = editProfileBio.value.trim();

    if (name) appProfile.name = name;
    if (bio) appProfile.bio = bio;

    if (selectedAvatarDataUrl) {
        appProfile.avatar_url = selectedAvatarDataUrl;
    } else if (selectedPresetAvatar) {
        appProfile.avatar_url = selectedPresetAvatar;
    }

    saveProfile();
    updateProfileUI();

    // Update avatar on posts/replies authored by the current user
    appPosts.forEach(p => {
        if (p.author === appProfile.name) {
            p.author_avatar = appProfile.avatar_url;
        }
        if (p.replies) {
            p.replies.forEach(r => {
                if (r.author === appProfile.name) {
                    r.author_avatar = appProfile.avatar_url;
                }
            });
        }
    });
    savePosts();
    renderPosts();

    closeProfileModal();
    showToast('Profile picture & info updated!', 'success');
}

// Posts Storage & Management
function loadPosts() {
    const stored = readStorage(STORAGE_KEYS.POSTS);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed) || !parsed.every(validPost)) throw new Error('Invalid posts');
            appPosts = parsed;
        } catch (e) {
            appPosts = [...DEFAULT_POSTS];
        }
    } else {
        appPosts = [...DEFAULT_POSTS];
        savePosts();
    }
    renderPosts();
}

function savePosts() {
    writeStorage(STORAGE_KEYS.POSTS, appPosts);
}

function renderPosts() {
    if (postsCountText) {
        const count = appPosts.length;
        postsCountText.textContent = `${count} ${count === 1 ? 'story' : 'stories'}`;
    }

    if (!appPosts || appPosts.length === 0) {
        postsContainer.innerHTML = `
            <div class="empty-feed">
                <i data-lucide="file-text" class="empty-icon"></i>
                <h3 class="empty-title">No Stories Yet</h3>
                <p>Be the first to publish a story using the form above!</p>
            </div>
        `;
        refreshIcons();
        return;
    }

    postsContainer.innerHTML = '';
    appPosts.forEach(post => {
        const card = createPostCardElement(post);
        postsContainer.appendChild(card);
    });

    refreshIcons();
}

function createPostCardElement(post) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.id = `post-${post.id}`;

    const formattedTime = formatTimestamp(post.created_at);
    const authorAvatar = post.author_avatar || (SHARED ? 'avatar.svg' : DEFAULT_PROFILE.avatar_url);
    const replies = post.replies || [];
    const repliesCount = post.comments_count ?? replies.length;

    const repliesHtml = replies.length > 0 ? replies.map(reply => `
        <div class="reply-item" id="reply-${reply.id}">
            <img src="${escapeHtml(reply.author_avatar || (SHARED ? 'avatar.svg' : DEFAULT_PROFILE.avatar_url))}" alt="${escapeHtml(reply.author)}" class="reply-avatar">
            <div class="reply-body">
                <div class="reply-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="reply-author">${escapeHtml(reply.author)}</span>
                        <span class="reply-time">${formatTimestamp(reply.created_at)}</span>
                    </div>
                    ${!SHARED || reply.can_delete ? `<button class="btn-delete-reply" onclick="promptDeleteReply(${post.id}, ${reply.id})" title="Delete Reply">
                        <i data-lucide="trash"></i>
                    </button>` : ''}
                </div>
                <p class="reply-content">${escapeHtml(reply.content)}</p>
            </div>
        </div>
    `).join('') : '<p class="text-muted" style="font-size:0.8rem; padding:4px 0;">No replies yet. Be the first to reply!</p>';

    card.innerHTML = `
        <div class="post-header">
            <div class="post-author-group">
                <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(post.author)}" class="post-author-avatar">
                <div class="post-author-meta">
                    <span class="post-author-name">${escapeHtml(post.author)}</span>
                    <div class="post-meta-sub">
                        <span>${formattedTime}</span>
                        <span>•</span>
                        <span class="post-tag-badge">${escapeHtml(post.tag || 'General')}${post.status === 'draft' ? ' · Draft' : ''}</span>
                    </div>
                </div>
            </div>
            <div class="story-management">${SHARED && post.can_edit ? `<button class="btn-delete-post" onclick="editSharedPost(${post.id})" title="Edit story">Edit</button>` : ''}${!SHARED || post.can_delete ? `<button class="btn-delete-post" onclick="promptDeletePost(${post.id})" title="Delete Post">
                <i data-lucide="trash-2"></i>
                <span>Delete</span>
            </button>` : ''}</div>
        </div>

        <h3 class="post-title">${escapeHtml(post.title)}</h3>
        <p class="post-content">${escapeHtml(post.content)}</p>

        <div class="post-action-bar">
            <button class="btn-action-pill btn-reply-toggle" onclick="toggleRepliesSection(${post.id})">
                <i data-lucide="message-circle"></i>
                <span>Reply (${repliesCount})</span>
            </button>

            <button class="btn-action-pill btn-like${post.liked ? ' liked' : ''}" aria-label="${post.liked ? 'Unlike' : 'Like'} story" aria-pressed="${Boolean(post.liked)}" ${SHARED && post.status === 'draft' ? 'disabled' : ''} onclick="handleLikePost(${post.id}, this)">
                <i data-lucide="heart"></i>
                <span class="like-count">${post.likes || 0}</span>
            </button>
        </div>

        <!-- Inline Replies Section -->
        <div class="post-replies-section" id="replies-section-${post.id}" style="display: ${!SHARED && repliesCount > 0 ? 'flex' : 'none'};">
            <div class="replies-list" id="replies-list-${post.id}">
                ${repliesHtml}
            </div>

            <form class="add-reply-form" onsubmit="handleAddReply(event, ${post.id})">
                <input type="text" 
                       class="reply-input" 
                       id="reply-input-${post.id}" 
                       placeholder="Write a reply to this post..." 
                       required 
                       maxlength="500" ${SHARED && post.status === 'draft' ? 'disabled' : ''}>
                <button type="submit" class="btn-send-reply" ${SHARED && post.status === 'draft' ? 'disabled' : ''}>
                    <i data-lucide="corner-down-left"></i>
                    <span>Reply</span>
                </button>
            </form>
        </div>
    `;

    return card;
}

// Toggle replies visibility
window.toggleRepliesSection = function(postId) {
    const section = document.getElementById(`replies-section-${postId}`);
    if (section) {
        const isHidden = section.style.display === 'none' || section.style.display === '';
        section.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) {
            const input = document.getElementById(`reply-input-${postId}`);
            if (input) input.focus();
        }
    }
};

// Like Post
window.handleLikePost = function(postId, buttonEl) {
    const post = appPosts.find(p => p.id === postId);
    if (post) {
        post.likes = (post.likes || 0) + 1;
        savePosts();
        const countSpan = buttonEl.querySelector('.like-count');
        if (countSpan) countSpan.textContent = post.likes;
        
        buttonEl.style.transform = 'scale(1.15)';
        setTimeout(() => buttonEl.style.transform = 'none', 150);
    }
};

// Create Post
function handleCreatePost(e) {
    e.preventDefault();
    const title = postTitleInput.value.trim();
    const content = postContentInput.value.trim();
    const tag = postTagSelect.value;

    if (!title || !content) {
        showToast('Please fill in both title and content', 'danger');
        return;
    }

    const newPost = {
        id: Date.now(),
        title,
        content,
        author: appProfile.name || DEFAULT_PROFILE.name,
        author_avatar: appProfile.avatar_url || DEFAULT_PROFILE.avatar_url,
        tag,
        likes: 0,
        created_at: new Date().toISOString(),
        replies: []
    };

    appPosts.unshift(newPost);
    savePosts();
    renderPosts();

    postTitleInput.value = '';
    postContentInput.value = '';
    showToast('Story published to SwopBlog!', 'success');
}

// Add Reply
window.handleAddReply = function(e, postId) {
    e.preventDefault();
    const input = document.getElementById(`reply-input-${postId}`);
    if (!input) return;
    const content = input.value.trim();
    if (!content) return;

    const post = appPosts.find(p => p.id === postId);
    if (!post) return;

    if (!post.replies) post.replies = [];

    const newReply = {
        id: Date.now(),
        author: appProfile.name || DEFAULT_PROFILE.name,
        author_avatar: appProfile.avatar_url || DEFAULT_PROFILE.avatar_url,
        content,
        created_at: new Date().toISOString()
    };

    post.replies.push(newReply);
    savePosts();
    renderPosts();

    // Keep replies open
    const section = document.getElementById(`replies-section-${postId}`);
    if (section) section.style.display = 'flex';

    showToast('Reply posted!', 'success');
};

// Delete Prompts
window.promptDeletePost = function(postId) {
    deleteConfirmModal.querySelector('.modal-feedback')?.remove();
    pendingDeleteAction = { type: 'post', postId };
    deleteModalMessage.textContent = 'Are you sure you want to delete this blog post and all its replies?';
    deleteConfirmModal.showModal();
    refreshIcons();
};

window.promptDeleteReply = function(postId, replyId) {
    pendingDeleteAction = { type: 'reply', postId, replyId };
    deleteModalMessage.textContent = 'Are you sure you want to delete this reply?';
    deleteConfirmModal.showModal();
    refreshIcons();
};

function closeDeleteModal() {
    deleteConfirmModal.close();
    pendingDeleteAction = null;
}

function executePendingDelete() {
    if (!pendingDeleteAction) return;

    if (pendingDeleteAction.type === 'post') {
        appPosts = appPosts.filter(p => p.id !== pendingDeleteAction.postId);
        savePosts();
        renderPosts();
        showToast('Post deleted', 'success');
    } else if (pendingDeleteAction.type === 'reply') {
        const post = appPosts.find(p => p.id === pendingDeleteAction.postId);
        if (post && post.replies) {
            post.replies = post.replies.filter(r => r.id !== pendingDeleteAction.replyId);
            savePosts();
            renderPosts();
            const section = document.getElementById(`replies-section-${pendingDeleteAction.postId}`);
            if (section) section.style.display = 'flex';
            showToast('Reply deleted', 'success');
        }
    }

    closeDeleteModal();
}

// Helpers
function readStorage(key) {
    try { return localStorage.getItem(key); }
    catch { showToast('Browser storage is unavailable. Changes last only in this tab.', 'info'); return null; }
}
function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { showToast('Could not save. Keep this tab open; changes may be lost on reload.', 'danger'); }
}
function validPost(post) {
    const validReply = reply => reply && Number.isSafeInteger(reply.id) && ['content','author','created_at'].every(key=>typeof reply[key]==='string') && (!reply.author_avatar || typeof reply.author_avatar==='string');
    return post && Number.isSafeInteger(post.id) && ['title','content','author','created_at'].every(key=>typeof post[key]==='string') && (!post.tag || typeof post.tag==='string') && (!post.author_avatar || typeof post.author_avatar==='string') && Number.isSafeInteger(post.likes ?? 0) && (!post.replies || Array.isArray(post.replies) && post.replies.every(validReply));
}
function formatTimestamp(isoStr) {
    if (!isoStr) return 'Just now';
    try {
        const date = new Date(isoStr);
        if (isNaN(date.getTime())) return 'Unknown date';
        const now = new Date();
        const diffSec = Math.floor((now - date) / 1000);

        if (diffSec < 60) return 'Just now';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
        return 'Unknown date';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const dialog = document.querySelector('dialog[open]');
    if (dialog) { let feedback = dialog.querySelector('.modal-feedback'); if (!feedback) { feedback = document.createElement('p'); feedback.className = 'modal-feedback'; feedback.setAttribute('role', 'alert'); dialog.append(feedback); } feedback.textContent = message; return; }
    const container = document.getElementById('toastContainer');
    if (container) {
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px)';
            toast.style.transition = 'all 0.2s ease';
            setTimeout(() => toast.remove(), 200);
        }, 3000);
    }
}
