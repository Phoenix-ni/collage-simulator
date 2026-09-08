/**
 * 大学四年模拟器 - 沉浸式前端交互系统 (app.js)
 * 核心架构：
 * - 四大一级导航：人生 (Life), 成长 (Growth), 路线 (Routes), 履历 (History)
 * - 单屏聚焦交互循环：阶段/月份 -> 当前事件 -> 玩家行动决策 -> 月度结果结算 -> 进入下月
 * - 渐进式信息展示 (Progressive Disclosure)，彻底剔除底层 Dashboard 式信息平铺
 * - 纯定性状态与人类语言反馈 (无生硬数值倾倒，无开发 Flag 术语)
 * - 开发者调试工具 (Debug Console) 迁移至专属抽屉/菜单中
 */

document.addEventListener('DOMContentLoaded', () => {
  const { icon, setHTML, setText, formatDebugState } = window.CampusUI;
  // 核心运行时状态
  let engine = null;
  let currentTab = 'life'; // 'life' | 'growth' | 'routes' | 'history'
  let currentSubtab = 'timeline'; // 'timeline' | 'milestones' | 'projects' | 'resume-view'
  let currentPhase = 'choice'; // 'choice' | 'result'
  let selectedEventId = null;
  let lastChoiceResult = null;
  let expandedRoutes = { work: false, postgrad_exam: false, postgrad_rec: false, ailab: false };
  let activeResumeTab = 'certificate'; // 'certificate' | 'resume'

  // DOM 元素引用 - 顶部状态栏
  const elTopStageText = document.getElementById('top-stage-text');
  const elTopTuVal = document.getElementById('top-tu-val');
  const elTopEpVal = document.getElementById('top-ep-val');
  const elBtnOpenMenu = document.getElementById('btn-open-menu');

  // DOM 元素引用 - 一级导航与主面板
  const tabPanels = {
    life: document.getElementById('panel-life'),
    growth: document.getElementById('panel-growth'),
    routes: document.getElementById('panel-routes'),
    history: document.getElementById('panel-history')
  };
  const navBtns = {
    life: document.getElementById('nav-btn-life'),
    growth: document.getElementById('nav-btn-growth'),
    routes: document.getElementById('nav-btn-routes'),
    history: document.getElementById('nav-btn-history')
  };

  // DOM 元素引用 - 人生页组件
  const elEventStageView = document.getElementById('event-stage-view');
  const elMonthResultView = document.getElementById('month-result-view');
  const elEventSwitchBar = document.getElementById('event-switch-bar');
  const elEventSwitchChips = document.getElementById('event-switch-chips');
  const elCurEventPkgTag = document.getElementById('cur-event-pkg-tag');
  const elCurEventMonthTag = document.getElementById('cur-event-month-tag');
  const elCurEventTitle = document.getElementById('cur-event-title');
  const elCurEventScene = document.getElementById('cur-event-scene');
  const elActionCardsGrid = document.getElementById('action-cards-grid');

  // 人生页 - 结算组件
  const elResultTitle = document.getElementById('result-title');
  const elResultSubtitle = document.getElementById('result-subtitle');
  const elResultStoryText = document.getElementById('result-story-text');
  const elResultChangesList = document.getElementById('result-changes-list');
  const elBtnResultNextMonth = document.getElementById('btn-result-next-month');
  const elBtnNextMonthText = document.getElementById('btn-next-month-text');

  // 人生页 - 右侧极简速览组件
  const elQuickStatusList = document.getElementById('quick-status-list');
  const elRecentGrowthList = document.getElementById('recent-growth-list');
  const elLinkToGrowthBtn = document.getElementById('link-to-growth-btn');

  // 成长页组件
  const elGrowthBasicStatesGrid = document.getElementById('growth-basic-states-grid');
  const elGrowthRadarWrapper = document.getElementById('growth-radar-wrapper');
  const elGrowthCapGrid = document.getElementById('growth-cap-grid');

  // 路线页组件
  const elRoutesCardsContainer = document.getElementById('routes-cards-container');

  // 履历页组件
  const historySubpanels = {
    timeline: document.getElementById('subpanel-timeline'),
    milestones: document.getElementById('subpanel-milestones'),
    projects: document.getElementById('subpanel-projects'),
    'resume-view': document.getElementById('subpanel-resume-view')
  };
  const elHistoryTimelineList = document.getElementById('history-timeline-list');
  const elHistoryMilestonesGrid = document.getElementById('history-milestones-grid');
  const elHistoryProjectsList = document.getElementById('history-projects-list');
  const elHistoryResumePreview = document.getElementById('history-resume-preview');

  // 弹窗系统
  const elMenuModal = document.getElementById('menu-modal');
  const elBtnCloseMenu = document.getElementById('btn-close-menu');
  const elMenuBtnSave = document.getElementById('menu-btn-save');
  const elMenuBtnLoad = document.getElementById('menu-btn-load');
  const elMenuBtnRestart = document.getElementById('menu-btn-restart');
  const elMenuBtnOpenDebug = document.getElementById('menu-btn-open-debug');

  const elDebugModal = document.getElementById('debug-modal');
  const elBtnCloseDebug = document.getElementById('btn-close-debug');
  const elDbgMonthSelect = document.getElementById('dbg-month-select');
  const elDbgBtnJumpMonth = document.getElementById('dbg-btn-jump-month');
  const elDbgEndingBtns = document.getElementById('dbg-ending-btns');
  const elDbgRawState = document.getElementById('dbg-raw-state');

  const elResumeModal = document.getElementById('resume-modal-overlay');
  const elResumeContent = document.getElementById('resume-modal-body');
  const elBtnCloseResume = document.getElementById('btn-close-resume');
  const elTabBtnCert = document.getElementById('tab-btn-certificate');
  const elTabBtnResume = document.getElementById('tab-btn-resume');

  // ================= 1. 业务字典与标签翻译 =================
  const PACKAGE_NAMES = {
    ac: '学业课程',
    so: '校园社交',
    ro: '情感生活',
    fa: '家庭支持',
    he: '身心调理',
    ai: '极客机遇',
    wk: '求职实战',
    ge: '考研统考',
    re: '名校推免',
    pu: '大学通识'
  };

  const FLAG_NARRATIVE_MAP = {
    'FLAG_SO_CLUB_CORE': { title: '科技创新协会核心骨干', desc: '在校级学术社群中承担项目研发与核心组织职责' },
    'FLAG_SO_COMP_PRIZE': { title: '数学建模竞赛国家二等奖', desc: '带领团队攻坚微分方程与启发式算法斩获国家级奖项' },
    'FLAG_AC_PROJECT_PERFECT': { title: '高性能持久化存储引擎', desc: '独立基于 C++ 研发 B+ 树并发存储引擎并获课程满分' },
    'FLAG_WK_INTERN_ACCEPTED': { title: '科技企业日常后端实习', desc: '独立完成企业级微服务 API 研发与生产环境发布交付' },
    'FLAG_WK_OFFER_SSP_ACCEPTED': { title: '顶级大厂核心研发 SSP 录用', desc: '以最高档校招评级斩获一线互联网核心业务研发职位 (年薪 38W)' },
    'FLAG_WK_OFFER_SP_ACCEPTED': { title: '优质科技名企 SP 录用', desc: '通过多轮高强度专业终面斩获名企核心研发 Offer (年薪 28W)' },
    'FLAG_REC_CAMP_PASS': { title: '顶尖学术夏令营优秀营员', desc: '在清华/华五顶尖学术夏令营考核中脱颖而出获得拟录取' },
    'FLAG_REC_OFFER_ACCEPTED': { title: '教育部推荐免试直博研究生', desc: '以前 5% 拔尖学业表现与学术成果提前锁定顶尖高校席位' },
    'FLAG_GE_PASSED_FINAL': { title: '全国硕士统考一战高分录取', desc: '考研初试 408 分以专业前 3% 优异成绩录取全日制硕士研究生' },
    'FLAG_AI_CORE_ENTREPRENEUR': { title: '商业智能体创业技术合伙人', desc: '主导企业级 Multi-Agent 架构研发并助力团队完成早期融资' },
    'FLAG_AI_JOINED_DEEP': { title: '前沿极客实战组正式成员', desc: '深度参与工业级开源项目交付并承担每月核心代码合并' },
    'FLAG_AI_POLITELY_EXITED': { title: '极客圈人脉保留', desc: '体面告别高强度研发日常，保留了良好的行业人脉' },
    'FLAG_REC_EXITED_FOR_WORK': { title: '毅然弃保从工·产业拓荒', desc: '在获得名校保研名额后遵从内心志向，毅然投身产业界与商业前沿' },
    'FLAG_AC_THESIS_EXCELLENT': { title: '校级优秀本科毕业设计', desc: '毕业设计系统架构全票通过答辩并获评校级优秀毕业论文' }
  };

  // ================= 2. 初始化与主循环 =================
  function initGame(savedState) {
    if (savedState) {
      engine = new window.IFEngine(window.EMBEDDED_EVENTS, savedState);
    } else {
      engine = new window.IFEngine(window.EMBEDDED_EVENTS);
    }
    currentTab = 'life';
    currentSubtab = 'timeline';
    currentPhase = 'choice';
    selectedEventId = null;
    lastChoiceResult = null;
    expandedRoutes = { work: false, postgrad_exam: false, postgrad_rec: false, ailab: false };
    if (elResumeModal) elResumeModal.style.display = 'none';
    if (elMenuModal) elMenuModal.style.display = 'none';
    if (elDebugModal) elDebugModal.style.display = 'none';

    renderAll();
  }

  /**
   * 视图总渲染分发
   */
  function renderAll() {
    if (!engine) return;
    const s = engine.state;

    // 1. 顶部状态栏
    renderTopBar(s);

    // 2. 当前激活的一级页面
    if (currentTab === 'life') {
      renderLifePage(s);
    } else if (currentTab === 'growth') {
      renderGrowthPage(s);
    } else if (currentTab === 'routes') {
      renderRoutesPage(s);
    } else if (currentTab === 'history') {
      renderHistoryPage(s);
    }

    // 3. 检查大结局弹窗
    if (s.game_over && s.final_resume) {
      showResumeModal(s.final_resume);
    }
  }

  // ================= 3. 顶部极简状态栏 =================
  function renderTopBar(s) {
    const tl = engine.getCurrentTimeline();
    if (elTopStageText) {
      setText(elTopStageText, `${tl.name.split(' (')[0]} · 第 ${s.total_month} 月`);
    }
    if (elTopTuVal) {
      const timeQual = window.getTimeQualitative(s.resources.TU_current, 10);
      setText(elTopTuVal, `【${timeQual.text}】`);
      const resTuChip = document.getElementById('res-tu-chip');
      if (resTuChip) resTuChip.title = `自由时间: 【${timeQual.text}】 · ${timeQual.desc}`;
    }
    if (elTopEpVal) {
      const energyQual = window.getEnergyQualitative(s.resources.EP_current, s.resources.EP_max);
      setText(elTopEpVal, `【${energyQual.text}】`);
      const resEpChip = document.getElementById('res-ep-chip');
      if (resEpChip) resEpChip.title = `精力状态: 【${energyQual.text}】 · ${energyQual.desc}`;
    }
  }

  // ================= 4. 一级页面: 人生 (Life View) =================
  function renderLifePage(s) {
    const availableEvents = engine.getAvailableEvents();
    const isRecoveryLocked = s.resources.recovery_lock === true;

    if (currentPhase === 'choice') {
      elEventStageView.style.display = 'block';
      elMonthResultView.style.display = 'none';

      // 确定选中的主事件
      if (!selectedEventId || !availableEvents.some(e => e.event_id === selectedEventId)) {
        selectedEventId = availableEvents.length > 0 ? availableEvents[0].event_id : null;
      }

      // 多事件切换条
      if (availableEvents.length > 1) {
        elEventSwitchBar.style.display = 'flex';
        setHTML(elEventSwitchChips, availableEvents.map(e => {
          const isActive = e.event_id === selectedEventId;
          const pkgName = PACKAGE_NAMES[e.package.toLowerCase()] || e.package;
          return `<button class="switch-chip ${isActive ? 'active' : ''}" data-ev-id="${e.event_id}">${pkgName} · ${e.title}</button>`;
        }).join(''));

        elEventSwitchChips.querySelectorAll('.switch-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            selectedEventId = chip.getAttribute('data-ev-id');
            renderLifePage(s);
          });
        });
      } else {
        elEventSwitchBar.style.display = 'none';
      }

      // 渲染当前主事件卡
      const curEvent = availableEvents.find(e => e.event_id === selectedEventId) || availableEvents[0];
      if (curEvent) {
        setText(elCurEventPkgTag, PACKAGE_NAMES[curEvent.package.toLowerCase()] || curEvent.package);
        setText(elCurEventMonthTag, `第 ${s.total_month} 个月`);
        setText(elCurEventTitle, curEvent.title);
        setHTML(elCurEventScene, `<p>${curEvent.content.scene}</p>`);

        // 渲染可选行动卡片 (隐藏底层 TU/EP 算术数值，仅展示定性负荷、导向与权衡)
        setHTML(elActionCardsGrid, curEvent.choices.map(c => {
          const costTU = (c.cost && c.cost.TU) || 0;
          const costEP = (c.cost && c.cost.EP) || 0;
          const hasEnoughTU = s.resources.TU_current >= costTU;
          const isOverdraftRisk = s.resources.EP_current < costEP;
          const isActionDisabled = !hasEnoughTU || isRecoveryLocked;

          const hint = c.player_hint || {};
          const loadLvl = hint.load_level !== undefined ? hint.load_level : 1;
          const loadName = hint.load_name || '常规投入';
          const intent = hint.intent || '';
          const tradeoff = hint.tradeoff || '';

          let disabledHintText = '';
          if (isRecoveryLocked) {
            disabledHintText = '身体处于透支恢复锁，需要先休整调整状态';
          } else if (!hasEnoughTU) {
            disabledHintText = '本月剩余时间不足，无法执行该安排';
          }

          return `
            <div class="action-card ${isActionDisabled ? 'disabled' : ''}" data-choice-id="${c.choice_id}">
              <div class="action-card-top">
                <div class="action-card-title">
                  <span class="action-key-pill">${c.choice_id}</span>
                  <span>${c.text}</span>
                </div>
                <span class="load-badge lvl-${loadLvl}">${loadName}</span>
              </div>
              ${(intent || tradeoff) ? `
                <div class="action-intent-text">
                  ${intent ? `<div>${icon('target')} <strong>导向：</strong>${intent}</div>` : ''}
                  ${tradeoff ? `<div style="color:#64748b; font-size:0.8rem;">${icon('scale')} <strong>权衡：</strong>${tradeoff}</div>` : ''}
                </div>
              ` : ''}
              <div class="action-footer-row">
                <div class="action-cost-tags">
                  ${disabledHintText ? `<span class="action-disabled-hint">${icon('warning')} ${disabledHintText}</span>` : ''}
                  ${(!isRecoveryLocked && hasEnoughTU && isOverdraftRisk) ? `<span class="action-overdraft-warn">${icon('warning')} 精力透支预警 (当前状态无法轻松承担，将预支扣减下月精力)</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join(''));

        // 绑定行动点击 (注意：applyChoice 成功后绝不调用 nextMonth()，仅记录结果并切入 result 行动反馈)
        elActionCardsGrid.querySelectorAll('.action-card').forEach(card => {
          card.addEventListener('click', () => {
            if (card.classList.contains('disabled')) return;
            const choiceId = card.getAttribute('data-choice-id');
            const res = engine.applyChoice(curEvent.event_id, choiceId);
            if (res.success) {
              lastChoiceResult = {
                type: 'ACTION',
                choice: res.choice,
                event: res.event,
                historyItem: res.historyItem,
                timelineName: engine.getCurrentTimeline().name
              };
              currentPhase = 'result';
              renderAll();
            }
          });
        });
      } else {
        // 无可用事件时的空档期
        setText(elCurEventPkgTag, '校园日常');
        setText(elCurEventMonthTag, `第 ${s.total_month} 个月`);
        setText(elCurEventTitle, '本月大学生活平稳推进中');
        setHTML(elCurEventScene, '<p>各项学业与日常按部就班，点击下方推进按钮进入下一阶段。</p>');
        setHTML(elActionCardsGrid, `
          <button class="btn-primary-advance" id="btn-empty-advance">推进到下个月 &rarr;</button>
        `);
        const btnEmpty = document.getElementById('btn-empty-advance');
        if (btnEmpty) {
          btnEmpty.addEventListener('click', () => {
            engine.nextMonth();
            currentPhase = 'choice';
            selectedEventId = null;
            renderAll();
          });
        }
      }

      // 渲染系统级通用行动：休息调整卡片
      const elSystemRestSection = document.getElementById('system-rest-section');
      if (elSystemRestSection) {
        const canRest = s.resources.TU_current >= 1;
        let restDesc = '暂时放下繁重计划，给自己留一点空白时间，让身心恢复从容余裕。';
        if (isRecoveryLocked) {
          restDesc = '身体已经发出明显警告，目前处于透支恢复状态，现在最需要的是停下来休整恢复。';
        } else if (s.resources.EP_current < 45) {
          restDesc = '最近身心显露疲态，适当休息能够有效缓解负荷，为后续攻坚储备精力。';
        }

        setHTML(elSystemRestSection, `
          <div class="rest-action-card ${!canRest ? 'disabled' : ''} ${isRecoveryLocked ? 'recovery-highlight' : ''}" id="btn-action-rest">
            <div class="rest-card-head">
              <div class="rest-card-title">
                <span class="rest-card-icon">${icon('leaf')}</span>
                <span><strong>休息调整</strong> · 休整调理身心</span>
              </div>
              <span class="rest-badge ${isRecoveryLocked ? 'rest-badge-urgent' : 'rest-badge-normal'}">
                ${isRecoveryLocked ? '亟需休整' : '身心调理'}
              </span>
            </div>
            <div class="rest-card-body">
              <p class="rest-desc-text">${restDesc}</p>
            </div>
            <div class="rest-card-footer">
              ${canRest 
                ? `<span class="rest-cta-text">${icon('arrow')} ${isRecoveryLocked ? '立即安排休息调理' : '安排休整调理'}</span>`
                : `<span class="action-disabled-hint">${icon('warning')} 本月可用时间已耗尽，无法继续休整</span>`}
            </div>
          </div>
        `);

        const btnRest = document.getElementById('btn-action-rest');
        if (btnRest && canRest) {
          btnRest.addEventListener('click', () => {
            const res = engine.applyRest();
            if (res.success) {
              lastChoiceResult = {
                type: 'REST',
                choice: { text: '休整调理身心' },
                historyItem: res.historyItem,
                timelineName: engine.getCurrentTimeline().name
              };
              currentPhase = 'result';
              renderAll();
            }
          });
        }
      }
    } else {
      // 阶段 B: 本次行动反馈卡 (Action Result Phase)
      elEventStageView.style.display = 'none';
      elMonthResultView.style.display = 'block';

      if (lastChoiceResult) {
        const item = lastChoiceResult.historyItem;
        if (lastChoiceResult.type === 'REST') {
          setText(elResultTitle, '本次休整反馈');
          setText(elResultSubtitle, '安排决策：暂时休整调理身心');
          setText(elResultStoryText, item.resultText || '你给自己留出了一段休整时间，没有继续给日程加码，身心精力得到了恢复。');
        } else {
          setText(elResultTitle, '本次行动反馈');
          setText(elResultSubtitle, `行动决策：${item.choiceText}`);
          setText(elResultStoryText, item.resultText || '你顺利完成了当下的安排，大学履历沉淀更进一步。');
        }

        // 整理定性变化 (纯定性自然语言，杜绝底层数值泄露)
        const deltaQualitativeMap = {
          academic: { pos: '学业掌握有所精进', neg: '学业状态有所回落' },
          health:   { pos: '身心状态有所恢复', neg: '身心负担有所加重' },
          social:   { pos: '社交人脉有所拓展', neg: '人际关系略显疏远' },
          romance:  { pos: '情感生活有所升温', neg: '情感状态产生波动' },
          family:   { pos: '家庭支持更加和睦', neg: '家庭关系略显吃紧' },
          portfolio:{ pos: '代码作品进一步沉淀', neg: '作品进度受到延误' },
          research: { pos: '科研学术有所突破', neg: '科研进展略显停滞' },
          skill:    { pos: '工程硬技能得到锻炼', neg: '技能练习有所欠缺' },
          delivery: { pos: '闭环交付力有所提升', neg: '项目交付面临挑战' },
          reputation:{ pos: '行业口碑有所积累', neg: '行业声誉受到波及' },
          focus:    { pos: '专注定力更加稳固', neg: '专注状态受到影响' },
          ai_depth: { pos: '前沿 AI 深度有所拓展', neg: '技术探索有所受阻' }
        };

        let changesHtml = '';
        if (item.qualitative_changes && item.qualitative_changes.length > 0) {
          changesHtml += item.qualitative_changes.map(qc => `<span class="change-pill pos">${icon('trend-up')} ${qc}</span>`).join('');
        } else if (item.varDeltas) {
          changesHtml += Object.entries(item.varDeltas).map(([k, deltaStr]) => {
            const num = parseFloat(deltaStr);
            const map = deltaQualitativeMap[k];
            if (map) {
              const text = num > 0 ? map.pos : map.neg;
              return `<span class="change-pill ${num > 0 ? 'pos' : 'neg'}">${icon(num > 0 ? 'trend-up' : 'trend-down')} ${text}</span>`;
            }
            return '';
          }).filter(Boolean).join('');
        }

        if (item.tagsAdded && item.tagsAdded.length > 0) {
          changesHtml += item.tagsAdded.map(tag => {
            const mapped = FLAG_NARRATIVE_MAP[tag];
            return `<span class="change-pill tag">${icon('tag')} ${mapped ? mapped.title : tag}</span>`;
          }).join('');
        }

        if (s.resources.overdraft_EP > 0) {
          changesHtml += `<span class="change-pill neg">${icon('bolt')} 本月形成了精力透支，下个月开局状态会受到一定影响</span>`;
        }

        if (!changesHtml) {
          changesHtml = `<span class="change-pill pos">${icon('leaf')} 平稳过渡</span>`;
        }
        setHTML(elResultChangesList, changesHtml);

        // 计算本月是否还可以继续安排事件或休息 (月内循环多事件与休整判断)
        const remainingEvents = engine.getAvailableEvents();
        const REST_TU_COST = 1;
        const canRest = s.resources.TU_current >= REST_TU_COST;
        const hasExecutableNormalAction =
          !s.resources.recovery_lock
          && remainingEvents.some(event =>
            event.choices.some(choice =>
              s.resources.TU_current >= ((choice.cost && choice.cost.TU) || 0)
            )
          );
        const canContinueThisMonth = canRest || hasExecutableNormalAction;

        const nextMonthTotal = s.total_month + 1;
        const nextTl = window.MONTH_TIMELINE.find(t => t.total === nextMonthTotal);
        const nextName = nextTl ? nextTl.name.split(' (')[0] : '毕业收口';

        const elResultFooter = document.getElementById('result-footer-actions') || document.querySelector('.result-footer');
        if (elResultFooter) {
          if (canContinueThisMonth) {
            const continueBtnText = s.resources.recovery_lock ? '先休息调整' : '继续安排本月';
            setHTML(elResultFooter, `
              <div class="result-actions-row">
                <button class="btn-primary-advance" id="btn-result-continue-month">
                  <span>${icon('arrow')} ${continueBtnText}</span>
                </button>
                <button class="btn-secondary-advance" id="btn-result-next-month">
                  <span>结束本月，进入下个月 (${nextName}) &rarr;</span>
                </button>
              </div>
            `);
            const btnContinue = document.getElementById('btn-result-continue-month');
            if (btnContinue) {
              btnContinue.onclick = () => {
                currentPhase = 'choice';
                selectedEventId = null;
                renderAll();
              };
            }
          } else {
            setHTML(elResultFooter, `
              <div class="result-actions-row">
                <button class="btn-primary-advance" id="btn-result-next-month">
                  <span>结束本月，进入下个月 (${nextName}) &rarr;</span>
                </button>
              </div>
            `);
          }

          const btnNext = document.getElementById('btn-result-next-month');
          if (btnNext) {
            btnNext.onclick = () => {
              const nextRes = engine.nextMonth();
              currentPhase = 'choice';
              selectedEventId = null;
              if (nextRes.game_over) {
                showResumeModal(nextRes.resume);
              } else {
                renderAll();
              }
            };
          }
        }
      }
    }

    // 右侧极简速览栏
    renderQuickStatusSidebar(s);
  }

  /**
   * 渲染右侧极简速览栏
   */
  function renderQuickStatusSidebar(s) {
    const b = s.basic_states;
    const cap = s.capabilities;

    const quickItems = [
      { name: '学业绩点', icon: 'book', val: b.academic, qual: window.getBasicStateQualitative('academic', b.academic) },
      { name: '身心健康', icon: 'leaf', val: b.health, qual: window.getBasicStateQualitative('health', b.health) },
      { name: '专注定力', icon: 'target', val: cap.focus, qual: window.getCapQualitative('focus', cap.focus) },
      { name: '社交人脉', icon: 'users', val: b.social, qual: window.getBasicStateQualitative('social', b.social) },
      { name: '家庭支持', icon: 'home', val: b.family, qual: window.getBasicStateQualitative('family', b.family) }
    ];

    setHTML(elQuickStatusList, quickItems.map(item => {
      const range = window.getRangeLevel(item.val);
      return `
        <div class="quick-status-row">
          <span class="quick-status-name">${icon(item.icon)} ${item.name}</span>
          <span class="quick-status-badge badge-${range.badge}">${item.qual.level}</span>
        </div>
      `;
    }).join(''));

    // 最近成长
    const recentLogs = s.history.history_log.filter(l => l.type === 'ACTION').slice(0, 2);
    let growthHtml = '';
    recentLogs.forEach(l => {
      if (l.qualitative_changes && l.qualitative_changes.length > 0) {
        l.qualitative_changes.slice(0, 2).forEach(qc => {
          growthHtml += `<div class="growth-item-row"><span class="growth-item-icon">${icon('trend-up')}</span><span>${qc}</span></div>`;
        });
      }
    });
    if (!growthHtml) {
      growthHtml = '<div class="growth-item-row"><span style="color:#94a3b8;">新学期起步，积极行动中</span></div>';
    }
    setHTML(elRecentGrowthList, growthHtml);

    // 快捷跳转成长页
    if (elLinkToGrowthBtn) {
      elLinkToGrowthBtn.onclick = () => {
        switchTab('growth');
      };
    }
  }

  // ================= 5. 一级页面: 成长 (Growth View) =================
  function renderGrowthPage(s) {
    const b = s.basic_states;
    const cap = s.capabilities;

    const basicConfigs = {
      academic: { name: '学业绩点', icon: 'book' },
      health:   { name: '身心健康', icon: 'leaf' },
      social:   { name: '社交人脉', icon: 'users' },
      romance:  { name: '情感生活', icon: 'heart' },
      family:   { name: '家庭支持', icon: 'home' }
    };

    setHTML(elGrowthBasicStatesGrid, Object.entries(b).map(([k, v]) => {
      const cfg = basicConfigs[k] || { name: k, icon: 'spark' };
      const qual = window.getBasicStateQualitative(k, v);
      const range = window.getRangeLevel(v);
      return `
        <div class="state-card-item">
          <div class="state-item-head">
            <span class="state-item-name">${icon(cfg.icon)} ${cfg.name}</span>
            <span class="badge badge-${range.badge}">${qual.level}</span>
          </div>
          <div class="state-item-bar">
            <div class="state-bar-fill" style="width: ${v}%;"></div>
          </div>
          <div class="state-item-desc">${qual.desc}</div>
        </div>
      `;
    }).join(''));

    // 七维多边形雷达图
    setHTML(elGrowthRadarWrapper, generateRadarChartSVG(cap));

    // 七大能力卡片
    const capConfigs = {
      portfolio:  { name: '代码作品集', icon: 'code' },
      research:   { name: '学术科研力', icon: 'flask' },
      skill:      { name: '工程硬技能', icon: 'bolt' },
      delivery:   { name: '闭环交付力', icon: 'box' },
      reputation: { name: '行业口碑', icon: 'award' },
      focus:      { name: '专注定力', icon: 'target' },
      ai_depth:   { name: '前沿 AI 深度', icon: 'chip' }
    };

    setHTML(elGrowthCapGrid, Object.entries(cap).map(([k, v]) => {
      const cfg = capConfigs[k] || { name: k, icon: 'spark' };
      const qual = window.getCapQualitative(k, v);
      const range = window.getRangeLevel(v);
      return `
        <div class="cap-card-item">
          <div class="cap-card-top">
            <span class="cap-card-title">${icon(cfg.icon)} ${cfg.name}</span>
            <span class="badge badge-${range.badge}">${qual.level}</span>
          </div>
          <div class="cap-card-desc">${qual.desc}</div>
        </div>
      `;
    }).join(''));
  }

  // ================= 6. 一级页面: 路线 (Routes View) =================
  function renderRoutesPage(s) {
    const routesData = [
      {
        key: 'work',
        name: '校招就业路线 (Work Path)',
        icon: 'briefcase',
        status: s.routes.work.status,
        progress: Math.min(100, Math.round((s.capabilities.skill * 0.35 + s.capabilities.portfolio * 0.35 + s.capabilities.delivery * 0.3))),
        summary: '以工业级代码作品、高并发工程经验与大厂实习为核心的求职之路。',
        strengths: s.capabilities.portfolio >= 50 ? '已具备拿得出手的扎实代码作品集' : '工程硬技能处于稳步积累期',
        bottlenecks: s.capabilities.delivery < 40 ? '闭环交付能力与项目压测经验仍需提升' : '需重点冲击一线大厂暑期实习与提前批',
        milestone: s.history.flags['FLAG_WK_OFFER_SSP_ACCEPTED'] ? '已斩获顶级大厂核心研发 SSP Offer' : (s.history.flags['FLAG_WK_INTERN_ACCEPTED'] ? '已具备中大型企业研发实习经历' : '暂无大厂实习履历')
      },
      {
        key: 'postgrad_rec',
        name: '名校保研推免 (Recommendation)',
        icon: 'graduation',
        status: s.routes.postgrad_rec.status,
        progress: Math.min(100, Math.round(s.basic_states.academic * 0.6 + s.capabilities.research * 0.4)),
        summary: '以专业前 5% 拔尖绩点、重点实验室科研成果与权威夏令营拟录取为核心。',
        strengths: s.basic_states.academic >= 80 ? '学业绩点处于专业前列，保研底盘坚实' : '学业成绩平稳',
        bottlenecks: s.capabilities.research < 40 ? '学术论文产出与组会答辩经验相对薄弱' : '需全力准备夏令营机试与导师推荐信',
        milestone: s.history.flags['FLAG_REC_OFFER_ACCEPTED'] ? '已获得教育部推荐免试直博拟录取' : (s.history.flags['FLAG_REC_CAMP_PASS'] ? '已斩获顶尖学术夏令营优秀营员' : '正在稳固综合成绩排名')
      },
      {
        key: 'postgrad_exam',
        name: '全国考研统考 (Postgrad Exam)',
        icon: 'book',
        status: s.routes.postgrad_exam.status,
        progress: Math.min(100, Math.round(s.routes.postgrad_exam.exam_prep * 0.7 + s.capabilities.focus * 0.3)),
        summary: '以数学一、英语一与计算机专业综合 408 深度复习为核心的一战成硕之路。',
        strengths: s.capabilities.focus >= 60 ? '专注定力强，能够耐受高强度备考冲刺' : '备考心态良好',
        bottlenecks: s.routes.postgrad_exam.exam_prep < 50 ? '专业课真题刷题量与数学全真模考需加大投入' : '复试上机与专业面试需同步准备',
        milestone: s.history.flags['FLAG_GE_PASSED_FINAL'] ? '初试高分过线并顺利录取重点高校硕士' : (s.routes.postgrad_exam.exam_prep >= 70 ? '已完成三轮全真真题模拟攻坚' : '处于基础复习积累阶段')
      },
      {
        key: 'ailab',
        name: '极客工程与创业 (Geek & AI)',
        icon: 'flask',
        status: s.routes.ailab.phase,
        isGeek: true,
        progress: Math.min(100, Math.round(s.capabilities.ai_depth * 0.5 + s.capabilities.delivery * 0.5)),
        summary: '校外开源社区与商业智能体前沿工程组，主导真实商业项目全生命周期交付。',
        strengths: s.capabilities.ai_depth >= 50 ? '对 Multi-Agent 与大模型工程化有深度认知' : '具备敏锐的技术探索直觉',
        bottlenecks: s.capabilities.delivery < 50 ? '需在复杂真实商业流量下验证交付稳定性' : '可进一步探索技术合伙与早期创业机会',
        milestone: s.history.flags['FLAG_AI_CORE_ENTREPRENEUR'] ? '前沿具身智能创业团队核心技术合伙人' : (s.history.flags['FLAG_AI_JOINED_DEEP'] ? '已成为前沿极客实战工程组核心研发' : '暂未解开深入合作线索')
      }
    ];

    setHTML(elRoutesCardsContainer, routesData.map(r => {
      const isExpanded = !!expandedRoutes[r.key];
      const ailabInfo = r.isGeek ? window.getAILabPhaseCN(r.status) : null;
      const statusBadgeText = r.isGeek ? ailabInfo.statusBadge : window.getRouteStatusCN(r.status);
      const isAILabHidden = r.isGeek && ailabInfo.isHidden;

      if (isAILabHidden) {
        return `
          <div class="route-card" style="border-style:dashed; opacity:0.8;">
            <div class="route-card-header">
              <div class="route-title-group">
                <span class="route-icon">${icon('help')}</span>
                <span class="route-name" style="color:#64748b;">？？？ (未探索的课外机遇)</span>
              </div>
              <span class="badge badge-neutral">未解开线索</span>
            </div>
            <div class="route-summary-text" style="color:#94a3b8;">
              校内传闻：某些技术探索与深度投入可能会触发意想不到的发展线索...
            </div>
          </div>
        `;
      }

      return `
        <div class="route-card ${isExpanded ? 'expanded' : ''}" data-route-key="${r.key}">
          <div class="route-card-header" data-route-trigger="${r.key}">
            <div class="route-title-group">
              <span class="route-icon">${icon(r.icon)}</span>
              <span class="route-name">${r.name}</span>
            </div>
            <div class="route-progress-wrap">
              <div class="route-progress-bar-container">
                <div class="route-progress-bar-fill" style="width: ${r.progress}%;"></div>
              </div>
              <span class="badge badge-primary">${statusBadgeText}</span>
              <button class="route-expand-btn">${isExpanded ? '收起' : '详情'}</button>
            </div>
          </div>
          <div class="route-summary-text">${r.summary}</div>
          
          ${isExpanded ? `
            <div class="route-detail-drawer">
              <div class="route-detail-block">
                <span class="detail-block-label">${icon('spark')} 当前竞争优势：</span>
                <span class="detail-block-content">${r.strengths}</span>
              </div>
              <div class="route-detail-block">
                <span class="detail-block-label">${icon('warning')} 关键瓶颈与挑战：</span>
                <span class="detail-block-content">${r.bottlenecks}</span>
              </div>
              <div class="route-detail-block">
                <span class="detail-block-label">${icon('award')} 关键里程碑进展：</span>
                <span class="detail-block-content">${r.milestone}</span>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }).join(''));

    // 绑定展开点击
    elRoutesCardsContainer.querySelectorAll('[data-route-trigger]').forEach(header => {
      header.addEventListener('click', () => {
        const key = header.getAttribute('data-route-trigger');
        expandedRoutes[key] = !expandedRoutes[key];
        renderRoutesPage(s);
      });
    });
  }

  // ================= 7. 一级页面: 履历 (History View) =================
  function renderHistoryPage(s) {
    // 切换子面板显示
    Object.keys(historySubpanels).forEach(k => {
      if (historySubpanels[k]) {
        historySubpanels[k].style.display = (k === currentSubtab ? 'block' : 'none');
      }
    });

    // 绑定子导航点击
    document.querySelectorAll('.history-subtabs .subtab-btn').forEach(btn => {
      const target = btn.getAttribute('data-subtab');
      btn.classList.toggle('active', target === currentSubtab);
      btn.onclick = () => {
        currentSubtab = target;
        renderHistoryPage(s);
      };
    });

    if (currentSubtab === 'timeline') {
      // 1. 人生大事记时间轴
      const logs = s.history.history_log.filter(l => l.type === 'ACTION');
      if (logs.length === 0) {
        setHTML(elHistoryTimelineList, '<div style="text-align:center; padding:32px; color:#94a3b8;">你的人生履历才刚刚开始，去创造属于你的大学回忆吧。</div>');
      } else {
        setHTML(elHistoryTimelineList, logs.map(l => {
          const bullets = (l.qualitative_changes && l.qualitative_changes.length > 0)
            ? l.qualitative_changes.map(qc => `<span class="change-pill pos">${qc}</span>`).join('')
            : '';
          return `
            <div class="timeline-item">
              <div class="timeline-item-head">
                <span class="timeline-month-badge">[第 ${l.month} 个月 · ${l.timeName ? l.timeName.split(' (')[0] : ''}]</span>
                <span class="badge badge-neutral">${l.eventTitle}</span>
              </div>
              <div class="timeline-title">${icon('arrow')} 采取行动：${l.choiceText}</div>
              <div class="timeline-desc">${l.resultText}</div>
              ${bullets ? `<div class="timeline-tags">${bullets}</div>` : ''}
            </div>
          `;
        }).join(''));
      }
    } else if (currentSubtab === 'milestones') {
      // 2. 关键里程碑
      const flagsKeys = Object.keys(s.history.flags);
      if (flagsKeys.length === 0) {
        setHTML(elHistoryMilestonesGrid, '<div style="text-align:center; padding:32px; color:#94a3b8; grid-column:1/-1;">尚未解锁关键人生里程碑，在大学四年中积极把握机遇吧！</div>');
      } else {
        setHTML(elHistoryMilestonesGrid, flagsKeys.map(k => {
          const mapped = FLAG_NARRATIVE_MAP[k] || { title: `${k}`, desc: '达成关键发展经历节点' };
          return `
            <div class="milestone-badge-card">
              <span class="milestone-card-icon">${icon('award')}</span>
              <div>
                <div class="milestone-card-title">${mapped.title}</div>
                <div class="milestone-card-desc">${mapped.desc}</div>
              </div>
            </div>
          `;
        }).join(''));
      }
    } else if (currentSubtab === 'projects') {
      // 3. STAR 项目库
      const pool = s.history.resume_pool || [];
      if (pool.length === 0) {
        setHTML(elHistoryProjectsList, '<div style="text-align:center; padding:32px; color:#94a3b8;">暂无独立主导的工程项目经历积累。</div>');
      } else {
        setHTML(elHistoryProjectsList, pool.map(p => `
          <div class="project-card">
            <div class="project-card-top">
              <span class="project-card-name">${p.title}</span>
              <span class="project-card-role">${p.category || '项目经历'} · ${p.stage_contribution || '核心主导'}</span>
            </div>
            <div class="project-card-desc">${p.description}</div>
          </div>
        `).join(''));
      }
    } else if (currentSubtab === 'resume-view') {
      // 4. 毕业成果预览 / 正式简历
      if (s.game_over && s.final_resume) {
        renderResumeModalContent(s.final_resume, elHistoryResumePreview);
      } else {
        setHTML(elHistoryResumePreview, `
          <div style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:36px; text-align:center;">
            <div class="resume-empty-icon">${icon('document')}</div>
            <h3 style="font-size:1.15rem; font-weight:800; margin-bottom:6px;">毕业成果与标准简历正在形成中</h3>
            <p style="font-size:0.86rem; color:#64748b; max-width:440px; margin:0 auto 16px auto;">
              当前处于大学第 ${s.total_month}/42 个月。四年来积累的学业成绩、科研论文、大厂实习与极客项目将在大四 6 月毕业典礼时全景收口为大赛级标准 A4 毕业简历与毕业去向荣誉证书。
            </p>
            <div style="display:inline-block; background:#f1f5f9; padding:6px 16px; border-radius:9999px; font-size:0.8rem; font-weight:700; color:#3b82f6;">
              ${icon('clock')} 距大学毕业收口还剩 ${Math.max(0, 42 - s.total_month)} 个月
            </div>
          </div>
        `);
      }
    }
  }

  // ================= 8. 选项卡路由切换 =================
  function switchTab(tabKey) {
    if (!tabPanels[tabKey]) return;
    currentTab = tabKey;
    Object.keys(tabPanels).forEach(k => {
      tabPanels[k].classList.toggle('active', k === tabKey);
      if (navBtns[k]) navBtns[k].classList.toggle('active', k === tabKey);
    });
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  Object.keys(navBtns).forEach(k => {
    if (navBtns[k]) {
      navBtns[k].addEventListener('click', () => switchTab(k));
    }
  });

  // ================= 9. 七维多边形能力雷达图生成器 =================
  function generateRadarChartSVG(cap) {
    const dimensions = [
      { key: 'portfolio', name: '作品集' },
      { key: 'research', name: '学术科研' },
      { key: 'skill', name: '工程硬技能' },
      { key: 'delivery', name: '闭环交付力' },
      { key: 'reputation', name: '行业口碑' },
      { key: 'focus', name: '专注定力' },
      { key: 'ai_depth', name: '前沿AI深度' }
    ];

    const N = dimensions.length;
    const cx = 240;
    const cy = 190;
    const maxR = 115;
    const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

    // 同心多边形网格
    let gridRingsHtml = '';
    levels.forEach((lvl, idx) => {
      const r = maxR * lvl;
      const points = [];
      for (let i = 0; i < N; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
        points.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
      }
      gridRingsHtml += `<polygon points="${points.join(' ')}" class="radar-grid-ring ${idx === levels.length - 1 ? 'outer' : ''}" />`;
    });

    // 放射轴线与文字
    let spokesHtml = '';
    let labelsHtml = '';
    dimensions.forEach((dim, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      spokesHtml += `<line x1="${cx}" y1="${cy}" x2="${(cx + maxR * cosA).toFixed(1)}" y2="${(cy + maxR * sinA).toFixed(1)}" class="radar-spoke" />`;

      const labelR = maxR + 25;
      const lx = cx + labelR * cosA;
      const ly = cy + labelR * sinA;
      let textAnchor = 'middle';
      if (cosA > 0.15) textAnchor = 'start';
      else if (cosA < -0.15) textAnchor = 'end';

      const val = cap && cap[dim.key] !== undefined ? cap[dim.key] : 0;
      const qual = window.getCapQualitative(dim.key, val);

      labelsHtml += `
        <g transform="translate(${lx.toFixed(1)}, ${ly.toFixed(1)})">
          <text x="0" y="-3" text-anchor="${textAnchor}" class="radar-label-title">${dim.name}</text>
          <text x="0" y="11" text-anchor="${textAnchor}" class="radar-label-sub">${qual.level}</text>
        </g>
      `;
    });

    // 数据多边形
    const dataPoints = [];
    let dataPointsHtml = '';
    dimensions.forEach((dim, i) => {
      const val = cap && cap[dim.key] !== undefined ? cap[dim.key] : 0;
      const qual = window.getCapQualitative(dim.key, val);
      const ratio = Math.max(0.08, Math.min(1.0, val / 100));
      const r = maxR * ratio;
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      dataPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      dataPointsHtml += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" class="radar-point"><title>${dim.name}: ${qual.level} · ${qual.desc}</title></circle>`;
    });

    return `
      <div class="radar-chart-container">
        <svg class="radar-chart-svg" viewBox="0 0 480 380">
          <defs>
            <linearGradient id="radarPolyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.55" />
              <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.35" />
            </linearGradient>
          </defs>
          ${gridRingsHtml}
          ${spokesHtml}
          <polygon points="${dataPoints.join(' ')}" class="radar-polygon" />
          ${dataPointsHtml}
          ${labelsHtml}
        </svg>
      </div>
    `;
  }

  // ================= 10. 毕业大结局与简历弹窗渲染 =================
  function renderResumeModalContent(resume, targetEl) {
    const container = targetEl || elResumeContent;
    if (!container) return;

    if (activeResumeTab === 'certificate') {
      const end = resume.ending;
      const highlightsHtml = (end.highlights && end.highlights.length > 0)
        ? end.highlights.map(h => `<li>${h}</li>`).join('')
        : '<li>大学四年保持了身心平稳与健康心态</li>';
      const regretsHtml = (end.regrets && end.regrets.length > 0)
        ? end.regrets.map(r => `<li>${r}</li>`).join('')
        : '<li>无重大遗憾</li>';

      setHTML(container, `
        <div class="parents-outcome-card">
          <div class="outcome-cert-header">
            <div class="cert-stamp-badge">${icon('award')} ${end.rank} 级毕业成就</div>
            <h2 class="cert-main-title">${end.title || end.name}</h2>
            <div class="cert-subtitle">本科毕业发展收口认定证书 · 2030届</div>
          </div>
          <div class="outcome-destination-banner">
            <div class="outcome-dest-label">${icon('target')} 最终毕业去向 / 录取录用单位</div>
            <div class="outcome-dest-name">${end.destination || end.name}</div>
            <div class="outcome-salary-box">
              <span>${icon('coins')} 预期待遇：</span>
              <span>${end.salary || '阶段性发展'}</span>
            </div>
          </div>
          <div class="outcome-details-grid">
            <div class="outcome-box">
              <div class="outcome-box-title">${icon('spark')} 四年高光时刻</div>
              <ul class="outcome-list highlights">${highlightsHtml}</ul>
            </div>
            <div class="outcome-box">
              <div class="outcome-box-title">${icon('chat')} 人生遗憾与代价</div>
              <ul class="outcome-list regrets">${regretsHtml}</ul>
            </div>
          </div>
          <div class="outcome-box" style="margin-bottom:16px;">
            <div class="outcome-box-title">${icon('chart')} 毕业七大核心能力资产雷达图</div>
            ${generateRadarChartSVG(resume.capabilities)}
          </div>
          <div class="outcome-desc-text">
            <strong>${icon('graduation')} 毕业评语：</strong>${end.desc}
          </div>
        </div>
      `);
    } else {
      const projectEntries = resume.entries.filter(e => e.category === '项目研发' || e.category === '开源项目' || e.category === '科研学术');
      const otherEntries = resume.entries.filter(e => e.category !== '项目研发' && e.category !== '开源项目' && e.category !== '科研学术');

      let projectsHtml = projectEntries.map(e => `
        <div class="resume-project-item">
          <div class="project-item-top">
            <span><strong>${e.title}</strong></span>
            <span class="project-role-tag">${e.category} · ${e.stage_contribution || '核心主导'}</span>
          </div>
          <ul class="project-desc-bullets">
            <li>${e.description}</li>
          </ul>
        </div>
      `).join('') || '<p style="font-size:0.84rem; color:#64748b;">大学期间以通识课业为主，暂无独立主导的工程项目积累。</p>';

      let honorsHtml = otherEntries.map(e => `
        <div style="font-size:0.86rem; margin-bottom:6px; color:#334155;">
          • <strong>${e.title}</strong>：${e.description}
        </div>
      `).join('') || '<p style="font-size:0.84rem; color:#64748b;">完成大学常规培养计划，无违纪记录。</p>';

      setHTML(container, `
        <div class="standard-resume">
          <div class="resume-paper-header">
            <div>
              <div class="resume-candidate-name">${resume.name}</div>
              <div class="resume-target-title">毕业去向：${resume.ending.name}</div>
            </div>
            <div class="resume-contact-info">
              <div>${icon('graduation')} 毕业年份：${resume.graduation_date}</div>
              <div>${icon('pin')} 毕业院校：${resume.university} (${resume.major})</div>
              <div>${icon('award')} 学业评估：${resume.academic_evaluation}</div>
            </div>
          </div>
          <div class="resume-block">
            <div class="resume-block-heading">${icon('graduation')} 教育背景 / Education</div>
            <div class="resume-edu-row">
              <span>${resume.university} · 计算机科学与技术</span>
              <span>工学学士 (2026.09 - 2030.06)</span>
            </div>
            <div class="resume-edu-sub">
              <span>主修课程：数据结构、计算机体系结构、操作系统、分布式计算、AI Agent 智能体系统</span>
              <span>绩点评级：${resume.academic_evaluation}</span>
            </div>
          </div>
          <div class="resume-block">
            <div class="resume-block-heading">${icon('code')} 核心项目与科研经历 / Projects & Research (STAR)</div>
            ${projectsHtml}
          </div>
          <div class="resume-block">
            <div class="resume-block-heading">${icon('award')} 荣誉竞赛与实习历程 / Honors & Activities</div>
            ${honorsHtml}
          </div>
          <div class="resume-block">
            <div class="resume-block-heading">${icon('bolt')} 专业技能与综合能力雷达 / Professional Skills & Radar</div>
            ${generateRadarChartSVG(resume.capabilities)}
          </div>
        </div>
      `);
    }
  }

  function showResumeModal(resume) {
    if (!elResumeModal) return;
    renderResumeModalContent(resume);
    elResumeModal.style.display = 'flex';
  }

  if (elTabBtnCert) {
    elTabBtnCert.onclick = () => {
      activeResumeTab = 'certificate';
      elTabBtnCert.classList.add('active');
      if (elTabBtnResume) elTabBtnResume.classList.remove('active');
      if (engine.state.final_resume) renderResumeModalContent(engine.state.final_resume);
    };
  }

  if (elTabBtnResume) {
    elTabBtnResume.onclick = () => {
      activeResumeTab = 'resume';
      elTabBtnResume.classList.add('active');
      if (elTabBtnCert) elTabBtnCert.classList.remove('active');
      if (engine.state.final_resume) renderResumeModalContent(engine.state.final_resume);
    };
  }

  if (elBtnCloseResume) {
    elBtnCloseResume.onclick = () => {
      if (elResumeModal) elResumeModal.style.display = 'none';
    };
  }

  // ================= 11. 菜单与存档系统 =================
  if (elBtnOpenMenu) {
    elBtnOpenMenu.onclick = () => {
      if (elMenuModal) elMenuModal.style.display = 'flex';
    };
  }
  if (elBtnCloseMenu) {
    elBtnCloseMenu.onclick = () => {
      if (elMenuModal) elMenuModal.style.display = 'none';
    };
  }

  if (elMenuBtnSave) {
    elMenuBtnSave.onclick = () => {
      try {
        localStorage.setItem('univ_sim_save_v2', JSON.stringify(engine.state));
        alert('游戏进度已成功保存在本地浏览器！');
        if (elMenuModal) elMenuModal.style.display = 'none';
      } catch (err) {
        alert('保存失败：' + err.message);
      }
    };
  }

  if (elMenuBtnLoad) {
    elMenuBtnLoad.onclick = () => {
      try {
        const saved = localStorage.getItem('univ_sim_save_v2');
        if (!saved) {
          alert('未找到本地存档记录！');
          return;
        }
        initGame(JSON.parse(saved));
        alert('已成功读取并恢复存档！');
        if (elMenuModal) elMenuModal.style.display = 'none';
      } catch (err) {
        alert('读取存档失败：' + err.message);
      }
    };
  }

  if (elMenuBtnRestart) {
    elMenuBtnRestart.onclick = () => {
      if (confirm('确定要重新开始大学四年人生吗？当前未保存的进度将被重置。')) {
        initGame();
        if (elMenuModal) elMenuModal.style.display = 'none';
      }
    };
  }

  if (elMenuBtnOpenDebug) {
    elMenuBtnOpenDebug.onclick = () => {
      if (elMenuModal) elMenuModal.style.display = 'none';
      openDebugConsole();
    };
  }

  // ================= 12. 开发者调试控制台 (Debug Console) =================
  function openDebugConsole() {
    if (!elDebugModal) return;
    renderDebugConsole();
    elDebugModal.style.display = 'flex';
  }

  if (elBtnCloseDebug) {
    elBtnCloseDebug.onclick = () => {
      if (elDebugModal) elDebugModal.style.display = 'none';
    };
  }

  function renderDebugConsole() {
    // 1. 月份选择下拉
    if (elDbgMonthSelect) {
      setHTML(elDbgMonthSelect, window.MONTH_TIMELINE.map(t => `<option value="${t.total}" ${t.total === engine.state.total_month ? 'selected' : ''}>第 ${t.total} 月 · ${t.name}</option>`).join(''));
    }

    // 2. 结局直接触发按钮
    if (elDbgEndingBtns) {
      const endings = ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E09', 'E10', 'E11', 'E12', 'E13', 'E14', 'E15'];
      setHTML(elDbgEndingBtns, endings.map(id => `<button class="btn-ending-test" data-eid="${id}">${id} 测试</button>`).join(''));
      elDbgEndingBtns.querySelectorAll('.btn-ending-test').forEach(btn => {
        btn.onclick = () => {
          const eid = btn.getAttribute('data-eid');
          engine.state.total_month = 42;
          const endObj = engine.evaluateFinalEnding();
          endObj.id = eid;
          engine.state.final_ending = endObj;
          engine.state.final_resume = engine.generateFinalResume();
          showResumeModal(engine.state.final_resume);
        };
      });
    }

    // 3. 原始 JSON 状态
    if (elDbgRawState) {
      elDbgRawState.textContent = formatDebugState(engine.state);
    }
  }

  if (elDbgBtnJumpMonth) {
    elDbgBtnJumpMonth.onclick = () => {
      const targetMonth = parseInt(elDbgMonthSelect.value, 10);
      engine.state.total_month = targetMonth;
      engine.state.time = engine.getCurrentTimeline();
      engine.startOfMonthHook();
      currentPhase = 'choice';
      selectedEventId = null;
      renderAll();
      if (elDebugModal) elDebugModal.style.display = 'none';
    };
  }

  // 快捷预设绑定
  const presetBindings = {
    'dbg-route-a': () => {
      initGame();
      engine.state.capabilities.skill = 80;
      engine.state.capabilities.portfolio = 85;
      engine.state.capabilities.delivery = 80;
      engine.state.routes.work.status = 'COMPLETED';
      engine.state.routes.ailab.phase = 'CORE';
      engine.state.history.flags['FLAG_WK_OFFER_SSP_ACCEPTED'] = true;
      engine.state.history.resume_pool.push({
        chain_id: 'CHAIN_BIG_PROJECT',
        title: '高并发分布式存储引擎 (开源发布级)',
        category: '开源项目',
        stage_contribution: '架构师 / 独立主导',
        description: '独立基于 C++20 与 Raft 共识协议研发千万级高并发分布式存储系统，GitHub 获星 800+，通过阿里顶级校招面试。'
      });
      engine.state.total_month = 42;
      engine.nextMonth();
      renderAll();
    },
    'dbg-route-b': () => {
      initGame();
      engine.state.basic_states.academic = 92;
      engine.state.capabilities.research = 75;
      engine.state.routes.postgrad_rec.status = 'COMPLETED';
      engine.state.history.flags['FLAG_REC_OFFER_ACCEPTED'] = true;
      engine.state.history.resume_pool.push({
        chain_id: 'CHAIN_ACADEMIC_PAPER',
        title: '多智能体自适应调度算法研究 (顶会拟投)',
        category: '科研学术',
        stage_contribution: '第一作者',
        description: '在国家重点实验室主导多智能体强化学习调度研究，完成全部仿真实验并撰写全英文长文，获全国夏令营优秀营员。'
      });
      engine.state.total_month = 42;
      engine.nextMonth();
      renderAll();
    },
    'dbg-route-c': () => {
      initGame();
      engine.state.routes.postgrad_exam.status = 'COMPLETED';
      engine.state.routes.postgrad_exam.exam_prep = 90;
      engine.state.capabilities.focus = 80;
      engine.state.history.flags['FLAG_GE_PASSED_FINAL'] = true;
      engine.state.total_month = 42;
      engine.nextMonth();
      renderAll();
    },
    'dbg-route-d': () => {
      initGame();
      engine.state.capabilities.skill = 65;
      engine.state.capabilities.portfolio = 65;
      engine.state.routes.work.status = 'COMPLETED';
      engine.state.history.flags['FLAG_WK_OFFER_SP_ACCEPTED'] = true;
      engine.state.total_month = 42;
      engine.nextMonth();
      renderAll();
    },
    'dbg-route-e': () => {
      initGame();
      engine.state.capabilities.ai_depth = 90;
      engine.state.capabilities.delivery = 85;
      engine.state.routes.ailab.phase = 'CORE';
      engine.state.history.flags['FLAG_AI_CORE_ENTREPRENEUR'] = true;
      engine.state.total_month = 42;
      engine.nextMonth();
      renderAll();
    }
  };

  Object.entries(presetBindings).forEach(([btnId, handler]) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.onclick = () => {
        handler();
        if (elDebugModal) elDebugModal.style.display = 'none';
      };
    }
  });

  // URL ?debug=true 自动检测
  if (window.location.search.includes('debug=true')) {
    openDebugConsole();
  }

  // 启动游戏
  initGame();
});


