const Toast = {
    container: null,

    init() {
        if (this.container) return;
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    },

    show(title, message, type = 'info', duration = 4000) {
        this.init();
        const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            <button class="toast-dismiss" aria-label="Dismiss">✕</button>`;

        toast.querySelector('.toast-dismiss').addEventListener('click', () => this.dismiss(toast));
        this.container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }
        return toast;
    },

    success(title, message) { return this.show(title, message, 'success', 3500); },
    error(title, message) { return this.show(title, message, 'error', 5000); },
    warning(title, message) { return this.show(title, message, 'warning', 4000); },
    info(title, message) { return this.show(title, message, 'info', 3500); },

    dismiss(toast) {
        if (!toast || toast.classList.contains('removing')) return;
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 250);
    },

    confirm(title, message, icon = '⚠️') {
        return new Promise((resolve) => {
            const existing = document.getElementById('confirmDialog');
            if (existing) existing.remove();

            const html = `
            <div class="modal fade confirm-modal" id="confirmDialog" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered modal-sm">
                    <div class="modal-content">
                        <div class="modal-body">
                            <div class="confirm-icon">${icon}</div>
                            <div class="confirm-title">${title}</div>
                            <div class="confirm-message">${message}</div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-cancel" data-dismiss="modal">Cancel</button>
                            <button class="btn btn-danger" id="confirmBtn">Confirm</button>
                        </div>
                    </div>
                </div>
            </div>`;

            document.body.insertAdjacentHTML('beforeend', html);
            const modal = new bootstrap.Modal(document.getElementById('confirmDialog'));
            modal.show();

            document.getElementById('confirmBtn').addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });

            document.getElementById('confirmDialog').addEventListener('hidden.bs.modal', function() {
                this.remove();
                resolve(false);
            });
        });
    }
};

const Loader = {
    el: null,
    timer: null,
    startTime: null,
    _hideTimer: null,

    show() {
        if (!this.el) {
            this.el = document.createElement('div');
            this.el.className = 'loading-overlay';
            this.el.innerHTML = `
                <div class="loading-box">
                    <div class="loading-ring"></div>
                    <div class="loading-label">Loading</div>
                    <div class="loading-timer">0.0s</div>
                </div>
            `;
            document.body.appendChild(this.el);
        }
        if (this.el.classList.contains('active')) return;
        this.el.classList.add('active');
        this.startTime = Date.now();
        this._updateTimer();
    },

    _updateTimer() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        const timerEl = this.el.querySelector('.loading-timer');
        if (timerEl) timerEl.textContent = elapsed.toFixed(1) + 's';
        this.timer = setTimeout(() => this._updateTimer(), 100);
    },

    hide() {
        if (!this.el || !this.el.classList.contains('active')) return;
        const elapsed = Date.now() - this.startTime;
        const minShow = 400;
        if (elapsed < minShow) {
            clearTimeout(this._hideTimer);
            this._hideTimer = setTimeout(() => this._hide(), minShow - elapsed);
        } else {
            this._hide();
        }
    },

    _hide() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.el.classList.remove('active');
    }
};
