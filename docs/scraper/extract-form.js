/**
 * 软著申请表单抓取脚本 v2 —— 针对版权中心自研 hd- 组件库定制（只读，无副作用）
 *
 * 用法：
 *   1. 在填报页面打开 DevTools Console，粘贴全部内容，回车
 *   2. 结果自动复制到剪贴板，粘贴保存为 docs/pages/raw/NN-页面名.json
 *   3. 切换会影响联动的选项（如开发方式、发表状态）后，再运行一次并另存，
 *      即可捕获条件字段显示后的结构
 *   4. 著作权人等"可重复表单组"如果有多条，全部展开后再运行
 */

(function () {
  'use strict';

  var clean = function (s) {
    return (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
  };
  var isHidden = function (el) {
    // 自身或祖先被 display:none 隐藏
    for (var e = el; e && e !== document.body; e = e.parentElement) {
      if (e.style && e.style.display === 'none') return true;
    }
    return !el.offsetParent && el.tagName !== 'BODY';
  };

  // ---------- 控件提取器 ----------

  function extractSelect(el) {
    var box = el.querySelector('.box');
    var selected = '';
    if (box) {
      var input = box.querySelector('input');
      var spans = box.querySelectorAll(':scope > span');
      if (input && input.value) selected = clean(input.value);
      else {
        spans.forEach(function (s) {
          if (s.style.display !== 'none' && !s.querySelector('input')) {
            var t = clean(s.textContent);
            if (t) selected = t;
          }
          // 选中值常包在嵌套 span 里
          s.querySelectorAll('span').forEach(function (inner) {
            var t = clean(inner.textContent);
            if (t && inner.children.length === 0) selected = selected || t;
          });
        });
      }
    }
    var placeholder = '';
    var ph = el.querySelector('.box > span[style*="none"], .box input');
    if (ph) placeholder = clean(ph.textContent || ph.placeholder || '');

    var options = [];
    el.querySelectorAll('.dropdown .hd-option').forEach(function (opt) {
      options.push({
        text: clean(opt.textContent).replace(/ *$/, ''),
        selected: opt.classList.contains('selected')
      });
    });
    return {
      type: 'select',
      placeholder: placeholder,
      selected: selected,
      disabled: !!(box && box.classList.contains('disabled')),
      options: options
    };
  }

  function extractRadioGroup(el) {
    var options = [];
    el.querySelectorAll('label.hd-radio-button').forEach(function (lab) {
      var input = lab.querySelector('input[type="radio"]');
      var inner = lab.querySelector('.radio-inner');
      options.push({
        text: clean(inner ? inner.textContent : lab.textContent),
        value: input ? input.value : '',
        selected: !!(inner && inner.classList.contains('active')) || !!(input && input.checked)
      });
    });
    return { type: 'radio', options: options };
  }

  function extractDatePicker(el) {
    var input = el.querySelector('.datepicker-input input');
    return {
      type: 'date',
      placeholder: input ? input.placeholder : '',
      selected: input && input.value ? input.value : ''
    };
  }

  function extractInput(el) {
    var input = el.querySelector('input, textarea');
    if (!input) return null;
    return {
      type: input.tagName === 'TEXTAREA' ? 'textarea' : (input.type || 'text'),
      placeholder: input.placeholder || '',
      maxlength: input.getAttribute('maxlength') || null,
      disabled: input.disabled,
      value: input.value || ''
    };
  }

  function extractCascader(el) {
    var labelEl = el.querySelector('.label');
    var selected = '';
    var placeholder = '';
    if (labelEl) {
      labelEl.querySelectorAll('span').forEach(function (s) {
        var t = clean(s.textContent);
        if (!t) return;
        if (s.style.display === 'none') placeholder = t;
        else selected = selected ? selected + ' / ' + t : t;
      });
    }
    var tabs = [];
    el.querySelectorAll('.dropdown .title li').forEach(function (li) {
      tabs.push(clean(li.textContent));
    });
    var options = [];
    el.querySelectorAll('.dropdown .options ul li').forEach(function (li) {
      options.push({ text: clean(li.textContent), selected: li.classList.contains('selected') });
    });
    var r = { type: 'cascader', placeholder: placeholder, selected: selected, tabs: tabs };
    if (options.length) r.loaded_options = options; // 城市列表 AJAX 懒加载，可能为空
    return r;
  }

  function extractTextArea(el) {
    var ta = el.querySelector('textarea');
    if (!ta) return null;
    var wrap = el.querySelector('.hd-text-area') || el;
    return {
      type: 'textarea',
      placeholder: ta.placeholder || '',
      minlength: wrap.getAttribute('minilength') || ta.getAttribute('minilength') || null,
      maxlength: wrap.getAttribute('maxlength') || ta.getAttribute('maxlength') || null,
      value: ta.value || ''
    };
  }

  function extractCheckboxGroup(el) {
    var options = [];
    el.querySelectorAll('label.hd-checkbox-button').forEach(function (lab) {
      var input = lab.querySelector('input[type="checkbox"]');
      var inner = lab.querySelector('.checkbox-inner');
      // checkbox-inner 里可能嵌着 triangle 图标 div，只取直接文本
      var text = '';
      if (inner) {
        inner.childNodes.forEach(function (n) {
          if (n.nodeType === 3) text += n.textContent;
        });
      }
      options.push({
        text: clean(text || (inner ? inner.textContent : lab.textContent)),
        value: input ? input.value : '',
        selected: !!(input && input.checked)
      });
    });
    return { type: 'checkbox', options: options };
  }

  function extractUpload(el) {
    var desc = el.querySelector('.hdUpload-item p, .hdUpload p');
    var hint = '';
    el.querySelectorAll('p').forEach(function (p) {
      var t = clean(p.textContent);
      if (t && /pdf|格式|上传/i.test(t) && !hint) hint = t;
    });
    return {
      type: 'upload',
      description: clean(desc ? desc.textContent : ''),
      hint: hint
    };
  }

  function detectControl(box) {
    // 复合控件：checkbox 组 + 补充文本域（编程语言、技术特点）整体返回
    var multi = [];
    if (box.querySelector('.hd-radio-group')) multi.push(extractRadioGroup(box));
    if (box.querySelector('.hd-checkbox-group')) multi.push(extractCheckboxGroup(box));
    if (box.querySelector('.hd-cascader')) multi.push(extractCascader(box.querySelector('.hd-cascader')));
    if (box.querySelector('.hd-select')) multi.push(extractSelect(box));
    if (box.querySelector('.datePicker')) multi.push(extractDatePicker(box));
    if (box.querySelector('.hd-text-area')) multi.push(extractTextArea(box));
    if (box.querySelector('.hd-input')) multi.push(extractInput(box));
    if (box.querySelector('.hdUpload, .upLoadBox')) multi.push(extractUpload(box));
    if (multi.length === 1) return multi[0];
    if (multi.length > 1) return { type: 'composite', parts: multi };
    if (multi.length === 0) { /* fall through to unknown */ }
    // 兜底：不认识的控件，记录其 HTML 片段供脚本修正
    var info = box.classList.contains('fillin_info') ? box : box.querySelector('.fillin_info');
    var target = info || box;
    var clone = target.cloneNode(true);
    // 去掉大体量噪音（日期面板、下拉列表），保留结构
    clone.querySelectorAll('.datepicker-main, .dropdown, svg, use').forEach(function (n) { n.remove(); });
    var html = clean(clone.outerHTML).slice(0, 800);
    if (!html) return null;
    return { type: 'unknown', html_snippet: html };
  }

  // ---------- 表单组（著作权人） ----------
  function extractFormGroup(groupEl) {
    var items = [];
    groupEl.querySelectorAll('.formGroup-item-body-left-item').forEach(function (item) {
      var ctl = detectControl(item);
      if (ctl) items.push(ctl);
    });
    return { type: 'formGroup', repeatable: true, sub_fields: items };
  }

  // ---------- 遍历字段块 ----------
  var fields = [];

  document.querySelectorAll('.application .fillin_item').forEach(function (item) {
    // 跳过嵌套在其他 fillin_item 里的（嵌套层单独处理）
    var parentItem = item.parentElement && item.parentElement.closest('.fillin_item');

    var h3 = item.querySelector(':scope > h3');
    if (!h3) {
      // 嵌套块：h3 可能在其所属 fillin_info 内
      h3 = item.querySelector('h3');
    }
    var label = clean(h3 ? h3.textContent : '');
    var tooltipId = h3 ? (h3.querySelector('[hd-tooltip-id]') || h3).getAttribute('hd-tooltip-id') : null;

    if (parentItem) return; // 顶层循环跳过嵌套，嵌套在父字段的 sub_fields 里收集

    var field = {
      label: label,
      hidden: isHidden(item)
    };
    if (tooltipId) field.tooltip_id = tooltipId;

    // 该字段块内可能有多个 fillin_info（如开发方式 + 条件子字段）
    var infos = item.querySelectorAll('.fillin_info');
    var controls = [];
    var subFields = [];

    infos.forEach(function (info) {
      // 条件子字段：fillin_info 里直接带 h3
      var subH3 = info.querySelector(':scope > h3');
      if (subH3) {
        var sub = {
          label: clean(subH3.textContent),
          hidden: isHidden(info),
          conditional: true
        };
        var sctl = detectControl(info);
        if (sctl) sub.control = sctl;
        subFields.push(sub);
        return;
      }
      // 表单组
      var fg = info.querySelector('.formGroup');
      if (fg) { controls.push(extractFormGroup(fg)); return; }

      // 嵌套的 fillin_item_left（如 首次发表日期 / 首次发表地点）
      var nested = info.querySelectorAll('.fillin_item_left, .fillin_item');
      if (nested.length) {
        nested.forEach(function (n) {
          var nh3 = n.querySelector('h3');
          var sub2 = {
            label: clean(nh3 ? nh3.textContent : ''),
            hidden: isHidden(n),
            conditional: true
          };
          // 一个嵌套块可能有多个控件（如 发表地点 = 国家下拉 + 级联）
          var ctls = [];
          n.querySelectorAll('.hd-select, .hd-cascader, .datePicker, .hd-input, .hd-radio-group').forEach(function (c) {
            var box = c.closest('.hd-select, .hd-cascader, .datePicker, .hd-input, .hd-radio-group');
            var extracted = detectControl(box.parentElement);
            if (extracted) ctls.push(extracted);
          });
          // 去重（cascader 在 country_select 内等场景）
          var seen = JSON.stringify(ctls);
          if (!sub2._dedup || sub2._dedup !== seen) {
            delete sub2._dedup;
            if (ctls.length === 1) sub2.control = ctls[0];
            else if (ctls.length > 1) sub2.controls = ctls;
          }
          subFields.push(sub2);
        });
        return;
      }

      var ctl = detectControl(info);
      if (ctl) controls.push(ctl);
    });

    if (controls.length === 1) field.control = controls[0];
    else if (controls.length > 1) field.controls = controls;
    if (subFields.length) field.sub_fields = subFields;

    // 校验错误提示（当前可见的）
    var err = item.querySelector('.error-text:not([style*="none"]), .error_text:not([style*="none"])');
    if (err && !isHidden(err)) field.error = clean(err.textContent);

    if (field.label || field.control || field.controls) fields.push(field);
  });

  // ---------- 步骤条 ----------
  var steps = [];
  document.querySelectorAll('.hd-steps .hd-step').forEach(function (s) {
    steps.push({
      name: clean(s.textContent),
      active: s.classList.contains('active')
    });
  });

  // ---------- 悬浮提示（hover 后可见时才抓得到） ----------
  var tooltips = [];
  document.querySelectorAll('[class*="tooltip"], [class*="popper"]').forEach(function (t) {
    if (!isHidden(t)) {
      var txt = clean(t.textContent);
      if (txt && txt.length > 1 && txt.length < 1000) tooltips.push(txt);
    }
  });

  var result = {
    page_url: location.href,
    page_title: clean(document.querySelector('.opus_container h2') ? document.querySelector('.opus_container h2').textContent : document.title),
    captured_at: new Date().toISOString(),
    steps: steps,
    field_count: fields.length,
    fields: fields,
    visible_tooltips: tooltips
  };

  var json = JSON.stringify(result, null, 2);
  console.log(json);
  try {
    copy(json);
    console.log('%c已复制到剪贴板，请粘贴保存为 JSON 文件', 'color: green; font-weight: bold');
  } catch (e) {
    console.log('%c自动复制失败，请手动复制上面的 JSON', 'color: orange');
  }
  return result;
})();
