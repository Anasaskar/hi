document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('galleryGrid');
  const emptyMsg = document.getElementById('noGalleryMessage');
  const searchInput = document.getElementById('searchInput');
  const sortBtn = document.getElementById('sortBtn');
  const sortMenu = document.getElementById('sortMenu');
  const viewBtns = document.querySelectorAll('.view-btn');
  
  // Stats elements
  const totalImagesEl = document.getElementById('totalImages');
  const thisMonthEl = document.getElementById('thisMonth');
  const totalDownloadsEl = document.getElementById('totalDownloads');
  
  // Lightbox elements
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxOverlay = document.getElementById('lightboxOverlay');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxDate = document.getElementById('lightboxDate');
  const lightboxDownload = document.getElementById('lightboxDownload');

  let allOrders = [];
  let currentSort = 'newest';
  let currentView = 'grid';
  let downloadCount = 0;

  loadOrders();

  // Search functionality
  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filterAndRenderOrders(query);
  });

  // Sort dropdown toggle
  sortBtn?.addEventListener('click', () => {
    document.querySelector('.sort-dropdown').classList.toggle('active');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sort-dropdown')) {
      document.querySelector('.sort-dropdown')?.classList.remove('active');
    }
  });

  // Sort options
  document.querySelectorAll('.sort-option').forEach(option => {
    option.addEventListener('click', () => {
      const sortType = option.dataset.sort;
      currentSort = sortType;
      
      // Update active state
      document.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      
      // Update button text
      sortBtn.querySelector('span').textContent = option.textContent.trim();
      
      // Close dropdown
      document.querySelector('.sort-dropdown')?.classList.remove('active');
      
      // Re-render
      filterAndRenderOrders();
    });
  });

  // View toggle
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      currentView = view;
      
      // Update active state
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update grid class
      grid.classList.remove('view-grid', 'view-list');
      grid.classList.add(`view-${view}`);
    });
  });

  // Lightbox controls
  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxOverlay?.addEventListener('click', closeLightbox);
  
  function openLightbox(order) {
    const modelName = getModelName(order);
    const dateStr = formatDate(order.createdAt);
    
    lightboxImage.src = order.processedImage;
    lightboxTitle.textContent = modelName;
    lightboxDate.textContent = `Created: ${dateStr}`;
    
    lightboxDownload.onclick = async () => {
      const idPart = order.id || new Date(order.createdAt).getTime();
      const fname = `${modelName.replace(/\s/g, '_')}_${idPart}.jpg`;
      const url = `/api/download?url=${encodeURIComponent(order.processedImage)}&filename=${encodeURIComponent(fname)}`;
      await downloadViaProxy(url, fname, lightboxDownload);
    };
    
    lightboxModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  
  function closeLightbox() {
    lightboxModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  async function loadOrders() {
    try {
      const res = await fetch('/api/orders', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      allOrders = data.orders || [];
      
      updateStats();
      filterAndRenderOrders();
    } catch (e) {
      console.error('Failed to load orders:', e);
      if (grid) grid.innerHTML = '<p class="muted">Failed to load orders</p>';
    }
  }

  function updateStats() {
    const total = allOrders.length;
    const now = new Date();
    const currentMonth = allOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate.getMonth() === now.getMonth() && 
             orderDate.getFullYear() === now.getFullYear();
    }).length;
    
    if (totalImagesEl) animateNumber(totalImagesEl, total);
    if (thisMonthEl) animateNumber(thisMonthEl, currentMonth);
    if (totalDownloadsEl) animateNumber(totalDownloadsEl, downloadCount);
  }

  function animateNumber(element, target) {
    const duration = 1000;
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
        element.textContent = target;
        clearInterval(timer);
      } else {
        element.textContent = Math.floor(current);
      }
    }, 16);
  }

  function filterAndRenderOrders(query = '') {
    let filtered = allOrders;
    
    // Filter by search query
    if (query) {
      filtered = filtered.filter(order => {
        const modelName = getModelName(order).toLowerCase();
        const dateStr = formatDate(order.createdAt).toLowerCase();
        return modelName.includes(query) || dateStr.includes(query);
      });
    }
    
    // Sort
    filtered = filtered.slice();
    if (currentSort === 'newest') {
      filtered.reverse();
    }
    // 'oldest' keeps the original order
    
    // Render
    if (!filtered.length) {
      if (emptyMsg) {
        emptyMsg.style.display = 'flex';
        grid.innerHTML = '';
        grid.appendChild(emptyMsg);
      }
      return;
    }
    
    if (emptyMsg) emptyMsg.style.display = 'none';
    grid.innerHTML = '';
    filtered.forEach(order => grid.appendChild(renderOrderCard(order)));
  }

  function renderOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'gallery-card';

    const modelName = getModelName(order);
    const dateStr = formatDate(order.createdAt);

    card.innerHTML = `
      <div class="gallery-card-image">
        <img src="${order.processedImage}" alt="${modelName}" loading="lazy">
        <div class="gallery-card-overlay">
          <div class="card-overlay-icon">
            <i class="fas fa-search-plus"></i>
          </div>
        </div>
      </div>
      <div class="gallery-card-info">
        <div class="card-model-name">
          <i class="fas fa-user"></i>
          ${modelName}
        </div>
        <div class="card-date">
          <i class="far fa-calendar"></i>
          ${dateStr}
        </div>
        <div class="card-actions">
          <button class="card-btn card-btn-primary download-btn">
            <i class="fas fa-download"></i>
            <span>Download</span>
          </button>
        </div>
      </div>
    `;

    // Click to open lightbox
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.download-btn')) {
        openLightbox(order);
      }
    });

    // Download button
    const dlBtn = card.querySelector('.download-btn');
    dlBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idPart = order.id || new Date(order.createdAt).getTime();
      const fname = `${modelName.replace(/\s/g, '_')}_${idPart}.jpg`;
      const url = `/api/download?url=${encodeURIComponent(order.processedImage)}&filename=${encodeURIComponent(fname)}`;
      await downloadViaProxy(url, fname, dlBtn);
      downloadCount++;
      if (totalDownloadsEl) totalDownloadsEl.textContent = downloadCount;
    });

    return card;
  }

  function getModelName(order) {
    const modelId = order.model || order.modelId || '';
    return modelId ? modelsNameFromId(modelId) : 'Model';
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'Unknown date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  function modelsNameFromId(id) {
    const num = String(id).replace(/[^0-9]/g, '');
    return num ? `Model ${num}` : 'Model';
  }
});

// Helper: fetch file via proxy and show loading indicator on button
async function downloadViaProxy(url, filename, buttonEl) {
  if (!buttonEl) return;
  const originalHtml = buttonEl.innerHTML;
  buttonEl.disabled = true;
  buttonEl.classList.add('loading');
  buttonEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i><span>Downloading...</span>`;
  
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      throw new Error('Download failed');
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || 'download.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
    
    // Show success state briefly
    buttonEl.innerHTML = `<i class="fas fa-check"></i><span>Downloaded!</span>`;
    setTimeout(() => {
      buttonEl.disabled = false;
      buttonEl.classList.remove('loading');
      buttonEl.innerHTML = originalHtml;
    }, 2000);
  } catch (e) {
    console.error('Download error:', e);
    buttonEl.innerHTML = `<i class="fas fa-exclamation-circle"></i><span>Failed</span>`;
    setTimeout(() => {
      buttonEl.disabled = false;
      buttonEl.classList.remove('loading');
      buttonEl.innerHTML = originalHtml;
    }, 2000);
  }
}
