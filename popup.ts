document.addEventListener("DOMContentLoaded", async() => {
  const inputCheckbox = document.getElementById("toggle-stereo-input") as HTMLInputElement | null;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = tab?.id;
  const storageKey = `isStereoOn_${tabId}`;

  let isStereoOn: boolean = true;
  const result: any = await chrome.storage.session.get(storageKey);
  isStereoOn = result[storageKey] ?? true;

  if(isStereoOn && inputCheckbox != null) {
    inputCheckbox.checked = true;
  }

  inputCheckbox?.addEventListener("change", async() => {
    if(inputCheckbox?.checked){
      const operationSuccessful: boolean = await turnOffStereo();
      if(operationSuccessful) {
        isStereoOn = true;
        await chrome.storage.session.set({ [storageKey]: true });
      }
    } else {
      const operationSuccessful: boolean = await turnOnStereo();
      if(operationSuccessful) {
        isStereoOn = false;
        await chrome.storage.session.set({ [storageKey]: false });
      }
    }
  });
});

async function turnOnStereo(): Promise<boolean> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) return false;
  const res: any = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (!video) return false;
      if (!(window as any)._stereoAudioCtx)
        (window as any)._stereoAudioCtx = new AudioContext();
      if (!(window as any)._stereoSource)
        (window as any)._stereoSource = (window as any)._stereoAudioCtx.createMediaElementSource(video);
      const ctx = (window as any)._stereoAudioCtx as AudioContext;
      const source = (window as any)._stereoSource as MediaElementAudioSourceNode;
      source.disconnect();
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);
      source.connect(splitter);
      splitter.connect(merger, 0, 0);
      splitter.connect(merger, 1, 0);
      splitter.connect(merger, 0, 1);
      splitter.connect(merger, 1, 1);
      merger.connect(ctx.destination);
      (window as any)._stereoSplitter = splitter;
      (window as any)._stereoMerger = merger;
      return true;
    },
  });
  return res?.[0]?.result ?? false;
}

async function turnOffStereo(): Promise<boolean> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) return false;
  const res: any = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const source = (window as any)._stereoSource as MediaElementAudioSourceNode | null;
      const splitter = (window as any)._stereoSplitter as ChannelSplitterNode | null;
      const merger = (window as any)._stereoMerger as ChannelMergerNode | null;
      const ctx = (window as any)._stereoAudioCtx as AudioContext | null;
      if (splitter) splitter.disconnect();
      if (merger) merger.disconnect();
      if (source && ctx) {
        source.disconnect();
        source.connect(ctx.destination);
      }
      (window as any)._stereoSplitter = null;
      (window as any)._stereoMerger = null;
      return true;
    },
  });
  return res?.[0]?.result ?? false;
}
