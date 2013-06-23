var Photoview = {
  blank: '/images/blank.gif',
  blankf: function() {},
  cacheSize: 3,
  allSizes: ['x', 'y', 'z'/*, 'w'*/],
  genUrl: function(base, add) {
    if (!add.match(/\.[a-z]{3}$/i)) add += '.jpg';
    if (add.match(/https?:\/\//i)) return add;
    return (base || '').replace(/\/[a-z0-9_:\.]*$/i, '') + '/' + add;
  },
  genData: function(ph, size) {
    var f = (size == 'x') ? 3 : ((size == 'y') ? 2 : ((size == 'z') ? 1 : 0)), c = ['w', 'z', 'y', 'x'].slice(f), d, s, i, l;
    for (i = 0; i < 4 - f; ++i) {
      l = c[i];
      if (d = ph[l + '_']) break;
      if (s = ph[l + '_src']) break;
    }
    if (!d) d = [s];
    return {src: Photoview.genUrl(ph.base, d[0]), width: d[2] && d[1], height: d[1] && d[2]};
  },

  updateArrows: function() {
    var sbw = sbWidth() + 2;
    if (cur.pvLeft) {
      cur.pvLeft.style.left = '20px';//(Math.floor((lastWindowWidth - sbw - cur.pvActualWidth - 52) / 2) - 39) + 'px';
    }
    cur.pvLeftNav.style.width = Math.floor((lastWindowWidth - sbw - cur.pvActualWidth - 52) / 2) + 'px';
    cur.pvRightNav.style.left = Math.floor((lastWindowWidth - sbw + cur.pvActualWidth + 52) / 2) + 'px';
    cur.pvRightNav.style.width = Math.floor((lastWindowWidth - sbw - cur.pvActualWidth - 52) / 2) + 'px';
    if (cur.pvClose) {
      cur.pvClose.style.left = (lastWindowWidth - sbw - 2 - 37) + 'px';//(Math.floor((lastWindowWidth - sbw + cur.pvActualWidth + 52) / 2) + 22) + 'px';
    }
  },
  updateHeight: function() {
    var h = cur.pvBox.offsetHeight + 110, sbw = Math.floor(sbWidth() / 2);
    cur.pvLeftNav.style.height = cur.pvRightNav.style.height = (h - 110) + 'px';
    window.updateWndVScroll && updateWndVScroll();
    if (!browser.mobile) return;
    var skipTop = 10 + cur.pvYOffset;
    cur.pvLeft.style.top = cur.pvClose.style.top = (cur.pvYOffset + 25) + 'px';
    if (lastWindowHeight < cur.pvYOffset + h) {
      setTimeout(function() {
        var f = ge('footer');
        f.style.height = (intval(getStyle(f, 'height')) + (cur.pvYOffset + h - lastWindowHeight)) + 'px';
        onBodyResize();
        Photoview.onResize();
      }, 1);
    }
  },
  actionInfo: function() {
    return ge('pv_action_info') || cur.pvWide.insertBefore(ce('div', {id: 'pv_action_info'}), cur.pvTags);
  },

  locNav: function(ch, old, nw, opts) {
    if ((cur.pvListId == 'newtag' + vk.id + (nw.rev ? '/rev' : '')) && (nw[0] == 'albums' + vk.id) && (nw.act == 'added')) {
      Photoview.hide(opts.hist);
      return false;
    }
    nw = nav.toStr(nw);
    if (nw.replace('?rev=1', '/rev') == cur.pvListId && cur.pvShown) {
      Photoview.hide(opts.hist);
      return false;
    }
    var m = nw.match(/^photo(-?\d+_\d+)\??((all=1|newtag=\d+)(&rev=1)?|(rev=1&)?tag=\d+|rev=1)?$/);
    if (!m) return;

    var listId = cur.pvListId;
    if (!listId || !cur.pvShown) {
      if (nav.objLoc.act == 'added') {
        listId = 'newtag' + vk.id + (nav.objLoc.rev ? '/rev' : '');
      } else {
        listId = nav.strLoc.replace('?rev=1', '/rev');
      }
    }
    var data = cur.pvData[listId];
    if (!data) return;

    for (var i = 0, l = data.length; i < l; ++i) {
      if (data[i] && data[i].id == m[1]) {
        Photoview.show(listId, i, false, cur.pvRoot);
        return false;
      }
    }
  },
  updateLocNav: function() {
    if (cur.pvRoot) {
      for (var i = 0, l = cur.nav.length; i < l; ++i) {
        if (cur.nav[i] == Photoview.locNav) return;
      }
      cur.nav.push(Photoview.locNav);
    } else {
      for (var i = 0, l = cur.nav.length; i < l; ++i) {
        if (cur.nav[i] == Photoview.locNav) {
          cur.nav.splice(i, 1);
          --i; --l;
        }
      }
    }
  },

  checkLayerVisibility: function() {
    if (cur.pvShown) return true;

    debugLog('layerqueue.hide from photoview');
    layerQueue.hide();

    addEvent(window, 'resize', Photoview.onResize);
    addEvent(document, 'keydown', Photoview.onKeyDown);
    addEvent(layerWrap, 'click', Photoview.onClick);
    boxQueue.hideAll();
    setStyle(layerBG, {opacity: ''});
    layers.show();
    layers.fullhide = Photoview.hide;
  },
  createLayer: function() {
    var colorClass = vk.pvdark ? 'pv_dark' : 'pv_light';

    cur.pvFixed = bodyNode.appendChild(ce('div', {className: 'pv_fixed fixed ' + colorClass, innerHTML: '\
<div class="pv_left no_select" onmousedown="Photoview.show(false, cur.pvIndex - 1, event);" onmouseover="Photoview.activate(this)" onmouseout="Photoview.deactivate(this)"><div></div></div>\
<div class="pv_close no_select" onmouseover="Photoview.activate(this)" onmouseout="Photoview.deactivate(this)" onmousedown="cur.pvClicked = true; Photoview.onClick(event, true);"><div></div></div>\
    '}));

    cur.pvLeft = cur.pvFixed.firstChild;
    cur.pvClose = cur.pvLeft.nextSibling;

    addClass(layerWrap, colorClass);
    addClass(layerBG, colorClass);
    vkImage().src = '/images/upload.gif';

    var hhHide = Photoview.hhCheck() ? '' : ' style="display: none;"',
        albumsHtml = cur.pvAlbumsShown ? cur.pvAlbumsData[cur.pvAlbumsShown].html : '',
        albumHtml = cur.pvAlbumShown ? cur.pvAlbumData[cur.pvAlbumShown].html : '',
        pvVTagsHtml = cur.pvVideoTagsShown ? cur.pvVideoTagsData.html : '',
        pwStyle = cur.pvVideoTagsShown || cur.pvAlbumsShown || cur.pvAlbumShown || cur.pvPhotoTagShown ? 'display: none' : '',
        awStyle = cur.pvAlbumsShown ? '' : 'display: none',
        sawStyle = cur.pvAlbumShown ? '' : 'display: none',
        vtStyle = cur.pvVideoTagsShown ? '' : 'display: none';
    if (cur.pvPhotoTagShown) {
      albumHtml = cur.pvPhotoTagData[cur.pvPhotoTagShown].html;
      sawStyle = '';
    }

    layer.innerHTML = '\
<div class="pv_cont">\
\
<table cellspacing="0" cellpadding="0">\
<tr><td class="sidesh s1"><div></div></td><td>\
<table cellspacing="0" cellpadding="0">\
<tr><td class="sidesh s2"><div></div></td><td>\
<table cellspacing="0" cellpadding="0">\
<tr><td colspan="3" class="bottomsh s3"><div></div></td></tr>\
<tr><td class="sidesh s3"><div></div></td><td>\
\
<div id="pv_box" onclick="cur.pvClicked = true;">\
  <a class="fl_r pv_close_link" onclick="Photoview.hide(0)">' + getLang('global_close') + '</a>\
  <div id="pv_summary"><span class="summary"></span></div>\
  <div id="pv_photo_wrap" style="' + pwStyle + '">\
    <div id="pv_tag_info" class="clear_fix"></div>\
    <div class="no_select pv_data">\
      <div id="pv_tag_frame"></div>\
      <div id="pv_tag_faded"></div>\
      <div id="pv_tag_person" onmouseout="Photoview.hideTag()"></div>\
      <div id="pv_loader"></div>\
      <div class="pvs_hh"' + hhHide + ' id="pv_hh"><div class="pvs_hh_cover"><div class="pvs_hh_bg"></div><div class="pvs_hh_fg" id="pv_hh_fg" onmouseover="Photoview.hhOver(this)" onmouseout="Photoview.hhOut(this)" onmousedown="return Photoview.hhClick(this, event, 1)"></div></div></div>\
      <a onmouseout="Photoview.hideTag()" onmousedown="if (!cur.pvTagger && checkEvent(event) === false) return Photoview.show(false, cur.pvIndex + 1, event);" onselectstart="return cancelEvent(event);" onclick="return checkEvent(event)" href="" id="pv_photo"></a>\
    </div>\
    <div class="clear_fix select_fix" id="pv_comments_data">\
      <div class="fl_l wide_column">\
        <div id="pv_wide"></div>\
        <div id="pv_your_comment" class="clear clear_fix" onclick="return cancelEvent(event);">\
          <div id="pv_comment_header">' + getLang('photos_yourcomment') + '</div>\
          <textarea id="pv_comment" onkeyup="Photoview.commentChanged()" onkeypress="onCtrlEnter(event, Photoview.sendComment);"></textarea>\
          <div id="pv_comment_warn"></div>\
          <div id="pv_media_preview" class="clear_fix"></div>\
          <div id="pv_comment_submit">\
            <div class="button_blue fl_l"><button id="pv_comment_send">' + getLang('box_send') + '</button></div>\
            <div id="pv_reply_as_group" class="checkbox fl_l" onclick="checkbox(this)">\
              <div></div>' + getLang('wall_reply_as_group') + '\
            </div>\
            <div id="pv_reply_to_title" class="fl_l"></div>\
            <div id="pv_del_reply_to" class="fl_l" onclick="Photoview.commentTo()"></div>\
            <div id="pv_add_media" class="fl_r">\
              <span class="add_media_lnk">' + getLang('global_add_media') + '</span>\
            </div>\
          </div>\
        </div>\
      </div>\
      <div class="fl_r narrow_column" id="pv_narrow"></div>\
    </div>\
  </div>\
  <div id="pv_albums_wrap" style="' + awStyle + '">' + albumsHtml + '</div>\
  <div id="pv_album_wrap" '+ (cur.pvsaMini ? 'class="pv_album_wrap_mini"' : '') +' style="' + sawStyle + '">' + albumHtml + '</div>\
  <div id="pv_vtagged_wrap" style="' + vtStyle + '">' + pvVTagsHtml + '</div>\
</div>\
\
</td><td class="sidesh s3"><div></div></td></tr>\
<tr><td colspan="3" class="bottomsh s3"><div></div></td></tr></table>\
</td><td class="sidesh s2"><div></div></td></tr>\
<tr><td colspan="3" class="bottomsh s2"><div></div></td></tr></table>\
</td><td class="sidesh s1"><div></div></td></tr>\
<tr><td colspan="3" class="bottomsh s1"><div></div></td></tr></table>\
</div>\
<div class="no_select" id="pv_left_nav" '+'onmouseover="Photoview.activate(cur.pvLeft)" onmouseout="Photoview.deactivate(cur.pvLeft)" onmousedown="cur.pvClicked = true; Photoview.show(false, cur.pvIndex - 1, event);" onselectstart="return cancelEvent(event);"></div>\
<div class="no_select" id="pv_right_nav" '+'onmouseover="Photoview.activate(cur.pvClose)" onmouseout="Photoview.deactivate(cur.pvClose)" onmousedown="cur.pvClicked = true; Photoview.onClick(event, true);"></div>\
<div class="pv_switch no_select" id="pv_switch" onmouseover="if (!browser.msie6) Photoview.activate(this)" onmouseout="if (!browser.msie6) Photoview.deactivate(this)" onmousedown="Photoview.switchColor(this); cur.pvClicked = true;"><div class="pv_switch_wrap"><img class="pv_switch_img" width="10" height="22" src="/images/photoswitch'+(window.devicePixelRatio >= 2 ? '_2x' : '')+'.png" /></div></div>\
    ';

    if (cur.pvYourComment) {
      domPN(ge('pv_your_comment')).replaceChild(cur.pvYourComment, ge('pv_your_comment'));
    }
    extend(cur, {
      pvCont: domFC(layer),
      pvBox: ge('pv_box'),

      pvLeftNav: ge('pv_left_nav'),
      pvRightNav: ge('pv_right_nav'),

      pvPhotoWrap: ge('pv_photo_wrap'),
      pvAlbumWrap: ge('pv_album_wrap'),
      pvAlbumsWrap: ge('pv_albums_wrap'),
      pvVTagsWrap: ge('pv_vtagged_wrap'),

      pvSummary: domFC(ge('pv_summary')),
      pvTagInfo: ge('pv_tag_info'),
      pvLoader: ge('pv_loader'),
      pvTagFrame: ge('pv_tag_frame'),
      pvTagFaded: ge('pv_tag_faded'),
      pvTagPerson: ge('pv_tag_person'),
      pvPhoto: ge('pv_photo'),
      pvCommentsData: ge('pv_comments_data'),

      pvNarrow: ge('pv_narrow'),
      pvWide: ge('pv_wide'),

      pvHH: ge('pv_hh'),
      pvHHFg: ge('pv_hh_fg'),

      pvYourComment: ge('pv_your_comment'),
      pvAddMedia: domFC(ge('pv_add_media')),
      pvMediaPreview: ge('pv_media_preview'),
      pvCommentSend: ge('pv_comment_send'),
      pvComment: ge('pv_comment'),
      pvAsGroup: ge('pv_reply_as_group'),

      pvSwitch: ge('pv_switch')
    });
    addEvent(cur.pvPhoto, 'mousemove', Photoview.onMouseMove);
    if (browser.mobile) {
      cur.pvYOffset = intval(window.pageYOffset);

      cur.pvCont.style.paddingTop = cur.pvLeftNav.style.top =
      cur.pvRightNav.style.top = (cur.pvYOffset + 10) + 'px';

      cur.pvSwitch.style.top = cur.pvYOffset + 'px';
    }
    addEvent(layerWrap, 'scroll', Photoview.scrollResize);

    Photoview.updateSize();
  },
  doShowAlbums: function(ownerId, ev) {
    ownerId = intval(ownerId);
    if (ev && (ev.button == 2 || ev.which == 3)) return;

    clearTimeout(window.__pvhideTimer);
    if (__afterFocus) {
      return ev ? cancelEvent(ev) : false;
    }
    if (cur.pvTagger) {
      Phototag.stopTag();
      if (ev !== false) {
        return ev ? cancelEvent(ev) : false;
      }
    }

    var data = (cur.pvAlbumsData || {})[ownerId];
    if (!data) return;

//    if (window.wkLayerWrap && isVisible(window.wkLayerWrap)) {
//      wkcur.scrollTop = window.wkLayerWrap.scrollTop;
//      hide(wkLayerWrap);
//    }

    Photoview.checkLayerVisibility();
    cur.pvRoot = false;
    Photoview.updateLocNav();

    if (ev && ev.pageX && ev.pageY) {
      extend(cur, {pvOldX: ev.pageX, pvOldY: ev.pageY, pvOldT: vkNow()});
    }

    cur.pvShown = true;
    cur.pvAlbumsShown = ownerId;
    if (!cur.pvFixed || val('pva_owner') != ownerId) {
      extend(cur, {
        pvaOffset: data.opts.offset,
        pvaCount: data.opts.count,
        pvaPhotosOffset: data.opts.photos_offset,
        pvaPhotosCount: data.opts.photos_count,
        pvShowAllAlbums: false
      });
    }
    if (!cur.pvFixed) {
      Photoview.createLayer();
    } else {
      if (val('pva_owner') != ownerId) {
        val(cur.pvAlbumsWrap, data.html);
      }
      if (!isVisible(cur.pvAlbumsWrap)) {
        hide(cur.pvPhotoWrap, cur.pvAlbumWrap, cur.pvVTagsWrap);
        show(cur.pvAlbumsWrap);
        Photoview.updateSize();
        layerWrap.scrollTop = val('pva_scroll');
      }
    }

    cur.pvSummary.innerHTML = data.opts.summary;

    if (cur.pvListId && cur.pvListId != 'temp') {
      extend(cur, {
        pvOldListId: cur.pvListId,
        pvOldIndex: cur.pvIndex
      });
      var old = (cur.pvListId || '').split('/');
      if (old[0]) {
        Photoview.showRepeat(ge(old[0]));
      }

      show(cur.pvLeft, cur.pvLeftNav, cur.pvRightNav, cur.pvClose);
    } else {
      hide(cur.pvLeft, cur.pvLeftNav, cur.pvRightNav, cur.pvClose);
      if (!browser.msie || browser.version > 8) cur.pvClicked = false;
    }
    cur.pvListId = false;

    var nl = extend(nav.objLoc, {z: 'albums' + cur.pvAlbumsShown});
    if (nav.strLoc != nav.toStr(nl)) {
      if (!cur.pvNoHistory) {
        ++cur.pvHistoryLength;
      }
      nav.setLoc(nl);
    }

    return ev ? cancelEvent(ev) : false;
  },
  jumpToAlbums: function(returning) {
    if (cur.pvListId == 'temp') {
      cur.pvCancelLoad();
      if (cur.pvJumpTo.z == 'albums' + val('pva_owner') && cur.pvJumpTo.z == nav.objLoc.z) {
        showAlbums(val('pva_owner'), {noHistory: true});
        return;
      }
    }
    if (returning) {
      cur.pvListId = false;
    }
    extend(cur, {
      pvJumpFrom: false,
      pvJumpSteps: 0
    });
    nav.change(cur.pvJumpTo);
  },
  jumpToAlbum: function(returning) {
    if (cur.pvListId == 'temp') {
      cur.pvCancelLoad();
      if (cur.pvJumpTo.z == 'album' + val('pvsa_album') && cur.pvJumpTo.z == nav.objLoc.z) {
        showAlbum(val('pvsa_album'), {noHistory: true});
        return;
      }
    }
    if (returning) {
      cur.pvListId = false;
    }
    extend(cur, {
      pvJumpFrom: false,
      pvJumpSteps: 0
    });
    nav.change(cur.pvJumpTo);
  },
  jumpToTagged: function(returning) {
    if (cur.pvListId == 'temp') {
      cur.pvCancelLoad();
      if (cur.pvJumpTo.z == 'tag' + val('pvsa_tag') && cur.pvJumpTo.z == nav.objLoc.z) {
        showTagged(val('pvsa_tag'), {noHistory: true});
        return;
      }
    }
    if (cur.pvJumpTo.z == 'tag' + val('pvsa_tag')) {
      cur.pvJumpTo.z = 'photo_' + cur.pvJumpTo.z;
    }
    if (returning) {
      cur.pvListId = false;
    }
    extend(cur, {
      pvJumpFrom: false,
      pvJumpSteps: 0
    });
    nav.change(cur.pvJumpTo);
  },
  doShowAlbum: function(albumRaw, ev) {
    if (ev && (ev.button == 2 || ev.which == 3)) return;

    clearTimeout(window.__pvhideTimer);
    if (__afterFocus) {
      return ev ? cancelEvent(ev) : false;
    }
    if (cur.pvTagger) {
      Phototag.stopTag();
      if (ev !== false) {
        return ev ? cancelEvent(ev) : false;
      }
    }

    var data = (cur.pvAlbumData || {})[albumRaw];
    if (!data) return;

//    if (window.wkLayerWrap && isVisible(window.wkLayerWrap)) {
//      wkcur.scrollTop = window.wkLayerWrap.scrollTop;
//      hide(wkLayerWrap);
//    }

    Photoview.checkLayerVisibility();
    cur.pvRoot = false;
    Photoview.updateLocNav();

    if (ev && ev.pageX && ev.pageY) {
      extend(cur, {pvOldX: ev.pageX, pvOldY: ev.pageY, pvOldT: vkNow()});
    }

    cur.pvShown = true;
    cur.pvAlbumShown = albumRaw;
    if (!cur.pvFixed || val('pvsa_album') != albumRaw) {
      extend(cur, {
        pvsaOffset: data.opts.offset,
        pvsaCount: data.opts.count,
        pvsaMini: data.opts.count <= 40
      });
    }
    if (!cur.pvFixed) {
      Photoview.createLayer();
    } else {
      toggleClass(cur.pvAlbumWrap, 'pv_album_wrap_mini', cur.pvsaMini);
      if (val('pvsa_album') != albumRaw) {
        val(cur.pvAlbumWrap, data.html);
      }
      if (!isVisible(cur.pvAlbumWrap)) {
        hide(cur.pvPhotoWrap, cur.pvAlbumsWrap, cur.pvVTagsWrap);
        show(cur.pvAlbumWrap);
        Photoview.updateSize();
        layerWrap.scrollTop = val('pvsa_scroll');
      }
    }

    val(cur.pvSummary, data.opts.summary);

    if (cur.pvListId && cur.pvListId != 'temp') {
      extend(cur, {
        pvOldListId: cur.pvListId,
        pvOldIndex: cur.pvIndex
      });
      var old = (cur.pvListId || '').split('/');
      if (old[0]) {
        Photoview.showRepeat(ge(old[0]));
      }

      show(cur.pvLeft, cur.pvLeftNav, cur.pvRightNav, cur.pvClose);
    } else {
      hide(cur.pvLeft, cur.pvLeftNav, cur.pvRightNav, cur.pvClose);
      if (!browser.msie || browser.version > 8) cur.pvClicked = false;
    }
    cur.pvListId = false;

    var nl = extend(nav.objLoc, {z: 'album' + cur.pvAlbumShown});
    if (nav.strLoc != nav.toStr(nl)) {
      if (!cur.pvNoHistory) {
        ++cur.pvHistoryLength;
      }
      nav.setLoc(nl);
    }

    return ev ? cancelEvent(ev) : false;
  },
  doShowTagged: function(ownerId, ev) {
    ownerId = intval(ownerId);
    if (ev && (ev.button == 2 || ev.which == 3)) return;

    clearTimeout(window.__pvhideTimer);
    if (__afterFocus) {
      return ev ? cancelEvent(ev) : false;
    }
    if (cur.pvTagger) {
      Phototag.stopTag();
      if (ev !== false) {
        return ev ? cancelEvent(ev) : false;
      }
    }

    var data = (cur.pvPhotoTagData || {})[ownerId];
    if (!data) return;

//    if (window.wkLayerWrap && isVisible(window.wkLayerWrap)) {
//      wkcur.scrollTop = window.wkLayerWrap.scrollTop;
//      hide(wkLayerWrap);
//    }

    Photoview.checkLayerVisibility();
    cur.pvRoot = false;
    Photoview.updateLocNav();

    if (ev && ev.pageX && ev.pageY) {
      extend(cur, {pvOldX: ev.pageX, pvOldY: ev.pageY, pvOldT: vkNow()});
    }

    cur.pvShown = true;
    cur.pvPhotoTagShown = ownerId;
    if (!cur.pvFixed || val('pvsa_tag') != ownerId) {
      extend(cur, {
        pvsaOffset: data.opts.offset,
        pvsaCount: data.opts.count,
        pvsaMini: data.opts.count <= 40
      });
    }
    if (!cur.pvFixed) {
      Photoview.createLayer();
    } else {
      toggleClass(cur.pvAlbumWrap, 'pv_album_wrap_mini', cur.pvsaMini);
      if (val('pvsa_tag') != ownerId) {
        val(cur.pvAlbumWrap, data.html);
      }
      if (!isVisible(cur.pvAlbumWrap)) {
        hide(cur.pvPhotoWrap, cur.pvAlbumsWrap, cur.pvVTagsWrap);
        show(cur.pvAlbumWrap);
        Photoview.updateSize();
        layerWrap.scrollTop = val('pvsa_scroll');
      }
    }

    val(cur.pvSummary, data.opts.summary);

    if (cur.pvListId && cur.pvListId != 'temp') {
      extend(cur, {
        pvOldListId: cur.pvListId,
        pvOldIndex: cur.pvIndex
      });
      var old = (cur.pvListId || '').split('/');
      if (old[0]) {
        Photoview.showRepeat(ge(old[0]));
      }

      show(cur.pvLeft, cur.pvLeftNav, cur.pvRightNav, cur.pvClose);
    } else {
      hide(cur.pvLeft, cur.pvLeftNav, cur.pvRightNav, cur.pvClose);
      if (!browser.msie || browser.version > 8) cur.pvClicked = false;
    }
    cur.pvListId = false;

    var nl = extend(nav.objLoc, {z: 'photo_tag' + cur.pvPhotoTagShown});
    if (nav.strLoc != nav.toStr(nl)) {
      if (!cur.pvNoHistory) {
        ++cur.pvHistoryLength;
      }
      nav.setLoc(nl);
    }

    return ev ? cancelEvent(ev) : false;
  },
  doShowVideoTags: function(ownerId, ev) {
    if (ev && (ev.button == 2 || ev.which == 3)) return;

    clearTimeout(window.__pvhideTimer);
    if (__afterFocus) {
      return ev ? cancelEvent(ev) : false;
    }
    if (cur.pvTagger) {
      Phototag.stopTag();
      if (ev !== false) {
        return ev ? cancelEvent(ev) : false;
      }
    }

    var data = cur.pvVideoTagsData;
    if (!data) return;

//    if (window.wkLayerWrap && isVisible(window.wkLayerWrap)) {
//      wkcur.scrollTop = window.wkLayerWrap.scrollTop;
//      hide(wkLayerWrap);
//    }

    Photoview.checkLayerVisibility();
    cur.pvRoot = false;
    Photoview.updateLocNav();

    if (ev && ev.pageX && ev.pageY) {
      extend(cur, {pvOldX: ev.pageX, pvOldY: ev.pageY, pvOldT: vkNow()});
    }

    cur.pvShown = true;
    cur.pvVideoTagsShown = ownerId;
    if (!cur.pvFixed || val('pvsa_vtag') != ownerId) {
      extend(cur, {
        pvsaOffset: data.opts.offset,
        pvsaCount: data.opts.count
      });
    }
    if (data.opts.lang) {
      cur.lang = extend(cur.lang || {}, data.opts.lang);
    }
    if (!cur.pvFixed) {
      Photoview.createLayer();
    } else {
      if (val('pvsa_vtag') != ownerId) {
        val(cur.pvVTagsWrap, data.html);
      }
      if (!isVisible(cur.pvVTagsWrap)) {
        hide(cur.pvPhotoWrap, cur.pvAlbumsWrap, cur.pvAlbumWrap);
        show(cur.pvVTagsWrap);
        Photoview.updateSize();
        layerWrap.scrollTop = val('pvsa_scroll');
      }
    }

    val(cur.pvSummary, data.opts.summary);

    hide(cur.pvLeft, cur.pvLeftNav, cur.pvRightNav, cur.pvClose);
    cur.pvListId = false;
    cur.pvSummary.parentNode.style.width = '606px';

    var nl = extend(nav.objLoc, {z: 'video_tag' + cur.pvVideoTagsShown});
    if (nav.strLoc != nav.toStr(nl)) {
      if (!cur.pvNoHistory) {
        ++cur.pvHistoryLength;
      }
      nav.setLoc(nl);
    }

    return ev ? cancelEvent(ev) : false;
  },
  show: function(listId, index, ev, root) {
    if (ev && (ev.button == 2 || ev.which == 3)) return;

    clearTimeout(window.__pvhideTimer);

    if (listId == 'temp' && cur.pvShown) {
      if (cur.pvListId && cur.pvListId != 'temp') return;
      cur.pvWasShown = true;
    } else {
      cur.pvWasShown = false;
    }
    if (__afterFocus) {
      return ev ? cancelEvent(ev) : false;
    }
    if (cur.pvTagger) {
      Phototag.stopTag();
      if (ev !== false) {
        return ev ? cancelEvent(ev) : false;
      }
    }
    if (listId === false) {
      if (cur.pvAlbumsShown || cur.pvAlbumShown || cur.pvPhotoTagShown) {
        if (cur.pvOldListId) {
          extend(cur, {
            pvJumpTo: cur.pvOldJumpTo,
            pvJumpFrom: cur.pvOldJumpFrom,
            pvJumpSteps: cur.pvOldJumpSteps
          });
          if (index == cur.pvOldIndex + 1) ++cur.pvOldIndex;
          return Photoview.show(cur.pvOldListId, cur.pvOldIndex, ev, root);
        } else {
          hide(cur.pvLeft, cur.pvLeftNav, cur.pvRightNav, cur.pvClose);
        }
      }
      listId = cur.pvListId;
    }
    var count = ((cur.pvData || {})[listId] || {}).length, otherList = (listId != cur.pvListId);
    if (!count) return;

    if (ev && ev.pageX && ev.pageY) {
      extend(cur, {pvOldX: ev.pageX, pvOldY: ev.pageY, pvOldT: vkNow()});
    }

    if ((cur.pvOptions || {}).queue) {
      debugLog('pushing in photoview.show');
      layerQueue.push();
      cur.pvOptions.queue = false;
      cur.pvHistoryLength = 0;
    }

//    if (window.wkLayerWrap && isVisible(window.wkLayerWrap)) {
//      wkcur.scrollTop = window.wkLayerWrap.scrollTop;
//      hide(wkLayerWrap);
//    }

    if (!Photoview.checkLayerVisibility()) {
      otherList = true;
    }

    var newIndex = index + (index < 0 ? count : (index >= count ? (-count) : 0));
    var direction = otherList ? 1 : (cur.pvIndex > index ? -1 : 1);

    if (!otherList && !cur.pvCanvas) {
      if (cur.pvJumpTo) {
        cur.pvJumpSteps += (index - cur.pvIndex);
        var needJump = (newIndex === cur.pvJumpFrom && cur.pvJumpSteps >= count);
        if (needJump) {
          extend(cur, {
            pvOldJumpFrom: cur.pvJumpFrom,
            pvOldJumpSteps: cur.pvJumpSteps - (index - cur.pvIndex),
            pvOldJumpTo: cur.pvJumpTo
          });
          return Photoview.jumpToAlbums(cur.pvJumpSteps < 0);
        }
        if (direction > 0) {
          if (newIndex < cur.pvJumpFrom && newIndex + 4 > cur.pvJumpFrom || newIndex < cur.pvJumpFrom + count && newIndex + 4 > cur.pvJumpFrom + count) {
            vkImage().src = stManager._srcPrefix('.css')+'/images/icons/post_hh'+(window.devicePixelRatio >= 2 ? '_2x' : '')+'.png?2';
            var m = cur.pvJumpTo.z.match(/^albums(-?\d+)$/);
            if (m) {
              if (!cur.pvAlbumsData) cur.pvAlbumsData = {};
              if (!cur.pvAlbumsData[m[1]]) {
                cur.pvAlbumsData[m[1]] = 'loading';
                ajax.post('al_photos.php', {act: 'show_albums', owner: m[1], other: 1}, {onDone: Photoview.loadedAlbums});
              }
            }
          }
        }
        if (cur.pvJumpSteps <= -count) {
          cur.pvJumpSteps += count;
        }
      }
      if (count == 1 && index != cur.pvIndex && listId != 'temp') {
        Photoview.hide();
        return ev ? cancelEvent(ev) : false;
      }
    }

    if (otherList && listId != 'temp') {
      if (cur.pvJumpFrom === false) {
        cur.pvJumpFrom = newIndex;
      }
      cur.pvRoot = root;
      Photoview.updateLocNav();
    }

    index = newIndex;

    var ph = cur.pvData[listId][index];

    if (!ph || !ph.x_ && !ph.x_src) return;

    cur.pvIndex = index;
    cur.pvShown = true;
    cur.pvAlbumsShowing = cur.pvAlbumsShown = false;
    cur.pvAlbumShowing = cur.pvAlbumShown = false;
    cur.pvPhotoTagShowing = cur.pvPhotoTagShown = false;
    cur.pvVideoTagShowing = cur.pvVideoTagsShown = false;
    cur.pvListId = listId;
    if (!cur.pvFixed) {
      Photoview.createLayer();
    }
    cur.pvCurData = Photoview.genData(ph, vk.pvbig ? (cur.pvVeryBig ? (cur.pvVeryBig > 1 ? 'z' : 'z') : 'y') : 'x');
    if (cur.pvCurrent) {
      cur.pvCurrent.onload = Photoview.blankf;
      cur.pvCurrent.src = Photoview.blank;
    }
    delete cur.pvCurrent;
    cur.pvCurrent = vkImage();
    cur.pvCurrent.onload = Photoview.preload.pbind(index, direction);
    cur.pvCurrent.src = cur.pvCurData.src;

    if (otherList) {
      var needControls = (count > 1) || ((cur.pvJumpTo || {}).z == 'albums' + val('pva_owner')) || ((cur.pvJumpTo || {}).z == 'album' + val('pvsa_album'));
      (needControls ? show : hide)(cur.pvLeft, cur.pvLeftNav, cur.pvRightNav, cur.pvClose);
    }
    cur.pvSummary.innerHTML = (listId == 'temp') ? '<img src="/images/upload.gif" />' : ((count > 1) ? getLang('photos_photo_num_of_N').replace('%s', cur.pvIndex + 1).replace('%s', count) : getLang('photos_view_one_photo'));

    cur.pvCurPhoto = ph;
    if (!cur.pvCurData.width || !cur.pvCurData.height) {
      cur.pvCurData = cur.pvCurrent;
      cur.pvTimerPassed = 0;
      clearTimeout(cur.pvTimer);
      cur.pvTimer = setTimeout(Photoview.doShow, 0);
    } else {
      Photoview.doShow();
    }

    return ev ? cancelEvent(ev) : false;
  },
  doShow: function() {
    var img = cur.pvCurData;
    if ((!img.width || !img.height) && cur.pvTimerPassed < 5000) {
      clearTimeout(cur.pvTimer);
      cur.pvTimerPassed += 100;
      cur.pvTimer = setTimeout(Photoview.doShow, 100);
      return;
    }
    if (!cur.pvShown) return;

    if (cur.pvCanvas) {
      cur.pvScrWidth = cur.pvCanvas.offsetWidth;
      cur.pvScrHeight = cur.pvCanvas.offsetHeight;

      var c = 1, t = 0, l = 0, w = img.width || 604, h = img.height || 453, i = vkImage();
//      if (w > cur.pvScrWidth) {
        c = cur.pvScrWidth / w;
//      }
      if (h * c > cur.pvScrHeight) {
        c = cur.pvScrHeight / h;
      }
      if (c > 1.25) c = 1.25;
      cur.pvFSWidth = w = Math.floor(w * c);
      cur.pvFSHeight = h = Math.floor(h * c);
      cur.pvFSTop = t = Math.floor((cur.pvScrHeight - h) / 2);

      val(domFC(cur.pvCanvas), '<img style="margin-top: ' + t + 'px; width: ' + w + 'px; height: ' + h + 'px;" src="' + img.src + '" />');
      i.onload = Photoview.fullscreenOnLoad;
      i.src = img.src;

      if (window.FullscreenPV) FullscreenPV.updateInfo();
      return;
    }

    if (isVisible(cur.pvAlbumsWrap)) {
      val('pva_scroll', layerWrap.scrollTop);
      hide(cur.pvAlbumsWrap);
      show(cur.pvPhotoWrap);
      Photoview.updateSize();
    }
    if (isVisible(cur.pvAlbumWrap)) {
      val('pvsa_scroll', layerWrap.scrollTop);
      hide(cur.pvAlbumWrap);
      show(cur.pvPhotoWrap);
      Photoview.updateSize();
    }

    var lnk = cur.pvPhoto, c = 1, marginTop = 0, w = img.width || 604, h = img.height || 453;
    if (vk.pvbig) {
      if (w > cur.pvWidth) {
        c = cur.pvWidth / w;
      }
      if (h * c > cur.pvHeight) {
        c = cur.pvHeight / h;
      }
    }
    marginTop = positive(Math.floor((403 - h * c) / 2));
    cur.pvPhWidth = Math.floor(w * c);
    cur.pvPhHeight = Math.floor(h * c);
    cur.pvActualWidth = Math.max(cur.pvPhWidth, 604);
    if (h * c >= 453) {
      lnk.style.height = Math.floor(h * c) + 'px';
    } else {
      lnk.style.height = Math.max(400, cur.pvPhHeight)+'px';
    }

    if (vk.pvbig) {
      cur.pvCont.style.width = (cur.pvActualWidth + 154) + 'px';
      cur.pvSummary.parentNode.style.width = (cur.pvActualWidth - 4) + 'px';
    }

    if (cur.pvTagger) Phototag.stopTag();
    Photoview.hideTag(true);

    if (cur.pvLoader) {
      hide(cur.pvLoader);
      delete(cur.pvLoader);
    }

    imgOpts = '';

    var ph = cur.pvCurPhoto, notAvail = (ph.commshown >= 0) ? false : (-ph.commshown);

    if (!cur.pvHHMove && Photoview.hhCheck() && !notAvail) {
      addEvent(layer, 'mousemove', Photoview.photoAct);
      cur.pvHHMove = true;
    }

    cur.pvHH.style[vk.rtl ? 'marginRight' : 'marginLeft'] = Math.ceil((cur.pvActualWidth + 50 - 72) / 2) + 'px';

    lnk.innerHTML = '<img '+imgOpts+' style="width: ' + cur.pvPhWidth + 'px; height: ' + cur.pvPhHeight + 'px; margin-top: ' + marginTop + 'px;" src="' + img.src + '" />';

    layerWrap.scrollTop = 0;
    if (cur.pvListId == 'temp') {
      hide(cur.pvCommentsData);
      Photoview.updateArrows();
      return;
    }

    (ph.liked ? addClass : removeClass)(cur.pvHH, 'pvs_hh_liked');
    Photoview.hhOut(cur.pvHHFg);

    if (window.tooltips) {
      tooltips.destroyAll(cur.pvBox);
    }

    var taglnkst = (!ph.taginfo && ph.actions.tag && ph.tags[0] < cur.pvMaxTags) ? '' : ' style="display: none"';
    var shareacts = [], fs = false;
    if (vk.id) shareacts.push(['pvs_send', getLang('photos_send_to_fr'), 'onclick="Photoview.sendPhoto()"']);
    if (ph.actions.save) shareacts.push(['pvs_save', getLang('photos_save_to_alb'), 'onclick="Photoview.savePhoto()"']);
    shareacts.push(['pvs_down', getLang('photos_download_hq'), 'target="_blank" href="' + Photoview.genData(ph, 'w').src + /* '?dl=1' + */'"']);

    var share = '', l = shareacts.length, sprg = '<div id="pv_share_prg" class="progress fl_r"></div>';
    if (l < 1) {
      share = '';
    } else if (l == 1) {
      share = '<a ' + shareacts[0][2] + '>' + sprg + shareacts[0][1] + '</a>';
    } else {
      for (var i = 0; i < l; ++i) {
        share += '<a class="pvs_act" ' + shareacts[i][2] + '><span class="fl_l ' + shareacts[i][0] + '"></span><span class="pvs_act_text">' + shareacts[i][1] + '</span></a>';
      }
      share = '<a id="pv_share" onclick="Photoview.showShare()">' + sprg + '<span id="pv_share_text">' + getLang('photos_share_from_view') + '</span></a>\
<div onmouseover="Photoview.showShare()" onmouseout="Photoview.hideShare(500)" onclick="Photoview.hideShare(-1)" id="pvs_dd" class="fixed"><table cellspacing="0" cellpadding="0"><tr>\
  <td class="pvs_side_sh"><div class="pvs_side_sh_el"></div></td>\
  <td>\
    <div class="pvs_header_wrap"><div class="pvs_header"><span class="pvs_header_text">' + getLang('photos_share_from_view') + '</span></div></div>\
    <div class="pvs_acts">' + share + '</div>\
    <div class="pvs_sh1"></div><div class="pvs_sh2"></div>\
  </td>\
  <td class="pvs_side_sh"><div class="pvs_side_sh_el"></div></td>\
</tr></table></div>';
    }

if (ph.actions.edit/* & 2*/) {
  photoEditAct = '<a id="pv_edit_link" onclick="return showBox(\'al_photos.php\', {act: \'edit_photo\', photo: cur.pvData[cur.pvListId][cur.pvIndex].id}, {stat: [\'ui_controls.css\', \'ui_controls.js\']})">' + getLang('photos_edit') + '</a>';
} else {
  photoEditAct = '';
}

    if (img.width < 200 || img.height < 200) {
      ph.actions.prof = false;
    }
    cur.pvNarrow.innerHTML = '\
' + ((ph.album != 'NA' && notAvail != 2 || ph.graffiti) ? '<div class="pv_info">' + getLang('photos_album_name') + '</div><div class="pv_info" id="pv_album">' + ph.album + '</div>' : '') + '\
' + (ph.author != 'NA' ? '<div class="pv_info">' + getLang('photos_author') + '</div><div id="pv_author">' + ph.author + '</div>' : '') + '\
<div id="pv_actions">\
' + (fs ? '<a onclick="Photoview.fullscreen()">' + getLang('photos_fullscreen') + '</a>' : '') + '\
  <a id="pv_tag_link" onclick="stManager.add([\'phototag.js\', \'phototag.css\', \'tagger.css\', \'tagger.js\'], function() { Phototag.startTag(); })"' + taglnkst + '>' + getLang('photos_tagperson') + '</a>\
' + (ph.actions.prof ? ('<a id="pv_to_profile" onmouseover="Photoview.toProfileTag()" onmouseout="Photoview.hideTag()" onclick="showBox(\'al_page.php\', {act: \'owner_photo_edit\', photo: \'' + ph.id + '\'}, {stat: [\'owner_photo.css\', \'owner_photo.js\', \'tagger.css\', \'tagger.js\']});">' + getLang('photos_load_to_profile') + '</a>') : '') + '\
' + (ph.actions.dialog ? ('<a id="pv_to_dialog" onclick="showBox(\'al_page.php\', {act: \'owner_photo_edit\', photo: \'' + ph.id + '\', oid: ' + ph.actions.dialog + ', list: \'' + cur.pvListId + '\'}, {stat: [\'owner_photo.css\', \'owner_photo.js\', \'tagger.css\', \'tagger.js\']});">' + getLang('photos_load_to_dialog') + '</a>') : '') + '\
' + photoEditAct + '\
' + ((ph.y_src || ph.y_) ? ('<a id="pv_large_link" onclick="Photoview.switchSize()">' + getLang(vk.pvbig ? 'photos_smaller' : 'photos_larger') + '</a>') : '') + '\
' + share + '\
' + (ph.actions.del ? ('<a id="pv_delete_link" onclick="Photoview.deletePhoto()"><div class="progress fl_r" id="pv_delete_progress"></div>' + getLang('global_delete') + '</a>') : '') + '\
' + (ph.actions.spam ? ('<a id="pv_spam_link" onclick="Photoview.spamPhoto(this.firstChild)"><div class="progress fl_r"></div>' + getLang('its_spam') + '</a>') : '') + '\
' + (ph.actions.rot ? ('<div id="pv_rotate"><div id="pv_rotate_progress" class="progress fl_r"></div>' + getLang('photos_rotate') + '\
    <span onclick="Photoview.rotatePhoto(1)" class="right"></span>\
    <span onclick="Photoview.rotatePhoto(-1)" class="left"></span>\
    <form method="POST" target="pv_rotate_frame" name="pv_rotate_form" id="pv_rotate_form"></form>\
  </div>') : '') + '\
</div>';

    var likeop = (ph.liked ? 1 : 0.4), likest = browser.msie ? ('filter: alpha(opacity=' + Math.floor(likeop * 100) + ')') : ('opacity: ' + likeop);

    var commstyle = '', commshown = '', commlink = '', commclass = '',
        commslikes = cur.pvCommsLikes[ph.id], comms = commslikes[0], likes = commslikes[1];;
    if (ph.commcount > ph.commshown) {
      commshown = getLang('photos_show_prev_comments', ph.commcount - ph.commshown);
    } else {
      commstyle = ' style="display: none"';
    }

    Wall.cancelEdit(true);

    var additional = notAvail ? '<div class="clear">' + getLang('photos_in_closed_album') + '</div>' : '\
<div id="pv_comments_header" class="clear ' + commclass + '"' + commstyle + ' onclick="Photoview.comments()">\
  <div>' + commshown + '</div><div id="pv_comments_progress" class="progress"></div>\
</div>\
<div id="pv_comments" class="clear wall_module">' + (comms.tagName ? '' : comms) + '</div>', commsNode;

    var tagsst = ph.tagshtml ? '' : ' style="display: none"',
        descText = '<div' + (ph.actions.edit & 1 ? (' class="pv_can_edit" onclick="Photoview.editInline(event)"' + (ph.desc ? (' onmouseover="Photoview.descTT(this)"') : '')) : ' class="pv_cant_edit"') + '>' + (ph.desc || ('<span class="pv_desc_edit">' + getLang('photos_edit_desc') + '</span>')) + '</div>',
        placeText = ph.place ? ('<span class="pv_place_label">' + getLang('photos_place_label') + '</span> <a class="pv_place_a" id="pv_place_a" onclick="Photoview.showPlace()">' + ph.place + '</a>') : '',
        addPlace = ph.actions.place ? ('<span' + (placeText ? ' style="display: none;"' : '') + ' id="pv_add_place"><span class="divider fl_l">|</span><a class="fl_l" id="pv_app_place_link" onclick="Photoview.editPlace();">' + getLang('photos_edit_add_place') + '</a></span>') : '';
    cur.pvWide.innerHTML = '\
<div id="pv_desc" style="' + ((ph.actions.edit & 1 || ph.desc) ? '' : 'display: none') + '">' + descText + '</div>\
<div id="pv_place">' + placeText + '</div>\
<div id="pv_tags"' + tagsst + '>' + getLang('photos_onthisphoto') + ': ' + ph.tagshtml + '</div>\
<div id="pv_inlineedit_prg" class="fl_r progress"></div>\
<div id="pv_date_wrap" class="fl_l">' + getLang('photos_added') + ' <span id="pv_date">' + ph.date + '</span></div>\
' + addPlace + (cur.pvNoLikes ? '' : '<span class="divider fl_l">|</span>\
<div id="pv_like_wrap" class="fl_l" onmouseover="Photoview.likeOver()" onmouseout="Photoview.likeOut()" onclick="Photoview.like()">\
  <span class="fl_l" id="pv_like_link">' + getLang('photos_i_like') + '</span>\
  <i class="fl_l' + (likes ? '' : ' nolikes') + '" id="pv_like_icon" style="' + likest + '"></i>\
  <span id="pv_like_count" class="fl_l">' + (likes || '') + '</span>\
</div>') + (notAvail == 2 ? '' : additional);
    if (comms.tagName) {
      each(geByClass('page_gif_loading', comms), function() { Page.hideGif(this, false); });
      commsNode = ge('pv_comments');
      domPN(commsNode).replaceChild(comms, commsNode);
    }

    extend(cur, {
      pvTagLink: ge('pv_tag_link'),
      pvLikeIcon: ge('pv_like_icon'),
      pvLikeLink: ge('pv_like_link'),
      pvDesc: ge('pv_desc'),
      pvTags: ge('pv_tags'),
      pvEditing: false
    });

    if (ph.deleted || !ph.author) {
      cleanElems('pv_confirm_tag', 'pv_delete_tag', 'pv_prof_cancel', 'pv_prof_done');
      if (ph.deleted) {
        cur.pvTagInfo.innerHTML = ph.deleted;
        show(cur.pvTagInfo);
      }
      hide(cur.pvCommentsData, cur.pvHH);
    } else if (ph.taginfo) {
      cleanElems('pv_confirm_tag', 'pv_delete_tag', 'pv_prof_cancel', 'pv_prof_done');
      cur.pvTagInfo.innerHTML = '\
<table cellspacing="0" cellpadding="0"><tr>\
<td class="info">' + ph.taginfo + '</td>\
<td><nobr><div class="button_blue"><button id="pv_confirm_tag">' + getLang('photos_confirm_tag') + '</button></div></td>\
<td><nobr><div class="button_gray"><button id="pv_delete_tag">' + getLang('photos_delete_tag') + '</button></div></td>\
<td><div id="pv_tag_handling" class="progress"></div></td>\
</tr></table>';
      show(cur.pvTagInfo, cur.pvCommentsData);
      if (Photoview.hhCheck()) show(cur.pvHH);
      ge('pv_confirm_tag').onclick = Photoview.confirmTag.pbind(ph.tagid);
      ge('pv_delete_tag').onclick = Photoview.deleteTag.pbind(ph.tagid);
    } else {
      hide(cur.pvTagInfo);
      show(cur.pvCommentsData);
      if (Photoview.hhCheck()) show(cur.pvHH);
    }

    if (notAvail || !ph.actions.comm) {
      hide(cur.pvYourComment);
    } else {
      show(cur.pvYourComment);
      Wall.initComposer(cur.pvComment, {
        lang: {
          introText: getLang('profile_mention_start_typing'),
          noResult: getLang('profile_mention_not_found')
        },
        wddClass: 'pv_composer_dd',
        width: getSize(domPN(cur.pvYourComment))[0],
        media: {
          lnk: cur.pvAddMedia,
          preview: cur.pvMediaPreview,
          types: cur.pvMediaTypes,
          options: {limit: 2, disabledTypes: ['album'], toggleLnk: true, onChange: function() {
            setTimeout(Photoview.updateHeight, 2);
          }}
        }
      });
      cur.pvCommentSend.onclick = Photoview.sendComment;
      if (!cur.pvComment.phevents) {
        cur.pvComment.placeholder = getLang('reply_to_post');
        placeholderSetup(cur.pvComment);
      }
      if (!cur.pvComment.autosize) {
        autosizeSetup(cur.pvComment, {minHeight: 65, onResize: Photoview.updateHeight});
      }
      if (cur.pvCommenting && cur.pvCommenting != ph.id) {
        var replyToName = (cur.pvReplyNames[(cur.pvReplyTo || {})[0]] || [])[1];
        if (replyToName && !replyToName.indexOf(trim(val(cur.pvComment)))) {
          val(cur.pvComment, '');
        }
        cur.pvReplyTo = false;
        hide('pv_reply_to_title', 'pv_del_reply_to');

        cur.pvCommenting = false;
      }
      toggle(cur.pvAsGroup, !!ph.actions.asgr);
    }

    Photoview.updateArrows();
    if ((cur.pvOptions || {}).scroll) {
      layerWrap.scrollTop = cur.pvOptions.scroll;
    }

    setTimeout(Photoview.afterShow, 2);
  },
  afterShow: function() {
    Photoview.updateHeight();
    setStyle(layer, {marginTop: 0});

    cur.pvPhoto.href = '/photo' + cur.pvCurPhoto.id;
    cur.pvPhoto.focus();

    if ((cur.pvCurPhoto.actions.edit & 4) && !cur.pvCurPhoto.desc) {
      Photoview.editInline();
    }

    var x = cur.pvPhoto.firstChild.offsetLeft, y = cur.pvPhoto.firstChild.offsetTop;
    cur.pvTagFrame.innerHTML = '<img style="width: ' + cur.pvPhWidth + 'px; height: ' + cur.pvPhHeight + 'px;" src="' + cur.pvCurData.src + '" />';
    setStyle(cur.pvTagFaded, {
      width: cur.pvPhWidth + 'px',
      height: cur.pvPhHeight + 'px',
      left: x + 'px',
      top: y + 'px'
    });
    var deltaX = browser.mozilla && ((lastWindowWidth - cur.pvActualWidth) % 2) && ((cur.pvActualWidth - cur.pvPhWidth) % 2) ? 4 : 3;
    setStyle(cur.pvTagFrame, {
      left: (x - deltaX) + 'px', // 3 - tag frame border, mozilla buggy
      top: (y - 3) + 'px'
    });
    setStyle(cur.pvTagPerson, {
      left: x + 'px',
      top: y + 'px'
    });

    if ((cur.pvOptions || {}).scroll) {
      layerWrap.scrollTop = cur.pvOptions.scroll;
      cur.pvOptions.scroll = 0;
    }

    Photoview.updateLoc();
  },
  updateLoc: function() {
    var nl, listId = cur.pvListId;
    if (cur.pvRoot) {
      nl = {0: 'photo' + cur.pvCurPhoto.id};
      if (listId.substr(0, 6) == 'photos') {
        nl.all = 1;
      } else if (listId.substr(0, 3) == 'tag') {
        nl.tag = intval(listId.substr(3));
      } else if (listId.substr(0, 6) == 'newtag') {
        nl.newtag = intval(listId.substr(6));
      }
      if (listId.indexOf('/rev') != -1) {
        nl.rev = 1;
      }
    } else {
      nl = extend(nav.objLoc, {z: 'photo' + cur.pvCurPhoto.id + '/' + cur.pvListId});
    }

    if (nav.strLoc != nav.toStr(nl)) {
      if (!cur.pvNoHistory) {
        ++cur.pvHistoryLength;
      }
      nav.setLoc(nl);
      if ((cur.pvOptions || {}).fromQueue) {
        cur.pvNoHistory = true;
        cur.pvHistoryLength = 0;
      }
    }
    if (cur.pvOptions) cur.pvOptions.fromQueue = false;
  },

  canFullscreen: function() {
    var b = browser, v = floatval(browser.version);
    return (b.chrome && v > 15) ||
      (b.mozilla && v > 9) ||
      (b.safari && v > 5 && !b.mobile);
  },
  fullscreenOnLoad: function() {
    if (window.FullscreenPV) {
      FullscreenPV.slide();
    }
  },
  fullscreenEnd: function(finishing) {
    var el = cur.pvCanvas;
    if (!el) return;
    cleanElems(el);
    re(el);
    clearTimeout(cur.pvFSTimer);
    clearTimeout(cur.pvFSControlsTimer);
    cur.pvCanvas = cur.pvFSControls = cur.pvFSTimer = cur.pvFSControlsTimer = false;
    removeEvent(document, 'webkitfullscreenchange mozfullscreenchange fullscreenchange webkitfullscreenerror mozfullscreenerror fullscreenerror');
    show(pageNode);
    if (cur.pvScrWasY !== undefined) {
      scrollToY(cur.pvScrWasY, 0);
      delete cur.pvScrWasY;
    }
    if (finishing !== true) {
      Photoview.updateSize();
      Photoview.show(cur.pvListId, cur.pvIndex);
    }
  },
  fullscreen: function() {
    if (cur.pvCanvas) return;
    var el = cur.pvCanvas = bodyNode.appendChild(ce('div', {className: 'fixed', id: 'pv_fullscreen', innerHTML: '<div></div>'})), method = el.requestFullScreen || el.webkitRequestFullScreen || el.mozRequestFullScreen || el.msRequestFullScreen;

    cur.pvFinishing = false;
    stManager.add(['fullscreen_pv.css', 'fullscreen_pv.js'], function() {
      FullscreenPV.init();
    });

    addEvent(document, 'webkitfullscreenchange mozfullscreenchange fullscreenchange', Photoview.onFullscreen);
    addEvent(document, 'webkitfullscreenerror mozfullscreenerror fullscreenerror', Photoview.fullscreenEnd.pbind(true));

    try {
      method.call(el);
    } catch(e) {
      cur.pvPartScreen = true;
      Photoview.onFullscreen();
    }
  },
  fullscreenStop: function(finishing) {
    cur.pvFinishing = (finishing === true);
    cur.pvPartScreen = false;
    var method = document.exitFullscreen || document.mozCancelFullScreen || document.webkitCancelFullScreen;
    try {
      method();
    } catch(e) {
      Photoview.onFullscreen();
    }
    Photoview.fullscreenEnd();
  },
  onFullscreen: function() {
    if (document.fullScreenElement || document.mozFullScreen || document.webkitIsFullScreen || cur.pvPartScreen) {
      if (cur.pvTagger) {
        Phototag.stopTag();
      }
      vk.oldpvbig = vk.pvbig;
      vk.pvbig = true;
      cur.pvScrWidth = cur.pvCanvas.offsetWidth;
      cur.pvScrHeight = cur.pvCanvas.offsetHeight;
      cur.pvScrWasY = scrollGetY();
      hide(pageNode);
      if (!cur.pvFinishing) {
        Photoview.updateSize();
        Photoview.show(cur.pvListId, cur.pvIndex);
      }
    } else {
      vk.pvbig = vk.oldpvbig;
      Photoview.fullscreenEnd(cur.pvFinishing);
    }
  },

  showShare: function() {
    clearTimeout(cur.hideShareTimer);
    var dd = ge('pvs_dd');
    ge('pv_share').blur();
    if (isVisible(dd)) {
      return fadeIn(dd, 0);
    }
    setTimeout(addEvent.pbind(document, 'click', Photoview.hideShare), 1);
    show(dd);
  },
  hideShare: function(timeout) {
    if (timeout > 0) {
      cur.hideShareTimer = setTimeout(Photoview.hideShare.pbind(0), timeout);
      return;
    }
    var dd = ge('pvs_dd');
    if (!dd) return;
    if (timeout == -1) {
      hide(dd);
    } else {
      fadeOut(dd, 200);
    }
    removeEvent(document, 'click', Photoview.hideShare);
  },
  savePhoto: function() {
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    ajax.post('al_photos.php', {act: 'save_me', photo: ph.id, list: listId, hash: ph.hash}, {progress: 'pv_share_prg', onDone: showDoneBox});
  },
  sendPhoto: function() {
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    showBox('like.php', {act: 'publish_box', object: 'photo' + ph.id, list: listId, to: 'mail'}, {stat: ['page.js', 'page.css', 'wide_dd.js', 'wide_dd.css', 'sharebox.js']});
  },

  setTags: function(tags) {
    Photoview.hideTag();
    if (!tags) {
      hide(cur.pvTags);
      return;
    }
    show(cur.pvTags);
    if (window.tooltips) {
      each(geByClass('delete', cur.pvTags), function() {
        tooltips.destroy(this);
      });
    }
    cur.pvTags.innerHTML = getLang('photos_onthisphoto') + ': ' + tags;
  },
  preload: function(from, direction) {
    window.updateWndVScroll && updateWndVScroll(); // Because called on photo load
    var listId = cur.pvListId, count = ((cur.pvData || {})[listId] || {}).length;
    if (!count) return;

    var s1 = vk.pvbig ? (cur.pvVeryBig > 1 ? 'z' : (cur.pvVeryBig ? 'z' : 'y')) : 'x';
    var s2 = vk.pvbig ? (cur.pvVeryBig > 1 ? 'z' : (cur.pvVeryBig ? 'y' : 'x')) : 0;
    var s3 = vk.pvbig ? (cur.pvVeryBig > 1 ? 'y' : (cur.pvVeryBig ? 'x' : 0)) : 0;

    cur.pvLastFrom = from;
    cur.pvLastDirection = direction;

    // remove preloaded ones without touching preloading ones
    for (var i = 0; i < Math.min(Photoview.cacheSize, count - Photoview.cacheSize); ++i) {
      var ind = from + (i + 1) * (-direction);
      while (ind >= count) ind -= count;
      while (ind < 0) ind += count;

      var p = cur.pvData[listId][ind];
      if (!p) continue;
      for (var j = 0, l = Photoview.allSizes.length; j < l; ++j) {
        var s = Photoview.allSizes[j];
        if (p[s] && p[s].src) {
          p[s].src = Photoview.blank;
          delete(p[s]);
        }
      }
    }
    for (var i = 0; i < Photoview.cacheSize; ++i) {
      var ind = from + (i + 1) * direction;
      while (ind >= count) ind -= count;
      while (ind < 0) ind += count;

      var p = cur.pvData[listId][ind];
      if (!p || !p.id) {
        if (!p || (vkNow() - p > 3000)) {
          cur.pvData[listId][ind] = vkNow();
          setTimeout(function() {
            ajax.post('al_photos.php', {act: 'show', list: listId, offset: Photoview.realOffset(listId, ind, -1), direction: direction}, {onDone: Photoview.loaded});
          }, 10);
        }
        break;
      }

      if (p[s1]) continue;
      if (p[s1 + '_src']) {
        p[s1] = vkImage();
        p[s1].src = p[s1 + '_src'];
        continue;
      } else {
        p[s1] = 1;
      }

      if (p[s2]) continue;
      if (p[s2 + '_src']) {
        p[s2] = vkImage();
        p[s2].src = p[s2 + '_src'];
        continue;
      } else {
        p[s2] = 1;
      }

      if (p[s3]) continue;
      if (p[s3 + '_src']) {
        p[s3] = vkImage();
        p[s3].src = p[s3 + '_src'];
        continue;
      } else {
        p[s3] = 1;
      }

      if (p.x) continue;
      p.x = vkImage();
      p.x.src = p.x_src;
    }
  },
  hide: function(noLoc, fromQueue) {
    if (!cur.pvShown || __afterFocus && fromQueue !== true) return;
    if (cur.pvCanvas) Photoview.fullscreenStop(true);

    if ((cur.pvJumpTo || {}).z == 'albums' + val('pva_owner') && !cur.pvAlbumsShown && noLoc === 0) {
      return Photoview.jumpToAlbums(true);
    }
    if ((cur.pvJumpTo || {}).z == 'album' + val('pvsa_album') && !cur.pvAlbumShown && noLoc === 0) {
      return Photoview.jumpToAlbum(true);
    }
    if ((cur.pvJumpTo || {}).z == 'tag' + val('pvsa_tag') && !cur.pvPhotoTagShown && noLoc === 0) {
      return Photoview.jumpToTagged(true);
    }
    if (cur.pvListId == 'temp') {
      cur.pvCancelLoad();
    } else if (!cur.pvNoHistory && !noLoc && cur.pvHistoryLength > 0 && cur.pvHistoryLength < 10) {
      cur.pvNoHistory = true;
      __adsLoaded = 0;
      return history.go(-cur.pvHistoryLength);
    }

    if (noLoc !== true && !layerQueue.count()) {
      var newLoc;
      if (cur.pvRoot) {
        if (cur.pvListId.substr(0, 6) == 'newtag') {
          newLoc = 'albums' + vk.id + '?act=added';
          if (cur.pvListId.indexOf('/rev') != -1) {
            newLoc += '&rev=1';
          }
        } else {
          newLoc = cur.pvListId.replace('/rev', '?rev=1');
        }
        nav.setLoc(newLoc);
      } else {
        newLoc = clone(nav.objLoc);
        delete(newLoc.z);
      }
      if (nav.strLoc != nav.toStr(newLoc)) {
        nav.setLoc(newLoc);
      }
      __adsLoaded = 0;
    }

    window.__pvhideTimer = setTimeout(Photoview.doHide.pbind(cur), 0);
    __adsUpdate();

//    if (window.wkcur && wkcur.scrollTop) {
//      setTimeout(function() {
//        window.wkLayerWrap.scrollTop = wkcur.scrollTop;
//        wkcur.scrollTop = false;
//      }, 0);
//    }
    if (cur.pvHHMove) {
      removeEvent(layer, 'mousemove', Photoview.photoAct);
      cur.pvHHMove = false;
    }
    cur.pvAlbumsShowing = cur.pvAlbumsShown = false;
    cur.pvAlbumShowing = cur.pvAlbumShown = false;
    cur.pvPhotoTagShowing = cur.pvPhotoTagShown = false;
    cur.pvVideoTagShowing = cur.pvVideoTagsShown = false;
  },
  doHide: function(c) {
    c.pvHistoryLength = 0;
    if (cur.pvTagger) Phototag.stopTag();
    cleanElems('pv_confirm_tag', 'pv_delete_tag', 'pv_prof_cancel', 'pv_prof_done');
    if (c.pvFriends) {
      cleanElems('pv_add_tag', 'pv_cancel_tag', c.pvFriends.firstChild.firstChild, c.pvFriends);
      re(c.pvFriends);
      c.pvFriends = c.pvFriendName = false;
    }

    Wall.cancelEdit(true);

    removeEvent(c.pvPhoto, 'mousemove', Photoview.onMouseMove);

    // remove preloaded
    var listId = c.pvListId, count = ((c.pvData || {})[listId] || {}).length;
    if (c.pvLastDirection && count) {
      for (var i = 0; i < Photoview.cacheSize; ++i) {
        var ind = c.pvLastFrom + (i + 1) * c.pvLastDirection;
        while (ind >= count) ind -= count;
        while (ind < 0) ind += count;

        var p = c.pvData[listId][ind];
        if (!p) continue;
        for (var j = 0, l = Photoview.allSizes.length; j < l; ++j) {
          var s = Photoview.allSizes[j];
          if (p[s] && p[s].src) {
            p[s].src = Photoview.blank;
            delete(p[s]);
          }
        }
      }
      c.pvLastDirection = c.pvLastFrom = false;
    }
    debugLog('hiding layers');

    cur.pvYourComment = re(cur.pvYourComment);

    layers.hide();
    layers.fullhide = false;

    Photoview.hideTag(true);
    each(['pvLeft', 'pvClose', 'pvSwitch', 'pvFixed'], function() {
      var n = this + '';
      re(c[n]);
      c[n] = false;
    });
    if (window.tooltips) {
      tooltips.destroyAll(cur.pvBox);
    }

    if (browser.mobile) {
      ge('footer').style.height = '';
    }

    var colorClass = vk.pvdark ? 'pv_dark' : 'pv_light';
    removeClass(layerWrap, colorClass);
    removeClass(layerBG, colorClass);
    layerBG.style.opacity = '';

    c.pvShown = c.pvListId = c.pvClicked = false;
    removeEvent(window, 'resize', Photoview.onResize);
    removeEvent(document, 'keydown', Photoview.onKeyDown);
    removeEvent(layerWrap, 'click', Photoview.onClick);
    removeEvent(layerWrap, 'scroll', Photoview.scrollResize);

//    if (window.wkcur && wkcur.shown) {
//      WkView.showLayer();
//    }
    var onh = cur.pvOptions && cur.pvOptions.onHide;
    if (cur.pvOptions) {
      var onh = cur.pvOptions.onHide;
      cur.pvOptions.onHide = false;
      if (onh) onh();
    }
    layerQueue.pop();

    if (c.pvPreloaded && c === cur) {
      var cont = ge('photos_container'), d = ce('div', {innerHTML: c.pvPreloaded});
      while (d.firstChild) {
        cont.appendChild(d.firstChild);
      }
      if (cont.qsorter) {
        setTimeout(qsorter.added.pbind(cont), 0);
      }
      c.pvPreloaded = false;
    }
  },
  editPhoto: function() {
  },
  descTT: function(el) {
    return showTooltip(el, {
      text: getLang('photos_edit_desc'),
      black: 1,
      shift: [2, 4, 0],
      showdt: 0
    });
  },
  editInline: function(ev, noreq) {
    if (((ev || window.event || {}).target || {}).tagName == 'A' || cur.pvEditing) return;

    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index], noreq = !ph.desc;
    var onDone = function(text) {
      if (!cur.pvShown || cur.pvListId != listId || cur.pvIndex != index || cur.pvEditing) return;

      cur.pvEditing = [listId, index];
      var mrg = '0px 0px 0px', taStyle = '';
      if (browser.chrome) {
        mrg = '0px 0px -5px';
        taStyle = ' style="padding-bottom: 0px"';
      } else if (browser.mozilla) {
        mrg = '0px -1px 0px';
      } else if (browser.msie) {
        mrg = '0px 0px -6px';
      }
      var el = cur.pvDesc.appendChild(ce('div', {innerHTML: '\
<div style="margin: ' + mrg + '">\
  <textarea id="pv_edit_text"' + taStyle + ' onkeydown="onCtrlEnter(event, Photoview.saveInline)" placeholder="' + getLang('photos_edit_desc_intro') + '">' + text + '</textarea>\
</div>'}, {display: 'none'})), txt = ge('pv_edit_text');
      placeholderSetup(txt, {back: 1});
      autosizeSetup(txt, {minHeight: 13});
      setTimeout(function() {
        show(el);
        elfocus(txt);
        addEvent(txt, 'blur', Photoview.saveInline);
        hide(cur.pvDesc.firstChild);
      }, 1);
    };
    if (!noreq) {
      ajax.post('al_photos.php', {act: 'edit_desc', photo: ph.id}, {onDone: onDone, progress: 'pv_inlineedit_prg'});
    } else {
      onDone('');
    }
  },
  cancelInline: function() {
    cur.pvEditing = false;
    removeEvent(ge('pv_edit_text'), 'blur');
    show(cur.pvDesc.firstChild);
    re(cur.pvDesc.firstChild.nextSibling);
  },
  saveInline: function() {
    if (!cur.pvEditing) return;
    removeEvent(ge('pv_edit_text'), 'blur');

    var listId = cur.pvEditing[0], index = cur.pvEditing[1], ph = cur.pvData[listId][index];
    ajax.post('al_photos.php', {act: 'save_desc', photo: ph.id, hash: ph.hash, text: val('pv_edit_text')}, {onDone: function(text) {
      ph.desc = text;

      var shown = cur.pvShown && listId == cur.pvListId && index == cur.pvIndex;
      if (!shown) return;

      cur.pvEditing = false;
      var d = domFC(cur.pvDesc);
      val(d, text || ('<span class="pv_desc_edit">' + getLang('photos_edit_desc') + '</span>'));
      d.onmouseover = text ? Photoview.descTT.pbind(d) : function() {};
      show(d);
      re(domNS(d));
    }, progress: 'pv_inlineedit_prg'});
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
  receiveComms: function(listId, index, text, names, noOld, toUp) {
    if (listId != cur.pvListId || index != cur.pvIndex) return;

    var n = ce('div', {innerHTML: text}), comms = ge('pv_comments'), last = current = domLC(comms), frm = getXY(current, true)[1], ph = cur.pvData[listId][index];
    for (var el = domLC(n); el; el = domLC(n)) {
      if (ph.actions.comm) addClass(el, 'reply_replieable');
      while (current && Photoview.cmp(current.id, el.id) > 0) {
        current = domPS(current);
      }
      if (current && !Photoview.cmp(current.id, el.id)) {
        comms.replaceChild(el, current);
        current = el;
      } else {
        if (current && domNS(current)) {
          comms.insertBefore(el, domNS(current));
        } else if (!current && domFC(comms)) {
          if (noOld === true) {
            --ph.commshown;
            n.removeChild(el);
          } else {
            comms.insertBefore(el, domFC(comms));
          }
        } else {
          comms.appendChild(el);
        }
        ++ph.commshown;
      }
    }
    if (toUp && last) {
      layerWrap.scrollTop += getXY(last, true)[1] - frm;
    }
    cur.pvCommsLikes[ph.id][0] = comms;
    extend(cur.pvReplyNames, names);
    Photoview.updateComms();
  },
  commSaved: function(post) {
    if (!cur.pvShown) return;
    var comms = ge('pv_comments'), ph = comms ? cur.pvData[cur.pvListId][cur.pvIndex] : false, comm = post.match(/^(-?\d+)photo(_\d+)/);
    if (!ph || !comm || !ge('pv_comment' + comm[1] + comm[2])) return;
    cur.pvCommsLikes[ph.id][0] = comms;
  },
  comments: function(showcomm) {
    if (showcomm) {
      var frst = domFC(ge('pv_comments')).id || '';
      if (
        !isVisible('pv_comments_header') ||
        isVisible('pv_comments_progress') ||
        Photoview.cmp(frst, 'pv_comment' + showcomm) < 0
      ) {
        return;
      }
    }
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    var prg = ge('pv_comments_progress');
    ajax.post('al_photos.php', {act: 'photo_comments', offset: ph.commshown, photo: ph.id}, {
      onDone: function(text, names) {
        Photoview.receiveComms(listId, index, text, names, false, showcomm);
        if (showcomm && ge('pv_comment' + showcomm)) {
          Photoview.showComment(showcomm);
        }
      },
      showProgress: function() {
        hide(prg.previousSibling);
        show(prg);
      }, hideProgress: function() {
        hide(prg);
        show(prg.previousSibling);
      }
    });
  },
  updateComms: function() {
    setTimeout(Photoview.updateHeight, 2);

    var ph = cur.pvData[cur.pvListId][cur.pvIndex];
    var commshown = '', commprg = ge('pv_comments_progress'), commheader = ge('pv_comments_header');
    if (ph.commcount > ph.commshown) {
      commshown = getLang('photos_show_prev_comments', ph.commcount - ph.commshown);
    }
    (commshown ? show : hide)(commheader);
    domPS(commprg).innerHTML = commshown;
  },
  commentClick: function(el, event, from) {
    var comm = el.id.replace('pv_comment', ''), cmnt = comm.split('_');
    if (Wall.checkReplyClick(el, event)) return;

    var moreLink = geByClass1('wall_reply_more', el, 'a');
    if (moreLink && isVisible(moreLink)) {
      removeClass(el, 'reply_moreable');
      moreLink.onclick();
      return;
    }
    if (from && cmnt[1] && isVisible(cur.pvYourComment)) {
      Photoview.commentTo(comm, from, event);
    }
  },
  commentChanged: function() {
    checkTextLength(cur.pvCommLimit, cur.pvComment, ge('pv_comment_warn'));
    cur.pvCommenting = cur.pvData[cur.pvListId][cur.pvIndex].id;
  },
  commentTo: function(comm, toId, event) {
    var cmnt = (comm || '').split('_'), commId = cmnt[1], ph = cur.pvData[cur.pvListId][cur.pvIndex], replyNameOld = cur.pvReplyTo && cur.pvReplyNames[cur.pvReplyTo[0]] || '', replyName = cur.pvReplyNames[toId] || '', rf = cur.pvComment, tl = ge('pv_reply_to_title');

    cur.pvCommenting = ph.id;

    if (comm) {
      cur.pvReplyTo = [toId, commId];
      val(tl, replyName[0]);
      show(tl, 'pv_del_reply_to');
      setStyle(tl, {maxWidth: ge('pv_comment_submit').offsetWidth - domPN(ge('pv_comment_send')).offsetWidth - (isVisible(cur.pvAsGroup) ? cur.pvAsGroup.offsetWidth : 0) - domPN(cur.pvAddMedia).offsetWidth - 31});
    } else {
      cur.pvReplyTo = false;
      hide(tl, 'pv_del_reply_to');
    }

    var v = trim(val(rf)), cEl = comm && geByClass1('pv_reply_to', ge('pv_comment' + comm));
    if (!v || replyNameOld && !winToUtf(replyNameOld[1]).indexOf(v)) {
      val(rf, (comm && !checkEvent(event)) ? replaceEntities(replyName[1]) : '');
    }
    toggleClass(cur.pvAsGroup, 'on', !!(ph.actions.asgr && cEl && cEl.getAttribute('rid') === cmnt[0]));
    elfocus(rf);
  },
  sendComment: function() {
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index],
        fld = cur.pvComment, comp = fld && data(fld, 'composer'),
        params = comp ? Composer.getSendParams(comp, Photoview.sendComment) : {message: trim(val(fld))},
        replyToName = (cur.pvReplyNames[(cur.pvReplyTo || {})[0]] || [])[1], btn = 'pv_comment_send';

    if (params.delayed) return;

    if (!params.attach1_type && (!params.message || replyToName && !replyToName.indexOf(params.message))) {
      elfocus(fld);
      return;
    }

    hide('pv_comment_warn');
    ajax.post('al_photos.php',  Wall.fixPostParams(extend(params, {
      act: 'post_comment',
      photo: ph.id,
      hash: ph.hash,
      fromview: 1,
      from_group: isVisible(cur.pvAsGroup) ? isChecked(cur.pvAsGroup) : '',
      reply_to: (cur.pvReplyTo || {})[1]
    })), {onDone: function(text, names) {
      ++ph.commcount;
      Photoview.receiveComms(listId, index, text, names, true);
      if (data(cur.pvComment, 'composer')) {
        Composer.reset(data(cur.pvComment, 'composer'));
      } else {
        val(cur.pvComment, '');
      }
      cur.pvComment.blur();
      cur.pvReplyTo = false;
      hide('pv_reply_to_title', 'pv_del_reply_to');
    }, showProgress: lockButton.pbind(btn), hideProgress: unlockButton.pbind(btn)});
  },
  highlightComment: function(el) {
    el = ge(el);
    if (!el) return;

    var hlfunc = animate.pbind(el, {backgroundColor: '#ECEFF3'}, 200, function() {
      setTimeout(function() {
        animate(el, {backgroundColor: '#FFF'}, 200, function() {
          setStyle(el, {backgroundColor: ''});
        });
      }, 1000);
    }), top = getXY(el, true)[1];

    if (top < 0 || top > lastWindowHeight - 200) {
      animate(layerWrap, {scrollTop: layerWrap.scrollTop + top - 50}, 300, hlfunc);
    } else {
      hlfunc();
    }
  },
  showComment: function(comm) {
    var p = ge('pv_comment' + comm);
    if (p) {
      Photoview.highlightComment(p);
    } else {
      Photoview.comments(comm);
    }
    return false;
  },
  commDone: function(comm, context, text, del) {
    var node = ge('pv_comment' + comm + context);
    if (!node) return;

    var msg = node.firstChild.nextSibling, ph = context ? false : cur.pvData[cur.pvListId][cur.pvIndex];
    if (!text) {
      show(node.firstChild);
      hide(msg);
      if (ph) {
        ++ph.commcount;
        ++ph.commshown;
        Photoview.updateComms();
      } else if (window.photos && cur.offset) {
        photos.recache(cur.offset, 1);
      }
      return;
    }
    if (msg) {
      msg.innerHTML = text;
      show(msg);
    } else {
      node.appendChild(ce('div', {innerHTML: text}));
    }
    hide(node.firstChild);
    if (del) {
      if (ph) {
        --ph.commshown;
        --ph.commcount;
        Photoview.updateComms();
      } else if (window.photos && cur.offset) {
        photos.recache(cur.offset, -1);
      }
    } else {
      Photoview.updateHeight();
    }
    if (ph) {
      cur.pvCommsLikes[ph.id][0] = ge('pv_comments');
    }
  },
  commProgress: function(comm, sh) {
    var acts = ge('pv_actions' + comm);
    if (!acts) return;

    var prg = acts.firstChild.nextSibling;
    if (sh !== true) {
      hide(prg);
      show(acts.firstChild);
      return;
    }
    hide(acts.firstChild);
    if (!prg) {
      prg = acts.appendChild(ce('div', {className: 'progress'}));
    }
    show(prg);
  },
  commParams: function(comm, context) {
    return {
      onDone: Photoview.commDone.pbind(comm, context),
      progress: 'pv_progress' + comm + context
    }
  },
  commAction: function(act, comm, context, hash) {
    if (isVisible('pv_progress' + comm + context)) return;
    ajax.post('al_photos.php', {act: act + '_comment', comment: comm, context: context, hash: hash}, Photoview.commParams(comm, context));
  },

  onClick: function(e, skipClicked) {
    if (cur.pvClicked && !skipClicked || __afterFocus) {
      cur.pvClicked = false;
      return;
    }
    if (e && (e.button == 2 || e.which == 3 || e.pvHandle)) return;
    if (e) e.pvHandle = true;
    var px = e.pageX, py = e.pageY;
    if (px == null && e.clientX != null) {
      var doc = document.documentElement, body = bodyNode;
      px = event.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc.clientLeft || 0);
      py = event.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc.clientTop || 0);
    }
    var dx = Math.abs(px - intval(cur.pvOldX));
    var dy = Math.abs(py - intval(cur.pvOldY));
    if (dx > 3 || dy > 3) {
      if (vkNow() - intval(cur.pvOldT) > 300) {
        if (cur.pvTagger) {
          Phototag.stopTag();
        } else {
          Photoview.hide(0);
        }
      }
    }
  },
  onMouseMove: function(ev) {
    var el = cur.pvPhoto.firstChild;
    if (cur.pvTagger || !el) return;

    var elemXY = getXY(el), ph = cur.pvData[cur.pvListId][cur.pvIndex];
    var x = (ev.pageX - elemXY[0]) * 100 / cur.pvPhWidth, y = (ev.pageY - elemXY[1]) * 100 / cur.pvPhHeight;
    for (var i in ph.tags) {
      var coords = ph.tags[i];
      if (x > coords[0] && x < coords[2] && y > coords[1] && y < coords[3]) {
        Photoview.showDynTag(i);
        return;
      }
    }
    Photoview.hideTag();
  },
  onKeyDown: function(e) {
    if (e.returnValue === false) return false;
    if (e.keyCode == KEY.ESC && cur.pvEditing) {
      Photoview.cancelInline();
      return cancelEvent(e);
    }
    if (e.altKey && e.keyCode == KEY.RETURN && Photoview.canFullscreen()) {
      (cur.pvCanvas ? Photoview.fullscreenStop() : Photoview.fullscreen());
    }
    if (e.target && (e.target.tagName == 'INPUT' || e.target.tagName == 'TEXTAREA')) {
      return true;
    }
    if (e.keyCode == KEY.ESC) {
      if (cur.pvCanvas) {
        Photoview.fullscreenStop();
      } else if (cur.pvTagger) {
        Phototag.stopTag();
      } else if (!e.vkCanceled && !curBox()) {
        Photoview.hide(0);
      }
      return cancelEvent(e);
    } else if (!cur.pvTagger && !boxQueue.count() && (!cur.pvComment || !cur.pvComment.focused)) {
      if (e.keyCode == KEY.RIGHT) {
        Photoview.show(cur.pvListId, cur.pvIndex + 1);
      } else if (e.keyCode == KEY.LEFT) {
        Photoview.show(cur.pvListId, cur.pvIndex - 1);
      }
    }
  },
  onResize: function() {
    var dwidth = lastWindowWidth, dheight = lastWindowHeight, sbw = sbWidth();
    if (cur.pvCanvas) {
      var sizeChanged = false, oldverybig = cur.pvVeryBig, w = cur.pvCanvas.offsetWidth, h = cur.pvCanvas.offsetHeight;
      cur.pvVeryBig = (w > 1280 || h > 1280) ? 2 : ((w > 807 || h > 807) ? 1 : false);
      if (sizeChanged = (oldverybig != cur.pvVeryBig)) {
        setTimeout(Photoview.preload.pbind(cur.pvIndex, cur.pvLastDirection || 1), 10);
      }
      return;
    }
    if (cur.pvAlbumsShown || cur.pvAlbumShown || cur.pvPhotoTagShown) {
      cur.pvActualWidth = cur.pvsaMini ? 536 : 804;
      cur.pvCont.style.width = (cur.pvActualWidth + 154) + 'px';
      cur.pvSummary.parentNode.style.width = (cur.pvActualWidth - 4) + 'px';
    } else if (vk.pvbig) {
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
      cur.pvWidth = w;
      cur.pvHeight = h;

      var sizeChanged = false, oldverybig = cur.pvVeryBig;
      cur.pvVeryBig = (w > 1280) ? 2 : (w > 807 ? 1 : false);
      sizeChanged = (oldverybig != cur.pvVeryBig);

      var lnk = cur.pvPhoto;
      if (lnk && lnk.firstChild && cur.pvCurData.src == lnk.firstChild.src && cur.pvCurData.width) {
        var c = (cur.pvCurData.width > cur.pvWidth) ? (cur.pvWidth / cur.pvCurData.width) : 1;
        if (cur.pvCurData.height * c > cur.pvHeight) {
          c = cur.pvHeight / cur.pvCurData.height;
        }
        var w = cur.pvPhWidth = Math.floor(cur.pvCurData.width * c);
        var h = cur.pvPhHeight = Math.floor(cur.pvCurData.height * c);
        cur.pvActualWidth = Math.max(604, w);

        if (vk.pvbig) {
          cur.pvCont.style.width = (cur.pvActualWidth + 154) + 'px';
          cur.pvSummary.parentNode.style.width = (cur.pvActualWidth - 4) + 'px';
        }

        lnk.style.height = Math.max(453, h) + 'px';
        lnk.firstChild.style.width = w + 'px';
        lnk.firstChild.style.height = h + 'px';
        if (cur.pvTagger && cur.pvTagger != 'loading') {
          cur.pvTagger.resize(w, h);
        }

        var x = lnk.firstChild.offsetLeft, y = lnk.firstChild.offsetTop;
        if (browser.msie7 || browser.msie6) {
          x += lnk.offsetLeft;
          y += lnk.offsetTop;
        }
        setStyle(cur.pvTagFrame.firstChild, {
          width: w + 'px',
          height: h + 'px'
        });
        setStyle(cur.pvTagFaded, {
          width: w + 'px',
          height: h + 'px',
          left: x + 'px',
          top: y + 'px'
        });
        setStyle(cur.pvTagFrame, {
          left: (x - 3) + 'px', // 3 - tag frame border
          top: (y - 3) + 'px'
        });
        setStyle(cur.pvTagPerson, {
          left: x + 'px',
          top: y + 'px'
        });

        if (sizeChanged) {
          setTimeout(Photoview.preload.pbind(cur.pvIndex, cur.pvLastDirection || 1), 10);
        }
      } else {
        cur.pvActualWidth = intval(getStyle(cur.pvBox, 'width'));
      }
    }
    if (!cur.pvPhoto) return;
    if (browser.mozilla && cur.pvPhoto.firstChild) {
      var x = cur.pvPhoto.firstChild.offsetLeft, deltaX = ((lastWindowWidth - cur.pvActualWidth) % 2) && ((cur.pvActualWidth - cur.pvPhWidth) % 2) ? 4 : 3;
      setStyle(cur.pvTagFrame, {
        left: (x - deltaX) + 'px' // 3 - tag w border, mozilla buggy
      });
    }
    Photoview.updateArrows();
    Photoview.updateHeight();
    cur.pvHH.style.marginLeft = Math.ceil((cur.pvActualWidth + 50 - 72) / 2) + 'px';

    Photoview.scrollResize();
//    if (ge('pv_date')) { // debug
//      ge('pv_date').innerHTML = lastWindowWidth + ' ' + cur.pvActualWidth + ' ' + cur.pvPhWidth;
//    }
  },
  updateSize: function() {
    if (!vk.pvbig) {
      cur.pvActualWidth = 604;
      cur.pvSummary.parentNode.style.width = '600px';
      cur.pvCont.style.width = '758px';
      cur.pvPhoto.innerHTML = '';
    }
    onBodyResize();
    Photoview.onResize();
  },

  switchSize: function() {
    vk.pvbig = !vk.pvbig;

    ge('pv_large_link').innerHTML = getLang(vk.pvbig ? 'photos_smaller' : 'photos_larger');
    if (cur.pvTagger) Phototag.stopTag();
    Photoview.updateSize();
    Photoview.show(cur.pvListId, cur.pvIndex);
    if (vk.id) {
      clearTimeout(cur.pvSaveBig);
      cur.pvSaveBig = setTimeout(ajax.post.pbind('al_photos.php', {act: 'viewer_big', big: (vk.pvbig ? 1 : ''), hash: cur.pvHash}), 1000);
    }
  },
  switchColor: function(el) {
    var old = vk.pvdark ? 'pv_dark' : 'pv_light';
    vk.pvdark = !vk.pvdark;
    var cl = vk.pvdark ? 'pv_dark' : 'pv_light';

    setStyle(el, 'opacity', vk.pvdark ? 1 : 0.7);

    layerBG.className = layerBG.className.replace(old, cl);
    layerWrap.className = layerWrap.className.replace(old, cl);
    cur.pvFixed.className = cur.pvFixed.className.replace(old, cl);
    if (vk.id) {
      clearTimeout(cur.pvSaveColor);
      cur.pvSaveColor = setTimeout(ajax.post.pbind('al_photos.php', {act: 'viewer_color', dark: (vk.pvdark ? 1 : ''), hash: cur.pvHash}), 1000);
    }
  },

  activate: function(arrow) {
    if (arrow && arrow.timeout) {
      clearTimeout(arrow.timeout);
      removeAttr(arrow, 'timeout');
    } else if (isVisible(arrow)) {
      fadeTo(arrow, 200, vk.pvdark ? 1 : 0.7);
    }
  },
  deactivate: function(arrow) {
    if (!arrow || !isVisible(arrow) || arrow.timeout) {
      return;
    }
    arrow.timeout = setTimeout(function() {
      removeAttr(arrow, 'timeout');
      fadeTo(arrow, 200, 0.4);
    }, 1);
  },

  deletePhoto: function(sure) {
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index], box = curBox();
    var prg = box ? box.progress : 'pv_delete_progress';
    if (isVisible(prg)) return;

    if (cur.pvTagger && ev !== false) {
      Phototag.stopTag();
      return;
    }

    ajax.post('al_photos.php', {act: 'delete_photo', photo: ph.id, hash: ph.hash, set_prev: isChecked('pvb_prev_check'), sure: intval(sure)}, {onDone: function(text, html) {
      if (box) {
        box.hide();
        return nav.go('/id0', false, {nocur: true});
      }
      if (html) {
        return showFastBox(text, html, getLang('global_delete'), Photoview.deletePhoto.pbind(1), getLang('global_cancel'));
      }
      ph.deleted = text;
      if (listId == cur.pvListId && index == cur.pvIndex) {
        cleanElems('pv_confirm_tag', 'pv_delete_tag', 'pv_prof_cancel', 'pv_prof_done');
        cur.pvTagInfo.innerHTML = ph.deleted;
        show(cur.pvTagInfo);
        hide(cur.pvCommentsData);
        Photoview.updateHeight();
      }
    }, progress: prg});
  },
  restorePhoto: function() {
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    if (isVisible('pv_restore_progress')) return;

    ajax.post('al_photos.php', {act: 'restore_photo', photo: ph.id, hash: ph.hash}, {onDone: function(text) {
      ph.deleted = false;
      if (listId == cur.pvListId && index == cur.pvIndex) {
        cleanElems('pv_confirm_tag', 'pv_delete_tag', 'pv_prof_cancel', 'pv_prof_done');
        if (ph.taginfo) {
          cur.pvTagInfo.innerHTML = '\
<table cellspacing="0" cellpadding="0"><tr>\
  <td class="info">' + ph.taginfo + '</td>\
  <td><nobr><div class="button_blue"><button id="pv_confirm_tag">' + getLang('photos_confirm_tag') + '</button></div></td>\
  <td><nobr><div class="button_gray"><button id="pv_delete_tag">' + getLang('photos_delete_tag') + '</button></div></td>\
  <td><div id="pv_tag_handling" class="progress"></div></td>\
</tr></table>';
          show(cur.pvTagInfo);
          ge('pv_confirm_tag').onclick = Photoview.confirmTag.pbind(ph.tagid);
          ge('pv_delete_tag').onclick = Photoview.deleteTag.pbind(ph.tagid);
        } else {
          cur.pvTagInfo.innerHTML = '';
          hide(cur.pvTagInfo);
        }
        show(cur.pvCommentsData);
        Photoview.updateHeight();
      }
    }, progress: 'pv_restore_progress'});
  },
  spamPhoto: function(prg, spamHash) {
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    if (isVisible(prg)) return;

    if (cur.pvTagger && ev !== false) {
      Phototag.stopTag();
      return;
    }

    ajax.post('al_photos.php', {act: 'spam_photo', photo: ph.id, hash: ph.hash, spam_hash: spamHash}, {onDone: function(text, del) {
      if (del) ph.deleted = text;
      if (listId == cur.pvListId && index == cur.pvIndex) {
        cleanElems('pv_confirm_tag', 'pv_delete_tag', 'pv_prof_cancel', 'pv_prof_done');
        cur.pvTagInfo.innerHTML = text;
        show(cur.pvTagInfo);
        if (del) hide(cur.pvCommentsData);
        Photoview.updateHeight();
      }
    }, progress: prg});
  },
  rotatePhoto: function(to) {
    var prg = ge('pv_rotate_progress');
    if (isVisible(prg)) return;

    show(prg);
    ge('pv_rotate').appendChild(ce('div', {id: 'pv_rotate_frame', className: 'upload_frame', innerHTML: '<iframe name="pv_rotate_frame"></iframe>'}));
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index], form = ge('pv_rotate_form');
    form.innerHTML = '';
    form.action = ph.rotate[0];
    var data = extend({act: 'do_rotate', to: to, list_id: listId, index: index, from_host: locHost, fid: ph.id}, ph.rotate);
    to = (to + 4) % 4;
    if (data.act == 'rotate_photo') {
      data.angle = (data.angle + to) % 4;
    }
    if (data['rot'+to]) {
      data.act = 'done_rotate';
      data.complete = 1;
      ajax.post('/al_photos.php', data, {
        onDone: Photoview.rotateDone,
        onFail: function() {
          Photoview.rotateDone();
        }
      });
      return;
    }
    for (var i in data) {
      if (i != 0) {
        form.appendChild(ce('input', {type: 'hidden', name: i, value: data[i]}));
      }
    }
    form.submit();
  },
  rotateDone: function(data) {
    hide('pv_rotate_progress');
    var el = ge('pv_rotate_frame');

    if (!el) return;
    re(el);

    if (!data) return;
    var listId = data.list_id, index = data.index, ph = cur.pvData[listId][index];
    extend(ph, {x_src: data.x_src, y_src: data.y_src, z_src: data.z_src, w_src: data.w_src, base: data.base, x_: data.x_, y_: data.y_, z_: data.z_, w_: data.w_, x: 0, y: 0, z: 0, w: 0, tags: data.tags, tagged: data.tagged, tagshtml: data.html})
    extend(ph.rotate, {photo: data.photo, hash: data.hash, rhash: data.rhash, angle: data.angle, rot1: data.rot1, rot3: data.rot3});
    if (listId == cur.pvListId && index == cur.pvIndex) {
      Photoview.show(listId, index);
    }
  },

  likeUpdate: function(my, count, title) {
    count = intval(count);

    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    var countInput = ge('like_real_count_photo' + ph.id) || {}, rows = ge('like_table_photo' + ph.id);
    var titleNode = ge('like_title_photo' + ph.id), countNode = ge('pv_like_count');
    var icon = cur.pvLikeIcon;
    var tt = icon.parentNode.tt || {}, opts = clone(tt.opts || {}), newleft = (my ? 0 : -36);

    if (title && titleNode) {
      val(titleNode, title);
    }
    cur.pvCommsLikes[ph.id][1] = countInput.value = count;
    animateCount(countNode, count);

    ph.liked = my;
    (my ? addClass : removeClass)(cur.pvHH, 'pvs_hh_liked');
    if (!my) {
      var cb = ge('like_share_photo' + ph.id);
      if (cb) checkbox(cb, false);
    } else {
      setStyle(icon, {opacity: 1});
    }
    if (count) {
      var styleName = vk.rtl ? 'right' : 'left';
      if (tt.el && !isVisible(tt.container) && !title) {
        rows.style[styleName] = newleft + 'px';
        tooltips.show(tt.el, extend(opts, {showdt: 0}));
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
  like: function() {
    if (!vk.id) return;
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index], my = !ph.liked;
    ajax.post('like.php', {act: 'a_do_' + (my ? '' : 'un') + 'like', object: 'photo' + ph.id, hash: ph.hash, from: 'photo_viewer'}, {
      onDone: function(count, title) {
        if (cur.pvListId == listId && cur.pvIndex == index) {
          return Photoview.likeUpdate(my, count, title);
        }
        cur.pvCommsLikes[ph.id][1] = count;
        ph.liked = my;
      }
    });
    Photoview.likeUpdate(my, cur.pvCommsLikes[ph.id][1] + (my ? 1 : -1));
  },
  likeShare: function(hash) {
    if (!vk.id) return;
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    var el = ge('like_share_photo' + ph.id), was = isChecked(el);
    checkbox(el);
    ajax.post('like.php', {act: 'a_do_' + (was ? 'un' : '') + 'publish', object: 'photo' + ph.id, list: listId, hash: hash, from: 'photo_viewer'}, {
      onDone: function(count, title) {
        if (cur.pvListId == listId && cur.pvIndex == index) {
          return Photoview.likeUpdate(true, count, title);
        }
        cur.pvCommsLikes[ph.id][1] = count;
        ph.liked = true;
      }
    });
    Photoview.likeUpdate(true, cur.pvCommsLikes[ph.id][1] + (ph.liked ? 0 : 1));
  },
  likeOver: function() {
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    var icon = cur.pvLikeIcon;
    if (!ph.liked) {
      setTimeout(animate.pbind(icon, {opacity: 1}, 200, false), 1);
    } else {
      setStyle(icon, {opacity: 1});
    }
    var linkW = cur.pvLikeLink.offsetWidth;

    showTooltip(icon.parentNode, {
      url: 'like.php',
      params: {act: 'a_get_stats', object: 'photo' + ph.id, list: listId},
      slide: 15,
      shift: [0, 5, 9],
      ajaxdt: 100,
      showdt: 400,
      hidedt: 200,
      className: 'rich like_tt',
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
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    if (!ph.liked) {
      setTimeout(animate.pbind(cur.pvLikeIcon, {opacity: 0.4}, 200, false), 1);
    }
  },

  tagOver: function(el) {
    animate(el, {backgroundColor: '#6B8DB1'}, 200);
    showTooltip(el, {text: getLang('photos_delete_tag'), shift: [0, -2, 0]});
  },
  tagOut: function(el) {
    if (!el.parentNode || !el.parentNode.parentNode) return;
    animate(el, {backgroundColor: '#C4D2E1'}, 200);
  },
  deleteTag: function(tagId) {
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    if (ph.tagid) {
      if (isVisible('pv_tag_handling')) return;
    } else {
      if (ge('pv_action_progress')) return;
    }

    ajax.post('al_photos.php', {act: 'delete_tag', photo: ph.id, tag: tagId, hash: ph.hash}, {onDone: function(text, tags, tagged, html, padres) {
      if (_pads.shown == 'ph') {
        Pads.phDone(ph.id, false, padres);
      }
      Pads.invalidate('ph');
      if (ph.tagid) {
        ph.taginfo = ph.tagid = false;
        cleanElems('pv_confirm_tag', 'pv_delete_tag', 'pv_prof_cancel', 'pv_prof_done');
        cur.pvTagInfo.innerHTML = '<div class="progress fl_r" id="pv_spam_progress"></div><div class="pv_info">' + text + '</div>';
      } else {
        Photoview.actionInfo().innerHTML = text;
      }
      Photoview.updateHeight();
      if (tags !== undefined) {
        ph.tags = tags;
        ph.tagged = tagged;
        ph.tagshtml = html;
        if (cur.pvListId == listId && cur.pvIndex == index) {
          Photoview.setTags(html);

          ((!ph.taginfo && ph.actions.tag && tags[0] < cur.pvMaxTags) ? show : hide)(cur.pvTagLink);
        }
      }
    }, onFail: function(text) {
      if (!text) return;
      Photoview.actionInfo().innerHTML = text;
      return true;
    }, showProgress: function() {
      if (ph.tagid) {
        hide(ge('pv_confirm_tag').parentNode, ge('pv_delete_tag').parentNode);
        show('pv_tag_handling');
      } else {
        Photoview.actionInfo().innerHTML = '<div id="pv_action_progress" class="progress" style="display: block"></div>';
      }
    }, hideProgress: function() {
      if (ph.tagid) {
        hide('pv_tag_handling');
        show(ge('pv_confirm_tag').parentNode, ge('pv_delete_tag').parentNode);
      } else {
        re(Photoview.actionInfo());
      }
    }});
  },
  restoreTag: function(tagId) {
    if (ge('pv_action_progress')) return;

    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    ajax.post('al_photos.php', {act: 'restore_tag', photo: ph.id, tag: tagId, hash: ph.hash}, {onDone: function(text, tags, tagged, html) {
      if (tags !== undefined) {
        ph.tags = tags;
        ph.tagged = tagged;
        ph.tagshtml = html;
        if (cur.pvListId == listId && cur.pvIndex == index) {
          Photoview.setTags(html);
          ((!ph.taginfo && ph.actions.tag && tags[0] < cur.pvMaxTags) ? show : hide)(cur.pvTagLink);
        }
      }
      Photoview.actionInfo().innerHTML = text;
    }, onFail: function(text) {
      if (!text) return;
      Photoview.actionInfo().innerHTML = text;
      return true;
    }, showProgress: function() {
      Photoview.actionInfo().innerHTML = '<div id="pv_action_progress" class="progress" style="display: block"></div>';
    }, hideProgress: function() {
      re(Photoview.actionInfo());
    }});
  },

  confirmTag: function(tagId) {
    var listId = cur.pvListId, index = cur.pvIndex, ph = cur.pvData[listId][index];
    if (isVisible('pv_tag_handling')) return;

    ajax.post('al_photos.php', {act: 'confirm_tag', tag: tagId, photo: ph.id, hash: ph.hash}, {onDone: function(tags, tagged, html, padres) {
      if (_pads.shown == 'ph') {
        Pads.phDone(ph.id, false, padres);
      }
      Pads.invalidate('ph');
      ph.tags = tags;
      ph.tagged = tagged;
      ph.tagshtml = html;
      ph.taginfo = ph.tagid = false;
      if (listId == cur.pvListId && index == cur.pvIndex) {
        Photoview.setTags(html);
        ((!ph.taginfo && ph.actions.tag && tags[0] < cur.pvMaxTags) ? show : hide)(cur.pvTagLink);
        cleanElems('pv_confirm_tag', 'pv_delete_tag', 'pv_prof_cancel', 'pv_prof_done');
        cur.pvTagInfo.innerHTML = '';
        hide(cur.pvTagInfo);
      }
      Photoview.updateHeight();
    }, showProgress: function() {
      hide(ge('pv_confirm_tag').parentNode, ge('pv_delete_tag').parentNode);
      show('pv_tag_handling');
    }, hideProgress: function() {
      hide('pv_tag_handling');
      show(ge('pv_confirm_tag').parentNode, ge('pv_delete_tag').parentNode);
    }});
  },

  toProfileTag: function() {
    var tag = cur.pvData[cur.pvListId][cur.pvIndex].tagged[vk.id];
    if (tag && !cur.pvTagger) {
      Photoview.showTag(tag);
    }
  },
  showTag: function(tagId) {
    clearTimeout(cur.pvHidingTag);
    if (cur.pvShowingTag == tagId) return;

    var coords = clone(cur.pvData[cur.pvListId][cur.pvIndex].tags[tagId]);
    each(coords, function(i, v) {
      var wh = cur[(i % 2) ? 'pvPhHeight' : 'pvPhWidth'];
      coords[i] = Math.max(3, Math.min(wh - 3, positive(v * wh / 100)));
    });
    setStyle(cur.pvTagFrame, {
      marginLeft: coords[0] + 'px',
      marginTop: coords[1] + 'px',
      width: (coords[2] - coords[0]) + 'px',
      height: (coords[3] - coords[1]) + 'px'
    });
    setStyle(cur.pvTagFrame.firstChild, {
      marginLeft: -coords[0] + 'px',
      marginTop: -coords[1] + 'px'
    });
    cur.pvShowingTag = tagId;
    if (browser.msie) {
      show(cur.pvTagFrame, cur.pvTagFaded);
    } else {
      fadeIn(cur.pvTagFrame, 200);
      fadeIn(cur.pvTagFaded, 200);
    }
  },
  showDynTag: function(tagId) {
    clearTimeout(cur.pvHidingTag);
    if (cur.pvShowingTag == tagId) return;

    var coords = clone(cur.pvData[cur.pvListId][cur.pvIndex].tags[tagId]), el = ge('pv_tag' + tagId);
    if (!el) return;

    each(coords, function(i, v) {
      coords[i] = positive(v * cur[(i % 2) ? 'pvPhHeight' : 'pvPhWidth'] / 100);
    });
    setStyle(cur.pvTagPerson, {
      marginLeft: coords[0] + 'px',
      marginTop: coords[3] + 'px',
      minWidth: (coords[2] - coords[0]) + 'px'
    });
    cur.pvTagPerson.innerHTML = el.firstChild.innerHTML;
    var s = getSize(cur.pvTagPerson);
    if (coords[3] + s[1] > cur.pvPhHeight) {
      setStyle(cur.pvTagPerson, {marginTop: (cur.pvPhHeight - s[1]) + 'px'});
    }
    cur.pvTagPerson.onmouseover = Photoview.showDynTag.pbind(tagId);
    cur.pvShowingTag = tagId;
    if (browser.msie){
      show(cur.pvTagPerson);
    } else {
      fadeIn(cur.pvTagPerson, 200);
    }
  },
  hideTag: function(quick) {
    if (quick === true) {
      clearTimeout(cur.pvHidingTag);
      hide(cur.pvTagFaded, cur.pvTagFrame, cur.pvTagPerson);
      cur.pvShowingTag = false;
    }
    if (!cur.pvShowingTag) return;

    clearTimeout(cur.pvHidingTag);
    cur.pvHidingTag = setTimeout(function() {
      if (browser.msie) {
        hide(cur.pvTagFaded, cur.pvTagFrame, cur.pvTagPerson);
      } else if (cur.pvShowingTag) {
        fadeOut(cur.pvTagFaded, 200);
        fadeOut(cur.pvTagFrame, 200);
        fadeOut(cur.pvTagPerson, 200);
      }
      cur.pvShowingTag = false;
    }, 0);
  },
  realOffset: function(listId, offset, inc) {
    var res = offset;
    if (!cur.pvData || !cur.pvData[listId]) {
      return res;
    }
    for (var i = 0; i < offset; i++) {
      if (cur.pvData[listId][i] && (cur.pvData[listId][i].deleted || cur.pvData[listId][i].moved)) {
        res += inc;
      }
    }
    return res;
  },
  realCount: function(listId, count) {
    var res = count;
    if (!cur.pvData || !cur.pvData[listId]) {
      return res;
    }
    for (var i = 0; i < cur.pvData[listId].length; i++) {
      if (cur.pvData[listId][i] && (cur.pvData[listId][i].deleted || cur.pvData[listId][i].moved)) {
        res++;
      }
    }
    return res;
  },

  list: function(photoId, listId, realList) {
    if (realList == 'deleted') return;
    if (!cur.pvList) cur.pvList = {};
    cur.pvList[photoId + '_' + listId] = realList;
  },
  loaded: function(listId, count, offset, data, opts) {
    if (listId == 'deleted') return;
    if (opts) {
      extend(cur, {
        lang: extend(cur.lang || {}, opts.lang),
        pvHash: opts.hash,
        pvCommLimit: opts.commlimit,
        pvMaxTags: opts.maxtags,
        pvReplyNames: extend(cur.pvReplyNames || {}, opts.names || {}),
        pvMediaTypes: opts.media
      });
      if (!cur.options) cur.options = {};
      if (!cur.options.share) cur.options.share = opts.share;
      val(cur.pvAsGroup, '<div></div>' + getLang('wall_reply_as_group'));
      val('pv_comment_header', getLang('photos_yourcomment'));
      val(domFC(ge('pv_add_media')), getLang('global_add_media'));
    }
    count = Photoview.realCount(listId, count);
    offset = Photoview.realOffset(listId, offset, 1);
    if (!cur.pvData) cur.pvData = {};
    if (!cur.pvCommsLikes) cur.pvCommsLikes = {};
    if (!cur.pvData[listId]) {
      cur.pvData[listId] = new Array(count);
    } else if (cur.pvData[listId].length < count) {
      for (var i = cur.pvData[listId].length; i < count; ++i) {
        cur.pvData[listId].push(undefined);
      }
    } else if (cur.pvData[listId].length > count) {
      cur.pvData[listId] = cur.pvData[listId].slice(0, count);
    }
    var nw = vkNow();
    for (var i = 0, len = data.length; i < len; ++i) {
      var index = (offset + i), ph = data[i];
      while (index >= count) index -= count;
      cur.pvCommsLikes[ph.id] = [ph.comments, ph.likes, vkNow(), false];
      delete(ph.comments);
      delete(ph.likes);
      cur.pvData[listId][index] = ph;
    }
  },
  showDeleted: function(lst, msg, spm) {
    if (cur.pvShown && cur.pvListId == 'temp') {
      msg += '<br><br>' + spm;
    }

    showFastBox({title: getLang('global_error'), onHide: function() {
      if (cur.pvShown && cur.pvListId == 'temp') {
        Photoview.hide(true);
      }
    }}, msg);
  },
  spamDeleted: function(el, ph, hash) {
    if (isVisible(curBox().progress)) return;
    ajax.post('al_photos.php', {act: 'spam_photo', photo: ph, hash: hash, from: 'deleted'}, {onDone: function(text) {
      domPN(el).replaceChild(ce('span', {innerHTML: text}), el);
    }, showProgress: curBox().showProgress, hideProgress: curBox().hideProgress});
  },
  showPhoto: function(photoId, listId, options, just) {
    if (!cur.pvShown || cur.pvListId == 'temp' && !cur.pvWasShown || options.noHistory !== undefined) {
      debugLog('in showPhoto noHistory: ' + options.noHistory);
      cur.pvNoHistory = options.noHistory;
      cur.pvHistoryLength = options.noHistory ? 0 : (options.histLen || 0);
    }
    extend(cur, {
      pvJumpTo: options.jumpTo || false,
      pvJumpFrom: false,
      pvJumpSteps: 0
    });
    listId = cur.pvList && cur.pvList[photoId + '_' + listId] || listId;
    if (!cur.pvData || !cur.pvData[listId]) {
      return;
    }
    var data = cur.pvData[listId], whole = true, onh = cur.pvOptions && cur.pvOptions.onHide;
    cur.pvOptions = options;
    if (!cur.pvOptions.onHide) cur.pvOptions.onHide = onh;
    for (var i = 0, len = data.length; i < len; ++i) {
      if (data[i]) {
        if (data[i].id === photoId) {
          Photoview.show(listId, i, false, options.root);
          if (options.onShow) {
            options.onShow();
          }
          return false;
        }
      } else {
        whole = false;
      }
    }
    if (whole && just) {
      if (options.onEmpty) {
        options.onEmpty();
      }
      return false;
    }
  },

  loadedAlbums: function(ownerId, html, preload, preloadPhotos, opts) {
    if (!cur.pvAlbumsData) return;

    ajax.preload('al_photos.php', extend({offset: opts.offset, part: 1, owner: ownerId}, {act: 'show_albums'}), preload);
    ajax.preload('al_photos.php', extend({offset: opts.photos_offset, part: 1, owner: ownerId}, {act: 'show_albums', only_photos: 1}), preloadPhotos);

    cur.pvAlbumsData[ownerId] = {
      html: html,
      opts: opts
    };
    if (cur.pvAlbumsShowing == ownerId) {
      Photoview.doShowAlbums(ownerId, false);
      boxRefreshCoords(layer);
    }
  },
  showAlbums: function(ownerId, options) {
    ownerId = intval(ownerId);
    if (!cur.pvAlbumsData) cur.pvAlbumsData = {};
    if (cur.pvListId == 'temp') {
      cur.pvCancelLoad();
    }

    cur.pvNoHistory = options.noHistory;
    cur.pvHistoryLength = 0;
    cur.pvAlbumsShowing = ownerId;
    var of = options.onFail;
    if (!cur.pvAlbumsData[ownerId]) {
      cur.pvAlbumsData[ownerId] = 'loading';
      ajax.post('al_photos.php', {act: 'show_albums', owner: ownerId}, extend(options, {onDone: Photoview.loadedAlbums, onFail: function(t) {
          if (of) of(t);
          delete(cur.pvAlbumsData[ownerId]);
          cur.pvAlbumsData[ownerId];
          layers.fullhide(true);
          return true;
        }
      }));
    } else if (cur.pvAlbumsData[ownerId] != 'loading') {
      Photoview.doShowAlbums(ownerId, false);
      boxRefreshCoords(layer);
    }
  },
  loadedAlbum: function(albumRaw, html, preload, opts) {
    if (!cur.pvAlbumData) return;

    if (preload) {
      ajax.preload('al_photos.php', extend({offset: opts.offset, part: 1, album: albumRaw}, {act: 'show_album'}), preload);
    }

    cur.pvAlbumData[albumRaw] = {
      html: html,
      opts: opts
    };
    if (cur.pvAlbumShowing == albumRaw) {
      Photoview.doShowAlbum(albumRaw, false);
      boxRefreshCoords(layer);
    }
  },
  showAlbum: function(albumRaw, options) {
    if (!cur.pvAlbumData) cur.pvAlbumData = {};
    if (cur.pvListId == 'temp') {
      cur.pvCancelLoad();
    }

    cur.pvNoHistory = options.noHistory;
    cur.pvHistoryLength = 0;
    cur.pvAlbumShowing = albumRaw;
    var of = options.onFail;
    if (!cur.pvAlbumData[albumRaw]) {
      cur.pvAlbumData[albumRaw] = 'loading';
      ajax.post('al_photos.php', {act: 'show_album', album: albumRaw}, extend(options, {onDone: Photoview.loadedAlbum, onFail: function(t) {
          if (of) of(t);
          delete(cur.pvAlbumData[albumRaw]);
          cur.pvAlbumData[albumRaw];
          layers.fullhide(true);
          return true;
        }
      }));
    } else if (cur.pvAlbumData[albumRaw] != 'loading') {
      Photoview.doShowAlbum(albumRaw, false);
      boxRefreshCoords(layer);
    }
  },
  loadedTagged: function(ownerId, html, preload, preloadPhotos, opts) {
    if (!cur.pvPhotoTagData) return;

    ajax.preload('al_photos.php', extend({offset: opts.offset, part: 1, owner: ownerId}, {act: 'show_tag'}), preload);
    ajax.preload('al_photos.php', extend({offset: opts.photos_offset, part: 1, owner: ownerId}, {act: 'show_tag', only_photos: 1}), preloadPhotos);

    cur.pvPhotoTagData[ownerId] = {
      html: html,
      opts: opts
    };
    if (cur.pvPhotoTagShowing == ownerId) {
      Photoview.doShowTagged(ownerId, false);
      boxRefreshCoords(layer);
    }
  },
  showTagged: function(ownerId, options) {
    ownerId = intval(ownerId);
    if (!cur.pvPhotoTagData) cur.pvPhotoTagData = {};
    if (cur.pvListId == 'temp') {
      cur.pvCancelLoad();
    }

    cur.pvNoHistory = options.noHistory;
    cur.pvHistoryLength = 0;
    cur.pvPhotoTagShowing = ownerId;
    var of = options.onFail;
    if (!cur.pvPhotoTagData[ownerId]) {
      cur.pvPhotoTagData[ownerId] = 'loading';
      ajax.post('al_photos.php', {act: 'show_tag', mid: ownerId}, extend(options, {onDone: Photoview.loadedTagged, onFail: function(t) {
          if (of) of(t);
          delete(cur.pvPhotoTagData[ownerId]);
          cur.pvPhotoTagData[ownerId];
          layers.fullhide(true);
          return true;
        }
      }));
    } else if (cur.pvPhotoTagData[ownerId] != 'loading') {
      Photoview.doShowTagged(ownerId, false);
      boxRefreshCoords(layer);
    }
  },
  loadedVideoTags: function(ownerId, html, preload, opts) {
    ajax.preload('/al_video.php', {act: 'show_video_tags', offset: opts.offset, part: 1, mid: ownerId}, preload);

    cur.pvVideoTagsData = {
      html: html,
      opts: opts
    };
    if (cur.pvVideoTagShowing == ownerId) {
      Photoview.doShowVideoTags(ownerId, false);
      boxRefreshCoords(layer);
    }
  },
  showVideoTags: function(ownerId, options) {
    cur.pvNoHistory = options.noHistory;
    cur.pvHistoryLength = 0;
    cur.pvVideoTagShowing = ownerId;
    var of = options.onFail;
    if (!cur.pvVideoTagsData) {
      cur.pvVideoTagsData = 'loading';
      ajax.post('/al_video.php', {act: 'show_video_tags', mid: ownerId}, extend(options, {onDone: Photoview.loadedVideoTags, onFail: function(t) {
          if (of) of(t);
          delete(cur.pvVideoTagsData);
          layers.fullhide && layers.fullhide(true);
          return true;
        }
      }));
    } else if (cur.pvVideoTagsData != 'loading') {
      Photoview.doShowVideoTags(ownerId, false);
      boxRefreshCoords(layer);
    }
  },
  scrollResize: function() {
    if (browser.mobile || !cur.pvShown || (!cur.pvAlbumsShown && !cur.pvAlbumShown && !cur.pvPhotoTagShown && !cur.pvVideoTagsShown)) return;

    var bt = lastWindowHeight,
        lnk = cur.pvVideoTagsShown ? ge('pva_more_videos') : (cur.pvAlbumsShown ? ge('pva_more_photos') : ge('pvsa_more_photos')),
        albumsLnk = ge('pva_more');

    if (isVisible(lnk) && bt > getXY(lnk)[1] - (browser.msie6 ? 0 : scrollGetY())) {
      if (cur.pvVideoTagsShown) {
        Photoview.loadVideoTags();
      } else if (cur.pvPhotoTagShown) {
        Photoview.loadTaggedPhotos();
      } else if (cur.pvAlbumsShown) {
        Photoview.loadAlbumsPhotos();
      } else {
        Photoview.loadAlbumPhotos();
      }
    }
    if (cur.pvAlbumsShown && cur.pvShowAllAlbums && isVisible(albumsLnk) && bt > getXY(albumsLnk)[1] - (browser.msie6 ? 0 : scrollGetY())) {
      Photoview.loadAlbums();
    }
  },
  loadAlbums: function() {
    cur.pvShowAllAlbums = true;
    Photoview.loadAlbumsPhotos(true);
  },
  loadedAlbumsPhotos: function(off, rows, albums) {
    cur.pvaLoading = 0;

    if (!cur.pvAlbumsShown) return;

    if (albums) {
      cur.pvaOffset = off;
    } else {
      cur.pvaPhotosOffset = off;
    }

    var cont = albums ? ge('pva_content') : ge('pva_content_photos'),
        more = albums ? ge('pva_more') : ge('pva_more_photos'),
        opts = albums ? {act: 'show_albums'} : {act: 'show_albums', only_photos: 1},
        offset = albums ? cur.pvaOffset : cur.pvaPhotosOffset,
        count = albums ? cur.pvaCount : cur.pvaPhotosCount,
        d = ce('div', {innerHTML: rows});
    if (!cont) return;

    while (d.firstChild) {
      cont.appendChild(d.firstChild);
    }

    Photoview.onResize();

    if (off >= count || !rows) {
      hide(more);
      return;
    }
    cur.pvaLoading = 1;

    ajax.post('al_photos.php', extend({offset: offset, part: 1, owner: cur.pvAlbumsShown}, opts || {}), {cache: 1, onDone: function() {
      debugLog('preload done: ' + cur.pvaLoading);
      if (cur.pvaLoading == 2) {
        Photoview.loadedAlbumsPhotos.apply(window, arguments);
      } else {
        cur.pvaLoading = false;
      }
    }, onFail: function() {
      cur.pvaLoading = 0;
      return true;
    }});
  },
  loadAlbumsPhotos: function(albums) {
    var more = albums ? ge('pva_more') : ge('pva_more_photos'),
        progress = albums ? ge('pva_more_prg') : ge('pva_more_photos_prg'),
        opts = albums ? {act: 'show_albums'} : {act: 'show_albums', only_photos: 1},
        offset = albums ? cur.pvaOffset : cur.pvaPhotosOffset;
    if (!cur.pvAlbumsShown || !more || !isVisible(more) || isVisible(progress)) return;

    if (cur.pvaLoading) {
      cur.pvaLoading = 2;
      return;
    }

    ajax.post('al_photos.php', extend({offset: offset, part: 1, owner: cur.pvAlbumsShown}, opts || {}), {onDone: Photoview.loadedAlbumsPhotos, onFail: function() {
      cur.pvaLoading = 0;
      return true;
    }, showProgress: function() {
      show(progress);
      hide(more.firstChild);
    }, hideProgress: function() {
      show(more.firstChild);
      hide(progress);
    }, cache: 1});
  },
  loadedAlbumPhotos: function(off, rows) {
    cur.pvaLoading = 0;

    if (!cur.pvAlbumShown) return;

    cur.pvsaOffset = off;

    var cont = ge('pvsa_content_photos'),
        more = ge('pvsa_more_photos');
    if (!cont) return;

    cont.appendChild(cf(rows));

    if (off >= cur.pvsaCount) {
      hide(more);
      Photoview.onResize();
      return;
    }

    Photoview.onResize();
    cur.pvsaLoading = 1;

    ajax.post('al_photos.php', extend({offset: cur.pvsaOffset, part: 1, album: cur.pvAlbumShown}, {act: 'show_album'}), {cache: 1, onDone: function() {
      debugLog('preload done: ', cur.pvsaLoading);
      if (cur.pvsaLoading == 2) {
        Photoview.loadedAlbumPhotos.apply(window, arguments);
      } else {
        cur.pvsaLoading = false;
      }
    }, onFail: function() {
      cur.pvsaLoading = 0;
      return true;
    }});
  },
  loadAlbumPhotos: function() {
    var more = ge('pvsa_more_photos'),
        progress = ge('pvsa_more_photos_prg'),
        offset = cur.pvsaOffset;
    if (!cur.pvAlbumShown || !more || !isVisible(more) || isVisible(progress)) return;

    if (cur.pvsaLoading) {
      cur.pvsaLoading = 2;
      return;
    }

    ajax.post('al_photos.php', {act: 'show_album', album: cur.pvAlbumShown, offset: offset, part: 1}, {onDone: Photoview.loadedAlbumPhotos, onFail: function() {
      cur.pvsaLoading = 0;
      return true;
    }, showProgress: function() {
      show(progress);
      hide(more.firstChild);
    }, hideProgress: function() {
      show(more.firstChild);
      hide(progress);
    }, cache: 1});
  },
  loadedTaggedPhotos: function(off, rows) {
    cur.pvaLoading = 0;

    if (!cur.pvPhotoTagShown) return;

    cur.pvsaOffset = off;

    var cont = ge('pvsa_content_photos'),
        more = ge('pvsa_more_photos');
    if (!cont) return;

    cont.appendChild(cf(rows));

    Photoview.onResize();

    if (off >= cur.pvsaCount || !rows) {
      hide(more);
      return;
    }
    cur.pvsaLoading = 1;

    ajax.post('al_photos.php', extend({offset: cur.pvsaOffset, part: 1, mid: cur.pvPhotoTagShown}, {act: 'show_tag'}), {cache: 1, onDone: function() {
      debugLog('preload done: ', cur.pvsaLoading);
      if (cur.pvsaLoading == 2) {
        Photoview.loadedTaggedPhotos.apply(window, arguments);
      } else {
        cur.pvsaLoading = false;
      }
    }, onFail: function() {
      cur.pvsaLoading = 0;
      return true;
    }});
  },
  loadTaggedPhotos: function(albums) {
    var more = ge('pvsa_more_photos'),
        progress = ge('pvsa_more_photos_prg'),
        offset = cur.pvsaOffset;
    if (!cur.pvPhotoTagShown || !more || !isVisible(more) || isVisible(progress)) return;

    if (cur.pvsaLoading) {
      cur.pvsaLoading = 2;
      return;
    }

    ajax.post('al_photos.php', {act: 'show_tag', mid: cur.pvPhotoTagShown, offset: offset, part: 1}, {onDone: Photoview.loadedTaggedPhotos, onFail: function() {
      cur.pvsaLoading = 0;
      return true;
    }, showProgress: function() {
      show(progress);
      hide(more.firstChild);
    }, hideProgress: function() {
      show(more.firstChild);
      hide(progress);
    }, cache: 1});
  },
  loadedMoreVideoTags: function(off, rows) {
    cur.pvaLoading = 0;

    if (!cur.pvVideoTagsShown) return;

    cur.pvsaOffset = off;

    var cont = ge('pva_video_tags'),
        more = ge('pva_more_videos');
    if (!cont) return;

    cont.appendChild(cf(rows));

    Photoview.onResize();

    if (off >= cur.pvsaCount || !rows) {
      hide(more);
      return;
    }
    cur.pvsaLoading = 1;

    ajax.post('/al_video.php', extend({act: 'show_video_tags', offset: cur.pvsaOffset, part: 1, mid: cur.pvVideoTagsShown}), {cache: 1, onDone: function() {
      debugLog('preload done: ', cur.pvsaLoading);
      if (cur.pvsaLoading == 2) {
        Photoview.loadedMoreVideoTags.apply(window, arguments);
      } else {
        cur.pvsaLoading = false;
      }
    }, onFail: function() {
      cur.pvsaLoading = 0;
      return true;
    }});
  },
  loadVideoTags: function(albums) {
    var more = ge('pva_more_videos'),
        progress = ge('pva_more_videos_prg'),
        offset = cur.pvsaOffset;
    if (!cur.pvVideoTagsShown || !more || !isVisible(more) || isVisible(progress)) return;

    if (cur.pvsaLoading) {
      cur.pvsaLoading = 2;
      return;
    }

    ajax.post('/al_video.php', {act: 'show_video_tags', mid: cur.pvVideoTagsShown, offset: offset, part: 1}, {onDone: Photoview.loadedMoreVideoTags, onFail: function() {
      cur.pvsaLoading = 0;
      return true;
    }, showProgress: function() {
      show(progress);
      hide(more.firstChild);
    }, hideProgress: function() {
      show(more.firstChild);
      hide(progress);
    }, cache: 1});
  },
  thumbOver: function(obj, id) {
    clearTimeout((cur.pvHideTO || {})[id]);
    var title = geByClass1('pva_title', obj), r = title.previousSibling, descY = getSize(geByClass1('pva_desc', obj))[1];
    if (descY < 5) return;

    animate(title, {marginTop: 238 - (descY + 7)}, {duration: 200, transition: Fx.Transitions.easeOutCirc});
    if (r.className == 'pva_repeat') {
      animate(r, {marginTop: 86 - Math.floor((descY + 7) / 2)}, {duration: 200, transition: Fx.Transitions.easeOutCirc});
    }
  },
  thumbOut: function(obj, id) {
    if (!cur.pvHideTO) cur.pvHideTO = {};
    cur.pvHideTO[id] = setTimeout(function() {
      var title = geByClass1('pva_title', obj), r = title.previousSibling;
      animate(title, {marginTop: 238}, 200);
      if (r.className == 'pva_repeat') {
        animate(r, {marginTop: 86}, 200);
      }
    }, 150);
  },

  photoAct: function(ev) {
    if (cur.pvAlbumsShown || cur.pvAlbumShown || cur.pvPhotoTagShown || !cur.pvCurPhoto.author) return;

    var pos = getXY(cur.pvHH, true);
    if (pos[0]) {
      cur.hhPos = pos;
    } else {
      pos = cur.hhPos;
    }

    var next = cur.pvHH;

    var dx = Math.abs(ev.clientX - pos[0] - 36);
    var dy = ev.clientY - pos[1];

    if (dx < 120 && dy < 130 && dy > -30) {
      if (cur.pvHHShowing) return;
      cur.pvHHShowing = true;
      show(next);
      animate(next.firstChild, {opacity: 1}, 400);

      if (!cur.rvPreloadBig) {
        vkImage().src = '/images/icons/post_big_hh.png';
        cur.rvPreloadBig = true;
      }
    } else {
      if (!cur.pvHHShowing) return;
      cur.pvHHShowing = false;
      animate(next.firstChild, {opacity: 0}, 400);
    }

  },

  hhLiked: function(obj, act) {
    return (act || hasClass)(obj.parentNode.parentNode, 'pvs_hh_liked');
  },
  hhOver: function(obj) {
    clearTimeout(obj.parentNode.parentNode.getAttribute('timer'));
    var params = Photoview.hhLiked(obj) ? [0.25, 1] : [0.28, 0.65];
    animate(obj.previousSibling, {opacity: params[0]}, 200);
    animate(obj, {opacity: params[1]}, 200);
  },
  hhOut: function(obj) {
    var params = Photoview.hhLiked(obj) ? [0.25, 1] : [0.2, 0.5];
    animate(obj.previousSibling, {opacity: params[0]}, 200);
    animate(obj, {opacity: params[1]}, 200);
  },
  hhClick: function(obj, ev, pv) {
    if (ev.button == 2) return;
    var liked = Photoview.hhLiked(obj);

    Photoview.like();
    liked && Photoview.likeOut();

    Photoview.hhOver(obj);

    if (!liked && !(browser.msie && intval(browser.version) < 9 || browser.mozilla && intval(browser.version) < 9)) {
      obj.innerHTML = '<img class="pvs_hh_ah" width="38" height="34" src="/images/icons/post_big_hh.png" />';
      var img = obj.firstChild;
      animate(img, {marginLeft: -3, marginTop: 3, width: 78, height: 71, opacity: 0}, {duration: 600, transition: Fx.Transitions.easeOutCubic});
    }

    return cancelEvent(ev);
  },
  hhCheck: function() {
    return (!browser.msie || intval(browser.version) > 8) && !cur.pvNoLikes;
  },

  showRepeat: function(row) {
    if (!row || geByClass1('pva_repeat', row)) return;

    geByClass1('pva_link', row).insertBefore(ce('div', {className: 'pva_repeat', innerHTML: '\
<div class="pva_repeat_blob">\
  <div class="pva_repeat_cont"><img class="pva_repeat_img png" src="'+stManager._srcPrefix('.css')+'/images/icons/post_hh'+(window.devicePixelRatio >= 2 ? '_2x' : '')+'.png?2" /><span class="pva_repeat_text">' + getLang('photos_repeat_album') + '</span></div>\
</div>'}), geByClass1('pva_title', row));
  },

  showPlace: function() {
    var geohash = cur.pvCurPhoto.geohash;
    showBox('al_places.php', {act: 'show_photo_place', geohash: geohash, photo: cur.pvCurPhoto.id}, {width: 708, hideButtons: true, title: false, cache: 1});
  },

  editPlace: function() {
    var geohash = cur.pvCurPhoto.geohash;
    showBox('al_places.php', {act: 'show_photo_place', edit: 1, geohash: geohash || '', photo: cur.pvCurPhoto.id});
  },

  updatePlace: function(photo, place) {
    var placeCont = ge('pv_edit_place');
    if (place) {
      placeCont && (placeCont.innerHTML = place ? place + '.' : '');
      ge('pv_place').innerHTML = place ? '<span class="pv_place_label">' + getLang('photos_place_label') + '</span> <a class="pv_place_a" id="pv_place_a" onclick="Photoview.showPlace()">' + place + '</a>' : '';
      hide('pv_add_place');
    } else {
      setTimeout(function() {
        ajax.post('al_photos.php', {act: 'get_photo_place', photo: photo}, {
          onDone: function(place, placeGeoHash) {
            Photoview.updatePlace(photo, place);
          }
        })
      }, 1000);
    }
  },

  nearProgress: function(obj) {
    obj.insertBefore(ce('div', {className: 'pv_load_near'}), obj.firstChild);
  }/*,

  showPvLayer: function() {
    if (cur.pvFixedHide) {
      show(cur.pvFixed);
    }
    cur.pvNoHistory = true;
    layers.fullhide && layers.fullhide(true);

    layers.wrapshow(layerWrap, 0.7);
    layers.fullhide = Photoview.hide;
    onBodyResize();
    if (cur.pvVideoTagsShown) {
      var nl = extend(nav.objLoc, {z: 'video_tag' + cur.pvVideoTagsShown});
      if (nav.strLoc != nav.toStr(nl)) {
        setTimeout(nav.setLoc.pbind(nl), 0);
      }
    }
  }
*/
}, photoview = Photoview;

try{stManager.done('photoview.js');}catch(e){}
