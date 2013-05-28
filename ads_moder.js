var AdsModer = {};

AdsModer.init = function() {
  AdsModer.initDelayedImages();
}

AdsModer.initDelayedImages = function() {
  var imagesAll = geByTag('img');
  var imagesIndex = {};
  var indexStep = 500;

  var image;
  var indexKey;
  for (var i = 0, len = imagesAll.length; i < len; i++) {
    image = imagesAll[i];
    if (!image.hasAttribute('src_')) {
      continue;
    }
    indexKey = intval(getXY(image)[1] / indexStep);
    if (!(indexKey in imagesIndex)) {
      imagesIndex[indexKey] = [];
    }
    imagesIndex[indexKey].push(image);
  }

  if (isEmpty(imagesIndex)) {
    return;
  }

  function onScroll() {
    var yTop        = scrollGetY()
    var yBottom     = yTop + lastWindowHeight;
    var indexTop    = intval(yTop / indexStep);
    var indexBottom = intval(yBottom / indexStep);
    var image;
    var isUpdated = false;
    for (var i = indexTop; i <= indexBottom; i++) {
      if (!(i in imagesIndex)) {
        continue;
      }
      for (var j = 0, len = imagesIndex[i].length; j < len; j++) {
        image = imagesIndex[i][j];
        image.src = image.getAttribute('src_');
        image.removeAttribute('src_')
        isUpdated = true;
      }
      delete imagesIndex[i];
    }
    if (!isUpdated) {
      for (var i in imagesIndex) {
        image = imagesIndex[i].pop();
        image.src = image.getAttribute('src_');
        image.removeAttribute('src_');
        if (!imagesIndex[i].length) {
          delete imagesIndex[i];
        }
        break;
      }
    }
    if (isEmpty(imagesIndex)) {
      deinit();
    }
  }

  var scrolledNode = browser.msie6 ? pageNode : window;
  function deinit() {
    removeEvent(scrolledNode, 'scroll', onScroll);
  }
  cur.destroy.push(deinit);
  addEvent(scrolledNode, 'scroll', onScroll);
  onScroll();
}

AdsModer.showObjectInfo = function(objectType, objectId) {
  var ajaxParams = {};
  ajaxParams.object_type = objectType;
  ajaxParams.object_id   = objectId;

  var showOptions = {params: {}};

  showBox('/adsmoder?act=object_info', ajaxParams, showOptions);
}

AdsModer.openFeaturesEditBox = function(unionId, hash, featuresInfo, featuresEditHtml) {
  var editBox = showFastBox({title: 'Возможности', width: 550}, featuresEditHtml);
  var saveFeaturesHandler = AdsModer.saveFeatures.pbind(unionId, hash, featuresInfo, editBox);
  editBox.removeButtons();
  editBox.addButton(getLang('box_cancel'), false, 'no');
  editBox.addButton('Изменить', saveFeaturesHandler, 'yes');

  for (var i in featuresInfo) {
    var featureInfo = featuresInfo[i];
    new Checkbox(ge('ads_moder_feature_' + featureInfo.key), {
      label: featureInfo.name,
      checked: intval(featureInfo.value),
      width: 500
    });
  }
}

AdsModer.saveFeatures = function(unionId, hash, featuresInfo, editBox) {
  if (!Ads.lock('saveFeatures', onLock, onUnlock)) {
    return;
  }

  var ajaxParams = {};
  ajaxParams.union_id = unionId;
  ajaxParams.hash = hash;
  ajaxParams.features = [];
  for (var i in featuresInfo) {
    var featureInfo = featuresInfo[i];
    ajaxParams.features.push(featureInfo.key + ':' + intval(ge('ads_moder_feature_' + featureInfo.key).value));
  }
  ajaxParams.features = ajaxParams.features.join(',');

  ajax.post('/adsmoder?act=a_edit_features', ajaxParams, {onDone: onComplete, onFail: onComplete});

  function onComplete(response) {
    Ads.unlock('saveFeatures');
    if (response && response.ok) {
      nav.reload();
    } else {
      showFastBox('Ошибка', 'Ошибка');
    }
    return true;
  }
  function onLock() {
    editBox.showProgress();
  }
  function onUnlock() {
    editBox.hide();
  }
}

AdsModer.openNoteEditBox = function(objectId, noteType, noteText, hash, editActionText, isEdit) {
  function onBoxHide() {
    delete cur.noteEditBox;
    delete cur.noteEditBoxContext;
  }

  cur.noteEditBoxContext = {};
  cur.noteEditBoxContext.hash = hash;
  cur.noteEditBoxContext.objectId = objectId;
  cur.noteEditBoxContext.noteType = noteType;

  var boxHtml = '<div style="margin-right: 8px;"><div><textarea id="ads_note_edit" style="width: 100%; height: 100px;">' + noteText + '</textarea></div></div>';

  cur.noteEditBox = showFastBox({title: 'Заметки', width: 400, onHide: onBoxHide}, boxHtml, editActionText, function() { AdsModer.saveNote(); }, getLang('box_cancel'));
  if (isEdit) {
    cur.noteEditBox.setControlsText('<a href="#" onclick="AdsModer.saveNote(true); return false;">Удалить</a>');
  }
}

AdsModer.saveNote = function(isDelete) {
  if (!Ads.lock('save_note', onLock, onUnlock)) {
    return;
  }

  var ajaxParams = {};
  ajaxParams.hash      = cur.noteEditBoxContext.hash;
  ajaxParams.object_id = cur.noteEditBoxContext.objectId;
  ajaxParams.note_type = cur.noteEditBoxContext.noteType;
  ajaxParams.note_text = (isDelete ? '' : ge('ads_note_edit').value);
  ajax.post('/adsmoder?act=a_edit_notes', ajaxParams, {onDone: onComplete, onFail: onComplete});

  function onComplete(response) {
    Ads.unlock('save_note');
    if (response && response.ok) {
      nav.reload();
    } else {
      showFastBox({title: 'Ошибка', onHide: function() { nav.reload(); }}, 'Ошибка');
    }
    return true;
  }
  function onLock() {
    cur.noteEditBox.showProgress();
  }
  function onUnlock() {
    cur.noteEditBox.hide();
  }
}

AdsModer.openCategoriesEditBox = function(requestKey, linkElem) {
  var editBox = showFastBox({title: 'Изменение тематики объявления', width: 420}, cur.categoriesEditBoxHtml);
  editBox.removeButtons();
  editBox.addButton(getLang('box_cancel'), false, 'no');
  editBox.addButton('Изменить', applyChanges, 'yes');

  var requestParams = cur.requestsParams[requestKey];

  var category1_id    = requestParams.ui_category1_id;
  var category2_id    = requestParams.ui_category2_id;
  var subcategory1_id = requestParams.ui_subcategory1_id;
  var subcategory2_id = requestParams.ui_subcategory2_id;

  var uiCategory1 = new Dropdown(ge('ads_moder_category1'), cur.categoriesData, {
    selectedItems: category1_id,
    width:         250,
    height:        400,
    onChange:      onChangeCategory1
  });
  var uiCategory2 = new Dropdown(ge('ads_moder_category2'), cur.categoriesData, {
    selectedItems: category2_id,
    width:         250,
    height:        400,
    onChange:      onChangeCategory2
  });
  var uiSubcategory1 = new Dropdown(ge('ads_moder_subcategory1'), [], {
    width:    250,
    height:   400,
    onChange: function(value) {
      subcategory1_id = intval(value);
    }
  });
  var uiSubcategory2 = new Dropdown(ge('ads_moder_subcategory2'), [], {
    width:    250,
    height:   400,
    onChange: function(value) {
      subcategory2_id = intval(value);
    }
  });

  onChangeCategory1(category1_id);
  onChangeCategory2(category2_id);

  var boxOptions = {};
  boxOptions.onClean = function() {
    uiCategory1.destroy();
    uiCategory2.destroy();
    uiSubcategory1.destroy();
    uiSubcategory2.destroy();
  };
  editBox.setOptions(boxOptions);

  function onChangeCategory1(value) {
    value = intval(value);
    if (value != category1_id) {
      subcategory1_id = 0;
    }
    category1_id = value;
    var data = cur.subcategoriesData[value] || [];
    var disabledText = (value ? getLang('ads_no_subcategories') : getLang('ads_first_select_category1'));
    uiSubcategory1.setOptions({disabledText: disabledText});
    uiSubcategory1.setData(data);
    if (subcategory1_id) {
      uiSubcategory1.val(subcategory1_id);
    } else {
      uiSubcategory1.clear();
    }
    uiSubcategory1.disable(data.length == 0);
  }
  function onChangeCategory2(value) {
    value = intval(value);
    if (value != category2_id) {
      subcategory2_id = 0;
    }
    category2_id = value;
    var data = cur.subcategoriesData[value] || [];
    var disabledText = (value ? getLang('ads_no_subcategories') : getLang('ads_first_select_category2'));
    uiSubcategory2.setOptions({disabledText: disabledText});
    uiSubcategory2.setData(data);
    if (subcategory2_id) {
      uiSubcategory2.val(subcategory2_id);
    } else {
      uiSubcategory2.clear();
    }
    uiSubcategory2.disable(data.length == 0);
  }
  function applyChanges() {
    if (!category1_id && !category2_id) {
      showFastBox('Ошибка', 'Не задана тематика.');
      return;
    }

    cur.requestsParams[requestKey].category1_id       = (subcategory1_id || category1_id);
    cur.requestsParams[requestKey].category2_id       = (subcategory2_id || category2_id);
    cur.requestsParams[requestKey].ui_category1_id    = category1_id;
    cur.requestsParams[requestKey].ui_category2_id    = category2_id;
    cur.requestsParams[requestKey].ui_subcategory1_id = subcategory1_id;
    cur.requestsParams[requestKey].ui_subcategory2_id = subcategory2_id;
    cur.requestsParams[requestKey].categories_changed = true;

    var category1Elem       = geByClass1('ads_category1', linkElem);
    var category1ParentElem = geByClass1('ads_category1_parent', linkElem);
    if (subcategory1_id) {
      replaceClass(category1Elem, 'ads_category', 'ads_subcategory');
      category1Elem.innerHTML = uiSubcategory1.val_full()[1];
      category1ParentElem.innerHTML = ' (' + uiCategory1.val_full()[1] + ')';
    } else {
      replaceClass(category1Elem, 'ads_subcategory', 'ads_category');
      category1Elem.innerHTML = (category1_id ? uiCategory1.val_full()[1] : '');
      category1ParentElem.innerHTML = '';
    }

    var category2Elem       = geByClass1('ads_category2', linkElem);
    var category2ParentElem = geByClass1('ads_category2_parent', linkElem);
    if (subcategory2_id) {
      replaceClass(category2Elem, 'ads_category', 'ads_subcategory');
      category2Elem.innerHTML = uiSubcategory2.val_full()[1];
      category2ParentElem.innerHTML = ' (' + uiCategory2.val_full()[1] + ')';
    } else {
      replaceClass(category2Elem, 'ads_subcategory', 'ads_category');
      category2Elem.innerHTML = (category2_id ? uiCategory2.val_full()[1] : '');
      category2ParentElem.innerHTML = '';
    }

    editBox.hide();
  }
}

AdsModer.premoderationProcessRequest = function(action, requestKey, requestKeyModer, onCompleteExternal) {

  var requestParams      = cur.requestsParams[requestKey];
  var requestParamsModer = cur.requestsParams[requestKeyModer];

  if (!requestKey || !requestKeyModer || !requestParams || !requestParamsModer) {
    return;
  }

  var result = AdsModer.premoderationProcessRequestsMassCheck(action, requestKey);
  if (result) {
    return;
  }

  var moderComment = ge('moder_comment_' + requestKeyModer);
  var resultArea   = ge('request_result_area_' + requestKey);

  var ajaxParams = {};
  ajaxParams.action       = action;
  ajaxParams.request_id   = requestParams.request_id;
  ajaxParams.ad_id        = requestParams.ad_id;
  ajaxParams.hash         = requestParams.hash;
  ajaxParams.checksum     = requestParams.checksum_all;

  if (action === 'approve') {
    if (requestParamsModer.categories_changed) {
      ajaxParams.category1_id = requestParamsModer.category1_id;
      ajaxParams.category2_id = requestParamsModer.category2_id;
    } else {
      ajaxParams.category1_id = requestParams.category1_id;
      ajaxParams.category2_id = requestParams.category2_id;
    }
  }

  ajaxParams.moder_comment = moderComment.getValue();
  if (action === 'disapprove') {
    ajaxParams.moder_rules = cur.uiReasonsControls[requestKeyModer].getSelectedItems().join(',');
  }

  resultArea.innerHTML = '<img src="/images/upload.gif" />';

  ajax.post('/adsmoder?act=a_premoderation_process', ajaxParams, {onDone: onComplete, onFail: onComplete});

  function onComplete(response) {
    var responseText = ((response && response.text) ? response.text : 'Ошибка!');
    resultArea.innerHTML = responseText;
    if (isFunction(onCompleteExternal)) {
      onCompleteExternal(response, requestKey, responseText);
    }
    return true;
  };
}

AdsModer.premoderationProcessRequestsMassCheck = function(action, requestKey) {

  var requestParams = cur.requestsParams[requestKey];

  var requestsKeys = [];

  if (action === 'approve') {
    if (requestParams.categories_changed) {
      if (cur.requestsChecksumsApproveWithoutCategories[requestParams.checksum_approve_without_categories].length < 5) {
        return false;
      }
      requestsKeys = cur.requestsChecksumsApproveWithoutCategories[requestParams.checksum_approve_without_categories];
    } else {
      if (cur.requestsChecksumsApproveWithCategories[requestParams.checksum_approve_with_categories].length < 5) {
        return false;
      }
      requestsKeys = cur.requestsChecksumsApproveWithCategories[requestParams.checksum_approve_with_categories];
    }
  } else if (action === 'disapprove') {
    if (cur.requestsChecksumsDisapprove[requestParams.checksum_disapprove].length < 5) {
      return false;
    }
    requestsKeys = cur.requestsChecksumsDisapprove[requestParams.checksum_disapprove];
  }

  var confirmTitle   = ((action === 'approve') ? 'Массовое одобрение' : 'Массовое отклонение');
  var confirmText    = 'Похожих объявлений на текущей странице: '+requestsKeys.length;
  var processAllText = ((action === 'approve') ? 'Одобрить все' : 'Отклонить все');
  var processOneText = ((action === 'approve') ? 'Одобрить одно' : 'Отклонить одно');

  var box = showFastBox(confirmTitle, cur.massBoxHtml, processAllText, processAll, processOneText, processOne);
  geByClass1('ads_premoderation_mass_confirm_text', box.bodyNode).innerHTML = confirmText;

  return true;

  function processAll() {
    cleanChecksums();
    AdsModer.premoderationProcessRequestsMass(action, requestKey, requestsKeys, box);
  }
  function processOne() {
    cleanChecksums();
    box.hide();
    AdsModer.premoderationProcessRequest(action, requestKey, requestKey);
  }
  function cleanChecksums() {
    cur.requestsChecksumsApproveWithCategories[requestParams.checksum_approve_with_categories] = [];
    cur.requestsChecksumsApproveWithoutCategories[requestParams.checksum_approve_without_categories] = [];
    cur.requestsChecksumsDisapprove[requestParams.checksum_disapprove] = [];
  }
}

AdsModer.premoderationProcessRequestsMass = function(action, requestKeyModer, requestsKeys, box) {
  var requestParams = cur.requestsParams[requestKeyModer];

  var totalCount       = requestsKeys.length;
  var completeCount    = 0;
  var approvedCount    = 0;
  var disapprovedCount = 0;
  var errorCount       = 0;
  var responseInfos    = [];

  box.removeButtons();
  box.addButton(getLang('box_close'), false, 'yes');

  var progressWrapElem = geByClass1('ads_premoderation_mass_progress_wrap2', box.bodyNode);
  var progressElem     = geByClass1('ads_gradient_progress', box.bodyNode);
  var resultElem       = geByClass1('ads_premoderation_mass_result', box.bodyNode);
  var resultTextElem   = geByClass1('ads_premoderation_mass_result_text', box.bodyNode);
  var resultMoreElem   = geByClass1('ads_premoderation_mass_result_more', box.bodyNode);
  drawProgress();
  show(progressWrapElem);

  for (var i = 0; requestKey = requestsKeys[i]; i++) {
    AdsModer.premoderationProcessRequest(action, requestKey, requestKeyModer, onComplete);
  }

  function onComplete(response, responseRequestKey, responseText) {
    var responseAdId = cur.requestsParams[responseRequestKey].ad_id;
    responseInfos.push('<a href="/ads?act=office&union_id='+responseAdId+'" target="_blank">'+responseAdId+' - '+responseText+'</a>');

    if (response && (response.approved || response.disapproved)) {
      if (response.approved) {
        approvedCount++;
      }
      if (response.disapproved) {
        disapprovedCount++;
      }
    } else {
      errorCount++;
    }
    completeCount++;

    drawProgress();
    if (completeCount == totalCount) {
      setTimeout(drawResults, 1000);
    }
  }
  function drawProgress() {
    var percent = intval(completeCount / totalCount * 100);
    setStyle(progressElem, {width: percent + '%'});
  }
  function drawResults() {
    hide(progressWrapElem);

    var resultText = '';
    if (approvedCount) {
      resultText += 'Одобрено: '+approvedCount+'<br>';
    }
    if (disapprovedCount) {
      resultText += 'Отклонено: '+disapprovedCount+'<br>';
    }
    resultText += 'Ошибок: '+errorCount+'<br>';

    resultTextElem.innerHTML = resultText;
    resultMoreElem.innerHTML = responseInfos.join('<br>');
    show(resultElem);
  }
}

AdsModer.premoderationTakeUnion = function(unionId, hash) {
  var ajaxParams = {};
  ajaxParams.hash     = hash;
  ajaxParams.union_id = unionId;
  ajaxParams.action   = 'take_union';
  ajax.post('/adsmoder?act=a_premoderation_manage_work', ajaxParams, {onDone: onComplete, onFail: onComplete});

  function onComplete(response) {
    if (response && response.ok) {
      if (response.redirect) {
        nav.go(response.redirect);
      }
    } else {
      var message = ((response && response.error) ? response.error : 'Ошибка');
      showFastBox({title: 'Ошибка', onHide: function() { nav.reload(); }}, message);
    }
    return true;
  }
}

AdsModer.premoderationTakeBackUnion = function(unionId, hash) {
  var ajaxParams = {};
  ajaxParams.hash     = hash;
  ajaxParams.union_id = unionId;
  ajaxParams.action   = 'take_back_union';
  ajax.post('/adsmoder?act=a_premoderation_manage_work', ajaxParams, {onDone: onComplete, onFail: onComplete});

  function onComplete(response) {
    if (response && response.ok) {
      nav.reload();
    } else {
      var message = ((response && response.error) ? response.error : 'Ошибка');
      showFastBox({title: 'Ошибка', onHide: function() { nav.reload(); }}, message);
    }
    return true;
  }
}

AdsModer.premoderationStopWork = function(hash) {
  var ajaxParams = {};
  ajaxParams.hash   = hash;
  ajaxParams.action = 'stop_work';
  ajax.post('/adsmoder?act=a_premoderation_manage_work', ajaxParams, {onDone: onComplete, onFail: onComplete});

  function onComplete(response) {
    if (response && response.ok) {
      nav.reload();
    } else {
      var message = ((response && response.error) ? response.error : 'Ошибка');
      showFastBox({title: 'Ошибка', onHide: function() { nav.reload(); }}, message);
    }
    return true;
  }
}

AdsModer.premoderationFixRequest = function(wrapElemId, requestId, action, hash) {
  if (!Ads.lock(wrapElemId, onLock, onUnlock)) {
    return;
  }

  var ajaxParams = {}
  ajaxParams.request_id = requestId;
  ajaxParams.action     = action;
  ajaxParams.hash       = hash;

  ajax.post('/adsmoder?act=premoderation_fix_request', ajaxParams, {onDone: onComplete, onFail: onComplete});

  function onComplete(response) {
    Ads.unlock(wrapElemId);
    if (response && response.text_new) {
      var wrapElem = ge(wrapElemId);
      if (wrapElem) {
        wrapElem.parentNode.replaceChild(se(response.text_new), wrapElem);
      }
    }
    return true;
  }
  function onLock() {
    show(geByTag1('img', ge(wrapElemId)));
  }
  function onUnlock() {
    var wrapElem = ge(wrapElemId);
    if (wrapElem) {
      hide(geByTag1('img', wrapElem));
    }
  }
}

AdsModer.switchOfficeBlock = function(actionLocation, confirmTitle, confirmText, actionText) {
  function switchBlocked() {
    Ads.simpleAjax(actionLocation);
  }
  showFastBox(confirmTitle, confirmText, actionText, switchBlocked, getLang('box_cancel'));
}

AdsModer.openCancelClicksBox = function(webSiteId, day, hash, boxHtml) {
  var box = showFastBox({title: 'Отмена кликов'}, boxHtml);
  var cancelClicksHandler = AdsModer.cancelClicks.pbind(webSiteId, day, hash, box);
  box.removeButtons();
  box.addButton(getLang('box_cancel'), false, 'no');
  box.addButton('Отменить клики', cancelClicksHandler, 'yes');
}

AdsModer.cancelClicks = function(webSiteId, day, hash, box) {
  if (!Ads.lock('cancelClicks', onLock, onUnlock)) {
    return;
  }

  var ajaxParams = {};
  ajaxParams.web_site_id = webSiteId;
  ajaxParams.day = day;
  ajaxParams.hash = hash;

  ajax.post('/adsweb?act=log_cancel', ajaxParams, {onDone: onComplete, onFail: onComplete});

  function onComplete(response) {
    Ads.unlock('cancelClicks');
    if (response && response.ok) {
      nav.reload();
    } else {
      showFastBox('Ошибка', 'Ошибка');
    }
    return true;
  }
  function onLock() {
    box.showProgress();
  }
  function onUnlock() {
    box.hide();
  }
}

try{stManager.done('ads_moder.js');}catch(e){}
