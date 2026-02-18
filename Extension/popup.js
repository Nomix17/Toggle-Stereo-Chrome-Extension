"use strict";
document.addEventListener("DOMContentLoaded", async () => {
    const inputCheckbox = document.getElementById("toggle-stereo-input");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab?.id;
    const storageKey = `isStereoOn_${tabId}`;
    let isStereoOn = true;
    const result = await chrome.storage.session.get(storageKey);
    isStereoOn = result[storageKey] ?? true;
    if (isStereoOn && inputCheckbox != null) {
        inputCheckbox.checked = true;
    }
    inputCheckbox?.addEventListener("change", async () => {
        if (inputCheckbox?.checked) {
            const operationSuccessful = await turnOffStereo();
            if (operationSuccessful) {
                isStereoOn = true;
                await chrome.storage.session.set({ [storageKey]: true });
            }
        }
        else {
            const operationSuccessful = await turnOnStereo();
            if (operationSuccessful) {
                isStereoOn = false;
                await chrome.storage.session.set({ [storageKey]: false });
            }
        }
    });
});
async function turnOnStereo() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null)
        return false;
    const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const video = document.querySelector('video');
            if (!video)
                return false;
            if (!window._stereoAudioCtx)
                window._stereoAudioCtx = new AudioContext();
            if (!window._stereoSource)
                window._stereoSource = window._stereoAudioCtx.createMediaElementSource(video);
            const ctx = window._stereoAudioCtx;
            const source = window._stereoSource;
            source.disconnect();
            const splitter = ctx.createChannelSplitter(2);
            const merger = ctx.createChannelMerger(2);
            source.connect(splitter);
            splitter.connect(merger, 0, 0);
            splitter.connect(merger, 1, 0);
            splitter.connect(merger, 0, 1);
            splitter.connect(merger, 1, 1);
            merger.connect(ctx.destination);
            window._stereoSplitter = splitter;
            window._stereoMerger = merger;
            return true;
        },
    });
    return res?.[0]?.result ?? false;
}
async function turnOffStereo() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null)
        return false;
    const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const source = window._stereoSource;
            const splitter = window._stereoSplitter;
            const merger = window._stereoMerger;
            const ctx = window._stereoAudioCtx;
            if (splitter)
                splitter.disconnect();
            if (merger)
                merger.disconnect();
            if (source && ctx) {
                source.disconnect();
                source.connect(ctx.destination);
            }
            window._stereoSplitter = null;
            window._stereoMerger = null;
            return true;
        },
    });
    return res?.[0]?.result ?? false;
}
