var WriteBox = {
  mrg: function(v) {
    return vk.rtl ? {marginRight: v} : {marginLeft: v};
  },
  show: function(box, opts) {
    addClass(boxLayerBG, 'bg_dark');
    box.setOptions({hideButtons: true, width: 502, bodyStyle: 'padding: 0px; border: 0px;'});
    box.removeButtons();

    cur.lang = extend(cur.lang || {}, opts.lang);
    extend(cur, {
      mbTxtInp: {},
      mbEditable: opts.editable,
      mbSmile: ge('mbe_smile'),
      mbEmoji: opts.emoji,
      mbMedia: null,
      mbField: ge(opts.editable ? 'mail_box_editable' : 'mail_box_text'),
      mbAva: ge('mail_box_ava'),
      mbMediaTypes: opts.mediaTypes,
      mbTo: opts.toData,
      mbHash: opts.hash,
      mbBannedHim: opts.bannedhim
    });

    if (opts.emojiRcnt && !cur.mbRcntEmoji) {
      var html = [];
      for (var a = opts.emojiRcnt, i = 0, l = a.length; i < l; ++i) {
        var code = a[i];
        if (!code) continue;
        html.push('<a id="mbe_rc_em_' + code + '" class="mbe_rc_emojibtn" onmousedown="WriteBox.addEmoji(\'' + code + '\', this); return cancelEvent(event);">' + WriteBox.getEmojiHTML(code, false, true) + '</a>');
      }
      cur.mbRcntEmoji = html.join('');
    }
    val('mbe_rcemoji', cur.mbRcntEmoji || '');

    if (ls.checkVersion()) {
      addEvent(cur.mbField, 'keyup paste', function(e) {
        if (cur.mbEditable) {
          if (e.type == 'paste') {
            WriteBox.onEditablePaste(cur.mbField);
          } else {
            WriteBox.checkEditable();
          }
        }
        clearTimeout(cur.mbSaveDraftTO);
        cur.mbSaveDraftTO = setTimeout(WriteBox.saveDraft, (WriteBox.editableHasVal(cur.mbField).length && e.type != 'paste') ? 300 : 0);
      });
    }

    if (!cur.mbTo[0]) {
      setStyle(ge('mail_box_topic'), WriteBox.mrg(0));
      cur.mbHidden = true;
    } else {
      cur.mbHidden = false;
    }

    if (!cur.mbEditable) {
      autosizeSetup(cur.mbField, {minHeight: 120})
      setTimeout(elfocus.pbind(cur.mbField), 0);
    } else {
      setTimeout(WriteBox.editableFocus.pbind(cur.mbField), 0);
    }

    var tmp = cur.postTo;
    cur.postTo = false;
    box.setOptions({onHide: function() {
      removeClass(boxLayerBG, 'bg_dark');
      removeEvent(document, 'keydown', WriteBox.onKey);
      if (cur.mbEmojiShown) WriteBox.ttEmoji(cur.mbSmile, true);
      if (cur.mbOnMouseClick) {
        cur.onMouseClick = cur.mbOnMouseClick;
        cur.mbOnMouseClick = false;
      }
      if (browser.mozilla) {
//        document.execCommand("enableObjectResizing", false, true);
      }
    }, onShow: function() {
      addClass(boxLayerBG, 'bg_dark');
      addEvent(document, 'keydown', WriteBox.onKey);
      if (!cur.mbOnMouseClick) {
        cur.mbOnMouseClick = cur.onMouseClick;
      }
      if (browser.mozilla) {
//        document.execCommand("enableObjectResizing", false, false);
      }
    }, onClean: function() {
      clearTimeout(cur.mbSaveDraftTO);
      delete cur.mbSaveDraftTO;
      delete cur.mbField;
      cur.postTo = tmp;
      cur.mbEmojiScroll = cur.mbEmojiExpanded = false;
      if (window.WideDropdown) WideDropdown.deinit('mail_box_dd');
    }});
    addEvent(document, 'keydown', WriteBox.onKey);
    if (!cur.mbOnMouseClick) {
      cur.mbOnMouseClick = cur.onMouseClick;
    }
    if (browser.mozilla) {
//      document.execCommand("enableObjectResizing", false, false);
    }

    if (!window._mbFriends) { // is used in sharebox.js too!
      ajax.post('hints.php', {act: 'a_json_friends', from: 'imwrite', str: ''}, {onDone: function(arr) {
        window._mbFriends = arr;
        var dd = (cur.wdd && cur.wdd['mail_box_dd']);
        if (dd) {
          WideDropdown.items('mail_box_dd', arr);
        }
      }});
    }
    stManager.add(['wide_dd.js', 'wide_dd.css'], function() {
      if (WideDropdown.init('mail_box_dd', {
        defaultItems: window._mbFriends,
        url: 'hints.php',
        params: {act: 'a_json_friends', from: 'imwrite'},
        noResult: getLang('mail_not_found'),
        img: cur.mbAva,
        introText: getLang('mail_choose_recipient'),
        custom: function(q) {
          return (q.indexOf('@') != -1) ? [[clean(q), clean(q), getLang('mail_enter_email_address'), '/images/pics/contact50.gif', 0, '']] : false;
        },
        chooseOnBlur: function(id) {
          id = trim(id + '');
          return id.length < 64 && id.match(/^[a-z0-9_\-\.]+@[a-z0-9_\-\.]+\.[a-z]{2,6}$/i);
        },
        onChange: function(act) {
          var dd = cur.wdd['mail_box_dd'], sel = dd.selCount, peer = false, draft, ret = true;
          if (sel == 1 && !WriteBox.editableHasVal(cur.mbField)) {
            for (peer in dd.selected) break;
            WriteBox.restoreDraft(peer);
          }
          if (act == 1) { // added
            setTimeout(cur.mbEditable ? WriteBox.editableFocus.pbind(cur.mbField, domLC(cur.mbField)) : elfocus.pbind(cur.mbField), 0);
          }
          var t = Fx.Transitions.easeOutCubic, d = 150, f = 'ease-out';
          if (sel < 1 && !cur.mbHidden) {
            cssAnim(cur.mbAva, extend({opacity: 0}, WriteBox.mrg(-26)), {duration: d, transition: t, func: f}, hide.pbind(cur.mbAva));
            cssAnim(ge('mail_box_topic'), WriteBox.mrg(0), {duration: d, transition: t, func: f});
            cur.mbHidden = true;
            ret = 0;
          } else if (sel > 0 && cur.mbHidden) {
            show(cur.mbAva);
            cssAnim(cur.mbAva, extend({opacity: 1}, WriteBox.mrg(0)), {duration: d, transition: t, func: f});
            cssAnim(ge('mail_box_topic'), WriteBox.mrg(26), {duration: d, transition: t, func: f});
            cur.mbHidden = false;
            ret = 1;
          }
          WriteBox.checkLen(cur.mbField);
          WriteBox.showToFull();
          val('mail_box_to_header', getLang((sel > 1) ? 'mail_rcpnts' : 'mail_rcpnt'));
          return ret;
        },
        itemMark: function(item) {
          return intval(item[5]) ? 1 : 0;
        }
      })) {
        WideDropdown.select('mail_box_dd', false, cur.mbTo);
      }
    });
    stManager.add(['page.js', 'page.css'], function() {
      cur.mbMedia = initAddMedia('mail_box_add_link', 'mail_box_added_row', cur.mbMediaTypes, {mail: 1, nocl: 1, editable: 1, sortable: 1, teWidth: 350, teHeight: 300, toggleLnk: true});
      cur.mbMedia.onChange = function() {
        box.changed = true;
      }
      if (ls.checkVersion() && cur.mbTo[0]) {
        WriteBox.restoreDraft(cur.mbTo[0]);
      }
    });
  },
  getPeer: function () {
    var dd = cur.wdd['mail_box_dd'],
        sel = dd.selCount,
        peer = false;
    if (sel != 1) {
      return false;
    }
    for (peer in dd.selected)
      break;
    return intval(peer);
  },
  restoreDraft: function(needPeer) {
    var peer = WriteBox.getPeer();
    if (!peer || needPeer && peer != intval(needPeer) || browser.mobile || !cur.mbMedia) return;

    var draft = ls.get('im_draft' + vk.id + '_' + peer);
    if (draft) {
      if (!WriteBox.editableHasVal(cur.mbField)) {
        if (cur.mbEditable) {
          val(cur.mbField, WriteBox.emojiToHTML(clean(draft.txt || ''), true).replace(/\n/g, '<br/>'));
        } else {
          val(cur.mbField, draft.txt || '');
        }
      }
      if ((draft.medias || []).length && !(cur.mbMedia.chosenMedias || []).length) {
        var m = [];
        for (var i in draft.medias) {
          if (!draft.medias[i]) continue;
          m.push(draft.medias[i].slice(0, 2).join(','));
        }
        ajax.post('al_im.php', {act: 'draft_medias', media: m.join('*')}, {onDone: function(resp) {
          if (!cur.mbField || WriteBox.getPeer() != peer || !(resp || []).length) return;
          each(resp, function() {
            var args = [this[0], this[1], this[2], this[3], true];
            cur.mbMedia.chooseMedia.apply(cur.mbMedia, args);
          });
        }});
      }
    }
    WriteBox.checkEditable(cur.mbField);
    WriteBox.checkLen(cur.mbField);
  },
  saveDraft: function() {
    var peer = WriteBox.getPeer();
    if (!peer) return;

    var data = {
      txt: trim(WriteBox.editableVal(cur.mbField)),
      medias: []
    }, m = cur.mbMedia.getMedias();
    for (var i = 0, l = m.length; i < l; ++i) {
      if (m[i]) data.medias.push([m[i][0], m[i][1]]);
    }
    if (!data.medias.length && !data.txt.length) {
      data = false;
    };
    ls.set('im_draft' + vk.id + '_' + intval(peer), data);
  },
  toFull: function(ev, peer) {
    if (checkEvent(ev)) return;

    val('mail_box_to_full', '<div class="progress" style="display: block"></div>');
    var query = {'0': 'im', sel: peer};
    var msg = trim(WriteBox.editableVal(cur.mbField));
    if (msg) {
      query.message = msg;
    }
    if (cur.mbMedia.chosenMedias) {
      var meds = cur.mbMedia.getMedias(), media = [];
      for (var i = 0, l = meds.length; i < l; ++i) {
        var el = meds[i], row = [];
        for (var k in el) {
          if (typeof(el[k]) != 'object') {
            row.push(el[k]);
          }
        }
        media.push(row.join(','))
      }
      query.media = media.join('*');
    }
    nav.go(query, null, {noframe: 1});
    return false;
  },

  showToFull: function() {
    hide('mail_box_to_full');
    var mid = false, dd = cur.wdd && cur.wdd['mail_box_dd'], sex = 0, text = '', sel;
    for (var i in dd.selected) {
      sel = dd.selected[i];
      if (mid) return;
      mid = sel[0];
      if (mid != intval(mid)) return;
      sex = sel[6];
      text = sel[7];
    }
    if (mid > 2e9) {
      val('mail_box_to_full', '<a href="/im?sel=c' + (mid - 2e9) + '" onclick="return WriteBox.toFull(event, ' + mid + ')">' + getLang('mail_im_to_multidialog') + '</a>');
      show('mail_box_to_full');
    } else {
      if (!mid || !sex || !text) return;
      val('mail_box_to_full', ('<a href="/im?sel=' + mid + '" onclick="return WriteBox.toFull(event, ' + mid + ')">' + getLang('mail_go_to_dialog') + '</a>').replace('%s', text));
      show('mail_box_to_full');
    }
  },
  send: function(sure) {
    if (buttonLocked('mail_box_send')) return;

    var text = trim(WriteBox.editableVal(cur.mbField)), media = cur.mbMedia.getMedias(), dd = cur.wdd && cur.wdd['mail_box_dd'];
    if (!dd || !dd.selCount) return elfocus('mail_box_inp');

    if (cur.mbEditable) {
      WriteBox.extractEmoji();
    }

    var params = {
      act: 'a_send',
      chas: cur.mbHash,
      message: text,
      title: (isVisible('mail_box_title_wrap') && val('mail_box_title') || ''),
      from: 'box',
      media: [],
      to_ids: []
    };
    for (var i = 0, l = media.length, v; i < l; ++i) {
      if (v = media[i]) {
        params.media.push(v[0] + ':' + v[1]);
      }
    }
    params.media = params.media.join(',');

    if (!text && !params.media) {
      return cur.mbEditable ? WriteBox.editableFocus(cur.mbField) : elfocus(cur.mbField);
    }

    for (var i in dd.selected) {
      params.to_ids.push(i.replace(/_$/, ''));
    }
    params.to_ids = params.to_ids.join(',');

    if (cur.mbBannedHim == params.to_ids && sure !== true) {
      showBox('al_profile.php', {act: 'banned_him', action: 'mail', mid: cur.oid}).onContinue = WriteBox.send.pbind(true);
      return;
    }

    ajax.post('al_mail.php', params, {onDone: function(text, peer) {
      if (peer) {
        ls.set('im_draft' + vk.id + '_' + peer, false);
      }
      curBox().hide();
      showDoneBox(text);
    }, showProgress: lockButton.pbind('mail_box_send'), hideProgress: unlockButton.pbind('mail_box_send')});
  },
  checkLen: function(inp) {
    cur.mbTxtInp.value = WriteBox.editableVal(inp);
    checkTextLength(4096, cur.mbTxtInp, 'mail_box_warn');
    var dd = cur.wdd && cur.wdd['mail_box_dd'], mchat = dd.full && (dd.selCount == 1);
    if (!dd) return;
    toggle('mail_box_title_wrap', (cur.mbTxtInp.lastLen > 200 && !mchat || dd.selCount > 1 || val('mail_box_title')));
  },

  codeToChr: function(code) {
    var len = code.length / 4;
    var chr = '';
    var i = 0;
    while(len--) {
      chr += String.fromCharCode(parseInt(code.substr(i, 4), 16))
      i += 4;
    }
    return chr;
  },
  editableHasVal: function(cont) {
    if (!cont) return false;
    if (cont.tagName == 'TEXTAREA') return !!val(cont);
    return !!(geByTag1('IMG', cont) || stripHTML(val(cont)).replace(/[\s\xa0]/g, '').length);
  },
  editableVal: function(cont, opts) {
    if (!cont) return '';
    if (cont.tagName == 'TEXTAREA') return val(cont);
    var el = cont.firstChild;
    var v = '';
    while (el) {
      switch (el.nodeType) {
        case 3:
          var str = el.data.replace(/^\n|\n$/g, ' ').replace(/[\n\xa0]/g, ' ').replace(/[ ]+/g, ' ');
          v += str;
          break;
        case 1:
          var str = WriteBox.editableVal(el);
          if ((el.tagName == 'DIV' || el.tagName == 'P') && str) {
            if (str.substr(-1) != '\n') {
              str = str+'\n';
            }

            var prev = el.previousSibling;
            while(prev && prev.nodeType == 3 && trim(prev.nodeValue) == '') {
              prev = prev.previousSibling;
            }
            if (prev && prev.tagName != 'DIV' && prev.tagName != 'P' && prev.tagName != 'BR') {
              str = '\n' + str;
            }

          } else if (el.tagName == 'IMG') {
            var code = el.getAttribute('emoji');
            if (code) {
              if (opts && opts.saveEmoji) {
                str += WriteBox.getEmojiHTML(code);
              } else {
                str += WriteBox.codeToChr(code);
              }
            }
          } else if (el.tagName == 'BR') {
            str += '\n';
          }
          v += str;
          break;
      }
      el = el.nextSibling;
    }
    return v;
  },
  checkEditable: function() {
    if (!cur.mbEditable) return;
    var diff = (cur.mbField.scrollHeight > cur.mbField.offsetHeight) ? sbWidth() : 0;
    var bl = ge('mbe_emoji_block');
    setStyle(ge('mbe_smile'), vk.rtl ? {marginRight: 425 - diff} : {marginLeft: 425 - diff});
    if (bl) setStyle(bl, vk.rtl ? {marginRight: 335 - diff} : {marginLeft: 335 - diff});
  },
  onEditablePaste: function() {
    setTimeout(function(){
      WriteBox.cleanCont(cur.mbField);
    }, 0);
    WriteBox.checkEditable();
  },
  cleanCont: function(cont) {
    var el = cont.firstChild;
    while (el) {
      var next = el.nextSibling;
      switch (el.nodeType) {
        case 1:
          if (el.tagName == 'DIV' || el.tagName == 'P') {
            el.setAttribute('style', '');
            el.className = '';
            el.id = '';
            WriteBox.cleanCont(el);
          } else if (el.tagName == 'IMG') {
            if (!el.getAttribute('emoji')) {
              re(el);
            }
          } else if (el.tagName != 'BR') {
            var text = WriteBox.editableVal(el, {saveEmoji: true});
            var f = cf(clean(text).replace(/\n/g, '<br/>'));
            var last = f.lastChild;
            el.parentNode.replaceChild(f, el);
            if (last) {
              WriteBox.editableFocus(cont, last, true);
            }
          }
          break;
      }
      el = next;
    }
  },
  editableFocus: function(editable, obj, after) {
    if (!editable) {
      return false;
    }
    editable.focus();
    if (editable.phonfocus) {
      editable.phonfocus();
    }
    if (typeof window.getSelection != 'undefined' && typeof document.createRange != 'undefined') {
      var sel = window.getSelection();
      if (browser.opera && !after) {
        sel.collapse(obj || editable, 0);
      } else {
        var range = document.createRange();
        if (obj) {
          range.selectNode(obj);
        } else {
          range.selectNodeContents(editable);
        }
        range.collapse(after ? false : true);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else if (typeof document.body.createTextRange != 'undefined') {
      var textRange = document.body.createTextRange();
      textRange.moveToElementText(obj || editable);
      textRange.collapse(after ? false : true);
      textRange.select();
    }
  },
  curEmojiSet: ['D83DDE0A', 'D83DDE03', 'D83DDE09', 'D83DDE06', 'D83DDE1C', 'D83DDE0B', 'D83DDE0D', 'D83DDE0E', 'D83DDE12', 'D83DDE0F', 'D83DDE14', 'D83DDE22', 'D83DDE2D', 'D83DDE29', 'D83DDE28', 'D83DDE10', 'D83DDE0C', 'D83DDE04', 'D83DDE07', 'D83DDE30', 'D83DDE32', 'D83DDE33', 'D83DDE37', 'D83DDE02', '2764', 'D83DDE1A', 'D83DDE15', 'D83DDE2F', 'D83DDE26', 'D83DDE35', 'D83DDE20',  'D83DDE21', 'D83DDE1D', 'D83DDE34', 'D83DDE18', 'D83DDE1F', 'D83DDE2C', 'D83DDE36', 'D83DDE2A', 'D83DDE2B', '263A', 'D83DDE00', 'D83DDE25', 'D83DDE1B', 'D83DDE16', 'D83DDE24', 'D83DDE23', 'D83DDE27', 'D83DDE11', 'D83DDE05', 'D83DDE2E', 'D83DDE1E', 'D83DDE19', 'D83DDE13', 'D83DDE01', 'D83DDE31', 'D83DDE08', 'D83DDC7F', 'D83DDC7D', 'D83DDC4D', 'D83DDC4E', '261D', '270C', 'D83DDC4C', 'D83DDC4F', 'D83DDC4A', '270B', 'D83DDE4F', 'D83DDC43', 'D83DDC46', 'D83DDC47', 'D83DDC48', 'D83DDCAA', 'D83DDC42', 'D83DDC8B', 'D83DDCA9', '2744', 'D83CDF4A', 'D83CDF77', 'D83CDF78', 'D83CDF85', 'D83DDCA6', 'D83DDC7A', 'D83DDC28', 'D83DDD1E', 'D83DDC79', '26BD', '26C5', 'D83CDF1F', 'D83CDF4C', 'D83CDF7A', 'D83CDF7B', 'D83CDF39', 'D83CDF45', 'D83CDF52', 'D83CDF81', 'D83CDF82', 'D83CDF84', 'D83CDFC1', 'D83CDFC6', 'D83DDC0E', 'D83DDC0F', 'D83DDC1C', 'D83DDC2B', 'D83DDC2E', 'D83DDC03', 'D83DDC3B', 'D83DDC3C', 'D83DDC05', 'D83DDC13', 'D83DDC18', 'D83DDC94', 'D83DDCAD', 'D83DDC36', 'D83DDC31', 'D83DDC37', 'D83DDC11', '23F3', '26BE', '26C4', '2600', 'D83CDF3A', 'D83CDF3B', 'D83CDF3C', 'D83CDF3D', 'D83CDF4B', 'D83CDF4D', 'D83CDF4E', 'D83CDF4F', 'D83CDF6D', 'D83CDF37', 'D83CDF38', 'D83CDF46', 'D83CDF49', 'D83CDF50', 'D83CDF51', 'D83CDF53', 'D83CDF54', 'D83CDF55', 'D83CDF56', 'D83CDF57', 'D83CDF69', 'D83CDF83', 'D83CDFAA', 'D83CDFB1', 'D83CDFB2', 'D83CDFB7', 'D83CDFB8', 'D83CDFBE', 'D83CDFC0', 'D83CDFE6', 'D83DDE38'],
  curEmojiKeys: {},
  cssEmoji: {
    'D83DDE0A': [0, ':-)'], 'D83DDE03': [1, ':-D'], 'D83DDE09': [2, ';-)'], 'D83DDE06': [3, 'xD'], 'D83DDE1C': [4, ';-P'], 'D83DDE0B': [5, ':-p'], 'D83DDE0D': [6, '8-)'], 'D83DDE0E': [7, 'B-)'], 'D83DDE12': [8, ':-('], 'D83DDE0F': [9, ':]'], 'D83DDE14': [10, '3('], 'D83DDE22': [11, ':\'('], 'D83DDE2D': [12, ':_('], 'D83DDE29': [13, ':(('], 'D83DDE28': [14, ':o'], 'D83DDE10': [15, ':|'], 'D83DDE0C': [16, '3-)'], 'D83DDE20': [17, '>('], 'D83DDE21': [18, '>(('], 'D83DDE07': [19, 'O:)'], 'D83DDE30': [20, ';o'], 'D83DDE33': [21, '8|'], 'D83DDE32': [22, '8o'], 'D83DDE37': [23, ':X'], 'D83DDE1A': [24, ':-*'], 'D83DDE08': [25, '}:)'], '2764': [26 , '<3'], 'D83DDC4D': [27, ':like:'], 'D83DDC4E': [28, ':dislike:'], '261D': [29, ':up:'], '270C': [30, ':v:'], 'D83DDC4C': [31, ':ok:']
  },
  imgEmoji: {'D83DDE15': 1, 'D83DDE1F': 1, 'D83DDE2E': 1, 'D83DDE34': 1},
  getEmojiHTML: function(code, symbol, enabled) {
    var editable = (browser.msie && intval(browser.version) > 8) ? ' contenteditable="false"' : '';
    if (WriteBox.cssEmoji[code] != undefined) {
      var num = -WriteBox.cssEmoji[code][0] * 17;
      return '<img'+editable+' src="/images/blank.gif" class="emoji emoji_css" style="background-position: 0px '+num+'px;" emoji="'+code+'" align="middle" />';
    } else {
      if (!WriteBox.imgEmoji[code] && symbol && !enabled) {
        return symbol;
      } else {
        return '<img class="emoji" emoji="'+code+'" align="middle" src="/images/emoji'+(window.devicePixelRatio >= 2 ? '_2x' : '')+'/'+code+'.png" />';
      }
    }
  },
  ttEmojiList: function() {
    var list = [];
    var ems = WriteBox.curEmojiSet;
    var recent = [];
    var recentList = {};

    for (var i in ems) {
      var code = ems[i];
      WriteBox.curEmojiKeys[code] = 1;
      var str = WriteBox.emojiWrapItem(code, i);
      list.push(str);
    }
    if (recent.length) {
      list.unshift.apply(list, recent);
    }
    var loadingEl = '<div align="center" id="mbe_emoji_progress"><span class="progress_inline progress_gray"></span></div>';
    return list.join('')+loadingEl;
  },
  emojiWrapItem: function(code, i) {
    var info = WriteBox.cssEmoji[code];
    if (info) {
      var titleStr = ' title="'+info[1]+'"';
    } else {
      var titleStr = '';
    }
    return '<a class="mbe_emoji_cont '+((code != '2764' && i && (i < 54)) ? 'mbe_emoji_smile_cont' : '')+'" '+titleStr+' onmousedown="WriteBox.addEmoji(\''+code+'\', this); return cancelEvent(event);" onmouseover="return WriteBox.emojiOver(this);"><div class="mbe_emoji_bg"></div><div class="mbe_emoji_shadow"></div>'+WriteBox.getEmojiHTML(code)+'</a>'
  },
  ttEmoji: function(obj, needHide, needShow) {
    if ((needHide && !cur.mbEmojiShown) || (needShow && cur.mbEmojiShown)) {
      return;
    }
    if (!obj) {
      obj = cur.mbSmile;
    }
    if (obj.tt && obj.tt.destroy) {
      obj.tt.destroy();
    }
    var tt = ge('mbe_emoji_block');
    if (!tt) {
      var tt = ce('div', {
        id: 'mbe_emoji_block',
        className: 'mbe_emoji_tt_wrap',
        innerHTML: '<div id="mbe_emoji_pointer"></div><a id="mbe_emoji_expand" onclick="WriteBox.emojiExpand(this);"><div class="mbe_emoji_expand_icon"></div></a><div class="mbe_emoji_expand_shadow"></div><div class="mbe_emoji_expand_locker"></div><div id="mbe_emoji_expand_shadow_top"></div><div id="mbe_emoji_list"><div id="mbe_emoji_scroll">'+WriteBox.ttEmojiList()+'</div></div>'
      }), controls = ge('mbe_emoji_wrap');
      controls.insertBefore(tt, domFC(controls));

      WriteBox.emojiOver(ge('mbe_emoji_scroll').firstChild);
    }
    clearTimeout(cur.mbttEmojiHide);
    if (cur.mbEmojiShown) {
      var toParams = {marginTop: -128, opacity: 0};
      if (WriteBox.cssAnimation()) {
        addClass(tt, 'mbe_emoji_animation');
        setStyle(tt, toParams);
        cur.mbttEmojiHide = setTimeout(function() {
          removeClass(tt, 'mbe_emoji_animation');
          hide(tt);
          cur._noEscHide = false;
        }, 1000);
      } else {
        setTimeout(function() {
          animate(tt, toParams, 200, function() {
            hide(tt);
          });
          cur._noEscHide = false;
        }, 10);
      }
      cur.mbEmojiShown = false;
      cur.mbEmojiFocused = false;
      cur.onMouseClick = false;
      addClass(obj, 'mbe_smile_animation');
      clearTimeout(cur.mbSmileAnim);
      cur.mbSmileAnim = setTimeout(removeClass.pbind(obj, 'mbe_smile_animation'), 1000);
      removeClass(obj, 'mbe_smile_on');
    } else {
      curBox().changed = true;
      cur._noEscHide = true;
      show(tt);
      var toParams = {marginTop: -118, opacity: 1};
      if (WriteBox.cssAnimation()) {
        addClass(tt, 'mbe_emoji_animation');
        setTimeout(setStyle.pbind(tt, toParams), 100);
      } else {
        setTimeout(function() {
          show(tt);
          animate(tt, toParams, 200);
        }, 10);
      }
      cur.mbEmojiShown = obj;
      cur.mbEmojiFocused = true;
      cur.onMouseClick = function(e) {
        var el = e.target;
        while(el) {
          if (el.id == 'mbe_emoji_wrap') {
            return false;
          }
          el = el.parentNode;
        }
        WriteBox.ttEmoji(false, true);
      }
      addClass(obj, 'mbe_smile_animation')
      clearTimeout(cur.mbSmileAnim);
      cur.mbSmileAnim = setTimeout(removeClass.pbind(obj, 'mbe_smile_animation'), 1000);
      addClass(obj, 'mbe_smile_on');
      if (cur.mbEmojiScroll && cur.mbEmojiExpanded) {
        cur.mbEmojiScroll.update(false, true);
      }
    }
    if (!cur.mbEmojiExpanded) {
      WriteBox.emojiExpand();
    }
  },

  emojiExpand: function() {
    var block = ge('mbe_emoji_block');
    var list = ge('mbe_emoji_list');
    if (WriteBox.cssAnimation()) {
      removeClass(block, 'mbe_emoji_animation')
    }
    addClass(block, 'mbe_emoji_expanded');

    if (cur.mbEmojiScroll) {
      cur.mbEmojiScroll.enable()
    } else {
      var topShown = false;
      var bottomShown = false;
      cur.mbEmojiScroll = new Scrollbar(list, {
        prefix: 'mb_e_',
        nomargin: true,
        global: true,
        nokeys: true,
        right: vk.rtl ? 'auto' : 10,
        left: !vk.rtl ? 'auto' : 10,
        scrollChange: function(top) {
          if (window.tooltips) {
            tooltips.destroyAll();
            cur.mbttScrollTime = new Date().getTime();
          }
          if (top && !topShown) {
            show('mbe_emoji_expand_shadow_top');
            topShown = true;
          } else if (!top && topShown) {
            topShown = false;
            hide('mbe_emoji_expand_shadow_top');
          }
          if (top > 10 && !cur.emojiMoreSt) {
            WriteBox.emojiLoadMore();
          }
          WriteBox.emojiOpera();
        },
        more: WriteBox.emojiShowMore
      });
    }
    cur.mbEmojiExpanded = true;
  },
  emojiShowMore: function() {
    if (cur.allEmojiCodes) {
      var code;
      var shown = 0;
      var cont = ge('mbe_emoji_scroll');
      var str = '';
      re('mbe_emoji_progress');
      while(code = cur.allEmojiCodes[cur.allEmojiId]) {
        cur.allEmojiId += 1;
        if (WriteBox.curEmojiKeys[code]) {
          continue;
        }
        str += WriteBox.emojiWrapItem(code);
        shown += 1;
        if (shown > 64) {
          break;
        }
      }
      if (str) {
        cont.appendChild(cf(str));
        cur.mbEmojiScroll.update(false, true)
      }
    } else {
      cur.onEmojiLoad = WriteBox.emojiShowMore;
    }
  },
  emojiLoadMore: function() {
    cur.emojiMoreSt = 1;
    ajax.post('im', {act: 'get_emoji_list'}, {
      onDone: function(codes) {
        cur.allEmojiId = 0;
        cur.allEmojiCodes = codes;
        if (cur.onEmojiLoad) {
          cur.onEmojiLoad();
        }
      }
    })
  },
  ttEmojiOver: function(obj) {
    animate(obj, {opacity: 1}, 200);
  },
  ttEmojiOut: function(obj) {
    animate(obj, {opacity: 0.7}, 200);
  },

  emojiOver: function(obj) {
    addClass(obj, 'mbe_emoji_over');
    if (cur.mbEmojiOvered && cur.mbEmojiOvered != obj) {
      removeClass(cur.mbEmojiOvered, 'mbe_emoji_over');
    }
    cur.mbEmojiOvered = obj;
    WriteBox.emojiOpera();
  },
  emojiOpera: function() { // fuck opera!
    if (browser.opera && !browser.mobile) {
      animate('mbe_emoji_block', {opacity: 0.99}, 20, animate.pbind('mbe_emoji_block', {opacity: 1}, 20));
    }
  },
  addEmoji: function(code, obj) {
    cur.mbEmojiFocused = false;
    if (cur.mbEditable) {
      if (browser.mozilla || browser.msie) {
        var img = ' '+WriteBox.getEmojiHTML(code)+'&nbsp;';
      } else {
        var img = ' '+WriteBox.getEmojiHTML(code)+'&nbsp;';
      }
      var editable = cur.mbField;
      var sel = window.getSelection ? window.getSelection() : false;
      if (sel && sel.rangeCount) {
        r = sel.getRangeAt(0);
        if (r.commonAncestorContainer) {
          var rCont = r.commonAncestorContainer;
        } else {
          var rCont = r.parentElement ? r.parentElement() : r.item(0);
        }
      } else {
        var rCont = false;
      }
      el = rCont;
      while(el && el != editable) {
        el = el.parentNode;
      }
      var edLast = (editable.lastChild || {});
      if (browser.mozilla && edLast.tagName == 'BR' && !edLast.previousSibling) {
        re(editable.lastChild);
      }
      if (!el) {
        WriteBox.editableFocus(editable, false, true);
      }
      if (browser.msie) {
        var r = document.selection.createRange();
        if (r.pasteHTML) {
          r.pasteHTML(img);
        }
      } else {
        document.execCommand('insertHTML', false, img);
      }
      var emojies = geByClass('emoji', editable);
      for (i in emojies) {
        var prev = emojies[i].previousSibling;
        if (prev && prev.nodeType == 3 && prev.textContent && prev.textContent.charCodeAt(0) == 32) {
          var p = prev.previousSibling;
          if (p && p.nodeType == 3 && p.textContent && p.textContent.charCodeAt(p.textContent.length - 1) == 160) {
            re(prev);
          }
        }
      }
      if (editable.check) editable.check();
    } else {
      var textArea = cur.mbField;
      var val = textArea.value;
      if (browser.iphone || browser.ipad) {
        var text = WriteBox.codeToChr(code);
      } else {
        var text = WriteBox.cssEmoji[code][1]+' ';
      }
      var endIndex, range;
      if (textArea.selectionStart != undefined && textArea.selectionEnd != undefined) {
        endIndex = textArea.selectionEnd;
        textArea.value = val.slice(0, textArea.selectionStart) + text + val.slice(endIndex);
        textArea.selectionStart = textArea.selectionEnd = endIndex + text.length;
      } else if (typeof document.selection != 'undefined' && typeof document.selection.createRange != 'undefined') {
        textArea.focus();
        range = document.selection.createRange();
        range.text = text;
        range.select();
      }
    }
    WriteBox.saveDraft();
  },
  emojiToHTML: function(str, enabled) {
    if (browser.ipad || browser.iphone) {
      return str;
    }
    str = str.replace(/&nbsp;/g, ' ').replace(/<br>/g, "\n");
    var regs = {
      'D83DDE07': /(\s|^)([0OÎ]:\))([\s\.,]|$)/g,
      'D83DDE09': /(\s|^)(;-\)+)([\s\.,]|$)/g,
      'D83DDE06': /(\s|^)([XÕxõ]-?D)([\s\.,]|$)/g,
      'D83DDE0E': /(\s|^)(B-\))([\s\.,]|$)/g,
      'D83DDE0C': /(\s|^)(3-\))([\s\.,]|$)/g,
      'D83DDE20': /(\s|^)(&gt;\()([\s\.,]|$)/g,
      'D83DDE30': /(\s|^)(;[oîOÎ])([\s\.,]|$)/g,
      'D83DDE33': /(\s|^)(8\|)([\s\.,]|$)/g,
      'D83DDE32': /(\s|^)(8-?[oîOÎ])([\s\.,]|$)/g,
      'D83DDE0D': /(\s|^)(8-\))([\s\.,]|$)/g,
      'D83DDE37': /(\s|^)(:[XÕ])([\s\.,]|$)/g,
      'D83DDE28': /(\s|^)(:[oîOÎ])([\s\.,]|$)/g,
      '2764': /(\s|^)(&lt;3)([\s\.,]|$)/g
    };
    for (var code in regs) {
      str = str.replace(regs[code], function(match, pre, smile, space) {
        return (pre || '') + WriteBox.getEmojiHTML(code)+(space || '');
      });
    }
    var regs = {
      'D83DDE0A': /(:-\))([\s\.,]|$)/g,
      'D83DDE03': /(:-D)([\s\.,]|$)/g,
      'D83DDE1C': /(;-[PÐ])([\s\.,]|$)/g,
      'D83DDE0B': /(:-[pð])([\s\.,]|$)/g,
      'D83DDE12': /(:-\()([\s\.,]|$)/g,
      'D83DDE0F': /(:-?\])([\s\.,]|$)/g,
      'D83DDE14': /(3-?\()([\s\.,]|$)/g,
      'D83DDE22': /(:&#039;\()([\s\.,]|$)/g,
      'D83DDE2D': /(:_\()([\s\.,]|$)/g,
      'D83DDE29': /(:\(\()([\s\.,]|$)/g,
      //'D83DDE15': /(:\\)([\s\.,]|$)/g,
      'D83DDE10': /(:\|)([\s\.,]|$)/g,
      'D83DDE21': /(&gt;\(\()([\s\.,]|$)/g,
      'D83DDE1A': /(:-\*)([\s\.,]|$)/g,
      'D83DDE08': /(\}:\))([\s\.,]|$)/g,
      'D83DDC4D': /(:like:)([\s\.,]|$)/g,
      'D83DDC4E': /(:dislike:)([\s\.,]|$)/g,
      '261D': /(:up:)([\s\.,]|$)/g,
      '270C': /(:v:)([\s\.,]|$)/g,
      'D83DDC4C': /(:ok:|:îê:)([\s\.,]|$)/g
    };
    for (var code in regs) {
      str = str.replace(regs[code], function(match, smile, space) {
        return WriteBox.getEmojiHTML(code)+(space || '');
      });
    }
    str = str.replace(/\n/g, '<br>');
    str = str.replace(/([\uE000-\uF8FF\u270A-\u2764\u2122\u25C0\u25FB-\u25FE\u263a\u2648-\u2653\u2660-\u2668\u267B\u267F\u2693\u261d\u26A0-\u26FA]|\uD83C[\uDD00-\uDFFF]|[\u2600\u26C4\u26BE\u23F3\u2764]|\uD83D[\uDC00-\uDFFF]|\uD83C[\uDDE8-\uDDFA]\uD83C[\uDDEA-\uDDFA])/g, WriteBox.emojiReplace);

    return str;
  },
  emojiReplace: function (symbol) {
    var i = 0;
    var code = '', num;
    while(num = symbol.charCodeAt(i++)) {
      code += num.toString(16);
    }
    if (symbol.match(/[\uDDE7-\uDDFA]/)) {
      if (cur.mbFlagSymbol) {
        code = cur.mbFlagSymbol + code;
        cur.mbFlagSymbol = false;
      } else {
        cur.mbFlagSymbol = code;
        return '';
      }
    }
    code = code.toUpperCase();
    return WriteBox.getEmojiHTML(code, symbol, cur.mbEmoji);
  },

  cssAnimation: function() {
    var v = intval(browser.version);
    if ((browser.chrome && v > 14) || (browser.mozilla && v > 13) || (browser.opera && v > 2)) {
      return true;
    }
    return false;
  },


  onKey: function (e) {
    var inputActive = (e.target.tagName == 'INPUT' || e.target.tagName == 'TEXTAREA' || e.target.id == 'mail_box_editable');

    if (e.keyCode == KEY.UP || e.keyCode == KEY.DOWN) {
      if (!WriteBox.emojiMove(e)) {
        return false;
      }
    } else if (e.keyCode > 40 && !e.ctrlKey && !e.metaKey && !inputActive) {
      if (cur.mbEditable) {
        WriteBox.editableFocus(cur.mbField, false, true);
      } else {
        var el = cur.mbField;
        !el.active && elfocus(el);
      }
    } else if (e.keyCode == 9 && !e.ctrlKey) {
      if (e.target.id == 'mail_box_editable' && !cur.mbEmojiShown) {
        WriteBox.ttEmoji(cur.mbSmile, false, true);
        cur.mbEmojiFocused = true;
        return cancelEvent(e);
      } else if (cur.mbEmojiShown) {
        WriteBox.editableFocus(cur.mbField, false, true);
        WriteBox.ttEmoji(cur.mbSmile, true);
        return cancelEvent(e);
      }
    } else if (e.keyCode == KEY.LEFT || e.keyCode == KEY.RIGHT) {
      if (!WriteBox.emojiMove(e)) {
        return false;
      }
    } else if (e.keyCode == KEY.ESC) {
      if (cur.mbEmojiShown) {
        WriteBox.editableFocus(cur.mbField, false, true);
        WriteBox.ttEmoji(cur.mbSmile, true);
        cur.mbEmojiFocused = false;
      }
    } else if (e.keyCode == KEY.ENTER) {
      if (!WriteBox.emojiEnter(e)) {
        return false;
      }
    }
    return true;
  },
  emojiEnter: function(e) {
    if (cur.mbEmojiFocused && cur.mbEmojiOvered) {
      var img = geByTag1('img', cur.mbEmojiOvered);
      WriteBox.addEmoji(img.getAttribute('emoji'), cur.mbEmojiOvered);
      cur.mbEmojiFocused = true;
      WriteBox.ttEmoji(cur.mbSmile, true);
      return cancelEvent(e);
    }
    return true;
  },
  emojiMove: function(e) {
    if (cur.mbEmojiShown && cur.mbEmojiFocused) {
      var el = cur.mbEmojiOvered;
      switch (e.keyCode) {
        case KEY.LEFT:
          el = el.previousSibling;
          break;
        case KEY.RIGHT:
          el = el.nextSibling;
          break;
        case KEY.UP:
          var i = 9;
          while (el.previousSibling && --i > 0) {
            el = el.previousSibling;
          }
          if (i > 1) {
            return cancelEvent(e);
          }
          break;
        case KEY.DOWN:
          var i = 9;
          while (el.nextSibling && --i > 0) {
            el = el.nextSibling;
          }
          if (i > 1) {
            return cancelEvent(e);
          }
          break;
      }
      if (el) {
        if (!cur.mbEmojiList) {
          cur.mbEmojiList = ge('mbe_emoji_list')
        }
        var diff = el.offsetTop - cur.mbEmojiList.scrollTop;
        debugLog('offset', diff);
        if (diff > 72) {
          animate(cur.mbEmojiList, {scrollTop: cur.mbEmojiList.scrollTop + (diff - 72)}, 80, function() {
            cur.mbEmojiScroll.update(true, true)
          });
        } else if (diff < 0) {
          animate(cur.mbEmojiList, {scrollTop: cur.mbEmojiList.scrollTop + diff}, 80, function() {
            cur.mbEmojiScroll.update(true, true)
          });
        }
        WriteBox.emojiOver(el);
      }
      return cancelEvent(e);
    }
    return true;
  },

  extractEmoji: function() {
    var emjs = geByClass('emoji', cur.mbField);
    var newRc = {};
    for(var i in emjs) {
      newRc[emjs[i].getAttribute('emoji')] = 1;
    }
    var rcCont = ge('mbe_rcemoji');
    var rchtml = '';
    var ml = 0;
    for (var code in newRc) {
      if (ge('mbe_rc_em_'+code)) continue;
      rchtml += '<a id="mbe_rc_em_'+code+'" class="mbe_rc_emojibtn" onmousedown="WriteBox.addEmoji(\''+code+'\', this); return cancelEvent(event);">'+WriteBox.getEmojiHTML(code, false, true)+'</a>';
      ml -= 22;
    }
    cur.mbRcntEmoji = (rchtml + val(rcCont)).split('a><a').slice(0, 7).join('a><a');
    if (cur.mbRcntEmoji.match(/<\/$/)) cur.mbRcntEmoji += 'a>';
    rcCont.insertBefore(cf(rchtml), rcCont.firstChild);
    setStyle(rcCont, {marginLeft: ml});
    animate(rcCont, {marginLeft: 0}, {duration: 150, transition: Fx.Transitions.easeOutCubic, onComplete: function() {
      var emjs = geByClass('mbe_rc_emojibtn', rcCont).slice(7);
      for(var i in emjs) {
        re(emjs[i]);
      }
    }});
  }

}

try{stManager.done('writebox.js');}catch(e){}
