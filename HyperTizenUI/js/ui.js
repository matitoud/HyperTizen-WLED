(function () {
    'use strict';

    const mainSelector = '#outputMode, #enabled, #tvIpOverride, #connectTv, #wledSettings input, #saveWled, .ssdpItem';
    const keypad = document.getElementById('keypad');
    const keys = document.getElementById('keypadKeys');
    const valueDisplay = document.getElementById('keypadValue');
    let editing = null;
    let draft = '';
    let replaceOnDigit = false;

    function visible(element) {
        return element.getClientRects().length > 0 && !element.disabled;
    }

    function focus(element) {
        if (!element) return;
        element.focus();
        if (element.scrollIntoView) element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    function mainControls() {
        return Array.prototype.slice.call(document.querySelectorAll(mainSelector)).filter(visible);
    }

    function renderDraft() {
        valueDisplay.textContent = draft;
    }

    function closeKeypad(save) {
        if (!editing) return;
        const input = editing;
        if (save) {
            input.value = draft;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        editing = null;
        keypad.hidden = true;
        focus(input);
    }

    function pressKey(action) {
        if (action === 'done') return closeKeypad(true);
        if (action === 'cancel') return closeKeypad(false);
        if (action === 'clear') draft = '';
        else if (action === 'delete') draft = draft.slice(0, -1);
        else if (action === '.') {
            if ((editing.id === 'wledIp' || editing.id === 'tvIpOverride') && draft.split('.').length < 4 && !draft.endsWith('.')) draft += '.';
        } else if (/^\d$/.test(action)) {
            if (replaceOnDigit) draft = '';
            const limit = editing.id === 'wledIp' || editing.id === 'tvIpOverride' ? 15 : 4;
            if (draft.length < limit) draft += action;
        }
        replaceOnDigit = false;
        renderDraft();
    }

    function openKeypad(input) {
        editing = input;
        draft = input.value;
        replaceOnDigit = true;
        document.getElementById('keypadTitle').textContent = input.dataset.title || 'Editar valor';
        keys.innerHTML = '';
        const layout = ['1', '2', '3', '4', '5', '6', '7', '8', '9', input.id === 'wledIp' || input.id === 'tvIpOverride' ? '.' : 'clear', '0', 'delete', 'clear', 'cancel', 'done'];
        layout.forEach((action, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'keypad-key' + (index >= 12 || action === 'delete' || action === 'clear' ? ' action' : '') + (action === 'done' ? ' done' : '');
            button.textContent = ({ delete: 'Borrar', clear: 'Limpiar', cancel: 'Cancelar', done: 'Listo' })[action] || action;
            button.dataset.action = action;
            button.onclick = () => pressKey(action);
            keys.appendChild(button);
        });
        renderDraft();
        keypad.hidden = false;
        focus(keys.querySelector('button'));
    }

    function moveKeypad(direction) {
        const buttons = Array.prototype.slice.call(keys.querySelectorAll('button'));
        const index = buttons.indexOf(document.activeElement);
        const next = index + direction;
        if (next >= 0 && next < buttons.length) focus(buttons[next]);
    }

    function moveMain(direction) {
        const controls = mainControls();
        const index = controls.indexOf(document.activeElement);
        const next = Math.max(0, Math.min(controls.length - 1, index + direction));
        focus(controls[next]);
    }

    document.addEventListener('click', (event) => {
        if (event.target.classList && event.target.classList.contains('keypad-input') && !editing) openKeypad(event.target);
    });

    document.addEventListener('keydown', (event) => {
        const key = event.key;
        if (editing) {
            if (key === 'Escape' || event.keyCode === 10009 || key === 'Back' || key === 'BrowserBack') {
                event.preventDefault();
                closeKeypad(false);
            } else if (key === 'ArrowLeft') { event.preventDefault(); moveKeypad(-1); }
            else if (key === 'ArrowRight') { event.preventDefault(); moveKeypad(1); }
            else if (key === 'ArrowUp') { event.preventDefault(); moveKeypad(-3); }
            else if (key === 'ArrowDown') { event.preventDefault(); moveKeypad(3); }
            else if (key === 'Enter' || key === 'NumpadEnter') {
                event.preventDefault();
                if (document.activeElement && document.activeElement.click) document.activeElement.click();
            } else if (/^\d$/.test(key) || key === '.') {
                event.preventDefault();
                pressKey(key);
            } else if (key === 'Backspace') { event.preventDefault(); pressKey('delete'); }
            return;
        }
        if (key === 'ArrowUp' || key === 'ArrowDown') {
            event.preventDefault();
            moveMain(key === 'ArrowUp' ? -1 : 1);
        } else if ((key === 'ArrowLeft' || key === 'ArrowRight') && document.activeElement.id === 'outputMode') {
            event.preventDefault();
            const mode = document.getElementById('outputMode');
            mode.value = mode.value === 'wled' ? 'hyperhdr' : 'wled';
            mode.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (key === 'Enter' || key === 'NumpadEnter') {
            const control = document.activeElement;
            if (!control || !control.matches || !control.matches(mainSelector)) return;
            event.preventDefault();
            if (control.id === 'outputMode') {
                control.value = control.value === 'wled' ? 'hyperhdr' : 'wled';
                control.dispatchEvent(new Event('change', { bubbles: true }));
            } else control.click();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        deviceIP = '127.0.0.1';
        setupControls();
        updateMode();
        configureServerHosts();
        open();
        focus(document.getElementById('outputMode'));
    });
})();
