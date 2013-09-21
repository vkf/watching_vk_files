var AdsEdit = {};

AdsEdit.init = function() {
  cur.toClean = {};
  cur.destroy.push(function() { AdsEdit.destroy(); } );

  cur.viewEditor = new AdsViewEditor();
  cur.targetingEditor = new AdsTargetingEditor();

  cur.viewEditor.init({}, cur.targetingEditor, cur.adParams, cur.adParamsData, cur.adParamsParams);
  cur.destroy.push(function() { cur.viewEditor.destroy(); } );

  cur.targetingEditor.init({}, cur.viewEditor, cur.targetingCriteria, cur.targetingCriteriaData, cur.targetingCriteriaRanges, cur.targetingCriteriaParams, cur.targetingGroups);
  cur.destroy.push(function() { cur.targetingEditor.destroy(); } );

  cur.editor = new AdsEditor();
  cur.editor.init(cur.viewEditor, cur.targetingEditor);
  cur.destroy.push(function() { cur.editor.destroy(); } );

  // To prevent empty fields after go to another page (no ajax) and then go back by browser Back navigation button
  // See: http://code.google.com/p/chromium/issues/detail?id=76739
  if (browser.chrome) {
    var titleElem = ge('ads_param_title');
    titleElem.value = AdsEdit.unescapeValueInit(titleElem.innerHTML);
    var descriptionElem = ge('ads_param_description');
    descriptionElem.value = AdsEdit.unescapeValueInit(descriptionElem.innerHTML);
    var tagsElem = ge('ads_targeting_criterion_tags');
    tagsElem.value = AdsEdit.unescapeValueInit(tagsElem.innerHTML);
  }

  Ads.initFixed('ads_edit_audience_wrap');
}

AdsEdit.destroy = function() {
  for (var i in cur.toClean) {
    cleanElems(i);
  }
}

AdsEdit.escapeValue = function(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
}

AdsEdit.unescapeValueInit = function(value) {
  return replaceEntities(value);
}

AdsEdit.unescapeValue = function(value) {
  return replaceEntities(value.replace(/&/g, '&amp;'));
}

AdsEdit.getTextWidth = function(text) {
  var elem = ce('span', {innerHTML: text});
  document.body.appendChild(elem);
  var size = getSize(elem);
  re(elem)
  return size[0];
}

AdsEdit.showError = function(message, section) {
  if (section !== 'targeting' && section !== 'behavior') {
    section = 'ad';
  }
  var errors = {};
  errors.ad        = ge('ads_edit_error_ad');
  errors.targeting = ge('ads_edit_error_targeting');
  errors.behavior  = ge('ads_edit_error_behavior');

  errorElem = errors[section];
  delete errors[section];

  for (var i in errors) {
    hide(errors[i]);
  }

  cur.lastErrorMessage = message;

  errorElem.innerHTML = message;
  show(errorElem);

  Ads.scrollToError(errorElem);
}

AdsEdit.hideErrors = function() {
  var errorElemAd        = ge('ads_edit_error_ad')
  var errorElemTargeting = ge('ads_edit_error_targeting')
  var errorElemBehavior  = ge('ads_edit_error_behavior')
  hide(errorElemAd);
  hide(errorElemTargeting);
  hide(errorElemBehavior);
  errorElemAd.innerHTML = '';
  errorElemTargeting.innerHTML = '';
  errorElemBehavior.innerHTML = '';
}

AdsEdit.getLastError = function() {
  return cur.lastErrorMessage;
}

AdsEdit.showTargetingCriterionHelp = function(event, helpKey) {
  var helpValue = cur.targetingCriteriaHelp[helpKey];

  var boxOptions = {};
  boxOptions.title = getLang('ads_tip');
  boxOptions.width = 350;
  showFastBox(boxOptions, helpValue);

  cancelEvent(event);
  return false;
}

AdsEdit.initHelpTooltipTarget = function(targetElem, handler, curLocal) {
  addEvent(targetElem, 'mouseover mouseout', handler);
  curLocal.destroy.push(function(){ removeEvent(targetElem, 'mouseover mouseout', handler); });
  setTimeout(function() {
    var elemsArr = [];
    elemsArr[0] = geByTag('input', targetElem);
    elemsArr[1] = geByTag('textarea', targetElem);
    for (var j = 0, elems; elems = elemsArr[j]; j++) {
      for (var i = 0, elem; elem = elems[i]; i++) {
        var nodeName = elem.nodeName.toLowerCase();
        if (!elem.readOnly && (nodeName === 'input' && elem.type.toLowerCase() === 'text' || nodeName === 'textarea')) {
          addEvent(elem, 'focus blur', handler);
          curLocal.destroy.push(function(elem){ removeEvent(elem, 'focus blur', handler); }.pbind(elem));
        }
      }
    }
  }, 500);
}

AdsEdit.initHelpTooltip = function(targetElem, handler, ttContainer, curLocal) {
  var tt = ttContainer.tt = targetElem.tt;
  curLocal.destroy.push(function() { tt.destroy(targetElem); });

  var tootltipTextElem = geByClass1('ads_edit_tt_text', tt.container);
  addEvent(tootltipTextElem, 'mouseover mouseout', handler);
  curLocal.destroy.push(function(){ removeEvent(tootltipTextElem, 'mouseover mouseout', handler); });
}

AdsEdit.showHelpCriterionTooltip = function(helpTooltipName, targetElem, ttHandler, ttContainer, helpText, shiftLeft, shiftTop, curLocal) {
  if (cur.lastHelpTooltipName && cur.lastHelpTooltipName != helpTooltipName) {
    var lastTooltip = cur.getLastTooltip();
    if (lastTooltip) {
      lastTooltip.hide();
    }
  }
  cur.getLastTooltip = function(){ return targetElem.tt; };
  cur.lastHelpTooltipName = helpTooltipName;

  if (shiftLeft === undefined || shiftLeft === false || shiftLeft === null) {
    shiftLeft = -350;
  }
  if (shiftTop === undefined || shiftTop === false || shiftTop === null) {
    shiftTop = -58;
  }

  showTooltip(targetElem, {
    text: '<div class="ads_edit_tt_pointer ads_edit_tt_pointer_' + helpTooltipName + '"></div><div class="ads_edit_tt_text">' + helpText + '</div>',
    className: 'ads_edit_tt',
    slideX: 15,
    shift: [shiftLeft, 0, shiftTop],
    nohide: true,
    forcetodown: true,
    onCreate: function() { AdsEdit.initHelpTooltip(targetElem, ttHandler, ttContainer, curLocal); }
  });
}

AdsEdit.hideHelpTooltip = function(tt) {
  if (tt) {
    tt.hide();
  }
}

AdsEdit.onHelpTooltipEvent = function(event, helpTooltipName, context, showTooltip, hideTooltip) {
  switch (event.type) {
    case 'focus':
      cur.focusedHelpTooltipName = helpTooltipName;
      context.focus = true;
      if (context.overTimeout) {
        clearTimeout(context.overTimeout)
        delete context.overTimeout;
      }
      //showHelp(); // Do not show tooltip on focus
      break;
    case 'blur':
      if (cur.focusedHelpTooltipName == helpTooltipName) {
        delete cur.focusedHelpTooltipName;
      }
      context.focus = false;
      hideHelp();
      break;
    case 'mouseover':
      context.over = 1;
      context.out = 0;
      if (context.overTimeout) {
        clearTimeout(context.overTimeout)
        delete context.overTimeout;
      }
      if (context.outTimeout) {
        clearTimeout(context.outTimeout)
        delete context.outTimeout;
      }
      setTimeout(function(){
        if (context.over == 1) {
          context.over = 2;
          context.overTimeout = setTimeout(function(){
            showHelp();
            delete context.overTimeout;
          }, 100);
        }
      }, 100);
      break;
    case 'mouseout':
      context.over = 0;
      context.out  = 1;
      if (context.overTimeout) {
        clearTimeout(context.overTimeout)
        delete context.overTimeout;
      }
      if (context.outTimeout) {
        clearTimeout(context.outTimeout)
        delete context.outTimeout;
      }
      setTimeout(function(){
        if (context.out == 1) {
          context.out = 2;
          context.outTimeout = setTimeout(function(){
            hideHelp();
            delete context.outTimeout;
          }, 500);
        }
      }, 100);
      break;
  }

  function showHelp() {
    if (context.focus || context.over == 2 && !cur.focusedHelpTooltipName) {
      showTooltip();
    }
  }
  function hideHelp() {
    if (!context.focus && context.out == 2) {
      hideTooltip();
    }
  }
}

AdsEdit.toggleTargetingGroup = function(groupId, groupElemId) {
  var prefValue;
  var hiderTitleElem = ge(groupElemId + '_hider_title');

  cur.toClean[groupElemId] = true;

  if (hasClass(hiderTitleElem, 'on')) {
    prefValue = 0;
  } else {
    prefValue = 1;
  }

  if (prefValue) {
    cur.targetingEditor.showGroup(groupId);
  }

  if (prefValue == 0) {
    removeClass(hiderTitleElem, 'on');
    addClass(hiderTitleElem, 'off');
    slideUp(groupElemId, 200);
  } else {
    removeClass(hiderTitleElem, 'off');
    addClass(hiderTitleElem, 'on');
    slideDown(groupElemId, 200, function(){ cur.targetingEditor.showGroupEnd(groupId); });
  }

  if (!cur.targetingPrefs) {
    cur.targetingPrefs = {};
  }
  cur.targetingPrefs[groupId] = prefValue;

  AdsEdit.saveTargetingPrefs();
}

AdsEdit.saveTargetingPrefs = function(delayed) {

  if (!delayed) {
    if (cur.saveTargetingPrefsTimeout === undefined) {
      cur.destroy.push(function() { clearTimeout(cur.saveTargetingPrefsTimeout); });
    } else {
      clearTimeout(cur.saveTargetingPrefsTimeout);
    }
    cur.saveTargetingPrefsTimeout = setTimeout(function() { AdsEdit.saveTargetingPrefs(true); }, 2000);
    return;
  }

  var prefsStr = '';
  for (var i in cur.targetingPrefs) {
    if (prefsStr) {
      prefsStr += ',';
    }
    prefsStr += i + '=' + cur.targetingPrefs[i];
  }
  cur.targetingPrefs = {};

  var ajaxParams = {};
  ajaxParams.hash = cur.targetingPrefsHash;
  ajaxParams.targeting_prefs = prefsStr;

  ajax.post('/adsedit?act=save_targeting_prefs', ajaxParams, {onFail: function() { return true; }});
}

AdsEdit.saveAd = function() {
  function onLock() {
    lockButton('ads_edit_save_button');
  }
  function onUnlock() {
    unlockButton('ads_edit_save_button');
  }

  if (!Ads.lock('save_ad', onLock, onUnlock)) {
    return;
  }

  var errorTag = 'ads_edit_erorr_tag_' + rand(0, 2000000000);
  function hideDomainError() {
    if (ge(errorTag)) {
      AdsEdit.hideErrors();
    }
  }
  var domainResult = cur.viewEditor.updateLinkDomain(hideDomainError);
  if (!domainResult) {
    var errorTagHtml = '<div id="' + errorTag + '" style="display: none;"></div>';
    AdsEdit.showError(getLang('ads_error_url_not_checked') + errorTagHtml);
    Ads.unlock('save_ad');
    return;
  }

  var viewParams = cur.viewEditor.getParams();
  var targetingCriteria = cur.targetingEditor.getCriteria();

  var ajaxParams = {};
  ajaxParams.hash = cur.saveAdHash;
  ajaxParams = extend({}, ajaxParams, viewParams);
  ajaxParams = extend({}, ajaxParams, targetingCriteria);

  ajax.post('/adsedit?act=save_ad', ajaxParams, {onDone: onDone, onFail: onFail});

  function onDone(result) {
    Ads.unlock('save_ad');

    if (result && result.link_domain_continue) {
      var confirmBox = showFastBox(
        {title: getLang('ads_error_url_unreachable_title')},
        getLang('ads_save_ad_confirm_unreachable_url'),
        getLang('ads_save'),
        function() {
          cur.viewEditor.confirmLinkDomain();
          confirmBox.hide();
          AdsEdit.saveAd();
        },
        getLang('box_cancel'),
        function() {
          confirmBox.hide();
        }
      );
      return
    }
    if (result && result.error) {
      if (result.error.targeting) {
        AdsEdit.showError(result.error.targeting, 'targeting');
        return;
      }
      if (result.error.behavior) {
        AdsEdit.showError(result.error.behavior, 'behavior');
        return;
      }
      if (result.error.ad) {
        AdsEdit.showError(result.error.ad, 'ad');
        return;
      }
    }
    if (result.ad_id) {
      nav.go('/ads?act=office&union_id=' + result.ad_id);
      return;
    }

    onFail();
  }

  function onFail() {
    Ads.unlock('save_ad');
    AdsEdit.showError(getLang('ads_error_unexpected_error_try_later'))
    return true;
  }
}

AdsEdit.cancelAd = function(cancelLink, event) {
  nav.go(cancelLink, event);
}

AdsEdit.showLastAdsBox = function(parentId) {

  var ajaxParams = {};
  ajaxParams.parent_id = parentId;

  var showOptions = {params: {}};
  showOptions.cache = 1;
  showOptions.stat = ['indexer.js'];
  showOptions.params.width = 600;
  showOptions.params.bodyStyle = 'padding: 0;';

  showBox('/adsedit?act=last_ads_box', ajaxParams, showOptions);
}

AdsEdit.initLastAdsBox = function(lastAdsBox, lastAds, lastAdsKeyMap) {
  if (!cur.lastAds) {
    cur.lastAds       = lastAds;
    cur.lastAdsKeyMap = lastAdsKeyMap;

    cur.lastAdsIndex = new vkIndexer(lastAds, function(obj) {
        return se(obj[lastAdsKeyMap.indexer_text]).nodeValue;
      }
    );
  }

  var boxOptions = {}
  boxOptions.onClean = function() {
    cleanElems(ge('ads_edit_last_ads_search'), geByClass1('input_back_wrap', lastAdsBox.bodyNode), geByClass1('input_back_content', lastAdsBox.bodyNode));
  };
  lastAdsBox.setOptions(boxOptions);

  cur.lastAdsBox = lastAdsBox;

  placeholderSetup('ads_edit_last_ads_search', {back: true});

  ge('ads_edit_last_ads_content').scrollTop = 0;
  AdsEdit.searchLastAds(true);
}

AdsEdit.searchLastAds = function(initial) {
  var searchStr = ge('ads_edit_last_ads_search').getValue();
  if (!initial && searchStr === cur.lastSearchStr) {
    return;
  }

  var lastAdsIds = {};
  var results = [];
  var isShowAll = false;
  cur.lastSearchStr = searchStr;
  if (searchStr) {
    results = cur.lastAdsIndex.search(searchStr);
    for (var i in results) {
      lastAdsIds[results[i][cur.lastAdsKeyMap.ad_id]] = true;
    }
  } else {
    isShowAll = true;
  }

  var lastAdsElemsAll = geByClass('ads_edit_last_ads_ad_wrap');
  var lastAdsElemsShowed = [];
  var elem;
  var adId;
  var row = 0;
  for (var i = 0, len = lastAdsElemsAll.length; i < len; i++) {
    elem = lastAdsElemsAll[i];
    adId = elem.id.replace('ads_edit_last_ads_ad_', '');
    if (isShowAll || lastAdsIds[adId]) {
      show(elem);
      if (!lastAdsElemsShowed[row]) {
        lastAdsElemsShowed[row] = [];
      }
      lastAdsElemsShowed[row].push(elem);
      if (lastAdsElemsShowed[row].length == 4) {
        row++;
      }
    } else {
      hide(elem);
    }
  }

  for (var row in lastAdsElemsShowed) {
    var maxHeight = 0;
    for (var i in lastAdsElemsShowed[row]) {
      elem = lastAdsElemsShowed[row][i];
      var adHeight = getSize(geByClass1('ads_ad_box', elem))[1];
      maxHeight = Math.max(maxHeight, adHeight);
    }
    for (var i in lastAdsElemsShowed[row]) {
      elem = lastAdsElemsShowed[row][i];
      setStyle(elem, 'minHeight', (maxHeight + 20) + 'px');
    }
  }

  if (isShowAll || results.length != 0) {
    hide('ads_edit_last_ads_no_result');
    show('ads_edit_last_ads_result');
  } else {
    hide('ads_edit_last_ads_result');
    var noResultElem = ge('ads_edit_last_ads_no_result');
    noResultElem.innerHTML = getLang('ads_edit_ad_choose_view_not_found').replace('{query}', Ads.escapeValue(searchStr));
    show(noResultElem);
  }
}

AdsEdit.applyLastAd = function(newAd) {
  cur.viewEditor.setFormatType(newAd[cur.lastAdsKeyMap.format_type]);
  cur.viewEditor.setLinkType(newAd[cur.lastAdsKeyMap.link_type]);
  if (intval(newAd[cur.lastAdsKeyMap.link_type]) == 7) {
    cur.viewEditor.setVideoData(newAd[cur.lastAdsKeyMap.link_id], newAd[cur.lastAdsKeyMap.link_owner_id], newAd[cur.lastAdsKeyMap.video_hash], newAd[cur.lastAdsKeyMap.video_preview_hash]);
  }
  cur.viewEditor.setTitle(AdsEdit.unescapeValueInit(newAd[cur.lastAdsKeyMap.title]));
  cur.viewEditor.setDescription(AdsEdit.unescapeValueInit(newAd[cur.lastAdsKeyMap.description]));
  if (newAd[cur.lastAdsKeyMap.photo_size]) {
    cur.viewEditor.setPhotoData(newAd[cur.lastAdsKeyMap.photo_size], newAd[cur.lastAdsKeyMap.photo]);
  }
  if (newAd[cur.lastAdsKeyMap.format_type] == 4) {
    cur.viewEditor.setLinkId(newAd[cur.lastAdsKeyMap.link_id]);
  }

  cur.lastAdsBox.hide();
}

AdsEdit.drawUploadGradientProgress = function(uploadBox, loadedCount, totalCount) {
  var uploaderElem     = geByClass1('ads_edit_upload_uploader', uploadBox.bodyNode);
  var progressElem     = geByClass1('ads_gradient_progress', uploadBox.bodyNode);
  var progressWrapElem = geByClass1('ads_edit_upload_progress_wrap2', uploadBox.bodyNode);

  if (!uploaderElem || !progressElem || !progressWrapElem) {
    debugLog('drawUploadGradientProgress: invalid box');
  }

  if (!isVisible(progressWrapElem)) {
    if (browser.msie) {
      setStyle(uploaderElem, {position: 'relative', left: '-5000px'});
    } else {
      setStyle(uploaderElem, {visibility: 'hidden'});
    }

    var uploaderHeight = getSize(uploaderElem)[1];
    var progressHeight = getSize(progressWrapElem)[1];
    var progressMargin = -intval((uploaderHeight + progressHeight) / 2);
    setStyle(progressWrapElem, {height: progressMargin, marginTop: progressMargin + 'px'});
    show(progressWrapElem);
  }

  var percent = intval(loadedCount / totalCount * 100);
  setStyle(progressElem, {width: percent + '%'});
}

AdsEdit.hideUploadGradientProgress = function(uploadBox) {
  var uploaderElem     = geByClass1('ads_edit_upload_uploader', uploadBox.bodyNode);
  var progressWrapElem = geByClass1('ads_edit_upload_progress_wrap2', uploadBox.bodyNode);
  hide(progressWrapElem);
  if (browser.msie) {
    setStyle(uploaderElem, {position: '', left: ''});
  } else {
    setStyle(uploaderElem, {visibility: ''});
  }
}

AdsEdit.showUploadPhotoBox = function() {

  var ajaxParams = {};
  ajaxParams.photo_size = cur.viewEditor.getPhotoSize();

  var showOptions = {params: {}};
  showOptions.stat = ['upload.js'];
  showOptions.params.width = 470;

  showBox('/adsedit?act=upload_photo_box', ajaxParams, showOptions);
}

AdsEdit.initUploadPhotoBox = function(uploadBox, uploadUrl, uploadVars, uploadOptions) {
  uploadBox.removeButtons();
  uploadBox.addButton(getLang('box_cancel'));

  var uploaderElem = geByClass1('ads_edit_upload_uploader', uploadBox.bodyNode);
  uploadOptions = extend({}, uploadOptions, {
    clear:            true, // Destroy on cur.destroy
    onUploadStart:    AdsEdit.onUploadPhotoStart.pbind(uploadBox),
    onUploadError:    AdsEdit.onUploadPhotoError.pbind(uploadBox),
    onUploadComplete: AdsEdit.onUploadPhotoComplete.pbind(uploadBox),
    onUploadProgress: function(i, bytesLoaded, bytesTotal) { AdsEdit.drawUploadGradientProgress(uploadBox, bytesLoaded, bytesTotal); }
  });
  Upload.init(uploaderElem, uploadUrl, uploadVars, uploadOptions);

  if (!cur.photoUploadDestroy) {
    cur.photoUploadDestroy = function() {
      if ('photoUploadIndex' in cur) {
        Upload.terminateUpload(cur.photoUploadIndex);
        delete cur.photoUploadIndex;
      }
    }
    cur.destroy.push(function() { cur.photoUploadDestroy(); });
  }

  var boxOptions = {};
  boxOptions.onShow = function() {
    uploadBox.hide(); // Fix upload.js fast box
  }
  boxOptions.onClean = function() {
    cur.photoUploadDestroy();
  }
  uploadBox.setOptions(boxOptions);
}

AdsEdit.onUploadPhotoStart = function(uploadBox, i, result) {

  cur.photoUploadIndex = i;

  if (Upload.types[i] === 'form') {
    uploadBox.showProgress();
  } else {
    AdsEdit.drawUploadGradientProgress(uploadBox, 0, 100);
  }
  hide('ads_edit_upload_photo_error');
}

AdsEdit.onUploadPhotoError = function(uploadBox, i, msg) {

  var errorElem = ge('ads_edit_upload_photo_error');
  if (errorElem) {
    if (msg) {
      errorElem.innerHTML = msg;
    } else {
      errorElem.innerHTML = getLang('ads_image_upload_error');
    }
    show(errorElem);
  }

  uploadBox.hideProgress();
  AdsEdit.hideUploadGradientProgress(uploadBox);

  Upload.embed(i);
}

AdsEdit.onUploadPhotoComplete = function(uploadBox, i, result) {

  if (Upload.types[i] !== 'form') {
    AdsEdit.drawUploadGradientProgress(uploadBox, 100, 100);
  }

  var photoData;
  try {
    photoData = eval('(' + result + ')');
  } catch (e) {
    photoData = q2ajx(result);
  }

  if (!photoData || !photoData.photo || photoData.code) {
    var message;
    message = getLang('ads_photo_notloaded');
    switch (intval(photoData.code)) {
      case 1: message += '<br>' + getLang('ads_photo_upload_error_1'); break;
      case 2: message += '<br>' + getLang('ads_photo_upload_error_2'); break;
      case 3: message += '<br>' + getLang('ads_photo_upload_error_3'); break;
      case 4: message += '<br>' + getLang('ads_photo_upload_error_4'); break;
      case 5: message += '<br>' + getLang('ads_photo_upload_error_3'); break;
      default:
        if (photoData.code !== undefined) {
          message += '<br>' + getLang('ads_err_code').replace('{code}', photoData.code);
        }
        break;
    }
    Upload.onUploadError(i, message);
    return;
  }

  delete cur.photoUploadIndex;
  uploadBox.hide();
  AdsEdit.showCropPhotoBox(photoData);
}

AdsEdit.showCropPhotoBox = function(photoData) {

  var successCrop = {success: false};

  var ajaxParams = {};
  ajaxParams.photo = photoData.photo;

  var viewParams = cur.viewEditor.getParams();
  ajaxParams.format_type           = viewParams.format_type;
  ajaxParams.title                 = viewParams.title;
  ajaxParams.description           = viewParams.description;
  ajaxParams.link_type             = viewParams.link_type;
  ajaxParams.link_domain           = viewParams.link_domain;
  ajaxParams.disclaimer_medical    = viewParams.disclaimer_medical;
  ajaxParams.disclaimer_specialist = viewParams.disclaimer_specialist;

  var showOptions = {params: {}};
  showOptions.stat = ['tagger.css', 'ads_tagger.js'];

  var photoWidth = intval(photoData.photo.match(/width:(\d+)/)[1]);
  if (photoWidth && photoWidth < 600) {
    showOptions.params.width = Math.max(photoWidth + 164, 410);
  } else {
    showOptions.params.width = 800;
  }

  showBox('/adsedit?act=crop_photo_box', ajaxParams, showOptions);
}

AdsEdit.initCropPhotoBox = function(cropBox, resultPhotoWidth, resultPhotoHeight, resultPhotoWidthSmall, resultPhotoHeightSmall, cropOptions) {
  cropBox.removeButtons();
  cropBox.addButton(getLang('box_cancel'), false, 'no');
  cropBox.addButton(getLang('box_save'), AdsEdit.saveCropPhoto.pbind(cropBox), 'yes');

  cur.photoTagger = adsPhotoTagger('ads_edit_crop_photo_big', {
    minw: resultPhotoWidth,
    minh: resultPhotoHeight,
    maxw: 10000,
    maxh: 10000,
    maxr: resultPhotoWidth / resultPhotoHeight,
    minr: resultPhotoWidth / resultPhotoHeight,
    defw: resultPhotoWidth,
    defh: resultPhotoHeight,
    icons: [
      {width: resultPhotoWidthSmall, height: resultPhotoHeightSmall, box: 'ads_edit_crop_photo_small'}
    ],
    zstart: 1000,
    crop: cropOptions,
    onInit: initPlayImage
  });

  if (!cur.photoTaggerDestroy) {
    cur.photoTaggerDestroy = function() {
      if (cur.photoTagger) {
        cur.photoTagger.destroy();
        delete cur.photoTagger;
      }
    }
    cur.destroy.push(function() { cur.photoTaggerDestroy(); });
  }

  function initPlayImage() {
    var wrapElem = ge('ads_edit_crop_photo_wrap');
    var playElem =  geByClass1('ads_ad_play', wrapElem);
    if (!isVisible(playElem)) {
      return;
    }
    var photoSmallElem    = ge('ads_edit_crop_photo_small')
    var photoSmallDivElem = ge('ads_edit_crop_photo_small')
    var photoSmallImgElem = geByTag1('img', photoSmallDivElem);
    addEvent(playElem, 'mousedown', function(event){
      var newEvent = {};
      newEvent.pageX = event.pageX;
      newEvent.pageY = event.pageY;
      triggerEvent(photoSmallImgElem, event.type, newEvent, true);
      return cancelEvent(event);
    });
  }

  var boxOptions = {};
  boxOptions.onClean = function() {
    cur.photoTaggerDestroy();
    Ads.unlock('saveCropPhoto');
    delete cur.cropBox;
  };
  cropBox.setOptions(boxOptions);
}

AdsEdit.saveCropPhoto = function(cropBox) {
  if (!Ads.lock('saveCropPhoto')) return;
  cropBox.showProgress();
  ge('ads_edit_crop_photo_crop').value = cur.photoTagger.result().join(',');

  cur.cropBox = cropBox;
  addEvent('ads_edit_crop_photo_frame', 'load', function() {
    Ads.unlock('saveCropPhoto');
    cropBox.hideProgress();
  });

  ge('ad_edit_crop_photo_form').submit();
}

AdsEdit.onSaveCropPhotoComplete = function(result) {

  var photoData = '';
  try {
    photoData = eval('(' + result + ')');
  } catch (e) {
  }

  if (!photoData || !photoData.photo) {
    var message = getLang('ads_photo_notloaded');
    message += ((photoData.errcode !== undefined) ? ('<br>' + getLang('ads_err_code').replace('{code}', photoData.errcode)) : '');
    var errorElem = ge('ads_edit_crop_photo_error');
    errorElem.innerHTML = message;
    show(errorElem);
    return;
  }

  var photoSize = ge('ads_edit_crop_photo_size').value;

  cur.viewEditor.setPhotoData(photoSize, photoData.photo);

  cur.cropBox.hide();
}

AdsEdit.showUploadVideoBox = function() {

  var ajaxParams = {};
  ajaxParams.hash = cur.uploadVideoBoxHash;

  var showOptions = {params: {}};
  showOptions.stat = ['upload.js'];

  var uploadVideoBox = showTabbedBox('/adsedit?act=upload_video_box', ajaxParams, showOptions);
}

AdsEdit.initUploadVideoBox = function(uploadVideoBox, uploadUrl, uploadVars, uploadOptions, updateAfterUploadHash) {

  uploadVideoBox.removeButtons();
  uploadVideoBox.addButton(getLang('box_cancel'));

  var uploaderElem = geByClass1('ads_edit_upload_uploader', uploadVideoBox.bodyNode);
  uploadOptions = extend({}, uploadOptions, {
    clear:            true, // Destroy on cur.destroy
    onUploadStart:    AdsEdit.onUploadVideoStart.pbind(uploadVideoBox),
    onUploadError:    AdsEdit.onUploadVideoError.pbind(uploadVideoBox),
    onUploadComplete: AdsEdit.onUploadVideoComplete.pbind(uploadVideoBox, uploadVars, uploadOptions, updateAfterUploadHash),
    onUploadProgress: function(i, bytesLoaded, bytesTotal) { AdsEdit.drawUploadGradientProgress(uploadVideoBox, bytesLoaded, bytesTotal); }
  });
  Upload.init(uploaderElem, uploadUrl, uploadVars, uploadOptions);

  if (!cur.videoUploadDestroy) {
    cur.videoUploadDestroy = function() {
      if ('videoUploadIndex' in cur) {
        Upload.terminateUpload(cur.videoUploadIndex);
        delete cur.videoUploadIndex;
      }
    }
    cur.destroy.push(function() { cur.videoUploadDestroy(); });
  }

  window.onParseDone = AdsEdit.onParseVideoComplete.pbind(uploadVideoBox, uploadVars, updateAfterUploadHash);
  window.onParseFail = AdsEdit.onParseVideoComplete.pbind(uploadVideoBox, uploadVars, updateAfterUploadHash);

  var externalVideoLinkElem    = ge('ads_edit_upload_video_external_link');
  var interestingEvents        = 'keydown keyup keypress change paste cut drop input blur';
  var externalVideoLinkHandler = function() { AdsEdit.parseVideoExternal(); };
  addEvent(externalVideoLinkElem, interestingEvents, externalVideoLinkHandler);
  cur.destroy.push(function() { removeEvent(externalVideoLinkElem, interestingEvents, externalVideoLinkHandler); });

  var boxOptions = {};
  boxOptions.onShow = function() {
    uploadVideoBox.hide(); // Fix upload.js fast box
  }
  boxOptions.onClean = function() {
    cur.videoUploadDestroy();
  }
  uploadVideoBox.setOptions(boxOptions);

  cur.uploadVideoBox = uploadVideoBox;

  delete cur.lastExternalVideoLink;
}

AdsEdit.switchUploadVideoBox = function(isExternal) {
  var boxElem       = ge('ads_edit_upload_video_box');
  var uploadElems   = geByClass('ads_edit_upload_video_only_upload', boxElem);
  var externalElems = geByClass('ads_edit_upload_video_only_external', boxElem);

  if (isExternal) {
    each(externalElems, function(k, v) { show(v); });
    each(uploadElems,   function(k, v) { hide(v); });
  } else {
    each(uploadElems,   function(k, v) { show(v); });
    each(externalElems, function(k, v) { hide(v); });
  }
}

AdsEdit.onUploadVideoStart = function(uploadVideoBox, i, result) {

  cur.videoUploadIndex = i;

  if (Upload.types[i] === 'form') {
    uploadVideoBox.showProgress();
  } else {
    AdsEdit.drawUploadGradientProgress(uploadVideoBox, 0, 100);
  }
  hide('ads_edit_upload_video_error');
  show('ads_edit_upload_video_info');
}

AdsEdit.onUploadVideoError = function(uploadVideoBox, i, msg) {

  var errorElem = ge('ads_edit_upload_video_error');
  if (errorElem) {
    if (msg) {
      errorElem.innerHTML = msg;
    } else {
      errorElem.innerHTML = getLang('video_external_server_error');
    }
    show(errorElem);
  }

  hide('ads_edit_upload_video_info');
  uploadVideoBox.hideProgress();
  AdsEdit.hideUploadGradientProgress(uploadVideoBox);

  Upload.embed(i);
}

AdsEdit.onUploadVideoComplete = function(uploadVideoBox, uploadVars, uploadOptions, updateAfterUploadHash, i, result) {

  if (Upload.types[i] !== 'form') {
    AdsEdit.drawUploadGradientProgress(uploadVideoBox, 100, 100);
  }

  // To prevent click upload during ajax request
  if (Upload.types[i] === 'form' || Upload.types[i] === 'fileApi') {
    var uploaderElem = geByClass1('ads_edit_upload_uploader', uploadVideoBox.bodyNode)
    var fileElem = geByClass1('file', uploaderElem);
    fileElem.disabled = true;
  }

  var videoData;
  try {
    videoData = eval('(' + result + ')');
  } catch (e) {
    videoData = q2ajx(result);
  }

  if (!videoData || videoData.code || videoData.error) {
    var message = videoData && (videoData.code ? videoData.code : videoData.error);
    Upload.onUploadError(i, message);
    return;
  }

  delete cur.videoUploadIndex;

  AdsEdit.updateUploadedVideo(uploadVideoBox, updateAfterUploadHash, uploadVars.oid, uploadVars.vid, uploadOptions.server);
}

AdsEdit.parseVideoExternal = function(delayed) {
  if (!delayed) {
    clearTimeout(cur.parseVideoExternalTimeout);
    cur.parseVideoExternalTimeout = setTimeout(AdsEdit.parseVideoExternal.pbind(true), 300);
    return;
  }

  var externalVideoLinkElem = ge('ads_edit_upload_video_external_link');
  if (!externalVideoLinkElem) {
    return;
  }
  var externalVideoLink = trim(externalVideoLinkElem.value);
  if (!externalVideoLink.match(/^(http:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i)) {
    show('ads_edit_upload_video_external_error');
    return;
  }
  if (externalVideoLink == cur.lastExternalVideoLink) {
    return;
  }
  hide('ads_edit_upload_video_external_error');
  if (!externalVideoLink) {
    return;
  }
  cur.lastExternalVideoLink = externalVideoLink;

  cur.uploadVideoBox.showProgress();
  ge('ads_edit_upload_video_external_form').submit();
}

AdsEdit.onParseVideoComplete = function(uploadVideoBox, uploadVars, updateAfterUploadHash, result) {

  var isNormalResult = (isObject(result) && result.url && result.extra && result.extraData && result.images && result.images.length);

  if (!isNormalResult) {
    uploadVideoBox.hideProgress();
    show('ads_edit_upload_video_external_error');
    return;
  }

  var imagesContext = {}
  imagesContext.images = result.images;
  imagesContext.imageIndex = -1;

  window.onUploadDone = AdsEdit.onUploadVideoPhotoComplete.pbind(uploadVideoBox, uploadVars, updateAfterUploadHash, result.extra, result.extraData, imagesContext);
  window.onUploadFail = AdsEdit.onUploadVideoPhotoComplete.pbind(uploadVideoBox, uploadVars, updateAfterUploadHash, result.extra, result.extraData, imagesContext);

  ge('ads_edit_upload_video_external_photo_url').value   = result.url;
  ge('ads_edit_upload_video_external_photo_extra').value = result.extra;

  AdsEdit.uploadVideoPhotoImages(imagesContext);
}

AdsEdit.uploadVideoPhotoImages = function(imagesContext) {

  imagesContext.imageIndex++;

  if (imagesContext.imageIndex >= imagesContext.images.length) {
    uploadVideoBox.hideProgress();
    show('ads_edit_upload_video_external_error');
    return;
  }

  ge('ads_edit_upload_video_external_photo_image').value = imagesContext.images[imagesContext.imageIndex];
  ge('ads_edit_upload_video_external_photo_form').submit();
}

AdsEdit.onUploadVideoPhotoComplete = function(uploadVideoBox, uploadVars, updateAfterUploadHash, extra, extraData, imagesContext, nothing, result) {

  var isNormalResult = (isObject(result) && result.user_id && result.photo_id);

  if (!isNormalResult) {
    AdsEdit.uploadVideoPhotoImages(imagesContext);
    return;
  }

  AdsEdit.updateUploadedVideo(uploadVideoBox, updateAfterUploadHash, uploadVars.oid, uploadVars.vid, 0, extra, extraData, result.user_id, result.photo_id);
}

AdsEdit.updateUploadedVideo = function(uploadVideoBox, updateAfterUploadHash, videoOwnerId, videoId, videoServer, videoExtra, videoExtraData, videoPhotoOwnerId, videoPhotoId) {

  uploadVideoBox.showProgress();

  var ajaxParams            = {};
  ajaxParams.owner_id       = videoOwnerId;
  ajaxParams.video_id       = videoId;
  ajaxParams.server         = videoServer;
  ajaxParams.extra          = videoExtra;
  ajaxParams.extra_data     = videoExtraData;
  ajaxParams.photo_owner_id = videoPhotoOwnerId;
  ajaxParams.photo_id       = videoPhotoId
  ajaxParams.hash           = updateAfterUploadHash;
  ajax.post('/adsedit?act=upload_video_update', ajaxParams, {onDone: onDone, onFail: onFail});

  function onDone(ajaxResult, videoHash, videoPreviewHash) {
    if (ajaxResult === 'ok' && videoHash && videoPreviewHash) {
      uploadVideoBox.hide();
      showFastBox({title: getLang('ads_edit_ad_upload_done_title')}, getLang('ads_video_upload_done'));
      cur.viewEditor.setVideoData(videoId, videoOwnerId, videoHash, videoPreviewHash);
    } else {
      onFail();
    }
  }
  function onFail() {
    uploadVideoBox.hide();
    showFastBox({title: getLang('global_error')}, getLang('ads_error_unexpected_error_try_later'));
    return true;
  }
}

//
// AdsEditor
//

function AdsEditor() {}
AdsEditor.prototype.init = function(viewEditor, targetingEditor) {

  this.updateDataTimeout = null;
  this.updateDataCounter = 0;

  this.lastViewData      = {};
  this.lastTargetingData = {};

  this.viewEditor = viewEditor;
  this.viewEditor.setUpdateDataHandler(this.getUpdatedDataView.bind(this));

  this.targetingEditor = targetingEditor;
  this.targetingEditor.setUpdateDataHandler(this.getUpdatedDataTargeting.bind(this));
}

AdsEditor.prototype.destroy = function() {
  clearTimeout(this.updateDataTimer);
}

AdsEditor.prototype.getUpdatedData = function(force, delayed) {

  if (isEmpty(this.lastViewData)) {
    this.viewEditor.needDataUpdate();
  }
  if (isEmpty(this.lastTargetingData)) {
    this.targetingEditor.needDataUpdate();
  }

  if (!delayed) {
    clearTimeout(this.updateDataTimer);
    var timeout = ((force == 2) ? 100 : (force ? 10 : 500));
    this.updateDataTimeout = ((this.updateDataTimeout === null) ? timeout : Math.min(timeout, this.updateDataTimeout));
    this.updateDataTimer = setTimeout(function() {
      this.getUpdatedData(false, true);
    }.bind(this), this.updateDataTimeout);
    return;
  }
  this.updateDataTimeout = null;

  this.updateDataCounter++ || show('ads_edit_audience_progress');

  var lastData = {};
  lastData = extend({}, lastData, this.lastViewData);
  lastData = extend({}, lastData, this.lastTargetingData);

  this.lastViewData      = {};
  this.lastTargetingData = {};

  var ajaxParams = {};
  ajaxParams = extend({}, ajaxParams, lastData);

  ajax.post('/adsedit?act=get_target_params', ajaxParams, {onDone: onDone.bind(this), onFail: onFail.bind(this)});

  function onDone(result) {
    --this.updateDataCounter || hide('ads_edit_audience_progress');
    this.viewEditor.setUpdateData(lastData, result);
    this.targetingEditor.setUpdateData(lastData, result);
  }
  function onFail() {
    --this.updateDataCounter || hide('ads_edit_audience_progress');
    var failResult = true;
    var setResult;
    setResult = this.viewEditor.setUpdateData(lastData, false);
    failResult = (failResult && setResult);
    setResult = this.targetingEditor.setUpdateData(lastData, false);
    failResult = (failResult && setResult);
    return failResult;
  }
}

AdsEditor.prototype.getUpdatedDataView = function(data, force) {
  this.lastViewData = extend({}, this.lastViewData, data);
  this.getUpdatedData(force ? 1 : 0);
}

AdsEditor.prototype.getUpdatedDataTargeting = function(data, force) {
  this.lastTargetingData = extend({}, this.lastTargetingData, data);
  this.getUpdatedData(force ? 2 : 0);
}

//
// AdsViewEditor
//

function AdsViewEditor() {}
AdsViewEditor.prototype.init = function(options, targetingEditor, params, paramsData, paramsParams) {

  this.targetingEditor = targetingEditor;

  this.options = {
    targetIdPrefix: 'ads_param_',
    uiWidth: 320 + 8
  };

  this.options = extend({}, this.options, options);

  this.params = {
    ad_id:                 {value: 0},
    format_type:           {value: 0, allow_exclusive_ads: false, allow_promotion_community: false},
    cost_type:             {value: 0},
    link_type:             {value: 0,  data: [], data_all: [], data_text_image: [], data_promotion_community: []},
    link_id:               {value: '', data: [], video_value: '', app_admin_links_ids: {}, app_game_links_ids: {}},
    link_owner_id:         {value: '',           video_value: ''},
    link_url:              {value: '', last_blur: true, video_value: '', video_preview_hash: ''},
    link_url_vk:           {value: 0,  link_type_value: 0, link_id_value: 0},
    link_domain:           {value: '', link_url: '', delayed_error: ''},
    link_domain_confirm:   {value: 0},
    title:                 {value: '', value_escaped: '', value_max: '', update_value_max: true},
    description:           {value: '', value_escaped: '', edited: false},
    category1_id:          {value: 0, data: []},
    subcategory1_id:       {value: 0, data: []},
    category2_id:          {value: 0, data: []},
    subcategory2_id:       {value: 0, data: []},
    stats_url:             {value: ''},
    disclaimer_medical:    {value: 0},
    disclaimer_specialist: {value: 0},
    photo:                 {value: '', value_s: '', value_m: '', value_b: '', value_p: ''},
    photo_link:            {value: '', value_s: '', value_m: '', value_b: '', value_p: '', value_default_s: '', value_default_m: '', value_empty_m: '', value_default_b: '', value_empty_b: ''},
    video_hash:            {value: ''},
    cost_per_click:        {value: '', edited: false, last_value: ''},
    views_places:          {value: 0, data: [], value_normal: 0, value_disabled: 0},
    views_limit_flag:      {value: 0},
    views_limit_exact:     {value: 0, data: []},
    client_id:             {value: 0},
    campaign_type:         {value: 0, allow_special_app: false},
    campaign_id:           {value: 0, data: [], value_normal: 0, value_app: 0},
    campaign_name:         {value: '',          value_normal: ''}
  }

  this.updateNeeded = {};

  this.preview = {};

  if (params) for (var i in params) {
    if (params[i] && (i in this.params)) {
      var newParamValue = params[i];
      if (typeof(this.params[i].value) === 'number') {
        newParamValue = intval(newParamValue);
      }
      if ('value_escaped' in this.params[i]) {
        newParamValue = AdsEdit.unescapeValueInit(newParamValue);
        this.params[i].value_escaped = AdsEdit.escapeValue(newParamValue);
      }
      if ('value_normal' in this.params[i]) {
        this.params[i].value_normal = newParamValue;
      }
      this.params[i].value = newParamValue;
    }
  }

  if (paramsData) for (var i in paramsData) {
    if (paramsData[i] && (i in this.params) && ('data' in this.params[i])) {
      this.params[i].data = paramsData[i];
    }
  }

  if (paramsParams) for (var i in paramsParams) {
    if (paramsParams[i] && (i in this.params)) {
      this.params[i] = extend({}, this.params[i], paramsParams[i]);
    }
  }

  this.interestingEvents = 'keydown keyup keypress change paste cut drop input blur';

  this.cur = {destroy: []};

  this.initPreview();
  this.initHelp();
  this.initUi();
}

AdsViewEditor.prototype.destroy = function() {
  if (this.updateLinkDomainContext) {
    clearTimeout(this.updateLinkDomainContext.timeout);
    this.updateLinkDomainContext.stop = true;
  }

  processDestroy(this.cur);
}

AdsViewEditor.prototype.initPreview = function(paramName) {
  var previewPanel = geByClass1('ads_edit_panel_preview');
  this.preview.link                  = geByClass1('ads_ad_box2', previewPanel);
  this.preview.title                 = geByClass1('ads_ad_title', previewPanel);
  this.preview.description           = geByClass1('ads_ad_description', previewPanel);
  this.preview.community_join        = geByClass1('ads_ad_community_join', previewPanel);
  this.preview.disclaimer_medical    = geByClass1('ads_ad_disclaimer_medical', previewPanel);
  this.preview.disclaimer_specialist = geByClass1('ads_ad_disclaimer_specialist', previewPanel);
  this.preview.domain                = geByClass1('ads_ad_domain', previewPanel);
  this.preview.photo_box             = geByClass1('ads_ad_photo_box', previewPanel);
  this.preview.photo                 = geByTag1('img', previewPanel);
  this.preview.play                  = geByClass1('ads_ad_play', previewPanel);
}

AdsViewEditor.prototype.initHelp = function() {
  for (var paramName in this.params) {
    this.initHelpParam(paramName);
  }
}

AdsViewEditor.prototype.initHelpParam = function(paramName) {
  if (!cur.adParamsHelp) {
    return;
  }
  var helpText = cur.adParamsHelp[paramName];
  if (!helpText) {
    return;
  }

  var targetElem;
  var handler;
  var context = {focus: false, over: 0, out: 2};
  var shiftLeft;
  var shiftTop;

  switch (paramName) {
    case 'format_type':      shiftTop = -55; shiftLeft = -210; break;
    case 'category1_id':     shiftTop = -44; break;
    case 'views_limit_flag': shiftTop = -32; break;
  }

  switch (paramName) {
    case 'format_type':
      targetElem = ge('ads_param_format_type_exclusive_wrap');
      var showTooltip = function() { AdsEdit.showHelpCriterionTooltip(paramName, targetElem, handler, this.params[paramName], helpText, shiftLeft, shiftTop, this.cur); }.bind(this);
      var hideTooltip = function() { AdsEdit.hideHelpTooltip(this.params[paramName].tt); }.bind(this);
      handler = function(event){ AdsEdit.onHelpTooltipEvent(event, paramName, context, showTooltip, hideTooltip); }.bind(this);
      AdsEdit.initHelpTooltipTarget(targetElem, handler, this.cur);
      break;
    case 'category1_id':
      targetElem = ge(this.options.targetIdPrefix + 'category1_id').parentNode;
      var showTooltip = function() { AdsEdit.showHelpCriterionTooltip(paramName, targetElem, handler, this.params[paramName], helpText, shiftLeft, shiftTop, this.cur); }.bind(this);
      var hideTooltip = function() { AdsEdit.hideHelpTooltip(this.params[paramName].tt); }.bind(this);
      handler = function(event){ AdsEdit.onHelpTooltipEvent(event, paramName, context, showTooltip, hideTooltip); }.bind(this);
      AdsEdit.initHelpTooltipTarget(targetElem, handler, this.cur);
      break;
    case 'views_places':
    case 'views_limit_flag':
      targetElem = ge(this.options.targetIdPrefix + paramName).parentNode;
      var showTooltip = function() { AdsEdit.showHelpCriterionTooltip(paramName, targetElem, handler, this.params[paramName], helpText, shiftLeft, shiftTop, this.cur); }.bind(this);
      var hideTooltip = function() { AdsEdit.hideHelpTooltip(this.params[paramName].tt); }.bind(this);
      handler = function(event){ AdsEdit.onHelpTooltipEvent(event, paramName, context, showTooltip, hideTooltip); }.bind(this);
      AdsEdit.initHelpTooltipTarget(targetElem, handler, this.cur);
      break;
  }
}

AdsViewEditor.prototype.initUi = function() {
  for (var paramName in this.params) {
    this.initUiParam(paramName);
  }
}

AdsViewEditor.prototype.initUiParam = function(paramName) {

  //debugLog('View: Try init UI ' + paramName);

 if (this.params[paramName].uiInited || this.params[paramName].uiInited === false) {
    return;
  }

  if (this.params[paramName].hidden) {
    return;
  }

  var targetElem;

  this.params[paramName].uiInited = false;

  switch (paramName) {
    case 'format_type':
      targetElem = ge(this.options.targetIdPrefix + 'format_type_text_image');
      this.params[paramName].ui_text_image = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('ads_edit_ad_format_type_text_and_image'),
        onSelect: function(value) { this.onUiSelect(paramName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui_text_image.destroy(); }.bind(this));

      targetElem = ge(this.options.targetIdPrefix + 'format_type_big_image');
      this.params[paramName].ui_big_image = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('ads_edit_ad_format_type_big_image'),
        onSelect: function(value) { this.onUiSelect(paramName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui_big_image.destroy(); }.bind(this));

      if (this.params[paramName].allow_exclusive_ads) {
        targetElem = ge(this.options.targetIdPrefix + 'format_type_exclusive');
        this.params[paramName].ui_exclusive = new Radiobutton(targetElem, {
          width:    this.options.uiWidth,
          label:    getLang('ads_edit_ad_format_type_exclusive'),
          onSelect: function(value) { this.onUiSelect(paramName, value) }.bind(this)
        });
        this.cur.destroy.push(function(){ this.params[paramName].ui_exclusive.destroy(); }.bind(this));
      }

      if (this.params[paramName].allow_promotion_community) {
        targetElem = ge(this.options.targetIdPrefix + 'format_type_promotion_community');
        this.params[paramName].ui_promotion_community = new Radiobutton(targetElem, {
          width:    this.options.uiWidth,
          label:    getLang('ads_edit_ad_format_type_promotion_community'),
          onSelect: function(value) { this.onUiSelect(paramName, value) }.bind(this)
        });
        this.cur.destroy.push(function(){ this.params[paramName].ui_promotion_community.destroy(); }.bind(this));
      }

      Radiobutton.select(this.options.targetIdPrefix + paramName, this.params[paramName].value);
      break;
    case 'cost_type':
      targetElem = ge(this.options.targetIdPrefix + 'cost_type_clicks');
      this.params[paramName].ui_clicks = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('ads_edit_ad_cost_type_per_click'),
        onSelect: function(value) { this.onUiSelect(paramName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui_clicks.destroy(); }.bind(this));

      targetElem = ge(this.options.targetIdPrefix + 'cost_type_views');
      this.params[paramName].ui_views = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('ads_edit_ad_cost_type_per_views'),
        onSelect: function(value) { this.onUiSelect(paramName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui_views.destroy(); }.bind(this));

      Radiobutton.select(this.options.targetIdPrefix + paramName, this.params[paramName].value);
      break;
    case 'link_type':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      targetElem.removeAttribute('autocomplete');
      this.params[paramName].ui = new Dropdown(targetElem, this.getUiParamData(paramName), {
        selectedItem: this.params[paramName].value,
        big:          true,
        width:        this.options.uiWidth,
        onChange:     function(value) { this.onUiChange(paramName, value); }.bind(this)
      });
      if (this.params[paramName].disabled) {
        this.params[paramName].ui.disable(true);
      }
      this.cur.destroy.push(function(){ this.params[paramName].ui.destroy(); }.bind(this));
      break;
    case 'link_id':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      targetElem.removeAttribute('autocomplete');
      this.params[paramName].ui = new Dropdown(targetElem, this.getUiParamData(paramName), {
        selectedItem: this.params[paramName].value,

        introText:    this.getUiParamPlaceholderText(paramName),
        placeholder:  this.getUiParamPlaceholderText(paramName),
        noResult:     this.getUiParamNoResultText(paramName),

        autocomplete: true,
        big:          true,
        width:        this.options.uiWidth,

        onChange:     function(value) { this.onUiChange(paramName, value); }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui.destroy(); }.bind(this));
      break;
    case 'link_url':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      placeholderSetup(targetElem, {back: true, big: true});
      addEvent(targetElem, this.interestingEvents, function(event) { return this.onUiEvent(paramName, event); }.bind(this));
      this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));
      break;
    case 'link_domain':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      placeholderSetup(targetElem, {back: true, big: true});
      addEvent(targetElem, this.interestingEvents, function(event) { return this.onUiEvent(paramName, event); }.bind(this));
      this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));
      break;
    case 'title':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      addEvent(targetElem, this.interestingEvents, function(event) { return this.onUiEvent(paramName, event); }.bind(this));
      this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));

      targetElem = ge(this.options.targetIdPrefix + 'title_reduce');
      addEvent(targetElem, 'click keypress', function(event) { return this.onUiEvent('title_reduce', event); }.bind(this));
      this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));
      break;
    case 'description':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      addEvent(targetElem, this.interestingEvents, function(event) { return this.onUiEvent(paramName, event); }.bind(this));
      this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));
      break;
    case 'category1_id':
    case 'category2_id':
    case 'subcategory1_id':
    case 'subcategory2_id':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      targetElem.removeAttribute('autocomplete');
      this.params[paramName].ui = new Dropdown(targetElem, this.getUiParamData(paramName), {
        selectedItem: this.params[paramName].value,
        disabledText: this.getUiParamDisabledText(paramName),
        big:          true,
        width:        this.options.uiWidth,
        onChange:     function(value) { this.onUiChange(paramName, value); }.bind(this)
      });
      if (this.getUiParamEnabled(paramName) === false) {
        this.params[paramName].ui.disable(true);
      }
      this.cur.destroy.push(function(){ this.params[paramName].ui.destroy(); }.bind(this));
      break;
    case 'stats_url':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      placeholderSetup(targetElem, {back: true, big: true});
      addEvent(targetElem, this.interestingEvents, function(event) { return this.onUiEvent(paramName, event); }.bind(this));
      this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));
      break;
    case 'disclaimer_medical':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      this.params[paramName].ui = new Checkbox(targetElem, {
        label:    this.params[paramName].label_checkbox,
        checked:  this.params[paramName].value,
        width:    this.options.uiWidth,
        onChange: function(state) { this.onUiChange(paramName, state); }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui.destroy(); }.bind(this));
      break;
    case 'disclaimer_specialist':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      this.params[paramName].ui = new Checkbox(targetElem, {
        label:    this.params[paramName].label_checkbox,
        checked:  this.params[paramName].value,
        width:    this.options.uiWidth,
        onChange: function(state) { this.onUiChange(paramName, state); }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui.destroy(); }.bind(this));
      break;
    case 'cost_per_click':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      addEvent(targetElem, this.interestingEvents, function(event) { return this.onUiEvent(paramName, event); }.bind(this));
      this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));
      break;
    case 'views_places':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      targetElem.removeAttribute('autocomplete');
      this.params[paramName].ui = new Dropdown(targetElem, this.getUiParamData(paramName), {
        selectedItem: this.params[paramName].value,
        big:          true,
        width:        this.options.uiWidth,
        onChange:     function(value) { this.onUiChange(paramName, value); }.bind(this)
      });
      if (this.params[paramName].disabled) {
        this.params[paramName].ui.disable(true);
      }
      this.cur.destroy.push(function(){ this.params[paramName].ui.destroy(); }.bind(this));
      break;
    case 'views_limit_flag':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      this.params[paramName].ui = new Checkbox(targetElem, {
        label:    this.params[paramName].label_checkbox,
        checked:  this.params[paramName].value,
        width:    this.options.uiWidth,
        onChange: function(state) { this.onUiChange(paramName, state); }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui.destroy(); }.bind(this));
      break;
    case 'views_limit_exact':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      targetElem.removeAttribute('autocomplete');
      this.params[paramName].ui = new Dropdown(targetElem, this.getUiParamData(paramName), {
        selectedItem: this.params[paramName].value,
        big:          true,
        width:        this.options.uiWidth,
        onChange:     function(value) { this.onUiChange(paramName, value); }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui.destroy(); }.bind(this));
      break;
    case 'campaign_type':
      targetElem = ge(this.options.targetIdPrefix + 'campaign_type_select');
      this.params[paramName].ui_select = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('ads_edit_ad_campaign_type_select'),
        onSelect: function(value) { this.onUiSelect(paramName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui_select.destroy(); }.bind(this));

      targetElem = ge(this.options.targetIdPrefix + 'campaign_type_input');
      this.params[paramName].ui_input = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('ads_edit_ad_campaign_type_new'),
        onSelect: function(value) { this.onUiSelect(paramName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui_input.destroy(); }.bind(this));

      targetElem = ge(this.options.targetIdPrefix + 'campaign_type_app');
      this.params[paramName].ui_app = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('ads_edit_ad_campaign_type_app_discount'),
        onSelect: function(value) { this.onUiSelect(paramName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui_app.destroy(); }.bind(this));

      Radiobutton.select(this.options.targetIdPrefix + paramName, this.params[paramName].value);
      break;
    case 'campaign_id':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      targetElem.removeAttribute('autocomplete');
      this.params[paramName].ui = new Dropdown(targetElem, this.getUiParamData(paramName), {
        selectedItem: this.params[paramName].value,
        big:          true,
        width:        this.options.uiWidth,
        onChange:     function(value) { this.onUiChange(paramName, value); }.bind(this)
      });
      this.cur.destroy.push(function(){ this.params[paramName].ui.destroy(); }.bind(this));
      break;
    case 'campaign_name':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      placeholderSetup(targetElem, {back: true, big: true});
      addEvent(targetElem, this.interestingEvents, function(event) { return this.onUiEvent(paramName, event); }.bind(this));
      this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));
      break;
  }

  switch (paramName) {
    case 'category1_id':
      var targetElem = ge('ads_param_category_more');
      addEvent(targetElem, 'click', function() { this.showMoreCategories(); return false; }.bind(this));
      this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));
      break;
  }

  this.params[paramName].uiInited = true;
  //debugLog('view: ' + paramName + ' UI inited');
}

AdsViewEditor.prototype.updateUiParam = function(paramName) {
  var targetElem;

  switch (paramName) {
    case 'link_type':
      this.initUiParam(paramName);
      if (this.params[paramName].uiInited) {
        this.params[paramName].ui.selectItem(this.params[paramName].value);
      }
      break;
    case 'link_id':
      this.initUiParam(paramName);
      if (this.params[paramName].uiInited) {
        this.params[paramName].ui.selectItem(this.params[paramName].value);
      }
      break;
    case 'link_domain':
      this.initUiParam(paramName);
      if (this.params[paramName].uiInited) {
        targetElem = ge(this.options.targetIdPrefix + paramName);
        targetElem.setValue(this.params[paramName].value);
        if (this.params[paramName].disabled) {
          addClass(targetElem, 'disabled');
          targetElem.disabled = true;
          targetElem.readOnly = true;
        } else {
          removeClass(targetElem, 'disabled');
          targetElem.disabled = false;
          targetElem.readOnly = false;
        }
      }
      break;
    case 'title':
      targetElem = ge(this.options.targetIdPrefix + paramName);
      if (this.params[paramName].disabled) {
        addClass(targetElem, 'disabled');
        targetElem.disabled = true;
        targetElem.readOnly = true;
      } else {
        removeClass(targetElem, 'disabled');
        targetElem.disabled = false;
        targetElem.readOnly = false;
      }
      break;
    case 'category1_id':
      var value   = (this.params.link_id.app_game_links_ids[this.params.link_id.value] ? 125 : 0);
      var enabled = (value === 0);
      this.params[paramName].ui.selectItem(value, true); // true - fire event
      this.params[paramName].ui.disable(!enabled);
      break;
    case 'cost_per_click':
      var labelElem = geByClass1('ads_edit_label_cost_per_click', ge('ads_edit_ad_row_' + paramName));
      if (this.params.cost_type.value == 0) {
        labelElem.innerHTML = getLang('ads_edit_ad_cost_per_click_label');
      } else {
        labelElem.innerHTML = getLang('ads_edit_ad_cost_per_views_label');
      }

      var isAppCampaign = (this.params.campaign_type.value == 2 || (this.params.campaign_id.value_app && this.params.campaign_id.value == this.params.campaign_id.value_app));
      var isAppAdminLink = (this.params.link_type.value == 4 && this.params.link_id.app_admin_links_ids[this.params.link_id.value]);
      var isApp = (isAppCampaign && isAppAdminLink);

      var suffixesAll = '';
      suffixesAll    += ((this.params.cost_type.value == 0) ? '_click' : '_views');
      suffixesAll    += ((this.params.format_type.value == 3) ? '_exclusive' : '');
      suffixesAll    += (isApp ? '_app' : '');

      var costPerClickValue            = 'value' + suffixesAll;
      var costPerClickRecommendedShort = 'recommended' + suffixesAll + '_short';
      var costPerClickRecommendedLong  = 'recommended' + suffixesAll + '_long';

      if (!this.params[paramName].edited || costPerClickValue !== this.params[paramName].last_value) {
        this.params[paramName].last_value = costPerClickValue;
        this.params[paramName].value      = this.params[paramName][costPerClickValue];
        var targetElem                    = ge(this.options.targetIdPrefix + paramName);
        targetElem.value                  = this.params[paramName].value;
      }

      var currencyElem = ge(this.options.targetIdPrefix + paramName + '_currency');
      currencyElem.innerHTML = getLang('global_money_amount_rub_text', this.params[paramName].value);

      var recommendedShortElem = ge('ads_edit_recommended_cost_text');
      var recommendedLongElem  = ge('ads_param_cost_per_click_recommended');
      recommendedShortElem.innerHTML = this.params[paramName][costPerClickRecommendedShort];
      recommendedLongElem.innerHTML  = this.params[paramName][costPerClickRecommendedLong];
      break;
    case 'views_places':
      this.params[paramName].disabled = (this.params.campaign_type.value == 2 || this.params.campaign_type.value == 0 && this.params.campaign_id.value_app && this.params.campaign_id.value == this.params.campaign_id.value_app || this.params.format_type.value != 1 || this.params.cost_type.value != 0 || this.params.link_type.value == 7 || this.params.disclaimer_medical.value || this.params.disclaimer_specialist.value);
      this.params[paramName].value    = (this.params.views_places.disabled ? this.params.views_places.value_disabled : this.params.views_places.value_normal);

      this.initUiParam(paramName);
      if (this.params[paramName].uiInited) {
        this.params[paramName].ui.selectItem(this.params[paramName].value);
        this.params[paramName].ui.disable(this.params[paramName].disabled);
      }
      break;
    case 'views_limit_flag':
    case 'views_limit_exact':
      var rowElem = ge('ads_edit_ad_row_views_limit');
      targetElem = geByClass1('ads_edit_label_input_ui', rowElem) || geByClass1('ads_edit_label_checkbox', rowElem);
      removeClass(targetElem, 'ads_edit_label_input_ui');
      removeClass(targetElem, 'ads_edit_label_checkbox');
      if (this.params.views_limit_exact.hidden) {
        addClass(targetElem, 'ads_edit_label_checkbox');
      } else {
        addClass(targetElem, 'ads_edit_label_input_ui');
      }
      break;
    case 'campaign_id':
      this.initUiParam(paramName);
      if (this.params[paramName].uiInited) {
        this.params[paramName].ui.selectItem(this.params[paramName].value);
        this.params[paramName].ui.disable(this.params[paramName].disabled);
      }
      break;
    case 'campaign_name':
      this.initUiParam(paramName);
      if (this.params[paramName].uiInited) {
        targetElem = ge(this.options.targetIdPrefix + paramName);
        targetElem.setValue(this.params[paramName].value);
        if (this.params[paramName].disabled) {
          addClass(targetElem, 'disabled');
          targetElem.disabled = true;
          targetElem.readOnly = true;
        } else {
          removeClass(targetElem, 'disabled');
          targetElem.disabled = false;
          targetElem.readOnly = false;
        }
      }
      break;
  }
}

AdsViewEditor.prototype.getUiParamData = function(paramName) {
  switch (paramName) {
    case 'link_type':
      switch (this.params.format_type.value) {
        case 1:  return this.params[paramName].data_text_image;
        case 4:  return this.params[paramName].data_promotion_community;
        default: return this.params[paramName].data_all;
      }
    case 'category1_id':
    case 'category2_id':
      return this.params.category1_id.data;
    case 'subcategory1_id':
      return this.params.category1_id.data_subcategories[this.params.category1_id.value] || [];
    case 'subcategory2_id':
      return this.params.category1_id.data_subcategories[this.params.category2_id.value] || [];
    default:
      return this.params[paramName].data || [];
  }
}

AdsViewEditor.prototype.updateUiParamData = function(paramName) {
  if (!('data' in this.params[paramName])) {
    try { console.error("Can't update data"); } catch (e) {}
    return;
  }

  if (!this.params[paramName].ui) {
    return;
  }

  var data = this.getUiParamData(paramName);
  if (!data.length) {
    this.params[paramName].ui.clear();
  }
  this.params[paramName].ui.setData(data);
  this.params[paramName].ui.setOptions({defaultItems: data});
  if (data.length && this.params[paramName].value) {
    this.params[paramName].ui.selectItem(this.params[paramName].value);
  }
}

AdsViewEditor.prototype.getUiParamEnabled = function(paramName) {
  switch (paramName) {
    case 'category1_id':
      return !!(this.params[paramName].value != 125 || !this.params.link_id.app_game_links_ids[this.params.link_id.value]);
    case 'subcategory1_id':
      var data = this.getUiParamData(paramName);
      return !!(data.length || this.params[paramName].value);
    case 'subcategory2_id':
      var data = this.getUiParamData(paramName);
      return !!(data.length || this.params[paramName].value);
    default:
      return null;
  }
}

AdsViewEditor.prototype.updateUiParamEnabled = function(paramName) {
  if (!('data' in this.params[paramName])) {
    try { console.error("Can't update enabled state"); } catch (e) {}
    return;
  }

  this.updateUiParamVisibility(paramName); // Should be before any ui.disable()

  if (this.params[paramName].ui) {
    var enabled = this.getUiParamEnabled(paramName);
    if (enabled !== null) {
      if (!this.params[paramName].value) {
        this.params[paramName].ui.disable(enabled); // Fix disabling introText
        this.params[paramName].ui.disable(!enabled);
        this.params[paramName].ui.clear(); // Fix placeholder
      }
    }
  }
}

AdsViewEditor.prototype.updateUiParamVisibility = function(paramName) {
  switch (paramName) {
    case 'format_type':
      var wrapElem = ge('ads_edit_ad_row_upload_photo');
      if (this.params.format_type.value == 4) {
        hide(wrapElem);
      } else {
        show(wrapElem);
      }
      break;
    case 'link_type':
      var wrapElem = ge('ads_edit_ad_row_upload_video');
      if (this.params.link_type.value == 7) {
        show(wrapElem);
      } else {
        hide(wrapElem);
      }
      break;
    case 'link_id':
      var wrapElem = ge(this.options.targetIdPrefix + paramName + '_wrap');
      if (this.params[paramName].hidden) {
        hide(wrapElem);
      } else {
        this.initUiParam(paramName);
        show(wrapElem);
      }
      break;
    case 'link_url':
      var wrapElem = ge(this.options.targetIdPrefix + paramName + '_wrap');
      if (this.params[paramName].hidden) {
        hide(wrapElem);
      } else {
        this.initUiParam(paramName);
        show(wrapElem);
      }
      break;
    case 'link_domain':
      var wrapElem = ge('ads_edit_ad_row_' + paramName);
      if (this.params[paramName].hidden) {
        hide(wrapElem);
      } else {
        this.initUiParam(paramName);
        show(wrapElem);
        if (this.params[paramName].delayed_error) {
          AdsEdit.showError(this.params[paramName].delayed_error);
          this.params[paramName].delayed_error = '';
        }
      }
      break;
    case 'title':
      var wrapElem = ge(this.options.targetIdPrefix + 'title_reduce');
      if (this.params[paramName].reduce_hidden) {
        hide(wrapElem);
      } else {
        show(wrapElem);
      }
      break;
    case 'description':
      var wrapElem = ge('ads_edit_ad_row_' + paramName);
      if (this.params[paramName].hidden) {
        hide(wrapElem);
      } else {
        this.initUiParam(paramName);
        show(wrapElem);
      }
      break;
    case 'stats_url':
      var wrapElem = ge('ads_edit_ad_row_' + paramName);
      if (this.params[paramName].hidden) {
        hide(wrapElem);
      } else {
        this.initUiParam(paramName);
        show(wrapElem);
      }
      break;
    case 'views_limit_flag':
    case 'views_limit_exact':
      var wrapElem = ge('ads_edit_ad_row_views_limit');
      if (this.params.views_limit_flag.hidden && this.params.views_limit_exact.hidden) {
        hide(wrapElem);
      } else {
        show(wrapElem);
      }
      var wrapElem = ge(this.options.targetIdPrefix + paramName + '_wrap');
      if (this.params[paramName].hidden) {
        hide(wrapElem);
      } else {
        this.initUiParam(paramName);
        show(wrapElem);
      }
      break;
    case 'campaign_id':
      var wrapElem = ge(this.options.targetIdPrefix + paramName + '_wrap');
      if (this.params[paramName].hidden) {
        hide(wrapElem);
      } else {
        this.initUiParam(paramName);
        show(wrapElem);
      }
      break;
    case 'campaign_name':
      var wrapElem = ge(this.options.targetIdPrefix + paramName + '_wrap');
      if (this.params[paramName].hidden) {
        hide(wrapElem);
      } else {
        this.initUiParam(paramName);
        show(wrapElem);
      }
      break;
  }
}

AdsViewEditor.prototype.getUiParamPlaceholderText = function(paramName) {
  switch (paramName) {
    case 'link_id':
      switch (this.params.link_type.value) {
        case 1: return getLang('ads_select_group_placeholder');
        case 2: return getLang('ads_select_event_placeholder');
        case 3: return getLang('ads_select_market_placeholder');
        case 4: return getLang('ads_select_app_placeholder');
        case 6: return getLang('ads_select_public_page_placeholder');
      }
      break;
    default:
      return '';
  }
}

AdsViewEditor.prototype.updateUiParamPlaceholderText = function(paramName) {
  if (!('data' in this.params[paramName])) {
    try { console.error("Can't update placeholder text"); } catch (e) {}
    return;
  }

  if (!this.params[paramName].ui) {
    return;
  }

  var placeholderText = this.getUiParamPlaceholderText(paramName);
  this.params[paramName].ui.setOptions({introText: placeholderText, placeholder: placeholderText});
  this.updateUiParamData(paramName); // Workaround to set introText and placeholder
}

AdsViewEditor.prototype.getUiParamNoResultText = function(paramName) {
  switch (paramName) {
    case 'link_id': return getLang('ads_notfound_link_object');
    default:        return '';
  }
}

AdsViewEditor.prototype.getUiParamDisabledText = function(paramName) {
  switch (paramName) {
    case 'subcategory1_id':
      if (this.params.category1_id.value) {
        return getLang('ads_no_subcategories');
      } else {
        return getLang('ads_first_select_category1');
      }
    case 'subcategory2_id':
      if (this.params.category2_id.value) {
        return getLang('ads_no_subcategories');
      } else {
        return getLang('ads_first_select_category2');
      }
    default:
      return '';
  }
}

AdsViewEditor.prototype.updateUiParamDisabledText = function(paramName) {
  if (!('data' in this.params[paramName])) {
    try { console.error("Can't update disabled text"); } catch (e) {}
    return;
  }

  if (!this.params[paramName].ui) {
    return;
  }

  var disabledText = this.getUiParamDisabledText(paramName);
  this.params[paramName].ui.setOptions({disabledText: disabledText});
}

AdsViewEditor.prototype.updateLinkDomain = function(onCompleteNoError) {

  var link = this.params.link_url.value;

  if (link == this.params.link_domain.link_url) {
    return true;
  }
  if (this.params.format_type.value == 4) {
    return true;
  }

  if (this.updateLinkDomainContext) {
    if (link == this.updateLinkDomainContext.linkUrl && (!onCompleteNoError || this.updateLinkDomainContext.onCompleteNoError) && (!this.updateLinkDomainContext.first || !this.params.link_url.last_blur)) {
      return false;
    }
    clearTimeout(this.updateLinkDomainContext.timeout);
    this.updateLinkDomainContext.stop = true;
    hide('ads_param_link_domain_progress');
  }
  this.updateLinkDomainContext = {};

  var linkInfo = this.getLinkInfo(link);
  if (!linkInfo || !linkInfo.domain) {
    return true;
  }

  if (linkInfo.domain.substr(-12) === 'vkontakte.ru' || linkInfo.domain.substr(-6) === 'vk.com') {
    return true;
  }

  this.updateLinkDomainContext.linkUrl           = this.params.link_url.value;
  this.updateLinkDomainContext.adId              = this.params.ad_id.value;
  this.updateLinkDomainContext.campaignId        = this.params.campaign_id.value;
  this.updateLinkDomainContext.triesLeft         = 30;
  this.updateLinkDomainContext.first             = true;
  this.updateLinkDomainContext.onCompleteNoError = onCompleteNoError;

  var waitTimeout = (this.params.link_url.last_blur ? 1 : 5000);

  this.updateLinkDomainContext.timeout = setTimeout(this.updateLinkDomainTry.bind(this, this.updateLinkDomainContext), waitTimeout);

  return false;
}

AdsViewEditor.prototype.updateLinkDomainTry = function(updateContext) {
  if (updateContext.stop) {
    return;
  }

  if (updateContext.first) {
    updateContext.first = false;
    show('ads_param_link_domain_progress');
  }

  if (updateContext.triesLeft > 0) {
    var isWait = false;

    var ajaxParams = {};
    ajaxParams.link_url    = updateContext.linkUrl;
    ajaxParams.ad_id       = updateContext.adId;
    ajaxParams.campaign_id = updateContext.campaignId;
    ajax.post('/adsedit?act=get_link_domain', ajaxParams, {onDone: onAjaxComplete.bind(this), onFail: onAjaxComplete.bind(this)});
  } else {
    onError.bind(this)(getLang('ads_error_url_unreachable'))
  }

  function onAjaxComplete(response) {
    if (updateContext.stop) {
      fullStop.bind(this)();
      return true;
    }
    if (response && response.error) {
      onError.bind(this)(response.error);
      return true;
    }
    if (isObject(response) && !response.wait && 'link_domain' in response) {
      if (updateContext.linkUrl == this.params.link_url.value) {
        this.params.link_domain.disabled = false;
        this.params.link_domain.link_url = updateContext.linkUrl;
        if (response.link_domain) {
          this.params.link_domain.value = response.link_domain;
        }
        this.updateUiParam('link_domain');
        this.updatePreview('link');
        this.updatePreview('domain');
        this.updateNeeded.need_link_object = true;
        this.onParamUpdate('link_domain', this.params.link_domain.value, true);
        hide('ads_param_link_domain_progress');
        if (isFunction(updateContext.onCompleteNoError)) {
          updateContext.onCompleteNoError();
        }
        if (this.params.link_domain.last_error_message === AdsEdit.getLastError()) {
          AdsEdit.hideErrors();
        }
      }
      fullStop.bind(this)();
      return true;
    }

    updateContext.triesLeft--;
    this.updateLinkDomainContext.timeout = setTimeout(this.updateLinkDomainTry.bind(this, updateContext), 1000);
    return true;
  }

  function onError(message) {
    if (updateContext.linkUrl == this.params.link_url.value) {
      this.params.link_domain.disabled = false;
      this.params.link_domain.link_url = updateContext.linkUrl;
      if (inArray(this.params.link_type.value, [5, 7])) {
        this.params.link_domain.last_error_message = message;
        AdsEdit.showError(message);
      } else {
        this.params.link_domain.delayed_error = message;
      }
      this.updateUiParam('link_domain');
      this.updatePreview('link');
      this.updatePreview('domain');
      hide('ads_param_link_domain_progress');
    }
    fullStop.bind(this)();
  }
  function fullStop() {
    if (updateContext.linkUrl == this.params.link_url.value && updateContext.linkUrl == this.updateLinkDomainContext.linkUrl) {
      this.updateLinkDomainContext = {};
    }
  }
}

AdsViewEditor.prototype.getPreviewDomain = function() {
  if (this.params.format_type.value == 4) {
    return this.params.link_domain.value;
  }

  switch (this.params.link_type.value) {
    case 1:  return getLang('global_ad_link_type_group');
    case 2:  return getLang('global_ad_link_type_event');
    case 3:  return getLang('global_ad_link_type_market');
    case 4:  return getLang('global_ad_link_type_app');
    case 6:  return getLang('global_ad_link_type_public');
    case 7:  return getLang('global_ad_link_type_video');
    case 5:
      var linkUrlInfo = this.getLinkInfo(this.params.link_url.value);
      if (!linkUrlInfo) {
        return '';
      }
      var linkDomain = linkUrlInfo.domain;
      if (!(linkDomain.substr(-12) === 'vkontakte.ru' || linkDomain.substr(-6) === 'vk.com')) {
        var linkDomainInfo = this.getLinkInfo(this.params.link_domain.value);
        if (!linkDomainInfo) {
          return '';
        }
        linkDomain = linkDomainInfo.domain;
      }
      if (!linkDomain) {
        return '';
      }
      if (linkDomain.substr(-12) === 'vkontakte.ru' || linkDomain.substr(-6) === 'vk.com') {
        return getLang('global_ad_link_type_local');
      }
      return linkDomain;
    default: return '';
  }
}

AdsViewEditor.prototype.updatePreview = function(previewParamName) {
  switch (previewParamName) {
    case 'link':
      var newLink = '';
      var newLinkUrl = '';
      var newlinkTarget = '_blank'
      var newOnclick = '';
      if (this.params.link_id.value) {
        switch (this.params.link_type.value) {
          case 1: newLinkUrl = '/club' + this.params.link_id.value + '?ad_id={ad_id}'; break;
          case 2: newLinkUrl = '/event' + this.params.link_id.value + '?ad_id={ad_id}'; break;
          case 3: newLinkUrl = '/market.php?act=view&id=' + this.params.link_id.value; break;
          case 4: newLinkUrl = '/app' + this.params.link_id.value + '?ad_id={ad_id}'; break;
          case 6: newLinkUrl = '/public' + this.params.link_id.value + '?ad_id={ad_id}'; break;
        }
      }
      if (inArray(this.params.link_type.value, [5, 7])) {
        newLinkUrl = this.params.link_url.value;
        if (newLinkUrl && !newLinkUrl.match(/^https?:\/\//)) {
          newLinkUrl = 'http://' + newLinkUrl;
        }
      }
      newLinkUrl = newLinkUrl.replace('{ad_id}', this.params.ad_id.value);
      newLinkUrl = newLinkUrl.replace('{campaign_id}', this.params.campaign_id.value);
      if (this.params.link_type.value != 7) {
        newLink = newLinkUrl;
      }
      if (this.params.link_type.value == 7 && this.params.link_id.value && this.params.link_owner_id.value && this.params.link_url.video_preview_hash) {
        var videoId = this.params.link_owner_id.value + '_' + this.params.link_id.value;
        var newLinkParam = '';
        newLinkParam += 'video=' + videoId;
        newLinkParam += '&hash=' + encodeURIComponent(this.params.link_url.video_preview_hash);
        if (newLinkUrl) {
          newLinkParam += '&link_url=' + encodeURIComponent(newLinkUrl);
        }
        if (this.params.link_domain.value) {
          newLinkParam += '&link_domain=' + encodeURIComponent(this.params.link_domain.value);
        }
        newLinkParam = encodeURIComponent(newLinkParam);

        newLink = this.params.link_url.video_value;
        newLink += '?ad_video=' + encodeURIComponent(newLinkParam);

        newlinkTarget = '_self';

        newOnclick = "return showVideo('', '', {autoplay: 1, ad_video: '" + newLinkParam + "'}, event);"
      }
      if (newLink) {
        this.preview[previewParamName].setAttribute('href', newLink);
      } else {
        this.preview[previewParamName].removeAttribute('href');
      }
      if (newOnclick) {
        this.preview[previewParamName].setAttribute('onclick', newOnclick);
      } else {
        this.preview[previewParamName].removeAttribute('onclick');
      }
      this.preview[previewParamName].setAttribute('target', newlinkTarget);
      break;
    case 'title':
      this.preview[previewParamName].innerHTML = this.params.title.value_escaped;
      break;
    case 'description':
      if (this.params.description.edited) {
        this.preview[previewParamName].innerHTML = this.params.description.value_escaped;
      }
      var photoSize = this.getPhotoSize();
      if (photoSize === 's') {
        show(this.preview[previewParamName]);
      } else {
        hide(this.preview[previewParamName]);
      }
      break;
    case 'community_join':
      var isAppGame = (this.params.link_type.value == 4 && this.params.link_id.app_game_links_ids[this.params.link_id.value]);
      if (this.params.format_type.value == 4 && this.params.link_type.value != 0 && (this.params.link_type.value != 4 || false && isAppGame)) {
        switch (this.params.link_type.value) {
           case 1:  this.preview[previewParamName].innerHTML = getLang('global_group_join'); break;
           case 2:  this.preview[previewParamName].innerHTML = getLang('global_event_join'); break;
           case 6:  this.preview[previewParamName].innerHTML = getLang('global_public_join'); break;
           case 4:  this.preview[previewParamName].innerHTML = (isAppGame ? getLang('global_app_game_join') : getLang('global_app_join')); break;
           default: this.preview[previewParamName].innerHTML = ''; break;
        }
        show(this.preview[previewParamName]);
      } else {
        hide(this.preview[previewParamName]);
      }
      break;
    case 'disclaimer_medical':
      if (this.params.disclaimer_medical.value) {
        show(this.preview[previewParamName]);
      } else {
        hide(this.preview[previewParamName]);
      }
      break;
    case 'disclaimer_specialist':
      if (this.params.disclaimer_specialist.value) {
        show(this.preview[previewParamName]);
      } else {
        hide(this.preview[previewParamName]);
      }
      break;
    case 'domain':
      var domainValue = this.getPreviewDomain();
      this.preview[previewParamName].innerHTML = domainValue;
      if (domainValue) {
        show(this.preview[previewParamName]);
      } else {
        hide(this.preview[previewParamName]);
      }
      break;
    case 'photo':
      if (this.params.photo.value) {
        this.preview[previewParamName].src = this.params.photo_link.value;
      } else {
        var photoSize = this.getPhotoSize();
        var specialValue = ((this.params.link_type.value == 7) ? 'value_empty_' : 'value_default_') + photoSize;
        this.preview[previewParamName].src = this.params.photo_link[specialValue];
      }
      if (this.params.format_type.value == 4) {
        addClass(this.preview.photo_box, 'promotion');
      } else {
        removeClass(this.preview.photo_box, 'promotion');
      }
      break;
    case 'play':
      if (this.params.link_type.value == 7) {
        if (this.params.link_id.value && this.params.link_owner_id.value) {
          removeClass(this.preview[previewParamName], 'empty');
        } else {
          addClass(this.preview[previewParamName], 'empty');
        }
        if (this.params.format_type.value == 3) {
          addClass(this.preview[previewParamName], 'big');
        } else {
          removeClass(this.preview[previewParamName], 'big');
        }
        show(this.preview[previewParamName]);
      } else {
        hide(this.preview[previewParamName]);
      }
      break;
  }
}

AdsViewEditor.prototype.updateTips = function() {

  if (this.params.campaign_type.allow_special_app) {
    var isAppCampaign  = (this.params.campaign_type.value == 2 || (this.params.campaign_id.value_app && this.params.campaign_id.value == this.params.campaign_id.value_app));
    var isAppAdminLink = (this.params.link_type.value == 4 && this.params.link_id.app_admin_links_ids[this.params.link_id.value]);

    if (isAppCampaign) {
      show('ads_param_campaign_tip_app_only');
    } else {
      hide('ads_param_campaign_tip_app_only');
    }
    if (isAppAdminLink && !isAppCampaign) {
      show('ads_param_campaign_tip_no_app_bonus');
    } else {
      hide('ads_param_campaign_tip_no_app_bonus');
    }
    if (isAppAdminLink && isAppCampaign) {
      show('ads_param_link_apps_tip');
    } else {
      hide('ads_param_link_apps_tip');
    }
  }
}

AdsViewEditor.prototype.showMoreCategories = function() {
  hide('ads_param_category_more');
  show('ads_edit_ad_row_category2_id');
  show('ads_edit_ad_row_subcategory2_id');
  this.params.category2_id.hidden    = false;
  this.params.subcategory2_id.hidden = false;
  this.initUiParam('category2_id');
  this.initUiParam('subcategory2_id');
}

AdsViewEditor.prototype.onParamUpdate = function(paramName, paramValue, forceDataUpdate, delayed) {

  if (!delayed) {
    setTimeout(function() {
      this.onParamUpdate(paramName, paramValue, forceDataUpdate, true);
    }.bind(this), 1);
    return;
  }

  var isUpdateNeeded = false;
  do {
    var paramValueOld = this.params[paramName].value;

    if (typeof(this.params[paramName].value) === 'number' && intval(this.params[paramName].value) == this.params[paramName].value) {
      paramValue = intval(paramValue);
    }

    if ('value_escaped' in this.params[paramName]) {
      paramValue = AdsEdit.unescapeValue(paramValue);
    }

    if (this.params[paramName].value === paramValue) {
      break;
    }

    if ('value_escaped' in this.params[paramName]) {
      this.params[paramName].value_escaped = AdsEdit.escapeValue(paramValue);
    }
    this.params[paramName].value = paramValue;

    //debugLog(paramName + ' updated: ' + paramValueOld + ' => ' + this.params[paramName].value);

    switch (paramName) {
      case 'format_type':
        var photoSize = this.getPhotoSize();
        this.params.description.hidden       = (photoSize !== 's');
        this.params.link_domain.hidden       = (!inArray(this.params.link_type.value, [5, 7]) || this.params[paramName].value == 4);
        this.params.stats_url.hidden         = (this.params[paramName].value != 3 || !this.params.stats_url.allow);
        this.params.views_limit_flag.hidden  = (this.params.cost_type.value != 1 || this.params.format_type.value == 3 && this.params.views_limit_exact.allow);
        this.params.views_limit_exact.hidden = (this.params.cost_type.value != 1 || this.params.format_type.value != 3 || !this.params.views_limit_exact.allow);

        this.params.photo.value_p            = '';
        this.params.photo_link.value_p       = '';
        this.params.title.disabled           = (this.params[paramName].value == 4);
        if (this.params.format_type.value == 4) {
          this.setTitle('');
        }

        var isChangedTextImage          = (this.params[paramName].value == 1 || paramValueOld == 1);
        var isChangedPromotionCommunity = (this.params[paramName].value == 4 || paramValueOld == 4);

        if (isChangedTextImage || isChangedPromotionCommunity) {
          this.updateUiParamData('link_type');
        }

        if (isChangedPromotionCommunity) {
          this.params.link_domain.value         = '';
          this.params.link_domain.link_url      = '';
          this.params.link_domain.delayed_error = '';
          this.params.link_domain.disabled      = true;
        }

        if (isChangedPromotionCommunity) {
          var vkLinkType = ((this.params.link_type.value == 5 && this.params.link_url_vk.link_type_value) ? this.params.link_url_vk.link_type_value : this.params.link_type.value);
          if (inArray(vkLinkType, [1, 2, 6, 4])) {
            this.updateNeeded.need_promotion_community = true;
          } else {
            this.setLinkType(0);
          }
        } else if (isChangedTextImage && this.params.link_type.value == 7) {
          this.setLinkType(0);
        }

        this.updateUiParam('title');
        this.updateUiParam('link_domain');
        this.updateUiParam('cost_per_click');
        this.updateUiParam('views_places');
        this.updateUiParam('views_limit_flag');
        this.updateUiParamVisibility('format_type');
        this.updateUiParamVisibility('description');
        this.updateUiParamVisibility('link_domain');
        this.updateUiParamVisibility('stats_url');
        this.updateUiParamVisibility('views_limit_flag');
        this.updateUiParamVisibility('views_limit_exact');
        this.updatePreview('play');
        this.updatePreview('description');
        this.updatePreview('domain');
        this.updatePhotoData();

        isUpdateNeeded = true;
        break;
      case 'cost_type':
        this.params.views_limit_flag.hidden  = (this.params.cost_type.value != 1 || this.params.format_type.value == 3 && this.params.views_limit_exact.allow);
        this.params.views_limit_exact.hidden = (this.params.cost_type.value != 1 || this.params.format_type.value != 3 || !this.params.views_limit_exact.allow);

        this.updateUiParam('cost_per_click');
        this.updateUiParam('views_places');
        this.updateUiParam('views_limit_flag');
        this.updateUiParamVisibility('views_limit_flag');
        this.updateUiParamVisibility('views_limit_exact');

        isUpdateNeeded = true;
        break;
      case 'link_type':
        var link_id_value_old = this.params.link_id.value

        this.params.link_id.value = '';
        this.params.link_owner_id.value = '';
        this.params.link_id.data = [];
        this.params.link_id.hidden     = !inArray(this.params[paramName].value, [1, 2, 3, 4, 6]);
        this.params.link_url.hidden    = !inArray(this.params[paramName].value, [5, 7]);
        this.params.link_domain.hidden = (!inArray(this.params[paramName].value, [5, 7]) || this.params.format_type.value == 4);
        if (this.params[paramName].value == 7) {
          this.params.link_id.value       = this.params.link_id.video_value;
          this.params.link_owner_id.value = this.params.link_owner_id.video_value;
        }

        this.params.photo.value_p      = '';
        this.params.photo_link.value_p = '';
        if (this.params.format_type.value == 4) {
          this.params.link_domain.value         = '';
          this.params.link_domain.link_url      = '';
          this.params.link_domain.delayed_error = '';
          this.params.link_domain.disabled      = true;
          this.setTitle('');
        }

        this.updatePhotoData();

        var photoSize = this.getPhotoSize();
        this.params.description.hidden = (photoSize !== 's');

        if (this.params.link_id.app_game_links_ids[link_id_value_old]) {
          this.updateUiParam('category1_id');
        }
        this.updateUiParam('link_domain');
        this.updateUiParam('cost_per_click');
        this.updateUiParam('views_places');
        this.updateUiParamPlaceholderText('link_id');
        this.updateUiParamData('link_id');
        this.updateUiParamVisibility('link_type');
        this.updateUiParamVisibility('link_id');
        this.updateUiParamVisibility('link_url');
        this.updateUiParamVisibility('link_domain');
        this.updateUiParamVisibility('description');
        this.updatePreview('link');
        this.updatePreview('domain');
        this.updatePreview('play');
        this.updatePreview('description');
        this.updatePreview('community_join');
        this.targetingEditor.correctCriterion('pays_money');
        this.targetingEditor.correctCriterion('retargeting_groups');
        this.targetingEditor.correctCriterion('retargeting_groups_not');
        this.targetingEditor.updateUiCriterionVisibility('pays_money');
        this.targetingEditor.updateUiCriterionVisibility('retargeting_groups');
        this.targetingEditor.updateUiCriterionVisibility('retargeting_groups_not');

        if (inArray(this.params[paramName].value, [1, 2, 3, 4, 6])) {
          this.updateNeeded.need_links = true;
        }
        this.updateNeeded.need_link_object = true;
        this.updateTips();
        isUpdateNeeded = true;
        break;
      case 'link_id':
        this.params.photo.value_p      = '';
        this.params.photo_link.value_p = '';
        if (this.params.format_type.value == 4) {
          this.params.link_domain.value         = '';
          this.params.link_domain.link_url      = '';
          this.params.link_domain.delayed_error = '';
          this.params.link_domain.disabled      = true;
          this.setTitle('');
        }

        if (this.params.link_id.app_game_links_ids[paramValue] != this.params.link_id.app_game_links_ids[paramValueOld]) {
          this.updateUiParam('category1_id');
        }
        this.updateUiParam('link_domain');
        this.updateUiParam('cost_per_click');
        this.updatePreview('link');
        this.updatePreview('domain');
        this.updatePreview('community_join');
        this.updateTips();
        this.updatePhotoData();

        this.updateNeeded.need_link_object = true;
        this.updateNeeded.need_promotion_community = true;
        isUpdateNeeded = true;
        break;
      case 'link_url':
        this.params.link_url_vk.value           = 0;
        this.params.link_url_vk.link_type_value = 0;
        this.params.link_url_vk.link_id_value   = 0;
        this.params.link_domain.value           = '';
        this.params.link_domain.link_url        = '';
        this.params.link_domain.delayed_error   = '';
        this.params.link_domain.disabled        = true;
        this.params.link_domain_confirm.value   = 0;
        this.updateUiParam('link_domain');
        this.updatePreview('link');
        this.updatePreview('domain');
        this.updateLinkDomain();
        this.updatePhotoData();

        this.updateNeeded.need_promotion_community = true;
        if (this.params.link_url.last_blur) {
          this.updateNeeded.need_link_object = true;
          isUpdateNeeded = true;
        }
        break;
      case 'link_domain':
        this.updatePreview('link');
        this.updatePreview('domain');

        this.updateNeeded.need_link_object = true;
        isUpdateNeeded = true;
        break;
      case 'title':
      case 'description':
        var remainElem = ge(this.options.targetIdPrefix + paramName + '_remain_length');
        var remainLength = this.params[paramName].max_length - this.params[paramName].value.length;
        remainElem.innerHTML = remainLength;
        this.params[paramName].edited = true;
        if (paramName == 'title') {
          if (this.params[paramName].update_value_max || this.params.format_type.value != 4) {
            this.params[paramName].value_max = this.params[paramName].value;
          }
          this.params[paramName].reduce_hidden = !(this.params.format_type.value == 4 && this.params[paramName].value_max.match(/\S\s+\S/));
          this.updateUiParamVisibility(paramName);
        }
        this.updatePreview(paramName);
        break;
      case 'category1_id':
        this.params.subcategory1_id.value = 0;

        this.updateUiParamData('subcategory1_id');
        this.updateUiParamDisabledText('subcategory1_id');
        this.updateUiParamEnabled('subcategory1_id');
        break;
      case 'category2_id':
        this.params.subcategory2_id.value = 0;

        this.updateUiParamData('subcategory2_id');
        this.updateUiParamDisabledText('subcategory2_id');
        this.updateUiParamEnabled('subcategory2_id');
        break;
      case 'disclaimer_medical':
        this.updateUiParam('views_places');
        this.updatePreview('disclaimer_medical');
        break;
      case 'disclaimer_specialist':
        this.updateUiParam('views_places');
        this.updatePreview('disclaimer_specialist');
        break;
      case 'cost_per_click':
        this.params[paramName].edited = true;

        var isAppCampaign = (this.params.campaign_type.value == 2 || (this.params.campaign_id.value_app && this.params.campaign_id.value == this.params.campaign_id.value_app));
        var isAppAdminLink = (this.params.link_type.value == 4 && this.params.link_id.app_admin_links_ids[this.params.link_id.value]);
        var isApp = (isAppCampaign && isAppAdminLink);

        var suffixesAll = '';
        suffixesAll    += ((this.params.cost_type.value == 0) ? '_click' : '_views');
        suffixesAll    += ((this.params.format_type.value == 3) ? '_exclusive' : '');
        suffixesAll    += (isApp ? '_app' : '');

        var multViews     = cur.unionsLimits.cost_per_views_coeff;
        var multExclusive = 2;
        var multApp       = 1 / 2;

        var costPerClickValue = 'value' + suffixesAll;

        var suffixes = {
          '_click':               ['_views',               1 / multViews],
          '_click_exclusive':     ['_click',               1 * multExclusive],
          '_click_app':           ['_click_exclusive',     1 / multExclusive * multApp],
          '_click_exclusive_app': ['_click_app',           1 * multExclusive],
          '_views_exclusive_app': ['_click_exclusive_app', 1 * multViews],
          '_views_app':           ['_views_exclusive_app', 1 / multExclusive],
          '_views_exclusive':     ['_views_app',           1 * multExclusive / multApp],
          '_views':               ['_views_exclusive',     1 / multExclusive]
        };

        var values = {};

        values[costPerClickValue] = Number(this.params.cost_per_click.value);

        do {
          var valuesCountComplete = 0;
          var valuesCountTotal = 0;

          for (var suffixTo in suffixes) {
            var suffixInfo    = suffixes[suffixTo];
            var suffixFrom    = suffixInfo[0];
            var valueNameTo   = 'value' + suffixTo;
            var valueNameFrom = 'value' + suffixFrom;
            if (!(valueNameTo in values) && (valueNameFrom in values)) {
              values[valueNameTo] = values[valueNameFrom] * suffixInfo[1];
            }

            valuesCountComplete += (valueNameTo in values);
            valuesCountTotal++;
          }
        } while (valuesCountComplete != valuesCountTotal);

        for (var valueName in values) {
          this.params.cost_per_click[valueName] = Number(values[valueName]).toFixed(2).replace('.00', '');
        }

        this.updateUiParam('cost_per_click');
        break;
      case 'views_places':
        this.params[paramName].value_normal = this.params[paramName].value;

        isUpdateNeeded = true;
        break;
      case 'campaign_type':
        this.params.campaign_id.hidden     = (this.params[paramName].value == 1 || this.params.campaign_id.data.length == 0 || (this.params[paramName].value == 2 && !this.params.campaign_id.value_app));
        this.params.campaign_name.hidden   = !this.params.campaign_id.hidden;
        this.params.campaign_id.disabled   = (this.params[paramName].value == 2);
        this.params.campaign_name.disabled = (this.params[paramName].value == 2);
        if (this.params[paramName].value == 2) {
          this.params.campaign_id.value   = this.params.campaign_id.value_app;
          this.params.campaign_name.value = getLang('ads_default_first_app_campaign_name');
        } else if (this.params[paramName].value == 0) {
          this.params.campaign_id.value   = this.params.campaign_id.value_normal;
          this.params.campaign_name.value = '';
        } else if (this.params[paramName].value == 1) {
          this.params.campaign_id.value   = 0;
          this.params.campaign_name.value = this.params.campaign_name.value_normal;
        }

        this.updateUiParam('cost_per_click');
        this.updateUiParam('views_places');
        this.updateUiParamVisibility('campaign_id');
        this.updateUiParamVisibility('campaign_name');
        this.updateUiParam('campaign_id');
        this.updateUiParam('campaign_name');
        this.updatePreview('link');
        this.updateTips();

        isUpdateNeeded = true;
        break;
      case 'campaign_id':
        this.params[paramName].value_normal = this.params[paramName].value;
        this.updateUiParam('cost_per_click');
        this.updateUiParam('views_places');
        this.updatePreview('link');
        this.updateTips();

        isUpdateNeeded = true;
        break;
      case 'campaign_name':
        this.params[paramName].value_normal = this.params[paramName].value;
        break;
    }

  } while (false);

  if (isUpdateNeeded || forceDataUpdate) {
    this.needDataUpdate();
  }
}

AdsViewEditor.prototype.onUiSelect = function(paramName, paramValue) {
  this.onParamUpdate(paramName, paramValue);
}

AdsViewEditor.prototype.onUiChange = function(paramName, paramValue) {
  this.onParamUpdate(paramName, paramValue);
}

AdsViewEditor.prototype.onUiEvent = function(paramName, event) {

  switch (paramName) {
    case 'link_url':
      var eventType = event.type;
      this.params[paramName].last_blur = (eventType === 'blur');

      // setTimeout at least for IE
      setTimeout(function() {
        var targetElem = ge(this.options.targetIdPrefix + paramName);
        if (!targetElem) {
          return;
        }
        var paramValue = targetElem.value;
        var forceDataUpdate = (eventType === 'blur');
        this.onParamUpdate(paramName, paramValue, forceDataUpdate);
        if (forceDataUpdate) {
          this.updateLinkDomain();
        }
      }.bind(this), 100);
      break;
    case 'link_domain':
    case 'stats_url':
      // setTimeout at least for IE
      setTimeout(function() {
        var targetElem = ge(this.options.targetIdPrefix + paramName);
        if (!targetElem) {
          return;
        }
        var paramValue = targetElem.value;
        this.onParamUpdate(paramName, paramValue);
      }.bind(this), 100);
      break;
    case 'title':
    case 'description':
      function correctValue(delayed, event) {
        var targetElem = ge(this.options.targetIdPrefix + paramName);
        if (!targetElem) {
          return;
        }
        var paramValueOriginal = targetElem.value;
        var paramValue = this.correctInvalidValue(paramName, paramValueOriginal);
        if (paramValue !== paramValueOriginal) {
          targetElem.value = paramValue;
        }
        //console.log('onUiEvent, paramName = ' + paramName + ', event.type = ' + event.type + ', paramValue = ' + paramValue + ', delayed = ', delayed);
        if (browser.msie && event.type === 'paste') {
          targetElem.blur();
          targetElem.focus();
        }
        if (browser.chrome) { // Bug: Chrome counts new lines as 2 chars
          var maxLengthNew = this.params[paramName].max_length + paramValue.split("\n").length - 1;
          targetElem.setAttribute('maxlength', maxLengthNew);
        }
        if (delayed) {
          this.onParamUpdate(paramName, paramValue);
        }
      }

      correctValue.bind(this)(false, event);

      // setTimeout at least for IE
      setTimeout(correctValue.bind(this, true, event), 100);
      break;
    case 'title_reduce':
      if (event.type === 'click' || event.type === 'keypress' && event.keyCode == KEY.RETURN) {
        this.reduceTitle();
        return false;
      }
      break;
    case 'cost_per_click':
      // setTimeout at least for IE
      setTimeout(function() {
        var targetElem = ge(this.options.targetIdPrefix + paramName);
        if (!targetElem) {
          return;
        }
        var paramValue = targetElem.value;
        paramValue = paramValue.replace(',', '.');
        paramValue = floatval(paramValue).toFixed(2).replace('.00', '');
        this.onParamUpdate(paramName, paramValue);
      }.bind(this), 100);
      break;
    case 'campaign_name':
      // setTimeout at least for IE
      setTimeout(function() {
        var targetElem = ge(this.options.targetIdPrefix + paramName);
        if (!targetElem) {
          return;
        }
        var paramValue = targetElem.value;
        this.onParamUpdate(paramName, paramValue);
      }.bind(this), 100);
      break;
  }

  return true;
}

AdsViewEditor.prototype.needDataUpdate = function() {
  if (!this.getUpdatedData) {
    return;
  }
  var params = this.getParams();
  var data = extend({}, params, this.updateNeeded);
  var force = !isEmpty(this.updateNeeded);
  this.updateNeeded = {};
  this.getUpdatedData(data, force);
}

AdsViewEditor.prototype.replaceValueNewLines = function(value, maxNewLines) {
  for (var i = 0, j = 0; i >= 0; j++) {
    if (j >= maxNewLines) {
      value = value.substr(0, i) + value.substr(i).replace(/\n/g, " ");
      break;
    }
    i = value.indexOf("\n", i);
    i += (i >= 0);
  }
  return value;
}

AdsViewEditor.prototype.correctInvalidValue = function(paramName, paramValue) {
  paramValue = paramValue.substr(0, this.params[paramName].max_length);
  paramValue = this.replaceValueNewLines(paramValue, this.params[paramName].max_new_lines);
  return paramValue;
}

AdsViewEditor.prototype.getLinkInfo = function(link) {
  var matches = link.match(/^(https?:\/\/)?((?:[^:\/]+\.)+[^:\/]+)(\/.*)?$/i);
  if (!matches) {
    return false;
  }
  var linkInfo = {};
  linkInfo.protocol = matches[1];
  linkInfo.domain   = matches[2];
  linkInfo.path     = matches[3];
  linkInfo.domain   = linkInfo.domain.toLowerCase();
  if (linkInfo.domain.length > 7) {
    linkInfo.domain = linkInfo.domain.replace(/^www\./, '');
  }
  return linkInfo;
}

AdsViewEditor.prototype.getParams = function() {
  var params = {};
  for (var paramName in this.params) {
    params[paramName] = this.params[paramName].value;
  }
  return params;
}

AdsViewEditor.prototype.getPhotoSize = function() {
  switch (this.params.format_type.value) {
    case 1: return 's';
    case 2: return 'm';
    case 3: return 'b';
    case 4: return 'p';
  }
}

AdsViewEditor.prototype.setPhotoData = function(photoSize, photo) {
  var valueBySize = 'value_' + photoSize;

  this.params.photo[valueBySize]      = photo || '';
  this.params.photo_link[valueBySize] = '';

  this.updatePhotoData();
}

AdsViewEditor.prototype.updatePhotoData = function() {
  var photoSize   = this.getPhotoSize();
  var valueBySize = 'value_' + photoSize;

  this.params.photo.value      = this.params.photo[valueBySize];
  this.params.photo_link.value = this.params.photo_link[valueBySize];

  this.updatePhotoLink();
}

AdsViewEditor.prototype.updatePhotoLink = function() {
  var photoSize   = this.getPhotoSize();
  var valueBySize = 'value_' + photoSize;

  if (this.params.photo_link[valueBySize] || this.params.photo_link[valueBySize] === null || !this.params.photo[valueBySize]) {
    this.updatePreview('photo');
    return;
  }
  var lockHash = 'update_photo_link_' + photoSize + '_' + this.params.photo[valueBySize];
  if (!Ads.lock(lockHash)) {
    return;
  }

  var vkLinkType = ((this.params.link_type.value == 5 && this.params.link_url_vk.link_type_value) ? this.params.link_url_vk.link_type_value : this.params.link_type.value);

  var ajaxParams = {};
  ajaxParams.photo       = this.params.photo[valueBySize];
  ajaxParams.format_type = this.params.format_type.value;
  ajaxParams.link_type   = vkLinkType;

  ajax.post('/adsedit?act=get_photo_link', ajaxParams, {onDone: onDone.bind(this), onFail: onFail.bind(this)})

  function onDone(photoLink) {
    Ads.unlock(lockHash);
    if (this.params.photo[valueBySize] == ajaxParams.photo) {
      this.params.photo_link[valueBySize] = (photoLink || null);
      this.updatePhotoData();
    }
  }
  function onFail() {
    Ads.unlock(lockHash);
  }
}

AdsViewEditor.prototype.setVideoData = function(linkId, linkOwnerId, videoHash, videoPreviewHash) {
  this.params.video_hash.value            = videoHash;
  this.params.link_id.video_value         = linkId;
  this.params.link_owner_id.video_value   = linkOwnerId;
  this.params.link_url.video_preview_hash = videoPreviewHash;
  if (this.params.link_type.value == 7) {
    this.params.link_id.value       = linkId;
    this.params.link_owner_id.value = linkOwnerId;
  }
  this.updatePreview('link');
  this.updatePreview('play');
}

AdsViewEditor.prototype.setFormatType = function(formatType) {
  this.onParamUpdate('format_type', formatType, false, true);
  Radiobutton.select(this.options.targetIdPrefix + 'format_type', this.params.format_type.value);
}

AdsViewEditor.prototype.setCostType = function(costType) {
  this.onParamUpdate('cost_type', costType, false, true);
  Radiobutton.select(this.options.targetIdPrefix + 'cost_type', this.params.cost_type.value);
}

AdsViewEditor.prototype.setLinkType = function(linkType) {
  this.onParamUpdate('link_type', linkType, false, true);
  this.updateUiParam('link_type');
}

AdsViewEditor.prototype.setLinkId = function(linkId) {
  this.updateNeeded.need_links = true;
  this.onParamUpdate('link_id', linkId, false, true);
  this.updateUiParam('link_id');
}

AdsViewEditor.prototype.setTitle = function(title, noUpdateValueMax) {
  this.params.title.update_value_max = !noUpdateValueMax;
  var targetElem = ge(this.options.targetIdPrefix + 'title');
  targetElem.value = title;
  triggerEvent(targetElem, 'blur', {}, true);
}

AdsViewEditor.prototype.reduceTitle = function() {
  var title = this.params.title.value.replace(/[:,\s]+\S+$/, '');
  if (title == this.params.title.value) {
    title = this.params.title.value_max;
  }
  this.setTitle(title, true);
}

AdsViewEditor.prototype.setDescription = function(description) {
  if (this.params.description.hidden) {
    return;
  }
  var targetElem = ge(this.options.targetIdPrefix + 'description');
  targetElem.value = description;
  triggerEvent(targetElem, 'blur', {}, true);
}

AdsViewEditor.prototype.confirmLinkDomain = function() {
  this.params.link_domain_confirm.value = 1;
}

AdsViewEditor.prototype.setUpdateDataHandler = function(getUpdatedData) {
  this.getUpdatedData = getUpdatedData;
}

AdsViewEditor.prototype.setUpdateData = function(data, result) {
  var setResult = true;

  if (data['need_links']) {
    if (isObject(result) && 'link_id_data' in result) {
      if (data.link_type == this.params.link_type.value) {
        this.params.link_id.data = result['link_id_data'];
        if (this.params.link_type.value == 4) {
          if ('app_admin_links_ids' in result) {
            this.params.link_id.app_admin_links_ids = result['app_admin_links_ids'];
          } else {
            setResult = false;
          }
          if ('app_game_links_ids' in result) {
            this.params.link_id.app_game_links_ids = result['app_game_links_ids'];
          } else {
            setResult = false;
          }
        }
        this.updateUiParamData('link_id');
      }
    } else {
      setResult = false;
    }
  }

  if (isObject(result) && 'cost_per_click' in result) {
    if (!this.params.cost_per_click.edited) {
      for (var key in result.cost_per_click) {
        if (key.indexOf('value_') === 0 && key in this.params.cost_per_click) {
          this.params.cost_per_click[key] = result.cost_per_click[key];
        }
      }
    }
    for (var key in result.cost_per_click) {
      if (key.indexOf('recommended_') === 0 && key in this.params.cost_per_click) {
        this.params.cost_per_click[key] = result.cost_per_click[key];
      }
    }

    this.updateUiParam('cost_per_click');
  }

  if (isObject(result) && 'audience_count_text' in result) {
    var targetElem = ge('ads_edit_audience_text');
    targetElem.innerHTML = result.audience_count_text;
  }

  // Temporary disabled
  if (false && isObject(result) && 'link_url_vk_link_type' in result && data.link_url === this.params.link_url.value) {
    this.params.link_url_vk.value           = 1;
    this.params.link_url_vk.link_type_value = result.link_url_vk_link_type;
    this.params.link_url_vk.link_id_value   = result.link_url_vk_link_id;
  }

  if (isObject(result) && 'promotion_photo' in result) {
    var vkLinkType = ((this.params.link_type.value == 5 && this.params.link_url_vk.link_type_value) ? this.params.link_url_vk.link_type_value : this.params.link_type.value);
    if (this.params.format_type.value == 4 && data.link_type == this.params.link_type.value && data.link_id == this.params.link_id.value && data.link_url == this.params.link_url.value && inArray(vkLinkType, [1, 2, 6, 4])) {
      this.setPhotoData('p', result['promotion_photo']);
      this.setTitle(AdsEdit.unescapeValueInit(result['promotion_title']));
      this.params.link_domain.value    = result['promotion_link_domain'];
      this.params.link_domain.link_url = '';
      this.updateUiParam('link_domain');
      this.updatePreview('domain');
    }
  }

  return setResult;
}

//
// AdsTargetingEditor
//

function AdsTargetingEditor() {}
AdsTargetingEditor.prototype.init = function(options, viewEditor, criteria, criteriaData, criteriaRanges, criteriaParams, targetingGroups) {

  this.viewEditor = viewEditor;

  this.options = {
    targetIdPrefix: 'ads_targeting_criterion_',
    uiWidth: 320 + 8,
    uiHeight: 250,
    uiWidthRange: 151 + 8,
    uiHeightRange: 190,
    uiMaxSelected: 25
  };

  this.options = extend({}, this.options, options);

  // defaultData exists if data may be not equal defaultData
  this.criteria = {
    country:                {value: 0,  data: []},
    cities:                 {value: '', data: [], defaultData: [], selectedData: []},
    cities_not:             {value: '', data: [],                  selectedData: []},

    sex:                    {value: 0,  data: []},
    age_from:               {value: 0,  data: []},
    age_to:                 {value: 0,  data: []},
    birthday:               {value: 0},
    statuses:               {value: '', data: []},

    interests:              {value: '', data: [], defaultData: []},
    interest_categories:    {value: '', data: []},
    group_types:            {value: '', data: []},
    groups:                 {value: '', data: [], defaultData: [], selectedData: [], defaultDataOriginal: [], link_object_id: 0, link_object_item: null, link_object_processed: true},
    apps:                   {value: '', data: [], defaultData: [], selectedData: [], defaultDataOriginal: [], link_object_id: 0, link_object_item: null, link_object_processed: true},
    apps_not:               {value: '', data: [],                  selectedData: []},
    religions:              {value: '', data: []},
    travellers:             {value: 0},

    districts:              {value: '', data: [],                  selectedData: [], dataInited: true}, // No default data to allow autocomplete by data
    stations:               {value: '', data: [],                  selectedData: [], dataInited: true}, // No default data to allow autocomplete by data
    streets:                {value: '', data: [],                  selectedData: []}, // No default data at all

    schools_type:           {value: 0},
    schools:                {value: '', data: [],                  selectedData: []}, // No default data at all
    school_from:            {value: 0,  data: []},
    school_to:              {value: 0,  data: []},
    uni_from:               {value: 0,  data: []},
    uni_to:                 {value: 0,  data: []},
    positions:              {value: '', data: [], defaultData: [], selectedData: []},

    operators:              {value: '', data: [], defaultData: [], selectedData: []},
    browsers:               {value: '', data: []},
    user_devices:           {value: '', data: []},
    user_operating_systems: {value: '', data: []},
    user_browsers:          {value: '', data: []},
    pays_money:             {value: 0,  data: []},
    retargeting_groups:     {value: '', data: []},
    retargeting_groups_not: {value: '', data: []},
    tags:                   {value: ''}
  };

  this.updateNeeded = {};

  if (criteria) for (var i in criteria) {
    if (criteria[i] && (i in this.criteria)) {
      var newCriterionValue = criteria[i];
      if (typeof(this.criteria[i].value) === 'number') {
        newCriterionValue = intval(newCriterionValue);
      }
      if (i === 'tags') {
        newCriterionValue = AdsEdit.unescapeValueInit(newCriterionValue);
      }
      this.criteria[i].value = newCriterionValue;
    }
  }

  if (criteriaData) {
    if (criteriaData.data) for (var i in criteriaData.data) {
      if (criteriaData.data[i] && (i in this.criteria) && ('data' in this.criteria[i])) {
        this.criteria[i].data = criteriaData.data[i];
      }
    }
    if (criteriaData.defaultData) for (var i in criteriaData.defaultData) {
      if (criteriaData.defaultData[i] && (i in this.criteria) && ('defaultData' in this.criteria[i])) {
        this.criteria[i].defaultData = criteriaData.defaultData[i];
      }
    }
    if (criteriaData.selectedData) for (var i in criteriaData.selectedData) {
      if (criteriaData.selectedData[i] && (i in this.criteria) && ('selectedData' in this.criteria[i])) {
        this.criteria[i].selectedData = criteriaData.selectedData[i];
      }
    }
  }

  if (criteriaParams) for (var i in criteriaParams) {
    if (criteriaParams[i] && (i in this.criteria)) {
      this.criteria[i] = extend({}, this.criteria[i], criteriaParams[i]);
    }
  }

  {
    this.criteria.groups.defaultDataOriginal = this.criteria.groups.defaultData;
    this.criteria.apps.defaultDataOriginal   = this.criteria.apps.defaultData;
  }

  this.criteriaRanges = criteriaRanges;
  this.targetingGroups = targetingGroups;

  this.interestingEvents = 'keydown keyup keypress change paste cut drop input blur';

  this.cur = {destroy: []};

  this.initHelp();
  this.initUi();
}

AdsTargetingEditor.prototype.destroy = function() {
  processDestroy(this.cur);
}

AdsTargetingEditor.prototype.initHelp = function() {
  for (var criterionName in this.criteria) {
    this.initHelpCriterion(criterionName);
  }
}

AdsTargetingEditor.prototype.initHelpCriterion = function(criterionName) {
  if (!cur.targetingCriteriaHelp) {
    return;
  }
  var helpText = cur.targetingCriteriaHelp[criterionName];
  if (!helpText) {
    return;
  }

  var targetElem;
  var handler;
  var context = {focus: false, over: 0, out: 2};
  var shiftTop;

  switch (criterionName) {
    case 'travellers': shiftTop = -52; break;
    case 'positions':  shiftTop = -44; break;
    case 'pays_money': shiftTop = -44; break;
    case 'tags':       shiftTop = -96; break;
  }

  switch (criterionName) {
    case 'cities':
    case 'interest_categories':
    case 'interests':
    case 'group_types':
    case 'travellers':
    case 'schools':
    case 'positions':
    case 'browsers':
    case 'pays_money':
    case 'tags':
      targetElem = ge(this.options.targetIdPrefix + criterionName).parentNode;
      var showTooltip = function() { AdsEdit.showHelpCriterionTooltip(criterionName, targetElem, handler, this.criteria[criterionName], helpText, false, shiftTop, this.cur); }.bind(this);
      var hideTooltip = function() { AdsEdit.hideHelpTooltip(this.criteria[criterionName].tt); }.bind(this);
      handler = function(event){ AdsEdit.onHelpTooltipEvent(event, criterionName, context, showTooltip, hideTooltip); }.bind(this);
      AdsEdit.initHelpTooltipTarget(targetElem, handler, this.cur);
      break;
  }
}

AdsTargetingEditor.prototype.initUi = function() {
  for (var groupName in this.targetingGroups) {
    var group = this.targetingGroups[groupName];
    if (group.hidden) {
      continue;
    }
    this.showGroup(groupName);
  }
}

AdsTargetingEditor.prototype.initUiGroup = function(groupName) {

  if (!this.targetingGroups[groupName] || this.targetingGroups[groupName].uiInited) {
    return;
  }

  var targetElem;

  switch (groupName) {
    case 'geography':
    case 'interests':
      if (this.targetingGroups[groupName].criteria_more) {
        targetElem = ge('ads_edit_targeting_group_' + groupName + '_more_link');
        addEvent(targetElem, 'click keypress', function(event) { return this.onUiEvent('group_' + groupName + '_more', event); }.bind(this));
        this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));
      }
      if (this.targetingGroups[groupName].criteria_less) {
        targetElem = ge('ads_edit_targeting_group_' + groupName + '_less_link');
        addEvent(targetElem, 'click keypress', function(event) { return this.onUiEvent('group_' + groupName + '_less', event); }.bind(this));
        this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));
      }
      break;
  }

  this.targetingGroups[groupName].uiInited = true;
}

AdsTargetingEditor.prototype.initUiCriterion = function(criterionName) {

  //debugLog('Targeting: Try init UI ' + criterionName);

  if (!this.criteria[criterionName] || this.criteria[criterionName].uiInited || this.criteria[criterionName].uiInited === false) {
    return;
  }

  if (this.criteria[criterionName].hidden) {
    return;
  }

  var targetElem;

  // Hide not allowed criteria
  var visible = this.getUiCriterionVisibility(criterionName, true);
  if (visible === false) {
    return;
  }

  this.criteria[criterionName].uiInited = false;

  // Init UI controls which do not change criteria
  switch (criterionName) {
  }

  // Init UI control
  switch (criterionName) {
    // Dropdowns
    case 'country':
      targetElem = ge(this.options.targetIdPrefix + criterionName);
      targetElem.removeAttribute('autocomplete');
      this.criteria[criterionName].ui = new Dropdown(targetElem, this.getUiCriterionData(criterionName), {
        selectedItem: this.getUiCriterionSelectedData(criterionName),
        defaultItems: this.getUiCriterionDefaultData(criterionName),
        big:          true,
        autocomplete: true,
        width:        this.options.uiWidth,
        onChange:     function(value) { this.onUiChange(criterionName, value); }.bind(this)
      });
      this.updateUiCriterionEnabled(criterionName);
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui.destroy(); }.bind(this));
      break;
    case 'pays_money':
      targetElem = ge(this.options.targetIdPrefix + criterionName);
      targetElem.removeAttribute('autocomplete');
      this.criteria[criterionName].ui = new Dropdown(targetElem, this.getUiCriterionData(criterionName), {
        selectedItem: this.getUiCriterionSelectedData(criterionName),
        big:          true,
        width:        this.options.uiWidth,
        onChange:     function(value) { this.onUiChange(criterionName, value); }.bind(this)
      });
      this.updateUiCriterionEnabled(criterionName);
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui.destroy(); }.bind(this));
      break;
    case 'age_from':
    case 'age_to':
    case 'school_from':
    case 'school_to':
    case 'uni_from':
    case 'uni_to':
      targetElem = ge(this.options.targetIdPrefix + criterionName);
      targetElem.removeAttribute('autocomplete');
      this.criteria[criterionName].ui = new Dropdown(targetElem, this.getUiCriterionData(criterionName), {
        selectedItem: this.getUiCriterionSelectedData(criterionName),
        big:             true,
        zeroPlaceholder: true,
        width:           this.options.uiWidthRange,
        height:          this.options.uiHeightRange,
        onChange:        function(value) { this.onUiChange(criterionName, value); }.bind(this)
      });
      this.updateUiCriterionEnabled(criterionName);
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui.destroy(); }.bind(this));
      break;
    case 'cities':
    case 'cities_not':
    case 'statuses':
    case 'interests':
    case 'interest_categories':
    case 'group_types':
    case 'groups':
    case 'apps':
    case 'apps_not':
    case 'religions':
    case 'districts':
    case 'stations':
    case 'streets':
    case 'schools':
    case 'positions':
    case 'operators':
    case 'browsers':
    case 'user_devices':
    case 'user_operating_systems':
    case 'user_browsers':
    case 'retargeting_groups':
    case 'retargeting_groups_not':
      targetElem = ge(this.options.targetIdPrefix + criterionName);
      targetElem.removeAttribute('autocomplete');
      this.criteria[criterionName].ui = new Autocomplete(targetElem, this.getUiCriterionData(criterionName), {
        name1: criterionName,
        defaultItems:  this.getUiCriterionDefaultData(criterionName),
        selectedItems: this.getUiCriterionSelectedData(criterionName),

        introText:     this.getUiCriterionIntroText(criterionName),
        placeholder:   this.getUiCriterionPlaceholderText(criterionName),
        noResult:      this.getUiCriterionNoResultText(criterionName),
        disabledText:  this.getUiCriterionDisabledText(criterionName),

        dropdown:      true,
        big:           true,
        maxItems:      this.options.uiMaxSelected,
        width:         this.options.uiWidth,
        height:        this.options.uiHeight,

        onTagAdd:      function(tag, value) { this.onUiTagAdd(criterionName, value, tag); }.bind(this),
        onTagRemove:   function(tag, value) { this.onUiTagRemove(criterionName, value, tag); }.bind(this)
      });
      this.updateUiCriterionEnabled(criterionName);
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui.destroy(); }.bind(this));
      break;
    // Radiobuttons
    case 'sex':
      targetElem = ge(this.options.targetIdPrefix + criterionName + '_any');
      this.criteria[criterionName].ui_any = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('search_adv_any_sex'),
        onSelect: function(value) { this.onUiSelect(criterionName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui_any.destroy(); }.bind(this));

      targetElem = ge(this.options.targetIdPrefix + criterionName + '_male');
      this.criteria[criterionName].ui_male = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('Sex_m'),
        onSelect: function(value) { this.onUiSelect(criterionName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui_male.destroy(); }.bind(this));

      targetElem = ge(this.options.targetIdPrefix + criterionName + '_female');
      this.criteria[criterionName].ui_female = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('Sex_fm'),
        onSelect: function(value) { this.onUiSelect(criterionName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui_female.destroy(); }.bind(this));

      Radiobutton.select(this.options.targetIdPrefix + criterionName, this.criteria[criterionName].value);
      break;
    case 'schools_type':
      targetElem = ge(this.options.targetIdPrefix + criterionName + '_any');
      this.criteria[criterionName].ui_any = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('ads_schools_type_any'),
        onSelect: function(value) { this.onUiSelect(criterionName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui_any.destroy(); }.bind(this));

      targetElem = ge(this.options.targetIdPrefix + criterionName + '_school');
      this.criteria[criterionName].ui_school = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('ads_schools_type_school'),
        onSelect: function(value) { this.onUiSelect(criterionName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui_school.destroy(); }.bind(this));

      targetElem = ge(this.options.targetIdPrefix + criterionName + '_uni');
      this.criteria[criterionName].ui_uni = new Radiobutton(targetElem, {
        width:    this.options.uiWidth,
        label:    getLang('ads_schools_type_university'),
        onSelect: function(value) { this.onUiSelect(criterionName, value) }.bind(this)
      });
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui_uni.destroy(); }.bind(this));

      Radiobutton.select(this.options.targetIdPrefix + criterionName, this.criteria[criterionName].value);
      break;
    // Checkboxes
    case 'birthday':
      var labelToday    = this.criteria.birthday.label_checkbox_today;
      var labelTomorrow = this.criteria.birthday.label_checkbox_tomorrow;
      var labelWeek     = this.criteria.birthday.label_checkbox_week;
      var widthToday    = AdsEdit.getTextWidth(labelToday);
      var widthTomorrow = AdsEdit.getTextWidth(labelTomorrow);
      var widthWeek     = AdsEdit.getTextWidth(labelWeek);
      var widthMore     = Math.floor((this.options.uiWidth - (widthToday + widthTomorrow + widthWeek)) / 3);
      widthToday       += widthMore;
      widthTomorrow    += widthMore;
      widthWeek        += widthMore;

      var isCheckedToday   = !!(this.criteria.birthday.value & (1 << 0));
      var isCheckedTmorrow = !!(this.criteria.birthday.value & (1 << 1));
      var isCheckedWeek    = !!(this.criteria.birthday.value & (1 << 2));

      targetElem = ge(this.options.targetIdPrefix + 'birthday_today');
      this.criteria.birthday.ui_today = new Checkbox(targetElem, {
        label:    labelToday,
        checked:  isCheckedToday,
        width:    widthToday,
        onChange: function(state) { this.onUiChange('birthday_today', state); }.bind(this)
      });
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui_today.destroy(); }.bind(this));

      targetElem = ge(this.options.targetIdPrefix + 'birthday_tomorrow');
      this.criteria.birthday.ui_tomorrow = new Checkbox(targetElem, {
        label:    labelTomorrow,
        checked:  isCheckedTmorrow,
        width:    widthTomorrow,
        onChange: function(state) { this.onUiChange('birthday_tomorrow', state); }.bind(this)
      });
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui_tomorrow.destroy(); }.bind(this));

      targetElem = ge(this.options.targetIdPrefix + 'birthday_week');
      this.criteria.birthday.ui_week = new Checkbox(targetElem, {
        label:    labelWeek,
        checked:  isCheckedWeek,
        width:    widthWeek,
        onChange: function(state) { this.onUiChange('birthday_week', state); }.bind(this)
      });
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui_week.destroy(); }.bind(this));

      if (isCheckedWeek) {
        this.criteria[criterionName].ui_today.disable(true);
        this.criteria[criterionName].ui_tomorrow.disable(true);
      }
      break;
    case 'travellers':
      targetElem = ge(this.options.targetIdPrefix + criterionName);
      this.criteria[criterionName].ui = new Checkbox(targetElem, {
        label:    this.criteria.travellers.label_checkbox,
        checked:  this.criteria.travellers.value,
        width:    this.options.uiWidth,
        onChange: function(state) { this.onUiChange(criterionName, state); }.bind(this)
      });
      this.cur.destroy.push(function(){ this.criteria[criterionName].ui.destroy(); }.bind(this));
      break;
    // Inputs
    case 'tags':
      targetElem = ge(this.options.targetIdPrefix + criterionName);
      addEvent(targetElem, this.interestingEvents, function(event) { return this.onUiEvent(criterionName, event); }.bind(this));
      this.cur.destroy.push(function(targetElem){ cleanElems(targetElem); }.pbind(targetElem));
      break;
  }

  this.criteria[criterionName].uiInited = true;
  //debugLog('Targeting: ' + criterionName + ' UI inited');
}

AdsTargetingEditor.prototype.getUiCriterionData = function(criterionName) {
  switch (criterionName) {
    case 'cities':
    case 'cities_not':
      if (this.criteria.country.value) {
        return '/select.php?act=acity&autocomplete=1&show_regions=1&country=' + this.criteria.country.value;
      } else {
        return [];
      }
    case 'interests':
      return '/select.php?act=ainterests';
    case 'groups':
      return '/adsedit?act=search_user_objects&section=groups';
    case 'apps':
    case 'apps_not':
      return '/adsedit?act=search_user_objects&section=apps';
    case 'streets':
      var citiesOnlyIds = this.getCitiesOnly();
      if (citiesOnlyIds) {
        return '/select.php?act=astreets&cities=' + escape(citiesOnlyIds);
      } else {
        return [];
      }
    case 'schools':
      var citiesOnlyIds = this.getCitiesOnly();
      if (citiesOnlyIds) {
        return '/select.php?act=aschools&cities=' + escape(citiesOnlyIds) + '&schools_type=' + this.criteria.schools_type.value;
      } else {
        return [];
      }
    case 'positions':
      return '/select.php?act=apositions';
    case 'age_from':
      var ageFromMax = (this.criteria.age_to.value || this.criteriaRanges.age_max);
      return this.getUiCriterionDataRange(this.criteriaRanges.age_min, ageFromMax, 1, getLang('ads_age_from'), getLang('ads_age_any'));
    case 'age_to':
      var ageToMin = (this.criteria.age_from.value || this.criteriaRanges.age_min);
      return this.getUiCriterionDataRange(ageToMin, this.criteriaRanges.age_max, 1, getLang('ads_age_to'), getLang('ads_age_any'));
    case 'school_from':
      var schoolFromMax = (this.criteria.school_to.value || this.criteriaRanges.school_max);
      return this.getUiCriterionDataRange(this.criteriaRanges.school_min, schoolFromMax, -1, getLang('ads_school_from'), getLang('ads_school_from_placeholder'));
    case 'school_to':
      var schoolToMin = (this.criteria.school_from.value || this.criteriaRanges.school_min);
      return this.getUiCriterionDataRange(schoolToMin, this.criteriaRanges.school_max, -1, getLang('ads_school_to'), getLang('ads_school_to_placeholder'));
    case 'uni_from':
      var uniFromMax = (this.criteria.uni_to.value || this.criteriaRanges.uni_max);
      return this.getUiCriterionDataRange(this.criteriaRanges.uni_min, uniFromMax, -1, getLang('ads_uni_from'), getLang('ads_uni_from_placeholder'));
    case 'uni_to':
      var uniToMin = (this.criteria.uni_from.value || this.criteriaRanges.uni_min);
      return this.getUiCriterionDataRange(uniToMin, this.criteriaRanges.uni_max, -1, getLang('ads_uni_to'), getLang('ads_uni_to_placeholder'));
    case 'statuses':
      return ((this.criteria.sex.value == 1) ? this.criteria.statuses.data.female : this.criteria.statuses.data.male);
    default:
      return this.criteria[criterionName].data || [];
  }
}

AdsTargetingEditor.prototype.updateUiCriterionData = function(criterionName) {
  if (!('data' in this.criteria[criterionName])) {
    try { console.error("Can't update data"); } catch (e) {}
    return;
  }

  if (!this.criteria[criterionName].ui) {
    return;
  }

  var data = this.getUiCriterionData(criterionName);
  if (typeof(data) === 'string') {
    this.criteria[criterionName].ui.setURL(data);
  } else {
    this.criteria[criterionName].ui.setData(data);
  }
}

AdsTargetingEditor.prototype.getUiCriterionDataRange = function(min, max, step, langValue, langValueAny) {
  if (min > max) return [];
  var data = [[0, langValueAny]];
  if (step < 0) {
    for (var i = max; i >= min; i += step)
    data.push([i, langNumeric(i, langValue)]);
  } else if (step > 0) {
    for (var i = min; i <= max; i += step)
    data.push([i, langNumeric(i, langValue)]);
  }
  return data;
}

AdsTargetingEditor.prototype.getUiCriterionDefaultData = function(criterionName) {
  switch (criterionName) {
    case 'groups':
    case 'apps':
      if (!this.criteria[criterionName].link_object_processed) {
        var defaultDataNew = [];
        if (this.criteria[criterionName].link_object_id) {
          var defaultDataCount = this.criteria[criterionName].defaultDataOriginal.length;
          var i = 0;
          var found = false;
          for ( ; i < defaultDataCount; i++) {
            var item = this.criteria[criterionName].defaultDataOriginal[i];
            if (item[0] == this.criteria[criterionName].link_object_id) {
              found = true;
              break;
            }
          }
          if (found) {
            if (i > 0) {
              defaultDataNew = defaultDataNew.concat(this.criteria[criterionName].defaultDataOriginal.slice(0, i));
            }
            if (i < defaultDataCount) {
              defaultDataNew = defaultDataNew.concat(this.criteria[criterionName].defaultDataOriginal.slice(i + 1, defaultDataCount));
            }
          } else {
            defaultDataNew = this.criteria[criterionName].defaultDataOriginal.slice();
          }
          defaultDataNew.unshift(this.criteria[criterionName].link_object_item);
        } else {
          defaultDataNew = this.criteria[criterionName].defaultDataOriginal.slice();
        }
        this.criteria[criterionName].link_object_processed = true;
        this.criteria[criterionName].defaultData = defaultDataNew;
      }
      break;
  }

  switch (criterionName) {
    case 'cities_not':
      return this.criteria['cities'].defaultData || [];
    case 'apps_not':
      return this.criteria['apps'].defaultData || [];
    case 'retargeting_groups_not':
      return this.criteria['retargeting_groups'].data || [];
    case 'country':
    case 'statuses':
    case 'interest_categories':
    case 'group_types':
    case 'religions':
    case 'districts':
    case 'stations':
    case 'streets':
    case 'schools':
    case 'operators':
    case 'browsers':
    case 'user_devices':
    case 'user_operating_systems':
    case 'user_browsers':
    case 'pays_money':
    case 'retargeting_groups':
      return this.criteria[criterionName].data || [];
    default:
      return this.criteria[criterionName].defaultData || [];
  }
}

AdsTargetingEditor.prototype.updateUiCriterionDefaultData = function(criterionName) {
  if (!('data' in this.criteria[criterionName])) { // No 'defaultData' here
    try { console.error("Can't update default data"); } catch (e) {}
    return;
  }

  if (!this.criteria[criterionName].ui) {
    return;
  }

  var defaultData = this.getUiCriterionDefaultData(criterionName);
  this.criteria[criterionName].ui.setOptions({defaultItems: defaultData});
}

AdsTargetingEditor.prototype.getUiCriterionSelectedData = function(criterionName) {
  switch (criterionName) {
    case 'country':
      return this.criteria[criterionName].value || 0;
    case 'statuses':
      return this.criteria[criterionName].value + '';
    default:
      if ('selectedData' in this.criteria[criterionName]) {
        return this.criteria[criterionName].selectedData || [];
      } else {
        return this.criteria[criterionName].value;
      }
  }
}

AdsTargetingEditor.prototype.updateUiCriterionSelectedData = function(criterionName) {
  if (!('data' in this.criteria[criterionName]) || ('selectedData' in this.criteria[criterionName])) {
    try { console.error("Can't update selected data"); } catch (e) {}
    return;
  }

  if (!this.criteria[criterionName].ui) {
    return;
  }

  var value = this.criteria[criterionName].value;
  if (!value) {
    return;
  }

  this.criteria[criterionName].ui.clear();
  each(value.split(','), function(key, value) {
    this.criteria[criterionName].ui.selectItem(value);
  }.bind(this));
}

AdsTargetingEditor.prototype.getUiCriterionEnabled = function(criterionName) {
  switch (criterionName) {
    case 'cities':
    case 'cities_not':
      return !!(this.criteria.country.value || this.criteria[criterionName].value);
    case 'districts':
    case 'stations':
      var citiesOnlyIds = this.getCitiesOnly();
      return !!(citiesOnlyIds && this.criteria[criterionName].data.length || this.criteria[criterionName].value);
    case 'streets':
    case 'schools':
      var citiesOnlyIds = this.getCitiesOnly();
      return !!(citiesOnlyIds || this.criteria[criterionName].value);
    default:
      return null;
  }
}

AdsTargetingEditor.prototype.updateUiCriterionEnabled = function(criterionName) {
  if (!('data' in this.criteria[criterionName])) {
    try { console.error("Can't update enabled state"); } catch (e) {}
    return;
  }

  this.updateUiCriterionVisibility(criterionName); // Should be before any ui.disable()

  if (this.criteria[criterionName].ui) {
    var enabled = this.getUiCriterionEnabled(criterionName);
    if (enabled !== null) {
      if (!this.criteria[criterionName].value) {
        this.criteria[criterionName].ui.disable(enabled); // Fix disabling introText
        this.criteria[criterionName].ui.disable(!enabled);
        this.criteria[criterionName].ui.clear(); // Fix placeholder
      }
    }
  }
}

AdsTargetingEditor.prototype.getUiCriterionVisibility = function(criterionName, checkCriterionValue) {

  checkCriterionValue = !!checkCriterionValue;

  var visible = null;
  if (visible !== false && 'allowed' in this.criteria[criterionName]) {
    visible = !!(this.criteria[criterionName].allowed);
  }
  if (visible !== false && 'hidden_more' in this.criteria[criterionName]) {
    visible = !!(!this.criteria[criterionName].hidden_more);
  }

  if (visible !== false) {
    switch (criterionName) {
      case 'districts':
      case 'stations':
        var citiesOnlyIds = this.getCitiesOnly();
        visible = !!(!citiesOnlyIds || this.criteria[criterionName].data.length);
        break;
      case 'schools':
        visible = !!(this.criteria.schools_type.value);
        break;
      case 'school_from':
      case 'school_to':
        visible = !!(this.criteria.schools_type.value == 1);
        break;
      case 'uni_from':
      case 'uni_to':
        visible = !!(this.criteria.schools_type.value == 2);
        break;
      case 'pays_money':
        var viewParams = this.viewEditor.getParams();
        visible = !!(this.criteria[criterionName].allowed_any || viewParams.link_type == 4);
        break;
      case 'retargeting_groups':
      case 'retargeting_groups_not':
        var viewParams = this.viewEditor.getParams();
        visible = !!(!this.criteria[criterionName].allowed_apps_only || viewParams.link_type == 4);
        break;
    }
  }

  if (visible === false && checkCriterionValue) {
    visible = !!(this.criteria[criterionName].value);
  }

  return visible;
}

AdsTargetingEditor.prototype.updateUiCriterionVisibility = function(criterionName) {

  var visible = this.getUiCriterionVisibility(criterionName, true);
  if (visible === null) {
    return;
  }

  this.criteria[criterionName].hidden = !visible;

  var rowName = (this.criteria[criterionName].row_name ? this.criteria[criterionName].row_name : criterionName);

  if (visible) {
    this.initUiCriterion(criterionName);
    show('ads_edit_criterion_row_' + rowName);
  } else if (!('dataInited' in this.criteria[criterionName]) || this.criteria[criterionName].dataInited) {
    hide('ads_edit_criterion_row_' + rowName);
  }
}

AdsTargetingEditor.prototype.getUiCriterionIntroText = function(criterionName) {
  switch (criterionName) {
    case 'cities':
    case 'cities_not':          return getLang('ads_starttypingname_city_region');
    case 'statuses':            return getLang('ads_select_marital');
    case 'interests':           return getLang('ads_starttypingname_interest');
    case 'interest_categories': return getLang('ads_select_interest_category');
    case 'group_types':         return getLang('ads_starttypingname_group');
    case 'groups':              return getLang('ads_type_group_public');
    case 'apps':                return getLang('ads_type_app_site');
    case 'apps_not':            return getLang('ads_type_app_site');
    case 'religions':           return getLang('ads_select_religion');
    case 'districts':
      var citiesOnlyIds = this.getCitiesOnly();
      if (!citiesOnlyIds) {
        return getLang('ads_first_select_city');
      } else if (this.criteria.districts.data.length) {
        return getLang('ads_starttypingname_district');
      } else {
        return getLang('ads_noinfo_districts');
      }
    case 'stations':
      var citiesOnlyIds = this.getCitiesOnly();
      if (!citiesOnlyIds) {
        return getLang('ads_first_select_city');
      } else if (this.criteria.stations.data.length) {
        return getLang('ads_starttypingname_station');
      } else {
        return getLang('ads_noinfo_stations');
      }
    case 'streets':
      var citiesOnlyIds = this.getCitiesOnly();
      if (citiesOnlyIds) {
        return getLang('ads_starttypingname_street');
      } else {
        return getLang('ads_first_select_city');
      }
    case 'schools':
      var citiesOnlyIds = this.getCitiesOnly();
      if (citiesOnlyIds) {
        return getLang('ads_starttypingname_school');
      } else {
        return getLang('ads_first_select_city');
      }
    case 'positions':              return getLang('ads_starttypingname_position');
    case 'operators':              return getLang('ads_select_mobile_operator');
    case 'browsers':               return getLang('ads_select_internet_browser');
    case 'user_devices':           return getLang('ads_select_user_device');
    case 'user_operating_systems': return getLang('ads_select_user_operating_system');
    case 'user_browsers':          return getLang('ads_select_user_browser');
    case 'retargeting_groups':     return getLang('ads_select_retargeting_group');
    case 'retargeting_groups_not': return getLang('ads_select_retargeting_group');
    default:                       return '';
  }
}

AdsTargetingEditor.prototype.updateUiCriterionIntroText = function(criterionName) {
  if (!('data' in this.criteria[criterionName])) {
    try { console.error("Can't update intro text"); } catch (e) {}
    return;
  }

  if (!this.criteria[criterionName].ui) {
    return;
  }

  var introText = this.getUiCriterionIntroText(criterionName);
  this.criteria[criterionName].ui.setOptions({introText: introText});
  this.updateUiCriterionDefaultData(criterionName); // Workaround to set introText
}

AdsTargetingEditor.prototype.getUiCriterionPlaceholderText = function(criterionName) {
  switch (criterionName) {
    case 'cities':
    case 'cities_not':             return getLang('ads_starttypingname_city_region');
    case 'statuses':               return getLang('ads_select_marital');
    case 'interests':              return getLang('ads_starttypingname_interest');
    case 'interest_categories':    return getLang('ads_select_interest_category');
    case 'group_types':            return getLang('ads_starttypingname_group');
    case 'groups':                 return getLang('ads_type_group_public');
    case 'apps':                   return getLang('ads_type_app_site');
    case 'apps_not':               return getLang('ads_type_app_site');
    case 'religions':              return getLang('ads_select_religion');
    case 'districts':              return getLang('ads_starttypingname_district');
    case 'stations':               return getLang('ads_starttypingname_station');
    case 'streets':                return getLang('ads_starttypingname_street');
    case 'schools':                return getLang('ads_starttypingname_school');
    case 'positions':              return getLang('ads_starttypingname_position');
    case 'operators':              return getLang('ads_select_mobile_operator');
    case 'browsers':               return getLang('ads_select_internet_browser');
    case 'user_devices':           return getLang('ads_select_user_device');
    case 'user_operating_systems': return getLang('ads_select_user_operating_system');
    case 'user_browsers':          return getLang('ads_select_user_browser');
    case 'retargeting_groups':     return getLang('ads_select_retargeting_group');
    case 'retargeting_groups_not': return getLang('ads_select_retargeting_group');
    default:                       return '';
  }
}

AdsTargetingEditor.prototype.getUiCriterionNoResultText = function(criterionName) {
  switch (criterionName) {
    case 'cities':
    case 'cities_not':             return getLang('ads_notfound_city');
    case 'statuses':               return getLang('ads_notfound_marital');
    case 'interests':              return getLang('ads_notfound_interest');
    case 'interest_categories':    return getLang('ads_notfound_interest_category');
    case 'group_types':
    case 'groups':                 return getLang('ads_notfound_group');
    case 'apps':                   return getLang('ads_notfound_app');
    case 'apps_not':               return getLang('ads_notfound_app');
    case 'religions':              return getLang('ads_notfound_religion');
    case 'districts':              return getLang('ads_notfound_district');
    case 'stations':               return getLang('ads_notfound_station');
    case 'streets':                return getLang('ads_notfound_street');
    case 'schools':                return getLang('ads_notfound_school');
    case 'positions':              return getLang('ads_notfound_position');
    case 'operators':              return getLang('ads_notfound_mobile_operator');
    case 'browsers':               return getLang('ads_notfound_internet_browser');
    case 'user_devices':           return getLang('ads_notfound_user_device');
    case 'user_operating_systems': return getLang('ads_notfound_user_operating_system');
    case 'user_browsers':          return getLang('ads_notfound_user_browser');
    case 'retargeting_groups':     return getLang('ads_notfound_retargeting_groups');
    case 'retargeting_groups_not': return getLang('ads_notfound_retargeting_groups');
    default:                       return '';
  }
}

AdsTargetingEditor.prototype.getUiCriterionDisabledText = function(criterionName) {
  switch (criterionName) {
    case 'cities':
    case 'cities_not': return getLang('ads_first_select_country');
    case 'districts':
    case 'stations':
    case 'streets':    return getLang('ads_first_select_city');
    case 'schools':
      if (this.criteria.schools_type.value == 1) {
        return getLang('ads_first_select_city_for_school');
      } else {
        return getLang('ads_first_select_city_for_university');
      }
    default: return '';
  }
}

AdsTargetingEditor.prototype.updateUiCriterionDisabledText = function(criterionName) {
  if (!('data' in this.criteria[criterionName])) {
    try { console.error("Can't update disabled text"); } catch (e) {}
    return;
  }

  if (!this.criteria[criterionName].ui) {
    return;
  }

  var disabledText = this.getUiCriterionDisabledText(criterionName);
  this.criteria[criterionName].ui.setOptions({disabledText: disabledText});
}

AdsTargetingEditor.prototype.correctCriterion = function(criterionName) {

  if (!this.criteria[criterionName].uiInited) {
    return;
  }

  var visible = this.getUiCriterionVisibility(criterionName, false);
  if (visible !== false) {
    return;
  }

  switch (criterionName) {
    case 'schools':
    case 'school_from':
    case 'school_to':
    case 'uni_from':
    case 'uni_to':
      if (this.criteria[criterionName].value != '') {
        this.onCriterionUpdate(criterionName, '', false, true);
        if (this.criteria[criterionName].value == '') {
          this.criteria[criterionName].ui.clear();
        }
      }
      break;
    case 'pays_money':
      if (this.criteria[criterionName].value != 0) {
        this.onCriterionUpdate(criterionName, 0, false, true);
        this.criteria[criterionName].ui.selectItem(this.criteria[criterionName].value);
      }
      break;
    case 'retargeting_groups':
    case 'retargeting_groups_not':
      if (this.criteria[criterionName].value != '') {
        this.onCriterionUpdate(criterionName, '', false, true);
        if (this.criteria[criterionName].value == '') {
          this.criteria[criterionName].ui.clear();
        }
      }
      break;
  }
}

AdsTargetingEditor.prototype.onCriterionUpdate = function(criterionName, criterionValue, forceDataUpdate, delayed) {

  if (!delayed) {
    setTimeout(function() {
      this.onCriterionUpdate(criterionName, criterionValue, forceDataUpdate, true);
    }.bind(this), 1);
    return;
  }

  var isUpdateNeeded = null;
  do {
    var criterionValueOld = this.criteria[criterionName].value;

    if (typeof(this.criteria[criterionName].value) === 'number' && intval(this.criteria[criterionName].value) == this.criteria[criterionName].value) {
      criterionValue = intval(criterionValue);
    }

    if (criterionName === 'tags') {
      criterionValue = AdsEdit.unescapeValue(criterionValue);
    }

    if (this.criteria[criterionName].value === criterionValue) {
      break;
    }

    this.criteria[criterionName].value = criterionValue;

    //debugLog(criterionName + ' updated: ' + criterionValueOld + ' => ' + this.criteria[criterionName].value);

    switch (criterionName) {
      case 'country':
        this.criteria.cities.defaultData = [];
        this.criteria.cities_not.defaultData = [];
        this.updateUiCriterionData('cities');
        this.updateUiCriterionData('cities_not');
        this.updateUiCriterionDefaultData('cities');
        this.updateUiCriterionDefaultData('cities_not');
        this.updateUiCriterionEnabled('cities');
        this.updateUiCriterionEnabled('cities_not');
        if (this.criteria.country.value) {
          this.updateNeeded.need_cities_data = true;
        }
        break;
      case 'cities':
        var citiesOnlyIds = this.getCitiesOnly();
        if (citiesOnlyIds) {
          this.criteria.districts.dataInited = false;
          this.criteria.stations.dataInited = false;
        } else {
          this.criteria.districts.data = [];
          this.criteria.stations.data = [];
          this.updateUiCriterionData('districts');
          this.updateUiCriterionData('stations');
        }
        this.updateUiCriterionData('streets'); // Update URL
        this.updateUiCriterionData('schools'); // Update URL
        this.updateUiCriterionIntroText('districts');
        this.updateUiCriterionIntroText('stations');
        this.updateUiCriterionIntroText('streets');
        this.updateUiCriterionIntroText('schools');
        this.updateUiCriterionEnabled('cities');
        this.updateUiCriterionEnabled('districts');
        this.updateUiCriterionEnabled('stations');
        this.updateUiCriterionEnabled('streets');
        this.updateUiCriterionEnabled('schools');
        if (citiesOnlyIds) {
          this.updateNeeded.need_districts_data = true;
          this.updateNeeded.need_stations_data = true;
        }
        break;
      case 'cities_not':
        this.updateUiCriterionEnabled(criterionName);
        break;
      case 'sex':
        this.updateUiCriterionData('statuses');
        this.updateUiCriterionSelectedData('statuses');
        break;
      case 'districts':
      case 'stations':
      case 'streets':
      case 'schools':
        this.updateUiCriterionEnabled(criterionName);
        break;
      case 'schools_type':
        this.updateUiCriterionDisabledText('schools');
        this.updateUiCriterionData('schools');
        this.correctCriterion('schools');
        this.correctCriterion('school_from');
        this.correctCriterion('school_to');
        this.correctCriterion('uni_from');
        this.correctCriterion('uni_to');
        this.updateUiCriterionVisibility('schools');
        this.updateUiCriterionVisibility('school_from');
        this.updateUiCriterionVisibility('school_to');
        this.updateUiCriterionVisibility('uni_from');
        this.updateUiCriterionVisibility('uni_to');
        break;
      case 'age_from':
        this.updateUiCriterionData('age_to');
        break;
      case 'age_to':
        this.updateUiCriterionData('age_from');
        break;
      case 'school_from':
        this.updateUiCriterionData('school_to');
        break;
      case 'school_to':
        this.updateUiCriterionData('school_from');
        break;
      case 'uni_from':
        this.updateUiCriterionData('uni_to');
        break;
      case 'uni_to':
        this.updateUiCriterionData('uni_from');
        break;
      case 'tags':
        var remainElem = ge(this.options.targetIdPrefix + criterionName + '_remain_length');
        var remainLength = this.criteria[criterionName].max_length - this.criteria[criterionName].value.length;
        if (remainLength < this.criteria[criterionName].max_length * 0.3) {
          show(this.options.targetIdPrefix + criterionName + '_remain');
        }
        remainElem.innerHTML = remainLength;
      isUpdateNeeded = false;
        break;
    }

    if (isUpdateNeeded === null) {
      isUpdateNeeded = true;
    }
  } while (false);

  if (isUpdateNeeded || forceDataUpdate) {
    this.needDataUpdate();
  }
}

AdsTargetingEditor.prototype.onUiSelect = function(criterionName, criterionValue) {
  this.onCriterionUpdate(criterionName, criterionValue);
}

AdsTargetingEditor.prototype.onUiChange = function(criterionName, criterionValue) {
  switch (criterionName) {
    case 'country':
      var criterionValueInt = intval(criterionValue);
      if (criterionValueInt == -1) {
        this.criteria.country.ui.val(0);
        this.updateNeeded.need_country_data = true;
        this.onCriterionUpdate('country', 0, true);
        return;
      } else if (criterionValueInt == 0) {
        this.criteria.country.ui.val(0);
      }
      break;
    case 'birthday_today':
      var newValue = this.criteria.birthday.value;
      newValue &= (-1 ^ (1 << 0));
      newValue |= (intval(criterionValue) && (1 << 0));
      this.onCriterionUpdate('birthday', newValue);
      return;
    case 'birthday_tomorrow':
      var newValue = this.criteria.birthday.value;
      newValue &= (-1 ^ (1 << 1));
      newValue |= (intval(criterionValue) && (1 << 1));
      this.onCriterionUpdate('birthday', newValue);
      return;
    case 'birthday_week':
      var newValue = this.criteria.birthday.value;
      newValue &= (-1 ^ (1 << 2));
      newValue |= (intval(criterionValue) && (1 << 2));
      this.onCriterionUpdate('birthday', newValue);
      setTimeout(updateBirhday.bind(this, newValue), 1);
      return;
  }

  this.onCriterionUpdate(criterionName, criterionValue);

  function updateBirhday(newValue) {
    var isCheckedToday    = !!(newValue & (1 << 0));
    var isCheckedTomorrow = !!(newValue & (1 << 1));
    var isCheckedWeek     = !!(newValue & (1 << 2));
    if (isCheckedWeek && !isCheckedToday) {
      this.criteria.birthday.ui_today.checked(true);
    }
    if (isCheckedWeek && !isCheckedTomorrow) {
      this.criteria.birthday.ui_tomorrow.checked(true);
    }
    this.criteria.birthday.ui_today.disable(isCheckedWeek);
    this.criteria.birthday.ui_tomorrow.disable(isCheckedWeek);
  }
}

AdsTargetingEditor.prototype.onUiTagAdd = function(criterionName, criterionValue, criterionTag) {
  switch (criterionName) {
    case 'cities':
      setTimeout(function(){
        this.criteria.cities_not.ui.removeTagData(criterionTag[0]);
      }.bind(this), 1);
      break;
    case 'cities_not':
      setTimeout(function(){
        this.criteria.cities.ui.removeTagData(criterionTag[0]);
      }.bind(this), 1);
      break;
    case 'apps':
      setTimeout(function(){
        this.criteria.apps_not.ui.removeTagData(criterionTag[0]);
      }.bind(this), 1);
      break;
    case 'apps_not':
      setTimeout(function(){
        this.criteria.apps.ui.removeTagData(criterionTag[0]);
      }.bind(this), 1);
      break;
    case 'retargeting_groups':
      setTimeout(function(){
        this.criteria.retargeting_groups_not.ui.removeTagData(criterionTag[0]);
      }.bind(this), 1);
      break;
    case 'retargeting_groups_not':
      setTimeout(function(){
        this.criteria.retargeting_groups.ui.removeTagData(criterionTag[0]);
      }.bind(this), 1);
      break;
  }

  this.onCriterionUpdate(criterionName, criterionValue);
}

AdsTargetingEditor.prototype.onUiTagRemove = function(criterionName, criterionValue, criterionTag) {
  this.onCriterionUpdate(criterionName, criterionValue);
}

AdsTargetingEditor.prototype.onUiEvent = function(criterionName, event) {
  switch (criterionName) {
    case 'group_geography_more':
      this.showGroupMore('geography');
      return false;
      break;
    case 'group_geography_less':
      this.hideGroupMore('geography');
      return false;
      break;
    case 'group_interests_more':
      this.showGroupMore('interests');
      return false;
      break;
    case 'group_interests_less':
      this.hideGroupMore('interests');
      return false;
      break;
    case 'tags':
      var targetElem = ge(this.options.targetIdPrefix + criterionName);
      var criterionValueOriginal = targetElem.value;
      var criterionValue = this.correctInvalidValue(criterionName, criterionValueOriginal);
      if (criterionValue !== criterionValueOriginal) {
        targetElem.value = criterionValue;
      }
      if (browser.msie && event.type === 'paste') {
        targetElem.blur();
        targetElem.focus();
      }

      // setTimeout at least for IE
      setTimeout(function() {
        var targetElem = ge(this.options.targetIdPrefix + criterionName);
        if (targetElem) {
          var criterionValue = this.correctInvalidValue(criterionName, targetElem.value);
          this.onCriterionUpdate(criterionName, criterionValue);
        }
      }.bind(this), 100);
      break;
  }

  return true;
}

AdsTargetingEditor.prototype.needDataUpdate = function() {
  if (!this.getUpdatedData) {
    return;
  }
  var criteria = this.getCriteria();
  var data = extend({}, criteria, this.updateNeeded);
  var force = !isEmpty(this.updateNeeded);
  this.updateNeeded = {};
  this.getUpdatedData(data, force);
}

AdsTargetingEditor.prototype.correctInvalidValue = function(criterionName, criterionValue) {
  criterionValue = criterionValue.substr(0, this.criteria[criterionName].max_length);
  return criterionValue;
}

AdsTargetingEditor.prototype.getCitiesOnly = function(groupName) {
  var citiesIdsStr = '';
  if (this.criteria.cities.value) {
    var citiesIdsAll = this.criteria.cities.value.split(',');
    var citiesIds = [];
    for (var i in citiesIdsAll) {
      if (citiesIdsAll[i] > 0) {
        citiesIds.push(citiesIdsAll[i]);
      }
    }
    citiesIdsStr = citiesIds.join(',');
  }
  return citiesIdsStr;
}

AdsTargetingEditor.prototype.getCriteria = function() {
  var criteria = {};
  for (var criterionName in this.criteria) {
    criteria[criterionName] = this.criteria[criterionName].value;
  }
  return criteria;
}

AdsTargetingEditor.prototype.showGroup = function(groupName) {
  var group = this.targetingGroups[groupName];
  if (!group) {
    return;
  }
  for (var criterionNameIndex in group['criteria']) {
    var criterionName = group['criteria'][criterionNameIndex];
    this.initUiCriterion(criterionName);
  }
  this.initUiGroup(groupName);
}

AdsTargetingEditor.prototype.showGroupEnd = function(groupName) {
  var group = this.targetingGroups[groupName];
  if (!group) {
    return;
  }
  for (var criterionNameIndex in group['criteria']) {
    var criterionName = group['criteria'][criterionNameIndex];
    if (this.criteria[criterionName] && ('data' in this.criteria[criterionName])) {
      this.updateUiCriterionEnabled(criterionName); // Fix disabling introText
    }
  }
}

AdsTargetingEditor.prototype.showGroupMore = function(groupName) {
  var group = this.targetingGroups[groupName];
  if (!group) {
    return;
  }
  hide('ads_edit_targeting_group_' + groupName + '_more_row');
  show('ads_edit_targeting_group_' + groupName + '_less_row');
  for (var criterionNameIndex in group['criteria_more']) {
    var criterionName = group['criteria_more'][criterionNameIndex];
    this.criteria[criterionName].hidden_more = false;
  }
  for (var criterionNameIndex in group['criteria_more']) {
    var criterionName = group['criteria_more'][criterionNameIndex];
    this.updateUiCriterionVisibility(criterionName);
  }
  for (var criterionNameIndex in group['criteria_more']) {
    var criterionName = group['criteria_more'][criterionNameIndex];
    this.initUiCriterion(criterionName);
  }
}

AdsTargetingEditor.prototype.hideGroupMore = function(groupName) {
  var group = this.targetingGroups[groupName];
  if (!group) {
    return;
  }
  show('ads_edit_targeting_group_' + groupName + '_more_row');
  hide('ads_edit_targeting_group_' + groupName + '_less_row');
  for (var criterionNameIndex in group['criteria_more']) {
    var criterionName = group['criteria_more'][criterionNameIndex];
    this.criteria[criterionName].hidden_more = true;
  }
  for (var criterionNameIndex in group['criteria_more']) {
    var criterionName = group['criteria_more'][criterionNameIndex];
    this.updateUiCriterionVisibility(criterionName);
  }
}

AdsTargetingEditor.prototype.setUpdateDataHandler = function(getUpdatedData) {
  this.getUpdatedData = getUpdatedData;
}

AdsTargetingEditor.prototype.setUpdateData = function(data, result) {
  var setResult = true;

  if (data['need_country_data']) {
    if (result['country_data']) {
      this.criteria.country.data = result['country_data'];
      this.updateUiCriterionData('country');
      this.updateUiCriterionDefaultData('country');
    } else {
      setResult = false;
    }
  }

  if (data['need_cities_data']) {
    if (isObject(result) && 'cities_data' in result) {
      if (data.country == this.criteria.country.value) {
        this.criteria.cities.defaultData = result['cities_data'];
        this.criteria.cities_not.defaultData = result['cities_data'];
        this.updateUiCriterionDefaultData('cities');
        this.updateUiCriterionDefaultData('cities_not');
      }
    } else {
      setResult = false;
    }
  }

  if (data['need_districts_data']) {
    if (isObject(result) && 'districts_data' in result) {
      if (data.cities == this.criteria.cities.value) {
        this.criteria.districts.data = result['districts_data'];
        this.criteria.districts.dataInited = true;
        this.updateUiCriterionData('districts');
        this.updateUiCriterionIntroText('districts');
        this.updateUiCriterionEnabled('districts');
      }
    } else {
      setResult = false;
    }
  }

  if (data['need_stations_data']) {
    if (isObject(result) && 'stations_data' in result) {
      if (data.cities == this.criteria.cities.value) {
        this.criteria.stations.data = result['stations_data'];
        this.criteria.stations.dataInited = true;
        this.updateUiCriterionData('stations');
        this.updateUiCriterionIntroText('stations');
        this.updateUiCriterionEnabled('stations');
      }
    } else {
      setResult = false;
    }
  }

  if (data['need_link_object']) {
    if (isObject(result) && 'groups_link_object_id' in result && 'groups_link_object_item' in result && result.groups_link_object_id != 0) {
      if (result.groups_link_object_id != this.criteria.groups.link_object_id) {
        this.criteria.groups.link_object_id        = result.groups_link_object_id;
        this.criteria.groups.link_object_item      = result.groups_link_object_item;
        this.criteria.groups.link_object_processed = false;
        this.updateUiCriterionDefaultData('groups');
      }
    } else {
      this.criteria.groups.link_object_id        = 0;
      this.criteria.groups.link_object_item      = null;
      this.criteria.groups.link_object_processed = false;
      this.updateUiCriterionDefaultData('groups');
    }
    if (isObject(result) && 'apps_link_object_id' in result && 'apps_link_object_item' in result && result.apps_link_object_id != 0) {
      if (result.apps_link_object_id != this.criteria.apps.link_object_id) {
        this.criteria.apps.link_object_id        = result.apps_link_object_id;
        this.criteria.apps.link_object_item      = result.apps_link_object_item;
        this.criteria.apps.link_object_processed = false;
        this.updateUiCriterionDefaultData('apps');
        this.updateUiCriterionDefaultData('apps_not');
      }
    } else {
      this.criteria.apps.link_object_id        = 0;
      this.criteria.apps.link_object_item      = null;
      this.criteria.apps.link_object_processed = false;
      this.updateUiCriterionDefaultData('apps');
      this.updateUiCriterionDefaultData('apps_not');
    }
  }

  return setResult;
}

try{stManager.done('ads_edit.js');}catch(e){}
