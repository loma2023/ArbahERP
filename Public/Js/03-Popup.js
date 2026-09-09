// =============================================
//    Drag أي Popup في الصفحة
// =============================================

document.addEventListener('DOMContentLoaded', function () {
    initAllPopupsDrag();
});

function initAllPopupsDrag() {
    const headers = document.querySelectorAll('.PopUpWindow-Header');
    headers.forEach(header => {
        const popup = header.closest('.PopUp-Window');
        if (!popup) return;
        let isDragging = false;
        let startX, startY;
        let currentLeft, currentTop;

        header.addEventListener('mousedown', function (e) {
            if (e.target.closest('.PopUpWindow-CloseBtn')) return;

            isDragging = true;
            header.classList.add('is-dragging');

            const rect = popup.getBoundingClientRect();
            const computed = getComputedStyle(popup);
            const hasTransform = computed.transform !== 'none';

            if (hasTransform) {
                popup.style.transform = 'none';
                popup.style.top = rect.top + 'px';
                popup.style.left = rect.left + 'px';

                currentTop = rect.top;
                currentLeft = rect.left;
            } else {
                currentTop = parseFloat(popup.style.top) || rect.top;
                currentLeft = parseFloat(popup.style.left) || rect.left;
            }

            startX = e.clientX - currentLeft;
            startY = e.clientY - currentTop;

            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            const newLeft = e.clientX - startX;
            const newTop = e.clientY - startY;
            popup.style.left = newLeft + 'px';
            popup.style.top = newTop + 'px';
        });

        document.addEventListener('mouseup', function () {
            if (!isDragging) return;
            isDragging = false;
            header.classList.remove('is-dragging');
        });
    });
}

// =============================================
//    فتح وقفل أي Popup
// =============================================
function openPopUpWindow(popupId) {
    const container = document.getElementById(popupId);
    if (!container) return;
    container.classList.add('active');

    const popup = container.querySelector('.PopUp-Window');
    if (popup) {
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.classList.remove('is-dragging');
    }
}

function closePopUpWindow(popupId) {
    const container = document.getElementById(popupId);
    if (container) {
        container.classList.remove('active');
    }
}

// =============================================
//    إغلاق الفورم عند الضغط خارجه
// =============================================
let ContainerPopUp = document.querySelectorAll(".Container-PopUp-Window");
ContainerPopUp.forEach(PopUp => {
    PopUp.addEventListener('click', function (e) {
        if (e.target === this) {
            closePopUpWindow(PopUp.id);
        }
    });
});

// =============================================
//    اختصارات لوحة المفاتيح
// =============================================
document.addEventListener('keydown', function (event) {
    if (event.key === 'F1') {
        event.preventDefault();
        resetForm();
        openPopUpWindow('AddNewPopup');
    }

    if (event.key === 'Escape') {
        event.preventDefault();
        document.querySelectorAll('.Container-PopUp-Window.active').forEach(popup => {
            closePopUpWindow(popup.id);
        });
    }
});