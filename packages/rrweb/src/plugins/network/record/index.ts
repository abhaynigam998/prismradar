import type { IWindow, listenerHandler, RecordPlugin } from '@rrweb/types';

export type InitiatorType =
  | 'audio'
  | 'beacon'
  | 'body'
  | 'css'
  | 'early-hint'
  | 'embed'
  | 'fetch'
  | 'frame'
  | 'iframe'
  | 'icon'
  | 'image'
  | 'img'
  | 'input'
  | 'link'
  | 'navigation'
  | 'object'
  | 'ping'
  | 'script'
  | 'track'
  | 'video'
  | 'xmlhttprequest';

type NetworkRecordOptions = {
  initiatorType?: InitiatorType[];
  captureInitialEvents?: boolean;
};

const defaultNetworkOptions: NetworkRecordOptions = {
  initiatorType: [
    'audio',
    'beacon',
    'body',
    'css',
    'early-hint',
    'embed',
    'fetch',
    'frame',
    'iframe',
    'icon',
    'image',
    'img',
    'input',
    'link',
    'navigation',
    'object',
    'ping',
    'script',
    'track',
    'video',
    'xmlhttprequest',
  ],
  captureInitialEvents: false,
};

export type NetworkData = {
  resourceTimings: PerformanceResourceTiming[];
  isInitial?: boolean;
};

type networkCallback = (data: NetworkData) => void;

function initPerformanceObserver(
  cb: networkCallback,
  win: IWindow,
  options: {
    initiatorType: InitiatorType[];
    captureInitialEvents: boolean;
  },
) {
  if (!('performance' in win)) {
    return () => {
      //
    };
  }
  const isResourceTiming = (
    entry: PerformanceEntry,
  ): entry is PerformanceResourceTiming => {
    return entry.entryType === 'resource';
  };
  const getResourceTimings = (entries: PerformanceEntryList) => {
    return entries.filter((entry): entry is PerformanceResourceTiming => {
      return (
        isResourceTiming(entry) &&
        entry.initiatorType !== 'xmlhttprequest' &&
        entry.initiatorType !== 'fetch'
      );
    });
  };
  if (options.captureInitialEvents) {
    const initialResourceTimings = getResourceTimings(
      win.performance.getEntriesByType('resource'),
    );
    cb({ resourceTimings: initialResourceTimings, isInitial: true });
  }
  const observer = new win.PerformanceObserver((entries) => {
    const resourceTimings = getResourceTimings(entries.getEntries());
    cb({ resourceTimings });
  });
  observer.observe({ type: 'resource' });
  return () => {
    observer.disconnect();
  };
}

function initXhrObserver(
  cb: networkCallback,
  win: IWindow,
  options: NetworkRecordOptions,
): listenerHandler {
  return () => {
    // TODO:
  };
}

function initFetchObserver(
  cb: networkCallback,
  win: IWindow,
  options: NetworkRecordOptions,
): listenerHandler {
  return () => {
    // TODO:
  };
}

function initNetworkObserver(
  cb: networkCallback,
  win: IWindow, // top window or in an iframe
  options: NetworkRecordOptions,
): listenerHandler {
  const networkOptions = (options
    ? Object.assign({}, defaultNetworkOptions, options)
    : defaultNetworkOptions) as {
    initiatorType: InitiatorType[];
    captureInitialEvents: boolean;
  };

  const performanceObserver = initPerformanceObserver(cb, win, networkOptions);
  let xhrObserver: listenerHandler | undefined;
  if (networkOptions.initiatorType.includes('xmlhttprequest')) {
    xhrObserver = initXhrObserver(cb, win, networkOptions);
  }
  let fetchObserver: listenerHandler | undefined;
  if (networkOptions.initiatorType.includes('fetch')) {
    fetchObserver = initFetchObserver(cb, win, networkOptions);
  }

  return () => {
    performanceObserver();
    xhrObserver?.();
    fetchObserver?.();
  };
}

export const NETWORK_PLUGIN_NAME = 'rrweb/network@1';

export const getRecordNetworkPlugin: (
  options?: NetworkRecordOptions,
) => RecordPlugin = (options) => ({
  name: NETWORK_PLUGIN_NAME,
  observer: initNetworkObserver,
  options: options,
});