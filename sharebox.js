var ShareBox = {
  mrg: function(v) {
    return vk.rtl ? {marginRight: v} : {marginLeft: v};
  },
  show: function(box, opts) {
    addClass(boxLayerBG, 'bg_dark');
    box.setOptions({hideButtons: true, width: 502, bodyStyle: 'padding: 0px; border: 0px;'});
    box.removeButtons();

    radioBtns['like_share'] = {
      els: [ge('like_share_my'), ge('like_share_club'), ge('like_share_mail')],
      val: opts.rbVal
    };
    each(radioBtns['like_share'].els, function(i, v) {
      if (hasClass(v, 'disabled')) {
        addClass(domNS(v), 'like_share_disabled');
        (geByTag1('input', domNS(v)) || {}).readOnly = true;
      }
    });

    cur.lang = extend(cur.lang || {}, opts.lang);
    extend(cur, {
      sbField: ge('like_share_text'),
      sbAva: ge('dark_box_ava'),
      sbTo: [0],
      sbShareHash: opts.shHash,
      sbMailHash: opts.imHash,
      sbObj: opts.shObj,
      sbList: opts.shList || '',
      sbSend: function() {
        if (buttonLocked('like_share_send')) return;

        var v = radioBtns['like_share'].val, to = 0, msg = trim(val(cur.sbField));
        switch (v) {
        case 1:
          var dd = cur.wdd && cur.wdd['like_club_dd'];
          if (!dd || !dd.selCount) return elfocus('like_club_inp');
          for (var i in dd.selected) {
            to = intval(i.replace(/_$/, ''));
          }
        case 0:
          var params = {
            act: 'a_do_publish',
            message: msg,
            from: 'box',
            to: to,
            hash: cur.sbShareHash,
            object: cur.sbObj,
            list: cur.sbList
          }
          ajax.post('like.php', params, ShareBox.options());
        break;

        case 2:
          var dd = cur.wdd && cur.wdd['like_mail_dd'], params = {
            act: 'a_send',
            message: msg,
            from: 'box',
            to_ids: [],
            chas: cur.sbMailHash,
            ajax: 1,
            title: (isVisible('like_share_title_wrap') && val('like_share_title') || ''),
            media: cur.sbObj + (cur.sbList ? ('/' + cur.sbList) : '')
          }
          if (!dd || !dd.selCount) return elfocus('like_mail_inp');

          for (var i in dd.selected) {
            params.to_ids.push(i.replace(/_$/, ''));
          }
          params.to_ids = params.to_ids.join(',');
          ajax.post('al_mail.php', params, ShareBox.options());
        break;
        }
      },
      sbCheckLen: function(inp) {
        checkTextLength(4096, inp, 'like_share_warn');
        var dd = cur.wdd && cur.wdd['like_mail_dd'], mchat = dd && dd.full && (dd.selCount == 1);
        toggle('like_share_title_wrap', dd && (radioBtns['like_share'].val == 2) && (inp.lastLen > 200 && !mchat || dd.selCount > 1 || val('like_share_title')) ? true : false);
      }
    });

    cur.sbHidden = true;
    autosizeSetup(cur.sbField, {minHeight: 80})
    setTimeout(elfocus.pbind((opts.rbVal == 2) ? 'like_mail_inp' : (opts.rbVal ? 'like_club_inp' : cur.sbField)), 0);


    Wall.initComposer(cur.sbField, {
      lang: {
        introText: getLang('profile_mention_start_typing'),
        noResult: getLang('profile_mention_not_found')
      }
    });

    var tmp = cur.postTo;
    cur.postTo = false;
    box.setOptions({onHide: function() {
      removeClass(boxLayerBG, 'bg_dark');
    }, onShow: function() {
      addClass(boxLayerBG, 'bg_dark');
    }, onClean: function() {
      Wall.deinitComposer(cur.sbField);
      delete cur.sbField;
      cur.postTo = tmp;
      if (window.WideDropdown) {
        WideDropdown.deinit('like_club_dd');
        WideDropdown.deinit('like_mail_dd');
      }
    }});

    if (!window._mbFriends) { // is used in writebox.js too!
      ajax.post('hints.php', {act: 'a_json_friends', from: 'imwrite', str: ''}, {onDone: function(arr) {
        window._mbFriends = arr;
        var dd = (cur.wdd && cur.wdd['like_mail_dd']);
        if (dd) {
          WideDropdown.items('like_mail_dd', arr);
        }
      }});
    }
    if (!hasClass(ge('like_share_club'), 'disabled')) WideDropdown.init('like_club_dd', {
      defaultItems: opts.clubs,
      noResult: getLang('like_club_not_found'),
      img: cur.sbAva,
      introText: getLang('like_club_choose'),
      onChange: function(act) {
        radiobtn(ge('like_share_club'), 1, 'like_share');
        var dd = cur.wdd['like_club_dd'], sel = dd.selCount, peer = false, draft, ret = true;
        if (act == 1) { // added
          setTimeout(elfocus.pbind(cur.sbField), 0);
        }
        if (sel < 1 && !cur.sbHidden) {
          ShareBox.toggleAva(false);
          ret = 0;
        } else if (sel > 0 && cur.sbHidden) {
          ShareBox.toggleAva(true);
          ret = 1;
        }
        cur.sbCheckLen(cur.sbField);
        return ret;
      }
    });
    if (!hasClass(ge('like_share_mail'), 'disabled')) WideDropdown.init('like_mail_dd', {
      defaultItems: window._mbFriends,
      url: 'hints.php',
      params: {act: 'a_json_friends', from: 'imwrite'},
      noResult: getLang('mail_not_found'),
      img: cur.sbAva,
      introText: getLang('mail_choose_recipient'),
      custom: function(q) {
        return (q.indexOf('@') != -1) ? [[clean(q), clean(q), getLang('mail_enter_email_address'), '/images/pics/contact50.gif', 0, '']] : false;
      },
      chooseOnBlur: function(id) {
        id = trim(id + '');
        return id.length < 64 && id.match(/^[a-z0-9_\-\.]+@[a-z0-9_\-\.]+\.[a-z]{2,6}$/i);
      },
      onChange: function(act) {
        radiobtn(ge('like_share_mail'), 2, 'like_share');
        var dd = cur.wdd['like_mail_dd'], sel = dd.selCount, peer = false, draft, ret = true;
        if (act == 1) { // added
          setTimeout(elfocus.pbind(cur.sbField), 0);
        }
        if (sel < 1 && !cur.sbHidden) {
          ShareBox.toggleAva(false);
          ret = 0;
        } else if (sel > 0 && cur.sbHidden) {
          ShareBox.toggleAva(true);
          ret = 1;
        }
        cur.sbCheckLen(cur.sbField);
        return ret;
      },
      itemMark: function(item) {
        return intval(item[5]) ? 1 : 0;
      }
    });
  },
  toggleAva: function(vis) {
    var t = Fx.Transitions.easeOutCubic, d = 150, f = 'ease-out';
    if (vis) {
      show(cur.sbAva);
      cssAnim(cur.sbAva, extend({opacity: 1}, ShareBox.mrg(0)), {duration: d, transition: t, func: f});
      cssAnim(ge('dark_box_topic'), ShareBox.mrg(26), {duration: d, transition: t, func: f});
      cur.sbHidden = false;
      return 1;
    } else {
      cssAnim(cur.sbAva, extend({opacity: 0}, ShareBox.mrg(-26)), {duration: d, transition: t, func: f}, hide.pbind(cur.sbAva));
      cssAnim(ge('dark_box_topic'), ShareBox.mrg(0), {duration: d, transition: t, func: f});
      cur.sbHidden = true;
      return 0;
    }
  },
  rbChanged: function() {
    var v = radioBtns['like_share'].val;
    if (cur.lang.title_for_all) {
      val('dark_box_topic', cur.lang[(v < 2) ? 'title_for_all' : 'title_for_mail']);
    }
    switch (v) {
      case 0:
        if (!cur.sbHidden) {
          var t = Fx.Transitions.easeOutCubic, d = 150, f = 'ease-out';
          cssAnim(cur.sbAva, extend({opacity: 0}, ShareBox.mrg(-26)), {duration: d, transition: t, func: f}, hide.pbind(cur.sbAva));
          cssAnim(ge('dark_box_topic'), ShareBox.mrg(0), {duration: d, transition: t, func: f});
          cur.sbHidden = true;
        }
        elfocus(cur.sbField);
      break;

      case 1:
      case 2:
        var dd = (v == 1) ? 'like_club_dd' : 'like_mail_dd';
        cur.wdd[dd].selCount ? elfocus(cur.sbField) : WideDropdown.focus(dd);
        WideDropdown.updimgs(dd);
      break;
    }
  },
  options: function() {
    return {
      showProgress: lockButton.pbind('like_share_send'),
      hideProgress: unlockButton.pbind('like_share_send'),
      onDone: function(text, likeData) {
        curBox().hide();
        showDoneBox(text);
        if (window.Wall && isObject(likeData)) {
          Wall.likeFullUpdate(cur.sbObj, likeData);
        }
      }
    };
  }
}

try{stManager.done('sharebox.js');}catch(e){}
