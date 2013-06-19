var Videoview = {

isFS: false,

playerCallback: {
  resize: function (w, h) {
  },
  debugLog: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('flashPlayer: ');
    debugLog(args);
  },
  fullscreen: function(value) {
    Videoview.isFS = value;
  },
  incViewCounter: function(oid, vid, hash) {
    ajax.post('al_video.php', {act: 'inc_view_counter', oid: oid, vid: vid, hash: hash}, {
      cache: 1,
      onDone: function(t) {
    }});
  },
  rotateVideo: function(oid, vid, angle, hash) {
    ajax.post('al_video.php', {act: 'rotate_video', oid: oid, vid: vid, angle: angle, hash: hash});
  },
  scoreCardCounter: function () {
    // vkImage().src = locProtocol + '//b.scorecardresearch.com/p?c1=1&c2=13765216&c5=06&rn=' + Math.round(Math.random() * 1000000000);
  },
  onVideoResolutionChanged: function(oid, vid, hash, resolution) {
    if (mvcur.mvData) {
      mvcur.mvData.resolution = resolution;
    }
  },
  onVideoPlayProgress: function(oid, vid, hash, time_progress, time_total) {
    var rawId = oid+'_'+vid;
    if (time_progress < 5000 && cur.tnsStart != rawId) {
      this.playerCallback.scoreCardCounter();
      cur.tnsStart = rawId;
    } else if (time_progress > (time_total / 2) && cur.tnsEnd != rawId) {
      cur.tnsEnd = rawId;
    }
    if (mvcur.adData) {
      if (mvcur.adData.stat_link_start && !mvcur.adData.view_complete_start && time_progress >= 5000) {
        ajax.post(mvcur.adData.stat_link_start, {}, {onDone: function() {}, onFail: function() { return true; }});
        mvcur.adData.view_complete_start = true;
      }
      if (mvcur.adData.stat_link_half && !mvcur.adData.view_complete_half && time_progress >= (time_total / 2)) {
        ajax.post(mvcur.adData.stat_link_half, {}, {onDone: function() {}, onFail: function() { return true; }});
        mvcur.adData.view_complete_half = true;
      }
      if (mvcur.adData.stat_link_full && !mvcur.adData.view_complete_full && time_progress >= (time_total * 0.9)) {
        ajax.post(mvcur.adData.stat_link_full, {}, {onDone: function() {}, onFail: function() { return true; }});
        mvcur.adData.view_complete_full = true;
      }
    }
  },
  onVideoStreamPlaying: function() {
    var _n = window.Notifier, _a = window.audioPlayer;
    if (_n) setTimeout(function() { _n.lcSend('video_start'); }, 0);
    if (_a && _a.player && !_a.player.paused()) {
      _a.pauseTrack();
      _a.pausedByVideo = 1;
    }
  },
  onVideoPlayStarted: function(oid, vid, hash) {
    ajax.post('al_video.php', {act: 'video_view_started', oid: oid, vid: vid, hash: hash, quality: mvcur.mvData.resolution || 0}, {
      cache: 1,
      onDone: function(t) {
    }});
  },
  onVideoPlayFinished: function() {
    mvcur.finished = true;
    mvcur.mousemoved = true;
    Videoview.moveCheck();

    if (mvcur.adData) {
      if (mvcur.adData.stat_link_start && !mvcur.adData.view_complete_start) {
        ajax.post(mvcur.adData.stat_link_start, {}, {onDone: function() {}, onFail: function() { return true; }});
        mvcur.adData.view_complete_start = true;
      }
      if (mvcur.adData.stat_link_half && !mvcur.adData.view_complete_half) {
        ajax.post(mvcur.adData.stat_link_half, {}, {onDone: function() {}, onFail: function() { return true; }});
        mvcur.adData.view_complete_half = true;
      }
      if (mvcur.adData.stat_link_full && !mvcur.adData.view_complete_full) {
        ajax.post(mvcur.adData.stat_link_full, {}, {onDone: function() {}, onFail: function() { return true; }});
        mvcur.adData.view_complete_full = true;
      }
    }
  }
},

updateArrowsX: function() {
  /*var w = mvcur.mvActualWidth + 30, sbw = sbWidth();
  var lw = Math.max(lastWindowWidth, w + 124 + sbw + 2);
  mvcur.mvLeft.style.left  = Math.floor((lw - sbw - 10 - (w + 66)) / 2) + 'px';
  mvcur.mvRight.style.left = Math.floor((lw - sbw - 10 + (w + 66)) / 2) + 'px';
  if (vk.rtl) {
    mvcur.mvSwitch.style.left = (lw - sbw - 36) + 'px';
  }*/
},

updateArrowsY: function() {
  /*var h = mvcur.mvBox.offsetHeight;
  if (browser.mobile) {
    var skipTop = 10 + mvcur.mvYOffset;
    mvcur.mvRight.style.top = mvcur.mvLeft.style.top = (skipTop + Math.floor(h / 2) - 7) + 'px';
    if (lastWindowHeight < mvcur.mvYOffset + h + 50) {
      setTimeout(function() {
        var f = ge('footer');
        f.style.height = (intval(getStyle(f, 'height')) + (mvcur.mvYOffset + h + 50 - lastWindowHeight)) + 'px';
        onBodyResize();
        Videoview.onResize();
      }, 1);
    }
  }
  mvcur.mvLeftNav.style.height = mvcur.mvRightNav.style.height = h + 'px';*/
},

actionInfo: function() {
  return ge('mv_action_info') || mvcur.mvWide.appendChild(ce('div', {id: 'mv_action_info'}));
},

locNav: function(ch, old, nw) {
  nw = nav.toStr(nw);
  var m = nw.match(/^video(-?\d+_\d+)$/);
  if (!m) {
    Videoview.hide();
    return;
  }
},

showPlayer: function(force) {
  var el = ge('video_player');
  if (!el) return;
  if (!force && el.getAttribute('preventhide') && !browser.safari_mobile) return;
  if (browser.msie) {
    setStyle(el, {position: 'static', top: 0});
  } if (browser.safari_mobile) {
    show(el);
  } else {
    el.style.visibility = 'visible';
  }
},

hidePlayer: function(force) {
  var el = ge('video_player');
  if (!el) return;
  if (!force && el.getAttribute('preventhide') && !browser.safari_mobile) return;
  if (browser.msie) {
    setStyle(el, {position: 'absolute', top: '-5000px'});
  } if (browser.safari_mobile) {
    hide(el);
  } else {
    el.style.visibility = 'hidden';
  }
},

showTagSelector: function() {
  Videoview.hidePlayer();
  showTabbedBox('al_friends.php', {act: 'select_friends_box', Checked: '', allow_self: 1}, {stat: ['privacy.js', 'ui_controls.js', 'ui_controls.css'], cache: 1, onHide: function() {
    removeClass(mvcur.mvCont, 'toggle_flash');
  }});
  cur.onFlistSave = function (ids, list) {
    Videoview.showPlayer();
    Videoview.addTags(ids);
  }
},

init: function() {
  window.mvcur = {};
  if (window.mvLayer) {
    return;
  }
  window.mvLayer = ce('div', {
    id: 'mv_layer'
  });

  addEvent(mvLayer, 'mousemove', function() {
    mvcur.mousemoved = true;
    if (mvcur.blackout) {
      Videoview.moveCheck();
    }
  });

  window.mvLayerWrap = ce('div', {
    id: 'mv_layer_wrap',
    className: 'scroll_fix_wrap fixed'
  });

  mvLayerWrap.appendChild(window.mvLayer);

  bodyNode.appendChild(mvLayerWrap);

  window.mvLayer.style.width = (lastWindowWidth - sbWidth() - 2) + 'px';
},

moveCheck: function() {
  if (!mvcur.mousemoved) {
    if (!mvcur.blackout && !mvcur.finished && isVisible(layerBG)) {
      mvcur.blackout = true;
      animate(layerBG, {opacity: 0.9}, 5000);
    }
  } else if (mvcur.blackout) {
    mvcur.blackout = false;
    if (isVisible(layerBG)) {
      animate(layerBG, {opacity: 0.7}, 200);
    } else {
      setStyle(layerBG, {opacity: 0.7});
    }
  }
  mvcur.mousemoved = false;
},

show: function(ev, videoRaw, listId, options) {
  var _a = window.audioPlayer;
  if (_a && _a.player && !_a.player.paused()) {
    _a.pauseTrack();
    _a.pausedByVideo = 1;
  }
  Videoview.playerCallback.onVideoStreamPlaying();
  debugLog('show video ' + videoRaw);
  if (window.mvcur && mvcur.minimized) {
    if (options.nomin) {
      if (options.prevLoc) {
        mvcur.mvPrevLoc = options.prevLoc;
      }
      debugLog('unminimizing in show');
      Videoview.unminimize(true, false, true);
    }
    return true;
  }

  if (options.queue) {
    debugLog('pushing in videoview.show');
    layerQueue.push();
    options.queue = false;
  }

  layerQueue.hide();
//  if (window.wkLayerWrap && isVisible(window.wkLayerWrap)) {
//    hide(wkLayerWrap);
//  }

  this.init();

  if (mvcur.mvShown) return;

  mvcur.showTime = new Date().getTime();

  if (!isVisible(mvLayerWrap)) {
    otherList = true;
    addEvent(window, 'resize', Videoview.onResize);
    addEvent(document, 'keydown', Videoview.onKeyDown);
    addEvent(mvLayerWrap, 'click', Videoview.onClick);
    boxQueue.hideAll();
    layers.wrapshow(mvLayerWrap, 0.7);
    layers.fullhide = Videoview.hide;
  } else {
    return false;
  }
  setTimeout(function() {
    layers.wrapshow(mvLayerWrap, 0.7);
    layers.fullhide = Videoview.hide;
  }, 0);

  mvcur.noLocChange = 0; // do return location
  if (options.ad_video) { // videoAds
    options.hideInfo = 1;
    options.noLocChange = 1;
    mvcur.noLocChange = 1;
    mvcur.videoAds = 1;
  }
  mvcur.noHistory = options.noLocChange || options.noHistory;

  mvcur.blackInterval = setInterval(Videoview.moveCheck, 180000);

  mvcur.mvShown = true;

  mvcur.videoRaw = videoRaw;
  mvcur.options = options;
  mvcur.listId = listId;
  mvcur.mvData = false;

  if (options.prevLoc) {
    mvcur.mvPrevLoc = options.prevLoc;
  } else {
    setTimeout(Videoview.setLocation.pbind(options.noLocChange), 0);
  }

  if (ev && ev.pageX && ev.pageY) {
    extend(mvcur, {mvOldX: ev.pageX, mvOldY: ev.pageY, mvOldT: vkNow()});
  }

  if (!mvcur.mvFixed) {
    var colorClass = 'mv_dark';

    /*mvcur.mvFixed = bodyNode.appendChild(ce('div', {className: 'mv_fixed fixed ' + colorClass, innerHTML: '\
<div class="mv_left no_select" onmousedown="Videoview.show(false, mvcur.mvIndex - 1 + vk.rtl * 2, event);" onmouseover="Videoview.activate(ge(\'mv_left_nav\'), this)" onmouseout="Videoview.deactivate(ge(\'mv_left_nav\'), this)"><div></div></div>\
<div class="mv_right no_select" onmousedown="Videoview.show(false, mvcur.mvIndex + 1 - vk.rtl * 2, event);" onmouseover="Videoview.activate(ge(\'mv_right_nav\'), this)" onmouseout="Videoview.deactivate(ge(\'mv_right_nav\'), this)"><div></div></div>\
    '}));

    mvcur.mvLeft = mvcur.mvFixed.firstChild;
    mvcur.mvRight = mvcur.mvLeft.nextSibling;
    mvcur.mvSwitch = mvcur.mvRight.nextSibling;
    */
    addClass(mvLayerWrap, colorClass);
    addClass(layerBG, colorClass);
    vkImage().src = '/images/upload.gif';


    if (options.hideInfo) {
      var showControls = 'display: none';
      var controlsClass = '';
    } else {
      var showControls = '';
      var controlsClass = 'mv_controls_shown';
    }

  if (vk.rtl) {
    var minimizeBtn = '';
  } else {
    var minimizeBtn = '<div class="divider fl_r">|</div><div onmouseover="Videoview.activate(this, 2);" onmouseout="Videoview.deactivate(this, 2);" onclick="return Videoview.minimize(event);" class="mv_top_button fl_r">'+getLang('global_min')+'</div>';
  }
// '+' - fix for buggy firefox
    mvLayer.innerHTML = '\
<div class="mv_cont">\
\
<div class="no_select" id="mv_left_nav" '+'onmouseover="Videoview.activate(this, mvcur.mvLeft)" onmouseout="Videoview.deactivate(this, mvcur.mvLeft)" onmousedown="Videoview.show(false, mvcur.mvIndex - 1 + vk.rtl * 2, event); mvcur.mvClicked = true;" onselectstart="return cancelEvent(event);"></div>\
<div class="no_select" id="mv_right_nav" onmouseover="Videoview.activate(this, mvcur.mvRight)" onmouseout="Videoview.deactivate(this, mvcur.mvRight)" onmousedown="Videoview.show(false, mvcur.mvIndex + 1 - vk.rtl * 2, event); mvcur.mvClicked = true;" onselectstart="return cancelEvent(event);"></div>\
<div class="no_select" id="mv_right_controls" style="display: none;" onselectstart="return cancelEvent(event);">\
<div onmouseover="Videoview.activate(this, true);" onmouseout="Videoview.deactivate(this, true);" class="mv_controls_ctrl mv_controls_close"><div></div></div>\
<div onmouseover="Videoview.activate(this, true);" onmouseout="Videoview.deactivate(this, true);" onclick="return Videoview.minimize(event);" class="mv_controls_ctrl mv_controls_min"><div></div></div>\
<div class="mv_controls_bg"></div>\
</div>\
\
<table cellspacing="0" cellpadding="0">\
<tr><td class="sidesh s1"><div></div></td><td>\
<table cellspacing="0" cellpadding="0">\
<tr><td>\
<table cellspacing="0" cellpadding="0">\
<tr><td colspan="3" class="bottomsh s3"><div></div></td></tr>\
<tr><td class="sidesh s3"><div></div></td><td>\
\
<div id="mv_box" onclick="mvcur.mvClicked = true;">\
<div id="mv_approve" style="display: none;"></div>\
<div id="mv_min_layer"><div class="mv_min_header"><div class="mv_mini_control fl_r" onmousedown="return Videoview.hide(false, true);"><div class="mv_close_control"></div></div><div class="mv_mini_control fl_r" onclick="return Videoview.unminimize();"><div class="mv_max_control"></div></div><div class="mv_min_title" id="mv_min_title" onmouseover="if (mvcur.minimized) Videoview.activate(this, 2);" onmouseout="Videoview.deactivate(this, 2);"></div></div></div>\
<div class="no_select mv_data">\
  <div id="mv_top_controls"><div onmouseover="Videoview.activate(this, 2);" onmouseout="Videoview.deactivate(this, 2);" onclick="return Videoview.hide(false, true, event);" class="mv_top_button mv_top_close fl_r">'+getLang('global_close')+'</div>'+minimizeBtn+'</div>\
  <div id="mv_loader"></div>\
  <div id="mv_content"></div>\
</div>\
<div id="mv_controls_line" class="ta_l '+controlsClass+'">\
</div>\
<div class="mv_controls" id="mv_controls" style="'+showControls+'">\
  <div class="clear_fix select_fix" id="mv_comments_data">\
    <div class="fl_l wide_column">\
      <div id="mv_wide"></div>\
    </div>\
    <div class="fl_r narrow_column" id="mv_narrow"></div>\
    <br class="clear" />\
  </div>\
  <div id="mv_warning" style="display: none;"></div>\
</div>\
</div>\
\
</td><td class="sidesh s3"><div></div></td></tr>\
<tr><td colspan="3" class="bottomsh s3"><div></div></td></tr></table>\
</td></tr>\
<tr><td colspan="3" class="bottomsh s2"><div></div></td></tr></table>\
</td><td class="sidesh s1"><div></div></td></tr>\
<tr><td colspan="3" class="bottomsh s1"><div></div></td></tr></table>\
</div>\
    ';

    extend(mvcur, {
      mvCont: mvLayer.firstChild,
      mvBox: ge('mv_box'),

      mvLeftNav: ge('mv_left_nav'),
      mvRightNav: ge('mv_right_nav'),
      mvRightControls: ge('mv_right_controls'),
      mvControlsLine: ge('mv_controls_line'),

      mvLoader: ge('mv_loader'),
      mvContent: ge('mv_content'),

      mvCommentsData: ge('mv_comments_data'),

      mvNarrow: ge('mv_narrow'),
      mvWide: ge('mv_wide')
    });
    if (browser.mobile) {
      mvcur.mvYOffset = intval(window.pageYOffset);

      mvcur.mvCont.style.paddingTop = (mvcur.mvYOffset + 10) + 'px';
      //mvcur.mvRightControls.style.top = (mvcur.mvYOffset + 10) + 'px';
    }

    Videoview.updateSize();
    if (cur.timeouts && cur.timeouts.changeUrl) {
      clearTimeout(cur.timeouts.changeUrl);
    }
  }

  hide(mvcur.mvLeft, mvcur.mvLeftNav, mvcur.mvRight, mvcur.mvRightNav);

  if (!cur.mvNavInited) {
    cur.mvNavInited = true;
    if (cur._back) {
      cur._back.hide.push(function() {
        /*if (mvcur.mvShown || mvcur.minimized) {
          Videoview.hide(false, true);
        }*/
      });
    }
  }

  if (cur.vSearch) {
    cur.vSearch.blur();
  }
  if (options.minimized) {
//    if (browser.msie) {
      setTimeout(Videoview.minimize.bind(Videoview), 0);
//    } else {
//      Videoview.minimize();
//    }
  }

  return false;
},

hide: function(noLoc, force, ev) {
  if (!window.mvcur || !force && !mvcur.mvShown) return;
  if (!force && mvcur.minimized) {
    if (!mvcur.noLocChange && noLoc !== true) {
      if (noLoc === 2) {
        nav.setLoc(hab.getLoc());
      } else if (!layerQueue.count()) {
        Videoview.backLocation();
      }
    }
    return;
  }
  if (!mvcur.noHistory && !noLoc) {
    mvcur.noHistory = 1;
    mvcur.forceHistoryHide = force;
    __adsLoaded = 0;
    return history.go(-1);
  }
  if (mvcur.forceHistoryHide) {
    force = mvcur.forceHistoryHide;
    mvcur.forceHistoryHide = false;
  }

  if (mvcur.statusVideo) {
    var icon = ge('mv_like_icon');
    if (icon) {
      var tt = icon.parentNode.tt;
      if (tt && tt.container) {
        re(tt.container);
      }
      if (icon.parentNode.tt) {
        delete icon.parentNode.tt;
      }
    }
  }

  var wasmin = mvcur.minimized;
  if (wasmin) {
    Videoview.unminimize(true, true, true);
    mvcur.minimized = false;
    noLoc = true;
  }

  Wall.cancelEdit(true);

  if (mvcur.mvData.duration > 60 && !force && !mvcur.finished) {
    var openTime = new Date().getTime() - mvcur.showTime, closeText = getLang('video_are_you_sure_close');
    if (openTime > 30000 && closeText != 'are you sure close' && !browser.safari_mobile) {
      var box;
      box = showFastBox(getLang('video_are_you_sure_close_title'), closeText, getLang('box_yes'), function() {
        box.hide();
        Videoview.hide(noLoc, true)
      }, getLang('box_no'));
      var checkKey = function(event) {
        if (event.keyCode == 13) {
          box.hide();
          Videoview.hide(noLoc, true)
        }
      }
      addEvent(document, 'keydown', checkKey);
      box.onHide = function() {
        removeEvent(document, 'keydown', checkKey);
      };
      return true;
    }
  }
  var _a = window.audioPlayer, _n = window.Notifier;
  if (_a && _a.player && _a.player.paused() && _a.pausedByVideo) {
    _a.playTrack();
    _a.pausedByVideo = null;
  }
  if (_n) _n.lcSend('video_hide');

  if (wasmin) {
    hide(mvLayerWrap);
  } else {
    layers.wraphide(mvLayerWrap);
    layers.fullhide = false;
  }

  if (window.tooltips) {
    each(geByClass('delete', mvcur.mvTags), function() {
      tooltips.destroy(this);
    });
  }

  if (window.tooltips) {
    tooltips.destroyAll(cur.mvBox);
  }

  var colorClass = 'mv_dark';
  removeClass(mvLayerWrap, colorClass);
  removeClass(layerBG, colorClass);

  mvcur.mvShown = mvcur.mvClicked = false;
  removeEvent(window, 'resize', Videoview.onResize);
  removeEvent(document, 'keydown', Videoview.onKeyDown);
  removeEvent(mvLayerWrap, 'click', Videoview.onClick);

  mvcur.mvContent.innerHTML = '';
  mvcur.changeCanvasSize = false;

//  if (window.wkcur && wkcur.shown) {
//    WkView.showLayer();
//  } else if (window.Photoview && cur.pvShown) {
//    Photoview.showPvLayer();
//  }
  if (!wasmin || !isVisible(layerWrap)) {
    debugLog('pop from videoview.hide');
    setTimeout(layerQueue.pop, 0);
  }

  if (mvcur.blackInterval) {
    clearInterval(mvcur.blackInterval);
  }
  if (!mvcur.noLocChange && noLoc !== true) {
    if (noLoc === 2) {
      nav.setLoc(hab.getLoc());
    } else {
      Videoview.backLocation();
    }
    __adsLoaded = 0;
  }
  __adsUpdate();
  return false;
},

cmp: function(id1, id2) {
  var l1 = id1.length, l2 = id2.length;
  if (l1 < l2) {
    return -1;
  } else if (l1 > l2) {
    return 1;
  } else if (id1 < id2) {
    return -1;
  } else if (id1 > id2) {
    return 1;
  }
  return 0;
},


onClick: function(e) {
  if (mvcur.mvClicked) {
    mvcur.mvClicked = false;
    return;
  }
  var dx = Math.abs(e.pageX - intval(mvcur.mvOldX));
  var dy = Math.abs(e.pageY - intval(mvcur.mvOldY));
  if (dx > 3 || dy > 3) {
    if (vkNow() - intval(mvcur.mvOldT) > 300) {
      if (mvcur.mvTagger) {
        Videoview.stopTag();
      } else {
        Videoview.hide();
      }
    }
  }
},

onKeyDown: function(e) {
  if (e.returnValue === false) return false;

  if (e.keyCode == KEY.ESC) {
    if (Videoview.isFS) {
      ge('video_player').toggleFullscreen();
      return false;
    }
    if (mvcur.mvTagger) {
      Videoview.stopTag();
    } else {
      Videoview.hide();
    }
    return cancelEvent(e);
  }
},

onResize: function() {
  var dwidth = lastWindowWidth, dheight = lastWindowHeight, sbw = sbWidth();

  var w = dwidth - sbw - 2 - 120 - 34 - 50, h = dheight - 31 - 28 - 72;
  if (w > 1280) { // less than full hd - not size > 2
    w = 1280;
  } else if (w > 807 && w < 907) { // 1024x768 - not size > 1
    w = 807;
  } else if (w < 604) {
    w = 604;
  }
  if (h < 453) {
    h = 453;
  }
  mvcur.mvWidth = w;
  mvcur.mvHeight = h;

  var sizeChanged = false, oldverybig = mvcur.mvVeryBig;
  mvcur.mvVeryBig = (w > 1280) ? 2 : (w > 807 ? 1 : false);
  sizeChanged = (oldverybig != mvcur.mvVeryBig);

  Videoview.updateArrowsX();
  Videoview.updateArrowsY();
},

updateSize: function() {
  if (mvcur.minimized) {
    return false;
  }
  var size = getSize(mvcur.mvBox);
  mvcur.mvActualWidth = size[0]+3;
  //mvcur.mvCont.style.width = mvcur.mvActualWidth + 'px';

  var docEl = document.documentElement;
  var ch = window.innerHeight || docEl.clientHeight || bodyNode.clientHeight;


  mvcur.mvCont.style.top = String(Math.max((ch - 800) / 2,50)) +'px';

  //mvcur.mvRightControls.style.left = (mvcur.mvActualWidth) + 'px';

  onBodyResize();
  Videoview.onResize();
},

list: function(photoId, listId, realList) {
  if (!mvcur.mvList) mvcur.mvList = {};
  mvcur.mvList[photoId + '_' + listId] = realList;
},

showInfo: function() {
  addClass(mvcur.mvControlsLine, 'mv_controls_shown');
  show(ge('mv_controls'));
  Videoview.activate(ge('mv_hide_info'), 2, true);
  window.updateWndVScroll && updateWndVScroll();
  return false;
},

hideInfo: function() {
  removeClass(mvcur.mvControlsLine, 'mv_controls_shown');
  hide(ge('mv_controls'));
  Videoview.activate(ge('mv_show_info'), 2, true);
  window.updateWndVScroll && updateWndVScroll();
  return false;
},

getPrevLoc: function() {
  mvcur.mvPrevLoc = {};
  for (var i in nav.objLoc) {
    if (i != 'z' || !nav.objLoc[i].match(new RegExp('^video' + mvcur.videoRaw, ''))) {
      mvcur.mvPrevLoc[i] = nav.objLoc[i];
    }
  }
},

setLocation: function(noLocChange) {
  if (mvcur.options.fromPreload) {
    var listData = mvcur.listId.match(new RegExp('([a-z]*)([0-9\-]*)'));
    var claimData = mvcur.listId.match(new RegExp('claim=([0-9]+)'));
    var oid = parseInt(listData[2]);
    if (oid > 0) {
      mvcur.mvPrevLoc = {'0': 'videos' + oid};
    } else {
      mvcur.mvPrevLoc = {'0': 'video', gid: (-oid)};
    }
    if (listData[1] != 'videos') {
      mvcur.mvPrevLoc['section']  = listData[1];
    }
    if (claimData && claimData[1]) {
      mvcur.mvPrevLoc['claim'] = claimData[1];
    }
  } else {
    if (noLocChange) {
      mvcur.mvPrevLoc = 'z';
    } else {
      Videoview.getPrevLoc();
    }
  }
  if (noLocChange) {
    return;
  }
  var m = mvcur.videoRaw.match(/^(-?\d+)(photo|video)?_/), owner = intval(m[1]), nl;
  if (!m[2] && nav.objLoc[0] == 'video' && (owner == vk.id && !nav.objLoc.gid || owner < 0 && nav.objLoc.gid == (-owner)) || owner > 0 && nav.objLoc[0] == 'videos' + owner) {
    nl = {'0': 'video' + mvcur.videoRaw + (nav.objLoc.claim ? "?claim=" + nav.objLoc.claim : "")};
    if ((mvcur.options || {}).fromQueue) {
      mvcur.noHistory = 1;
    }
  } else {
    var videoLocation = 'video' + mvcur.videoRaw, nl;
    if (mvcur.listId) {
      videoLocation += '/' + mvcur.listId;
    }
    nl = extend(nav.objLoc, {'z': videoLocation});
  }
  if (nav.strLoc != nav.toStr(nl)) {
    nav.setLoc(nl);
    if ((mvcur.options || {}).fromQueue) {
      mvcur.noHistory = 1;
    }
  }
  if (mvcur.options) mvcur.options.fromQueue = false;
},

backLocation: function() {
  if (mvcur.mvPrevLoc == 'z' || !mvcur.mvPrevLoc && nav.objLoc.z) {
    var loc = clone(nav.objLoc);
    delete loc.z;
    nav.setLoc(loc);
  } else if (mvcur.mvPrevLoc) {
    nav.setLoc(mvcur.mvPrevLoc);
  } else if (nav.objLoc[0] == 'video' || nav.objLoc[0].match(/^video-?\d+_\d+/)) {
    nav.setLoc({'0': 'video'});
  }
  if (mvcur.options.prevTitle) {
    window.document.title = replaceEntities(stripHTML(mvcur.options.prevTitle));
    delete mvcur.options.prevTitle;
  }
  mvcur.noHistory = 1;
},

highlightComment: function(el) {
  el = ge(el);
  if (!el) return;

  var hlfunc = animate.pbind(el, {backgroundColor: '#ECEFF3'}, 200, function() {
    setTimeout(function() {
      animate(el, {backgroundColor: '#FFF'}, 200);
    }, 1000);
  }), top = getXY(el, true)[1];

  if (top < 0 || top > lastWindowHeight - 200) {
    animate(mvLayerWrap, {scrollTop: mvLayerWrap.scrollTop + top - 50}, 300, hlfunc);
  } else {
    hlfunc();
  }
},
showComment: function(comm) {
  var p = ge('mv_comment' + comm);
  if (p) {
    Videoview.highlightComment(p);
  } else {
    Videoview.comments(comm);
  }
  return false;
},
commDone: function(comm, from, text, del) {
  var node = ge(from + '_comment' + comm);
  if (!node) return;
  var fChild = node.firstChild;

  var msg = fChild.nextSibling;
  if (!text) {
    show(node.firstChild);
    hide(msg);
    if (from == 'mv') {
      ++mvcur.mvData.commcount;
      ++mvcur.mvData.commshown;
    } else {
      ++cur.commentsCount;
      ++cur.commentsShown;
    }

    Videoview.updateComms(from);
    return;
  }
  if (msg) {
    msg.innerHTML = text;
    show(msg);
  } else {
    if (hasClass(fChild, 'video_comment_first')) {
      var dldClass = 'review_comment_first';
    } else {
      var dldClass = 'review_comment_dld';
    }
    node.appendChild(ce('div', {className: dldClass, innerHTML: text}));
  }
  hide(node.firstChild);
  if (del) {
    if (from == 'mv') {
      --mvcur.mvData.commcount;
      --mvcur.mvData.commshown;
    } else {
      --cur.commentsCount;
      --cur.commentsShown;
    }
    Videoview.updateComms(from);
  } else {
    if (from == 'mv') {
      Videoview.updateArrowsY();
      Videoview.recache();
      if (!cur.mvComments) cur.mvComments = {};
      cur.mvComments[mvcur.videoRaw] = ge('mv_comments_wrap');
    }
  }
},

commParams: function(comm, from) {
  return {
    onDone: Videoview.commDone.pbind(comm, from),
    progress: from + '_progress' + comm
  }
},

commAction: function(act, comm, hash, from) {
  if (isVisible(from + '_progress' + comm)) return;
  ajax.post('al_video.php', {act: act + '_comment', comment: comm, hash: hash, videoview: 1, from: from}, Videoview.commParams(comm, from));
},

comments: function(showcomm) {
  if (showcomm) {
    var frst = domFC(ge('mv_comments')).id || '';
    if (
      !isVisible('mv_comments_header') ||
      (domFC(ge('mv_comments_header')) || {}).tagName == 'IMG' ||
      Videoview.cmp(frst, 'mv_comment' + showcomm) < 0
    ) {
      return;
    }
  }
  var mv = mvcur.mvData;
  var commlink = ge('mv_comments_link');
  ajax.post('al_video.php', {act: 'video_comments', offset: mv.commshown, video: mv.videoRaw}, {
    onDone: function(text, names) {
      Videoview.receiveComms(text, names, false, showcomm);
      if (showcomm && ge('mv_comment' + showcomm)) {
        Videoview.showComment(showcomm);
      }
    },
    showProgress: function() {
      var commHeader = ge('mv_comments_header');
      mvcur.mvCommInfo = commHeader.innerHTML;
      commHeader.innerHTML = '<img src="/images/upload.gif" />';
    }, hideProgress: function() {
      ge('mv_comments_header').innerHTML = mvcur.mvCommInfo;
    }
  });
},

updateComms: function(from) {
  if (from == 'review') {
    Video.changeSummary();
    return;
  }
  setTimeout(Videoview.updateArrowsY, 2);
  var mv = mvcur.mvData;
  var commshown = '';
  if (mv.commcount > mv.commshown) {
    commshown = getLang('video_show_previous_comments', mv.commcount - mv.commshown);
  }
  (commshown ? show : hide)(ge('mv_comments_header'));
  ge('mv_comments_header').innerHTML = commshown;
  Videoview.recache();
  if (!cur.mvComments) cur.mvComments = {};
  cur.mvComments[mvcur.videoRaw] = ge('mv_comments_wrap');
},
commentClick: function(el, event, from) {
  var comm = el.id.replace('mv_comment', ''), cmnt = comm.split('_');
  if (Wall.checkReplyClick(el, event)) return;

  var moreLink = geByClass1('wall_reply_more', el, 'a');
  if (moreLink && isVisible(moreLink)) {
    removeClass(el, 'reply_moreable');
    moreLink.onclick();
    return;
  }
  if (from && cmnt[1] && ge('mv_comment')) {
    Videoview.commentTo(comm, from, event);
  }
},
commentChanged: function() {
  checkTextLength(mvcur.mvCommLimit, ge('mv_comment'), ge('mv_comment_warn'));
},
commentTo: function(comm, toId, event) {
  var cmnt = (comm || '').split('_'), commId = cmnt[1], replyNameOld = mvcur.mvReplyTo && mvcur.mvReplyNames[mvcur.mvReplyTo[0]] || '', replyName = mvcur.mvReplyNames[toId] || '', rf = ge('mv_comment'), tl = ge('mv_reply_to_title'), asGroup = ge('mv_reply_as_group');

  if (comm) {
    mvcur.mvReplyTo = [toId, commId];
    val(tl, replyName[0] || '');
    show(tl, 'mv_del_reply_to');
    setStyle(tl, {maxWidth: ge('mv_comment_submit').offsetWidth - domPN(ge('mv_comment_send')).offsetWidth - (asGroup ? (asGroup.offsetWidth + 10) : 0) - ge('mv_add_media').offsetWidth - 21});
  } else {
    mvcur.mvReplyTo = false;
    hide(tl, 'mv_del_reply_to');
  }
  cur.mvReplyIn = mvcur.videoRaw;
  cur.mvReplyTo = mvcur.mvReplyTo;

  var v = trim(val(rf)), cEl = comm && geByClass1('mv_reply_to', ge('mv_comment' + comm));
  if (!v || replyNameOld && !winToUtf(replyNameOld[1]).indexOf(v) || comm === false) {
    val(rf, (comm && !checkEvent(event)) ? replaceEntities(replyName[1]) : '');
  }
  toggleClass(asGroup, 'on', !!(cEl && cEl.getAttribute('rid') === cmnt[0]));
  elfocus(rf);
},
receiveComms: function(text, names, noOld, toUp) {
  var n = ce('div', {innerHTML: text}), comms = ge('mv_comments'), last = current = domLC(comms), frm = getXY(current, true)[1], mv = mvcur.mvData, commField = ge('mv_comment');
  for (var el = domLC(n); el; el = domLC(n)) {
    if (commField) addClass(el, 'reply_replieable');
    while (current && Videoview.cmp(current.id, el.id) > 0) {
      current = domPS(current);
    }
    if (current && !Videoview.cmp(current.id, el.id)) {
      comms.replaceChild(el, current);
      current = el;
    } else {
      if (current && domNS(current)) {
        comms.insertBefore(el, domNS(current));
      } else if (!current && domFC(comms)) {
        if (noOld === true) {
          --mv.commshown;
          n.removeChild(el);
        } else {
          comms.insertBefore(el, domFC(comms));
        }
      } else {
        comms.appendChild(el);
      }
      ++mv.commshown;
    }
  }
  if (toUp && last) {
    mvLayerWrap.scrollTop += getXY(last, true)[1] - frm;
  }
  mv.comments = comms.innerHTML;
  extend(mvcur.mvReplyNames, names);
  window.updateWndVScroll && updateWndVScroll();
  Videoview.updateComms();
},
commSaved: function(post) {
  if (!mvcur.mvShown || mvcur.minimized) return;
  var comms = ge('mv_comments_wrap'), vd = comms ? mvcur.videoRaw : false, comm = post.match(/^(-?\d+)video(_\d+)/);
  if (!vd || !comm || !ge('mv_comment' + comm[1] + comm[2])) return;
  if (!cur.mvComments) cur.mvComments = {};
  cur.mvComments[mvcur.videoRaw] = comms;
},

sendComment: function() {
  var fld = ge('mv_comment'), comp = fld && data(fld, 'composer'),
      params = comp ? Composer.getSendParams(comp, Videoview.sendComment) : {message: trim(val(fld))},
      replyToName = (mvcur.mvReplyNames[(mvcur.mvReplyTo || {})[0]] || [])[1], btn = 'mv_comment_send';

  if (params.delayed) return;

  if (!params.attach1_type && (!params.message || replyToName && !replyToName.indexOf(params.message))) {
    elfocus(fld);
    return;
  }

  hide('mv_comment_warn');
  ajax.post('al_video.php', Wall.fixPostParams(extend(params, {
    act: 'post_comment',
    video: mvcur.mvData.videoRaw,
    hash: mvcur.mvData.hash,
    fromview: 1,
    videoviewer: 1,
    from_group: isChecked(ge('mv_reply_as_group')),
    reply_to: (mvcur.mvReplyTo || {})[1]
  })), {
    onDone: function(text, names) {
      ++mvcur.mvData.commcount;
      Videoview.receiveComms(text, names, true);
      var fld = ge('mv_comment');
      if (fld && data(fld, 'composer')) {
        Composer.reset(data(fld, 'composer'));
      } else {
        val(fld, '');
      }
      fld.blur();
      mvcur.mvReplyTo = false;
      hide('mv_reply_to_title', 'mv_del_reply_to');
    },
    onFail: function(text) {
      if (fld) {
        showTooltip(fld, {text: text, showdt: 200, forcetodown: 0, slide: 15});
        elfocus(fld);
        return true;
      }
    }, showProgress: lockButton.pbind(btn), hideProgress: unlockButton.pbind(btn)
  });
},

activate: function(el, control, fast) {
  if (control == 2) {
    animate(el, {color: '#FFFFFF'}, (typeof(fast) != 'undefined') ? 0 : 200);
  } else {
    animate(el, {opacity: 1}, 200);
  }
},

deactivate: function(el, control) {
  if (control == 2) {
    animate(el, {color: '#777777'}, (typeof(fast) != 'undefined') ? 0 : 200);
  } else {
    animate(el, {opacity: 0.5}, 200);
  }
},

addVideo: function(videoRaw, hash, obj, gid, accessHash, from) {
  if (window.mvcur && mvcur.statusVideo) {
    var params = {
      act: 'external_add',
      status: videoRaw,
      hash: hash,
      from: from || 'videoviewer'
    };
    var url = 'al_video_external.php';
  } else {
    var params = {
      act: 'a_add',
      video: videoRaw,
      hash: hash,
      from: from || 'videoviewer',
      module: cur.module || ''
    };
    if (gid) {
      params.gid = gid;
    }
    var url = 'al_video.php';
  }
  if (accessHash) {
    params['access_hash'] = accessHash;
  }
  ajax.post(url, params, {
    onDone: function(text, row, hash, shareHash) {
      if (obj) {
        obj.parentNode.innerHTML = text;
      }
      try {
        row = eval('('+row+')');
      } catch(e) {
      }
      if (window.Video && cur.oid && (vk.id == cur.oid || gid)) {
        Video.addToList('all', row);
      }
      if (window.mvcur) {
        if (mvcur.mvData && mvcur.mvData.afterAdd) {
          mvcur.mvData.afterAdd(row[0]+'_'+row[1], shareHash);
        } else {
          mvcur.mvData.addedVideo = row[0]+'_'+row[1];
          mvcur.mvData.addedVideoHash = hash;
          mvcur.mvData.addedVideoShareHash = shareHash;
        }
      }
      var videoEl = ge('video_cont'+videoRaw);
      if (videoEl) {
        addClass(videoEl, 'video_row_added');
      }
      if (from == 'list') {
        showDoneBox(text);
      }
    }
  });
  //}
  return false;
},

likeUpdate: function(my, count, title, nott) {
  count = intval(count);

  var mv = mvcur.mvData;
  var likeType = (mvcur.statusVideo) ? 'wall' : 'video';

  var rows = ge('like_table_' + likeType + mv.videoRaw);
  var titleNode = ge('like_title_' + likeType + mv.videoRaw)
  var countInput = ge('like_real_count_' + likeType + mv.videoRaw) || {};

  var countNode = ge('mv_like_count');
  var icon = ge('mv_like_icon');
  var tt = icon.parentNode.tt || {}, opts = clone(tt.opts || {}), newleft = (my ? 0 : -36);

  if (title && titleNode) {
    val(titleNode, title);
  }
  mv.likes = countInput.value = count;
  animateCount(countNode, count);

  if (mvcur.statusVideo) {
    var wallCount = ge('like_count' + mv.videoRaw);
    if (wallCount) {
      wallCount.innerHTML = count ? count : '';
      (ge('like_real_count_wall' + mv.videoRaw) || {}).value = count;
      var statusIcon = ge('like_icon' + mv.videoRaw);
      if (statusIcon) {
        if (my) {
          addClass(statusIcon, 'my_like');
        } else {
          removeClass(statusIcon, 'my_like');
        }
        if (count) {
          removeClass(statusIcon, 'no_likes');
          setStyle(statusIcon, {opacity: 1, visibility: 'visible'});
        } else {
          addClass(statusIcon, 'no_likes');
          setStyle(statusIcon, {opacity: 0, visibility: 'hidden'});
        }
      }
    }
  }

  mv.liked = my;
  if (!my) {
    var cb = ge('like_share_video' + mv.videoRaw);
    if (cb) checkbox(cb, false);
  } else {
    setStyle(icon, {opacity: 1});
  }
  if (count) {
    var styleName = vk.rtl ? 'right' : 'left';
    if (tt.el && !isVisible(tt.container) && !title) {
      rows.style[styleName] = newleft + 'px';
      if (nott !== true) {
        tooltips.show(tt.el, extend(opts, {showdt: 0}));
      }
    } else if (rows) {
      var params = {};
      params[styleName] = newleft;
      animate(rows, params, 200);
    }
    removeClass(icon, 'no_likes');
  } else {
    if (tt.el) tt.hide();
    addClass(icon, 'no_likes');
  }
},

likeSmall: function() {
  Videoview.like();
  addClass(ge('mv_like_line'), 'video_liked');
  return false;
},

addSmall: function(videoRaw, hash, gid, accessHash) {
  Videoview.addVideo(videoRaw, hash, false, gid, accessHash);
  hide('video_add_action_link');
  addClass(ge('mv_like_line'), 'video_added');
},

share: function(videoRaw, obj) {
  if (!vk.id) return;
  showBox('like.php', {act: 'publish_box', object: 'video'+(mvcur.mvData.addedVideo || videoRaw)});
  return false;
},

like: function() {
  if (!vk.id) return;
  var mv = mvcur.mvData;
  if (mvcur.statusVideo) {
    var object = 'wall' + mv.videoRaw;
  } else {
    var object = 'video' + mv.videoRaw;
  }
  ajax.post('like.php', {act: 'a_do_' + (mv.liked ? 'un' : '') + 'like', object: object, hash: mv.likeHash, short_view: 1, from: 'videoview'}, {
    onDone: Videoview.likeUpdate.pbind(!mv.liked)
  });
  Videoview.likeUpdate(!mv.liked, mv.likes + (mv.liked ? -1 : 1));
},

likeShare: function(hash) {
  if (!vk.id) return;
  var mv = mvcur.mvData;
  if (mvcur.statusVideo) {
    var object = 'wall' + mv.videoRaw;
  } else {
    var object = 'video' + mv.videoRaw;
  }
  var el = ge('like_share_video' + mv.videoRaw), was = isChecked(el);
  checkbox(el);
  ajax.post('like.php', {act: 'a_do_' + (was ? 'un' : '') + 'publish', object: object, hash: hash, short_view: 1, list: mvcur.listId}, {
    onDone: Videoview.likeUpdate.pbind(true)
  });
  Videoview.likeUpdate(true, mv.likes + (mv.liked ? 0 : 1));
},

likeOver: function() {
  var mv = mvcur.mvData;
  var icon = ge('mv_like_icon'),
      link = ge('mv_like_link');

  if (!mv.liked) {
    setTimeout(animate.pbind(icon, {opacity: 1}, 200, false), 1);
  } else {
    setStyle(icon, {opacity: 1});
  }
  var leftShift = vk.id ? 36 : 56;
  if (mvcur.statusVideo) {
    var object = 'wall' + mv.videoRaw;
  } else {
    var object = 'video' + mv.videoRaw;
  }
  var linkW = link.offsetWidth;

  showTooltip(icon.parentNode, {
    url: 'like.php',
    params: {act: 'a_get_stats', object: object, list: mvcur.listId},
    slide: 15,
    shift: [0, 5, 9],
    ajaxdt: 100,
    showdt: 400,
    hidedt: 200,
    className: 'rich like_tt',
    no_shadow: (mvcur.videoAds || mvcur.statusVideo) ? 1 : 0,
    init: function (tt) {
      if (!tt.container) return;
      var bp = geByClass1('bottom_pointer', tt.container, 'div');
      var tp = geByClass1('top_pointer', tt.container, 'div');
      setStyle(bp, {marginLeft: linkW + 2});
      setStyle(tp, {marginLeft: linkW + 2});
    }
  });
},

likeOut: function() {
  var mv = mvcur.mvData;
  if (!mv.liked) {
    setTimeout(animate.pbind(ge('mv_like_icon'), {opacity: 0.4}, 200, false), 1);
  } else if (mvcur.videoAds || mvcur.statusVideo) {
    setTimeout(animate.pbind(ge('mv_like_icon'), {opacity: 0.7}, 200, false), 1);
  }
},

showEditBox: function(vid, oid, ev) {
  Videoview.hidePlayer();
  var box = showBox('al_video.php', {act: 'edit_box', vid: vid, oid: oid}, {stat: ['privacy.js', 'privacy.css', 'video.css'], dark: 1});
  box.setOptions({onHide: function() {
    Videoview.showPlayer();
  }});
  return cancelEvent(ev);
},

restoreVideo: function(vid, oid, hash, from, ev) {
  var warning = ge('mv_warning');
  if (warning) {
    warning.innerHTML = '<img style="margin-left: 100px;" src="/images/upload.gif" />';
  }
  ajax.post('al_video.php', {
    act: 'restore_video',
    vid: vid,
    oid: oid,
    hash: hash,
    from: from || 'videoviewer'
  }, {
    onDone: function(row) {
      if (from == 'list' && cur.restoreRaw && cur.restoreRaw[oid+'_'+vid]) {
        var rowCont = ge('video_row'+oid+'_'+vid);
        rowCont.innerHTML = cur.restoreRaw[oid+'_'+vid];

        removeClass(rowCont, 'video_row_loading');
        removeClass(rowCont, 'video_row_deleted');
        setStyle(geByClass1('video_row_icon_delete', rowCont), {opacity: 0.8});
        var skipClear = true;
      } else {
        var skipClear = false;
      }
      hide('mv_warning');
      show('mv_controls');
      show('mv_controls_line');
      if (cur.claimedVideoText) {
        ge('video_player').innerHTML = cur.claimedVideoText;
        cur.claimedVideoText = "";
      }
      if (window.mvcur && mvcur.mvCommentsData) {
        show(mvcur.mvCommentsData);
      }
      var row = eval('('+row+')');
      if (window.Video) {
        Video.addToList('all', row, skipClear);
      }
    },
    onFail: function(text) {
      setTimeout(showFastBox(getLang('global_error'), text).hide, 5000);
      return true;
    }
  });
  return cancelEvent(ev);
},

deleteVideo: function(vid, oid, hash, sure, from, obj, callback) {
  if (obj && hasClass(obj, 'loading')) return;
  ajax.post('al_video.php', {
    act: 'delete_video',
    vid: vid,
    oid: oid,
    hash: hash,
    sure: (sure) ? 1 : 0,
    from: from
  }, {onDone: function(type, removeInfo, text, do_button, cancel_button) {
    Videoview.recache(oid+'_'+vid);
    if (type == 'sure') {
      Videoview.hidePlayer();
      var box = showFastBox({title: removeInfo}, text);
      box.setOptions({onHide: function() {
        Videoview.showPlayer();
      }});
      box.removeButtons();
      box.addButton(cancel_button, box.hide, 'no');
      box.addButton(do_button, function() {
        box.showProgress();
        Videoview.deleteVideo(vid, oid, hash, true, from, obj, box.hide);
      }, 'yes');
    } else if (type == 'result') {
      if (callback) {
        callback(text);
      }
      if (from == 'videoviewer') {
        if (mvcur.mvCommentsData) {
          hide(mvcur.mvCommentsData);
          var warning = ge('mv_warning');
          warning.innerHTML = text;
          show(warning);
        }
        text = removeInfo;
      }
      if (cur.module == 'video') {
        var row = ge('video_row'+oid+'_'+vid);
        addClass(row, 'video_row_deleted');
        re(geByClass1('video_row_controls', row));
        var textEl = se(text);
        row.insertBefore(textEl, row.firstChild);
        setStyle(textEl, {marginTop: getSize(row)[1] / 2 - getSize(textEl)[1] / 2})
        Video.removeFromLists(oid+'_'+vid, true);
        return true;
      }
    }
  }, showProgress: obj ? addClass.pbind(obj, 'loading') : false, hideProgress: obj ? removeClass.pbind(obj, 'loading') : false});
},
deleteVideoOnClaim: function(vid, oid, hash, sure, from, obj) {
  Videoview.deleteVideo(vid, oid, hash, sure, from, obj, function(text) {
    if (from == 'videoviewer') {
      hide('mv_controls');
      hide('mv_controls_line');
      cur.claimedVideoText = ge('video_player').innerHTML;
      ge('video_player').innerHTML = text;
    }
  });
},

tagOver: function(el) {
  animate(el, {backgroundColor: '#6B8DB1'}, 200);
  showTooltip(el, {text: getLang('video_delete_tag'), shift: [0, -2, 0]});
},

tagOut: function(el) {
  if (!el.parentNode || !el.parentNode.parentNode) return;
  animate(el, {backgroundColor: '#C4D2E1'}, 200);
},

recache: function(videoRaw) {
  if (!videoRaw && window.mvcur && mvcur.mvData.videoRaw) {
    videoRaw = mvcur.mvData.videoRaw;
  }
  for (var i in ajaxCache) {
    if (i.match(/^\/al_video\.php\#act=show/) && i.match(new RegExp('\&video='+videoRaw+'([^0-9]|$)', ''))) {
      delete(ajaxCache[i]);
    }
  }
},

deleteTag: function(tagId, usersTag) {
  var actionCont = ge('mv_action_info');
  actionCont.innerHTML = '<img src="/images/upload.gif" />';
  show(actionCont);
  mv = mvcur.mvData;
  ajax.post('al_video.php', {act: 'delete_tag', video: mv.videoRaw, tag_id: tagId, hash: mv.hash}, {onDone: function(info, tagsList) {
    ge('mv_action_info').innerHTML = info;
    ge('mv_tags_list').innerHTML = tagsList;
    (tagsList ? show : hide)('mv_tags');
    (info ? show : hide)('mv_action_info');
    Videoview.recache(mv.videoRaw);
    if (window.Video && Video.removeFromLists && usersTag) {
      Video.removeFromLists(mvcur.mvData.videoRaw);
    }
  }});
},

restoreTag: function(tagId) {
  var actionCont = ge('mv_action_info');
  actionCont.innerHTML = '<img src="/images/upload.gif" />';
  show(actionCont);
  mv = mvcur.mvData;
  ajax.post('al_video.php', {act: 'restore_tag', video: mv.videoRaw, tag_id: tagId, hash: mv.hash}, {onDone: function(info, tagsList) {
    ge('mv_action_info').innerHTML = info;
    ge('mv_tags_list').innerHTML = tagsList;
    (tagsList ? show : hide)('mv_tags');
    (info ? show : hide)('mv_action_info');
    Videoview.recache(mv.videoRaw);
  }});
},

addTags: function(ids) {
  var actionCont = ge('mv_action_info');
  actionCont.innerHTML = '<img src="/images/upload.gif" />';
  show(actionCont);
  mv = mvcur.mvData;
  ajax.post('al_video.php', {act: 'add_tags', video: mv.videoRaw, ids: ids.join(','), hash: mv.hash}, {onDone: function(info, tagsList) {
    ge('mv_action_info').innerHTML = info;
    ge('mv_tags_list').innerHTML = tagsList;
    (tagsList ? show : hide)('mv_tags');
    (info ? show : hide)('mv_action_info');
    Videoview.recache(mv.videoRaw);
  }});
},

getVideoCode: function(oid, vid) {
  Videoview.hidePlayer();
  var box = showBox('al_video.php', {act: 'video_embed_box', oid: oid, vid: vid}, {
    stat: ['ui_controls.js', 'ui_controls.css', 'video.css'],
    dark: 1,
    params: {
      width: 390,
      bodyStyle: 'padding: 5px 20px 20px;'
    }
  });
  box.setOptions({onHide: function() {
    Videoview.showPlayer();
  }});
},

report: function(oid, vid) {
  Videoview.hidePlayer();
  showBox('reports.php', {act: 'a_report_video_box', oid: oid, vid: vid}, {onHideAttempt: function() {
    Videoview.showPlayer();
  }, stat: ['ui_controls.js', 'ui_controls.css']});
},

spamVideo: function(oid, vid, hash, obj, from, sure, callback) {
  if (obj) {
    addClass(obj, 'loading');
  }
  ajax.post('al_video.php', {
    act: 'spam_video',
    vid: vid,
    oid: oid,
    hash: hash,
    sure: (sure) ? 1 : 0,
    from: from
  }, {onDone: function(type, title, text, do_button, cancel_button) {
    if (obj) {
      removeClass(obj, 'loading');
    }
    Videoview.recache(oid+'_'+vid);
    if (type == 'sure') {
      Videoview.hidePlayer();
      var box = showFastBox({title: title}, text);
      box.setOptions({onHide: function() {
        Videoview.showPlayer();
      }});
      box.removeButtons();
      box.addButton(cancel_button, box.hide, 'no');
      box.addButton(do_button, function() {
        box.showProgress();
        Videoview.spamVideo(oid, vid, hash, obj, from, true, box.hide);
      }, 'yes');
    } else if (type == 'result') {
      if (callback) {
        callback();
      }
      if (from == 'videoviewer') {
        if (mvcur.mvCommentsData) {
          hide(mvcur.mvCommentsData);
          var warning = ge('mv_warning');
          warning.innerHTML = text;
          show(warning);
        }
        if (window.Video) {
          Video.removeFromLists(oid+'_'+vid);
        }
      } if (from == 'list') {
        ge('video_row'+oid+'_'+vid).innerHTML = '<div class="video_row">'+text+'</div>';
        Video.removeFromLists(oid+'_'+vid, true);
        return true;
      }
    } else {
      obj.parentNode.innerHTML = type;
    }
  }});
},

licensed: function(obj, hash) {
  var actionCont = ge('mv_licensed_info');
  actionCont.innerHTML = '<img src="/images/upload.gif" />';
  show(actionCont);

  ajax.post('al_video.php', {act: 'change_licensed', video: mvcur.mvData.videoRaw, hash: hash}, {onDone: function(text, info) {
    actionCont.innerHTML = info;
    (info ? show : hide)(actionCont);
    obj.innerHTML = text;
  }});
},
claimed: function(claim_id, action) {
  ge('claim_link').innerHTML = '<img src="/images/upload.gif" />';

  ajax.post('al_claims.php', {act: 'a_' + action, type: 'video', id: mvcur.mvData.vid, owner_id: mvcur.mvData.oid, claim_id: claim_id}, {onDone: function() {
    if (action == 'claim') {
      ge('claim_link').innerHTML = '<a onclick="return Videoview.claimed(' + claim_id + ', \'unclaim\');\">Вернуть</a>';
    } else {
      ge('claim_link').innerHTML = '<a onclick="return Videoview.claimed(' + claim_id + ', \'claim\');\">Изъять</a>';
    }
  }});
},

confirmTag: function(tagId) {
  var actionCont = ge('mv_action_info');
  ge('mv_approve').innerHTML = '<div style="text-align: center; padding-top: 4px;"><img src="/images/upload.gif"></div>';
  ajax.post('al_video.php', {act: 'confirm_tag', video: mvcur.mvData.videoRaw, tag_id: tagId, hash: mvcur.mvData.hash}, {onDone: function(info, tagsList, padres) {
    if (_pads.shown == 'vid') {
      Pads.vidDone(mvcur.mvData.videoRaw, false, padres);
    }
    Pads.invalidate('vid');
    hide('mv_approve');
    ge('mv_tags_list').innerHTML = tagsList;
    (tagsList ? show : hide)('mv_tags');
    if (window.Video && Video.onTagConfirm) {
      Video.onTagConfirm(mvcur.mvData.videoRaw);
    }
    Videoview.recache(mvcur.mvData.videoRaw);
  }});
},

declineTag: function(tagId) {
  var appr = ge('mv_approve');
  var back = appr.innerHTML;
  appr.innerHTML = '<div style="text-align: center; padding-top: 4px;"><img src="/images/upload.gif"></div>';
  ajax.post('al_video.php', {act: 'delete_tag', video: mvcur.mvData.videoRaw, tag_id: tagId, hash: mvcur.mvData.hash}, {
    onDone: function(info, tagsList, padres) {
      if (_pads.shown == 'vid') {
        Pads.vidDone(mvcur.mvData.videoRaw, false, padres);
      }
      Pads.invalidate('vid');
      ge('mv_approve').innerHTML = info;
      //hide('mv_approve');
      ge('mv_tags_list').innerHTML = tagsList;
      (tagsList ? show : hide)('mv_tags');
      if (window.Video && Video.removeFromLists) {
        Video.removeFromLists(mvcur.mvData.videoRaw);
      }
      Videoview.recache(mvcur.mvData.videoRaw);
    },
    onFail: function() {
      appr.innerHTML = back;
    }
  });
},

setStyle: function(label, obj, style) {
  if (!mvcur.restoreStyles) {
    mvcur.restoreStyles = {};
  }
  for (var i in style) {
    if (!mvcur.restoreStyles[label]) {
      mvcur.restoreStyles[label] = {};
    }
    mvcur.restoreStyles[label][i] = obj.style[i];
    obj.style[i] = style[i];
  }
},

restoreStyle: function(label, obj) {
  setStyle(obj, mvcur.restoreStyles[label]);
},

showVideo: function(title, html, js, desc, info, controlsLine, opt) {
  if (!vk.id && !html) {
    setTimeout(function() {
      Videoview.hide(false, true);
      showDoneBox(title);
    }, 500);
    return;
  }

  opt = opt || {};
  window.lang = extend(window.lang || {}, opt.lang);
  mvcur.mvCommLimit = opt.commlimit;
  mvcur.mvData = opt.mvData;
  mvcur.videoRaw = opt.mvData.videoRaw;
  mvcur.mvMediaTypes = opt.media;
  mvcur.mvMediaShare = opt.share;
  mvcur.mvReplyNames = opt.names || {};

  if (!mvcur.mvContent) {
    mvcur.mvContent = ge('mv_content');
  }

  Wall.cancelEdit(true);

  mvcur.mvContent.innerHTML = html;
  if (mvcur.mvWide) {
    mvcur.mvWide.innerHTML = desc;
  }
  if (mvcur.mvNarrow) {
    mvcur.mvNarrow.innerHTML = info;
  }

  Videoview.updateComposer();
  if (mvcur.mvData.videoRaw == cur.mvReplyIn) {
    mvcur.mvReplyTo = cur.mvReplyTo;
    cur.mvReplyIn = mvcur.videoRaw;
    cur.mvReplyTo = mvcur.mvReplyTo;
  } else {
    Videoview.commentTo(false);
  }

  if (!cur.mvComments) cur.mvComments = {};
  var cms = ge('mv_comments_wrap');
  if (cur.mvComments[mvcur.videoRaw]) {
    domPN(cms).replaceChild(cur.mvComments[mvcur.videoRaw], cms);
  }

  mvcur.mvControlsLine.innerHTML = controlsLine;

  mvcur.finished = false;

  hide(mvcur.mvLoader);
  if (js) {
    eval('(function(){' + js + '})()');
  }
  if (opt['taggedInfo']) {
    var tagInfo = ge('mv_approve');
    tagInfo.innerHTML = opt['taggedInfo'];
    show(tagInfo);
  }

  Videoview.updateSize();
  mvcur.changeCanvasSize = function() {
    Videoview.updateSize();
    window.checkRBoxes && checkRBoxes();
  };

  if (mvcur.minimized) {
    Videoview.minimizePlayer();
  }

  var titleWidth = (mvcur.minimized) ? mvcur.minSize.wrap.w : false;
  Videoview.setTitle(titleWidth);

  if (mvcur.statusVideo) {
    var statusCont = ge('like_count' + mvcur.mvData.videoRaw);
    if (statusCont) {
      var tt = statusCont.parentNode.tt;
      if (tt && tt.container) {
        re(tt.container)
        //re(tt.el);
      }
      if (statusCont.parentNode.tt) {
        delete statusCont.parentNode.tt;
      }
    }
  }
  if (opt.showInfo && !mvcur.minimized && !mvcur.options.hideInfo) {
    addClass(mvcur.mvControlsLine, 'mv_controls_shown');
    show(ge('mv_controls'));
  }

  show('mv_content');
  window.updateWndVScroll && updateWndVScroll();

  if ((mvcur.options || {}).scroll) {
    mvLayerWrap.scrollTop = mvcur.options.scroll;
    mvcur.options.scroll = 0;
  }
},

setTitle: function(len) {
  var title  = mvcur.mvData.title || '';
  if (len) {
    len = Math.floor(len / 7.5);
  }
  len = len || 80;
  if (title.length > len) {
    title = title.substr(0, len);
    title = title.replace(/<|>/g, '');
    title = trim(title.replace(/&[^;]*$/, ''));
    title += '...';
  }
  ge('mv_min_title').innerHTML = title;
},

getContSize: function() {
  if (!mvcur.contSize) {
    mvcur.contSize = getSize(mvcur.mvBox);
  }
  return mvcur.contSize;
},

getContPlace: function(event, click) {
  var mask = 0;
  var size = Videoview.getContSize();
  var x = event.clientX - mvcur.minSize.wrap.l;
  var y = event.clientY - mvcur.minSize.wrap.t;
  if (y < 6) mask += 1;
  if (x > size[0] - 20) mask += 2;
  if (y > size[1] - 10) mask += 4;
  if (x < 10) mask += 8;
  if (mask == 1 && x > size[0] - 55) {
    mask = 0;
  }
  if (!mask && y < 25 && x < size[0] - 55) {
    mask += 16;
  }
  return mask;
},

changeCursor: function(event) {
  var mask = Videoview.getContPlace(event);
  var cursor = 'default';
  if (mask && mvcur.minimized) {
    var direction = '';
    if (mask & 1) direction += 'n';
    if (mask & 4) direction += 's';
    if (mask & 2) direction += 'e';
    if (mask & 8) direction += 'w';
    cursor = direction+'-resize';
    if (mask & 16) {
      cursor = 'move';
    }
  }
  setStyle(mvcur.mvBox, {cursor: cursor});
},

getMinSize: function() {
  extend(mvcur.minSize, {
    wrap: {
      t: intval(mvLayerWrap.style.top),
      l: intval(mvLayerWrap.style.left),
      w: intval(mvLayerWrap.style.width),
      h: intval(mvLayerWrap.style.height)
    },
    player: {
      w: intval(mvcur.mvPlayer.style.width),
      h: intval(mvcur.mvPlayer.style.height)
    }
  });
},

startDrag: function(event) {
  if (event.button && event.button !== 1) {
    return;
  }
  var mask = Videoview.getContPlace(event, true);
  if (!mask) {
    return;
  }
  var dragTime = new Date().getTime();

  Videoview.getMinSize();
  extend(mvcur.minSize, {x: event.clientX, y: event.clientY});

  mvcur.resizeDiff = 0;
  mvcur.mvPlayerCont = mvcur.mvPlayer.parentNode;

  if (!mask || mask & 16) {
    var act = Videoview.onMinMove;
  } else {
    var act = Videoview.onMinResize;
  }
  mvcur.resizeMask = mask;
  var cb = function (event) {
    removeEvent(document, 'mouseup', cb);
    removeEvent(document, 'mousemove', act);
    removeEvent(document, 'drag', act);
    var time = new Date().getTime();
    Videoview.getMinSize();
    if (mvcur.resizeDiff < 8 && (time - dragTime) < 400 && (mask & 16 || mask == 1)) {
      Videoview.unminimize();
    }
    removeClass(mvLayerWrap, 'mv_resizing');
    hide(mvcur.mvLoader);
    addEvent(mvcur.mvBox, 'mousemove', Videoview.changeCursor);
    ls.set('mv_minSize', mvcur.minSize);
    return false;
  }
  addClass(mvLayerWrap, 'mv_resizing');
  show(mvcur.mvLoader);
  addEvent(document, 'mouseup', cb);
  addEvent(document, 'mousemove', act);
  addEvent(document, 'drag', act);
  removeEvent(mvcur.mvBox, 'mousemove', Videoview.changeCursor);
  return cancelEvent(event);
},

onMinMove: function(event) {
  if (event) {
    var diffY = event.clientY - mvcur.minSize.y;
    var diffX = event.clientX - mvcur.minSize.x;
  } else {
    var diffY = 0;
    var diffX = 0;
  }
  if (mvcur.minSize.wrap.t + diffY > mvcur.minSize.ch - mvcur.minSize.wrap.h - 15) {
    diffY = mvcur.minSize.ch - mvcur.minSize.wrap.h - mvcur.minSize.wrap.t;
  }
  if (mvcur.minSize.wrap.l + diffX > mvcur.minSize.cw - mvcur.minSize.wrap.w - 25) {
    diffX = mvcur.minSize.cw - mvcur.minSize.wrap.w - mvcur.minSize.wrap.l - 14;
  }
  if (mvcur.minSize.wrap.t + diffY < 15) {
    diffY = -mvcur.minSize.wrap.t;
  }
  if (mvcur.minSize.wrap.l + diffX < 15) {
    diffX = -mvcur.minSize.wrap.l;
  }
  setStyle(mvLayerWrap, {
    top: mvcur.minSize.wrap.t + diffY + 'px',
    left: mvcur.minSize.wrap.l + diffX + 'px'
  });
  mvcur.resizeDiff = Math.max(Math.abs(diffX), Math.max(Math.abs(diffY), mvcur.resizeDiff));
  return (event) ? cancelEvent(event) : false;
},

onMinResize: function(event) {
  var diffL = 0;
  var diffT = 0;
  var mask = mvcur.resizeMask;
  var diffY = (mask & 1 || mask & 4) ? event.clientY - mvcur.minSize.y : 0;
  var diffX = (mask & 2 || mask & 8) ? event.clientX - mvcur.minSize.x : 0;
  if ((mask & 4) && mvcur.minSize.wrap.t + diffY > mvcur.minSize.ch - mvcur.minSize.wrap.h) {
    diffY = mvcur.minSize.ch - mvcur.minSize.wrap.h - mvcur.minSize.wrap.t;
  }
  if ((mask & 1) && mvcur.minSize.wrap.t + diffY < 0) {
    diffY = -mvcur.minSize.wrap.t;
  }
  if ((mask & 2) && mvcur.minSize.wrap.l + diffX > mvcur.minSize.cw - mvcur.minSize.wrap.w - 14) {
    diffX = mvcur.minSize.cw - mvcur.minSize.wrap.w - mvcur.minSize.wrap.l - 14;
  }
  if ((mask & 8) && mvcur.minSize.wrap.l + diffX < 0) {
    diffX = -mvcur.minSize.wrap.l;
  }
  if (mask & 8) {
    diffL = diffX;
    diffX = -diffX;
  }
  if (mask & 1) {
    diffT = diffY;
    diffY = -diffY;
  }
  if (mvcur.minSize.wrap.w + diffX < 250) {
    diffX = 250 - mvcur.minSize.wrap.w;
    if (mask & 8) diffL = -diffX;
  }
  if (mvcur.minSize.wrap.h + diffY < 200) {
    diffY = 200 - mvcur.minSize.wrap.h;
    if (mask & 1) diffT = -diffY;
  }
  var change = Math.abs(diffX) + Math.abs(diffY);
  var wrapW = mvcur.minSize.wrap.w + diffX;
  setStyle(mvLayerWrap, {
    top: (mvcur.minSize.wrap.t + diffT) + 'px',
    left: positive(mvcur.minSize.wrap.l + diffL) + 'px',
    width: wrapW + 'px',
    height: (mvcur.minSize.wrap.h + diffY) + 'px'
  });
  var style = {
    height: (mvcur.minSize.player.h + diffY) + 'px',
    width: (mvcur.minSize.player.w + diffX) + 'px'
  };
  if (!mvcur.flashResizeStyle) {
    if (change > 4) {
      clearTimeout(mvcur.resizeTimeout);
    }
    mvcur.resizeTimeout = setTimeout(function() {
      setStyle(mvcur.mvPlayer, mvcur.flashResizeStyle);
      mvcur.flashResizeStyle = false;
    }, 200);
  }
  mvcur.flashResizeStyle = style;
  setStyle(mvcur.mvPlayerCont, style);

  mvcur.resizeDiff = Math.max(change, mvcur.resizeDiff);
  mvcur.contSize = false;
  Videoview.setTitle(wrapW);
  if (ge('html5_player') && window.html5video) {
    html5video.onResize()
  }
  return false;
},

minimize: function(ev) {
  ev && cancelEvent(ev);

  if (mvcur.minimized) {
    return false;
  }

  mvcur.controlsVisibility = isVisible('mv_controls');
  hide('mv_controls');
  hide('mv_top_controls');
  if (isVisible('mv_approve')) {
    mvcur.needShowApprove = true;
    hide('mv_approve');
  } else {
    mvcur.needShowApprove = false;
  }

  Wall.cancelEdit(true);

  addClass(mvLayerWrap, 'mv_minimized');
  if (!mvcur.minSize) {
    mvcur.minSize = ls.get('mv_minSize');
  }

  var colorClass = 'mv_dark';
  removeClass(mvLayerWrap, colorClass);
  removeClass(layerBG, colorClass);
  layers.fullhide = false;

  if (!mvcur.minSize || !Videoview.enabledResize() || !mvcur.minSize.wrap.w) {
    mvcur.minSize = {
      wrap: {
        w: 300,
        h: 210
      }
    }
  }

  var wrap = mvcur.minSize.wrap;
  mvcur.minSize.player = {w: wrap.w - 20, h: wrap.h - 37};

  Videoview.setStyle('mvCont', mvcur.mvCont, {
    left: '0px',
    top: '0px'
  });

  mvLayer.style.width = 'auto';

  if (mvcur.mvData) {
    Videoview.minimizePlayer();
  }

  if (window.tooltips) {
    tooltips.destroyAll(cur.mvBox);
  }

  removeEvent(window, 'resize', Videoview.onResize);
  removeEvent(document, 'keydown', Videoview.onKeyDown);

  addEvent(window, 'resize', Videoview.minResize);
  if (Videoview.enabledResize()) {
    addEvent(mvcur.mvBox, 'mousedown', Videoview.startDrag);
    addEvent(mvcur.mvBox, 'mousemove', Videoview.changeCursor);
    mvcur.minDestroy = function() {
      removeEvent(mvcur.mvBox, 'mousedown', Videoview.startDrag);
      removeEvent(mvcur.mvBox, 'mousemove', Videoview.changeCursor);
      setStyle(mvcur.mvBox, {cursor: 'default'});
    }
  } else {
    addEvent(ge('mv_min_title'), 'click', Videoview.unminimize);
    mvcur.minDestroy = function() {
      removeEvent(ge('mv_min_title'), 'click', Videoview.unminimize);
    }
  }

  Videoview.setTitle(wrap.w);

  Videoview.minResize();

  Videoview.setStyle('mvLayerWrap', mvLayerWrap, {
    width: mvcur.minSize.wrap.w + 'px',
    height: mvcur.minSize.wrap.h + 'px'
  });

  mvcur.minimized = true;

//  if (window.wkcur && wkcur.shown) {
//    WkView.showLayer();
//  } else {
    layers.wraphide();
//  }

  var popLayer = layerQueue.count();
  if (!mvcur.noLocChange) {
    if (!mvcur.noHistory) {
      popLayer = false;
      history.go(-1); // return location through history
    } else {
      Videoview.backLocation();
    }
    mvcur.noHistory = 1;
  }

  layerQueue.skipVideo = true;
  if (popLayer) {
    debugLog('pop from minimize');
    layerQueue.pop();
  }

  return false;
},

enabledResize: function() {
  return (browser.safari || browser.chrome || browser.mozilla | browser.opera) && !browser['safari_mobile'];
},

minimizePlayer: function() {
  mvcur.mvPlayer = ge('video_player') || ge('extra_player') || ge('html5_player');
  if (mvcur.mvPlayer) {
    var style = {
      width: mvcur.minSize.player.w + 'px',
      height: mvcur.minSize.player.h + 'px'
    };
    Videoview.setStyle('mvPlayer', mvcur.mvPlayer, style);
    Videoview.setStyle('mvPlayerParent', mvcur.mvPlayer.parentNode, style);
    if (ge('html5_player') && window.html5video) {
      html5video.onResize()
    }
  }
},

minResize: function() {
  var docEl = document.documentElement;

  mvcur.minSize.ch = window.innerHeight || docEl.clientHeight || bodyNode.clientHeight;
  mvcur.minSize.cw = window.innerWidth || docEl.clientWidth || bodyNode.clientWidth;

  var pos = getXY(ge('page_layout'));

  if (mvcur.minSize.wrap.t === undefined) {
    mvcur.minSize.wrap.t = mvcur.minSize.ch - mvcur.minSize.wrap.h;
  }
  if (mvcur.minSize.wrap.l === undefined) {
    mvcur.minSize.wrap.l = Math.max(String(pos[0] - mvcur.minSize.player.w / 2), 30);
  }

  setStyle(mvLayerWrap, {
    left: mvcur.minSize.wrap.l + 'px',
    top: mvcur.minSize.wrap.t + 'px'
  });

  Videoview.onMinMove();

  if (mvcur.minimized) {
    Videoview.getMinSize();
  }
},

updateComposer: function() {
  var yc = ge('mv_your_comment');
  if (!yc || cur.mvYourComment == yc) return;

  if (cur.mvYourComment) {
    domPN(yc).replaceChild(cur.mvYourComment, yc);
    return;
  }
  var comp = data(ge('mv_comment'), 'composer');
  if (comp) {
    Composer.reset(comp);
    Composer.destroy(comp);
  }
  cur.mvYourComment = yc;
  cur.destroy.push(function(c) {
    var field = c.pvYourComment && geByTag1('textarea', c.pvYourComment), comp = field && data(field, 'composer');
    if (comp) {
      Composer.reset(comp);
      Composer.destroy(comp);
    }
  });
  Wall.initComposer(ge('mv_comment'), {
    lang: {
      introText: getLang('profile_mention_start_typing'),
      noResult: getLang('profile_mention_not_found')
    },
    wddClass: 'mv_composer_dd',
    width: getSize(domPN(cur.pvYourComment))[0],
    media: {
      lnk: domFC(ge('mv_add_media')),
      preview: ge('mv_media_preview'),
      types: mvcur.mvMediaTypes,
      options: {limit: 2, disabledTypes: ['album'], toggleLnk: true, onChange: function() {
        setTimeout(Videoview.updateArrowsY, 2);
      }}
    }
  });
  if (!cur.options) cur.options = {};
  if (!cur.options.share) cur.options.share = mvcur.mvMediaShare;
},

unminimize: function(noLoc, beforeHide, noQueue) {
  if (!mvcur.minimized) {
    return;
  }
  if (!noQueue) {
    layerQueue.push();
  }
  if (!beforeHide) {
    layerQueue.hide();
    setTimeout(function() {
      mvcur.noHistory = 1;
      layerQueue.noHistory();
      layers.wrapshow(mvLayerWrap, 0.7);
      layers.fullhide = Videoview.hide;
      Videoview.updateComposer();
      cur.mvReplyIn = mvcur.videoRaw;
      cur.mvReplyTo = mvcur.mvReplyTo;
    }, 0);
  }
  Videoview.hidePlayer(true);

//  if (window.wkLayerWrap && isVisible(window.wkLayerWrap)) {
//    hide(wkLayerWrap);
//  }

  if (mvcur.controlsVisibility) {
    show('mv_controls');
  }
  //show('mv_right_controls');
  show('mv_top_controls');

  mvcur.minimized = false;
  removeClass(mvLayerWrap, 'mv_minimized');
  Videoview.restoreStyle('mvLayerWrap', mvLayerWrap);

  var colorClass = 'mv_dark';
  addClass(mvLayerWrap, colorClass);
  addClass(layerBG, colorClass);

  if (mvcur.needShowApprove) {
    mvcur.needShowApprove = false;
    show('mv_approve');
  }

  Videoview.restoreStyle('mvCont', mvcur.mvCont);
  if (mvcur.mvPlayer) {
    Videoview.restoreStyle('mvPlayer', mvcur.mvPlayer);
    Videoview.restoreStyle('mvPlayerParent', mvcur.mvPlayer.parentNode);
    if (ge('html5_player') && window.html5video) {
      html5video.onResize()
    }
  }

//  if (cur.pvFixed) {
//    hide(cur.pvFixed);
//    cur.pvFixedHide = true;
//  }
//  layers.wrapshow(false, 0.7);

  Videoview.updateSize();

  addEvent(window, 'resize', Videoview.onResize);
  addEvent(document, 'keydown', Videoview.onKeyDown);
  removeEvent(window, 'resize', Videoview.minResize);

  if (mvcur.minDestroy) {
    mvcur.minDestroy();
  }
  if (!mvcur.noLocChange && noLoc !== true) {
    Videoview.setLocation();
  }

  onBodyResize(true);

  setStyle(mvLayerWrap, {
    left: '0px',
    top: '0px'
  });

  Videoview.showPlayer(true);

  Videoview.setTitle();

  return false;
},

sendVideo: function() {
  Videoview.hidePlayer();
  var box = showBox('like.php', {act: 'publish_box', object: 'video' + mvcur.videoRaw, to: 'mail'}, {stat: ['page.js', 'page.css', 'wide_dd.js', 'wide_dd.css', 'sharebox.js']});
  box.setOptions({onHideAttempt: function() {
    Videoview.showPlayer();
    return true;
  }});
},

showShare: function() {
  clearTimeout(cur.hideShareTimer);
  var dd = ge('mvs_dd');
  ge('mv_share').blur();
  if (isVisible(dd)) {
    return fadeIn(dd, 0);
  }
  setTimeout(addEvent.pbind(document, 'click', Videoview.hideShare), 1);
  show(dd);
},

hideShare: function(timeout) {
  if (timeout > 0) {
    cur.hideShareTimer = setTimeout(Videoview.hideShare.pbind(0), timeout);
    return;
  }
  var dd = ge('mvs_dd');
  if (!dd) return;
  if (timeout == -1) {
    hide(dd);
  } else {
    fadeOut(dd, 200);
  }
  removeEvent(document, 'click', Videoview.hideShare);
},

showStats: function(oid, vid) {
  showBox('al_stats.php', {act: 'video_stat', oid: oid, vid: vid}, {params: {width: 654}, dark: 1});
},

_eof: 1}, videoview = Videoview;try{stManager.done('videoview.js');}catch(e){}
