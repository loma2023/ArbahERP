/* =============================================
   ArbahERP Toast Notification System v6
   Bottom-Left + RTL + Confirm Dialog

   Usage:
     ArbahToast.success("تم الحفظ");
     ArbahToast.error("حدث خطأ");
     ArbahToast.warning("تنبيه");
     ArbahToast.info("معلومة");

     // Confirm (returns Promise<boolean>)
     const ok = await ArbahToast.confirm("هل تريد الحذف؟");
     if (!ok) return;
============================================= */

const ArbahToast = (function () {
    'use strict';

    let container = null;
    let toastId = 0;
    const activeToasts = new Map();

    /* ─────────── Init ─────────── */
    function init() {
        if (container) return;
        container = document.createElement('div');
        container.className = 'Arbah-Toast-Container';
        container.id = 'ArbahToastContainer';
        document.body.appendChild(container);
    }

    /* ─────────── Helpers ─────────── */
    function getIcon(type) {
        const icons = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info',
            confirm: 'fa-circle-question'
        };
        return icons[type] || icons.info;
    }

    function getTitle(type) {
        const titles = {
            success: 'تم بنجاح!',
            error: 'خطأ!',
            warning: 'تنبيه!',
            info: 'معلومة',
            confirm: 'تأكيد الإجراء'
        };
        return titles[type] || titles.info;
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /* ─────────── Create Toast ─────────── */
    function createToast(message, type, duration, options = {}) {
        init();
        toastId++;
        const id = `toast-${toastId}`;

        const toast = document.createElement('div');
        toast.className = `Arbah-Toast-Item ${type}`;
        toast.id = id;
        toast.setAttribute('role', type === 'confirm' ? 'dialog' : 'alert');
        toast.setAttribute('aria-live', 'polite');

        // Icon
        const iconDiv = document.createElement('div');
        iconDiv.className = 'Arbah-Toast-Icon';
        iconDiv.innerHTML = `<i class="fa-solid ${getIcon(type)}"></i>`;

        // Content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'Arbah-Toast-Content';

        const titleEl = document.createElement('div');
        titleEl.className = 'Arbah-Toast-Title';
        titleEl.textContent = options.title || getTitle(type);

        const messageEl = document.createElement('div');
        messageEl.className = 'Arbah-Toast-Message';
        messageEl.innerHTML = escapeHtml(message).replace(/\n/g, '<br>');

        contentDiv.appendChild(titleEl);
        contentDiv.appendChild(messageEl);

        // Confirm Buttons
        if (type === 'confirm' && options.buttons) {
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'Arbah-Toast-Buttons';

            options.buttons.forEach(btn => {
                const btnEl = document.createElement('button');
                btnEl.className = `Arbah-Toast-Btn ${btn.className || ''}`;
                btnEl.textContent = btn.text;
                btnEl.type = 'button';

                btnEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof btn.callback === 'function') btn.callback();
                    removeToast(id);
                });

                buttonsDiv.appendChild(btnEl);
            });

            contentDiv.appendChild(buttonsDiv);
        }

        // Action Button (regular)
        if (options.action && type !== 'confirm') {
            const actionBtn = document.createElement('button');
            actionBtn.className = 'Arbah-Toast-Action';
            actionBtn.textContent = options.action.text;
            actionBtn.type = 'button';

            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof options.action.callback === 'function') options.action.callback();
                removeToast(id);
            });

            contentDiv.appendChild(actionBtn);
        }

        // Close Button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'Arbah-Toast-Close';
        closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        closeBtn.setAttribute('aria-label', 'إغلاق');
        closeBtn.type = 'button';

        if (type === 'confirm') {
            closeBtn.style.display = 'none';
        } else {
            closeBtn.addEventListener('click', () => removeToast(id));
        }

        // Progress Bar
        const progressDiv = document.createElement('div');
        progressDiv.className = 'Arbah-Toast-Progress';

        if (type !== 'confirm' && duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'Arbah-Toast-Progress-Bar';
            progressBar.style.animationDuration = `${duration}ms`;
            progressDiv.appendChild(progressBar);
        } else {
            progressDiv.style.display = 'none';
        }

        // Assemble
        toast.appendChild(iconDiv);
        toast.appendChild(contentDiv);
        toast.appendChild(closeBtn);
        toast.appendChild(progressDiv);

        container.appendChild(toast);
        activeToasts.set(id, { element: toast, timer: null });

        // Show
        requestAnimationFrame(() => toast.classList.add('show'));

        // Auto-remove timer
        if (type !== 'confirm' && duration > 0) {
            const timer = setTimeout(() => removeToast(id), duration);
            activeToasts.get(id).timer = timer;

            const progressBar = toast.querySelector('.Arbah-Toast-Progress-Bar');
            if (progressBar) {
                toast.addEventListener('mouseenter', () => {
                    clearTimeout(activeToasts.get(id)?.timer);
                    progressBar.style.animationPlayState = 'paused';
                });

                toast.addEventListener('mouseleave', () => {
                    const remaining = parseFloat(getComputedStyle(progressBar).animationDuration) * 1000;
                    progressBar.style.animationPlayState = 'running';
                    const newTimer = setTimeout(() => removeToast(id), remaining);
                    activeToasts.get(id).timer = newTimer;
                });
            }
        }

        return id;
    }

    /* ─────────── Remove ─────────── */
    function removeToast(id) {
        const toast = activeToasts.get(id);
        if (!toast) return;
        clearTimeout(toast.timer);
        toast.element.classList.remove('show');
        toast.element.classList.add('hide');
        setTimeout(() => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
            activeToasts.delete(id);
        }, 350);
    }

    /* ─────────── Public API ─────────── */
    return {
        success(message, duration = 4000, options = {}) {
            return createToast(message, 'success', duration, options);
        },

        error(message, duration = 5000, options = {}) {
            return createToast(message, 'error', duration, options);
        },

        warning(message, duration = 4500, options = {}) {
            return createToast(message, 'warning', duration, options);
        },

        info(message, duration = 4000, options = {}) {
            return createToast(message, 'info', duration, options);
        },

        /**
         * Confirm Dialog - تأكيد الإجراء (uses static #ConfirmPopup)
         * @param {string} message - رسالة التأكيد
         * @param {object} options - {title, confirmText, cancelText}
         * @returns {Promise<boolean>} true = تأكيد, false = إلغاء
         */
        confirm(message, options = {}) {
            return new Promise((resolve) => {
                const popup = document.getElementById('ConfirmPopup');
                if (!popup) {
                    console.error('ArbahToast: #ConfirmPopup not found');
                    resolve(false);
                    return;
                }

                // ── Update content ──
                const title = options.title || 'تأكيد الإجراء';
                const confirmText = options.confirmText || 'تأكيد';
                const cancelText = options.cancelText || 'إلغاء';

                // Update header title
                const titleEl = popup.querySelector('.PopUpWindow-Title h3');
                if (titleEl) {
                    titleEl.innerHTML = `${escapeHtml(title)}`;
                }

                // Update body message
                const body = popup.querySelector('.PopUpWindow-Body');
                if (body) {
                    // Keep the icon, update the text
                    const paragraphs = body.querySelectorAll('p');
                    if (paragraphs.length >= 1) {
                        paragraphs[0].textContent = title;
                        paragraphs[1].textContent = message;
                    }
                    // Hide sub-message if empty
                   
                }

                // Update footer buttons
                const footer = popup.querySelector('.PopUpWindow-Footer');
                if (footer) {
                    const buttons = footer.querySelectorAll('button');
                    // Cancel button (first button with class reset)
                    const cancelBtn = footer.querySelector('.reset');
                    if (cancelBtn) {
                        cancelBtn.innerHTML = `<i class="fa fa-xmark"></i> ${escapeHtml(cancelText)}`;
                    }
                    // Confirm button (first button with class apply)
                    const confirmBtn = footer.querySelector('.apply');
                    if (confirmBtn) {
                        confirmBtn.innerHTML = `<i class="fa fa-trash-can"></i> ${escapeHtml(confirmText)}`;
                    }
                }

                // ── Show popup ──
                popup.classList.add('active');
                popup.style.display = 'flex';

                // ── Handle result ──
                let resolved = false;

                const cleanup = (result) => {
                    if (resolved) return;
                    resolved = true;
                    popup.classList.remove('active');
                    popup.style.display = 'none';
                    resolve(result);
                };

                // Close button
                const closeBtn = popup.querySelector('.PopUpWindow-CloseBtn');
                if (closeBtn) {
                    closeBtn.onclick = () => cleanup(false);
                }

                // Cancel button
                const cancelBtn = popup.querySelector('.reset');
                if (cancelBtn) {
                    cancelBtn.onclick = () => cleanup(false);
                }

                // Confirm button
                const confirmBtn = popup.querySelector('.apply');
                if (confirmBtn) {
                    confirmBtn.onclick = () => cleanup(true);
                }

                // Escape key
                const keyHandler = (e) => {
                    if (e.key === 'Escape') {
                        document.removeEventListener('keydown', keyHandler);
                        cleanup(false);
                    }
                };
                document.addEventListener('keydown', keyHandler);
            });
        },

        remove(id) {
            removeToast(id);
        },

        clearAll() {
            activeToasts.forEach((_, id) => removeToast(id));
        },

        count() {
            return activeToasts.size;
        }
    };
})();

/* ─────────── Global ─────────── */
window.ArbahToast = ArbahToast;