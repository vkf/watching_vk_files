function doChangeMail(opts) {
  var params = {
    act: 'do_change_mail',
    hash: cur.changeMailHash
  };

  params.newmail = ge(opts.input).value;
  if (!params.newmail) {
    elfocus(opts.input);
    return;
  }
  if (!/[a-z0-9\.\-_]+@[a-z0-9\.\-_]+/i.test(params.newmail)) {
    ge(opts.error).innerHTML = cur.changeMailError;
    show(opts.error);
    elfocus(opts.input);
    return;
  }
  hide(opts.error);
  ajax.post('al_register.php', params, {onDone: function(res, t) {
    if (!res) {
      if (opts.handler) opts.handler(t);
      return;
    }
    ge(opts.error).innerHTML = res;
    show(opts.error);
    elfocus(opts.input);
  }, progress: opts.progress});
}

try{stManager.done('uncommon.js');}catch(e){}
