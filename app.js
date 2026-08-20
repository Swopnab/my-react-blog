// SwopBlog Application Core Logic (Pure Vanilla JS with LocalStorage Persistence)

const STORAGE_KEYS = {
    PROFILE: 'swopblog_profile_v1',
    POSTS: 'swopblog_posts_v1'
};

// Preset Avatars for Instant Selection
const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
];

// Initial Seed Data
const DEFAULT_PROFILE = {
    name: 'Swopnab Karki',
    username: '@swopnab',
    bio: 'Creator & developer sharing stories and thoughts on SwopBlog.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
};

const DEFAULT_POSTS = [
    {
        id: 101,
        title: 'Welcome to SwopBlog!',
        content: 'SwopBlog is built with clean Vanilla HTML, CSS, and JavaScript. You can easily publish your stories, delete them, and join conversations with nested replies. Check out the top-right profile picture to customize your personal avatar!',
        author: 'Swopnab Karki',
        author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        tag: 'General',
        likes: 12,
        created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
        replies: [
            {
                id: 201,
                author: 'Elena Rostova',
                author_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
                content: 'Super clean design! Love how snappy creating posts and replies feels in the middle feed.',
                created_at: new Date(Date.now() - 3600000 * 2).toISOString()
            }
        ]
    },
    {
        id: 102,
        title: 'Minimalist Web Design & Fast Interfaces',
        content: 'Keeping interfaces focused and responsive provides the best user experience. Everything in the center column is laid out for effortless reading, posting, and discussion.',
        author: 'David Chen',
        author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        tag: 'Design & UI',
        likes: 8,
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
const headerAvatarImg = document.getElementById('headerAvatarImg');
const sidebarAvatarImg = document.getElementById('sidebarAvatarImg');
const createPostAvatar = document.getElementById('createPostAvatar');
const peekName = document.getElementById('peekName');
const peekHandle = document.getElementById('peekHandle');
const sidebarName = document.getElementById('sidebarName');
const sidebarHandle = document.getElementById('sidebarHandle');
const sidebarBio = document.getElementById('sidebarBio');
const postsCountBadge = document.getElementById('postsCountBadge');

const postsContainer = document.getElementById('postsContainer');
const createPostForm = document.getElementById('createPostForm');
const postTitleInput = document.getElementById('postTitleInput');
const postContentInput = document.getElementById('postContentInput');
const postTagSelect = document.getElementById('postTagSelect');

// Modals
const profileModal = document.getElementById('profileModal');
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const profileWidget = document.getElementById('profileWidget');
const btnOpenProfileModal = document.getElementById('btnOpenProfileModal');
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

const btnCloseDeleteModal = document.getElementById('btnCloseDeleteModal');
const btnCancelDelete = document.getElementById('btnCancelDelete');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');
const deleteModalMessage = document.getElementById('deleteModalMessage');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
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

// Event Listeners
function setupEventListeners() {
    // Open Profile Modal
    profileWidget.addEventListener('click', openProfileModal);
    btnOpenProfileModal.addEventListener('click', openProfileModal);
    btnCloseProfileModal.addEventListener('click', closeProfileModal);
    btnCancelProfileModal.addEventListener('click', closeProfileModal);
    btnSaveProfile.addEventListener('click', handleSaveProfile);

    // Delete Modal
    btnCloseDeleteModal.addEventListener('click', closeDeleteModal);
    btnCancelDelete.addEventListener('click', closeDeleteModal);
    btnConfirmDelete.addEventListener('click', executePendingDelete);

    // Create Post
    createPostForm.addEventListener('submit', handleCreatePost);

    // Avatar Upload & Drag/Drop
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

    // Close modal on outer click
    [profileModal, deleteConfirmModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('open');
            }
        });
    });
}

// Preset Avatars Setup
function initPresetAvatars() {
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
            selectedFileName.textContent = 'Selected Preset Avatar';
            modalPreviewImg.src = url;
        });
        presetAvatarsGrid.appendChild(img);
    });
}

function handleAvatarFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'danger');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        selectedAvatarDataUrl = e.target.result;
        selectedPresetAvatar = null;
        modalPreviewImg.src = selectedAvatarDataUrl;
        selectedFileName.textContent = `Selected: ${file.name}`;
        document.querySelectorAll('.preset-avatar-option').forEach(el => el.classList.remove('selected'));
    };
    reader.readAsDataURL(file);
}

// Profile Storage & Updates
function loadProfile() {
    const stored = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (stored) {
        try {
            appProfile = JSON.parse(stored);
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
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(appProfile));
}

function updateProfileUI() {
    const avatar = appProfile.avatar_url || DEFAULT_PROFILE.avatar_url;
    
    headerAvatarImg.src = avatar;
    sidebarAvatarImg.src = avatar;
    createPostAvatar.src = avatar;
    modalPreviewImg.src = avatar;

    peekName.textContent = appProfile.name || DEFAULT_PROFILE.name;
    peekHandle.textContent = appProfile.username || DEFAULT_PROFILE.username;
    sidebarName.textContent = appProfile.name || DEFAULT_PROFILE.name;
    sidebarHandle.textContent = appProfile.username || DEFAULT_PROFILE.username;
    sidebarBio.textContent = appProfile.bio || DEFAULT_PROFILE.bio;

    editProfileName.value = appProfile.name || '';
    editProfileBio.value = appProfile.bio || '';
}

function openProfileModal() {
    editProfileName.value = appProfile.name || '';
    editProfileBio.value = appProfile.bio || '';
    modalPreviewImg.src = appProfile.avatar_url || DEFAULT_PROFILE.avatar_url;
    selectedAvatarDataUrl = null;
    selectedPresetAvatar = null;
    selectedFileName.textContent = '';
    document.querySelectorAll('.preset-avatar-option').forEach(el => el.classList.remove('selected'));
    profileModal.classList.add('open');
    refreshIcons();
}

function closeProfileModal() {
    profileModal.classList.remove('open');
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

    // Update avatar on any posts/replies authored by the current user
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
    showToast('Profile & avatar updated successfully!', 'success');
}

// Posts Storage & Management
function loadPosts() {
    const stored = localStorage.getItem(STORAGE_KEYS.POSTS);
    if (stored) {
        try {
            appPosts = JSON.parse(stored);
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
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(appPosts));
}

function renderPosts() {
    postsCountBadge.textContent = appPosts.length;

    if (!appPosts || appPosts.length === 0) {
        postsContainer.innerHTML = `
            <div class="empty-feed">
                <i data-lucide="file-text" class="empty-icon"></i>
                <h3 class="empty-title">No Blog Posts Yet</h3>
                <p>Be the first to share a story using the form above!</p>
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
    const authorAvatar = post.author_avatar || DEFAULT_PROFILE.avatar_url;
    const replies = post.replies || [];
    const repliesCount = replies.length;

    const repliesHtml = repliesCount > 0 ? replies.map(reply => `
        <div class="reply-item" id="reply-${reply.id}">
            <img src="${escapeHtml(reply.author_avatar || DEFAULT_PROFILE.avatar_url)}" alt="${escapeHtml(reply.author)}" class="reply-avatar">
            <div class="reply-body">
                <div class="reply-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="reply-author">${escapeHtml(reply.author)}</span>
                        <span class="reply-time">${formatTimestamp(reply.created_at)}</span>
                    </div>
                    <button class="btn-delete-reply" onclick="promptDeleteReply(${post.id}, ${reply.id})" title="Delete Reply">
                        <i data-lucide="trash"></i>
                    </button>
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
                        <span class="post-tag-badge">${escapeHtml(post.tag || 'General')}</span>
                    </div>
                </div>
            </div>
            <button class="btn-delete-post" onclick="promptDeletePost(${post.id})" title="Delete Post">
                <i data-lucide="trash-2"></i>
                <span>Delete</span>
            </button>
        </div>

        <h3 class="post-title">${escapeHtml(post.title)}</h3>
        <p class="post-content">${escapeHtml(post.content)}</p>

        <div class="post-action-bar">
            <button class="btn-action-pill btn-reply-toggle" onclick="toggleRepliesSection(${post.id})">
                <i data-lucide="message-circle"></i>
                <span>Reply (${repliesCount})</span>
            </button>

            <button class="btn-action-pill btn-like" onclick="handleLikePost(${post.id}, this)">
                <i data-lucide="heart"></i>
                <span class="like-count">${post.likes || 0}</span>
            </button>
        </div>

        <!-- Inline Replies Section in Middle Column -->
        <div class="post-replies-section" id="replies-section-${post.id}" style="display: ${repliesCount > 0 ? 'flex' : 'none'};">
            <div class="replies-list" id="replies-list-${post.id}">
                ${repliesHtml}
            </div>

            <form class="add-reply-form" onsubmit="handleAddReply(event, ${post.id})">
                <input type="text" 
                       class="reply-input" 
                       id="reply-input-${post.id}" 
                       placeholder="Write a reply to this post..." 
                       required 
                       maxlength="500">
                <button type="submit" class="btn-send-reply">
                    <i data-lucide="corner-down-left"></i>
                    <span>Reply</span>
                </button>
            </form>
        </div>
    `;

    return card;
}

// Toggle replies section
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
        
        buttonEl.style.transform = 'scale(1.2)';
        setTimeout(() => buttonEl.style.transform = 'none', 180);
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
    pendingDeleteAction = { type: 'post', postId };
    deleteModalMessage.textContent = 'Are you sure you want to delete this blog post and all its replies? This action cannot be undone.';
    deleteConfirmModal.classList.add('open');
    refreshIcons();
};

window.promptDeleteReply = function(postId, replyId) {
    pendingDeleteAction = { type: 'reply', postId, replyId };
    deleteModalMessage.textContent = 'Are you sure you want to delete this reply?';
    deleteConfirmModal.classList.add('open');
    refreshIcons();
};

function closeDeleteModal() {
    deleteConfirmModal.classList.remove('open');
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
function formatTimestamp(isoStr) {
    if (!isoStr) return 'Just now';
    try {
        const date = new Date(isoStr);
        if (isNaN(date.getTime())) return isoStr;
        const now = new Date();
        const diffSec = Math.floor((now - date) / 1000);

        if (diffSec < 60) return 'Just now';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
        return isoStr;
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
    
    const container = document.getElementById('toastContainer');
    if (container) {
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.25s ease';
            setTimeout(() => toast.remove(), 250);
        }, 3200);
    }
}
