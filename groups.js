var Groups = {
  init: function(opts) {
    extend(cur, {
      module: 'groups',
      hideOther: Groups.hideOther,
      otherActs: Groups.otherActs,
      options: opts,
      oid: -opts.group_id,
      postTo: -opts.group_id,
      _back: {loc: opts.loc, show: [], hide: [], text: opts.back}
    });
    if (ge('group_wall')) {
      wall.init(extend(opts, {automore: 1}));
    }
    if (ge('privacy_edit_voting_action')) {
      cur.onPrivacyChanged = Groups.votingAction;
    }
  },
  toggleFave: function(btn, hash, act, ev) {
    if (cur.toggleFaveAct != undefined) {
      act = cur.toggleFaveAct;
    }
    ajax.post('fave.php', {act: act ? 'a_add_group' : 'a_delete_group', gid: -cur.oid, hash: hash}, {onDone: function(text) {
      btn.firstChild.nextSibling.innerHTML = text;
      cur.toggleFaveAct = !act;
    }, progress: btn.firstChild});
    cancelEvent(ev);
  },

  showInviteBox: function(ev, gid) {
    return !showBox('al_page.php', {act: 'a_invite_box', gid: gid}, {params: {bodyStyle: 'padding: 0px;', width:460}}, ev);
  },

  votingUpdate: function(html, js) {
    var mod = ge('group_voting');
    mod.parentNode.replaceChild(ce('div', {innerHTML: html}).firstChild, mod);
    if (js) eval(js);
  },
  vote: function(el, oid, vid, option) {
    var pr = hasClass(el.firstChild, 'progress') ? el.firstChild : el.insertBefore(ce('span', {className: 'fl_r progress'}), el.firstChild);
    ajax.post('al_voting.php', {
      act: 'vote',
      option_id: option,
      owner_id: oid,
      voting_id: vid,
      hash: cur.polls[vid].hash
    }, {onDone: Groups.votingUpdate, progress: pr});
  },
  votingAction: function(key) {
    ge('privacy_edit_voting_action').innerHTML = getLang('voting_settings');
    var act = intval(cur.privacy[key][0]);
    cur.privacy[key] = [0, 0, []];
    Groups.votingActionPerform(act);
  },
  votingActionPerform: function(act, sure) {
    var state = 0;
    switch (act) {
      case 101: act = 'openclose'; state = 0; break;
      case 102: act = 'openclose'; state = 1; break;
      case 103: act = 'tomain';    state = 0; break;
      case 104: act = 'tomain';    state = 1; break;
    }
    ajax.post('al_voting.php', {
      act: act,
      owner_id: cur._voting.oid,
      voting_id: cur._voting.vid,
      state: state,
      context: 'group',
      hash: cur._voting.hash
    }, {onDone: Groups.votingUpdate, showProgress: function() {
      hide('privacy_edit_voting_action');
      show('group_voting_progress');
    }, onHideProgress: function() {
      hide('group_voting_progress');
      show('privacy_edit_voting_action');
    }});
  },

  shareGroup: function(gid, hash) {
    hide('group_share_link');
    ajax.post('al_groups.php', {act: 'share', gid: gid, hash: hash}, {onDone: function(text) {
      ge('group_like_module').innerHTML = text;
    }, showProgress: function() {
      hide('group_share_link');
      show('group_share_progress');
    }, hideProgress: function() {
      hide('group_share_progress');
      show('group_share_link');
    }});
  },
  unshareGroup: function(gid, post_id, hash) {
    ajax.post('al_groups.php', {act: 'unshare', gid: gid, post_id: post_id, hash: hash}, {onDone: function(text) {
      ge('group_like_module').innerHTML = text;
    }, showProgress: function() {
      hide('group_unshare_link');
      show('group_unshare_progress');
    }, hideProgress: function() {
      hide('group_unshare_progress');
      show('group_unshare_link');
    }});
  },

  showLinks: function() {
    showBox('al_groups.php', {act: 'show_links', oid: cur.oid}, {params: {width: 467}});
  },
  showEvents: function() {
    showBox('al_groups.php', {act: 'show_events', oid: cur.oid}, {params: {width: 467}});
  },

  enter: function(el, gid, hash, context, callback) {
    var sp, hp;
    if (el.tagName.toLowerCase() == 'button') {
      sp = lockButton.pbind(el);
      hp = unlockButton.pbind(el);
    } else {
      if (el.firstChild && el.firstChild.className == 'progress') return;
      sp = function() {
        el.oldhtml = el.innerHTML;
        el.innerHTML = '<span class="progress" style="display: block"></span>';
      }
      hp = function() {
        el.innerHTML = el.oldhtml;
      }
    }
    ajax.post('al_groups.php', {act: 'enter', gid: gid, hash: hash, context: context}, {
      onDone: function(text, actions) {
        if (callback) {
          return callback();
        }
        ge('group_like_module').innerHTML = text;
        ge('page_actions').innerHTML = actions;
        (actions ? show : hide)('page_actions');
        nav.reload({noframe: true});
      },
      onFail: function(text) {
        if (text) {
          setTimeout(showFastBox(getLang('global_error'), text).hide, 3000);
          return true;
        }
      },
      showProgress: sp, hideProgress: hp
    });
  },
  confirm: function(key, el, gid, hash, context) {
    var box = showFastBox(getLang('global_warning'), getLang(key), getLang('group_leave'), function() {
      box.hide();
      Groups.leave(el, gid, hash, context);
    }, getLang('global_cancel'));
  },
  leave: function(el, gid, hash, context, onLeave) {
    var sp, hp;
    if (el.tagName.toLowerCase() == 'button') {
      sp = lockButton.pbind(el);
      hp = unlockButton.pbind(el);
    } else {
      if (el.firstChild && el.firstChild.className == 'progress') return;
      sp = function() {
        el.oldhtml = el.innerHTML;
        el.innerHTML = '<span class="progress" style="display: block"></span>';
      }
      hp = function() {
        el.innerHTML = el.oldhtml;
      }
    }
    ajax.post('al_groups.php', {act: 'leave', gid: gid, hash: hash, context: context}, {
      onDone: function(text, actions) {
        if (onLeave) return onLeave();
        ge('group_like_module').innerHTML = text;
        ge('page_actions').innerHTML = actions;
        (actions ? show : hide)('page_actions');
        nav.reload({noframe: true});
      },
      showProgress: sp, hideProgress: hp
    });
  },

  otherActs: function(el) {
    clearTimeout(cur.hideOtherTimer);
    if (!el) return false;
    el.blur();
    var acts = ge('page_other_acts');
    if (isVisible(acts)) {
      return false;
    }
    acts.style.marginLeft = '-1px';
    acts.style.marginTop = '-21px';
    show(acts);
    return false;
  },
  hideOther: function(timeout) {
    if (timeout > 0) {
      cur.hideOtherTimer = setTimeout(cur.hideOther, timeout);
    } else {
      var acts = ge('page_other_acts');
      if (timeout == -1) {
        hide(acts);
      } else {
        fadeOut(acts, 200);
      }
    }
  },

  toggleRss: function(obj, gid, hash, ev) {
    obj.innerHTML = '<img src="/images/upload.gif" />';
    ajax.post('al_groups.php', {act: 'a_toggle_rss', gid: gid, hash: hash}, {
      onDone: function(txt) {
        obj.innerHTML = txt;
      }
    });
  },
  toggleTop: function(obj, gid, hash, ev, nocis) {
    obj.innerHTML = '<img src="/images/upload.gif" />';
    ajax.post('al_groups.php', {act: 'a_toggle_top', gid: gid, hash: hash, nocis: nocis}, {
      onDone: function(txt) {
        obj.innerHTML = txt;
      }
    });
  },
  toggleBrand: function(obj, gid, hash, ev) {
    obj.innerHTML = '<img src="/images/upload.gif" />';
    ajax.post('al_groups.php', {act: 'a_toggle_brand', gid: gid, hash: hash}, {
      onDone: function(txt) {
        obj.innerHTML = txt;
      }
    });
  },
  toggleStickers: function(obj, gid, hash, ev) {
    obj.innerHTML = '<img src="/images/upload.gif" />';
    ajax.post('al_groups.php', {act: 'a_toggle_stickers', gid: gid, hash: hash}, {
      onDone: function(txt) {
        obj.innerHTML = txt;
      }
    });
  },

  showMapBox: function(place, zoom, link) {
    if (window.showZeroZoneBox && showZeroZoneBox('places', function() {
      events.showMapBox(place, zoom, link);
    })) { return; }

    showTabbedBox('places.php', {act: 'a_get_place_box', id: place}, {stat: ['places.css', 'map.css', 'maps.js', 'ui_controls.css', 'ui_controls.js']});
  },
  showAddressBox: function(country, address) {
    if (window.showZeroZoneBox && showZeroZoneBox('places', function() {
      events.showAddressBox(country, address);
    })) { return; }

    showBox('places.php', {act: 'a_get_address_box', country: country, address: address}, {stat: ['places.css', 'map.css', 'maps.js', 'ui_controls.css', 'ui_controls.js'], params: {width: 640, bodyStyle: 'padding:0;'}});
  }

}

try{stManager.done('groups.js');}catch(e){}
