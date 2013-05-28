var ProfileEditorJob = {

  init: function() {
    cur.globalCounter = 0;
    cur.worksCount = 0;

    selectsData.setCountries(cur.selData.countries_list);
    for (var i in cur.selData.countries) {
      selectsData.setCities(i, cur.selData.countries[i]);
    }

    if (!isVisible('works')) {
      cur.worksCount = cur.works.length;
      if (cur.worksCount) {
        for (var i = 0; i < cur.works.length; ++i) {
          ge('works').appendChild(this.genWorkRow(cur.works[i].id));
          cur.works[i] = this.initWorkRow(cur.works[i]);
        }
      } else {
        this.addWork();
      }
      show('works');
    }

    if (cur.worksCount >= 7) {
      hide('add_work_link');
    } else {
      show('add_work_link');
    }
  },

  genOneRow: function(field, id, label, params, additional) {
    var key = field + id;
    if (!params) {
      params = '';
    }
    if (!additional) {
      additional = '';
    }
    return '<div class="pedit_edu_row" id="row_' + key + '">' +
              '<div class="label fl_l ta_r">' + label + '</div>' +
              '<div class="labeled fl_l"><input id="' + key + '" name="' + key + '" ' + params + '/></div>' +
           additional + '</div>';
  },

  genWorkRow: function(work_id) {
    return ce('div', {
      className: 'pedit_edu_big_row',
      id: 'work' + work_id,
      innerHTML: '<div id="content' + work_id + '">' +
        this.genOneRow('country', work_id, getLang('select_country'), '',
        '<img src="/images/upload.gif" id="progress' + work_id + '" />' +
        '<a class="fl_r" onclick="ProfileEditorJob.deleteWork(' + work_id + ')">' + getLang('global_delete') + '</a>') +
        this.genOneRow('city', work_id, getLang('select_city')) +
        '<div id="details' + work_id + '" style="display: none">' +
          this.genOneRow('company', work_id, getLang('select_company'), 'type="text" class="text"') +
          this.genOneRow('start', work_id, getLang('select_work_start')) +
          this.genOneRow('finish', work_id, getLang('select_work_finish')) +
          this.genOneRow('position', work_id, getLang('select_work_position'), 'id="position' + work_id + '_name"') +
        '</div></div>' +
        '<div class="deleted" id="deleted' + work_id + '"><div></div>' +
          '<a class="fl_r" onclick="ProfileEditorJob.restoreWork(' + work_id + ')">' + getLang('global_dont_delete') + '</a>' +
        '</div><div class="separator"><div></div></div>'
    }, {display: 'none'});
  },

  get_by_id: function(elem, id) {
    if (elem.id == id) {
      return elem;
    }
    for (var i = 0; i < elem.childNodes.length; ++i) {
      var result = this.get_by_id(elem.childNodes[i], id);
      if (result) {
        return result;
      }
    }
    return false;
  },

  initWorkRow: function(work, elem) {
    var g = elem ? function(id) { return ProfileEditorJob.get_by_id(elem, id); } : ge;
    work.uiStart = new Dropdown(g('start' + work.id), [[0, getLang('select_year_not_selected')]].concat(cur.selData.years), {
      width: 200,
      autocomplete: true,
      placeholder: getLang('select_year_not_selected'),
      placeholderColor: '#000',
      noResult: getLang('select_year_not_found'),
      onChange: function(value) {
        value = intval(value);
        var new_finish_data = [];
        if (!value) {
          work.uiStart.clear();
          new_finish_data = cur.selData.years;
        } else {
          var finish_value = intval(work.uiFinish.val());
          if (finish_value && finish_value < value) {
            work.uiFinish.val(value);
          }
          for (var i = 0; i < cur.selData.years.length; ++i) {
            if (cur.selData.years[i][0] >= value) {
              new_finish_data.push(cur.selData.years[i]);
            }
          }
        }
        work.uiFinish.setOptions({defaultItems: [[0, getLang('select_year_not_selected')]].concat(new_finish_data)});
        work.uiFinish.setData(new_finish_data);
      }
    });
    work.uiStart.setData(cur.selData.years);
    work.uiFinish = new Dropdown(g('finish' + work.id), [[0, getLang('select_year_not_selected')]].concat(cur.selData.years), {
      width: 200,
      autocomplete: true,
      placeholder: getLang('select_year_not_selected'),
      placeholderColor: '#000',
      noResult: getLang('select_year_not_found'),
      onChange: function(value) {
        value = intval(value);
        var new_start_data = [];
        if (!value) {
          work.uiFinish.clear();
          new_start_data = cur.selData.years;
        } else {
          var start_value = intval(work.uiStart.val());
          if (start_value && start_value > value) {
            work.uiStart.val(value);
          }
          for (var i = 0; i < cur.selData.years.length; ++i) {
            if (cur.selData.years[i][0] <= value) {
              new_start_data.push(cur.selData.years[i]);
            }
          }
        }
        work.uiStart.setOptions({defaultItems: [[0, getLang('select_year_not_selected')]].concat(new_start_data)});
        work.uiStart.setData(new_start_data);
      }
    });
    work.uiFinish.setData(cur.selData.years);

    work.uiStart.val(work.start, true);
    work.uiFinish.val(work.finish, true);

    work.uiPosition = new Selector(g('position' + work.id), 'select.php?act=apositions', {
      width: 200,
      multiselect: false,
      noResult: getLang('select_work_position_select'),
      introText: getLang('select_work_position_select'),
      selectedItems: [work.position_val],
      dropdown: false,
      enableCustom: true,
      progressBar: 'progress' + work.id,
      onChange: function(value) {
        var val = intval(value);
        if (!val) {
          work.uiPosition.clear();
        }
      }
    });

    work.uiCity = new CitySelect(g('city' + work.id), g('row_city' + work.id), {
      width: 200,
      progressBar: 'progress' + work.id,
      country: work.country,
      city: work.city_val,
      onChange: function(value) {
        if (intval(value)) {
          show('details' + work.id);
        } else {
          hide('details' + work.id);
        }
      }
    });
    work.uiCountry = new CountrySelect(g('country' + work.id), g('row_country' + work.id), {
      width: 200,
      progressBar: 'progress' + work.id,
      country: work.country_val,
      citySelect: work.uiCity
    });

    g('company' + work.id).value = winToUtf(work.company_name);
    //g('position' + work.id).value = winToUtf(work.position);

    g('work' + work.id).style.display = 'block';
    if (work.city) {
      g('details' + work.id).style.display = 'block';
    }

    return work;
  },

  addWork: function() {
    if (cur.worksCount >= 7) {
      return false;
    }
    var new_work = {
      id: -(++cur.globalCounter),
      country: cur.selData.mem.country,
      country_val: cur.selData.mem.country_val,
      city: cur.selData.mem.city,
      city_val: cur.selData.mem.city_val,
      company_name: '',
      start: 0,
      finish: 0,
      position: 0,
      position_val: ''
    };
    ge('works').appendChild(this.genWorkRow(new_work.id));
    new_work = this.initWorkRow(new_work);
    if (!cur.works.length) {
      cur.works = new Array();
    }
    cur.works.push(new_work);
    ++cur.worksCount;
    if (cur.worksCount >= 7) {
      hide('add_work_link');
    }
    return false;
  },

  getIndex: function(data, id) {
    for (var i = 0; i < data.length; ++i) {
      if (data[i].id == id) {
        return i;
      }
    }
    return false;
  },

  deleteWork: function(id) {
    --cur.worksCount;
    show('add_work_link');
    if ((ge('company' + id).value.length) || (ge('position' + id).value.length) || (id > 0)) {
      hide('content' + id);
      ge('deleted' + id).firstChild.innerHTML = getLang('profileEdit_work_will_be_deleted');
      show('deleted' + id);
    } else {
      var index = this.getIndex(cur.works, id);
      cur.works[index] = cur.works[cur.works.length - 1];
      cur.works.pop();
      ge('work' + id).parentNode.removeChild(ge('work' + id));
      if (cur.works.length == 0) {
        this.addWork();
      }
    }
    return false;
  },

  restoreWork: function(id) {
    if (cur.worksCount >= 7) {
      return false;
    }
    hide('deleted' + id);
    show('content' + id);
    ++cur.worksCount;
    if (cur.worksCount >= 7) {
      hide('add_work_link');
    }
    return false;
  },

  addFields: function() {
    var params = arguments[0];
    var id = arguments[1];
    var index = arguments[2];
    for (var i = 3; i < arguments.length; ++i) {
      if (intval(ge(arguments[i] + id).value)) {
        params[arguments[i] + index] = ge(arguments[i] + id).value;
      }
    }
    return params;
  },

  addTextFields: function() {
    var params = arguments[0];
    var id = arguments[1];
    var index = arguments[2];
    for (var i = 3; i < arguments.length; ++i) {
      if (ge(arguments[i] + id).value.length) {
        params[arguments[i] + index] = ge(arguments[i] + id).value;
      }
    }
    return params;
  },

  saveWorks: function(btn) {
    var params = {act: 'a_save_career', hash: ge('hash').value};
    for (var i = 0; i < cur.works.length; ++i) {
      var id = cur.works[i].id;
      params['id' + i] = id;
      if (isVisible('content' + id) && (ge('company' + id).value.length || ge('position' + id).value.length)) {
        params = this.addFields(params, id, i, 'country', 'city', 'start', 'finish');
        params = this.addTextFields(params, id, i, 'company');
        var position_val = cur.works[i].uiPosition.val_full(), position = position_val[1] || '';
        if (position.length) {
          params['position' + i] = position;
        }
      } else {
        params['deleted' + i] = 1;
      }
    }

    var doneHandler = function(response) {
      var to_remove = [];
      for (var i = 0; i < cur.works.length; ++i) {
        var new_work_id = response['res' + i];
        if (intval(new_work_id)) {
          cur.works[i] = this.updateWork(cur.works[i], new_work_id, ge('works'));
        } else {
          to_remove.push(i);
        }
      }
      for (var i = 0; i < to_remove.length; ++i) {
        var index = to_remove[i];
        ge('work' + cur.works[index].id).parentNode.removeChild(ge('work' + cur.works[index].id));
        cur.works[index] = cur.works[cur.works.length - 1];
        for (var j = i + 1; j < to_remove.length; ++j) {
          if (to_remove[j] == cur.works.length - 1) {
            to_remove[j] = index;
          }
        }
        cur.works.pop();
      }
      cur.worksCount = cur.works.length;
      if (cur.worksCount >= 7) {
        hide('add_work_link');
      } else {
        show('add_work_link');
      }
      if (!cur.worksCount) {
        this.addWork();
      }
    }

    ajax.post('al_profileEdit.php', params, {
      onDone: function (job_data) {
        doneHandler.call(ProfileEditorJob, job_data);
        ProfileEditor.showMsg(getLang('profileEdit_works_saved'));
      },
      showProgress: lockButton.pbind(btn),
      hideProgress: unlockButton.pbind(btn)
    });
    return false;
  },

  updateWork: function(old_work, new_work_id, parent) {
    old_work.country = old_work.uiCountry.val();
    old_work.country_val = old_work.uiCountry.val_full();
    old_work.city = old_work.uiCity.val();
    old_work.city_val = old_work.uiCity.val_full();
    old_work.company_name = ge('company' + old_work.id).value;
    old_work.start = old_work.uiStart.val();
    old_work.finish = old_work.uiFinish.val();
    old_work.position = old_work.uiPosition.val();
    old_work.position_val = old_work.uiPosition.val_full();

    var new_elem = this.genWorkRow(new_work_id);
    var old_elem = ge('work' + old_work.id);
    old_work.id = new_work_id;
    new_work = this.initWorkRow(old_work, new_elem);
    parent.replaceChild(new_elem, old_elem);

    return new_work;
  },

  workChanged: function(work) {
    var old_position = work.position_val[1] || '', position = (work.uiPosition.val_full() || [])[1] || '';
    return !isVisible('content' + work.id) ||
           work.country != work.uiCountry.val() || work.city != work.uiCity.val() ||
           winToUtf(work.company_name) != ge('company' + work.id).value || winToUtf(old_position) != position ||
           work.start != work.uiStart.val() || work.finish != work.uiFinish.val();
  }
};

try{stManager.done('profile_edit_job.js');}catch(e){}