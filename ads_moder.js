var AdsModer = {};

AdsModer.init = function() {
  AdsModer.initDelayedImages();
}

AdsModer.initDelayedImages = function() {
  var imagesIndex;
  var indexStep = 500;
  var lastImage;
  var lastImageY;

  buildIndex();
  if (isEmpty(imagesIndex)) {
    return;
  }

  var scrolledNode = (browser.msie6 ? pageNode : window);
  var handler = checkImages.pbind(false);
  function deinit() {
    removeEvent(scrolledNode, 'scroll', handler);
  }
  cur.destroy.push(deinit);
  addEvent(scrolledNode, 'scroll', handler);
  handler();

  function buildIndex() {
    if (lastImage && lastImage.hasAttribute('src_') && lastImageY == getXY(lastImage)[1]) {
      return;
    }

    var imagesAll = geByTag('img');
    var image;
    var indexKey;

    imagesIndex = {};

    if (!imagesAll.length) {
      return;
    }

    for (var i = 0, image; image = imagesAll[i]; i++) {
      if (!image.hasAttribute('src_')) {
        continue;
      }
      indexKey = intval(getXY(image)[1] / indexStep);
      if (!(indexKey in imagesIndex)) {
        imagesIndex[indexKey] = [];
      }
      imagesIndex[indexKey].push(image);
      lastImage = image;
    }

    lastImageY = getXY(lastImage)[1];
  }

  function checkIndex() {
    buildIndex();
    if (isEmpty(imagesIndex)) {
      deinit();
    }
  }

  function checkImages(delayed) {
    var yTop        = scrollGetY()
    var yBottom     = yTop + lastWindowHeight;
    var indexTop    = intval(yTop / indexStep);
    var indexBottom = intval(yBottom / indexStep);
    var image;
    for (var i = indexTop; i <= indexBottom; i++) {
      if (!(i in imagesIndex)) {
        continue;
      }
      for (var j = 0, len = imagesIndex[i].length; j < len; j++) {
        image = imagesIndex[i][j];
        image.src = image.getAttribute('src_');
        image.removeAttribute('src_')
      }
      delete imagesIndex[i];
    }
    checkIndex();
    setTimeout(checkIndex, 1000);
  }
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
  var editBox = showFastBox({title: 'Изменение тематики объявления', width: 440}, cur.categoriesEditBoxHtml);
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

AdsModer.historyGet = function(elem, notNavigationParam) {
  while (elem && elem.nodeName.toLowerCase() !== 'form') {
    elem = elem.parentNode;
  }
  if (!elem) {
    return;
  }
  var values = serializeForm(elem);
  var params = values.other_params;
  delete values.other_params;
  for (var i in values) {
    if (values[i]) {
      params = '&' + i + '=' + values[i] + params;
    }
  }
  nav.go('/adsmoder?act=history' + params);
}

AdsModer.historyToggleFilters = function() {
  var filtersContainerElem = ge('ads_moder_history');
  var filtersElems = geByClass('ads_navigation_link', filtersContainerElem);
  for (var i = 0; elem = filtersElems[i]; i++) {
      if (hasClass(elem, 'current')) {
          continue
      }
      elem = elem.parentNode;
      if (elem.nodeName.toLowerCase() !== 'span') {
          continue
      }
      toggleClass(elem, 'unshown');
  }
}

AdsModer.statSummaryInit = function(periodType, fromYear, fromMonth, fromDay, toYear, toMonth, toDay) {
  var datePickerOptionsFrom = {
    mode: (periodType === 'month') ? 'm' : 'd',
    year:  fromYear,
    month: fromMonth,
    day:   fromDay,
    width: 130,
    pastActive: true,
    onUpdate: function(date, mode) {
      fromYear  = date.y;
      fromMonth = date.m;
      fromDay   = date.d;
      updateLink();
    }
  };
  var datePickerOptionsTo = {
    mode: (periodType === 'month') ? 'm' : 'd',
    year:  toYear,
    month: toMonth,
    day:   toDay,
    width: 130,
    pastActive: true,
    onUpdate: function(date, mode) {
      toYear  = date.y;
      toMonth = date.m;
      toDay   = date.d;
      updateLink();
    }
  };
  new Datepicker(ge('ads_moder_stat_summary_from'), datePickerOptionsFrom);
  new Datepicker(ge('ads_moder_stat_summary_to'), datePickerOptionsTo);

  function updateLink() {
    var fromPeriod = fromYear * 100 + fromMonth;
    var toPeriod   = toYear   * 100 + toMonth;
    if (periodType !== 'month') {
      fromPeriod = fromPeriod * 100 + fromDay;
      toPeriod   = toPeriod   * 100 + toDay;
    }
    var linkElem = ge('ads_moder_stat_summary_range_link');
    linkElem.href = linkElem.href.replace(/&period=\d+-\d+/, '&period=' + fromPeriod + '-' + toPeriod);
    linkElem.style.opacity = 1;
  }
}

AdsModer.statSummaryShowAllProperties = function() {
  var propertiesElem = ge('ads_moder_stat_summary_filter_properties');
  var elems = geByClass('ads_moder_stat_summary_filter_property', propertiesElem);
  each(elems, show);
  hide('ads_moder_stat_summary_filter_properties_shower');
}

AdsModer.statSummaryDistrShowCountLabel = function(id, i, val) {
  var contXy = getXY(ge(id+'_stats_graph_wrap'));
  var colXy  = getXY(ge(id+'_distr_col_'+i));

  setStyle(ge(id+'_max_label'), {
    left: colXy[0] - contXy[0] + 14,
    top:  colXy[1] - contXy[1] - 11
  });
  ge(id+'_max_label').innerHTML = val;
  show(id+'_max_label');
  setStyle(ge(id+'_max_label_out'), {
    width:  ge(id+'_max_label').offsetWidth + 2,
    height: ge(id+'_max_label').offsetHeight + 2,
    left:   colXy[0] - contXy[0] + 13,
    top:    colXy[1] - contXy[1] - 12
  });
  show(id+'_max_label_out');
  setStyle(ge(id+'_max_label_out2'), {
    width:  ge(id+'_max_label').offsetWidth + 4,
    height: ge(id+'_max_label').offsetHeight + 4,
    left:   colXy[0] - contXy[0] + 12,
    top:    colXy[1] - contXy[1] - 13
  });
  show(id+'_max_label_out2');
}

AdsModer.statSummaryDistrHideCountLabel = function(id) {
  hide(id+'_max_label');
  hide(id+'_max_label_out');
  hide(id+'_max_label_out2');
}

AdsModer.statSummaryShowVotesBox = function(periodType, period) {
  var ajaxParams = {};
  ajaxParams.period_type = periodType;
  ajaxParams.period      = period;

  var showOptions = {params: {}};

  showBox('/adsmoder?act=stat_summary_votes', ajaxParams, showOptions);
}

try{stManager.done('ads_moder.js');}catch(e){}
