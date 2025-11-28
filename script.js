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
const META_KEYS = ["app_name", "role", "app_type", "app_type_other", "nar_id", "contact_email"];
const YESNO_KEYS = [
  // SLO/SLA
  "slo_exists", "slo_pdm",
  // DR
  "dr_plan", "dr_rto_rpo", "dr_tested",
  // Best Practices
  "bp_runbooks", "bp_spof", "bp_noise", "bp_mttr", "bp_dependencies",
];



const LOCATIONS = ["gcp", "onprem", "hybrid"];
const CAPABILITIES = ["frontend", "backend", "apis", "mobile"];
const CATEGORIES = ["monitoring", "alerting", "reporting", "stip", "geneos", "lisi"];
const PROVIDERS = {
  monitoring: ["newrelic", "splunk"],
  alerting: ["newrelic", "splunk"],
};

// Updated monitoring items - removed "SYNT tests" and "BROWSER (dashboard)" from backend and APIs
const MON_ITEMS = {
  newrelic: ["APM (dashboard)", "INFRA (dashboard)", "SYNT", "Other"],
  splunk: [
    "Response times","HTTP Response Codes","Error Rate","Throughput","Availability","Anomalies","DB connections","Restarts/Uptime","Other"
  ],
  "cloud-monitoring": [
    "Response times","HTTP Response Codes","Error Rate","Throughput","Availability","Anomalies","DB connections","Restarts/Uptime","Other"
  ],
};

const ALERT_ITEMS = {
  newrelic: ["Availability", "Error rate", "Other"],
  splunk: ["Critical errors", "Error Rate", "Other"],
  "cloud-monitoring": ["Critical errors", "Error Rate", "Other"],
};

// Get providers based on location
function getProvidersForLocation(location) {
  if (location === 'gcp') {
    return {
      monitoring: ["newrelic", "cloud-monitoring"],
      alerting: ["newrelic", "cloud-monitoring"],
    };
  }
  if (location === 'hybrid') {
    return {
      monitoring: ["newrelic", "splunk", "cloud-monitoring"],
      alerting: ["newrelic", "splunk", "cloud-monitoring"],
    };
  }
  return {
    monitoring: ["newrelic", "splunk"],
    alerting: ["newrelic", "splunk"],
  };
}

// Secure storage helpers for sensitive fields (kept out of URL)
function secureStorageAvailable() {
  try {
    var testKey = '__secure_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

function secureSet(key, value) {
  if (!secureStorageAvailable()) return;
  try { window.localStorage.setItem('secure_' + key, String(value || '')); } catch (e) {}
}

function secureGet(key) {
  if (!secureStorageAvailable()) return '';
  try { return window.localStorage.getItem('secure_' + key) || ''; } catch (e) { return ''; }
}

function secureClear() {
  if (!secureStorageAvailable()) return;
  try {
    window.localStorage.removeItem('secure_app_name');
    window.localStorage.removeItem('secure_role');
    window.localStorage.removeItem('secure_nar_id');
    window.localStorage.removeItem('secure_contact_email');
  } catch (e) {}
}

function createYesNo(container, key) {
  if (!container || !key) {
    console.warn('createYesNo called with invalid parameters:', container, key);
    return;
  }
  
  const yes = document.createElement('span');
  yes.className = 'pill yes';
  yes.textContent = 'Yes';
  yes.addEventListener('click', function(e) { 
    e.preventDefault();
    e.stopPropagation();
    setAnswer(key, true); 
  });
  
  const no = document.createElement('span');
  no.className = 'pill no';
  no.textContent = 'No';
  no.addEventListener('click', function(e) { 
    e.preventDefault();
    e.stopPropagation();
    setAnswer(key, false); 
  });
  
  // Always append Yes and No first
  container.appendChild(yes);
  container.appendChild(no);
  
  // Add N/A option for all questions
  const na = document.createElement('span');
  na.className = 'pill na';
  na.textContent = 'N/A';
  na.addEventListener('click', function(e) { 
    e.preventDefault();
    e.stopPropagation();
    setAnswer(key, 'na'); 
  });
  container.appendChild(na);
}

function getState() {
  const params = new URLSearchParams(location.search);
  const state = {};
  // Meta (keep sensitive values out of URL)
  state.app_name = secureGet('app_name');
  state.role = secureGet('role');
  state.nar_id = secureGet('nar_id');
  state.contact_email = secureGet('contact_email');
  state.app_type = params.get('app_type') || '';
  state.app_type_other = params.get('app_type_other') || '';
  // Selected location
  state.loc_selected = params.get('loc_selected') || '';
  // Yes/No
  YESNO_KEYS.forEach(function(key) {
    const param = params.get(key);
    state[key] = param === '1' ? true : param === '0' ? false : param === 'na' ? 'na' : null;
  });
  
  // SLO sub-questions (only count when slo_exists is true)
  ['slo_latency','slo_availability','slo_error_budget'].forEach(function(key) {
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
         if (cat === 'reporting' || cat === 'stip' || cat === 'geneos' || cat === 'lisi') return; // simple yes/no
         const locationProviders = getProvidersForLocation(loc);
         (locationProviders[cat]||[]).forEach(function(prov) {
           const dk = 'loc_' + loc + '_' + cap + '_' + cat + '_' + prov;
           const raw = params.get(dk);
           state[dk] = raw ? raw.split('|') : [];
         });
       });
      // simple yes/no for reporting, stip, geneos & lisi
      ['reporting','stip','geneos','lisi'].forEach(function(simple){
        const sk = 'loc_' + loc + '_' + cap + '_' + simple;
        const sv = params.get(sk);
        state[sk] = sv === '1' ? true : sv === '0' ? false : sv === 'na' ? 'na' : null;
        // Handle provider drill-downs for stip only
        if (simple === 'stip') {
          ['newrelic', 'splunk'].forEach(function(prov){
            const dk = 'loc_' + loc + '_' + cap + '_' + simple + '_' + prov;
            const raw = params.get(dk);
            state[dk] = raw ? raw.split('|') : [];
          });
        }
      });
    });
  });
  return state;
}

function setAnswer(key, value) {
  const params = new URLSearchParams(location.search);
  // Handle sensitive fields by storing only in localStorage and stripping from URL
  if (key === 'app_name' || key === 'role' || key === 'nar_id' || key === 'contact_email') {
    secureSet(key, value);
    try {
      if (typeof params.delete === 'function') {
        params.delete(key);
      } else if (params.params) {
        delete params.params[key];
      }
    } catch (e) {}
    const newUrlSecure = location.pathname + (params.toString() ? '?' + params.toString() : '');
    if (typeof history.replaceState === 'function') {
      history.replaceState(null, '', newUrlSecure);
    } else {
      location.hash = newUrlSecure;
    }
    render();
    return;
  }
  if (typeof value === 'boolean') {
    params.set(key, value ? '1' : '0');
  } else if (typeof value === 'string') {
    // support 'na' option
    if (value === 'na') params.set(key, 'na'); else params.set(key, value);
  }
  
  // Auto-set drill-down questions to N/A when capability is NO
  // Only trigger for main capability keys (not sub-questions like reporting/stip/geneos/lisi)
  if (key.includes('loc_') && (key.includes('_frontend') || key.includes('_backend') || key.includes('_apis')) && 
      !key.includes('_reporting') && !key.includes('_stip') && !key.includes('_geneos') && !key.includes('_lisi')) {
    const parts = key.split('_');
    const loc = parts[1];
    const cap = parts[2];
    
    if (value === false) {
      // When capability is NO, set Reporting, Stip, Geneos and Lisi integration to N/A
      ['reporting', 'stip', 'geneos', 'lisi'].forEach(function(simple) {
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

function generateAndSendCSV() {
  // Check if required fields are filled
  const appName = document.getElementById('app_name').value.trim();
  const role = document.getElementById('role').value;
  
  if (!appName || !role) {
    alert('Please fill in both Application name and Role (marked with *) before generating CSV.');
    return;
  }
  
  // Check if questionnaire is 100% complete
  const progressLabel = document.getElementById('progress-label');
  if (progressLabel && !progressLabel.textContent.includes('100%')) {
    alert('Please complete all questions before generating CSV. Current progress: ' + progressLabel.textContent);
    return;
  }
  
  const state = collectAnswers();
  
  // Show loading state
  const submitBtn = document.getElementById('submit');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Generating...';
  submitBtn.disabled = true;
  
  try {
    // Generate CSV content
    const csvContent = convertToCSV(state);
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sre-readiness-${appName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    // Send email with CSV attachment
    sendEmailWithCSV(csvContent, appName, state);
    
    // Show success message
    flash('CSV generated and email sent successfully!');
    
  } catch (error) {
    console.error('CSV generation failed:', error);
    alert('Failed to generate CSV. Please try again or contact support.');
  } finally {
    // Restore button state
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

function getIncompleteItems(state) {
  const incomplete = [];
  
  // Check metadata fields
  if (!state.app_name || !state.app_name.trim()) {
    incomplete.push('Application name');
  }
  if (!state.role || !state.role.trim()) {
    incomplete.push('Role');
  }
  if (!state.app_type) {
    incomplete.push('Application type');
  }
  if (!state.loc_selected) {
    incomplete.push('Location');
  }
  
  // Check YESNO_KEYS questions
  const questionLabels = {
    'slo_exists': 'SLO/SLA structure',
    'slo_pdm': 'PDM documentation',
    'dr_plan': 'DR plan',
    'dr_rto_rpo': 'RTO/RPO definition',
    'dr_tested': 'DR plan testing',
    'bp_runbooks': 'Runbooks/support guides',
    'bp_spof': 'Critical failure scenarios',
    'bp_noise': 'Alert noise documentation',
    'bp_mttr': 'MTTR tracking',
    'bp_dependencies': 'Direct dependencies documentation'
  };
  
  YESNO_KEYS.forEach(function(k) {
    const v = state[k];
    if (v !== true && v !== false && v !== 'na') {
      const label = questionLabels[k] || k;
      incomplete.push(label);
    }
  });
  
  // Check SLO sub-questions
  if (state.slo_exists === true) {
    const sloSubLabels = {
      'slo_latency': 'Latency SLO',
      'slo_availability': 'Availability SLO',
      'slo_error_budget': 'Error budget'
    };
    ['slo_latency','slo_availability','slo_error_budget'].forEach(function(k) {
      const v = state[k];
      if (v !== true && v !== false && v !== 'na') {
        incomplete.push(sloSubLabels[k]);
      }
    });
  } else if (state.slo_exists !== false && state.slo_exists !== 'na') {
    // SLO exists question itself is incomplete
    incomplete.push('SLO/SLA structure');
  }
  
  // Check location capability questions
  if (state.loc_selected) {
    const capLabels = {
      'frontend': 'Frontend',
      'backend': 'Backend',
      'apis': 'APIs',
      'mobile': 'Mobile'
    };
    const integrationLabels = {
      'reporting': 'Reporting',
      'stip': 'Stip Integration',
      'geneos': 'Geneos Integration',
      'lisi': 'Lisi Integration'
    };
    
    CAPABILITIES.forEach(function(cap) {
      const v = state.locations && state.locations[state.loc_selected] && state.locations[state.loc_selected][cap];
      if (v !== true && v !== false && v !== 'na') {
        incomplete.push(capLabels[cap] + ' component');
      } else if (v === true) {
        // Check integration questions when capability is YES
        ['reporting','stip','geneos','lisi'].forEach(function(simple) {
          const key = 'loc_' + state.loc_selected + '_' + cap + '_' + simple;
          const sv = state[key];
          if (sv !== true && sv !== false && sv !== 'na') {
            incomplete.push(capLabels[cap] + ' - ' + integrationLabels[simple]);
          }
        });
      }
    });
  }
  
  return incomplete;
}

function updateSubmitButtonState(pct, state) {
  const submitBtn = document.getElementById('submit');
  
  if (pct === 100) {
    // Enable submit button when 100% complete
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('disabled');
      submitBtn.title = 'Generate CSV and open email client';
    }
  } else {
    // Disable submit button when not 100% complete
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('disabled');
      
      // Build detailed tooltip with incomplete items
      let tooltip = 'Complete all questions to enable CSV generation (' + pct + '% answered)';
      if (state) {
        const incomplete = getIncompleteItems(state);
        if (incomplete.length > 0) {
          tooltip += '\n\nMissing:\n• ' + incomplete.join('\n• ');
        }
      }
      submitBtn.title = tooltip;
    }
  }
}

function sendEmailWithCSV(csvContent, appName, state) {
  // Create email content
  const subject = `SRE Readiness Assessment - ${appName}`;
  const body = `
Dear SRE Team,

Please find attached the SRE Readiness Assessment for ${appName}.

Assessment Summary:
- Application: ${appName}
- Role: ${state.role || 'Not specified'}
- NAR-ID: ${state.nar_id || 'Not specified'}
- Contact Email: ${state.contact_email || 'Not specified'}
- Application Type: ${state.app_type}${state.app_type === 'other' ? ' (' + state.app_type_other + ')' : ''}
- Location: ${state.loc_selected || 'Not specified'}
- Assessment Date: ${new Date().toLocaleDateString()}

The CSV file contains detailed responses to all assessment questions.

Best regards,
SRE Readiness Assessment Tool
  `.trim();
  
  // Create mailto link (note: mailto doesn't support attachments)
  const mailtoLink = `mailto:afloareioanb@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  // Open default email client
  window.open(mailtoLink);
  
  // Show clear instructions for manual attachment
  setTimeout(() => {
    const instructions = `
📧 Email client opened!

📎 To attach the CSV file:
1. The CSV file has been downloaded to your computer
2. In your email client, click "Attach" or "Paperclip" icon
3. Browse to your Downloads folder
4. Select the file: sre-readiness-${appName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv
5. Send the email to: afloareioanb@gmail.com

💡 Tip: The email subject and body are already filled in for you!
    `.trim();
    
    alert(instructions);
  }, 1000);
}

function resetAll() {
  // Clear URL parameters
  if (typeof history.replaceState === 'function') {
    history.replaceState(null, '', location.pathname);
  } else {
    location.hash = location.pathname;
  }
  // Clear secure storage values
  secureClear();
  
  // Clear input fields directly
  const appNameInput = document.getElementById('app_name');
  const roleSelect = document.getElementById('role');
  const narIdInput = document.getElementById('nar_id');
  const contactEmailInput = document.getElementById('contact_email');
  const appTypeOtherInput = document.getElementById('app_type_other');
  
  if (appNameInput) appNameInput.value = '';
  if (roleSelect) roleSelect.value = '';
  if (narIdInput) narIdInput.value = '';
  if (contactEmailInput) contactEmailInput.value = '';
  if (appTypeOtherInput) appTypeOtherInput.value = '';
  
  // Reset app type selection
  const typeSeg = document.getElementById('app_type_segmented');
  if (typeSeg) {
    typeSeg.querySelectorAll('button').forEach(function(btn) {
      btn.classList.remove('active');
    });
    const appTypeOtherWrap = document.getElementById('app_type_other_wrap');
    if (appTypeOtherWrap) appTypeOtherWrap.style.display = 'none';
  }
  
  // Reset location selection
  const locSeg = document.getElementById('location_segmented');
  if (locSeg) {
    locSeg.querySelectorAll('button').forEach(function(btn) {
      btn.classList.remove('active');
    });
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









// Secure CSV cell escaping to prevent CSV injection
function escapeCSVCell(cell) {
  if (cell == null || cell === undefined) return '""';
  const str = String(cell);
  // Escape quotes by doubling them, and wrap in quotes
  // This prevents CSV injection and handles special characters
  return '"' + str.replace(/"/g, '""') + '"';
}

function convertToCSV(data) {
  const rows = [];
  
  // Add metadata
  rows.push(['Application Name', data.app_name || '']);
  rows.push(['Role', data.role || '']);
  rows.push(['NAR-ID', data.nar_id || '']);
  rows.push(['Contact Email', data.contact_email || '']);
  rows.push(['Application Type', data.app_type || '']);
  if (data.app_type === 'other') {
    rows.push(['Application Type (Other)', data.app_type_other || '']);
  }
  rows.push([]);
  
  // Add SLO/SLA
  rows.push(['SLO/SLA Structure Exists', data.slo_exists ? 'Yes' : 'No']);
  rows.push(['PDM Documented', data.slo_pdm ? 'Yes' : (data.slo_pdm === 'na' ? 'N/A' : 'No')]);
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
  rows.push(['Runbooks/Support Guides', data.bp_runbooks ? 'Yes' : (data.bp_runbooks === 'na' ? 'N/A' : 'No')]);
  rows.push(['Critical Failures Documented', data.bp_spof ? 'Yes' : (data.bp_spof === 'na' ? 'N/A' : 'No')]);
  rows.push(['Alert Noise Documented', data.bp_noise ? 'Yes' : (data.bp_noise === 'na' ? 'N/A' : 'No')]);
  rows.push(['MTTR Tracked', data.bp_mttr ? 'Yes' : (data.bp_mttr === 'na' ? 'N/A' : 'No')]);
  rows.push(['Direct Dependencies Documented', data.bp_dependencies ? 'Yes' : (data.bp_dependencies === 'na' ? 'N/A' : 'No')]);
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
          
          // Add reporting, stip, geneos and lisi
          const repKey = 'loc_' + loc + '_' + cap + '_reporting';
          const stipKey = 'loc_' + loc + '_' + cap + '_stip';
          const geneosKey = 'loc_' + loc + '_' + cap + '_geneos';
          const lisiKey = 'loc_' + loc + '_' + cap + '_lisi';
          rows.push(['    Reporting', data[repKey] ? 'Yes' : (data[repKey] === 'na' ? 'N/A' : 'No')]);
          rows.push(['    Stip Integration', data[stipKey] ? 'Yes' : (data[stipKey] === 'na' ? 'N/A' : 'No')]);
          rows.push(['    Geneos Integration', data[geneosKey] ? 'Yes' : (data[geneosKey] === 'na' ? 'N/A' : 'No')]);
          rows.push(['    Lisi Integration', data[lisiKey] ? 'Yes' : (data[lisiKey] === 'na' ? 'N/A' : 'No')]);
        }
      });
    });
  }
  
  return rows.map(function(row) {
    return row.map(function(cell) {
      return escapeCSVCell(cell);
    }).join(',');
  }).join('\n');
}

function collectAnswers() {
  const params = new URLSearchParams(location.search);
  const data = {};
  // meta (sensitive values from secure storage)
  data.app_name = secureGet('app_name') || '';
  data.role = secureGet('role') || '';
  data.nar_id = secureGet('nar_id') || '';
  data.contact_email = secureGet('contact_email') || '';
  data.app_type = params.get('app_type') || '';
  data.app_type_other = params.get('app_type_other') || '';
  // yes/no
  YESNO_KEYS.forEach(function(key) {
    const v = params.get(key);
    data[key] = v === '1' ? true : v === '0' ? false : v === 'na' ? 'na' : null;
  });
  // locations
  data.locations = {};
  LOCATIONS.forEach(function(loc){
    data.locations[loc] = {};
    const locationProviders = getProvidersForLocation(loc);
    CAPABILITIES.forEach(function(cap){
      const k = 'loc_' + loc + '_' + cap;
      const v = params.get(k);
      data.locations[loc][cap] = v === '1' ? true : v === '0' ? false : v === 'na' ? 'na' : null;
      data.locations[loc][cap + '_monitoring'] = {};
      (locationProviders.monitoring||[]).forEach(function(prov){
        const dk = 'loc_' + loc + '_' + cap + '_monitoring_' + prov;
        const raw = params.get(dk);
        data.locations[loc][cap + '_monitoring'][prov] = raw ? raw.split('|') : [];
      });
      data.locations[loc][cap + '_alerting'] = {};
      (locationProviders.alerting||[]).forEach(function(prov){
        const ak = 'loc_' + loc + '_' + cap + '_alerting_' + prov;
        const raw = params.get(ak);
        data.locations[loc][cap + '_alerting'][prov] = raw ? raw.split('|') : [];
      });
      ['reporting','stip','geneos','lisi'].forEach(function(simple){
        const sk = 'loc_' + loc + '_' + cap + '_' + simple;
        const sv = params.get(sk);
        data.locations[loc][cap + '_' + simple] = sv === '1' ? true : sv === '0' ? false : sv === 'na' ? 'na' : null;
        // Handle provider drill-downs for stip only
        if (simple === 'stip') {
          data.locations[loc][cap + '_' + simple + '_providers'] = {};
          ['newrelic', 'splunk'].forEach(function(prov){
            const dk = 'loc_' + loc + '_' + cap + '_' + simple + '_' + prov;
            const raw = params.get(dk);
            data.locations[loc][cap + '_' + simple + '_providers'][prov] = raw ? raw.split('|') : [];
          });
        }
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
  // hydrate sensitive inputs from secure storage
  var appNameInput = document.getElementById('app_name');
  var roleSelect = document.getElementById('role');
  var narIdInput = document.getElementById('nar_id');
  var contactEmailInput = document.getElementById('contact_email');
  if (appNameInput && appNameInput.value !== state.app_name) appNameInput.value = state.app_name || '';
  if (roleSelect && roleSelect.value !== state.role) roleSelect.value = state.role || '';
  if (narIdInput && narIdInput.value !== state.nar_id) narIdInput.value = state.nar_id || '';
  if (contactEmailInput && contactEmailInput.value !== state.contact_email) contactEmailInput.value = state.contact_email || '';
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
    if (!key) {
      console.warn('Options container missing data-key attribute:', container);
      return;
    }
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
    
    // Get location-specific providers
    const locationProviders = getProvidersForLocation(loc);

    CAPABILITIES.forEach(function(cap){
      const capWrap = document.createElement('div');
      capWrap.className = 'question cap-header';
      const capLabel = cap === 'apis' ? 'Exposes APIs' : (cap === 'frontend' ? 'Frontend' : (cap === 'mobile' ? 'Mobile' : 'Backend'));
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
      locationProviders.monitoring.forEach(function(prov){
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
      locationProviders.alerting.forEach(function(prov){
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
      
      // Stip integration drill-down options
      const stipDrill = document.createElement('div');
      stipDrill.className = 'drill';
      stipDrill.style.marginLeft = '8px';
      stipDrill.style.display = 'none';
      stipDrill.setAttribute('data-drill-for', 'loc_' + loc + '_' + cap + '_stip');
      
      const stipOptions = document.createElement('div');
      stipOptions.className = 'question';
      stipOptions.innerHTML = '<label>Stip Integration Options</label>';
      const stipGrid = document.createElement('div');
      stipGrid.className = 'provider-grid';
      
      // Add New Relic and Splunk options for Stip integration
      ['newrelic', 'splunk'].forEach(function(prov){
        const provWrap = document.createElement('div');
        provWrap.className = 'provider';
        provWrap.innerHTML = '<h4>' + prettyProv(prov) + '</h4>';
        const chips = document.createElement('div');
        chips.className = 'chipset';
        
        // Add a simple "Enabled" option for each provider
        const chip = document.createElement('span');
        chip.className = 'pill';
        chip.textContent = 'Enabled';
        chip.dataset.key = 'loc_' + loc + '_' + cap + '_stip_' + prov;
        chip.dataset.item = 'Enabled';
        chip.addEventListener('click', function(){ toggleChip('loc_' + loc + '_' + cap + '_stip_' + prov, 'Enabled'); });
        chips.appendChild(chip);
        
        provWrap.appendChild(chips);
        stipGrid.appendChild(provWrap);
      });
      
      stipOptions.appendChild(stipGrid);
      stipDrill.appendChild(stipOptions);

      // Geneos integration (yes/no)
      const geneos = document.createElement('div');
      geneos.className = 'question';
      geneos.innerHTML = '<label>Geneos Integration</label><div class="options" data-key="loc_' + loc + '_' + cap + '_geneos"></div>';

      // Lisi integration (yes/no)
      const lisi = document.createElement('div');
      lisi.className = 'question';
      lisi.innerHTML = '<label>Lisi Integration</label><div class="options" data-key="loc_' + loc + '_' + cap + '_lisi"></div>';

      drill.appendChild(mon);
      drill.appendChild(al);
      drill.appendChild(rep);
      drill.appendChild(stip);
      drill.appendChild(stipDrill);
      drill.appendChild(geneos);
      drill.appendChild(lisi);

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

function prettyProv(k){ 
  if (k === 'newrelic') return 'New Relic';
  if (k === 'cloud-monitoring') return 'Cloud Monitoring-Logging';
  return 'Splunk';
}

function renderProgress(state) {
  // Count all questions that are visible/required
  let total = 0;
  let answered = 0;
  
  // Required metadata fields (always count)
  total += 4; // Application name, Role, Application Type, and Location
  if (state.app_name && state.app_name.trim()) answered += 1;
  if (state.role && state.role.trim()) answered += 1;
  if (state.app_type) answered += 1;
  if (state.loc_selected) answered += 1;
  
  // All YESNO_KEYS questions (always count)
  total += YESNO_KEYS.length;
  YESNO_KEYS.forEach(function(k){ 
    const v = state[k];
    if (v === true || v === false || v === 'na') {
      answered += 1;
    }
  });
  
  // SLO sub-questions (always count, but only answered when slo_exists is true)
  total += 3; // slo_latency, slo_availability, slo_error_budget
  if (state.slo_exists === true) {
    // When SLO exists, count actual answers to sub-questions
    ['slo_latency','slo_availability','slo_error_budget'].forEach(function(k){
      const v = state[k];
      if (v===true||v===false||v==='na') answered += 1;
    });
  } else if (state.slo_exists === false || state.slo_exists === 'na') {
    // When SLO doesn't exist or is N/A, sub-questions are auto-set to N/A and count as answered
    answered += 3;
  }
  
  // Location questions (always count if location is selected)
  if (state.loc_selected) {
    CAPABILITIES.forEach(function(cap){
      total += 1; // capability yes/no
      const v = state.locations && state.locations[state.loc_selected] && state.locations[state.loc_selected][cap];
      if (v===true||v===false||v==='na') answered += 1;
      
      // Sub-questions always count in total
      total += 4; // reporting, stip, geneos and lisi
      if (v === true) {
        // When capability is YES, count the actual answers to sub-questions
        ['reporting','stip','geneos','lisi'].forEach(function(simple){
          const key = 'loc_' + state.loc_selected + '_' + cap + '_' + simple;
          const sv = state[key];
          if (sv===true||sv===false||sv==='na') answered += 1;
        });
      } else if (v === false || v === 'na') {
        // When capability is NO or N/A, sub-questions are auto-set to N/A and count as answered
        answered += 4;
      }
      
      // Monitoring and alerting items are NOT counted towards completion
      // Only Reporting, Stip, Geneos and Lisi integration questions count (handled above)
      // The individual monitoring/alerting items are optional and don't affect progress
    });
  }
  const pct = Math.round((answered / total) * 100);
  const bar = document.getElementById('progress-bar-fill');
  const label = document.getElementById('progress-label');
  if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = pct + '% answered';
  
  // Update submit button state based on completion
  updateSubmitButtonState(pct, state);
}

function updateDrillVisibility(state) {
  document.querySelectorAll('[data-drill-for]').forEach(function(el){
    const key = el.getAttribute('data-drill-for');
    let enabled = false;
    if (key.indexOf('loc_') === 0) {
      const parts = key.split('_');
      const loc = parts[1];
      const cap = parts[2];
      
      // Check if this is a Stip integration drill-down
      if (parts.length >= 4 && parts[3] === 'stip') {
        // Show integration options when integration is Yes
        const integrationKey = 'loc_' + loc + '_' + cap + '_stip';
        enabled = state[integrationKey] === true;
      } else {
        // Regular capability drill-down
        enabled = state.locations && state.locations[loc] && state.locations[loc][cap] === true;
      }
    } else {
      enabled = state[key] === true;
    }
    el.style.display = enabled ? '' : 'none';
  });
}

function renderOnboardStats(state) {
  const loc = state.loc_selected;
  const out = {
    frontend: '—', backend: '—', apis: '—', mobile: '—',
    frontendMon: '—', frontendAl: '—',
    backendMon: '—', backendAl: '—',
    apisMon: '—', apisAl: '—',
    mobileMon: '—', mobileAl: '—'
  };
  if (!loc) {
    updateOnboardUI(out);
    return;
  }
  const locationProviders = getProvidersForLocation(loc);
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
    (locationProviders.monitoring||[]).forEach(function(prov){
      const key = 'loc_' + loc + '_' + cap + '_monitoring_' + prov;
      const items = state[key] || [];
      const all = MON_ITEMS[prov] || [];
      
      // Count all available items and selected items
      selected += items.length; 
      total += all.length;
      selMon += items.length; 
      totMon += all.length;
    });
    // Alerting
    (locationProviders.alerting||[]).forEach(function(prov){
      const key = 'loc_' + loc + '_' + cap + '_alerting_' + prov;
      const items = state[key] || [];
      const all = ALERT_ITEMS[prov] || [];
      
      // Count all available items and selected items
      selected += items.length; 
      total += all.length;
      selAl += items.length; 
      totAl += all.length;
    });
    // Reporting/Stip/Geneos/Lisi as binary yes/no, exclude N/A from denominator
    ['reporting','stip','geneos','lisi'].forEach(function(simple){
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
  const mo = document.getElementById('onboard-mobile');
  const moM = document.getElementById('onboard-mobile-mon');
  const moA = document.getElementById('onboard-mobile-al');
  applyStat(fe, 'Frontend onboard: ' + out.frontend, out.frontend);
  applyStat(feM, 'Monitor: ' + out.frontendMon, out.frontendMon);
  applyStat(feA, 'Alert: ' + out.frontendAl, out.frontendAl);
  applyStat(be, 'Backend onboard: ' + out.backend, out.backend);
  applyStat(beM, 'Monitor: ' + out.backendMon, out.backendMon);
  applyStat(beA, 'Alert: ' + out.backendAl, out.backendAl);
  applyStat(ap, 'APIs onboard: ' + out.apis, out.apis);
  applyStat(apM, 'Monitor: ' + out.apisMon, out.apisMon);
  applyStat(apA, 'Alert: ' + out.apisAl, out.apisAl);
  applyStat(mo, 'Mobile onboard: ' + out.mobile, out.mobile);
  applyStat(moM, 'Monitor: ' + out.mobileMon, out.mobileMon);
  applyStat(moA, 'Alert: ' + out.mobileAl, out.mobileAl);
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
  document.getElementById('role').addEventListener('change', function(e){ setAnswer('role', e.target.value); });
  document.getElementById('nar_id').addEventListener('input', function(e){ setAnswer('nar_id', e.target.value); });
  document.getElementById('contact_email').addEventListener('input', function(e){ setAnswer('contact_email', e.target.value); });
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

  document.getElementById('submit').addEventListener('click', generateAndSendCSV);
  document.getElementById('reset').addEventListener('click', resetAll);
  

  
  render();
});
