Claims = {
switchTab: function(el, evt) {
  if (evt.button) return true;
  show('claims_loading');
  if (hasClass(el.parentNode, 'claim_tab')) {
    each(geByClass('claim_tab_active', ge('claims_tabs')), function(i, v) {
      removeClass(v, 'claim_tab_active');
      addClass(v, 'claim_tab');
    });
    removeClass(el.parentNode, 'claim_tab');
    addClass(el.parentNode, 'claim_tab_active');
  } else if (hasClass(el.firstChild, 'claims_section_filter')) {
    each(geByClass('claims_section_filter', ge('claims_section_filters')), function(i, v) {
      removeClass(v, 'selected');
    });
    addClass(el.firstChild, 'selected');
  }
  return nav.go(el, evt);
},
toggleDetails: function(cid) {
  if (isVisible('details' + cid)) {
    Claims.hideDetails(cid);
  } else {
    Claims.showDetails(cid);
  }
},
showDetails: function(cid) {
  if (!cur.claimed_content) cur.claimed_content = {};
  if (!cur.claimed_content[cid]) {
    hide('details_link_' + cid);
    show('details_loading_' + cid);
    ajax.post('/claims', {act: 'a_get_content', claim_id: cid}, {
      onDone: function(content) {
        var cont = ge('details' + cid);
        var el = ge('content' + cid);
        el.innerHTML = content;
        hide('details_loading_' + cid);
        show('details_hide_' + cid);
        if (content == "") {
          hide('content_wrap' + cid);
        }
        if (!isVisible(cont)) slideToggle(cont, 200);
      }
    });
  } else {
    cont = ge('details' + cid);
    slideToggle(cont, 200, function(){
      hide('details_link_' + cid);
      show('details_hide_' + cid);
    });
  }
  cur.claimed_content[cid] = true;
  return false;
},
hideDetails: function(cid) {
  cont = ge('details' + cid);
  if (isVisible(cont)) slideToggle(cont, 200, function() {
    hide('details_hide_' + cid);
    show('details_link_' + cid);
  });
  return false;
},
getPage: function(offset) {
  show('pages_loading_top');
  show('pages_loading_bottom');
  ajax.post('/claims', {act: nav.objLoc.act, filter: nav.objLoc.filter, offset: offset, load: 1}, {
    cache: 1,
    onDone: function(content, script) {
      ge('content').innerHTML = content;
      if (window.tooltips) tooltips.hideAll();
      if (script) eval(script);
      if (offset) {
        nav.setLoc(extend(nav.objLoc, {offset: offset}));
      } else {
        delete nav.objLoc.offset;
        nav.setLoc(nav.objLoc);
      }
    },
    onFail: function() {
      hide('pages_loading_top');
      hide('pages_loading_bottom');
    }
  });
  return false;
},

claimContent: function(cid, type, owner_id, id, hash) {
  ge('claim' + cid + type + owner_id + '_' + id).innerHTML = '';
  ajax.post('/claims', {act: 'a_claim', claim_id: cid, type: type, id: id, owner_id: owner_id, hash: hash}, {
    onDone: function(response) {
      ge('claim' + cid + type + owner_id + '_' + id).innerHTML = '<a href="#" onclick="Claims.unclaimContent(' + cid + ',\'' + type + '\',' + owner_id + ',' + id + ',\'' + hash + '\');">вернуть</a>';
    }
  });
},
unclaimContent: function(cid, type, owner_id, id, hash) {
  ge('claim' + cid + type + owner_id + '_' + id).innerHTML = '';
  ajax.post('/claims', {act: 'a_unclaim', claim_id: cid, type: type, id: id, owner_id: owner_id, hash: hash}, {
    onDone: function(response) {
      ge('claim' + cid + type + owner_id + '_' + id).innerHTML = '<a href="#" onclick="Claims.claimContent(' + cid + ',\'' + type + '\',' + owner_id + ',' + id + ',\'' + hash + '\');">изъять</a>';
    }
  });
},
setClaimStatus: function(cid, status, onDone, sure, comment) {
  var params = {act: 'a_set_status', claim_id: cid, status: status};
  if (status == 2) {
    if (sure) {
      params.comment = comment;
    } else {
      var box = cur.showDeclineBox(function() {
        var comment = val('claims_decline_comment');
        box.hide();
        Claims.setClaimStatus(cid, status, onDone, true, comment);
      });
      return;
    }
  }
  ajax.post('/claims', params, {
    onDone: function(newstatus, message) {
      if (message) {
        showFastBox(getLang('global_error'), message);
      }
      removeClass('claim' + cid, 'status0');
      removeClass('claim' + cid, 'status1');
      removeClass('claim' + cid, 'status2');
      addClass('claim' + cid, 'status' + newstatus);
      if (onDone) {
        onDone(cid, newstatus);
      }
    }
  });
},
updateClaimButtons: function(cid, status) {
  if (status == 0) {
    ge('claim_status').innerHTML = "открыта";
    ge('claim_buttons').innerHTML = "<div class=\"button_blue fl_l\"><button onclick=\"Claims.setClaimStatus(" + cid + ", 1, Claims.updateClaimButtons);\">Закрыть</button></div>" +
      "<div class=\"button_gray fl_l\"><button onclick=\"Claims.setClaimStatus(" + cid + ", 2, Claims.updateClaimButtons);\">Отклонить</button></div>";
  } else
  if (status == 1 || status == 2) {
    ge('claim_status').innerHTML = (status == 1 ? "закрыта" : "отклонена");
    ge('claim_buttons').innerHTML = "<div class=\"button_blue fl_l\"><button onclick=\"Claims.setClaimStatus(" + cid + ", 0, Claims.updateClaimButtons);\">Открыть</button></div>";
  }
  ge('claim_updated_msg').innerHTML = "<b>Готово</b><br/>Статус жалобы успешно изменен.";
  show('claim_updated_msg');
  setStyle('claim_updated_msg', 'backgroundColor', '#F4EBBD');
  animate(ge('claim_updated_msg'), {backgroundColor: '#F9F6E7'}, 2000);
  scrollToTop(0);
},
updateClaimLinks: function(cid, status) {
  if (status == 0) {
    ge('claim' + cid + '_status').innerHTML = "открыта<br/><a href='#' onclick='Claims.setClaimStatus(" + cid + ", 1, Claims.updateClaimLinks); return cancelEvent(event);'>закрыть</a>" +
      " | <a href='#' onclick='Claims.setClaimStatus(" + cid + ", 2, Claims.updateClaimLinks); return cancelEvent(event);'>отклонить</a>";
  } else
  if (status == 1 || status == 2) {
    ge('claim' + cid + '_status').innerHTML = ((status == 1) ? "закрыта" : "отклонена") + "<br/><a href='#' onclick='Claims.setClaimStatus(" + cid + ", 0, Claims.updateClaimLinks); return cancelEvent(event);'>открыть</a>";
  }
},
toggleObjectionDetails: function(oid) {
  var cont = ge('objection_details' + oid);
  slideToggle(cont, 200, function() {
    //ge('objection_details_link_0').innerHTML = isVisible(cont) ? "скрыть" : "показать";
  });
},
approveObjection: function(oid) {
  ge('objection_status_' + oid).innerHTML = '';
  show('objection_loading_' + oid);
  ajax.post('/claims', {act: 'a_approve_objection', objection_id: oid}, {
    onDone: function(newstatus, oids) {
      hide('objection_loading_' + oid);
      if (oids && oids.length) {
        for (var i in oids) {
          ge('objection_status_' + oids[i]).innerHTML = newstatus;
          addClass('objection' + oids[i], 'approved');
        }
      }
    }
  });
},
declineObjection: function(oid) {
  ge('objection_status_' + oid).innerHTML = '';
  show('objection_loading_' + oid);
  ajax.post('/claims', {act: 'a_decline_objection', objection_id: oid}, {
    onDone: function(newstatus, oids) {
      hide('objection_loading_' + oid);
      if (oids && oids.length) {
        for (var i in oids) {
          ge('objection_status_' + oids[i]).innerHTML = newstatus;
          addClass('objection' + oids[i], 'declined');
        }
      }
    }
  });
},

_eof: 1};try{stManager.done('claims.js');}catch(e){}
