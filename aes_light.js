(function() {

var AdsLight = {};

var isVkDomain = (document.domain === 'vk.com');

var uaLight = navigator.userAgent.toLowerCase();
var browserLight = {
  msie6: (/msie 6/i.test(uaLight) && !/opera/i.test(uaLight)),
  msie7: (/msie 7/i.test(uaLight) && !/opera/i.test(uaLight)),
  msie8: (/msie 8/i.test(uaLight) && !/opera/i.test(uaLight)),
  mobile: /iphone|ipod|ipad|opera mini|opera mobi|iemobile/i.test(uaLight)
};

if (isVkDomain) {
  if (!('__adsLoaded' in window)) window.__adsLoaded = vkNow();
  window.AdsLight = AdsLight;
}

AdsLight.init = function() {
  if (window.vk__adsLight) {
    return;
  }

  window.vk__adsLight = {};

  if (browserLight.mobile) {
    return;
  }

  AdsLight.initUserHandlers();

  vk__adsLight.widgetsIds       = {};
  vk__adsLight.observersInited  = false;
  vk__adsLight.publishTimers    = {};

  vk__adsLight.windowId         = Math.round(Math.random() * 1000000000 + 1);
  vk__adsLight.activeTab        = 0;
  vk__adsLight.userEventTime    = 0;
  vk__adsLight.wrapVisible      = false;
  vk__adsLight.imagesTimer      = false;
  vk__adsLight.reloadTimer      = false;
  vk__adsLight.updateBlockTimer = false;

  vk__adsLight.adsCanShow       = 1;
  vk__adsLight.adsSection       = false;
  vk__adsLight.adsShowed        = '';
  vk__adsLight.adsShowedHash    = +new Date;
  vk__adsLight.adsParams        = false;

  vk__adsLight.updateProgress   = 0;
  vk__adsLight.adsShowedAll     = {};

  vk__adsLight.loadComplete     = false;
  vk__adsLight.loaderParams     = false;

  if ('onfocusin' in window) { // IE
    if (window.addEventListener) { // IE >= 9
      window.addEventListener('focusin',  vk__adsLight.userHandlers.onFocusWindow, false);
      window.addEventListener('focusout', vk__adsLight.userHandlers.onBlurWindow, false);
    } else {
      if (window.attachEvent) { // IE < 9
        window.attachEvent('onfocusin',  vk__adsLight.userHandlers.onFocusWindow);
        window.attachEvent('onfocusout', vk__adsLight.userHandlers.onBlurWindow);
      }
    }
  } else {
    if (window.addEventListener) { // Firefox, Opera, Google Chrome and Safari
      window.addEventListener('focus', vk__adsLight.userHandlers.onFocusWindow, true);
      window.addEventListener('blur',  vk__adsLight.userHandlers.onBlurWindow, true);
    }
  }
  if (document.addEventListener) {
    window.addEventListener('scroll',      vk__adsLight.userHandlers.onScrollWindow, true);
    document.addEventListener('mousedown', vk__adsLight.userHandlers.onMouseDownDocument, true);
  } else if (document.attachEvent) {
    window.attachEvent('onscroll',      vk__adsLight.userHandlers.onScrollWindow);
    document.attachEvent('onmousedown', vk__adsLight.userHandlers.onMouseDownDocument);
  }

  if (!isVkDomain && window.VK && VK.addCallback) {
    VK.addCallback('adsPublish', AdsLight.handleEvent);
  }

  vk__adsLight.userHandlers.onInit(true);
}

AdsLight.initUserHandlers = function() {

  vk__adsLight.userHandlers = {
    onInit:                    onInit,
    onHasFocus:                onHasFocus,
    onFocusWindow:             onFocusWindow,
    onBlurWindow:              onBlurWindow,
    onScrollWindow:            onScrollWindow,
    onMouseDownDocument:       onMouseDownDocument,
    onMouseDownDocumentAction: onMouseDownDocumentAction,
    onActiveTab:               onActiveTab
  };

  var needBlur       = false;
  var afterClickLink = false;
  var focusTime      = false;
  var updateTimer    = false;
  var scrollTimer    = false;

  function onInit(eventStub) {
    AdsLight.initObservers();

    if (eventStub) {
      AdsLight.handleEvent('ads.onEvent', 'onInit', 0);
    }

    if (!eventStub) {
      AdsLight.loadAds();
    }

    if (document.hasFocus && document.hasFocus()) {
      onHasFocus(true);
    }
  }
  function onHasFocus(eventStub) {
    if (eventStub) {
      AdsLight.handleEvent('ads.onEvent', 'onHasFocus', 0);
    }

    onActiveTab();
  }
  function onFocusWindow(event) {
    if (event) {
      AdsLight.handleEvent('ads.onEvent', 'onFocusWindow', 0);
    }

    // Opera fix
    // May be obsolete
    if (needBlur) {
      return;
    }
    needBlur = true;

    focusTime = (window.vkNow && vkNow() || 0);

    vk__adsLight.userEventTime = (window.vkNow && vkNow() || 0);

    onActiveTab();
  }
  function onBlurWindow(event) {

    needBlur = false;

    if (window.vkNow && vkNow() - focusTime < 1000) {
      return;
    }

    if (event) {
      AdsLight.handleEvent('ads.onEvent', 'onBlurWindow', 0);
    }

    vk__adsLight.activeTab = (window.vkNow && -vkNow() || 0);
  }
  function onScrollWindow(event, delayed) {
    if (event && !delayed) {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function() {
        onScrollWindow(event, true);
      }, 100);
      return;
    }

    if (event) {
      AdsLight.handleEvent('ads.onEvent', 'onScrollWindow', 0);
    }

    vk__adsLight.userEventTime = (window.vkNow && vkNow() || 0);

    onActiveTab();

    if (isVkDomain && window.vkNow && window.vk && vk.ads_rotate_interval && isTimeToUpdate()) {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(function() {
        if (isTimeToUpdate()) {
          __adsLoaded = 0;
          AdsLight.updateBlock();
        }
      }, 10);
    }

    function isTimeToUpdate() {
      return vk__adsLight.adsSection === 'web' && vkNow() - __adsLoaded >= vk.ads_rotate_interval || vkNow() - __adsLoaded >= vk.ads_rotate_interval * 5;
    }
  }
  function onMouseDownDocument(event) {
    if (event) {
      AdsLight.handleEvent('ads.onEvent', 'onMouseDownDocument', 0);
    }

    vk__adsLight.userEventTime = (window.vkNow && vkNow() || 0);

    onActiveTab();

    if (!event) {
      return;
    }
    var elem = event.target;
    while (elem) {
      if (elem.tagName == 'A') {
        break;
      }
      if (elem.onclick) {
        break;
      }
      elem = elem.parentNode;
    }
    if (!elem) {
      return;
    }

    onMouseDownDocumentAction(true);
  }
  function onMouseDownDocumentAction(eventStub) {
    if (eventStub) {
      AdsLight.handleEvent('ads.onEvent', 'onMouseDownDocumentAction', 0);
    }

    clearTimeout(updateTimer);

    afterClickLink = true;
    setTimeout(function() {
      afterClickLink = false;
    }, 10);
  }
  function onActiveTab(eventStub) {
    if (isVkDomain && window.vkNow && window.vk && vk.ads_rotate_interval && !afterClickLink && vk__adsLight.activeTab < 0 && vkNow() + vk__adsLight.activeTab >= 15000 && isTimeToUpdate()) {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(function() {
        if (isTimeToUpdate()) {
          __adsLoaded = 0;
          AdsLight.updateBlock();
        }
      }, 10);
    }
    vk__adsLight.activeTab = 1;

    function isTimeToUpdate() {
      return vkNow() - __adsLoaded >= vk.ads_rotate_interval;
    }
  }
}

AdsLight.initWeb = function(adsSection, loaderParams, adsScriptVersion) {
  vk__adsLight.adsSection = adsSection;

  if (top === window) {
    return;
  }

  var isVisibleWeb = AdsLight.isVisibleBlockWrap(true);

  var rpcMethods = {
    adsPublish: function() {
      AdsLight.handleEvent.apply(AdsLight, arguments);
    },
    onAdsAttached: function() {
      if (isVisibleWeb) {
        vk__adsLight.rpc.callMethod('publish', 'ads.subscribeEvents');
      }
    },
    onInit: function() {
      if (isVisibleWeb) {
        vk__adsLight.rpc.callMethod('publish', 'ads.subscribeEvents');
      } else {
        vk__adsLight.rpc.callMethod('resizeWidget', 0, 0);
        vk__adsLight.rpc.callMethod('adsOnInit', -1);
      }
    }
  };
  try {
    vk__adsLight.rpc = new fastXDM.Client(rpcMethods);
    if (isVisibleWeb) {
      vk__adsLight.rpc.callMethod('adsOnInitLoader', adsScriptVersion);
      vk__adsLight.loaderParams = loaderParams;
    }
  } catch (e) {
    debugLog(e);
  }
}

AdsLight.initObservers = function() {
  if (!window.VK || !VK.Observer || !VK.Observer.subscribe) {
    return;
  }
  if (vk__adsLight.observersInited) {
    return;
  }
  vk__adsLight.observersInited = true;

  VK.Observer.subscribe('ads.isVisibleBlockWrap', getHandler('ads.isVisibleBlockWrap'));
  VK.Observer.subscribe('ads.subscribeEvents',    getHandler('ads.subscribeEvents'));
  VK.Observer.subscribe('ads.onEvent',            getHandler('ads.onEvent'));
  VK.Observer.subscribe('ads.onAdsShowed',        getHandler('ads.onAdsShowed'));

  for (var widgetId in VK.Widgets.RPC) {
    if (VK.Widgets.RPC[widgetId].methods.adsOnInit) {
      VK.Widgets.RPC[widgetId].callMethod('onAdsAttached');
    }
  }

  function getHandler(publishEventName) {
    return function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(publishEventName);
      AdsLight.handleEvent.apply(AdsLight, args);
    };
  }
}

AdsLight.handleEvent = function() {
  var args = Array.prototype.slice.call(arguments);
  var publishEventName = args.shift();
  switch (publishEventName) {
    case 'ads.isVisibleBlockWrap':
      AdsLight.isVisibleBlockWrapRpc.apply(AdsLight, args);
      break;
    case 'ads.subscribeEvents':
      var widgetId = args[0];
      if (widgetId && !vk__adsLight.widgetsIds[widgetId]) {
        vk__adsLight.widgetsIds[widgetId] = true;
      }
      vk__adsLight.userHandlers.onInit(true);
      break;
    case 'ads.onEvent':
      AdsLight.onEvent.apply(AdsLight, args);
      break;
    case 'ads.onAdsShowed':
      AdsLight.onAdsShowed.apply(AdsLight, args);
      break;
  }
}

AdsLight.onEvent = function(eventName, windowsIds) {
  if (windowsIds === 0) {
    windowsIds = [];
    //windowsIds.push(Math.round(Math.random() * -1000)); // For debug
  } else {
    var isWindowCur = false;
    for (var i in windowsIds) {
      if (windowsIds[i] == vk__adsLight.windowId) {
        isWindowCur = true;
        break;
      }
    }
    if (isWindowCur) {
      return;
    }
    if (vk__adsLight.userHandlers[eventName]) {
      vk__adsLight.userHandlers[eventName](false);
    }
  }
  windowsIds.push(vk__adsLight.windowId);

  AdsLight.publish(false, 'ads.onEvent', eventName, windowsIds);
}

AdsLight.onAdsShowed = function(adsShowedAll) {
  if (adsShowedAll === 0) {
    adsShowedAll = {};
  }

  // Sort windows ids to correct compare received messages
  {
    var windowsIds = [];
    for (var windowId in adsShowedAll) {
      windowsIds.push(parseInt(windowId));
    }
    windowsIds.sort();
  }

  // Check for identical message was send
  {
    var publishHash = [];
    for (var i = 0, len = windowsIds.length; i < len; i++) {
      var windowId = windowsIds[i];
      publishHash.push(adsShowedAll[windowId].ads_showed_hash);
    }
    publishHash = publishHash.join('_');

    var noPublish = (publishHash && adsShowedAll[vk__adsLight.windowId] && publishHash === adsShowedAll[vk__adsLight.windowId].publish_hash);
  }

  // Add known showed ads to message
  {
    var nowTime = +new Date;

    if (!adsShowedAll[vk__adsLight.windowId]) {
      adsShowedAll[vk__adsLight.windowId] = {};
      windowsIds.push(vk__adsLight.windowId);
      windowsIds.sort();
    }
    adsShowedAll[vk__adsLight.windowId].ads_showed      = vk__adsLight.adsShowed;
    adsShowedAll[vk__adsLight.windowId].ads_showed_hash = vk__adsLight.adsShowedHash;
    adsShowedAll[vk__adsLight.windowId].update_progress = vk__adsLight.updateProgress;

    for (var windowId in vk__adsLight.adsShowedAll) {
      if ((!adsShowedAll[windowId] || vk__adsLight.adsShowedAll[windowId].publish_time > adsShowedAll[windowId].publish_time) && nowTime - vk__adsLight.adsShowedAll[windowId].publish_time < 10000) {
        adsShowedAll[windowId] = vk__adsLight.adsShowedAll[windowId];
      }
    }

    var publishHash = [];
    for (var i = 0, len = windowsIds.length; i < len; i++) {
      var windowId = windowsIds[i];
      publishHash.push(adsShowedAll[windowId].ads_showed_hash);
    }
    publishHash = publishHash.join('_');

    adsShowedAll[vk__adsLight.windowId].publish_time = nowTime;
    adsShowedAll[vk__adsLight.windowId].publish_hash = publishHash;
  }

  // Update all showed ads
  for (var windowId in adsShowedAll) {
    vk__adsLight.adsShowedAll[windowId] = adsShowedAll[windowId];
  }

  if (!noPublish) {
    AdsLight.publish(true, 'ads.onAdsShowed', adsShowedAll);
  }
}

AdsLight.publish = function(delayBigPublish, publishEventName) {

  var args  = Array.prototype.slice.call(arguments, 1);
  var args1 = args.slice();
  var args2 = args.slice();
  var args3 = args.slice();
  var args4 = args.slice();
  args1.unshift('adsPublish');
  args2.unshift('adsPublish');
  args3.unshift('adsPublish');
  args4.unshift('publish');

  var func;
  var funcs = [];
  if (window.VK && VK.Widgets && VK.Widgets.RPC) {
    for (var widgetId in vk__adsLight.widgetsIds) {
      if (VK.Widgets.RPC[widgetId] && VK.Widgets.RPC[widgetId].callMethod) {
        func = (function() {
          var widgetIdCur = widgetId;
          return function() {
            VK.Widgets.RPC[widgetIdCur].callMethod.apply(VK.Widgets.RPC[widgetIdCur], args1);
          }
        })();
        funcs.push(func);
      }
    }
  }
  if (!isVkDomain && window.VK && VK.callMethod) {
    func = function() {
      VK.callMethod.apply(VK, args2);
    }
    funcs.push(func);
  }
  if (isVkDomain && vk__adsLight.adsSection !== 'web' && window.cur && cur.app && cur.app.runCallback) {
    func = function() {
      cur.app.runCallback.apply(cur.app, args3);
    }
    funcs.push(func);
  }
  if (isVkDomain && vk__adsLight.adsSection === 'web' && vk__adsLight.rpc && vk__adsLight.rpc.callMethod) {
    func = function() {
      vk__adsLight.rpc.callMethod.apply(vk__adsLight.rpc, args4);
    }
    funcs.push(func);
  }

  clearTimeout(vk__adsLight.publishTimers[publishEventName]);
  if (funcs.length > 1 && delayBigPublish) {
    vk__adsLight.publishTimers[publishEventName] = setTimeout(publishAll, 50);
  } else {
    publishAll();
  }

  function publishAll() {
    for (var i = 0, len = funcs.length; i < len; i++) {
      funcs[i]();
    }
  }
}

AdsLight.canUpdate = function() {

  var containerElem = ge('left_ads');

  var result = true;

  // Is visible
  result = (result && vk__adsLight.activeTab > 0 && containerElem && isVisible(containerElem) && AdsLight.isVisibleBlockWrap());
  // Is reasonable
  result = (result && vk.id && (vk__adsLight.adsCanShow >= 1 || vkNow() + vk__adsLight.adsCanShow > 3600000)); // hour

  if (vk__adsLight.adsSection === 'web') {
    // Is reasonable
    result = (result && vk__adsLight.loadComplete === 2);
  } else {
    // Is visible
    result = (result && isVisible('side_bar') && !layers.visible && !isVisible('left_friends'));
    // Is reasonable
    result = (result && vk.loaded && !vk.no_ads);
  }

  return result;
}

AdsLight.getAjaxParams = function(ajaxParams, ajaxOptions) {
  var ajaxParamsNew = {};
  var canUpdateBlock = AdsLight.canUpdate();
  if (ajaxOptions.noAds) {
    ajaxParamsNew.al_ad = 0;
  } else if (canUpdateBlock || ajaxOptions.ads) {
    if (ajaxOptions.ads || window.vkNow && window.vk && vk.ads_rotate_interval && vk__adsLight.adsSection !== 'web' && vkNow() - __adsLoaded >= vk.ads_rotate_interval) {
      __adsLoaded = vkNow();
      ajaxParamsNew.al_ad = 1;
    }
    if (ajaxParams.al_ad || ajaxParamsNew.al_ad) {
      ajaxParamsNew.ads_section = vk__adsLight.adsSection;
      ajaxParamsNew.ads_showed = AdsLight.getAdsShowed();
    }
  } else {
    ajaxParamsNew.al_ad = null;
  }
  return ajaxParamsNew;
}

AdsLight.doRequest = function(requestFunc, delayed) {

  var isWebLoad = (vk__adsLight.adsSection === 'web' && vk__adsLight.loadComplete === 1);

  if (!delayed) {
    vk__adsLight.updateProgress = 1;
    AdsLight.onAdsShowed(0);
    setTimeout(AdsLight.doRequest.pbind(requestFunc, true), 300);
    return;
  }

  var lastRequestWindowId = 0;
  var lastRequestWindowsIds = {};
  var intervalTimer;
  var timeoutTimer;

  checkRequest();

  function checkRequest(force) {
    var nowTime = +new Date;
    var currentRequestWindowId = 0;
    for (var windowId in vk__adsLight.adsShowedAll) {
      var windowAdsShowed = vk__adsLight.adsShowedAll[windowId];
      if (nowTime - windowAdsShowed.publish_time >= 30000) {
        delete vk__adsLight.adsShowedAll[windowId];
      } else if (!isWebLoad || !lastRequestWindowsIds[windowId]) {
        if (windowAdsShowed.update_progress == 2) {
          currentRequestWindowId = windowId;
          break;
        } else if (windowAdsShowed.update_progress == 1 && (!currentRequestWindowId || windowId < currentRequestWindowId)) {
          currentRequestWindowId = windowId;
        }
      }
    }

    if (force || !currentRequestWindowId || currentRequestWindowId == vk__adsLight.windowId) {
      clearInterval(intervalTimer);
      clearTimeout(timeoutTimer);
      vk__adsLight.updateProgress = 2;
      AdsLight.onAdsShowed(0);
      requestFunc();
    } else if (currentRequestWindowId != lastRequestWindowId) {
      lastRequestWindowId = currentRequestWindowId;
      clearInterval(intervalTimer);
      clearTimeout(timeoutTimer);
      intervalTimer = setInterval(checkRequest, isWebLoad ? 100 : 200);
      timeoutTimer = setTimeout(checkRequest.pbind(true), 5000 + 50);
    }

    lastRequestWindowsIds[currentRequestWindowId] = (lastRequestWindowsIds[currentRequestWindowId] ? lastRequestWindowsIds[currentRequestWindowId] + 1 : 1);
  }
}

AdsLight.getAdsShowed = function() {
  var adsShowed = [];
  for (var windowId in vk__adsLight.adsShowedAll) {
    var windowAdsShowed = vk__adsLight.adsShowedAll[windowId];
    if (windowAdsShowed.ads_showed) {
      adsShowed.push(windowAdsShowed.ads_showed);
    }
  }
  adsShowed = adsShowed.join(',');
  return adsShowed;
}

AdsLight.updateBlock = function(delayed) {

  if (__adsLoaded) {
    return;
  }

  if (!delayed) {
    clearTimeout(vk__adsLight.updateBlockTimer);
    vk__adsLight.updateBlockTimer = setTimeout(AdsLight.updateBlock.pbind(1), 1000);
    return;
  }

  var canUpdateBlock = AdsLight.canUpdate();

  if (delayed == 1) {
    setTimeout(AdsLight.updateBlock.pbind(2), 500); // Period must be greater than in isVisibleBlockWrapCoords
    return;
  }

  if (!canUpdateBlock) {
    return;
  }

  __adsLoaded = vkNow();

  var ajaxParams = {};
  for (var i in vk__adsLight.adsParams) {
    ajaxParams[i] = vk__adsLight.adsParams[i];
  }

  AdsLight.doRequest(function(){
    ajaxParams.ads_showed = AdsLight.getAdsShowed();
    ajax.post('/ads_rotate.php?act=al_update_ad', ajaxParams, {ads: 1, onDone: onComplete, onFail: onComplete});
  });

  function onComplete() {
    vk__adsLight.updateProgress = 3;
  }
}

AdsLight.setNewBlock = function(adsHtml, adsSection, adsCanShow, adsShowed, adsParams) {
  if (typeof(adsSection) === 'string') {
    vk__adsLight.adsSection = adsSection;
  }
  vk__adsLight.adsCanShow = ((adsCanShow || adsCanShow === '0') ? 1 : -vkNow());
  vk__adsLight.adsShowed     = adsShowed;
  vk__adsLight.adsShowedHash = +new Date;
  if (adsParams) {
    vk__adsLight.adsParams = adsParams;
  }

  if (!adsHtml) {
    if (vk.no_ads) {
      adsHtml = '';
    } else if (vk__adsLight.adsSection === 'im' && __seenAds == 0) {
      adsHtml = '';
    } else {
      AdsLight.resizeBlockWrap([0,0], false, false, true);
      return;
    }
  }

  __adsLoaded = vkNow();

  var containerElem = ge('left_ads');
  var isContainerVisible = (containerElem && isVisible(containerElem) || vk.ad_preview);
  if (!containerElem) {
    var sideBarElem = ge('side_bar');
    if (!sideBarElem) {
      AdsLight.resizeBlockWrap([0,0], false, false, true);
      return;
    }
    containerElem = sideBarElem.appendChild(ce('div', {id: 'left_ads'}, {display: isContainerVisible ? 'block' : 'none'}));
  }

  AdsLight.showNewBlock(containerElem, adsHtml, isContainerVisible);

  if (window.vk && vk.ads_rotate_interval && vk__adsLight.adsSection === 'web') {
    clearInterval(vk__adsLight.reloadTimer);
    vk__adsLight.reloadTimer = setInterval(function(){
      if (vkNow() - __adsLoaded >= vk.ads_rotate_interval && vkNow() - vk__adsLight.userEventTime <= vk.ads_rotate_interval * 3 / 4) { // Check part of ads_rotate_interval for user actions to prevent side effects when rotating ads cause window to scroll
        __adsLoaded = 0;
        AdsLight.updateBlock();
      }
    }, vk.ads_rotate_interval);
  }

  setTimeout(function() {
    vk__adsLight.updateProgress = 3;
    AdsLight.onAdsShowed(0);
  }, 100);
}

AdsLight.showNewBlock = function(containerElem, adsHtml, isContainerVisible) {
  if (!isContainerVisible || browserLight.msie6 || browserLight.msie7) {
    if (!isContainerVisible) {
      debugLog('Ads container is hidden');
    }
    containerElem.innerHTML = adsHtml;
    var newSize = AdsLight.getBlockSize(containerElem);
    AdsLight.resizeBlockWrap(newSize, false, false, true);
    AdsLight.updateExternalStats(containerElem);
    return;
  }

  var isNewBlockEmpty  = !adsHtml;
  var speed            = (isNewBlockEmpty ? 0 : 200);
  var oldSize          = AdsLight.getBlockSize(containerElem);
  var lastSize         = [0, 0];
  var newBlockElem     = containerElem.appendChild(ce('div', {innerHTML: adsHtml}, {display: 'none'}));
  var newBlockSizeElem = (geByClass1('ads_ads_box3', newBlockElem) || newBlockElem);

  var imagesElems   = geByTag('img', newBlockElem);
  var imagesObjects = [];
  for (var i = 0, len = imagesElems.length; i < len; i++) {
    var imageObject = vkImage();
    imageObject.onload  = delayedResizeBlockWrap;
    imageObject.onerror = delayedResizeBlockWrap;
    imageObject.src = imagesElems[i].src;
    imagesObjects.push(imageObject);
  }

  // Wait images then show ads
  clearInterval(vk__adsLight.imagesTimer);
  vk__adsLight.imagesTimer = setInterval(waitIamges.pbind({count: 40}), 50); // 2 seconds

  function waitIamges(context) {
    if (--context.count > 0) {
      for (var i in imagesObjects) {
        if (!imagesObjects[i].width || !imagesObjects[i].height) {
          return;
        }
      }
    }
    clearInterval(vk__adsLight.imagesTimer);
    startShowing();
  }
  function delayedResizeBlockWrap() {
    if (isVisible(newBlockElem)) {
      var newSize = AdsLight.getBlockSize(newBlockSizeElem);
      newSize = AdsLight.resizeBlockWrap(newSize, oldSize, lastSize);
    }
  }
  function startShowing() {
    setStyle(containerElem, {overflow: 'hidden'});
    // zIndex: 10 - To be upper then previous block and hiders after closing ads
    // width: '100%' - For correct horizontal centering.
    setStyle(newBlockElem, {display: 'block', position: 'absolute', left: 0, top: 0, opacity: 0, zIndex: 10, width: '100%'});

    var newSize = AdsLight.getBlockSize(newBlockSizeElem);
    newSize = AdsLight.resizeBlockWrap(newSize, oldSize, lastSize);

    // Resize container
    animate(containerElem, {width: newSize[0], height: newSize[1]}, speed, showNewBlock.pbind());
  }
  function showNewBlock() {
    cleanElems(containerElem);

    var newSize = AdsLight.getBlockSize(newBlockSizeElem)
    newSize = AdsLight.resizeBlockWrap(newSize, false, lastSize, true);

    animate(newBlockElem, {opacity: 1}, speed, removeOldBlock);
  }
  function removeOldBlock() {
    cleanElems(newBlockElem);

    while (newBlockElem.previousSibling) {
      re(newBlockElem.previousSibling);
    }
    setStyle(newBlockElem, {position: 'static', zIndex: '', width: ''});
    setStyle(containerElem, {width: '', height: '', overflow: 'visible'});

    // Update site layout
    if (window.updSideTopLink) updSideTopLink();

    AdsLight.updateExternalStats(containerElem);
  }
}

AdsLight.updateExternalStats = function(containerElem) {
  var elems = geByClass('ads_ad_external_stats', containerElem);
  for (var i = 0, elem; elem = elems[i]; i++) {
    if (elem.getAttribute('external_stats_complete')) {
      continue;
    }
    elem.setAttribute('external_stats_complete', 1);
    vkImage().src = elem.getAttribute('external_stats_src');
  }
}

AdsLight.isVisibleBlockWrap = function(forceLocal) {
  var containerElem = ge('left_ads');
  var containerRect = containerElem.getBoundingClientRect();
  var coords = [];
  if (containerRect.right && containerRect.bottom) {
    coords.push([containerRect.left + (containerRect.right - containerRect.left) * 1 / 5, containerRect.top + (containerRect.bottom - containerRect.top) * 1 / 5]);
    coords.push([containerRect.left + (containerRect.right - containerRect.left) * 4 / 5, containerRect.top + (containerRect.bottom - containerRect.top) * 4 / 5]);
  }

  AdsLight.isVisibleBlockWrapCoords(coords, containerElem, onComplete, forceLocal);

  return vk__adsLight.wrapVisible;

  function onComplete(isVisibleWrap) {
    vk__adsLight.wrapVisible = isVisibleWrap;
  }
}

AdsLight.isVisibleBlockWrapCoords = function(coords, containerElem, onComplete, forceLocal) {

  var isVisibleWrap = false;
  var coordsNew = [];
  for (var i = 0, len = coords.length; i < len; i++) {
    var elem          = document.elementFromPoint(coords[i][0], coords[i][1]);
    var isVisibleElem = (elem && (elem === containerElem || isAncestor(elem, containerElem)));
    var isVisibleWrap = (isVisibleWrap || isVisibleElem);
    if (isVisibleElem) {
      coordsNew.push(coords[i]);
    }
  }
  isVisibleWrap = !!isVisibleWrap;

  var completeTimer;
  var onCompleteCurrent = function(isVisibleWrapNew) {
    clearTimeout(completeTimer);
    onComplete((isVisibleWrapNew !== undefined) ? isVisibleWrapNew : isVisibleWrap);
  }

  if (!forceLocal && coordsNew.length && window != parent && isVkDomain && vk__adsLight.adsSection === 'web' && vk__adsLight.rpc && vk__adsLight.rpc.callMethod) {
    vk__adsLight.rpc.callMethod('publish', 'ads.isVisibleBlockWrap', coordsNew, onCompleteCurrent);
    completeTimer = setTimeout(onCompleteCurrent, 300); // Period must be lower than in updateBlock
  } else if (!forceLocal && coordsNew.length && window != parent && !isVkDomain && window.VK && VK.callMethod) {
    VK.callMethod('adsPublish', 'ads.isVisibleBlockWrap', coordsNew, onCompleteCurrent);
    completeTimer = setTimeout(onCompleteCurrent, 300); // Period must be lower than in updateBlock
  } else {
    onCompleteCurrent();
  }

  function isAncestor(elem, ancestor) {
    if (!elem || !ancestor) {
      return false;
    }
    while (elem = elem.parentNode) {
      if (elem === ancestor) {
        return true;
      }
    }
    return false;
  }
}

AdsLight.isVisibleBlockWrapRpc = function(coords, onComplete, widgetId) {
  var containerElem;
  if (widgetId) {
    containerElem = VK.Widgets.RPC[widgetId].frame;
  } else {
    containerElem = cur.app.frame;
  }

  var contanerRect = containerElem.getBoundingClientRect();

  var coordsNew = [];
  for (var i = 0, len = coords.length; i < len; i++) {
    var newX = coords[i][0] + contanerRect.left;
    var newY = coords[i][1] + contanerRect.top;
    coordsNew.push([newX, newY]);
  }

  AdsLight.isVisibleBlockWrapCoords(coordsNew, containerElem, onComplete);
}

AdsLight.getBlockSize = function(blockElem) {
  var adBoxes1 = geByClass('ads_ad_box', blockElem);
  var adBoxes5 = geByClass('ads_ad_box5', blockElem);

  each(adBoxes5, function(index, elem) { addClass(elem, 'max_size'); });

  if (browserLight.msie8) {
    each(adBoxes1, function(index, elem) {
      var width = Math.ceil(floatval(getStyle(elem, 'width')));
      var widthMax = Math.ceil(floatval(getStyle(elem, 'max-width')));
      if (widthMax && widthMax > 200 && width >= widthMax) {
        elem.style.width = widthMax + 'px';
      }
    });
  }

  var blockWidth  = Math.ceil(floatval(getStyle(blockElem, 'width')));
  var blockHeight = Math.ceil(floatval(getStyle(blockElem, 'height')));
  var blockSize = [blockWidth, blockHeight];

  each(adBoxes5, function(index, elem) { removeClass(elem, 'max_size'); });

  return blockSize;
}

AdsLight.resizeBlockWrap = function(newSize, oldSize, lastSize, forceResize) {
  if (!newSize) {
    return [0, 0];
  }

  var newWidth  = newSize[0];
  var newHeight = newSize[1];
  if (newWidth && vk__adsLight.adsParams && vk__adsLight.adsParams.ads_ad_unit_width > newWidth) {
    newWidth = vk__adsLight.adsParams.ads_ad_unit_width;
  }
  if (newHeight && vk__adsLight.adsParams && vk__adsLight.adsParams.ads_ad_unit_height > newHeight) {
    newHeight = vk__adsLight.adsParams.ads_ad_unit_height;
  }
  var isResizeWidth  = !!(forceResize || oldSize && newWidth > oldSize[0] || lastSize && lastSize[0] && newWidth > lastSize[0]);
  var isResizeHeight = !!(forceResize || oldSize && newHeight > oldSize[1] || lastSize && lastSize[1] && newHeight > lastSize[1]);
  if (!isResizeWidth && !isResizeHeight) {
    return [newWidth, newHeight];
  }
  if (lastSize) {
    if (isResizeWidth) {
      lastSize[0] = newWidth;
    }
    if (isResizeHeight) {
      lastSize[1] = newHeight;
    }
  }

  if (isVkDomain && vk__adsLight.adsSection === 'web' && vk__adsLight.rpc && vk__adsLight.rpc.callMethod) {
    vk__adsLight.rpc.callMethod('resizeWidget', isResizeWidth && newWidth, isResizeHeight && newHeight);
  }

  return [newWidth, newHeight];
}

AdsLight.loadAds = function() {
  if (!vk__adsLight.loaderParams || vk__adsLight.loadComplete) {
    return;
  }
  vk__adsLight.loadComplete = 1;

  var ajaxParams = {};

  for (var i in vk__adsLight.loaderParams) {
    ajaxParams[i] = vk__adsLight.loaderParams[i];
  }

  ajaxParams.url = document.referrer;
  try { ajaxParams.url_top = top.location.toString(); } catch (e) {}

  if (document.documentMode) {
    ajaxParams.ie_document_mode = document.documentMode;
  }

  AdsLight.doRequest(function(){
    ajaxParams.ads_showed = AdsLight.getAdsShowed();
    ajax.post('/ads_rotate.php?act=ads_web', ajaxParams, {onDone: onComplete, onFail: onComplete});
  });

  function onComplete(response, nothing, js) {
    vk__adsLight.updateProgress = 3;

    if (response && isObject(response) && 'ads_html' in response) {
      var styleElemOld = ge('ads_style_web_loader');
      var sheetOld     = (styleElemOld.sheet ? styleElemOld.sheet : styleElemOld.styleSheet);
      var deleteFunc   = (sheetOld.deleteRule ? 'deleteRule' : 'removeRule');
      sheetOld[deleteFunc](0);

      var styleElemNew = ce('style', {type: 'text/css'})
      if (styleElemNew.styleSheet) {
        styleElemNew.styleSheet.cssText = response.css;
      } else {
        styleElemNew.appendChild(document.createTextNode(response.css));
      }
      headNode.appendChild(styleElemNew);

      AdsLight.setNewBlock(response.ads_html, response.ads_section, response.ads_can_show, response.ads_showed, response.ads_params);
      vk__adsLight.rpc.callMethod('adsOnInit', response.ads_count);

      vk__adsLight.loadComplete = 2;
    } else {
      if (typeof(js) === 'string') {
        try {
          eval(js);
        } catch (e) {
          debugLog(e);
        }
      }
      AdsLight.loadAdsFailed(-1);
    }
  }
}

AdsLight.loadAdsFailed = function(errorCode) {
  if (!vk__adsLight.rpc) {
    return false;
  }
  if (vk__adsLight.loadComplete === -1) {
    return true;
  }
  vk__adsLight.loadComplete = -1;

  vk__adsLight.rpc.callMethod('resizeWidget', 0, 0);
  vk__adsLight.rpc.callMethod('adsOnInit', errorCode);

  return true;
}

AdsLight.handleAllAds = function(box, adsIdsMore, adsIdsApply, adsHeightMore) {

  var moreLocked    = false;
  var applyLocked   = false;
  var needAdsHeight = false;
  var needAdsApply  = {};
  var applyAllowed  = false;

  boxLayerWrap.scrollTop = 0;

  var boxOptions = {};
  boxOptions.onClean = deinit;
  box.setOptions(boxOptions);

  if (adsIdsMore) {
    addEvent(boxLayerWrap, 'scroll', onScroll);
  }
  allowApply();
  onScroll();

  function deinit() {
    removeEvent(boxLayerWrap, 'scroll', onScroll);
    hide('ads_ads_all_ads_more');
  }
  function checkDeinit() {
    if (!adsIdsMore && isEmpty(adsIdsApply)) {
      deinit();
    }
  }
  function allowApply(delayed) {
    if (!delayed) {
      setTimeout(allowApply.pbind(true), 1000);
      return;
    }
    applyAllowed = true;
    onScroll();
  }
  function onScroll() {
    var moreElem = ge('ads_ads_all_ads_more');
    if (!moreElem) {
      return;
    }
    var moreRect = moreElem.getBoundingClientRect()
    if (moreRect.top < lastWindowHeight + adsHeightMore) {
      needAdsHeight = Math.round(Math.max(needAdsHeight, lastWindowHeight - moreRect.top + adsHeightMore));
      moreAds();
    }

    if (applyAllowed) {
      var isApplyAdsUpdated = false;
      for (var i in adsIdsApply) {
        if (needAdsApply[i]) {
          continue;
        }
        adsRowRect = ge(i).getBoundingClientRect();
        if (adsRowRect.bottom > 0 && adsRowRect.top < lastWindowHeight) {
          needAdsApply[i] = true;
          isApplyAdsUpdated = true;
        }
      }
      if (isApplyAdsUpdated) {
        applyAds();
      }
    }
  }
  function moreAds(delayed) {
    if (!delayed) {
      setTimeout(moreAds.pbind(true), 100);
      return;
    }
    if (!adsIdsMore) {
      return;
    }
    if (!needAdsHeight) {
      return;
    }
    if (moreLocked) {
      return;
    }
    moreLocked = true;

    var ajaxParams = {};
    ajaxParams.ads_ids_more = adsIdsMore;
    ajaxParams.ads_height = needAdsHeight;

    ajax.post('/ads_light.php?act=all_ads_more', ajaxParams, {onDone: onDoneMoreAds.pbind(), onFail: onFailMoreAds})
  }
  function onDoneMoreAds(response) {
    moreLocked = false;
    if (!response) {
      onFailMoreAds();
      return;
    }
    adsIdsMore = response.ads_ids_more;
    for (var i in response.ads_ids_apply) {
      adsIdsApply[i] = response.ads_ids_apply[i];
    }
    if (response.ads_html) {
      var adsElem = ge('ads_ads_all_ads_rows');
      var moreElem = ge('ads_ads_all_ads_more');
      if (adsElem) {
        adsElem.innerHTML += response.ads_html;
        needAdsHeight = false;
        onScroll();
      }
      if (moreElem) {
        moreElem.height = response.ads_more_height;
      }
    }
    checkDeinit();
  }
  function onFailMoreAds() {
    moreLocked = false;
    return true;
  }
  function applyAds(delayed) {
    if (!delayed) {
      setTimeout(applyAds.pbind(true), 100);
      return;
    }
    if (isEmpty(adsIdsApply)) {
      checkDeinit();
      return;
    }
    if (isEmpty(needAdsApply)) {
      return;
    }
    if (applyLocked) {
      return;
    }
    applyLocked = true;

    var ajaxParams = {};
    ajaxParams.ads_ids_apply = [];

    for (var i in needAdsApply) {
      ajaxParams.ads_ids_apply.push(adsIdsApply[i]);
      delete adsIdsApply[i];
    }
    needAdsApply = {};

    ajaxParams.ads_ids_apply = ajaxParams.ads_ids_apply.join(';');

    ajax.post('/ads_light.php?act=all_ads_apply', ajaxParams, {onDone: onCompleteApplyAds, onFail: onCompleteApplyAds})
  }
  function onCompleteApplyAds(response) {
    for (var blockIdSuffix in response) {
      var elem = ge('ads_ad_box2_' + blockIdSuffix);
      if (!elem) {
        continue;
      }
      for (var key in response[blockIdSuffix]) {
        elem.setAttribute(key, response[blockIdSuffix][key]);
      }
    }

    applyLocked = false;
    applyAds();
  }
}

AdsLight.init();

})();

try{stManager.done('aes_light.js');}catch(e){}
