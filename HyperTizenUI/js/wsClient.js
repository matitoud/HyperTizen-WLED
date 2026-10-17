let client;
let deviceIP;
const ssdpDevices = [];
let canEnable = false;
let savedRpcServer = '';
let reconnectTimer = null;
let scanTimer = null;
let perfTimer = null;
let controlsInitialized = false;
let pendingSaveChecks = null;
const configKeys = ['outputMode', 'wledIp', 'ledCount', 'ledTop', 'ledRight', 'ledBottom', 'ledLeft', 'ledStart', 'ledReverse', 'wledSmooth', 'wledAdaptiveSmooth', 'wledTransitionMs', 'wledFastCapture'];
let serverHosts = ['127.0.0.1'];
let hostIndex = 0;
let activeHost = '127.0.0.1';

function validIPv4(ip) {
    const parts = ip.split('.');
    return parts.length === 4 && parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function configureServerHosts() {
    serverHosts = ['127.0.0.1'];
    try {
        const tvIp = webapis.network.getIp();
        if (validIPv4(tvIp) && tvIp !== '127.0.0.1' && tvIp !== '0.0.0.0') {
            serverHosts.push(tvIp);
        }
    } catch (error) {
        // Some browser previews do not have Samsung's network API.
    }
    try {
        const savedTvIp = localStorage.getItem('hypertizenTvIp');
        if (savedTvIp && validIPv4(savedTvIp) && !serverHosts.includes(savedTvIp)) serverHosts.push(savedTvIp);
        if (savedTvIp) document.getElementById('tvIpOverride').value = savedTvIp;
    } catch (error) {
        // The user can still connect if local storage is unavailable.
    }
    hostIndex = 0;
}

function showConnectionStatus(message) {
    document.getElementById('status').textContent = message;
    if (message !== 'Configuración disponible') document.getElementById('connectionPanel').hidden = false;
}

function scheduleReconnect() {
    if (reconnectTimer !== null) return;
    const currentIndex = serverHosts.indexOf(activeHost);
    hostIndex = (currentIndex + 1) % serverHosts.length;
    const delay = hostIndex === 0 ? 3000 : 350;
    showConnectionStatus(hostIndex === 0 ? 'Sin conexión con el servicio · reintentando…' : 'Buscando el servicio en la TV…');
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        open();
    }, delay);
}

function open() {
    if (client && (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING)) return;
    try {
        activeHost = serverHosts[hostIndex] || deviceIP;
        const socket = new WebSocket(`ws://${activeHost}:8086`);
        client = socket;
        const connectTimeout = setTimeout(() => {
            if (socket.readyState === WebSocket.CONNECTING) socket.close();
        }, 2500);
        socket.onopen = () => {
            clearTimeout(connectTimeout);
            if (client === socket) onOpen();
        };
        socket.onmessage = data => {
            if (client === socket) onMessage(data);
        };
        socket.onerror = () => {
            if (client !== socket) return;
            showConnectionStatus('Sin conexión con el servicio · reintentando…');
            socket.close();
        };
        socket.onclose = () => {
            clearTimeout(connectTimeout);
            if (client === socket) scheduleReconnect();
        };
    } catch (error) {
        scheduleReconnect();
    }
}

const events = {
    SetConfig: 0,
    ReadConfig: 1,
    ReadConfigResult: 2,
    ScanSSDP: 3,
    SSDPScanResult: 4
}

function send(json) {
    if (!client || client.readyState !== WebSocket.OPEN) {
        showConnectionStatus('Sin conexión con el servicio · reintentando…');
        return false;
    }
    try {
        client.send(JSON.stringify(json));
        return true;
    } catch (error) {
        try { client.close(); } catch (closeError) { /* Reconnect below. */ }
        scheduleReconnect();
        return false;
    }
}

function onOpen() {
    showConnectionStatus('Configuración disponible');
    document.getElementById('connectionMessage').textContent = 'Conectado con el servicio HyperTizen';
    setupControls();
    configKeys.forEach(key => send({ event: events.ReadConfig, key }));
    send({ event: events.ReadConfig, key: 'rpcServer' });
    send({ event: events.ReadConfig, key: 'enabled' });
    send({ event: events.ReadConfig, key: 'perfWled' });
    updateMode();
    if (document.getElementById('outputMode').value === 'hyperhdr') send({ event: events.ScanSSDP });
}

function updateSmoothingSelection(changed) {
    const fixed = document.getElementById('wledSmooth');
    const adaptive = document.getElementById('wledAdaptiveSmooth');
    if (changed === 'adaptive' && adaptive.checked) fixed.checked = false;
    if (changed === 'fixed' && fixed.checked) adaptive.checked = false;
    if (adaptive.checked) fixed.checked = false;
    document.getElementById('wledTransitionMs').disabled = adaptive.checked;
}

function setupControls() {
    if (controlsInitialized) return;
    controlsInitialized = true;
    document.getElementById('wledSmooth').onchange = () => updateSmoothingSelection('fixed');
    document.getElementById('wledAdaptiveSmooth').onchange = () => updateSmoothingSelection('adaptive');
    document.getElementById('connectTv').onclick = () => {
        const tvIp = document.getElementById('tvIpOverride').value.trim();
        const message = document.getElementById('connectionMessage');
        if (!validIPv4(tvIp) || tvIp === '0.0.0.0') {
            message.textContent = 'Revisá la IP de la TV';
            return;
        }
        try { localStorage.setItem('hypertizenTvIp', tvIp); } catch (error) { /* Optional persistence. */ }
        if (!serverHosts.includes(tvIp)) serverHosts.push(tvIp);
        hostIndex = serverHosts.indexOf(tvIp);
        if (reconnectTimer !== null) clearTimeout(reconnectTimer);
        reconnectTimer = null;
        const previous = client;
        client = null;
        if (previous) try { previous.close(); } catch (error) { /* A new attempt starts below. */ }
        message.textContent = 'Conectando con esta TV…';
        open();
    };
    document.getElementById('outputMode').onchange = e => {
        send({ event: events.SetConfig, key: 'outputMode', value: e.target.value });
        updateMode();
        if (e.target.value === 'hyperhdr') send({ event: events.ScanSSDP });
    };
    document.getElementById('saveWled').onclick = () => {
        updateSmoothingSelection('adaptive');
        const count = Number(document.getElementById('ledCount').value);
        const sides = ['ledTop', 'ledRight', 'ledBottom', 'ledLeft'].map(k => Number(document.getElementById(k).value));
        const start = Number(document.getElementById('ledStart').value);
        const ip = document.getElementById('wledIp').value.trim();
        const validIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) && ip.split('.').every(x => Number(x) <= 255);
        const transitionMs = Number(document.getElementById('wledTransitionMs').value);
        const sideTotal = sides.reduce((a, b) => a + b, 0);
        const message = document.getElementById('wledMessage');
        if (!validIp) message.innerText = 'Revisá la IP del ESP32';
        else if (!Number.isInteger(count) || count < 8 || count > 480) message.innerText = 'El total debe estar entre 8 y 480 píxeles';
        else if (!sides.every(x => Number.isInteger(x) && x >= 2)) message.innerText = 'Cada lado debe tener al menos 2 píxeles';
        else if (sideTotal !== count) message.innerText = `Los lados suman ${sideTotal}; el total dice ${count}`;
        else if (!Number.isInteger(start) || start < 0 || start >= count) message.innerText = 'El primer píxel debe estar dentro del total';
        else if (!Number.isInteger(transitionMs) || transitionMs < 50 || transitionMs > 500) message.innerText = 'La transición debe estar entre 50 y 500 ms';
        else message.innerText = '';
        if (message.innerText) return;
        if (!client || client.readyState !== WebSocket.OPEN) {
            document.getElementById('wledMessage').innerText = 'No se guardó: el servicio no está conectado. Indicá la IP de la TV arriba.';
            return;
        }
        let sent = true;
        configKeys.filter(k => k !== 'outputMode').forEach(key => {
            const el = document.getElementById(key);
            sent = send({ event: events.SetConfig, key, value: ['ledReverse', 'wledSmooth', 'wledAdaptiveSmooth', 'wledFastCapture'].includes(key) ? String(el.checked) : el.value }) && sent;
        });
        sent = send({ event: events.SetConfig, key: 'applyWled', value: 'true' }) && sent;
        pendingSaveChecks = sent ? {
            wledFastCapture: String(document.getElementById('wledFastCapture').checked),
            wledAdaptiveSmooth: String(document.getElementById('wledAdaptiveSmooth').checked),
            results: {}
        } : null;
        if (sent) {
            send({ event: events.ReadConfig, key: 'wledFastCapture' });
            send({ event: events.ReadConfig, key: 'wledAdaptiveSmooth' });
        }
        document.getElementById('wledMessage').innerText = sent ? 'Configuración enviada; comprobando los modos nuevos' : 'No se guardó: se perdió la conexión con el servicio';
        updateMode();
    };
    document.getElementById('enabled').onchange = (e) => {
        if (!canEnable && document.getElementById('outputMode').value !== 'wled') {
            alert('Primero seleccioná un servidor HyperHDR');
            return e.target.checked = false;
        }
        if (!send({ event: events.SetConfig, key: 'enabled', value: e.target.checked.toString() })) {
            e.target.checked = !e.target.checked;
        }
    }
    if (scanTimer === null) scanTimer = setInterval(() => {
        if (client && client.readyState === WebSocket.OPEN && document.getElementById('outputMode').value === 'hyperhdr')
            send({ event: events.ScanSSDP });
    }, 10000);
    if (perfTimer === null) perfTimer = setInterval(() => {
        if (client && client.readyState === WebSocket.OPEN && document.getElementById('outputMode').value === 'wled')
            send({ event: events.ReadConfig, key: 'perfWled' });
    }, 1000);
}

function onMessage(data) {
    const msg = JSON.parse(data.data);
    switch(msg.Event) {
        case events.ReadConfigResult:
            if (pendingSaveChecks && (msg.key === 'wledFastCapture' || msg.key === 'wledAdaptiveSmooth')) {
                pendingSaveChecks.results[msg.key] = !msg.error && msg.value === pendingSaveChecks[msg.key];
                if (Object.keys(pendingSaveChecks.results).length === 2) {
                    document.getElementById('wledMessage').textContent =
                        pendingSaveChecks.results.wledFastCapture && pendingSaveChecks.results.wledAdaptiveSmooth
                            ? 'Configuración confirmada por el servicio'
                            : 'El servicio no confirmó los modos nuevos. Instalá el .tpk actualizado.';
                    pendingSaveChecks = null;
                }
            }
            if (msg.key === 'perfWled' && !msg.error) {
                try {
                    const perf = JSON.parse(msg.value);
                    document.getElementById('perfWled').textContent =
                        `Captura real: ${perf.captureFps.toFixed(1)} FPS · DDP: ${perf.ddpFps.toFixed(1)} envíos/s · ${perf.batchesPerFrame.toFixed(1)} lotes/captura · ${perf.batchMs.toFixed(1)} ms/lote · transición: ${perf.transitionMs} ms${perf.adaptiveSmooth ? ' adaptativa' : ''} · actualización cada segundo`;
                } catch (error) { /* Ignore malformed or obsolete service metrics. */ }
            } else if (msg.key === 'outputMode' && !msg.error) {
                document.getElementById('outputMode').value = msg.value;
                updateMode();
            } else if (configKeys.includes(msg.key) && !msg.error) {
                const el = document.getElementById(msg.key);
                if (['ledReverse', 'wledSmooth', 'wledAdaptiveSmooth', 'wledFastCapture'].includes(msg.key)) el.checked = msg.value === 'true'; else el.value = msg.value;
                if (msg.key === 'wledSmooth' || msg.key === 'wledAdaptiveSmooth') updateSmoothingSelection(msg.key === 'wledAdaptiveSmooth' ? 'adaptive' : 'fixed');
                if (msg.key === 'wledIp') updateMode();
            } else if(msg.key === 'rpcServer' && !msg.error) {
                canEnable = true;
                savedRpcServer = msg.value;
                updateMode();
            } else if(msg.key === 'enabled' && !msg.error) {
                document.getElementById('enabled').checked = msg.value === 'true';
            }
            break;
        case events.SSDPScanResult: {
            for (const device of msg.devices) {
                const url = device.UrlBase.indexOf('https') === 0 ? device.UrlBase.replace('https', 'wss') : device.UrlBase.replace('http', 'ws');

                if (ssdpDevices.some(d => d.url === url)) {
                    continue;
                }

                const friendlyName = device.FriendlyName;
                const item = document.createElement('div');
                item.className = 'ssdpItem';
                item.dataset.uri = url;
                item.tabIndex = 0;
                const label = document.createElement('a');
                label.textContent = friendlyName;
                item.appendChild(label);
                item.onclick = () => setRPC(url);
                document.getElementById('ssdpItems').appendChild(item);
                ssdpDevices.push({ url, friendlyName });
            }
        }
    }
}

function updateMode() {
    const wled = document.getElementById('outputMode').value === 'wled';
    document.getElementById('wledSettings').style.display = wled ? 'block' : 'none';
    document.getElementById('ssdpSection').style.display = wled ? 'none' : 'block';
    const info = document.getElementById('outputInfo');
    if (wled) {
        const ip = document.getElementById('wledIp').value.trim();
        info.textContent = `Salida seleccionada: WLED DDP. Destino configurado: ${ip || 'sin configurar'}.`;
    } else {
        info.textContent = `Salida seleccionada: HyperHDR. Servidor configurado: ${savedRpcServer || 'sin configurar'}.`;
    }
}

window.setRPC = (url) =>  {
    canEnable = true;
    savedRpcServer = url;
    updateMode();
    send({ event: events.SetConfig, key: 'rpcServer', value: url });
}
