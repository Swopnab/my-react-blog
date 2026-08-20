// State
let currentProfile = null;
let pendingDeleteAction = null; // { type: 'post'|'reply', id: number }
let selectedPresetAvatar = null;
let selectedAvatarFile = null;

// Preset avatars options for quick selection
const PRESET_AVATARS = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
];

// Elements
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

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    initPresetAvatars();
    setupEventListeners();
    loadProfile();
    loadPosts();
});

// Setup Event Listeners
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

    // Avatar File Drag & Drop / Input
    avatarDropzone.addEventListener('click', () => avatarFileInput.click());
    avatarFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleAvatarFileSelection(e.target.files[0]);
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
            handleAvatarFileSelection(e.dataTransfer.files[0]);
        }
    });

    // Close modal when clicking outside
    [profileModal, deleteConfirmModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('open');
            }
        });
    });
}

// Render Presets
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
            selectedAvatarFile = null;
            selectedFileName.textContent = 'Selected Preset Avatar';
            modalPreviewImg.src = url;
        });
        presetAvatarsGrid.appendChild(img);
    });
}

function handleAvatarFileSelection(file) {
    if (!file.type.match('image.*')) {
        showToast('Please select a valid image file', 'danger');
        return;
    }
    selectedAvatarFile = file;
    selectedPresetAvatar = null;
    selectedFileName.textContent = `Selected: ${file.name}`;
    
    // Unselect preset indicators
    document.querySelectorAll('.preset-avatar-option').forEach(el => el.classList.remove('selected'));

    const reader = new FileReader();
    reader.onload = (e) => {
        modalPreviewImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Profile Loading & Updates
async function loadProfile() {
    try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to load profile');
        currentProfile = await res.json();
        updateProfileUI(currentProfile);
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

function updateProfileUI(profile) {
    if (!profile) return;
    const avatar = profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    
    headerAvatarImg.src = avatar;
    sidebarAvatarImg.src = avatar;
    createPostAvatar.src = avatar;
    modalPreviewImg.src = avatar;

    peekName.textContent = profile.name || 'Alex Morgan';
    peekHandle.textContent = profile.username || '@alexmorgan';
    sidebarName.textContent = profile.name || 'Alex Morgan';
    sidebarHandle.textContent = profile.username || '@alexmorgan';
    sidebarBio.textContent = profile.bio || 'Tech enthusiast, writer & creative developer.';

    editProfileName.value = profile.name || '';
    editProfileBio.value = profile.bio || '';
}

function openProfileModal() {
    if (currentProfile) {
        editProfileName.value = currentProfile.name || '';
        editProfileBio.value = currentProfile.bio || '';
        modalPreviewImg.src = currentProfile.avatar_url || '';
    }
    selectedAvatarFile = null;
    selectedPresetAvatar = null;
    selectedFileName.textContent = '';
    document.querySelectorAll('.preset-avatar-option').forEach(el => el.classList.remove('selected'));
    profileModal.classList.add('open');
    if (window.lucide) lucide.createIcons();
}

function closeProfileModal() {
    profileModal.classList.remove('open');
}

async function handleSaveProfile() {
    try {
        const name = editProfileName.value.trim();
        const bio = editProfileBio.value.trim();

        // 1. If user uploaded a new image file
        if (selectedAvatarFile) {
            const formData = new FormData();
            formData.append('avatar', selectedAvatarFile);
            const uploadRes = await fetch('/api/profile/avatar', {
                method: 'POST',
                body: formData
            });
            if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                throw new Error(errData.error || 'Avatar upload failed');
            }
        } else if (selectedPresetAvatar) {
            // 2. If user selected a preset avatar
            await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ avatar_url: selectedPresetAvatar })
            });
        }

        // 3. Update name and bio
        if (name || bio) {
            await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, bio })
            });
        }

        await loadProfile();
        await loadPosts(); // refresh post avatars
        closeProfileModal();
        showToast('Profile & avatar updated successfully!', 'success');
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Failed to update profile', 'danger');
    }
}

// Posts & Replies Management
async function loadPosts() {
    try {
        const res = await fetch('/api/posts');
        if (!res.ok) throw new Error('Failed to load posts');
        const posts = await res.json();
        renderPosts(posts);
    } catch (err) {
        console.error('Error loading posts:', err);
        postsContainer.innerHTML = `
            <div class="empty-feed">
                <i data-lucide="alert-circle" class="empty-icon text-danger"></i>
                <h3 class="empty-title">Error Loading Posts</h3>
                <p>Could not retrieve posts from the server. Please check the backend.</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
}

function renderPosts(posts) {
    postsCountBadge.textContent = posts.length;

    if (!posts || posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="empty-feed">
                <i data-lucide="file-text" class="empty-icon"></i>
                <h3 class="empty-title">No Blog Posts Yet</h3>
                <p>Be the first to publish a story using the form above!</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    postsContainer.innerHTML = '';
    posts.forEach(post => {
        const card = createPostCardElement(post);
        postsContainer.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
}

function createPostCardElement(post) {
    const card = document.createElement('article');
    card.className = 'post-card';
    card.id = `post-${post.id}`;

    const formattedTime = formatTimestamp(post.created_at);
    const authorAvatar = post.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
    const repliesCount = post.replies ? post.replies.length : 0;

    // Check if reply section is already toggled open
    const repliesHtml = post.replies && post.replies.length > 0 ? post.replies.map(reply => `
        <div class="reply-item" id="reply-${reply.id}">
            <img src="${escapeHtml(reply.author_avatar || authorAvatar)}" alt="${escapeHtml(reply.author)}" class="reply-avatar">
            <div class="reply-body">
                <div class="reply-header">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span class="reply-author">${escapeHtml(reply.author)}</span>
                        <span class="reply-time">${formatTimestamp(reply.created_at)}</span>
                    </div>
                    <button class="btn-delete-reply" onclick="promptDeleteReply(${reply.id})" title="Delete Reply">
                        <i data-lucide="trash"></i>
                    </button>
                </div>
                <p class="reply-content">${escapeHtml(reply.content)}</p>
            </div>
        </div>
    `).join('') : '<p class="text-muted" style="font-size:0.8rem; padding:4px 0;">No replies yet. Start the conversation!</p>';

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

        <!-- Inline Replies Thread Section -->
        <div class="post-replies-section" id="replies-section-${post.id}" style="display: ${repliesCount > 0 ? 'flex' : 'none'};">
            <div class="replies-list" id="replies-list-${post.id}">
                ${repliesHtml}
            </div>

            <form class="add-reply-form" onsubmit="handleAddReply(event, ${post.id})">
                <input type="text" 
                       class="reply-input" 
                       id="reply-input-${post.id}" 
                       placeholder="Write a reply..." 
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

// Toggle replies section visibility
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

// Handle Like
window.handleLikePost = async function(postId, buttonEl) {
    try {
        const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to like post');
        const data = await res.json();
        const countSpan = buttonEl.querySelector('.like-count');
        if (countSpan) {
            countSpan.textContent = data.likes;
        }
        buttonEl.style.transform = 'scale(1.15)';
        setTimeout(() => buttonEl.style.transform = 'none', 180);
    } catch (err) {
        console.error(err);
    }
};

// Create Post Form Submission
async function handleCreatePost(e) {
    e.preventDefault();
    const title = postTitleInput.value.trim();
    const content = postContentInput.value.trim();
    const tag = postTagSelect.value;

    if (!title || !content) {
        showToast('Please fill in both title and content', 'danger');
        return;
    }

    try {
        const res = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, tag })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to create post');
        }

        postTitleInput.value = '';
        postContentInput.value = '';
        showToast('Post published successfully!', 'success');
        await loadPosts();
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Error creating post', 'danger');
    }
}

// Add Reply Form Submission
window.handleAddReply = async function(e, postId) {
    e.preventDefault();
    const input = document.getElementById(`reply-input-${postId}`);
    if (!input) return;
    const content = input.value.trim();

    if (!content) return;

    try {
        const res = await fetch(`/api/posts/${postId}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Failed to add reply');
        }

        input.value = '';
        showToast('Reply added!', 'success');
        await loadPosts();
        
        // Ensure replies section remains visible
        const section = document.getElementById(`replies-section-${postId}`);
        if (section) section.style.display = 'flex';
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Error adding reply', 'danger');
    }
};

// Delete Post Prompt
window.promptDeletePost = function(postId) {
    pendingDeleteAction = { type: 'post', id: postId };
    deleteModalMessage.textContent = 'Are you sure you want to delete this blog post and all its replies? This action cannot be undone.';
    deleteConfirmModal.classList.add('open');
};

// Delete Reply Prompt
window.promptDeleteReply = function(replyId) {
    pendingDeleteAction = { type: 'reply', id: replyId };
    deleteModalMessage.textContent = 'Are you sure you want to delete this reply?';
    deleteConfirmModal.classList.add('open');
};

function closeDeleteModal() {
    deleteConfirmModal.classList.remove('open');
    pendingDeleteAction = null;
}

// Execute Pending Deletion
async function executePendingDelete() {
    if (!pendingDeleteAction) return;

    try {
        if (pendingDeleteAction.type === 'post') {
            const res = await fetch(`/api/posts/${pendingDeleteAction.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete post');
            showToast('Post deleted', 'success');
        } else if (pendingDeleteAction.type === 'reply') {
            const res = await fetch(`/api/replies/${pendingDeleteAction.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete reply');
            showToast('Reply deleted', 'success');
        }
        closeDeleteModal();
        await loadPosts();
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Delete operation failed', 'danger');
    }
}

// Utilities
function formatTimestamp(timestampStr) {
    if (!timestampStr) return 'Just now';
    try {
        const date = new Date(timestampStr.replace(' ', 'T') + 'Z');
        if (isNaN(date.getTime())) return timestampStr;
        
        const now = new Date();
        const diffSec = Math.floor((now - date) / 1000);

        if (diffSec < 60) return 'Just now';
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
        return timestampStr;
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
