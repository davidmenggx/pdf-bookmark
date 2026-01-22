    class PDFBookmarker {
    constructor() {
        this.currentPdfUrl = null;
        this.currentPage = 1;
        this.bookmarks = {};
        this.selectedColor = '#FF4D4D';
        this.editingBookmarkId = null;
        this.contextBookmarkId = null;
        this.isDarkMode = true;
        
        this.init();
    }
    
    async init() {
        await this.loadTheme();
        await this.loadBookmarks();
        await this.getCurrentTabInfo();
        this.bindEvents();
        this.renderBookmarks();
    }
    
    async loadTheme() {
        try {
        const result = await chrome.storage.local.get('pdfBookmarkerTheme');
        this.isDarkMode = result.pdfBookmarkerTheme !== 'light';
        this.applyTheme();
        } catch (error) {
        this.isDarkMode = true;
        this.applyTheme();
        }
    }
    
    async saveTheme() {
        try {
        await chrome.storage.local.set({ pdfBookmarkerTheme: this.isDarkMode ? 'dark' : 'light' });
        } catch (error) {}
    }
    
    applyTheme() {
        document.body.classList.toggle('light-mode', !this.isDarkMode);
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
        themeIcon.innerHTML = this.isDarkMode 
            ? '<path d="M12 3V4M12 20V21M4 12H3M6.31412 6.31412L5.5 5.5M17.6859 6.31412L18.5 5.5M6.31412 17.69L5.5 18.5M17.6859 17.69L18.5 18.5M21 12H20M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
            : '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
        }
    }
    
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        this.saveTheme();
    }
    
    async loadBookmarks() {
        try {
        const result = await chrome.storage.local.get('pdfBookmarks');
        this.bookmarks = result.pdfBookmarks || {};
        } catch (error) {
        this.bookmarks = {};
        }
    }
    
    async saveBookmarks() {
        try {
        await chrome.storage.local.set({ pdfBookmarks: this.bookmarks });
        } catch (error) {}
    }
    
    async getCurrentTabInfo() {
        try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            this.showNoPdfState();
            return;
        }
        
        const url = tab.url;
        const isPdf = this.isPdfUrl(url);
        
        if (isPdf) {
            this.currentPdfUrl = this.normalizePdfUrl(url);
            const pdfName = this.getPdfName(url);
            document.getElementById('pdfName').textContent = pdfName;
            
            const pageMatch = url.match(/#page=(\d+)/i);
            if (pageMatch) {
            this.currentPage = parseInt(pageMatch[1], 10);
            } else {
            this.currentPage = 1;
            }
            document.getElementById('pageNumber').value = this.currentPage;
            
            this.showPdfState();
        } else {
            this.currentPdfUrl = null;
            document.getElementById('pdfName').textContent = 'Not viewing a PDF';
            this.showNoPdfState();
        }
        } catch (error) {
        this.showNoPdfState();
        }
    }
    
    showNoPdfState() {
        document.getElementById('noPdfMessage').classList.add('visible');
        document.getElementById('pdfContent').classList.add('hidden');
    }
    
    showPdfState() {
        document.getElementById('noPdfMessage').classList.remove('visible');
        document.getElementById('pdfContent').classList.remove('hidden');
    }
    
    isPdfUrl(url) {
        if (!url) return false;
        
        const lowerUrl = url.toLowerCase();
        
        if (lowerUrl.endsWith('.pdf')) return true;
        if (lowerUrl.startsWith('chrome-extension://') && lowerUrl.includes('pdf')) return true;
        if (lowerUrl.includes('.pdf?') || lowerUrl.includes('.pdf#')) return true;
        if (lowerUrl.includes('viewer.html') && lowerUrl.includes('pdf')) return true;
        if (lowerUrl.includes('drive.google.com') && lowerUrl.includes('pdf')) return true;
        
        return false;
    }
    
    normalizePdfUrl(url) {
        const hashIndex = url.indexOf('#');
        if (hashIndex !== -1) {
        return url.substring(0, hashIndex);
        }
        return url;
    }
    
    getPdfName(url) {
        try {
        const urlObj = new URL(url);
        let pathname = urlObj.pathname;
        
        const segments = pathname.split('/').filter(s => s);
        let filename = segments[segments.length - 1] || 'PDF Document';
        
        filename = decodeURIComponent(filename);
        filename = filename.replace(/\.pdf$/i, '');
        
        if (filename.length > 30) {
            filename = filename.substring(0, 27) + '...';
        }
        
        return filename;
        } catch (e) {
        return 'PDF Document';
        }
    }
    
    bindEvents() {
        document.getElementById('themeToggle').addEventListener('click', () => {
        this.toggleTheme();
        });
        
        document.getElementById('toggleAdd').addEventListener('click', () => {
        const form = document.getElementById('addForm');
        const btn = document.getElementById('toggleAdd');
        form.classList.toggle('collapsed');
        btn.classList.toggle('collapsed');
        });
        
        document.getElementById('colorPicker').addEventListener('click', (e) => {
        if (e.target.classList.contains('color-swatch')) {
            this.selectColor(e.target, 'colorPicker');
        }
        });
        
        document.getElementById('editColorPicker').addEventListener('click', (e) => {
        if (e.target.classList.contains('color-swatch')) {
            this.selectColor(e.target, 'editColorPicker');
        }
        });
        
        document.getElementById('addBookmark').addEventListener('click', () => {
        this.addBookmark();
        });
        
        document.getElementById('bookmarkName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            this.addBookmark();
        }
        });
        
        document.getElementById('pageNumber').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            this.addBookmark();
        }
        });
        
        document.getElementById('editBookmark').addEventListener('click', () => {
        this.openEditModal(this.contextBookmarkId);
        this.hideContextMenu();
        });
        
        document.getElementById('changeColor').addEventListener('click', () => {
        this.openEditModal(this.contextBookmarkId);
        this.hideContextMenu();
        });
        
        document.getElementById('deleteBookmark').addEventListener('click', () => {
        this.deleteBookmark(this.contextBookmarkId);
        this.hideContextMenu();
        });
        
        document.getElementById('closeModal').addEventListener('click', () => {
        this.closeEditModal();
        });
        
        document.getElementById('cancelEdit').addEventListener('click', () => {
        this.closeEditModal();
        });
        
        document.getElementById('saveEdit').addEventListener('click', () => {
        this.saveEditedBookmark();
        });
        
        document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target.id === 'editModal') {
            this.closeEditModal();
        }
        });
        
        document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu') && !e.target.closest('.bookmark-action')) {
            this.hideContextMenu();
        }
        });
        
        document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            this.hideContextMenu();
            this.closeEditModal();
        }
        });
    }
    
    selectColor(swatch, pickerId) {
        const picker = document.getElementById(pickerId);
        picker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        
        if (pickerId === 'colorPicker') {
        this.selectedColor = swatch.dataset.color;
        }
    }
    
    async addBookmark() {
        if (!this.currentPdfUrl) {
        return;
        }
        
        const nameInput = document.getElementById('bookmarkName');
        const pageInput = document.getElementById('pageNumber');
        
        const page = parseInt(pageInput.value) || 1;
        const name = nameInput.value.trim() || `Page ${page}`;
        
        const bookmark = {
        id: this.generateId(),
        name: name,
        page: page,
        color: this.selectedColor,
        createdAt: Date.now()
        };
        
        if (!this.bookmarks[this.currentPdfUrl]) {
        this.bookmarks[this.currentPdfUrl] = [];
        }
        
        this.bookmarks[this.currentPdfUrl].push(bookmark);
        await this.saveBookmarks();
        
        this.renderBookmarks();
        
        nameInput.value = '';
    }
    
    generateId() {
        return 'bm_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }
    
    renderBookmarks() {
        const list = document.getElementById('bookmarksList');
        const emptyState = document.getElementById('emptyState');
        const countEl = document.getElementById('bookmarkCount');
        
        const pdfBookmarks = this.currentPdfUrl ? (this.bookmarks[this.currentPdfUrl] || []) : [];
        
        countEl.textContent = pdfBookmarks.length;
        
        list.querySelectorAll('.bookmark-item').forEach(el => el.remove());
        
        if (pdfBookmarks.length === 0) {
        emptyState.classList.remove('hidden');
        return;
        }
        
        emptyState.classList.add('hidden');
        
        const sorted = [...pdfBookmarks].sort((a, b) => a.page - b.page);
        
        sorted.forEach(bookmark => {
        const item = this.createBookmarkElement(bookmark);
        list.appendChild(item);
        });
    }
    
    createBookmarkElement(bookmark) {
        const item = document.createElement('div');
        item.className = 'bookmark-item';
        item.dataset.id = bookmark.id;
        
        item.innerHTML = `
        <div class="bookmark-color" style="background: ${bookmark.color}"></div>
        <div class="bookmark-info">
            <div class="bookmark-name">${this.escapeHtml(bookmark.name)}</div>
            <div class="bookmark-page">Page ${bookmark.page}</div>
        </div>
        <div class="bookmark-actions">
            <button class="bookmark-action edit-btn" title="Edit">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M10.5 1.5L12.5 3.5L4.5 11.5H2.5V9.5L10.5 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            </button>
            <button class="bookmark-action danger delete-btn" title="Delete">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4H12M5 4V3C5 2.44772 5.44772 2 6 2H8C8.55228 2 9 2.44772 9 3V4M11 4V11C11 11.5523 10.5523 12 10 12H4C3.44772 12 3 11.5523 3 11V4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            </button>
        </div>
        `;
        
        item.addEventListener('click', (e) => {
        if (!e.target.closest('.bookmark-action')) {
            this.navigateToPage(bookmark.page);
        }
        });
        
        item.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEditModal(bookmark.id);
        });
        
        item.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteBookmark(bookmark.id);
        });
        
        item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e, bookmark.id);
        });
        
        return item;
    }
    
    async navigateToPage(page) {
        try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) return;
        
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (targetPage) => {
            window.location.href = window.location.href.split('#')[0] + '#page=' + targetPage;
            window.location.reload();
            },
            args: [page]
        });
        
        window.close();
        } catch (error) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const baseUrl = tab.url.split('#')[0];
            const newUrl = baseUrl + '#page=' + page;
            await chrome.tabs.update(tab.id, { url: newUrl });
            window.close();
        } catch (e) {}
        }
    }
    
    showContextMenu(e, bookmarkId) {
        const menu = document.getElementById('contextMenu');
        this.contextBookmarkId = bookmarkId;
        
        const rect = document.body.getBoundingClientRect();
        let x = e.clientX;
        let y = e.clientY;
        
        menu.style.left = `${Math.min(x, rect.width - 150)}px`;
        menu.style.top = `${Math.min(y, rect.height - 120)}px`;
        
        menu.classList.add('visible');
    }
    
    hideContextMenu() {
        document.getElementById('contextMenu').classList.remove('visible');
        this.contextBookmarkId = null;
    }
    
    openEditModal(bookmarkId) {
        const bookmark = this.findBookmark(bookmarkId);
        if (!bookmark) return;
        
        this.editingBookmarkId = bookmarkId;
        
        document.getElementById('editName').value = bookmark.name;
        document.getElementById('editPage').value = bookmark.page;
        
        const colorPicker = document.getElementById('editColorPicker');
        colorPicker.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('active', swatch.dataset.color === bookmark.color);
        });
        
        document.getElementById('editModal').classList.add('visible');
    }
    
    closeEditModal() {
        document.getElementById('editModal').classList.remove('visible');
        this.editingBookmarkId = null;
    }
    
    async saveEditedBookmark() {
        if (!this.editingBookmarkId) return;
        
        const bookmark = this.findBookmark(this.editingBookmarkId);
        if (!bookmark) return;
        
        bookmark.name = document.getElementById('editName').value.trim() || `Page ${bookmark.page}`;
        bookmark.page = parseInt(document.getElementById('editPage').value) || bookmark.page;
        
        const activeColor = document.querySelector('#editColorPicker .color-swatch.active');
        if (activeColor) {
        bookmark.color = activeColor.dataset.color;
        }
        
        await this.saveBookmarks();
        this.renderBookmarks();
        this.closeEditModal();
    }
    
    async deleteBookmark(bookmarkId) {
        if (!this.currentPdfUrl) return;
        
        const pdfBookmarks = this.bookmarks[this.currentPdfUrl];
        if (!pdfBookmarks) return;
        
        const index = pdfBookmarks.findIndex(b => b.id === bookmarkId);
        if (index !== -1) {
        pdfBookmarks.splice(index, 1);
        await this.saveBookmarks();
        this.renderBookmarks();
        }
    }
    
    findBookmark(bookmarkId) {
        if (!this.currentPdfUrl) return null;
        
        const pdfBookmarks = this.bookmarks[this.currentPdfUrl];
        if (!pdfBookmarks) return null;
        
        return pdfBookmarks.find(b => b.id === bookmarkId);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    }

    document.addEventListener('DOMContentLoaded', () => {
    new PDFBookmarker();
    });
