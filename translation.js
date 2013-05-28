var translation = {
  menu: function(ev, sections, admin_href, admin_name, hash) {
    if (checkEvent(ev)) return true;

    var inline_translation = translation.enabled() ? 'Disable inline translation' : 'Enable inline translation';
    var show_all_phrases = '', invitation = '';
    var section_id = (sections || '').split(',');
    section_id = section_id[0] || 0;
    if (section_id) {
      show_all_phrases = '<div class="button_gray button_wide"><button id="translation_show_all">Show all phrases</button></div>';
    }
    if (admin_href == 'super') {
      invitation = '<div>You are super user.<br><a href="/translation.php?act=translators">Add translators &raquo;</a></div>';
    } else if (admin_href == 'coordinator') {
      invitation = '<div>You are coordinator.<br><a href="/translation.php?act=translators">Add translators &raquo;</a></div>';
    } else if (admin_href) {
      invitation = '<a href="' + admin_href + '">' + admin_name + '</a> has invited you to translate this page. <a onclick="return translation.invite();">Invite friend &raquo;</a>';
    }

    if (invitation) {
      invitation = '\
<div id="translation_inv_wrap">\
  <div id="translation_inv_text">' + invitation + '</div>\
  <div id="translation_inv_box">\
    <div class="progress" id="translation_inv_progress"></div>\
    <table cellspacing="0" cellpadding="0" id="translation_inv_controls">\
      <tr>\
        <td><input type="hidden" class="text" id="translation_inv_id" name="translation_inv_id" /></td>\
        <td style="padding-left: 6px"><a onclick="translation.doInvite(\'' + hash + '\')">Send</a></td>\
      </tr>\
    </table>\
  </div>\
</div>';
    }

    var box = showFastBox({
      title: 'Select option',
      width: 200,
      bodyStyle: 'padding: 0px',
      onClean: function() {
        cleanElems('translation_toggle', 'translation_to_page', 'translation_show_all');
        if (translation.uiFriends) {
          translation.uiFriends.destroy();
          translation.uiFriends = false;
        }
      }
    }, invitation + '\
<div class="translation_box">\
  <div class="button_blue button_wide"><button id="translation_toggle">' + inline_translation + '</button></div>\
' + show_all_phrases + '\
  <a class="button_link" href="/translation.php?section_id=' + section_id + '">\
    <div class="button_gray button_wide"><button id="translation_to_page">Go to translation page</button></div>\
  </a>\
  <div class="help">\
    <a href="/club16000">Help &raquo;</a>\
    <br>\
    <a href="/translation.php?section_id=1000">Untranslated &raquo;</a>\
  </div>\
</div>');
    ge('translation_toggle').onclick = translation.toggle;
    ge('translation_to_page').onclick = function() {};
    if (section_id) {
      ge('translation_show_all').onclick = translation.showAll.pbind(sections, box);
    }
    return false;
  },
  t: function(ev, el, leftBtn) {
    if (ev.type == 'click' && (!ev.altKey && !leftBtn)) return;
    var langKey = (el.id.substr(0,5) == 'lang_') ? el.id.substr(5) : el.id;
    var box = showBox('translation.php', {act: 'inline', key: langKey}, {params: {width: 490}, stat: ['ui_controls.css', 'ui_controls.js']});
    box.el = el;
    return cancelEvent(ev);
  },
  save: function(box) {
    if (isVisible(box.progress)) return;

    var query = serializeForm(ge('translation_form'));
    if (nav.strLoc.indexOf('translation.php') != -1) {
      query.truncate = 1;
    }
    ajax.post('translation.php', query, {onDone: function(t) {
      box.el.innerHTML = t;
      box.el.className = 'translated';
      box.hide();
    }, onFail: function(t) {
      if (t) {
        var error = ge('error');
        error.innerHTML = t;
        show(error);
        return true;
      }
    }, progress: box.progress});
  },
  update: function(box) {
    var nativeText = ge('native_text'), history = ge('historyWrap');
    var items = geByTag('textarea', ge('translation_form')), tokens;
    if (getSize(nativeText)[1] > 160) {
      setStyle(nativeText, {height: '160px', overflow: 'auto'});
    } else {
      setStyle(nativeText, {height: 'auto', overflow: 'visible'});
    }

    var options = ge('inlineAdditional'), opVisible = isVisible(options);
    if (!opVisible) show(options);
    if (history) {
      if (getSize(history)[1] > 160) {
        setStyle(history, {height: '160px', overflow: 'auto'});
      }
    }
    each(items, function() {
      autosizeSetup(this, {height: 180});
      addEvent(this, 'keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.keyCode == 13) {
          translation.save(box);
        }
      });
      tokens = ge('tokens_' + this.id.substr(9));
      if (tokens && tokens.childNodes.length) {
        AutoTokens(this, tokens);
      } else if (tokens) {
        hide(tokens);
      }
    });
    if (!opVisible) hide(options);
  },
  invite: function() {
    var inviteBox = ge('translation_inv_box');
    hide('translation_inv_text');
    show(inviteBox);
    if (!translation.uiFriends) {
      ajax.post('friends_ajax.php', {from: 'inline', filter: 'tiny'}, {onDone: function(response) {
        var result = eval('(' + response + ')');
        if (result.friends && result.friends.length) {
          stManager.add(['ui_controls.css', 'ui_controls.js'], function() {
            translation.uiFriends = new Dropdown(ge('translation_inv_id'), result.friends, {width: 150, autocomplete: true, placeholder: 'Start typing friend\'s name'});
            show('translation_inv_controls');
          });
          return;
        }
        var invitationText = ge('translation_inv_text');
        invitationText.innerHTML = '<div style="text-align:center;padding-top:8px">You have no friends.</div>';
        hide('translation_inv_box');
        show(invitationText);
      }, progress: 'translation_inv_progress', stat: ['ui_controls.css', 'ui_controls.js']});
    } else {
      hide('translation_inv_progress');
      show('translation_inv_controls');
      translation.uiFriends.clear();
    }
  },
  doInvite: function(hash) {
    var fid = translation.uiFriends.val();
    if (!fid) return;
    hide('translation_inv_controls');
    ajax.post('translation.php', {act: 'a_invite_translator', user_id: fid, hash: hash}, {onDone: function(text) {
      var invitationText = ge('translation_inv_text');
      invitationText.innerHTML = '<div style="text-align: center">' + text + '<br><a onclick="translation.invite();">Go back</a></div>';
      hide('translation_inv_box');
      show(invitationText);
    }, progress: 'translation_inv_progress'});
  },
  cookie_key: 'remixinline_trans',
  toggle: function() {
    setCookie(translation.cookie_key, translation.enabled() ? '' : '1', 360);
    nav.reload({force: true});
  },
  enabled: function() {
    return getCookie(translation.cookie_key) ? true : false;
  },
  showAll: function(sections, box) {
    if (!sections) return;
    var el = ge('translation_all') || geByClass1('scroll_fix', pageNode).appendChild(ce('div', {className: 'clear', id: 'translation_all'}));
    el.innerHTML = '<div class="loading">Loading...</div>';
    show(el);
    box.hide(200);
    var coords = getXY(el);
    if (browser.msie6) {
      animate(pageNode, {scrollTop: coords[1]});
    } else {
      animate(htmlNode, {scrollTop: coords[1]});
      animate(bodyNode, {scrollTop: coords[1]});
    }
    ajax.post('translation.php', {act: 'inline_edit_all', sections: sections}, {onDone: function(text) {
      el.innerHTML = text;
    }});
  },
  hideAll: function() {
    var el = ge('translation_all');
    if (!el) return;
    el.innerHTML = '';
    hide(el);
    scrollToTop();
  }
}

window.t = translation.t;

try{stManager.done('translation.js');}catch(e){}

function AutoTokens(textarea, tokens) {
  var timeout, pattern = /{[^}]+}|%[a-z]/gi;
  addEvent(textarea, 'keyup', function() {
    clearTimeout(timeout);
    setTimeout(function(){
      onEnterText();
    }, 200);
  });
  each(tokens.childNodes, function(i, x){
    if (x.nodeType == 1) {
      addEvent(x, 'click', function(){return insertToken(x, x.innerHTML)});
    }
  });
  function onEnterText(e) {
    var matches = textarea.value.match(pattern);
    var index, token;
    each (tokens.childNodes, function(i, x) {
      if (x.nodeType != 1)
        return;
      token = x.innerHTML;
      index = matches != null ? indexOf(matches, token) : -1;
      if (index != -1) {
        matches.splice(index, 1);
        x.style.display = 'none';
      } else {
        x.style.display = '';
      }
    });
  }
  function insertToken(el, token) {
    if (textarea.selectionStart != textarea.selectionEnd) {
      textarea.value += token;
    } else {
      var sel = textarea.selectionStart + token.length;
      textarea.value = textarea.value.substring(0, textarea.selectionStart) + token + textarea.value.substr(textarea.selectionStart);
    }
    hide(el);
    if (sel > 0) {
      textarea.selectionStart = textarea.selectionEnd = sel;
    }
    textarea.focus();
    return false;
  }
}
