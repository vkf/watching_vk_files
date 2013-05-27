var Profile = {
  showFull: function(uid, geolang) {
    if (!cur.vkLngCode) {
      cur.vkLngCode = geolang;
    }

    var lnk = ge('profile_full_link');
    if (lnk) {
      lnk.innerHTML = getLang('hide_full');
      lnk.onclick = Profile.hideFull;
    }
    ge('profile_short').innerHTML = cur.options.info[1];
    show('profile_full_info');
    if (ge('profile_map')) {
      if (!window.google) {
        headNode.appendChild(ce('script', {
          type: 'text/javascript',
          src: (window.locProtocol || 'http:') + '//maps.google.com/maps/api/js?sensor=false&callback=gMapsInit&language='+(cur.vkLngCode || 'en')
        }));
        window.gMapsInit = function() {}
      }
      var params = {act: 'profile_map', uid: uid};
      if (nav.objLoc.as) {
        params.as = nav.objLoc.as;
      }
      ajax.post('al_places.php', params, {
        onDone: function(html, js) {
          if (html) {
            ge('profile_map').innerHTML = html;
            eval('(function () {' + js + '})();');
          } else {
            re('profile_map');
          }
        },
        stat: ['places.js']
      });
    }
  },
  hideFull: function() {
    var lnk = ge('profile_full_link');
    if (lnk) {
      lnk.innerHTML = getLang('show_full');
      lnk.onclick = Profile.showFull;
    }
    ge('profile_short').innerHTML = cur.options.info[0];
    hide('profile_full_info', 'profile_class_hint');
  },
  showGroups: function(e) {
    if (checkEvent(e) !== false) return;
    var lnk = ge('profile_groups_link');
    lnk.oldText = val(lnk);
    ajax.post('al_profile.php', {act: 'groups', id: cur.oid}, {onDone: function(label, text) {
      if (text) {
        val(lnk, label);
        lnk.onclick = Profile.hideGroups;
        var pag = ge('profile_all_groups');
        val(pag, text);
        show(pag.parentNode);
      } else {
        hide(lnk);
      }
    }, showProgress: function() {
      val(lnk, '<div class="progress" id="profile_groups_prg"></div>');
    }, hideProgress: function() {
      val(lnk, lnk.oldText);
    }, cache: 1});
    return cancelEvent(e);
  },
  hideGroups: function(e) {
    if (checkEvent(e) !== false) return;
    var lnk = ge('profile_groups_link');
    val(lnk, lnk.oldText);
    lnk.onclick = Profile.showGroups;
    hide(ge('profile_all_groups').parentNode);
    return cancelEvent(e);
  },
  photoRemoveTip: function(lnk) {
    if (!((cur || {}).lang || {}).profile_photo_hide) return;
    showTooltip(lnk, {
      text: getLang('profile_photo_hide'),
      shift: [13, 1, 1],
      black: 1
    });
  },
  photoRemove: function(lnk, photo_id, ev) {
    if (cur.viewAsBox) {
      cur.viewAsBox();
      return cancelEvent(ev);
    }
    if (!cur.hidingPh) cur.hidingPh = {};
    if (cur.hidingPh[photo_id]) return cancelEvent(ev);

    ajax.post('al_profile.php', {act: 'remove_photo', photo_id: photo_id, hash: cur.options.profph_hash}, {
      onDone: function(about, photos) {
        val(ge('profile_photos_about') || ge('profile_photos_module').appendChild(ce('div', {className: 'msg', id: 'profile_photos_about'})), about);
        each(geByClass('profile_photo_hide_wrap', ge('profile_photos')), function() {
          if (this.tt && this.tt.destroy) {
            this.tt.destroy();
          }
        });
        val('profile_photos', photos);
        if (!photos) {
          hide('profile_photos_module');
        }
      },
      showProgress: function() {
        cur.hidingPh[photo_id] = 1;
      },
      hideProgress: function() {
        cur.hidingPh[photo_id] = 0;
      }
    });
    return cancelEvent(ev);
  },
  photoReturn: function(lnk, photo_id) {
    if (cur.viewAsBox) return cur.viewAsBox();

    ajax.post('al_profile.php', {act: 'return_photo', photo_id: photo_id, hash: cur.options.profph_hash}, {
      onDone: function(photos) {
        each(geByClass('profile_photo_hide_wrap', ge('profile_photos')), function() {
          if (this.tt && this.tt.destroy) {
            this.tt.destroy();
          }
        });
        val('profile_photos', photos);
        re('profile_photos_about');
      },
      showProgress: function() {
        hide(lnk);
        lnk.nextSibling.style.display = 'inline';
      },
      hideProgress: function() {
        hide(lnk.nextSibling);
        show(lnk);
      }
    });
  },

  otherActs: function(el) {
    clearTimeout(cur.hideOtherTimer);
    if (!el) return false;
    el.blur();
    var acts = ge('profile_other_acts');
    if (isVisible(acts)) {
      fadeIn(acts, 0);
      return false;
    }
    setTimeout(addEvent.pbind(document, 'click', Profile.hideOther), 1);
    acts.style.marginLeft = '-1px';
    acts.style.marginTop = '-21px';
    show(acts);
    return false;
  },
  hideOther: function(timeout) {
    if (timeout > 0) {
      cur.hideOtherTimer = setTimeout(Profile.hideOther.pbind(0), timeout);
      return;
    }
    var acts = ge('profile_other_acts');
    if (!acts) return;
    if (timeout == -1) {
      hide(acts);
    } else {
      fadeOut(acts, 200);
    }
    removeEvent(document, 'click', Profile.hideOther);
  },

  editPhoto: function(newph) {
    Profile.hideOther(-1);
    if (cur.viewAsBox) return cur.viewAsBox();

    showBox('/al_profile.php', extend(newph || {}, {act: 'edit_photo'}), {
      params: {bodyStyle: 'padding: 16px 7px'},
      stat: ['tagger.js', 'tagger.css']
    });
  },
  deletePhoto: function() {
    Profile.hideOther(-1);
    if (cur.viewAsBox) return cur.viewAsBox();

    showBox('al_profile.php', {act: 'delete_photo_box'});
  },

  setupSMS: function(hash) {
    Profile.hideOther(-1);
    if (cur.viewAsBox) return cur.viewAsBox();

    showBox('al_mobile.php', {act: 'configure_sms_notifications', mid: cur.oid, hash: hash});
  },
  toggleFan: function(btn, hash, act, ev) {
    if (cur.viewAsBox) {
      Profile.hideOther(-1);
      return cur.viewAsBox();
    }

    if (cur.toggleFanAct != undefined) {
      act = cur.toggleFanAct;
    }
    ajax.post('al_fans.php', {act: act ? 'be_fan' : 'not_fan', mid: cur.oid, hash: hash}, {onDone: function(text) {
      btn.firstChild.nextSibling.innerHTML = text;
      cur.toggleFanAct = !act;
    }, progress: btn.firstChild});
    cancelEvent(ev);
  },
  toggleFave: function(btn, hash, act, ev) {
    if (cur.viewAsBox) {
      Profile.hideOther(-1);
      return cur.viewAsBox();
    }

    if (cur.toggleFaveAct != undefined) {
      act = cur.toggleFaveAct;
    }
    ajax.post('fave.php', {act: act ? 'addPerson' : 'deletePerson', mid: cur.oid, hash: hash}, {onDone: function(text) {
      btn.firstChild.nextSibling.innerHTML = text;
      cur.toggleFaveAct = !act;
    }, progress: btn.firstChild});
    cancelEvent(ev);
  },
  toggleFriend: function(btn, hash, act, ev, sure) {
    if (cur.viewAsBox) {
      Profile.hideOther(-1);
      return cur.viewAsBox();
    }

    if (act) {
      if (sure !== true && cur.options.bannedhim) {
        showBox('al_profile.php', {act: 'banned_him', action: 'friend', mid: cur.oid}).onContinue = Profile.toggleFriend.pbind(btn, hash, act, false, true);
        return cancelEvent(ev);
      }
      stManager.add(['tooltips.css', 'tooltips.js']);
    }

    ajax.post('al_friends.php', {act: act ? 'add' : 'remove', mid: cur.oid, hash: hash, from: 'profile'}, {
      onDone: function(text, vis, ttText, ttScript, doReload) {
        if (act && cur.onFreindAdd) {
          cur.onFreindAdd();
        }
        if (!text) return nav.reload();
        var tt = (ge('profile_am_subscribed') || {}).tt;
        if (tt) {
          tt.hide({fasthide: 1});
          tt.destroy();
        }
        Profile.hideOther(-1);
        var fs = ge('friend_status');
        cleanElems(fs.firstChild);
        if (text) {
          show(fs);
          val(fs, text);
        } else {
          hide(fs);
        }
        (vis ? show : hide)('friend_remove');
        if (doReload || cur.options.bannedhim) {
          nav.reload();
        } else if (ttText) {
          ajax.preload('al_friends.php', {act: 'friend_tt', mid: cur.oid}, [ttText, ttScript])
          setTimeout(Profile.friendTooltip, 0);
        }
      },
      showProgress: btn.tagName == 'BUTTON' ? lockButton.pbind(btn) : show.pbind(btn.firstChild),
      hideProgress: btn.tagName == 'BUTTON' ? unlockButton.pbind(btn) : hide.pbind(btn.firstChild),
      onFail: function(text) {
        if (!text) return;

        showFastBox(getLang('global_error'), text);
        return true;
      }
    });
    cancelEvent(ev);
  },
  friendTooltip: function() {
    if (cur.viewAsBox) {
      return;
    }

    return showTooltip(ge('profile_am_subscribed'), {
      url: 'al_friends.php',
      params: {act: 'friend_tt', mid: cur.oid},
      slide: 15,
      hidedt: 500,
      shift: [23, -1, -10],
      className: 'preq_tt',
      forcetodown: true
    });
  },
  submitReqText: function() {
    var msg = trim(val('preq_input'));
    if (!msg) return elfocus('preq_input');

    var oid = cur.mfid ? cur.mfid : cur.oid;
    ajax.post('al_friends.php', {act: 'request_text', mid: oid, message: msg, hash: cur.reqHash}, {onDone: function(text) {
      if (!text) return;

      var t = ge('preq_text');
      val(t, text);
      show(t.parentNode);
      hide(ge('preq_input').parentNode);
    }, showProgress: lockButton.pbind('preq_submit'), hideProgress: unlockButton.pbind('preq_submit')});
  },
  reqTextChanged: function(ev) {
    onCtrlEnter(ev, Profile.submitReqText);
    var field = ge('preq_input');
    var v = trim(val(field)).replace(/\n\n\n+/g, '\n\n');
    if (field.lastLen === v.length) return;
    field.lastLen = v.length;
    var countRealLen = function(text) {
      var spec = {'&': 5, '<': 4, '>': 4, '"': 6, "\n": 4, "\r": 0, '!': 5, "'": 5};
      var res = 0;
      for (var i = 0, l = text.length; i < l; i++) {
        var k = spec[text.charAt(i)], c = text.charCodeAt(i);
        if (k !== undefined) res += k;
        else if ((c > 0x80 && c < 0xC0) || c > 0x500) res += ('&#' + c + ';').length;
        else res += 1;
      }
      return res;
    }
    var realLen = countRealLen(v), maxLen = 240;
    var brCount = (realLen - v.replace(/\n/g, '').length) / 4;
    var warn = ge('preq_warn');
    if (realLen > maxLen - 40 || brCount > 4) {
      if (realLen > maxLen) {
        warn.innerHTML = getLang('friends_exceeds_symbol_limit', realLen - maxLen);
      } else if (brCount > 4) {
        warn.innerHTML = getLang('friends_exceeds_lines_limit', brCount - 4);
      } else {
        warn.innerHTML = getLang('text_N_symbols_remain', maxLen - realLen);
      }
      show(warn);
    } else {
      hide(warn);
    }
  },
  toggleBlacklist: function(btn, hash, ev) {
    if (cur.viewAsBox) {
      Profile.hideOther(-1);
      return cur.viewAsBox();
    }

    ajax.post('al_settings.php', {act: cur.options.bannedhim ? 'a_del_from_bl' : 'a_add_to_bl', id: cur.oid, hash: hash, from: 'profile'}, {onDone: function(text) {
      domNS(domFC(btn)).innerHTML = text;
      cur.options.bannedhim = !cur.options.bannedhim;
    }, progress: domFC(btn)});
    cancelEvent(ev);
  },
  toggleFeedIgnored: function(btn, hash, ev) {
    if (cur.viewAsBox) {
      Profile.hideOther(-1);
      return cur.viewAsBox();
    }

    ajax.post('al_feed.php', {act: cur.options.ignoredhim ? 'a_unignore_owner' : 'a_ignore_owner', owner_id: cur.oid, hash: hash, from: 'profile'}, {onDone: function(text) {
      domNS(domFC(btn)).innerHTML = text;
      cur.options.ignoredhim = !cur.options.ignoredhim;
    }, progress: domFC(btn)});
    cancelEvent(ev);
  },
  showGiftBox: function(mid, ev) {
    Profile.hideOther(-1);
    cur.gftbxWasScroll = boxLayerWrap.scrollTop;
    boxLayerWrap.scrollTop = 0;
    if (cur.viewAsBox) return cur.viewAsBox();

    var cache = cur.ignoreBoxCache ? 0 : 1;
    cur.ignoreBoxCache = false;
    return !showBox('al_gifts.php', {act: 'get_gift_box', mid: mid, fr: (mid == vk.id ? 1 : 0)}, {stat: ['gifts.css', 'wide_dd.js', 'wide_dd.css'], cache: cache}, ev);
  },
  showHideGiftsBox: function(ev) {
    Profile.hideOther(-1);
    if (cur.viewAsBox) return cur.viewAsBox();
    var msg = getLang('profile_sure_hide_gifts').replace('{link}', '<a href="/settings">').replace('{/link}', '</a>').replace('{link1}', '<a href="/settings?act=privacy">').replace('{/link1}', '</a>');

    var box = showFastBox({title: getLang('global_warning'), bodyStyle: 'line-height: 140%;', width: 350}, msg, getLang('profile_gifts_hide_button'), function() {
      ajax.post('al_profile.php', {
        act: 'hide_gifts',
        hash: cur.options.gifts_hash
      }, {
        onDone: function() {
          slideUp('profile_gifts', 200);
          box.hide();
        },
        progress: box.progress
      });
    }, getLang('global_cancel'));
    cancelEvent(ev);
    return false;
  },
  showNewGift: function(giftId) {
    var gifts = ge('profile_gifts');
    if (!gifts || !giftId) return;
    var images = geByTag('img', geByClass1('module_body', gifts)), pic = vkImage();
    pic.src = '/images/gifts/'+(window.devicePixelRatio >= 2 ?'96':'48')+'/'+giftId+'.png';
    var onload = function() {
      var firstPic = images[0], a = firstPic.parentNode, imgCount = images.length;
      if (firstPic) {
        addClass(pic, 'giftImg');
        setStyle(a, {marginLeft: -pic.width+'px'});
        firstPic.parentNode.insertBefore(pic, firstPic);
        animate(a, {marginLeft: '0px'}, 200, function() {
          if (imgCount >= 4) re(images[images.length - 1]);
        })
      }
    };
    if (!pic.width) {
      addEvent(pic, 'load', onload);
    } else {
      onload();
    }
  },
  declineFriend: function(hash) {
    if (cur.viewAsBox) return cur.viewAsBox();
    ajax.post('al_friends.php', {act: 'remove', mid: cur.oid, hash: hash}, {onDone: function(text) {
      hide('friend_request_actions');
    }});
  },
  showWishesBox: function(ev) {
    return true;
    //return !showTabbedBox('al_gifts.php', {act: 'wishlist_box', mid: cur.oid}, {stat: ['gifts.css'], cache: 1}, ev);
  },
  processRelation: function(el, mid, hash, accept) {
    if (cur.viewAsBox) return cur.viewAsBox();

    var pos = getXY(el), parpos = getXY(el.parentNode);
    var pr = ge('relation_progress' + mid), lnk = ge('profile_full_link');
    ajax.post('al_profile.php', {
      act: 'process_relation',
      mid: mid,
      accept: accept ? 1 : '',
      full_shown: lnk ? 1 : '',
      hash: hash
    }, {
      onDone: function(short_info, long_info) {
        cur.options.info = [short_info, long_info];
        if (isVisible('profile_full_info')) {
          Profile.showFull();
        } else {
          Profile.hideFull();
        }
      },
      showProgress: function() {
        pr.style.left = (el.offsetLeft + Math.floor((el.offsetWidth - 32) / 2)) + 'px';
        show(pr);
        el.style.visibility = 'hidden';
      },
      hideProgress: function() {
        el.style.visibility = 'visible';
        hide(pr);
      }
    });
  },
  showFans: function(ev) {
    if (cur.viewAsBox) return cur.viewAsBox();

    return !showTabbedBox('al_fans.php', {act: 'show_fans_box', oid: cur.oid}, {cache: 1}, ev);
  },
  showIdols: function(ev) {
    if (cur.viewAsBox) return cur.viewAsBox();

    return !showTabbedBox('al_fans.php', {act: 'show_idols_box', oid: cur.oid}, {cache: 1}, ev);
  },
  showPublics: function(ev) {
    if (cur.viewAsBox) return cur.viewAsBox();

    return !showTabbedBox('al_fans.php', {act: 'show_publics_box', oid: cur.oid}, {cache: 1}, ev);
  },
  fansBox: function(oid, ev, tab) {
    if (cur.viewAsBox) return cur.viewAsBox();
    return !showBox('al_fans.php', {act: 'box', tab: tab || 'fans', oid: oid}, {cache: 1, stat: ['page_help.css', 'fansbox.js']}, ev);
  },
  giftsBox: function(mid, ev, tab) {
    if (cur.viewAsBox) return cur.viewAsBox();
    return !showBox('al_gifts.php', {act: 'box', tab: tab || 'received', mid: mid}, {cache: 1, stat: ['gifts.css', 'gifts.js']}, ev);
  },
  idolsBox: function(oid, ev) {
    return Profile.fansBox(oid, ev, 'idols');
  },
  showClassHint: function(text) {
    var cl = ge('profile_class');
    if (!cl) return;

    var hint = cur.classhint = bodyNode.appendChild(ce('div', {id: 'profile_class_hint', innerHTML: '\
<table cellspacing="0" cellpadding="0">\
  <tr>\
    <td rowspan="2"><div class="pointer"></div></td>\
    <td><div class="content">' + text + '</div></td>\
  </tr>\
  <tr><td><div class="bottom"></div></td></tr>\
</table>'}, {display: 'none'}));

    var xy = getXY(cl), elsize = getSize(cl);

    hint.style.opacity = 0;
    show(hint);
    var size = getSize(hint);

    var top = xy[1] - Math.floor((size[1] - elsize[1]) / 2);
    var newleft = xy[0] + (vk.rtl ? -(size[0] + 10) : (elsize[0] + 10));
    hint.style.left = (newleft + (vk.rtl ? -10 : 10)) + 'px';
    hint.style.top = top + 'px';

    var showhint = animate.pbind(hint, {left: newleft, opacity: 1}, 500, false), img = vkImage();
    img.onload = showhint;
    img.src = '/images/classhint.gif';

    cur.destroy.push(function(c) {
      if (c.classhint && c.classhint.parentNode) {
        c.classhint.parentNode.removeChild(c.classhint);
        c.classhint = false;
      }
    });
    if (cur._back) {
      cur._back.hide.push(function() {
        if (cur.classhint && cur.classhint.parentNode) {
          cur.classhint.parentNode.removeChild(cur.classhint);
          cur.classhint = false;
        }
      });
    }
  },
  init: function(opts) {
    extend(cur, {
      module: 'profile',
      hideOther: Profile.hideOther,
      options: opts,
      oid: opts.user_id,
      postTo: opts.user_id,
      editing: false,
      viewAsWarn: opts.view_as_warn,
      viewAsBox: opts.view_as ? function() {
        setTimeout(showFastBox(getLang('global_warning'), cur.options.view_as).hide, 2000);
        return false;
      } : false,
      _back: opts.view_as ? false : {loc: opts.loc, show: [], hide: [], text: opts.back}
    });
    if (opts.view_as) {
      cur.nav.push(function(changed, old, n, opts) {
        if (cur._leave) {
          cur._leave = false;
          return;
        }
        showFastBox(getLang('global_warning'), cur.viewAsWarn, getLang('global_continue'), function() {
          cur._leave = true;
          nav.go(n);
        }, getLang('global_cancel'));
        return false;
      });
    }
    if (opts.mail_cache) {
      ajax.preload('al_mail.php', {act: 'write_box', to: cur.oid}, opts.mail_cache)
    }
    if (ge('profile_wall')) {
      wall.init(extend(opts, {automore: 1}));
    }
    if (opts.class_hint) {
      cur.clHintTimer = setTimeout(Profile.showClassHint.pbind(opts.class_hint), 1000);
    }
    if (opts.invite_hint) {
      cur.invHintTimer = setTimeout(function() {
        var hint = ge('top_invite_hint');
        showTooltip(hint, {
          text: opts.invite_hint,
          slide: 30,
          shift: [vk.rtl ? -220 : 0, 0, 0],
          showdt: 0,
          showsp: 500,
          forcetodown: true,
          className: 'invite_tt'
        });
        cur.tsUpdated = Profile.inviteHintUpdate;
        stManager.add(['tooltips.css', 'tooltips.js'], cur.tsUpdated);
      }, 1000);
    }
    (cur._back ? cur._back.hide : cur.destroy).push(function(c) {
      clearTimeout((c || cur).clHintTimer);
      clearTimeout((c || cur).invHintTimer);
    });
    if (nav.objLoc.suggest) {
      delete nav.objLoc.suggest;
      Profile.suggestFriends();
    }

    setTimeout(function () {
      if (window.FastChat && (window.curFastChat && curFastChat.inited || window.curNotifier && curNotifier.fc !== undefined)) {
        show('profile_fast_chat');
      }
    }, 100);
    var _a = window.audioPlayer, aid = currentAudioId();
    if (_a && aid && _a.showCurrentTrack) _a.showCurrentTrack();

    if (opts.photos_upload) {
      stManager.add(['upload.js'], Profile.initPhotosUpload);
    }

    cur.onPeerStatusChanged = function(peer, evType, evData) {
      if (peer == cur.oid) {
        var lv = ge('profile_online_lv');
        if (evType == 'online') {
          evData = intval(evData);
          setStyle('profile_mobile_online', {display: (evData && evData != 1) ? 'inline' : 'none'});
          if (!isVisible(lv)) {
            hide('profile_time_lv');
            setStyle(lv, {overflow: 'hidden', display: 'block', height: 0, paddingTop: 12, opacity: 0});
            show(lv);
            animate(lv, {paddingTop: 0, height: 12, opacity: 1}, 200, function() {
              setStyle(lv, {overflow: 'auto', height: 'auto'});
            });
            ajax.post('al_profile.php', {act: 'a_get_online_info', uid: cur.oid}, {
              onDone: function(cl) {
                var btn = ge('profile_message_send');
                if (hasClass(btn, cl)) return;
                animate(btn, {opacity: 0}, 200, function() {
                  btn.className = 'profile_action_btn ' + cl;
                  animate(btn, {opacity: 1}, 200)
                })
              }
            });
          }
        } else if (evType == 'offline') {
          setStyle(lv, {overflow: 'hidden', display: 'block', height: 12, paddingTop: 0, opacity: 1});
          animate(lv, {paddingTop: 12, height: 0, opacity: 0}, 200, function() {
            hide(lv);
          });
          var btn = ge('profile_message_send');
          if (hasClass(btn, 'profile_msg_call')) {
            var cl = 'profile_msg_none';
          } else if (hasClass(btn, 'profile_msg_split')) {
            var cl = 'profile_msg_msg';
          }
          if (cl) {
            animate(btn, {opacity: 0}, 200, function() {
              btn.className = 'profile_action_btn ' + cl;
              animate(btn, {opacity: 1}, 200)
            })
          }
        }
      }
    }
  },
  inviteHintUpdate: function() {
    var hint = ge('top_invite_hint');
    if (!hint || !hint.tt || !hint.tt.container) return;
    var lnk = isVisible('ts_wrap') ? ge('ts_settings') : ge('top_invite_link'), l = 0, r = 0;
    if (vk.rtl) {
      r = (413 - lnk.parentNode.parentNode.offsetLeft - (lnk.offsetWidth / 2)) + 'px';
    } else {
      l = (lnk.parentNode.parentNode.offsetLeft + (lnk.offsetWidth / 2) - 370) + 'px';
    }
    geByClass1('top_pointer', hint.tt.container).style.margin = '0px ' + r + ' 0px ' + l;
  },
  appStatusUpdate: function(hash) {
    if (!cur.ciApp) return;

    var exp = isChecked('currinfo_app');
    ajax.post('al_apps.php', {act: 'toggle_currinfo', hash: hash, exp: exp, id: cur.ciApp}, {onDone: function(text) {
      if (vk.id != cur.oid || !text) return;
      val('current_info', text);
    }})
  },
  suggestFriends: function() {
    if (cur.viewAsBox) return cur.viewAsBox();

    var box = showBox('al_friends.php', {
      act: 'select_friends_box',
      from: 'suggest_friends',
      friend_id: cur.oid
    }, {stat: ['privacy.js', 'privacy.css', 'indexer.js']});
    box.leaveOnSave = true;
    cur.onFlistSave = function(ids, list, hash) {
      //if (!ids || !ids.length) return;
      ajax.post('al_friends.php', {
        act: 'a_suggest_friends',
        mid: cur.oid,
        ids: ids.join(','),
        hash: hash
      }, {
        onDone: function(text) {
          box.hide();
          showDoneBox(text);
        },
        showProgress: box.showProgress,
        hideProgress: box.hideProgress
      });
    }
  },
  giftTooltip: function(obj, event, mid) {
    if (checkEvent(event)) return true;
    if (cur.hideGifts && !cur.giftsHidden) {
      return cur.hideGifts(event);
    }
    var is_module = hasClass(obj, 'module_header');
    addClass(obj, is_module ? 'module_inverted' : 'gifts_inverted');
    if (cur.giftsPrepare || !cur.votesBox) {
      if (!cur.giftsPrepare) {
        Profile.prepareGiftTooltip();
      }
      addClass(obj, is_module ? 'module_inverted_loading' : 'gifts_inverted_loading');
      cur.onGiftsLoad = Profile.giftTooltip.pbind(obj, event, mid);
      return cancelEvent(event);
    }
    removeClass(obj, is_module ? 'module_inverted_loading' : 'gifts_inverted_loading');
    if (!cur.votesBox) {
      return false;
    }
    if (Pads && Pads.hide) {
      Pads.hide();
    }
    var html = cur.votesBox[0];
    var js = cur.votesBox[1];

    eval('(function(){' + js + ';})()');
    if (obj.tt && obj.tt.container && !cur.giftsTooltipEl) {
      cur.giftsTooltipEl = re(geByClass1('gifts_profile_block', obj.tt.container));
    }
    cur.giftsHidden = false;
    addEvent(document, 'click', cur.hideGifts);
    addEvent(document, 'keydown', cur.hideGiftsOnEsc);
    return cancelEvent(event);
  },
  prepareGiftTooltip: function(event, mid) {
    if (!cur.votesBox && !cur.giftsPrepare) {
      cur.giftsPrepare = true;
      ajax.post('/al_gifts.php', {act: 'new_gift_box', mid: mid}, {
        onDone: function() {
          var args = Array.prototype.slice.call(arguments),
              div = ce('div', {innerHTML: args[0]}); // preload imgs
          cur.votesBox = args;
          cur.giftsPrepare = false;
          if (cur.onGiftsLoad) {
            cur.onGiftsLoad();
          }
        },
        stat: ['gifts.css', 'tooltips.js', 'tooltips.css', 'notifier.js']
      })
    }
  },
  giftSend: function() {
    var uid = cur.oid, num = ge('gifts_selected_num').value;
    lockButton('gifts_submit');
    ajax.post('al_gifts.php', {
      act: 'do_send',
      mids: uid,
      type: isChecked('receiver_only') ? 1 : 0,
      number: num,
      text: ge('gifts_message').value,
      hash: ge('gifts_hash').value,
      from: 'profile',
      need_module: ge('profile_gifts') ? 0 : 1,
      old: 1
    }, {
      onDone: function(data, text, giftsCnt, giftsModule) {
        updateMoney(data);
        ge('gifts_message').value = '';
        checkbox('receiver_only', false);
        unlockButton('gifts_submit');
        cur.hideGifts && cur.hideGifts();
        if (cur.clearGiftTt) {
          if (cur.clearGiftTt.tt) cur.clearGiftTt.tt.destroy();
          cur.votesBox = cur.giftsPrepare = cur.onGiftsLoad = cur.clearGiftTt = false;
        }
        text = text.replace('<b>', '<div class="top_result_header">').replace('</b><br>', '</div>');
        showDoneBox(text, {out: 1500});
        cur.ignoreBoxCache = true;
        if (cur.module == 'profile' && cur.oid == uid && window.Profile) {
          if (ge('gifts_module_count') && giftsCnt) {
            ge('gifts_module_count').innerHTML = giftsCnt;
            Profile.showNewGift(num);
          } else if (!ge('profile_gifts') && giftsModule) {
            hide('gifts_count_module');
            var firstModule = geByClass1('module', ge('profile_narrow'));
            if (firstModule) {
              firstModule.parentNode.insertBefore(se(giftsModule), firstModule);
            }
          }
        }
      },
      onFail: function(text) {
        unlockButton('gifts_submit');
        cur.hideGifts && cur.hideGifts();
        text && topError(text);
        return true;
      }
    });
  },
  publishPhotos: function(photos) {
    var query = {
      act: 'post',
      type: 'photos_upload',
      to_id: vk.id,
      attach1_type: 'photos_list',
      attach1: photos,
      hash: cur.options.photos_post_hash || ''
    }
    if (!window.Notifier || !window.curFastChat || !curFastChat.ready) {
      query.need_wall = 1;
    }
    ajax.post('/al_wall.php', query, {
      onDone: function(wall) {
        cur.photoUploadBox.hide();
        delete cur.photoUploadBox;
        delete cur.savedPhotos;
        showDoneBox('<div style="font-weight: bold">' + getLang('profile_photos_published') + '</div>', {w: 320});
        if (query.need_wall && wall && ge('page_wall_posts')) {
          ge('page_wall_posts').innerHTML = wall;
        }
      },
      onFail: function() {
        cur.photoUploadBox.hide();
        delete cur.photoUploadBox;
        delete cur.savedPhotos;
      }
    });
    return false;
  },
  initPhotosUploadBox: function() {
    if (cur.photoUploadBox) return;
    cur.photoUploadBox = showFastBox({title: getLang('profile_photo_upload_title'), width: 410, onHide: function() {
        Upload.embed(cur.phUplInd || 0);
        delete cur.photoUploadBox;
        delete cur.savedPhotos;
      }}, '<div class="profile_photo_upload_box"><div>' + getLang('profile_photos_uploading') + '</div><div id="profile_photo_upload_label"></div><div class="profile_progress_wrap"><div id="profile_photo_progress" class="profile_progress" style="width: 0%;"></div></div></div>', getLang('global_cancel'), function() {
      cur.photoUploadBox.hide();
      delete cur.photoUploadBox;
      delete cur.savedPhotos;
    });
    cur.photoUploadBox.changed = 1;
  },
  initPhotosUpload: function() {
    if (browser.flash <= 9) return false;
    var photos_data = (cur.options || {}).photos_upload,
        area = ge('profile_photos_upload') || ge('profile_photos_extra_link'), el = se('<div id="profile_photo_uploader" onclick="cancelEvent(event); return false;" style="position: absolute; height: 100%; width: 100%; cursor: pointer;"></div>');
    if (!photos_data || !area) return false;

    area.parentNode.insertBefore(el, area);
    cur.lang = extend(cur.lang || {}, photos_data.opts.lang);
    cur.phUplInd = Upload.init('profile_photo_uploader', photos_data.url, photos_data.params, {
      file_name: 'photo',
      file_size_limit: 1024 * 1024 * 5, // 5Mb
      file_types_description: 'Image files (*.jpg, *.jpeg, *.png, *.gif)',
      file_types: '*.jpg;*.JPG;*.jpeg;*.JPEG;*.png;*.PNG;*.gif;*.GIF',
      accept: 'image/jpeg,image/png,image/gif',
      file_match:  photos_data.opts.ext_re,
      lang: {},

      onUploadStart: function(info, res) {
        Profile.initPhotosUploadBox();
        var txt;
        if (info.num == undefined) {
          info = res;
        }
        if (info.num === 0) {
          txt = (info.totalCount > 1) ? getLang('profile_photos_uploading_x').replace('%s', info.totalCount) : getLang('profile_photo_uploading');
        } else {
          txt = getLang('profile_photos_uploaded_x', info.num).replace('{count}', info.totalCount);
        }
        ge('profile_photo_upload_label').innerHTML = txt;
      },
      onUploadComplete: function(info, res) {
        if (info.totalCount > 1 && info.totalCount == info.num + 1) {
          ge('profile_photo_upload_label').innerHTML = getLang('profile_photos_uploaded_x', info.totalCount).replace('{count}', info.totalCount);
        }
        var params, i = info.ind !== undefined ? info.ind : info;
        try {
          params = eval('(' + res + ')');
        } catch(e) {
          params = q2ajx(res);
        }
        if (params.photos) {
          cur.savedPhotos = cur.savedPhotos || {mid: params.mid, gid: params.gid, aid: params.aid, server: params.server};
          cur.savedPhotos.photos = cur.savedPhotos.photos || [];
          cur.savedPhotos.photos.push({photo: params.photos, hash: params.hash});
          return;
        }
      },
      onUploadProgress: function(info, bytesLoaded, bytesTotal) {
        Profile.initPhotosUploadBox();
        var newWidth = intval(bytesLoaded / bytesTotal * 250);
        animate(ge('profile_photo_progress'), {width: newWidth + 'px'}, 200);
      },
      onUploadCompleteAll: function (i) {
        if (cur.photoUploadBox) {
          if (cur.savedPhotos) {
            var query = {act: 'done_add', context: 1, from: 'profile_block'}, k = 1;
            for (var j in (cur.savedPhotos.photos || [])) {
              query['photo'+k] = cur.savedPhotos.photos[j].photo;
              query['hash'+k] = cur.savedPhotos.photos[j].hash;
              k++;
            }
            delete cur.savedPhotos.photos;
            query = extend(query, cur.savedPhotos);
            ajax.post('/al_photos.php', query, {
              onDone: function(saved_photos, html, script) {
                if (ge('profile_photos_module')) {
                  ge('profile_photos_module').innerHTML = se(html).innerHTML;
                  if (script) eval(script);
                }
                if (saved_photos) Profile.publishPhotos(saved_photos);
              },
              onFail: function() {
                cur.photoUploadBox.hide();
                delete cur.photoUploadBox;
                delete cur.savedPhotos;
                Upload.embed(cur.phUplInd || 0);
              }
            })
          } else {
            cur.photoUploadBox.hide();
            delete cur.photoUploadBox;
            delete cur.savedPhotos;
          }
          show(cur.photoUploadBox.progress);
        }
      },
      onUploadError: function(i) {
        debugLog('error', arguments); return;
      },
      onSelectClick: function(i) {
        if (!Upload.checked || !Upload.checked[i]) {
          Upload.check(i);
        }
      },
      onCheckComplete: function(i) {
        try {
          var postData = [], vars = Upload.vars[i];
          for (var k in vars) {
            postData.push(k+'='+vars[k]);
          }
          if (!vars['ajx']) {
            postData.push('ajx=1');
          }
          ge('uploader_lite'+i).configureServer(Upload.uploadUrls[i], escape(postData.join('&')));
        } catch (e) {debugLog(e);}
      },
      onDebug: debugLog,

      flashPath: '/swf/photo_uploader_lite.swf',
      hoverEl: ge('profile_photos_upload') || ge('profile_photos_extra_link'),
      flash_lite: 1,
      noCheck: 1,
      noForm: 1,
      flashHeight: getSize(area)[1],
      forceFlash: 1,
      multiple: 1,
      multi_progress: 1,
      max_files: 50,
      clear: 1,
      type: 'photo',
      max_attempts: 3,
      server: photos_data.opts.server,
      error: photos_data.opts.default_error,
      error_hash: photos_data.opts.error_hash,
      label: photos_data.opts.label,
      dragEl: bodyNode
    });
  }
}, profile = Profile;

try{stManager.done('profile.js');}catch(e){}
