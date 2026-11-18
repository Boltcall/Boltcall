/*! Boltcall Lead Form Embed v1.0 | boltcall.org */
(function () {
  var scriptTag =
    document.currentScript ||
    (function () {
      var all = document.getElementsByTagName('script');
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf('/form.js') !== -1) return all[i];
      }
      return all[all.length - 1];
    })();
  if (!scriptTag) return;

  var userId = scriptTag.getAttribute('data-user-id');
  if (!userId) {
    if (window.console && console.error)
      console.error('[Boltcall] Missing data-user-id on script tag.');
    return;
  }

  var origin = scriptTag.getAttribute('data-origin') || 'https://boltcall.org';
  var endpoint = origin + '/.netlify/functions/lead-webhook/' + encodeURIComponent(userId);
  var defaultSource = scriptTag.getAttribute('data-source') || 'website_form';
  var formSelector = scriptTag.getAttribute('data-forms') || 'form[data-boltcall]';
  var autoMode = scriptTag.getAttribute('data-auto') === 'true';

  function pick(data, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = data[keys[i]];
      if (v && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  }

  function normalize(raw) {
    var email = pick(raw, ['email', 'email_address', 'emailAddress']);
    var phone = pick(raw, [
      'phone', 'phone_number', 'phoneNumber', 'telephone', 'tel', 'mobile', 'cell',
    ]);
    var first = pick(raw, ['first_name', 'firstName', 'fname']);
    var last = pick(raw, ['last_name', 'lastName', 'lname']);
    var full = pick(raw, ['name', 'full_name', 'fullName', 'fullname']);
    if (!full && (first || last)) full = (first + ' ' + last).trim();
    var message = pick(raw, ['message', 'notes', 'comments', 'details']);

    var payload = {
      source: raw.source || defaultSource,
      source_url: window.location.href,
    };
    if (email) payload.email = email;
    if (phone) payload.phone = phone;
    if (full) payload.name = full;
    if (first) payload.first_name = first;
    if (last) payload.last_name = last;
    if (message) payload.message = message;
    if (raw.bc_hp) payload.bc_hp = raw.bc_hp;
    return payload;
  }

  function formToObject(form) {
    var fd = new FormData(form);
    var obj = {};
    fd.forEach(function (value, key) {
      if (/password|card|cvv|ssn|credit/i.test(key)) return;
      if (obj[key] === undefined) obj[key] = value;
    });
    return obj;
  }

  function setBusy(form, busy) {
    var btn = form.querySelector('[type="submit"], button:not([type="button"])');
    if (!btn) return;
    if (busy) {
      if (!btn.hasAttribute('data-bc-original')) {
        btn.setAttribute('data-bc-original', btn.innerHTML);
      }
      btn.disabled = true;
      btn.innerHTML = form.getAttribute('data-loading-text') || 'Sending…';
    } else {
      btn.disabled = false;
      var orig = btn.getAttribute('data-bc-original');
      if (orig !== null) {
        btn.innerHTML = orig;
        btn.removeAttribute('data-bc-original');
      }
    }
  }

  function showMessage(form, selector, message) {
    var el = form.querySelector(selector);
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
      return true;
    }
    return false;
  }

  function send(data) {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalize(data)),
    }).then(function (res) {
      return res.json().then(
        function (body) { return { ok: res.ok, body: body }; },
        function () { return { ok: res.ok, body: {} }; },
      );
    });
  }

  function handleSubmit(e) {
    var form = e.currentTarget;
    e.preventDefault();
    setBusy(form, true);

    send(formToObject(form))
      .then(function (result) {
        if (result.ok) {
          var successUrl = form.getAttribute('data-success-url');
          if (successUrl) {
            window.location.href = successUrl;
            return;
          }
          var msg =
            form.getAttribute('data-success-message') ||
            "Thanks! We'll be in touch shortly.";
          if (!showMessage(form, '[data-boltcall-success]', msg)) {
            try { window.alert(msg); } catch (err) {}
          }
          form.reset();
        } else {
          var errMsg =
            (result.body && result.body.error) ||
            'Something went wrong. Please try again.';
          if (!showMessage(form, '[data-boltcall-error]', errMsg)) {
            try { window.alert(errMsg); } catch (err) {}
          }
        }
      })
      .catch(function (err) {
        if (window.console && console.error)
          console.error('[Boltcall] Submission failed:', err);
        if (!showMessage(form, '[data-boltcall-error]', 'Connection error. Please try again.')) {
          try { window.alert('Connection error. Please try again.'); } catch (e2) {}
        }
      })
      .finally(function () { setBusy(form, false); });
  }

  function attach(form) {
    if (form.__boltcallAttached) return;
    form.__boltcallAttached = true;
    // Honeypot: bots fill every field, people never see this one.
    var hp = document.createElement('input');
    hp.type = 'text'; hp.name = 'bc_hp'; hp.tabIndex = -1; hp.autocomplete = 'off';
    hp.setAttribute('aria-hidden', 'true');
    hp.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
    form.appendChild(hp);
    form.addEventListener('submit', handleSubmit, false);
  }

  function attachAll() {
    var selector = autoMode ? 'form' : formSelector;
    var forms = document.querySelectorAll(selector);
    for (var i = 0; i < forms.length; i++) attach(forms[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachAll);
  } else {
    attachAll();
  }

  if (typeof MutationObserver !== 'undefined') {
    try {
      new MutationObserver(function () { attachAll(); }).observe(
        document.documentElement || document.body,
        { childList: true, subtree: true },
      );
    } catch (e) {}
  }

  window.Boltcall = window.Boltcall || {};
  window.Boltcall.submit = function (data) { return send(data || {}); };
  window.Boltcall.attach = attach;
  window.Boltcall.endpoint = endpoint;
})();
