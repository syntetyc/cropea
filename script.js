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
                this.setActiveRatio(btn.dataset.ratio);
                this.updateActiveButton(btn);
                this.updateFormatHint();
            });
        });
        
        // Mobile ratio selector
        this.mobileRatioSelect.addEventListener('change', () => {
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
        this.imgElement.src = URL.createObjectURL(file);
        this.imgElement.style.maxWidth = '100%';
        this.imgElement.style.maxHeight = '100%';
        
        this.dropArea.appendChild(this.imgElement);
        
        // Initialize cropper
        this.initCropper();
        
        // Reset UI state
        this.downloadBtn.style.display = 'none';
        this.presetSelect.style.display = 'none';
        this.formatSelector.style.display = 'none';
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
        this.dimensionsBar.textContent = `${width} x ${height} px`;
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
        } else if (isCircular && format !== 'png') {
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
        
        // Destroy cropper after cropping
        this.destroyCropper();
    }
    
    /**
     * Show download options (button and format selector)
     */
    showDownloadOptions() {
        this.downloadBtn.style.display = 'inline-flex';
        this.formatSelector.style.display = 'block';
        this.updateRadioButtons();
        this.updateFormatHint();
    }
    
    /**
     * Download the cropped image
     */
    downloadImage() {
        if (!this.lastCanvas) return;
        
        const format = this.getSelectedFormat();
        const mimeType = this.getMimeType(format);
        const extension = this.getFileExtension(format);
        
        // Get quality parameter for lossy formats
        const quality = (format === 'jpg' || format === 'webp') ? 0.9 : undefined;
        
        const link = document.createElement('a');
        link.href = this.lastCanvas.toDataURL(mimeType, quality);
        
        const dimensions = this.dimensionsBar.textContent
            .replace(/ px/g, '')
            .replace(' x ', 'x');
        link.download = `cropea-${dimensions}px.${extension}`;
        
        link.click();
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
        this.resetUI();
        this.clearActiveButtons();
        
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
        this.dropArea.innerHTML = '<div class="placeholder"><i class="material-icons" style="font-size:48px; color:#F97251">dangerous</i></div>';
        this.updateDimensions(0, 0);
    }
    
    /**
     * Reset UI to initial state
     */
    resetUI() {
        this.dropArea.innerHTML = '<div class="placeholder"><i class="material-icons">add_photo_alternate</i></div>';
        this.updateDimensions(0, 0);
        this.downloadBtn.style.display = 'none';
        this.presetSelect.style.display = 'none';
        this.formatSelector.style.display = 'none';
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