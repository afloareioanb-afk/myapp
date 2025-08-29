// Safari compatibility polyfills
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}



if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;
    do {
      if (el.matches(s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

// Polyfill for URLSearchParams for older Safari versions
if (typeof URLSearchParams === 'undefined') {
  window.URLSearchParams = function(searchString) {
    this.searchString = searchString || '';
    this.params = {};
    if (this.searchString) {
      var pairs = this.searchString.substring(1).split('&');
      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i].split('=');
        if (pair[0]) {
          this.params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }
      }
    }
  };
  
  URLSearchParams.prototype.get = function(name) {
    return this.params[name] || null;
  };
  
  URLSearchParams.prototype.set = function(name, value) {
    this.params[name] = value;
  };
  
  URLSearchParams.prototype.toString = function() {
    var pairs = [];
    for (var key in this.params) {
      if (this.params.hasOwnProperty(key)) {
        pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(this.params[key]));
      }
    }
    return pairs.length ? '?' + pairs.join('&') : '';
  };
}

// New schema keys
const META_KEYS = ["app_name", "po_name", "app_type", "app_type_other"];
const YESNO_KEYS = [
  // SLO/SLA
  "slo_exists", "slo_latency", "slo_availability", "slo_error_budget",
  // DR
  "dr_plan", "dr_rto_rpo", "dr_tested",
  // Best Practices
  "bp_runbooks", "bp_spof", "bp_noise", "bp_mttr",
];



const LOCATIONS = ["gcp", "onprem", "hybrid"];
const CAPABILITIES = ["frontend", "backend", "apis"];
const CATEGORIES = ["monitoring", "alerting", "reporting", "stip"];
const PROVIDERS = {
  monitoring: ["newrelic", "splunk"],
  alerting: ["newrelic", "splunk"],
};

// Updated monitoring items - removed "SYNT tests" and "BROWSER (dashboard)" from backend and APIs
const MON_ITEMS = {
  newrelic: ["APM (dashboard)", "INFRA (dashboard)"],
  splunk: [
    "Response times","HTTP Response Codes","Error Rate","Throughput","Availability","Anomalies","DB connections","Restarts/Uptime"
  ],
};

const ALERT_ITEMS = {
  newrelic: ["Availability", "Error rate"],
  splunk: ["Critical errors", "Error Rate"],
};

function createYesNo(container, key) {
  const yes = document.createElement('span');
  yes.className = 'pill yes';
  yes.textContent = 'Yes';
  yes.addEventListener('click', function() { setAnswer(key, true); });
  
  const no = document.createElement('span');
  no.className = 'pill no';
  no.textContent = 'No';
  no.addEventListener('click', function() { setAnswer(key, false); });
  
  // Always append Yes and No first
  container.appendChild(yes);
  container.appendChild(no);
  
  // Add N/A option for all questions
  const na = document.createElement('span');
  na.className = 'pill na';
  na.textContent = 'N/A';
  na.addEventListener('click', function() { setAnswer(key, 'na'); });
  container.appendChild(na);
}

function getState() {
  const params = new URLSearchParams(location.search);
  const state = {};
  // Meta
  META_KEYS.forEach(function(k){ state[k] = params.get(k) || ''; });
  // Selected location
  state.loc_selected = params.get('loc_selected') || '';
  // Yes/No
  YESNO_KEYS.forEach(function(key) {
    const param = params.get(key);
    state[key] = param === '1' ? true : param === '0' ? false : param === 'na' ? 'na' : null;
  });
  

  // Locations schema: locations[loc][capability] yes/no and drilldowns
  state.locations = {};
  LOCATIONS.forEach(function(loc) {
    state.locations[loc] = {};
    CAPABILITIES.forEach(function(cap) {
      const k = 'loc_' + loc + '_' + cap;
      const v = params.get(k);
      const parsed = v === '1' ? true : v === '0' ? false : v === 'na' ? 'na' : null;
      state.locations[loc][cap] = parsed;
      // expose capability value at top-level for UI highlight
      state[k] = parsed;
      // drilldowns multi-select as CSV: loc_loc_cat_provider=item1|item2
      CATEGORIES.forEach(function(cat) {
        if (cat === 'reporting' || cat === 'stip') return; // simple yes/no
        (PROVIDERS[cat]||[]).forEach(function(prov) {
          const dk = 'loc_' + loc + '_' + cap + '_' + cat + '_' + prov;
          const raw = params.get(dk);
          state[dk] = raw ? raw.split('|') : [];
        });
      });
      // simple yes/no for reporting & stip
      ['reporting','stip'].forEach(function(simple){
        const sk = 'loc_' + loc + '_' + cap + '_' + simple;
        const sv = params.get(sk);
        state[sk] = sv === '1' ? true : sv === '0' ? false : sv === 'na' ? 'na' : null;
      });
    });
  });
  return state;
}

function setAnswer(key, value) {
  const params = new URLSearchParams(location.search);
  if (typeof value === 'boolean') {
    params.set(key, value ? '1' : '0');
  } else if (typeof value === 'string') {
    // support 'na' option
    if (value === 'na') params.set(key, 'na'); else params.set(key, value);
  }
  
  // Auto-set drill-down questions to N/A when capability is NO
  if (key.includes('locations_') && (key.includes('_frontend') || key.includes('_backend') || key.includes('_apis'))) {
    const parts = key.split('_');
    const loc = parts[1];
    const cap = parts[2];
    
    if (value === false) {
      // When capability is NO, set Reporting and Stip integration to N/A
      ['reporting', 'stip'].forEach(function(simple) {
        const drillKey = 'loc_' + loc + '_' + cap + '_' + simple;
        params.set(drillKey, 'na');
      });
    }
  }
  
  // Auto-set SLO/SLA sub-questions to N/A when slo_exists is NO
  if (key === 'slo_exists' && value === false) {
    // When SLO/SLA structure is NO, set sub-questions to N/A
    ['slo_latency', 'slo_availability', 'slo_error_budget'].forEach(function(sloKey) {
      params.set(sloKey, 'na');
    });
  }
  
  const newUrl = location.pathname + (params.toString() ? '?' + params.toString() : '');
  if (typeof history.replaceState === 'function') {
    history.replaceState(null, '', newUrl);
  } else {
    // Fallback for older browsers
    location.hash = newUrl;
  }
  render();
}

function resetAll() {
  if (typeof history.replaceState === 'function') {
    history.replaceState(null, '', location.pathname);
  } else {
    location.hash = location.pathname;
  }
  render();
}

function copyShareableLink() {
  const url = location.href;
  // Safari-compatible clipboard handling
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(url).then(function() {
      flash('Link copied to clipboard');
    }).catch(function() {
      prompt('Copy this link:', url);
    });
  } else {
    // Fallback for older browsers
    prompt('Copy this link:', url);
  }
}

function flash(message) {
  const el = document.createElement('div');
  el.textContent = message;
  el.style.position = 'fixed';
  el.style.bottom = '20px';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%)';
  el.style.webkitTransform = 'translateX(-50%)';
  el.style.background = '#1e285a';
  el.style.border = '1px solid rgba(255,255,255,0.15)';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.color = 'white';
  el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.35)';
  el.style.zIndex = '9999';
  document.body.appendChild(el);
  setTimeout(function() { 
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }, 1600);
}

function updateExportButtonStates(pct) {
  const exportJsonBtn = document.getElementById('export-json');
  const exportCsvBtn = document.getElementById('export-csv');
  
  if (pct === 100) {
    // Enable export buttons when 100% complete
    if (exportJsonBtn) {
      exportJsonBtn.disabled = false;
      exportJsonBtn.classList.remove('disabled');
      exportJsonBtn.title = 'Export questionnaire data as JSON';
    }
    if (exportCsvBtn) {
      exportCsvBtn.disabled = false;
      exportCsvBtn.classList.remove('disabled');
      exportCsvBtn.title = 'Export questionnaire data as CSV';
    }
  } else {
    // Disable export buttons when not 100% complete
    if (exportJsonBtn) {
      exportJsonBtn.disabled = true;
      exportJsonBtn.classList.add('disabled');
      exportJsonBtn.title = 'Complete all questions to enable export (' + pct + '% answered)';
    }
    if (exportCsvBtn) {
      exportCsvBtn.disabled = true;
      exportCsvBtn.classList.add('disabled');
      exportCsvBtn.title = 'Complete all questions to enable export (' + pct + '% answered)';
    }
  }
}

function exportJSON() {
  // Check if required fields are filled
  const appName = document.getElementById('app_name').value.trim();
  const poName = document.getElementById('po_name').value.trim();
  
  if (!appName || !poName) {
    alert('Please fill in both Application name and PO Name (marked with *) before exporting.');
    return;
  }
  
  // Check if questionnaire is 100% complete
  const progressLabel = document.getElementById('progress-label');
  if (progressLabel && !progressLabel.textContent.includes('100%')) {
    alert('Please complete all questions before exporting. Current progress: ' + progressLabel.textContent);
    return;
  }
  
  const state = collectAnswers();
  const jsonString = JSON.stringify(state, null, 2);
  
  // Safari-compatible file download
  if (window.Blob && window.URL && window.URL.createObjectURL) {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sre-readiness.json';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 100);
  } else {
    // Fallback for older browsers
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonString);
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'sre-readiness.json';
    a.click();
  }
}

function exportCSV() {
  // Check if required fields are filled
  const appName = document.getElementById('app_name').value.trim();
  const poName = document.getElementById('po_name').value.trim();
  
  if (!appName || !poName) {
    alert('Please fill in both Application name and PO Name (marked with *) before exporting.');
    return;
  }
  
  // Check if questionnaire is 100% complete
  const progressLabel = document.getElementById('progress-label');
  if (progressLabel && !progressLabel.textContent.includes('100%')) {
    alert('Please complete all questions before exporting. Current progress: ' + progressLabel.textContent);
    return;
  }
  
  const state = collectAnswers();
  const csv = convertToCSV(state);
  
  // Safari-compatible file download
  if (window.Blob && window.URL && window.URL.createObjectURL) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sre-readiness.csv';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 100);
  } else {
    // Fallback for older browsers
    const dataStr = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'sre-readiness.csv';
    a.click();
  }
}

function convertToCSV(data) {
  const rows = [];
  
  // Add metadata
  rows.push(['Application Name', data.app_name || '']);
  rows.push(['PO Name', data.po_name || '']);
  rows.push(['Application Type', data.app_type || '']);
  if (data.app_type === 'other') {
    rows.push(['Application Type (Other)', data.app_type_other || '']);
  }
  rows.push([]);
  
  // Add SLO/SLA
  rows.push(['SLO/SLA Structure Exists', data.slo_exists ? 'Yes' : 'No']);
  if (data.slo_exists) {
    rows.push(['  Latency SLO', data.slo_latency ? 'Yes' : 'No']);
    rows.push(['  Availability SLO', data.slo_availability ? 'Yes' : 'No']);
    rows.push(['  Error Budget Defined', data.slo_error_budget ? 'Yes' : 'No']);
  }
  
  rows.push([]);
  
  // Add DR
  rows.push(['DR Plan Documented', data.dr_plan ? 'Yes' : 'No']);
  rows.push(['RTO/RPO Defined', data.dr_rto_rpo ? 'Yes' : 'No']);
  rows.push(['DR Plan Tested (12 months)', data.dr_tested ? 'Yes' : 'No']);
  
  rows.push([]);
  
  // Add Best Practices
  rows.push(['Runbooks/Support Guides', data.bp_runbooks ? 'Yes' : 'No']);
  rows.push(['Critical Failures Documented', data.bp_spof ? 'Yes' : 'No']);
  rows.push(['Alert Noise Documented', data.bp_noise ? 'Yes' : 'No']);
  rows.push(['MTTR Tracked', data.bp_mttr ? 'Yes' : 'No']);
  rows.push([]);
  
  // Add Locations
  if (data.locations) {
    Object.keys(data.locations).forEach(function(loc) {
      const caps = data.locations[loc];
      rows.push(['Location: ' + loc.toUpperCase()]);
      Object.keys(caps).forEach(function(cap) {
        const enabled = caps[cap];
        if (enabled) {
          rows.push(['  ' + cap.charAt(0).toUpperCase() + cap.slice(1) + ' Component', 'Yes']);
          
          // Add monitoring details
          const monKey = 'loc_' + loc + '_' + cap + '_monitoring';
          if (data[monKey]) {
            Object.keys(data[monKey]).forEach(function(provider) {
              const items = data[monKey][provider];
              if (items && items.length > 0) {
                rows.push(['    ' + provider + ' Monitoring', items.join(', ')]);
              }
            });
          }
          
          // Add alerting details
          const alertKey = 'loc_' + loc + '_' + cap + '_alerting';
          if (data[alertKey]) {
            Object.keys(data[alertKey]).forEach(function(provider) {
              const items = data[alertKey][provider];
              if (items && items.length > 0) {
                rows.push(['    ' + provider + ' Alerting', items.join(', ')]);
              }
            });
          }
          
          // Add reporting and stip
          const repKey = 'loc_' + loc + '_' + cap + '_reporting';
          const stipKey = 'loc_' + loc + '_' + cap + '_stip';
          rows.push(['    Reporting', data[repKey] ? 'Yes' : 'No']);
          rows.push(['    Stip Integration', data[stipKey] ? 'Yes' : 'No']);
        }
      });
    });
  }
  
  return rows.map(function(row) {
    return row.map(function(cell) {
      return '"' + cell + '"';
    }).join(',');
  }).join('\n');
}

function collectAnswers() {
  const params = new URLSearchParams(location.search);
  const data = {};
  // meta
  META_KEYS.forEach(function(k){ data[k] = params.get(k) || ''; });
  // yes/no
  YESNO_KEYS.forEach(function(key) {
    const v = params.get(key);
    data[key] = v === '1' ? true : v === '0' ? false : v === 'na' ? 'na' : null;
  });
  // locations
  data.locations = {};
  LOCATIONS.forEach(function(loc){
    data.locations[loc] = {};
    CAPABILITIES.forEach(function(cap){
      const k = 'loc_' + loc + '_' + cap;
      const v = params.get(k);
      data.locations[loc][cap] = v === '1' ? true : v === '0' ? false : v === 'na' ? 'na' : null;
      data.locations[loc][cap + '_monitoring'] = {};
      (PROVIDERS.monitoring||[]).forEach(function(prov){
        const dk = 'loc_' + loc + '_' + cap + '_monitoring_' + prov;
        const raw = params.get(dk);
        data.locations[loc][cap + '_monitoring'][prov] = raw ? raw.split('|') : [];
      });
      data.locations[loc][cap + '_alerting'] = {};
      (PROVIDERS.alerting||[]).forEach(function(prov){
        const ak = 'loc_' + loc + '_' + cap + '_alerting_' + prov;
        const raw = params.get(ak);
        data.locations[loc][cap + '_alerting'][prov] = raw ? raw.split('|') : [];
      });
      ['reporting','stip'].forEach(function(simple){
        const sk = 'loc_' + loc + '_' + cap + '_' + simple;
        const sv = params.get(sk);
        data.locations[loc][cap + '_' + simple] = sv === '1' ? true : sv === '0' ? false : sv === 'na' ? 'na' : null;
      });
    });
  });
  return data;
}

function hydrateSelections(state) {
  document.querySelectorAll('.options').forEach(function(container) {
    const key = container.getAttribute('data-key');
    const pills = container.querySelectorAll('.pill');
    pills.forEach(function(p){ p.classList.remove('selected'); });
    const val = state[key];
    
    // All questions have Yes/No/N/A pills (index 0, 1, and 2)
    if (val === true && pills[0]) pills[0].classList.add('selected');
    if (val === false && pills[1]) pills[1].classList.add('selected');
    if (val === 'na' && pills[2]) pills[2].classList.add('selected');
  });

  // hydrate provider chips selection state
  document.querySelectorAll('.chipset .pill').forEach(function(chip){
    const key = chip.dataset.key;
    const item = chip.dataset.item;
    if (!key || !item) return;
    const params = new URLSearchParams(location.search);
    const raw = params.get(key) || '';
    const list = raw ? raw.split('|') : [];
    if (list.indexOf(item) >= 0) chip.classList.add('selected'); 
    else chip.classList.remove('selected');
  });
}

function render() {
  const state = getState();
  // rebuild dynamic sections first
  buildLocations();
  // (re)build all yes/no option controls
  buildYesNoOptions();
  // hydrate selections and visuals
  hydrateSelections(state);
  renderProgress(state);
  updateDrillVisibility(state);
  // highlight selected location button
  const locSeg = document.getElementById('location_segmented');
  if (locSeg) {
    locSeg.querySelectorAll('button').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-loc') === state.loc_selected);
    });
  }
  renderOnboardStats(state);
}

function buildYesNoOptions() {
  document.querySelectorAll('.options').forEach(function(container){
    const key = container.getAttribute('data-key');
    container.innerHTML = '';
    createYesNo(container, key);
  });
}

function buildLocations() {
  const root = document.getElementById('locations-root');
  root.innerHTML = '';
  const selected = new URLSearchParams(location.search).get('loc_selected');
  const list = selected ? [selected] : [];
  if (!list.length) {
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = 'Select a location (GCP / On-Prem / Hybrid) to continue.';
    root.appendChild(hint);
    return;
  }
  list.forEach(function(loc){
    const locCard = document.createElement('div');
    locCard.className = 'card';
    const title = loc.charAt(0).toUpperCase() + loc.slice(1);
    locCard.innerHTML = '<h3 style="margin-top:0;">' + title + '</h3>';

    CAPABILITIES.forEach(function(cap){
      const capWrap = document.createElement('div');
      capWrap.className = 'question cap-header';
      const capLabel = cap === 'apis' ? 'Exposes APIs' : (cap === 'frontend' ? 'Frontend' : 'Backend');
      capWrap.innerHTML = '<label>' + capLabel + '</label><div class="options" data-key="loc_' + loc + '_' + cap + '"></div>';

      // drilldowns
      const drill = document.createElement('div');
      drill.className = 'drill';
      drill.style.marginLeft = '8px';
      drill.style.display = 'none';
      drill.setAttribute('data-drill-for', 'loc_' + loc + '_' + cap);

      // Monitoring
      const mon = document.createElement('div');
      mon.className = 'question';
      mon.innerHTML = '<label>Monitoring</label>';
      const monGrid = document.createElement('div');
      monGrid.className = 'provider-grid';
      PROVIDERS.monitoring.forEach(function(prov){
        const provWrap = document.createElement('div');
        provWrap.className = 'provider';
        provWrap.innerHTML = '<h4>' + prettyProv(prov) + '</h4>';
        const items = MON_ITEMS[prov];
        const chips = document.createElement('div');
        chips.className = 'chipset';
        items.forEach(function(item){
          const chip = document.createElement('span');
          chip.className = 'pill';
          chip.textContent = item;
          chip.dataset.key = 'loc_' + loc + '_' + cap + '_monitoring_' + prov;
          chip.dataset.item = item;
          chip.addEventListener('click', function(){ toggleChip('loc_' + loc + '_' + cap + '_monitoring_' + prov, item); });
          chips.appendChild(chip);
        });
        provWrap.appendChild(chips);
        monGrid.appendChild(provWrap);
      });
      mon.appendChild(monGrid);

      // Alerting
      const al = document.createElement('div');
      al.className = 'question';
      al.innerHTML = '<label>Alerting</label>';
      const alGrid = document.createElement('div');
      alGrid.className = 'provider-grid';
      PROVIDERS.alerting.forEach(function(prov){
        const provWrap = document.createElement('div');
        provWrap.className = 'provider';
        provWrap.innerHTML = '<h4>' + prettyProv(prov) + '</h4>';
        const items = ALERT_ITEMS[prov];
        const chips = document.createElement('div');
        chips.className = 'chipset';
        items.forEach(function(item){
          const chip = document.createElement('span');
          chip.className = 'pill';
          chip.textContent = item;
          chip.dataset.key = 'loc_' + loc + '_' + cap + '_alerting_' + prov;
          chip.dataset.item = item;
          chip.addEventListener('click', function(){ toggleChip('loc_' + loc + '_' + cap + '_alerting_' + prov, item); });
          chips.appendChild(chip);
        });
        provWrap.appendChild(chips);
        alGrid.appendChild(provWrap);
      });
      al.appendChild(alGrid);

      // Reporting & Stip (yes/no)
      const rep = document.createElement('div');
      rep.className = 'question';
      rep.innerHTML = '<label>Reporting</label><div class="options" data-key="loc_' + loc + '_' + cap + '_reporting"></div>';
      const stip = document.createElement('div');
      stip.className = 'question';
      stip.innerHTML = '<label>Stip integration</label><div class="options" data-key="loc_' + loc + '_' + cap + '_stip"></div>';

      drill.appendChild(mon);
      drill.appendChild(al);
      drill.appendChild(rep);
      drill.appendChild(stip);

      locCard.appendChild(capWrap);
      locCard.appendChild(drill);
    });

    root.appendChild(locCard);
  });

  // create yes/no for all generated options
  buildYesNoOptions();
}

function toggleChip(key, item) {
  const params = new URLSearchParams(location.search);
  const raw = params.get(key) || '';
  const list = raw ? raw.split('|') : [];
  const idx = list.indexOf(item);
  if (idx >= 0) list.splice(idx, 1); 
  else list.push(item);
  params.set(key, list.join('|'));
  const newUrl = location.pathname + (params.toString() ? '?' + params.toString() : '');
  if (typeof history.replaceState === 'function') {
    history.replaceState(null, '', newUrl);
  } else {
    location.hash = newUrl;
  }
  render();
}

function prettyProv(k){ return k === 'newrelic' ? 'New Relic' : 'Splunk'; }

function renderProgress(state) {
  // Count required fields first
  let total = 2; // Application name and PO Name
  let answered = 0;
  
  // Check if required fields are filled
  if (state.app_name && state.app_name.trim()) answered += 1;
  if (state.po_name && state.po_name.trim()) answered += 1;
  
  // Count yes/no across keys and generated location flags
  total += YESNO_KEYS.length;
  answered += YESNO_KEYS.map(function(k){ 
    const v = state[k];
    return v === true || v === false || v === 'na';
  }).filter(function(answered){ return answered; }).length;
  
  const locs = state.loc_selected ? [state.loc_selected] : [];
  locs.forEach(function(loc){
    CAPABILITIES.forEach(function(cap){
      total += 1; // capability yes/no
      const v = state.locations && state.locations[loc] && state.locations[loc][cap];
      if (v===true||v===false||v==='na') answered += 1;
      // Sub-questions always count in total, but are only answered when capability is true
      total += 2;
      if (v === true) {
        // When capability is YES, count the actual answers to sub-questions
        ['reporting','stip'].forEach(function(simple){
          const key = 'loc_' + loc + '_' + cap + '_' + simple;
          const sv = state[key];
          if (sv===true||sv===false||sv==='na') answered += 1;
        });
      } else {
        // When capability is NO or N/A, sub-questions are auto-set to N/A and count as answered
        answered += 2;
      }
    });
  });
  // SLO sub-questions are counted in YESNO_KEYS, but we need to adjust the total
  // since they should only count when slo_exists is true
  if (state.slo_exists !== true) {
    // Remove the 3 SLO sub-questions from total when SLO doesn't exist
    total -= 3;
  }
  const pct = Math.round((answered / total) * 100);
  const bar = document.getElementById('progress-bar-fill');
  const label = document.getElementById('progress-label');
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = pct + '% answered';
  
  // Update export button states based on completion
  updateExportButtonStates(pct);
}

function updateDrillVisibility(state) {
  document.querySelectorAll('[data-drill-for]').forEach(function(el){
    const key = el.getAttribute('data-drill-for');
    let enabled = false;
    if (key.indexOf('loc_') === 0) {
      const parts = key.split('_');
      const loc = parts[1];
      const cap = parts[2];
      enabled = state.locations && state.locations[loc] && state.locations[loc][cap] === true;
    } else {
      enabled = state[key] === true;
    }
    el.style.display = enabled ? '' : 'none';
  });
}

function renderOnboardStats(state) {
  const loc = state.loc_selected;
  const out = {
    frontend: '—', backend: '—', apis: '—',
    frontendMon: '—', frontendAl: '—',
    backendMon: '—', backendAl: '—',
    apisMon: '—', apisAl: '—'
  };
  if (!loc) {
    updateOnboardUI(out);
    return;
  }
  CAPABILITIES.forEach(function(cap){
    if (state.locations && state.locations[loc] && state.locations[loc][cap] !== true) {
      out[cap] = '—';
      out[cap + 'Mon'] = '—';
      out[cap + 'Al'] = '—';
      return;
    }
    // count selected items across monitoring/alerting providers
    let selected = 0; let total = 0;
    // per-category counters
    let selMon = 0, totMon = 0, selAl = 0, totAl = 0;
    // Monitoring
    (PROVIDERS.monitoring||[]).forEach(function(prov){
      const key = 'loc_' + loc + '_' + cap + '_monitoring_' + prov;
      const items = state[key] || [];
      const all = (prov === 'newrelic') ? MON_ITEMS.newrelic : MON_ITEMS.splunk;
      // Exclude N/A by definition – chips are only selected or not
      selected += items.length; total += all.length;
      selMon += items.length; totMon += all.length;
    });
    // Alerting
    (PROVIDERS.alerting||[]).forEach(function(prov){
      const key = 'loc_' + loc + '_' + cap + '_alerting_' + prov;
      const items = state[key] || [];
      const all = (prov === 'newrelic') ? ALERT_ITEMS.newrelic : ALERT_ITEMS.splunk;
      selected += items.length; total += all.length;
      selAl += items.length; totAl += all.length;
    });
    // Reporting/Stip as binary yes/no, exclude N/A from denominator
    ['reporting','stip'].forEach(function(simple){
      const v = state['loc_' + loc + '_' + cap + '_' + simple];
      if (v === true) { selected += 1; total += 1; }
      else if (v === false) { total += 1; }
    });
    out[cap] = total ? Math.round((selected/total)*100) + '%' : '—';
    out[cap + 'Mon'] = totMon ? Math.round((selMon/totMon)*100) + '%' : '—';
    out[cap + 'Al'] = totAl ? Math.round((selAl/totAl)*100) + '%' : '—';
  });
  updateOnboardUI(out);
}

function updateOnboardUI(out) {
  const fe = document.getElementById('onboard-frontend');
  const feM = document.getElementById('onboard-frontend-mon');
  const feA = document.getElementById('onboard-frontend-al');
  const be = document.getElementById('onboard-backend');
  const beM = document.getElementById('onboard-backend-mon');
  const beA = document.getElementById('onboard-backend-al');
  const ap = document.getElementById('onboard-apis');
  const apM = document.getElementById('onboard-apis-mon');
  const apA = document.getElementById('onboard-apis-al');
  applyStat(fe, 'Frontend onboard: ' + out.frontend, out.frontend);
  applyStat(feM, 'Monitor: ' + out.frontendMon, out.frontendMon);
  applyStat(feA, 'Alert: ' + out.frontendAl, out.frontendAl);
  applyStat(be, 'Backend onboard: ' + out.backend, out.backend);
  applyStat(beM, 'Monitor: ' + out.backendMon, out.backendMon);
  applyStat(beA, 'Alert: ' + out.backendAl, out.backendAl);
  applyStat(ap, 'APIs onboard: ' + out.apis, out.apis);
  applyStat(apM, 'Monitor: ' + out.apisMon, out.apisMon);
  applyStat(apA, 'Alert: ' + out.apisAl, out.apisAl);
}

function applyStat(el, text, pctText) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove('stat-green','stat-orange','stat-red');
  const pct = parseInt(String(pctText).replace('%',''), 10);
  if (isNaN(pct)) return;
  if (pct >= 80) el.classList.add('stat-green');
  else if (pct < 20) el.classList.add('stat-red');
  else el.classList.add('stat-orange');
}

// Initialize when DOM is ready
window.addEventListener('DOMContentLoaded', function() {
  // build meta inputs
  const typeSeg = document.getElementById('app_type_segmented');
  typeSeg.querySelectorAll('button').forEach(function(btn){
    btn.addEventListener('click', function(){
      const selected = btn.getAttribute('data-type');
      setAnswer('app_type', selected);
      document.getElementById('app_type_other_wrap').style.display = selected === 'other' ? '' : 'none';
      typeSeg.querySelectorAll('button').forEach(function(b){ b.classList.toggle('active', b===btn); });
    });
  });
  document.getElementById('app_name').addEventListener('input', function(e){ setAnswer('app_name', e.target.value); });
  document.getElementById('po_name').addEventListener('input', function(e){ setAnswer('po_name', e.target.value); });
  document.getElementById('app_type_other').addEventListener('input', function(e){ setAnswer('app_type_other', e.target.value); });

  // initial render builds everything
  // location segmented
  const locSeg = document.getElementById('location_segmented');
  locSeg.querySelectorAll('button').forEach(function(btn){
    btn.addEventListener('click', function(){
      const val = btn.getAttribute('data-loc');
      setAnswer('loc_selected', val);
      // render() will rebuild and highlight
    });
  });
  document.getElementById('export-json').addEventListener('click', exportJSON);
  document.getElementById('export-csv').addEventListener('click', exportCSV);
  document.getElementById('reset').addEventListener('click', resetAll);
  render();
});
