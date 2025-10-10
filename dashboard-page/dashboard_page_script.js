const profileIcon = document.getElementById('profileIcon');
const profileMenu = document.getElementById('profileMenu');
const userCaret = document.querySelector('.user-caret');
const userNameSpanHeader = document.querySelector('.user-info span');
const userInfoContainer = document.querySelector('.user-info');

function toggleProfileMenu(e) {
    e?.stopPropagation();
    profileMenu.classList.toggle('hidden');
    if (userInfoContainer) {
        userInfoContainer.classList.toggle('open', !profileMenu.classList.contains('hidden'));
    }
}

if (profileIcon) profileIcon.addEventListener('click', toggleProfileMenu);
if (userCaret) userCaret.addEventListener('click', toggleProfileMenu);
if (userNameSpanHeader) userNameSpanHeader.addEventListener('click', toggleProfileMenu);

// Hide menu when clicking outside
document.addEventListener('click', (e) => {
    const isInside = e.target.closest('.user-info') || e.target.closest('.profile-menu');
    if (!isInside) {
        profileMenu.classList.add('hidden');
        if (userInfoContainer) userInfoContainer.classList.remove('open');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // --- Authentication Check ---
    const checkAuth = async () => {
        try {
            const response = await fetch('/dashboard');
            if (!response.ok && response.status === 401) {
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login';
        }
    };

    // Check authentication on page load
    checkAuth();

    // --- Load User Info ---
    const loadUserInfo = async () => {
        try {
            const response = await fetch('/api/user/info', {
                credentials: 'include'
            });
            if (response.ok) {
                const userData = await response.json();
                // Update user name in the header
                const userNameSpan = document.querySelector('.user-info span');
                if (userNameSpan) {
                    userNameSpan.textContent = userData.fullName;
                }
                // Update mobile user name in menu
                const mobileUserNameSpan = document.querySelector('.mobile-user-name');
                if (mobileUserNameSpan) mobileUserNameSpan.textContent = userData.fullName;
                // Update welcome message (English)
                const welcomeMessage = document.querySelector('.dashboard-hero h1');
                if (welcomeMessage) {
                    welcomeMessage.textContent = `Welcome ${userData.fullName}! Start trying your T‑shirt on models.`;
                }
            }
        } catch (error) {
            console.error('Failed to load user info:', error);
        }
    };

    // Load user info when page loads
    loadUserInfo();

    // --- Logout Functionality ---
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (response.ok) {
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('Logout failed:', error);
            }
        });
    }

    // --- Navigation Toggle (for mobile) ---
    const navToggle = document.querySelector('.nav-toggle');
    const dashboardNav = document.querySelector('.dashboard-nav');

    navToggle.addEventListener('click', () => {
        dashboardNav.classList.toggle('active');
    });

    // --- Theme Toggle (dropdown and mobile menu) ---
    const themeToggleItems = document.querySelectorAll('.theme-toggle-item');
    function setThemeIconFor(el, theme){
        const icon = el?.querySelector('i');
        if (icon) icon.className = theme==='dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    // Init from saved
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggleItems.forEach(el => setThemeIconFor(el, savedTheme));
    themeToggleItems.forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            themeToggleItems.forEach(i => setThemeIconFor(i, next));
            profileMenu.classList.add('hidden');
            mobileProfile?.classList.remove('open');
        });
    });

    // --- Mobile profile collapsible ---
    const mobileProfile = document.querySelector('.mobile-profile');
    const mobileHeader = document.querySelector('.mobile-profile-header');
    mobileHeader?.addEventListener('click', () => {
        mobileProfile?.classList.toggle('open');
    });

    // --- Model Selection with Preview ---
    const modelSelect = document.getElementById('modelSelect');
    const selectedModelPreview = document.getElementById('selectedModelPreview');
    const modelImage = selectedModelPreview.querySelector('.model-image');
    const modelName = selectedModelPreview.querySelector('.model-name');
    // Toggle between site models and custom model upload
    const useSiteModels = document.getElementById('useSiteModels');
    const useCustomModel = document.getElementById('useCustomModel');
    const siteModelsBlock = document.getElementById('siteModelsBlock');
    const customModelBlock = document.getElementById('customModelBlock');
    const modelUpload = document.getElementById('modelUpload');
    const browseModelFiles = document.getElementById('browseModelFiles');
    const modelFilePreview = document.getElementById('modelFilePreview');
    const modelFilePreviewImg = modelFilePreview?.querySelector('img');
    const modelFilePreviewName = modelFilePreview?.querySelector('.file-name');
    const removeModelFileBtn = document.getElementById('removeModelFileBtn');

    // Will store models loaded from server
    let models = [];

    // Function to load models from server
    async function loadModels() {
        try {
            const response = await fetch('/api/models');
            if (!response.ok) {
                throw new Error('Failed to load models');
            }
            models = await response.json();
            loadModelsIntoDropdown();
        } catch (error) {
            console.error('Error loading models:', error);
            showToast(processingErrorToast);
        }
    }

    function loadModelsIntoDropdown() {
        // Clear existing options except the default one
        while (modelSelect.options.length > 1) {
            modelSelect.remove(1);
        }

        // Add new options
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.name;
            modelSelect.appendChild(option);
        });
    }

    modelSelect.addEventListener('change', () => {
        const selectedModelId = modelSelect.value;
        const selectedModel = models.find(m => m.id === selectedModelId);

        if (selectedModel) {
            modelImage.src = selectedModel.image;
            modelName.textContent = selectedModel.name;
            selectedModelPreview.classList.remove('hidden');
        } else {
            selectedModelPreview.classList.add('hidden');
        }
    });

    // Handle model source toggle
    function updateModelSourceUI() {
        const useCustom = useCustomModel?.checked;
        if (useCustom) {
            siteModelsBlock.classList.add('hidden');
            customModelBlock.classList.remove('hidden');
        } else {
            customModelBlock.classList.add('hidden');
            siteModelsBlock.classList.remove('hidden');
        }
    }
    useSiteModels?.addEventListener('change', updateModelSourceUI);
    useCustomModel?.addEventListener('change', updateModelSourceUI);
    updateModelSourceUI();

    // Custom model upload interactions
    browseModelFiles?.addEventListener('click', () => modelUpload.click());
    customModelBlock?.addEventListener('click', (e) => {
        if (!e.target.closest('.remove-file-btn') && e.target !== modelUpload && e.target !== browseModelFiles) {
            modelUpload.click();
        }
    });
    // Drag & drop for custom model
    ;['dragenter','dragover','dragleave','drop'].forEach(ev => customModelBlock?.addEventListener(ev, preventDefaults, false));
    ;['dragenter','dragover'].forEach(ev => customModelBlock?.addEventListener(ev, () => customModelBlock.classList.add('highlight', 'drag-over'), false));
    ;['dragleave','drop'].forEach(ev => customModelBlock?.addEventListener(ev, () => customModelBlock.classList.remove('highlight', 'drag-over'), false));
    customModelBlock?.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleModelFiles(files);
    }, false);
    modelUpload?.addEventListener('change', (e) => handleModelFiles(e.target.files));

    function handleModelFiles(files) {
        if (!files || files.length === 0) return;
        const file = files[0];
        if (file.type.match('image.*')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (modelFilePreviewImg) modelFilePreviewImg.src = e.target.result;
                if (modelFilePreviewName) modelFilePreviewName.textContent = file.name;
                modelFilePreview?.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload an image file (PNG, JPG).');
            if (modelUpload) modelUpload.value = '';
        }
    }

    removeModelFileBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        modelFilePreview?.classList.add('hidden');
        if (modelFilePreviewImg) modelFilePreviewImg.src = '';
        if (modelFilePreviewName) modelFilePreviewName.textContent = '';
        if (modelUpload) modelUpload.value = '';
    });

    // Load models from server when page loads
    loadModels();

    // --- File Upload with Preview (Drag & Drop / Browse) ---
    const fileUploadArea = document.getElementById('fileUploadArea');
    const tshirtUpload = document.getElementById('tshirtUpload');
    const browseFilesSpan = fileUploadArea.querySelector('.browse-files');
    const filePreview = document.getElementById('filePreview');
    const filePreviewImg = filePreview.querySelector('img');
    const filePreviewName = filePreview.querySelector('.file-name');
    const removeFileBtn = filePreview.querySelector('.remove-file-btn');

    // Handle click on "Browse files" text
    browseFilesSpan.addEventListener('click', () => tshirtUpload.click());
    fileUploadArea.addEventListener('click', (e) => {
        if (!e.target.closest('.remove-file-btn') && e.target !== tshirtUpload && e.target !== browseFilesSpan) {
            tshirtUpload.click();
        }
    });


    // Drag and drop functionality
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.add('highlight', 'drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => {
            fileUploadArea.classList.remove('highlight', 'drag-over');
        }, false);
    });

    fileUploadArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    tshirtUpload.addEventListener('change', (e) => handleFiles(e.target.files));

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0]; // Only handle one file for now

        if (file.type.match('image.*')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                filePreviewImg.src = e.target.result;
                filePreviewName.textContent = file.name;
                filePreview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload an image file (PNG, JPG).');
            tshirtUpload.value = ''; // Clear file input
        }
    }

    removeFileBtn.addEventListener('click', () => {
        filePreview.classList.add('hidden');
        filePreviewImg.src = '';
        filePreviewName.textContent = '';
        tshirtUpload.value = ''; // Clear the input so user can re-upload
    });

    // --- Form Submission and Processing Simulation ---
    const tryOnForm = document.getElementById('tryOnForm');
    const processButton = tryOnForm.querySelector('.process-button');
    const buttonText = processButton.querySelector('.button-text');
    const loadingSpinner = processButton.querySelector('.loading-spinner');

    const processingSuccessToast = document.getElementById('processingSuccessToast');
    const processingErrorToast = document.getElementById('processingErrorToast');
    const validationErrorToast = document.getElementById('validationErrorToast');

    // Server-side processing: send either modelId or modelImage, plus cloth file
    async function processImagesOnServer(modelId, clothFile, customModelFile) {
        const form = new FormData();
        if (customModelFile) {
            form.append('modelImage', customModelFile, customModelFile.name);
        } else {
            form.append('modelId', modelId);
        }
        // Server expects field name 'clothImage'
        form.append('clothImage', clothFile, clothFile.name);

        const response = await fetch('/api/tryon/process', {
            method: 'POST',
            body: form,
            credentials: 'include'
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(err.message || 'Server processing failed');
        }

        return response.json();
    }

    tryOnForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Basic form validation
        const usingCustom = useCustomModel?.checked;
        const customModelSelected = modelUpload && modelUpload.files && modelUpload.files.length > 0;
        const siteModelSelected = modelSelect.value;
        if (!tshirtUpload.files.length || (!usingCustom && !siteModelSelected) || (usingCustom && !customModelSelected)) {
            showToast(validationErrorToast);
            return;
        }

        buttonText.classList.add('hidden');
        loadingSpinner.classList.add('visible');
        processButton.disabled = true; // Disable button during processing

        try {
            // Get the selected model image
            const selectedModel = models.find(m => m.id === modelSelect.value);

            // Convert model image URL to base64
            const modelImageResponse = await fetch(selectedModel.image);
            const modelImageBlob = await modelImageResponse.blob();
            const modelImageBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(modelImageBlob);
            });

            // Get the uploaded t-shirt image as base64
            const tshirtImageBase64 = filePreviewImg.src;

            // Send to server which will call the AI model (keeps tokens secret)
            const customModelFile = usingCustom && customModelSelected ? modelUpload.files[0] : null;
            const serverResult = await processImagesOnServer(modelSelect.value, tshirtUpload.files[0], customModelFile);

            if (serverResult && serverResult.ok) {
                showToast(processingSuccessToast);
                const processedImageUrl = serverResult.processedImageUrl || serverResult.imageUrl || null;
                showResultInResultsGrid(modelSelect.value, processedImageUrl);

                tryOnForm.reset();
                filePreview.classList.add('hidden');
                selectedModelPreview.classList.add('hidden');
                // reset custom model if any
                removeModelFileBtn?.click();
                tshirtUpload.value = '';
                modelSelect.value = '';
            } else {
                throw new Error(serverResult && serverResult.message ? serverResult.message : 'No result from server');
            }
        } catch (error) {
            console.error('Processing failed:', error);
            showToast(processingErrorToast);
        } finally {
            buttonText.classList.remove('hidden');
            loadingSpinner.classList.remove('visible');
            processButton.disabled = false;
        }
    });

    // --- Toast Notification Helper (copied from previous pages, ensure consistent) ---
    function showToast(toastElement) {
        // Hide other toasts first
        [processingSuccessToast, processingErrorToast, validationErrorToast].forEach(toast => {
            if (toast !== toastElement && toast.classList.contains('visible')) {
                toast.classList.remove('visible');
                toast.classList.add('hidden');
            }
        });

        toastElement.classList.remove('hidden');
        toastElement.classList.add('visible');

        setTimeout(() => {
            toastElement.classList.remove('visible');
            toastElement.classList.add('hidden');
        }, 3000); // Hide after 3 seconds
    }

    // --- Show Result Image in Results Section ---
    function showResultInResultsGrid(modelId, processedImageUrl) {
        const resultsGrid = document.getElementById('resultsGrid');
        const noResultsMessage = document.getElementById('noResultsMessage');

        if (noResultsMessage) noResultsMessage.style.display = 'none';

            const modelName = models.find(m => m.id === modelId)?.name || 'Model Not Found';

        const item = document.createElement('div');
        item.classList.add('result-item');
        item.innerHTML = `
        <img src="${processedImageUrl}" alt="Processed result">
            <h3>${modelName}</h3>
            <button class="download-btn">
                <i class="fas fa-download"></i> Download Image
            </button>
        </div>
    `;

        // Ensure spinner styles exist
        ensureDownloadSpinnerStyles();
        // download button via server proxy using fetch to control loading state
        const dlBtn = item.querySelector('.download-btn');
        dlBtn.addEventListener('click', async () => {
            const fname = `tryon_${modelName}.jpg`;
            const url = `/api/download?url=${encodeURIComponent(processedImageUrl)}&filename=${encodeURIComponent(fname)}`;
            await downloadViaProxy(url, fname, dlBtn);
        });

        resultsGrid.prepend(item);
    }

    // Removed previous orders and gallery logic from dashboard
});

// Helper: fetch file via proxy and show loading indicator on button
async function downloadViaProxy(url, filename, buttonEl) {
    if (!buttonEl) return;
    const originalHtml = buttonEl.innerHTML;
    buttonEl.disabled = true;
    buttonEl.classList.add('downloading');
    buttonEl.innerHTML = `<span class="download-spinner"></span><span> Preparing...</span>`;
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
    } catch (e) {
        console.error('Download error:', e);
    } finally {
        buttonEl.disabled = false;
        buttonEl.classList.remove('downloading');
        buttonEl.innerHTML = originalHtml;
    }
}

// Inject minimal spinner styles once
function ensureDownloadSpinnerStyles() {
    if (document.getElementById('downloadSpinnerStyles')) return;
    const style = document.createElement('style');
    style.id = 'downloadSpinnerStyles';
    style.textContent = `
      .download-btn.downloading { position: relative; opacity: 0.9; }
      .download-spinner {
        display: inline-block;
        width: 16px; height: 16px;
        border: 2px solid rgba(255,255,255,0.4);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: dl-spin 0.8s linear infinite;
        vertical-align: -2px;
        margin-right: 8px;
      }
      @keyframes dl-spin { from { transform: rotate(0deg);} to { transform: rotate(360deg);} }
    `;
    document.head.appendChild(style);
}

