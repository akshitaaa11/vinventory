document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Delete confirmation
    const deleteButtons = document.querySelectorAll('.btn-delete');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
                e.preventDefault();
            }
        });
    });

    // Auto-hide flash messages after 5 seconds
    setTimeout(function() {
        const flashMessages = document.querySelectorAll('.alert-dismissible');
        flashMessages.forEach(message => {
            // Create a Bootstrap alert instance and close it
            const alert = new bootstrap.Alert(message);
            alert.close();
        });
    }, 5000);

    // Form validation
    const forms = document.querySelectorAll('.needs-validation');
    Array.prototype.slice.call(forms).forEach(function(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });

    // Equipment card filtering
    const searchInput = document.getElementById('equipment-search');
    if (searchInput) {
        searchInput.addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();
            const equipmentCards = document.querySelectorAll('.equipment-card');
            
            equipmentCards.forEach(card => {
                const equipmentName = card.querySelector('.card-title').textContent.toLowerCase();
                const equipmentDesc = card.querySelector('.card-text').textContent.toLowerCase();
                
                if (equipmentName.includes(searchTerm) || equipmentDesc.includes(searchTerm)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Lab dropdown change handler
    const labDropdown = document.getElementById('lab-dropdown');
    if (labDropdown) {
        labDropdown.addEventListener('change', function() {
            if (this.value) {
                window.location.href = `/student/equipment/${this.value}`;
            }
        });
    }

    // Status filter
    const statusFilters = document.querySelectorAll('.status-filter');
    statusFilters.forEach(filter => {
        filter.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all filters
            statusFilters.forEach(f => f.classList.remove('active'));
            
            // Add active class to clicked filter
            this.classList.add('active');
            
            const status = this.getAttribute('data-status');
            const equipmentCards = document.querySelectorAll('.equipment-card');
            
            equipmentCards.forEach(card => {
                if (status === 'all') {
                    card.style.display = '';
                } else {
                    const cardStatus = card.querySelector('.badge').textContent.toLowerCase();
                    if (cardStatus === status.toLowerCase()) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
        });
    });

    // Equipment form validation
    const equipmentForm = document.getElementById('equipment-form');
    if (equipmentForm) {
        equipmentForm.addEventListener('submit', function(event) {
            const serialNumber = document.getElementById('serial_number').value;
            const quantity = document.getElementById('quantity').value;
            
            if (quantity < 1) {
                event.preventDefault();
                alert('Quantity must be at least 1');
                return false;
            }
            
            return true;
        });
    }
    
    // Make table rows clickable
    const clickableRows = document.querySelectorAll('.clickable-row');
    clickableRows.forEach(row => {
        row.addEventListener('click', function() {
            window.location = this.dataset.href;
        });
    });
});
