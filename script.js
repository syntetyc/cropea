/**
 * Image Cropper Application
 * Professional image cropping tool with multiple aspect ratios and presets
 */

class ImageCropper {
    constructor() {
        this.cropper = null;
        this.imgElement = null;
        this.originalFile = null;
        this.lastCanvas = null;
        
        // DOM elements
        this.dropArea = document.getElementById('dropArea');
        this.ratioButtons = document.querySelectorAll('.sidebar button');
        this.mobileRatioSelect = document.getElementById('mobileRatioSelect');
        this.inputFile = document.getElementById('inputFile');
        this.dimensionsBar = document.getElementById('dimensions');
        this.presetSelect = document.getElementById('presetSelect');
        this.formatSelector = document.getElementById('formatSelector');
        this.formatHint = document.getElementById('formatHint');
        this.cropBtn = document.getElementById('cropBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.undoBtn = document.getElementById('undoBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        // Drawing tool elements
        this.drawingTools = document.getElementById('drawingTools');
        this.freeDrawBtn = document.getElementById('freeDrawBtn');
        this.straightLineBtn = document.getElementById('straightLineBtn');
        this.drawingOptions = document.getElementById('drawingOptions');
        this.penSizeBtns = document.querySelectorAll('.pen-size-btn');
        this.colorBtns = document.querySelectorAll('.color-btn');
        this.eraseAllBtn = document.getElementById('eraseAllBtn');
        this.closeDrawingBtn = document.getElementById('closeDrawingBtn');
        
        // Drawing state
        this.isDrawing = false;
        this.drawingMode = null; // 'free' or 'straight'
        this.currentPenSize = 2;
        this.currentColor = '#000000';
        this.drawingCanvas = null;
        this.drawingCtx = null;
        this.startPoint = null;
        this.previewCanvas = null;
        this.previewCtx = null;
        
        // Aspect ratio presets with resolutions
        this.presets = {
            '16/9': [
                ['HD', 1280, 720],
                ['FullHD', 1920, 1080],
                ['2K', 2560, 1440],
                ['4K', 3840, 2160]
            ],
            '9/16': [
                ['HD', 720, 1280],
                ['FullHD', 1080, 1920],
                ['2K', 1440, 2560],
                ['4K', 2160, 3840]
            ],
            '1': [
                ['1K', 1000, 1000],
                ['2K', 2000, 2000]
            ],
            'free': [],
            'circle': [
                ['100x100', 100, 100],
                ['150x150', 150, 150],
                ['250x250', 250, 250],
                ['500x500', 500, 500],
                ['600x600', 600, 600],
                ['650x650', 650, 650],
                ['1000x1000', 1000, 1000]
            ]
        };
        
        this.init();
    }
    
    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.resetUI();
    }
    
    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Drag and drop events
        this.setupDragAndDrop();
        
        // File input
        this.inputFile.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadImage(e.target.files[0]);
            }
        });
        
        // Ratio selection buttons
        this.ratioButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Don't allow action if button is inactive
                if (btn.classList.contains('inactive')) {
                    return;
                }
                this.setActiveRatio(btn.dataset.ratio);
                this.updateActiveButton(btn);
                this.updateFormatHint();
            });
        });
        
        // Mobile ratio selector
        this.mobileRatioSelect.addEventListener('change', () => {
            // Don't allow action if no image is loaded
            if (!this.imgElement) {
                this.mobileRatioSelect.value = '';
                return;
            }
            this.setActiveRatio(this.mobileRatioSelect.value);
            this.updateFormatHint();
        });
        
        // Preset selector
        this.presetSelect.addEventListener('change', () => {
            this.applyPresetDimensions();
        });
        
        // Format selector radio buttons
        const formatRadios = document.querySelectorAll('input[name="imageFormat"]');
        formatRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updateRadioButtons();
                this.updateFormatHint();
            });
        });
        
        // Format option labels (for clicking on the label)
        const formatOptions = document.querySelectorAll('.format-option');
        formatOptions.forEach(option => {
            option.addEventListener('click', () => {
                const radio = option.querySelector('input[type="radio"]');
                if (radio) {
                    radio.checked = true;
                    this.updateRadioButtons();
                    this.updateFormatHint();
                }
            });
        });
        
        // Action buttons
        this.cropBtn.addEventListener('click', () => this.cropImage());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        this.undoBtn.addEventListener('click', () => this.undoChanges());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        
        // Drawing tool events
        this.freeDrawBtn.addEventListener('click', () => this.toggleDrawingMode('free'));
        this.straightLineBtn.addEventListener('click', () => this.toggleDrawingMode('straight'));
        this.closeDrawingBtn.addEventListener('click', () => this.closeDrawingMode());
        this.eraseAllBtn.addEventListener('click', () => this.eraseAllDrawings());
        
        // Pen size selection
        this.penSizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentPenSize = parseInt(btn.dataset.size);
                this.updatePenSizeButtons(btn);
            });
        });
        
        // Color selection
        this.colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentColor = btn.dataset.color;
                this.updateColorButtons(btn);
            });
        });
        
        // Drop area click
        this.dropArea.addEventListener('click', () => {
            if (!this.imgElement) {
                this.inputFile.click();
            }
        });
    }
    
    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
        
        dragEvents.forEach(eventName => {
            this.dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        this.dropArea.addEventListener('drop', (e) => {
            const file = e.dataTransfer.files[0];
            if (file) {
                this.loadImage(file);
            }
        });
    }
    
    /**
     * Load and display an image file
     * @param {File} file - The image file to load
     */
    loadImage(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showError();
            return;
        }
        
        // Store original file for undo functionality
        this.originalFile = file;
        
        // Clean up existing cropper
        this.destroyCropper();
        
        // Clear drop area and create new image element
        this.dropArea.classList.remove('circle');
        this.dropArea.innerHTML = '';
        
        this.imgElement = document.createElement('img');
        this.imgElement.style.maxWidth = '100%';
        this.imgElement.style.maxHeight = '100%';
        
        // Initialize cropper and drawing canvas only after image loads
        this.imgElement.onload = () => {
            // Create drawing canvas overlay
            this.createDrawingCanvas();
            
            // Initialize cropper
            this.initCropper();
            
            // Ensure drawing canvas is properly sized
            this.resizeDrawingCanvas();
        };
        
        this.imgElement.src = URL.createObjectURL(file);
        this.dropArea.appendChild(this.imgElement);
        
        // Update UI state for loaded image
        this.showImageLoadedState();
    }
    
    /**
     * Show UI state when image is loaded
     */
    showImageLoadedState() {
        // Show buttons that are available when image is loaded
        this.undoBtn.style.display = 'inline-flex';
        this.clearBtn.style.display = 'inline-flex';
        
        // Activate crop button
        this.cropBtn.classList.remove('inactive');
        this.cropBtn.disabled = false;
        
        // Activate sidebar buttons
        this.activateSidebarButtons();
        
        // Hide download button until crop is done
        this.downloadBtn.style.display = 'none';
        
        // Reset other UI elements
        this.presetSelect.style.display = 'none';
        this.formatSelector.style.display = 'none';
        this.drawingTools.style.display = 'none';
        this.drawingOptions.style.display = 'none';
    }
    
    /**
     * Activate sidebar buttons when image is loaded
     */
    activateSidebarButtons() {
        this.ratioButtons.forEach(btn => {
            btn.classList.remove('inactive');
        });
        
        // Enable mobile selector
        this.mobileRatioSelect.disabled = false;
        this.mobileRatioSelect.style.opacity = '1';
    }
    
    /**
     * Deactivate sidebar buttons when no image
     */
    deactivateSidebarButtons() {
        this.ratioButtons.forEach(btn => {
            btn.classList.add('inactive');
            btn.classList.remove('active');
        });
        
        // Disable mobile selector
        this.mobileRatioSelect.disabled = true;
        this.mobileRatioSelect.style.opacity = '0.6';
        this.mobileRatioSelect.value = '';
    }
    
    /**
     * Initialize the Cropper.js instance
     */
    initCropper() {
        if (!this.imgElement) return;
        
        this.cropper = new Cropper(this.imgElement, {
            viewMode: 1,
            autoCropArea: 0.8,
            dragMode: 'crop',
            movable: true,
            zoomable: true,
            responsive: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            center: true,
            crop: (event) => {
                const { width, height } = event.detail;
                this.updateDimensions(Math.round(width), Math.round(height));
            }
        });
    }
    
    /**
     * Create drawing canvas overlay
     */
    createDrawingCanvas() {
        this.drawingCanvas = document.createElement('canvas');
        this.drawingCanvas.style.position = 'absolute';
        this.drawingCanvas.style.top = '0';
        this.drawingCanvas.style.left = '0';
        this.drawingCanvas.style.pointerEvents = 'none';
        this.drawingCanvas.style.zIndex = '1000';
        
        // Create preview canvas for straight lines
        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.style.position = 'absolute';
        this.previewCanvas.style.top = '0';
        this.previewCanvas.style.left = '0';
        this.previewCanvas.style.pointerEvents = 'none';
        this.previewCanvas.style.zIndex = '1001';
        
        this.dropArea.style.position = 'relative';
        this.dropArea.appendChild(this.drawingCanvas);
        this.dropArea.appendChild(this.previewCanvas);
        
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        // Resize canvas to match image
        this.resizeDrawingCanvas();
        
        // Add drawing event listeners
        this.setupDrawingEvents();
    }
    
    /**
     * Resize drawing canvas to match the image
     */
    resizeDrawingCanvas() {
        if (!this.drawingCanvas || !this.previewCanvas || !this.imgElement) return;
        
        const rect = this.imgElement.getBoundingClientRect();
        const containerRect = this.dropArea.getBoundingClientRect();
        
        // Resize drawing canvas
        this.drawingCanvas.width = rect.width;
        this.drawingCanvas.height = rect.height;
        this.drawingCanvas.style.width = rect.width + 'px';
        this.drawingCanvas.style.height = rect.height + 'px';
        this.drawingCanvas.style.left = (rect.left - containerRect.left) + 'px';
        this.drawingCanvas.style.top = (rect.top - containerRect.top) + 'px';
        
        // Resize preview canvas
        this.previewCanvas.width = rect.width;
        this.previewCanvas.height = rect.height;
        this.previewCanvas.style.width = rect.width + 'px';
        this.previewCanvas.style.height = rect.height + 'px';
        this.previewCanvas.style.left = (rect.left - containerRect.left) + 'px';
        this.previewCanvas.style.top = (rect.top - containerRect.top) + 'px';
    }
    
    /**
     * Setup drawing event listeners
     */
    setupDrawingEvents() {
        if (!this.drawingCanvas) return;
        
        // Use the drop area for mouse events since drawing canvas has pointer-events: none by default
        this.dropArea.addEventListener('mousedown', (e) => {
            if (this.drawingMode) {
                this.startDrawing(e);
            }
        });
        this.dropArea.addEventListener('mousemove', (e) => {
            if (this.drawingMode) {
                this.draw(e);
            }
        });
        this.dropArea.addEventListener('mouseup', () => {
            if (this.drawingMode) {
                this.stopDrawing();
            }
        });
        this.dropArea.addEventListener('mouseleave', () => {
            if (this.drawingMode) {
                this.stopDrawing();
            }
        });
        
        // Touch events for mobile
        this.dropArea.addEventListener('touchstart', (e) => {
            if (this.drawingMode) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.dropArea.dispatchEvent(mouseEvent);
            }
        });
        
        this.dropArea.addEventListener('touchmove', (e) => {
            if (this.drawingMode) {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.dropArea.dispatchEvent(mouseEvent);
            }
        });
        
        this.dropArea.addEventListener('touchend', (e) => {
            if (this.drawingMode) {
                e.preventDefault();
                const mouseEvent = new MouseEvent('mouseup', {});
                this.dropArea.dispatchEvent(mouseEvent);
            }
        });
    }
    
    /**
     * Toggle drawing mode
     */
    toggleDrawingMode(mode) {
        if (this.drawingMode === mode) {
            this.closeDrawingMode();
            return;
        }
        
        this.drawingMode = mode;
        this.drawingOptions.style.display = 'block';
        
        // Enable drawing by changing cursor and preventing default drop area behavior
        this.dropArea.style.cursor = 'crosshair';
        
        // Update button states
        this.freeDrawBtn.classList.toggle('active', mode === 'free');
        this.straightLineBtn.classList.toggle('active', mode === 'straight');
        
        // Disable cropper when drawing
        if (this.cropper) {
            this.cropper.disable();
        }
    }
    
    /**
     * Close drawing mode
     */
    closeDrawingMode() {
        this.drawingMode = null;
        this.drawingOptions.style.display = 'none';
        
        // Reset cursor
        this.dropArea.style.cursor = this.imgElement ? 'default' : 'pointer';
        
        // Update button states
        this.freeDrawBtn.classList.remove('active');
        this.straightLineBtn.classList.remove('active');
        
        // Re-enable cropper
        if (this.cropper) {
            this.cropper.enable();
        }
    }
    
    /**
     * Start drawing
     */
    startDrawing(e) {
        if (!this.drawingMode) return;
        
        // Prevent default behavior
        e.preventDefault();
        e.stopPropagation();
        
        this.isDrawing = true;
        const rect = this.dropArea.getBoundingClientRect();
        const canvasRect = this.drawingCanvas.getBoundingClientRect();
        
        this.startPoint = {
            x: e.clientX - canvasRect.left,
            y: e.clientY - canvasRect.top
        };
        
        this.drawingCtx.strokeStyle = this.currentColor;
        this.drawingCtx.lineWidth = this.currentPenSize;
        this.drawingCtx.lineCap = 'round';
        this.drawingCtx.lineJoin = 'round';
        
        if (this.drawingMode === 'free') {
            this.drawingCtx.beginPath();
            this.drawingCtx.moveTo(this.startPoint.x, this.startPoint.y);
        }
    }
    
    /**
     * Draw function
     */
    draw(e) {
        if (!this.isDrawing || !this.drawingMode) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const canvasRect = this.drawingCanvas.getBoundingClientRect();
        const currentPoint = {
            x: e.clientX - canvasRect.left,
            y: e.clientY - canvasRect.top
        };
        
        if (this.drawingMode === 'free') {
            this.drawingCtx.lineTo(currentPoint.x, currentPoint.y);
            this.drawingCtx.stroke();
        } else if (this.drawingMode === 'straight') {
            // Clear preview canvas and draw preview line
            this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
            this.previewCtx.strokeStyle = this.currentColor;
            this.previewCtx.lineWidth = this.currentPenSize;
            this.previewCtx.lineCap = 'round';
            this.previewCtx.lineJoin = 'round';
            this.previewCtx.beginPath();
            this.previewCtx.moveTo(this.startPoint.x, this.startPoint.y);
            this.previewCtx.lineTo(currentPoint.x, currentPoint.y);
            this.previewCtx.stroke();
            
            this.lastMousePos = currentPoint;
        }
    }
    
    /**
     * Stop drawing
     */
    stopDrawing() {
        if (!this.isDrawing || !this.drawingMode) return;
        
        if (this.drawingMode === 'straight' && this.startPoint) {
            if (this.lastMousePos) {
                // Draw the final line on the main drawing canvas
                this.drawingCtx.beginPath();
                this.drawingCtx.moveTo(this.startPoint.x, this.startPoint.y);
                this.drawingCtx.lineTo(this.lastMousePos.x, this.lastMousePos.y);
                this.drawingCtx.stroke();
                
                // Clear the preview canvas
                this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
            }
        }
        
        this.isDrawing = false;
        this.startPoint = null;
        this.lastMousePos = null;
    }
    
    /**
     * Update pen size button states
     */
    updatePenSizeButtons(activeBtn) {
        this.penSizeBtns.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }
    
    /**
     * Update color button states
     */
    updateColorButtons(activeBtn) {
        this.colorBtns.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }
    
    /**
     * Erase all drawings
     */
    eraseAllDrawings() {
        if (this.drawingCtx) {
            this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        }
        if (this.previewCtx) {
            this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        }
    }
    
    /**
     * Set the active aspect ratio
     * @param {string} ratio - The aspect ratio value
     */
    setActiveRatio(ratio) {
        if (!this.cropper) return;
        
        // Apply aspect ratio
        if (ratio === 'free') {
            this.cropper.setAspectRatio(NaN);
            this.dropArea.classList.remove('circle');
        } else if (ratio === 'circle') {
            this.cropper.setAspectRatio(1);
            this.dropArea.classList.add('circle');
        } else {
            // Convert ratio string to number (e.g., "16/9" -> 16/9)
            const aspectRatio = this.parseRatio(ratio);
            this.cropper.setAspectRatio(aspectRatio);
            this.dropArea.classList.remove('circle');
        }
        
        // Update preset options
        this.updatePresetOptions(ratio);
    }
    
    /**
     * Parse ratio string to number
     * @param {string} ratioStr - Ratio string like "16/9"
     * @returns {number} - Calculated ratio
     */
    parseRatio(ratioStr) {
        if (ratioStr === '1') return 1;
        const parts = ratioStr.split('/');
        return parseInt(parts[0]) / parseInt(parts[1]);
    }
    
    /**
     * Update active button state
     * @param {HTMLElement} activeBtn - The button to set as active
     */
    updateActiveButton(activeBtn) {
        this.ratioButtons.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }
    
    /**
     * Update preset options based on selected ratio
     * @param {string} ratio - The selected ratio
     */
    updatePresetOptions(ratio) {
        const options = this.presets[ratio] || [];
        
        if (options.length > 0) {
            this.presetSelect.innerHTML = '<option value="">Seleccione resolución</option>' +
                options.map(([name, width, height]) => 
                    `<option value="${width}x${height}">${name}</option>`
                ).join('');
            this.presetSelect.style.display = 'block';
        } else {
            this.presetSelect.style.display = 'none';
        }
    }
    
    /**
     * Apply preset dimensions to the cropper
     */
    applyPresetDimensions() {
        if (!this.cropper || !this.presetSelect.value) return;
        
        const [width, height] = this.presetSelect.value.split('x').map(Number);
        this.cropper.setData({ width, height });
        this.updateDimensions(width, height);
    }
    
    /**
     * Update dimensions display
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels
     */
    updateDimensions(width, height) {
        this.dimensionsBar.innerHTML = `Tamaño del Cropeo: <span class="dimensions-numbers">${width} x ${height} px</span>`;
    }
    
    /**
     * Update Material Design radio button icons
     */
    updateRadioButtons() {
        const formatOptions = document.querySelectorAll('.format-option');
        formatOptions.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            const icon = option.querySelector('.radio-icon');
            if (radio.checked) {
                option.classList.add('selected');
                icon.textContent = 'radio_button_checked';
            } else {
                option.classList.remove('selected');
                icon.textContent = 'radio_button_unchecked';
            }
        });
    }
    
    /**
     * Get selected image format
     * @returns {string} - Selected format (png, jpg, webp, gif)
     */
    getSelectedFormat() {
        const selectedRadio = document.querySelector('input[name="imageFormat"]:checked');
        return selectedRadio ? selectedRadio.value : 'png';
    }
    
    /**
     * Update format hint based on selection and crop type
     */
    updateFormatHint() {
        if (!this.formatHint) return;
        
        const format = this.getSelectedFormat();
        const isCircular = this.dropArea.classList.contains('circle');
        
        if (isCircular && format === 'png') {
            this.formatHint.textContent = 'PNG mantendrá el fondo transparente';
        } else if (isCircular && format === 'gif') {
            this.formatHint.textContent = 'GIF mantendrá el fondo transparente al cropeo circular';
        } else if (isCircular && (format === 'jpg' || format === 'webp')) {
            this.formatHint.textContent = 'Se añadirá fondo blanco al recorte circular';
        } else {
            this.formatHint.textContent = '';
        }
    }
    
    /**
     * Get MIME type for selected format
     * @param {string} format - Format string
     * @returns {string} - MIME type
     */
    getMimeType(format) {
        const mimeTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'webp': 'image/webp',
            'gif': 'image/gif'
        };
        return mimeTypes[format] || 'image/png';
    }
    
    /**
     * Get file extension for selected format
     * @param {string} format - Format string
     * @returns {string} - File extension
     */
    getFileExtension(format) {
        const extensions = {
            'png': 'png',
            'jpg': 'jpg',
            'webp': 'webp',
            'gif': 'gif'
        };
        return extensions[format] || 'png';
    }
    
    /**
     * Crop the image
     */
    cropImage() {
        if (!this.cropper) return;
        
        let canvas = this.cropper.getCroppedCanvas();
        
        // Apply preset dimensions if selected
        if (this.presetSelect.value) {
            const [width, height] = this.presetSelect.value.split('x').map(Number);
            canvas = this.cropper.getCroppedCanvas({ width, height });
        }
        
        // Handle circular cropping
        if (this.dropArea.classList.contains('circle')) {
            canvas = this.createCircularCanvas(canvas);
        }
        
        this.lastCanvas = canvas;
        this.displayCroppedImage(canvas);
        this.showDownloadOptions();
    }
    
    /**
     * Download the cropped image with drawings merged
     */
    downloadImage() {
        if (!this.lastCanvas) return;
        
        let finalCanvas = this.lastCanvas;
        
        // If there are drawings on the current image, merge them
        if (this.drawingCanvas && this.hasDrawings()) {
            finalCanvas = this.mergeCurrentDrawings(this.lastCanvas);
        }
        
        const format = this.getSelectedFormat();
        const mimeType = this.getMimeType(format);
        const extension = this.getFileExtension(format);
        
        // Get quality parameter for lossy formats
        const quality = (format === 'jpg' || format === 'webp') ? 0.9 : undefined;
        
        const link = document.createElement('a');
        link.href = finalCanvas.toDataURL(mimeType, quality);
        
        // Extract dimensions from the dimensions bar
        const dimensionsText = this.dimensionsBar.querySelector('.dimensions-numbers').textContent;
        const dimensions = dimensionsText.replace(' px', '').replace(' x ', 'x');
        link.download = `cropea-${dimensions}.${extension}`;
        
        link.click();
    }
    
    /**
     * Check if there are any drawings on the canvas
     */
    hasDrawings() {
        if (!this.drawingCanvas) return false;
        
        const ctx = this.drawingCanvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        
        // Check if any pixel has been modified (not transparent)
        for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] !== 0) return true;
        }
        return false;
    }
    
    /**
     * Merge current drawings with the image canvas
     */
    mergeCurrentDrawings(imageCanvas) {
        if (!this.drawingCanvas) return imageCanvas;
        
        // Create a new canvas for the merged result
        const mergedCanvas = document.createElement('canvas');
        mergedCanvas.width = imageCanvas.width;
        mergedCanvas.height = imageCanvas.height;
        const mergedCtx = mergedCanvas.getContext('2d');
        
        // Draw the image first
        mergedCtx.drawImage(imageCanvas, 0, 0);
        
        // Get the current image element dimensions
        const imgRect = this.imgElement.getBoundingClientRect();
        const containerRect = this.dropArea.getBoundingClientRect();
        
        // Calculate scale factors between drawing canvas and final image
        const scaleX = imageCanvas.width / this.drawingCanvas.width;
        const scaleY = imageCanvas.height / this.drawingCanvas.height;
        
        // Draw the drawings on top, scaled appropriately
        mergedCtx.save();
        mergedCtx.scale(scaleX, scaleY);
        mergedCtx.drawImage(this.drawingCanvas, 0, 0);
        mergedCtx.restore();
        
        return mergedCanvas;
    }
    
    /**
     * Create circular canvas from rectangular canvas
     * @param {HTMLCanvasElement} sourceCanvas - Source canvas
     * @returns {HTMLCanvasElement} - Circular canvas
     */
    createCircularCanvas(sourceCanvas) {
        const size = Math.min(sourceCanvas.width, sourceCanvas.height);
        const circularCanvas = document.createElement('canvas');
        circularCanvas.width = size;
        circularCanvas.height = size;
        
        const ctx = circularCanvas.getContext('2d');
        const format = this.getSelectedFormat();
        
        // Clear canvas
        ctx.clearRect(0, 0, size, size);
        
        // Add white background for non-PNG formats
        if (format !== 'png') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, size, size);
        }
        
        // Create circular clipping path
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
        ctx.clip();
        
        // Draw image centered
        const dx = (size - sourceCanvas.width) / 2;
        const dy = (size - sourceCanvas.height) / 2;
        ctx.drawImage(sourceCanvas, dx, dy);
        ctx.restore();
        
        return circularCanvas;
    }
    
    /**
     * Display cropped image in the drop area
     * @param {HTMLCanvasElement} canvas - The cropped canvas
     */
    displayCroppedImage(canvas) {
        this.dropArea.innerHTML = '';
        
        const img = document.createElement('img');
        img.src = canvas.toDataURL('image/png');
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        
        this.dropArea.appendChild(img);
        this.imgElement = img;
        
        // Create new drawing canvas for the cropped image
        this.imgElement.onload = () => {
            this.createDrawingCanvas();
            this.resizeDrawingCanvas();
        };
        
        // Destroy cropper after cropping
        this.destroyCropper();
    }
    
    /**
     * Show download options (button and format selector)
     */
    showDownloadOptions() {
        // Hide crop button and show download button
        this.cropBtn.style.display = 'none';
        this.downloadBtn.style.display = 'inline-flex';
        
        // Deactivate sidebar buttons after crop
        this.deactivateSidebarButtons();
        
        // Show other download-related options
        this.formatSelector.style.display = 'block';
        this.drawingTools.style.display = 'flex';
        this.updateRadioButtons();
        this.updateFormatHint();
    }
    
    /**
     * Undo changes and reload original image
     */
    undoChanges() {
        if (this.originalFile) {
            this.loadImage(this.originalFile);
        }
    }
    
    /**
     * Clear all and reset to initial state
     */
    clearAll() {
        this.destroyCropper();
        this.imgElement = null; // Reset image element reference
        this.resetUI();
        this.clearActiveButtons();
        this.closeDrawingMode();
        this.eraseAllDrawings();
        
        // Reset format selector to PNG
        const pngRadio = document.querySelector('input[name="imageFormat"][value="png"]');
        if (pngRadio) {
            pngRadio.checked = true;
        }
        this.updateRadioButtons();
    }
    
    /**
     * Show error state
     */
    showError() {
        this.dropArea.innerHTML = '<div class="placeholder"><i class="material-symbols-outlined" style="font-size:48px; color:#F97251">dangerous</i></div>';
        this.dimensionsBar.innerHTML = 'Tamaño del Cropeo: <span class="dimensions-numbers">0 x 0 px</span>';
    }
    
    /**
     * Reset UI to initial state
     */
    resetUI() {
        this.dropArea.innerHTML = '<div class="placeholder"><i class="material-symbols-outlined">add_photo_alternate</i></div>';
        this.dropArea.style.cursor = 'pointer'; // Ensure cursor is pointer for clickable state
        this.dimensionsBar.innerHTML = 'Tamaño del Cropeo: <span class="dimensions-numbers">0 x 0 px</span>';
        
        // Hide some buttons initially, but show crop button as inactive
        this.undoBtn.style.display = 'none';
        this.clearBtn.style.display = 'none';
        this.cropBtn.style.display = 'inline-flex';
        this.cropBtn.classList.add('inactive');
        this.cropBtn.disabled = true;
        this.downloadBtn.style.display = 'none';
        
        // Deactivate sidebar buttons
        this.deactivateSidebarButtons();
        
        // Hide other UI elements
        this.presetSelect.style.display = 'none';
        this.formatSelector.style.display = 'none';
        this.drawingTools.style.display = 'none';
        this.drawingOptions.style.display = 'none';
        this.formatHint.textContent = '';
    }
    
    /**
     * Clear active state from all buttons
     */
    clearActiveButtons() {
        this.ratioButtons.forEach(btn => btn.classList.remove('active'));
        this.mobileRatioSelect.value = '';
    }
    
    /**
     * Destroy the cropper instance
     */
    destroyCropper() {
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ImageCropper();
});