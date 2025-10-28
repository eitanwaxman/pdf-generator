(() => {
    const $ = (id) => document.getElementById(id);

    const apiKeyInput = $('apiKey');
    const baseUrlInput = $('baseUrl');
    const urlInput = $('url');
    const formatSelect = $('format');
    const delayInput = $('delay');
    const envSelect = $('env');
    const responseTypeSelect = $('responseType');
    const marginTop = $('marginTop');
    const marginBottom = $('marginBottom');
    const marginLeft = $('marginLeft');
    const marginRight = $('marginRight');
    const waitForDataLoad = $('waitForDataLoad');

    const createJobBtn = $('createJobBtn');
    const cancelJobBtn = $('cancelJobBtn');
    const jobIdEl = $('jobId');
    const statusEl = $('status');
    const resultEl = $('result');
    const logEl = $('log');

    let currentJobId = null;
    let pollTimer = null;

    function log(message) {
        const ts = new Date().toLocaleTimeString();
        logEl.textContent += `[${ts}] ${message}\n`;
        logEl.scrollTop = logEl.scrollHeight;
    }

    function getBaseUrl() {
        const val = baseUrlInput.value.trim();
        if (val) return val.replace(/\/$/, '');
        return `${location.origin}`;
    }

    function setLoadingState(isLoading) {
        createJobBtn.disabled = isLoading;
        cancelJobBtn.disabled = !currentJobId;
    }

    function renderResult(res) {
        resultEl.innerHTML = '';
        if (!res) return;

        function addCopyButton(getText, label) {
            const btn = document.createElement('button');
            btn.className = 'secondary';
            btn.style.marginLeft = '10px';
            btn.textContent = label || 'Copy';
            btn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(getText());
                    btn.textContent = 'Copied!';
                    setTimeout(() => (btn.textContent = label || 'Copy'), 1200);
                } catch (_) { /* noop */ }
            });
            return btn;
        }

        function base64ToBlob(base64, type) {
            const byteChars = atob(base64);
            const byteNumbers = new Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type });
        }

        if (res.type === 'url' && res.url) {
            const url = res.url;

            const link = document.createElement('a');
            link.href = url;
            link.textContent = 'Open PDF';
            link.target = '_blank';

            const urlLine = document.createElement('div');
            urlLine.style.marginBottom = '8px';
            const smallUrl = document.createElement('div');
            smallUrl.className = 'small';
            smallUrl.textContent = url;
            urlLine.appendChild(link);
            urlLine.appendChild(addCopyButton(() => url, 'Copy URL'));

            resultEl.appendChild(urlLine);
            resultEl.appendChild(smallUrl);

            const preview = document.createElement('iframe');
            preview.src = url;
            preview.style.width = '100%';
            preview.style.height = '480px';
            preview.style.border = '1px solid #223';
            preview.style.borderRadius = '8px';
            preview.loading = 'lazy';
            resultEl.appendChild(preview);
        } else if (res.type === 'buffer' && res.pdf) {
            const base64 = res.pdf;
            const sizeKB = Math.round((base64.length * 3) / 4 / 1024);

            const info = document.createElement('div');
            info.className = 'small';
            info.textContent = `Received base64 buffer (~${sizeKB} KB)`;

            const blob = base64ToBlob(base64, 'application/pdf');
            const objectUrl = URL.createObjectURL(blob);

            const download = document.createElement('a');
            download.href = objectUrl;
            download.download = 'document.pdf';
            download.textContent = 'Download PDF';

            const copyBtn = addCopyButton(() => base64, 'Copy base64');

            const controls = document.createElement('div');
            controls.style.display = 'flex';
            controls.style.gap = '12px';
            controls.style.alignItems = 'center';
            controls.style.margin = '6px 0 10px';
            controls.appendChild(download);
            controls.appendChild(copyBtn);

            const preview = document.createElement('iframe');
            preview.src = objectUrl;
            preview.style.width = '100%';
            preview.style.height = '480px';
            preview.style.border = '1px solid #223';
            preview.style.borderRadius = '8px';
            preview.loading = 'lazy';

            resultEl.appendChild(info);
            resultEl.appendChild(controls);
            resultEl.appendChild(preview);

            // Revoke object URL when navigating away from result
            const observer = new MutationObserver(() => {
                if (!resultEl.contains(preview)) {
                    URL.revokeObjectURL(objectUrl);
                    observer.disconnect();
                }
            });
            observer.observe(resultEl, { childList: true });
        }
    }

    async function createJob() {
        clear();
        setLoadingState(true);
        statusEl.textContent = 'creating job...';
        log('Creating job');

        try {
            const payload = {
                url: urlInput.value.trim(),
                options: {
                    format: formatSelect.value,
                    margin: {
                        top: `${Number(marginTop.value || 0)}px`,
                        bottom: `${Number(marginBottom.value || 0)}px`,
                        left: `${Number(marginLeft.value || 0)}px`,
                        right: `${Number(marginRight.value || 0)}px`
                    },
                    delay: Number(delayInput.value || 0),
                    waitForDataLoad: !!waitForDataLoad.checked,
                    responseType: responseTypeSelect.value,
                    wix: envSelect.value === 'wix'
                }
            };

            const res = await fetch(`${getBaseUrl()}/api/v1/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKeyInput.value.trim() || 'test-free-key'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to create job');
            }

            const data = await res.json();
            currentJobId = data.jobId;
            jobIdEl.textContent = currentJobId;
            log(`Job created: ${currentJobId}`);

            startPolling();
        } catch (e) {
            statusEl.textContent = 'error creating job';
            log(`Error: ${e.message}`);
            setLoadingState(false);
        }
    }

    function startPolling() {
        if (!currentJobId) return;
        statusEl.textContent = 'pending';
        setLoadingState(true);
        cancelJobBtn.disabled = false;
        log('Polling for status...');

        const poll = async () => {
            try {
                const res = await fetch(`${getBaseUrl()}/api/v1/jobs/${currentJobId}`, {
                    headers: { 'x-api-key': apiKeyInput.value.trim() || 'test-free-key' }
                });
                if (!res.ok) throw new Error('Failed to get status');
                const data = await res.json();
                statusEl.textContent = data.status || 'unknown';

                if (data.status === 'completed') {
                    renderResult(data.result);
                    log('Job completed');
                    clearInterval(pollTimer);
                    setLoadingState(false);
                } else if (data.status === 'failed') {
                    resultEl.textContent = data.error || 'Job failed';
                    log(`Job failed: ${data.error || 'unknown error'}`);
                    clearInterval(pollTimer);
                    setLoadingState(false);
                }
            } catch (e) {
                log(`Polling error: ${e.message}`);
            }
        };

        poll();
        pollTimer = setInterval(poll, 1000);
    }

    async function cancelJob() {
        if (!currentJobId) return;
        log('Cancelling job...');
        try {
            const res = await fetch(`${getBaseUrl()}/api/v1/jobs/${currentJobId}`, {
                method: 'DELETE',
                headers: { 'x-api-key': apiKeyInput.value.trim() || 'test-free-key' }
            });
            if (!res.ok) throw new Error('Failed to cancel job');
            log('Job cancelled');
            clear();
        } catch (e) {
            log(`Cancel error: ${e.message}`);
        }
    }

    function clear() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
        currentJobId = null;
        jobIdEl.textContent = '—';
        statusEl.textContent = '—';
        resultEl.innerHTML = '';
        cancelJobBtn.disabled = true;
    }

    createJobBtn.addEventListener('click', createJob);
    cancelJobBtn.addEventListener('click', cancelJob);
})();


