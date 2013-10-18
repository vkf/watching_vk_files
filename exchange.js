var Exchange = {
  initOfficesMenu: function(event) {
    if (!window.DropdownMenu || !cur.mainNavigationOfficesItems) {
      return;
    }

    if (cur.navigationOficesMenu) {
      return;
    }

    ge('ads_navigation_offices_menu').removeAttribute('onmouseover');

    function hideMenu() {
      cur.navigationOficesMenu.hide();
    }

    var realLocation = '';
    if (location.hash.indexOf('#/') != -1 || location.hash.indexOf('#!') != -1) {
      realLocation = location.hash.replace('#/', '').replace('#!', '');
    } else {
      realLocation = location.pathname + location.search;
    }

    var unionId;
    var unionIdReal;
    var unionIdParam = '';
    var curItems = [];
    for (var i in cur.mainNavigationOfficesItems) {
      curItems[i] = {};
      curItems[i].onClick = hideMenu;
      for (var j in cur.mainNavigationOfficesItems[i]) {
        curItems[i][j] = cur.mainNavigationOfficesItems[i][j];
      }

      unionId = '';
      unionIdReal = intval(curItems[i].i);
      unionIdParam = '';
      if (curItems[i].i.indexOf('default') == -1) {
        unionId = unionIdReal;
        unionIdParam = "&union_id=" + unionIdReal;
      }

      var link = "/exchange" + (unionIdParam ? '?' + unionIdParam : '');
      if (!unionIdReal) {
        link = "/exchange?act=no_office";
      } else if (cur.getOfficeLink) {
        link = cur.getOfficeLink(unionId);
      } else if (realLocation.match(/act=budget(&|$)/)) {
        link = "/exchange?act=budget" + unionIdParam;
      } else if (realLocation.match(/act=export_stats(&|$)/)) {
        link = "/exchange?act=export_stats" + unionIdParam;
      } else if (realLocation.match(/act=settings(&|$)/)) {
        link = "/exchange?act=settings" + unionIdParam;
      }

      curItems[i].h = link;
    }

    var options = {
      title: '<span id="ads_navigation_dd_menu_header_text">' + ge('ads_navigation_offices_menu_text').innerHTML + '</span>',
      containerClass: 'ads_navigation_dd_menu_header_wrap',
      target: ge('ads_navigation_offices_menu'),
      showHover: false,
      updateTarget: false,
      onSelect: function(e) {
      }
    };
    cur.navigationOficesMenu = new DropdownMenu(curItems, options);
    cur.destroy.push(function(){ cur.navigationOficesMenu.destroy(); });
  },

  initScroll: function() {
    Exchange.scrollnode = browser.msie6 ? pageNode : window;
    Exchange.deinitScroll();
    window.scrollTop = bodyNode.scrollTop = pageNode.scrollTop = htmlNode.scrollTop = 0;
    addEvent(Exchange.scrollnode, 'scroll', Exchange.scrollCheck);
    addEvent(window, 'resize', Exchange.scrollCheck);
  },
  deinitScroll: function() {
    removeEvent(Exchange.scrollnode, 'scroll', Exchange.uScroll);
    removeEvent(window, 'resize', Exchange.uScroll);
  },
  scrollCheck: function() {
    if (browser.mobile || cur.isSearchLoading || cur.disableAutoMore) return;

    var docEl = document.documentElement;
    var ch = window.innerHeight || docEl.clientHeight || bodyNode.clientHeight;
    var st = scrollGetY(), lnk = ge('exchange_more_results');

    if (!isVisible(lnk)) return;
    if (st + ch + 200 > lnk.offsetTop) {
      if (lnk.nodeName != 'A') {
        lnk = geByTag1('a', lnk);
      }
      lnk.onclick();
    }
  },

  initCommunitySearch: function() {
    Exchange.initScroll();
    cur.destroy.push(function(c) {
      if (c == cur) Exchange.deinitScroll();
    });

    placeholderSetup('exchange_search_input', {back: true});
    each(['filter_cost_to', 'filter_reach', 'filter_size'], function (i, val) {
      placeholderSetup(val);
      addEvent(val, 'change', Exchange.updateCommunitySearch);
      addEvent(val, 'keydown', function(event) {
        if (event.keyCode == KEY.ENTER) Exchange.updateCommunitySearch();
      });
    });
  },

  getSearchParams: function(obj) {
    var params = {
      q: trim(val(obj)), load: 1, cache: 1,
      offset: cur.searchOffset || 0,
      sort: cur.searchSortBy || '',
      cost_to: val('filter_cost_to'),
      reach: val('filter_reach'),
      size: val('filter_size'),
      category: cur.uiCategory.val(),
      country: cur.uiCountry.val(),
      city: cur.uiCity.val(),
      sex: cur.uiSex.val(),
      age: cur.uiAge.val(),
    };
    return params;
  },
  sameParams: function(params) {
    if (!cur.params) return false;
    for (var i in params) {
      if (params[i] != cur.params[i]) return false;
    }
    for (var i in cur.params) {
      if (params[i] != cur.params[i]) return false;
    }
    return true;
  },

  updateCommunitySearch: function(obj, delay, sort) {
    obj = obj || ge('exchange_search_input');
    delay = delay || 10;
    if (sort != undefined)  {
      cur.searchSortBy = sort;
    }
    clearTimeout(cur.searchTimeout);
    cur.searchTimeout = setTimeout((function() {
      var params = Exchange.getSearchParams(obj);
      if ((!Exchange.sameParams(params) || cur.ignoreEqual)) {
        delete cur.ignoreEqual;
        cur.params = params;
        cur.searchStr = params.q;
        Exchange.searchCommunity();
      }
      scrollToTop();
    }).bind(this), delay);
  },
  searchCommunity: function() {
    var query = cur.params || Exchange.getSearchParams(ge('exchange_search_input'));

    ajax.post('/exchange?act=community_search&ad_id='+cur.post_id, query, {
      cache: 1,
      onDone: function(rows, showMore) {
        var more_lnk = ge('exchange_more_results');
        if (query['offset'] > 0) {
          var tbl = ge('exchange_comm_search_table').tBodies[0];
          if (rows) {
            if (!browser.msie) {
              tbl.insertAdjacentHTML('beforeEnd', rows);
            } else {
              var t = se('<table>'+rows+'</table>');
              var rows = geByTag('tr', t);
              for (i in rows) {
                if (rows[i].nodeType == 1) tbl.appendChild(rows[i]);
              }
            }
            tbl.appendChild(more_lnk);
          }
        } else {
          ge('exchange_comm_search_table').innerHTML = rows;
          cur.searchOffset = 0;
        }
        if (showMore) {
          show('exchange_more_results');
        } else {
          hide('exchange_more_results');
        }

        each(query, function(i, v) {
          if (v && v != 0 && i != 'load' && i != 'cache' && i != 'offset') {
            nav.objLoc[i] = v;
          } else {
            delete nav.objLoc[i];
          }
        });
        nav.setLoc(nav.objLoc);
      },
      showProgress: function() {
        addClass(ge('exchange_search_wrap'), 'loading');
        cur.isSearchLoading = true;
      },
      hideProgress: function() {
        removeClass(ge('exchange_search_wrap'), 'loading');
        cur.isSearchLoading = false;
      }
    });
  },
  clearCommunitySearch: function() {
    var field = ge('exchange_search_input');
    val(field, '');
    elfocus(field);
    Exchange.updateCommunitySearch(field);
  },
  searchCommunityShowMore: function() {
    var offset = cur.searchOffset || 0;
    offset += cur.searchPerPage;
    cur.searchOffset = offset;
    hide('exchange_more_results');
    Exchange.updateCommunitySearch();
    return false;
  },
  switchSubTab: function(el, wrap, link, evt, params) {
    if (checkEvent(evt) || hasClass(el, 'active')) return false;
    each(geByClass('exchange_subtab1', ge(wrap)), function(i, v) {
      removeClass(v, 'active');
    });
    addClass(el, 'active');
    if (params.part) {
      var obj = nav.fromStr(link), url = obj[0];
      delete obj[0];
      ajax.post(url, extend(obj, {part: 1}), {
        onDone: params.onDone.pbind(obj)
      });
      return false;
    }
    return nav.go(link, evt);
  },
  getPage: function(offset, wrap) {
    var obj = clone(nav.objLoc), url = obj[0];
    delete obj[0];
    ajax.post(url, extend(obj, {offset: offset, part: 1}), {
      onDone: function(res) {
        ge(wrap || 'exchange_requests_table_wrap').innerHTML = res;
        nav.setLoc(extend(nav.objLoc, {offset: offset}));
      }
    });
    return false;
  },
  reArrangeRows: function(className) {
    var rows = geByClass(className), k = 0;
    if (!rows.length) {
      nav.reload();
    }
    for (var j in rows) {
      toggleClass(rows[j], 'even', k++ % 2 > 0)
    }
  },
  addRequest: function(gid, ad_id, from_office) {
    return !showBox('/exchange', {act: 'a_request_box', gid: gid, ad_id: ad_id, from_office: from_office}, { params: {width: '500px', dark: true, bodyStyle: 'padding: 0px;'}});
  },
  deleteRequest: function(gid, ad_id, request_id, from_office, hash, show_comment) {
    var bodyStyle = 'line-height: 160%; padding: 16px 20px;';
    if (show_comment) {
      bodyStyle += ' background-color: #F7F7F7';
    }
    var boxWidth = show_comment ? 370 : 430;
    var doDeleteRequest = function() {
      ajax.post('/exchange', {act: 'a_delete_request', gid: gid, ad_id: ad_id, request_id: request_id, from_office: from_office, comment: ge('exchange_box_comment') && val('exchange_box_comment') || '', hash: hash}, {
        progress: curBox().progress,
        onDone: function() {
          curBox().hide();
          re('exchange_request' + request_id);
          Exchange.reArrangeRows('exchange_request_row');
        },
        onFail: function(text) {
          ge('exchange_box_error').innerHTML = text;
          show('exchange_box_error');
          return true;
        }
      });
    }
    cur.doDeleteRequest = doDeleteRequest;
    var box = showFastBox({title: getLang('ads_posts_sure_delete_title'), dark: true, width: boxWidth, bodyStyle: bodyStyle, hideButtons: show_comment}, '<div id="exchange_box_error" class="error" style="display: none;"></div><div>' + getLang('ads_posts_sure_delete_text') + '</div><div id="exchange_box_comment_wrap" class="clear_fix" style="display:none;"><textarea id="exchange_box_comment" placeholder="' + getLang('ads_posts_delete_placeholder') +'" onkeypress="onCtrlEnter(event, cur.doDeleteRequest)"></textarea><div class="exchange_box_send_wrap button_blue fl_r"><button id="exchange_box_send" onclick="cur.doDeleteRequest()">' + getLang('ads_posts_delete') + '</button></div></div>', getLang('ads_posts_delete'), doDeleteRequest, getLang('global_cancel'));
    if (show_comment) {
      show('exchange_box_comment_wrap');
      placeholderSetup('exchange_box_comment', {back: true});
      autosizeSetup('exchange_box_comment', {minHeight: 70, maxHeght: 200});
    }
    return false
  },
  sendRequest: function(gid, ad_id, price, hash, from_office, btn) {
    ajax.post('/exchange', {act: 'a_save_request', ad_id: ad_id, gid: gid, price: price, from_office: from_office, hash: hash, text: val('exchange_request_comment'), time_from: val('exchange_request_time_from_d'), time_to: val('exchange_request_time_to_d'), date_from: val('exchange_request_date_from'), date_to: val('exchange_request_date_to')}, {
      showProgress: lockButton.pbind(btn),
      hideProgress: unlockButton.pbind(btn),
      onFail: function(msg) {
        ge('exchange_request_box_error').innerHTML = msg;
        show('exchange_request_box_error');
        return true;
      }
    });
    return false;
  },
  editPost: function() {
    return wall.editPost(cur.postRaw, {from: 'exchange'}, false, Exchange.showFullPost);
  },
  showFullPost: function() {
    removeClass('exchange_post_msg_wrap', 'short');
    setStyle('exchange_post_msg', {maxHeight: 'none'});
  },
  slideFullPost: function() {
    if (!ge('exchange_post_msg_wrap') && !hasClass('exchange_post_msg_wrap', 'short')) {
      return;
    }

    var realSize = getSize(ge('wpt' + cur.postRaw))[1];
    animate(ge('exchange_post_msg'), {maxHeight: realSize}, 200, Exchange.showFullPost);
    animate(ge('exchange_post_msg_more'), {height: 0}, 200);
  },
  archivePost: function(ad_id, status, hash, from) {
    var doArchivePost = function(ad_id, status, hash) {
      addClass('exchange_info_archive', 'loading');
      ajax.post('/exchange', {act: 'a_archive', ad_id: ad_id, status: status, from: from || '', hash: hash}, {
        onDone:function(link) {
          if (ge('exchange_info_archive')) {
            ge('exchange_info_archive').innerHTML = link;
          }
          toggle('exchange_info_actions', status != 2);
          toggle('exchange_info_in_archive', status == 2);
        },
        hideProgress: removeClass.pbind('exchange_info_archive', 'loading')
      });
    }
    if (status == 2) {
      var box = showFastBox({title: getLang('ads_posts_sure_archive_title'), dark: true, width: 430, bodyStyle: 'line-height: 160%; padding: 16px 20px;'}, getLang('ads_posts_sure_archive_text'), getLang('ads_posts_archive_btn'), function() {
        box.hide();
        doArchivePost(ad_id, status, hash, from);
      }, getLang('global_cancel'));
    } else {
      doArchivePost(ad_id, status, hash, from);
    }
    return false;
  }
};

try{stManager.done('exchange.js');}catch(e){}
