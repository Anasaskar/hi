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
                // Update welcome message
                const welcomeMessage = document.querySelector('.dashboard-hero h1');
                if (welcomeMessage) {
                    welcomeMessage.textContent = `مرحبًا ${userData.fullName}! ابدأ تجربة تركيب التيشيرت على الموديلات الآن.`;
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

    // --- Model Selection with Preview ---
    const modelSelect = document.getElementById('modelSelect');
    const selectedModelPreview = document.getElementById('selectedModelPreview');
    const modelImage = selectedModelPreview.querySelector('.model-image');
    const modelName = selectedModelPreview.querySelector('.model-name');

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
        fileUploadArea.addEventListener(eventName, () => fileUploadArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        fileUploadArea.addEventListener(eventName, () => fileUploadArea.classList.remove('highlight'), false);
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

    // Server-side processing: send modelId and cloth file to server endpoint which calls the AI provider
    async function processImagesOnServer(modelId, clothFile) {
        const form = new FormData();
        form.append('modelId', modelId);
        form.append('cloth', clothFile, clothFile.name);

        const response = await fetch('/api/process-tryon', {
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
        if (!modelSelect.value || !tshirtUpload.files.length) {
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
            const serverResult = await processImagesOnServer(modelSelect.value, tshirtUpload.files[0]);

            if (serverResult && serverResult.ok) {
                showToast(processingSuccessToast);
                // If server returned a processedImageUrl (simulated or real), pass it to addProcessedOrder
                const processedImageUrl = serverResult.processedImageUrl || null;
                addProcessedOrder(tshirtUpload.files[0], modelSelect.value, processedImageUrl);

                tryOnForm.reset();
                filePreview.classList.add('hidden');
                selectedModelPreview.classList.add('hidden');
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

    // --- Previous Orders / Gallery Section ---
    const previousOrdersGrid = document.getElementById('previousOrdersGrid');

    // Load previous orders from server
    async function loadPreviousOrders() {
        previousOrdersGrid.innerHTML = '';
        try {
            const res = await fetch('/api/orders', { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch orders');
            const data = await res.json();
            const orders = data.orders || [];
            if (orders.length === 0) {
                previousOrdersGrid.innerHTML = '<p class="muted">لا توجد طلبات سابقة</p>';
                return;
            }
            orders.forEach(order => addOrderItemToGrid(order));
        } catch (err) {
            console.error('Failed to load previous orders', err);
            previousOrdersGrid.innerHTML = '<p class="muted">فشل تحميل الطلبات السابقة</p>';
        }
    }

    function addProcessedOrder(file, modelId, processedImageUrl) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const newOrder = {
                id: Date.now(), // Unique ID
                tshirtImage: e.target.result,
                processedImage: processedImageUrl || 'https://via.placeholder.com/150x150/a7f300?text=Processing...', // Placeholder for processing
                status: 'Processing',
                model: modelId
            };
            addOrderItemToGrid(newOrder);

            // If server provided a processedImageUrl we can mark it as Done immediately, otherwise simulate completion after a delay
            if (processedImageUrl) {
                setTimeout(() => {
                    const orderItem = document.getElementById(`order-item-${newOrder.id}`);
                    if (orderItem) {
                        orderItem.querySelector('.status-badge').textContent = 'Done';
                        orderItem.querySelector('.status-badge').classList.remove('processing');
                        orderItem.querySelector('.status-badge').classList.add('done');
                        orderItem.querySelector('.processed-img').src = processedImageUrl;
                        orderItem.querySelector('.download-btn').classList.remove('hidden'); // Show download button
                    }
                }, 800);
            } else {
                // Simulate processing completion after a delay
                setTimeout(() => {
                    const orderItem = document.getElementById(`order-item-${newOrder.id}`);
                    if (orderItem) {
                        orderItem.querySelector('.status-badge').textContent = 'Done';
                        orderItem.querySelector('.status-badge').classList.remove('processing');
                        orderItem.querySelector('.status-badge').classList.add('done');
                        orderItem.querySelector('.processed-img').src = `https://via.placeholder.com/150x150/28a745?text=Done`; // Actual processed image
                        orderItem.querySelector('.download-btn').classList.remove('hidden'); // Show download button
                    }
                }, 5000); // Simulate 5 seconds processing
            }
        };
        reader.readAsDataURL(file);
    }


    function addOrderItemToGrid(order) {
        const orderItem = document.createElement('div');
        orderItem.classList.add('order-item');
        orderItem.id = `order-item-${order.id}`; // Add ID for easy access

        const modelNameFromId = models.find(m => m.id === order.model)?.name || 'موديل غير معروف';


        orderItem.innerHTML = `
            <div class="image-container">
                <img src="${order.processedImage}" alt="Processed T-shirt" class="processed-img">
                <span class="status-badge ${order.status.toLowerCase()}">${order.status === 'Processing' ? 'جاري المعالجة' : 'تم'}</span>
            </div>
            <h3>${modelNameFromId}</h3>
            <p>تم الطلب: ${new Date().toLocaleDateString('ar-EG')}</p>
            <div class="buttons">
                <button class="button secondary download-btn ${order.status === 'Processing' ? 'hidden' : ''}">
                    <i class="fas fa-download"></i> تحميل
                </button>
                <button class="button secondary duplicate-btn">
                    <i class="fas fa-copy"></i> تكرار
                </button>
            </div>
        `;
        previousOrdersGrid.prepend(orderItem); // Add new orders to the top

        // Add event listeners for download/duplicate if not processing
        if (order.status === 'Done') {
            orderItem.querySelector('.download-btn').addEventListener('click', () => {
                alert(`تحميل الصورة لطلب رقم ${order.id}`);
                // In a real app, trigger actual download
            });
        }
        orderItem.querySelector('.duplicate-btn').addEventListener('click', () => {
            alert(`تكرار الطلب رقم ${order.id}`);
            // In a real app, pre-fill form or re-submit
        });
    }

    // Load initial orders when the page loads
    loadPreviousOrders();
});