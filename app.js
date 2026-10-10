// ==========================================================================
// QUIZ CALORIASFIT — APLICATIVO INTELIGENTE DE CALORIAS & ALIMENTAÇÃO
// Motor interativo completo com 24 etapas, Web Audio API, vídeo e oferta
// ==========================================================================

// --- 1. MOTOR DE ÁUDIO TÁTIL (Web Audio API) ---
class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.initAudio();
  }

  initAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      this.audioCtx = new AudioContext();
    }
  }

  ensureContext() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    const btn = document.getElementById('sound-toggle-btn');
    const label = document.getElementById('sound-toggle-label');
    const icon = document.getElementById('sound-icon');
    if (btn) {
      if (this.enabled) {
        btn.classList.remove('opacity-50');
        if (icon) icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />`;
        if (label) label.innerText = 'Sonido Activo';
        this.playSuccess();
      } else {
        btn.classList.add('opacity-50');
        if (icon) icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />`;
        if (label) label.innerText = 'Silenciado';
      }
    }
    return this.enabled;
  }

  playPop() {
    if (!this.enabled) return;
    try {
      this.ensureContext();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, this.audioCtx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.09);
    } catch (e) {}
  }

  playSuccess() {
    if (!this.enabled) return;
    try {
      this.ensureContext();
      const now = this.audioCtx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.15, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.16);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.18);
      });
    } catch (e) {}
  }

  playFanfare() {
    if (!this.enabled) return;
    try {
      this.ensureContext();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const now = this.audioCtx.currentTime;
      notes.forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.2, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.4);
      });
    } catch (e) {}
  }
}

const sounds = new SoundEngine();

// --- 2. SISTEMA DE RASTREAMENTO DO QUIZ & FUNIL DE ABANDONO ---
const QuizTracker = {
  sessionIdKey: 'quiz_tracking_session_id',
  completedStepsKey: 'quiz_completed_steps',
  startedKey: 'quiz_started_tracked',
  completedKey: 'quiz_completed_tracked',
  trackedStepsSet: new Set(),
  hasAbandonedThisCycle: false,
  isCompleted: false,

  getSessionId() {
    try {
      let sid = sessionStorage.getItem(this.sessionIdKey);
      if (!sid) {
        sid = localStorage.getItem(this.sessionIdKey);
      }
      if (!sid) {
        sid = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem(this.sessionIdKey, sid);
        localStorage.setItem(this.sessionIdKey, sid);
      }
      return sid;
    } catch (e) {
      return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
    }
  },

  getDeviceType() {
    try {
      const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
      if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'mobile';
      }
      if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua) || (typeof window !== 'undefined' && window.innerWidth && window.innerWidth <= 768)) {
        return 'mobile';
      }
      return 'desktop';
    } catch (e) {
      return 'desktop';
    }
  },

  init() {
    try {
      const savedSteps = sessionStorage.getItem(this.completedStepsKey);
      if (savedSteps) {
        const parsed = JSON.parse(savedSteps);
        if (Array.isArray(parsed)) {
          this.trackedStepsSet = new Set(parsed);
        }
      }
      if (sessionStorage.getItem(this.completedKey) === 'true') {
        this.isCompleted = true;
      }
      this.flushOfflineEvents();
    } catch (e) {}

    // Rastreamento de Abandono (visibilitychange / pagehide / beforeunload)
    const handleAbandonment = () => {
      if (this.isCompleted || this.hasAbandonedThisCycle) return;
      this.hasAbandonedThisCycle = true;
      const currentStep = (typeof QuizState !== 'undefined' && QuizState.currentStep) ? QuizState.currentStep : 1;
      const stepName = (typeof stepsData !== 'undefined' && stepsData[currentStep]) ? stepsData[currentStep].title : `Etapa ${currentStep}`;

      this.sendEvent('quiz_abandoned', {
        last_step: currentStep,
        last_step_name: stepName
      });
    };

    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          handleAbandonment();
        } else if (document.visibilityState === 'visible') {
          this.hasAbandonedThisCycle = false;
          this.flushOfflineEvents();
        }
      });
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('pagehide', () => {
        handleAbandonment();
      });
      window.addEventListener('beforeunload', () => {
        handleAbandonment();
      });
      window.addEventListener('online', () => {
        this.flushOfflineEvents();
      });
    }
  },

  enqueueOfflineEvent(payload) {
    try {
      const q = JSON.parse(localStorage.getItem('quiz_offline_events_queue') || '[]');
      if (q.length < 50) q.push(payload);
      localStorage.setItem('quiz_offline_events_queue', JSON.stringify(q));
    } catch (e) {}
  },

  flushOfflineEvents() {
    try {
      const q = JSON.parse(localStorage.getItem('quiz_offline_events_queue') || '[]');
      if (!Array.isArray(q) || q.length === 0) return;
      localStorage.removeItem('quiz_offline_events_queue');
      q.forEach(ev => this.dispatchToBackend(ev));
    } catch (e) {}
  },

  sendEvent(eventName, params = {}) {
    const payload = {
      event_name: eventName,
      event: eventName,
      session_id: this.getSessionId(),
      timestamp: new Date().toISOString(),
      device_type: this.getDeviceType(),
      ...params
    };

    if (typeof QuizState !== 'undefined' && QuizState.analyticsEvents) {
      QuizState.analyticsEvents.push(payload);
    }
    try {
      const logs = JSON.parse(localStorage.getItem('calorias_analytics_log') || '[]');
      logs.push(payload);
      if (logs.length > 200) logs.shift();
      localStorage.setItem('calorias_analytics_log', JSON.stringify(logs));
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);

      if (typeof window.gtag === 'function') {
        try { window.gtag('event', eventName, payload); } catch (e) {}
      }

      if (typeof window.fbq === 'function') {
        try { window.fbq('trackCustom', eventName, payload); } catch (e) {}
      }
    }

    this.dispatchToBackend(payload);
    console.log(`📊 [Tracker - ${eventName}]:`, payload);
  },

  getUpstashConfig() {
    const cfg = (typeof window !== 'undefined' && window.CALORIAS_ANALYTICS_CONFIG) || {};
    let url = (cfg.upstashUrl || cfg.UPSTASH_REDIS_REST_URL || '').trim();
    let token = (cfg.upstashToken || cfg.UPSTASH_REDIS_REST_TOKEN || '').trim();
    if (!url || !token) {
      try {
        url = url || (localStorage.getItem('calori_upstash_url') || '').trim();
        token = token || (localStorage.getItem('calori_upstash_token') || '').trim();
      } catch (e) {}
    }
    if (url && token) {
      return { url: url.replace(/\/+$/, ''), token };
    }
    return null;
  },

  sendDirectToUpstash(payload) {
    const cfg = this.getUpstashConfig();
    if (!cfg) return false;
    try {
      const pipelineBody = JSON.stringify([
        ['RPUSH', 'calori_analytics_events', JSON.stringify(payload)],
        ['LTRIM', 'calori_analytics_events', -10000, -1]
      ]);
      fetch(`${cfg.url}/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.token}`,
          'Content-Type': 'application/json'
        },
        body: pipelineBody,
        keepalive: true
      }).then(res => {
        if (res.ok) {
          console.log(`✅ [Tracker] Evento "${payload.event_name}" salvo no Upstash Redis com sucesso (Modo Netlify Drop).`);
        } else {
          console.warn(`⚠️ [Tracker] Upstash Redis retornou HTTP ${res.status}.`);
          this.enqueueOfflineEvent(payload);
        }
      }).catch(err => {
        console.warn(`⚠️ [Tracker] Falha de conexão direta com Upstash: ${err.message}`);
        this.enqueueOfflineEvent(payload);
      });
      return true;
    } catch (err) {
      this.enqueueOfflineEvent(payload);
      return false;
    }
  },

  dispatchToBackend(payload) {
    if (typeof window === 'undefined') return;
    const bodyStr = JSON.stringify(payload);
    const origin = (window.location && window.location.origin && window.location.origin !== 'null') ? window.location.origin : '';
    const endpoint = origin ? `${origin}/api/track` : '/api/track';
    const fallbackEndpoint = origin ? `${origin}/.netlify/functions/track` : '/.netlify/functions/track';

    const handleFailover = () => {
      const directSuccess = this.sendDirectToUpstash(payload);
      if (!directSuccess) {
        console.info(`ℹ️ [Tracker] Netlify Drop detectado (/api/track indisponível). Configure UPSTASH no analytics-config.js para salvar visitas em produção.`);
        this.enqueueOfflineEvent(payload);
      }
    };

    // 1. Tenta API Serverless do backend
    if (typeof fetch === 'function') {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
        keepalive: true
      }).then(res => {
        if (res.ok) {
          console.log(`📡 [Tracker] Evento "${payload.event_name}" entregue via API (${endpoint}).`);
          return;
        }
        // Se a rota reescrita falhar (404), tenta o caminho direto da função
        fetch(fallbackEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyStr,
          keepalive: true
        }).then(res2 => {
          if (res2.ok) {
            console.log(`📡 [Tracker] Evento "${payload.event_name}" entregue via Netlify Function (${fallbackEndpoint}).`);
            return;
          }
          // Ambas as rotas serverless falharam (cenário Netlify Drop) -> Envia direto para o Upstash Redis
          handleFailover();
        }).catch(() => {
          handleFailover();
        });
      }).catch(() => {
        handleFailover();
      });
      return;
    }

    // 2. Fallback para sendBeacon em navegadores legados
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([bodyStr], { type: 'application/json' });
        const sent = navigator.sendBeacon(endpoint, blob);
        if (!sent) handleFailover();
      } catch (e) {
        handleFailover();
      }
    } else {
      handleFailover();
    }
  },

  trackQuizStarted(firstStep = 1) {
    try {
      if (sessionStorage.getItem(this.startedKey) === 'true') return;
      sessionStorage.setItem(this.startedKey, 'true');
    } catch (e) {}

    const stepName = (typeof stepsData !== 'undefined' && stepsData[firstStep]) ? stepsData[firstStep].title : `Etapa ${firstStep}`;

    this.sendEvent('quiz_started', {
      first_step: firstStep,
      step_name: stepName
    });
  },

  trackStepCompleted(stepNum) {
    if (typeof stepNum !== 'number') stepNum = parseInt(stepNum, 10);
    if (isNaN(stepNum) || stepNum < 1) return;

    if (this.trackedStepsSet.has(stepNum)) return;
    this.trackedStepsSet.add(stepNum);

    try {
      sessionStorage.setItem(this.completedStepsKey, JSON.stringify(Array.from(this.trackedStepsSet)));
    } catch (e) {}

    const stepName = (typeof stepsData !== 'undefined' && stepsData[stepNum]) ? stepsData[stepNum].title : `Etapa ${stepNum}`;

    this.sendEvent('quiz_step_completed', {
      step_number: stepNum,
      step_name: stepName
    });

    if (stepNum >= (typeof QuizState !== 'undefined' ? QuizState.totalSteps - 1 : 23)) {
      this.trackQuizCompleted();
    }
  },

  trackQuizCompleted() {
    if (this.isCompleted) return;
    this.isCompleted = true;
    try {
      sessionStorage.setItem(this.completedKey, 'true');
    } catch (e) {}

    const totalSteps = typeof QuizState !== 'undefined' ? QuizState.totalSteps : 24;

    this.sendEvent('quiz_completed', {
      total_steps: totalSteps
    });
  },

  trackCheckoutClick() {
    this.sendEvent('quiz_checkout_clicked', {
      step_number: 24,
      action: 'checkout_redirect'
    });
  }
};

// --- 2. GERENCIADOR DE ESTADO & ANALYTICS ---
const QuizState = {
  currentStep: 1,
  totalSteps: 24,
  answers: {
    primary_goal: '',
    age_range: '',
    body_perception: '',
    conditions: [],
    daily_difficulty: '',
    weight_goal: '',
    body_goal: '',
    metabolism_perception: '',
    exercise_confidence: '',
    abdominal_fat: '',
    after_40_change: '',
    additional_goals: [],
    barriers: [],
    routine: '',
    currently_exercises: '',
    exercise_frequency: '',
    solution_belief: '',
    inaction_consequence: '',
    commitment_minutes: '',
    consent_to_contact: true
  },
  history: [],
  analyticsEvents: [],

  logEvent(name, data = {}) {
    QuizTracker.sendEvent(name, {
      step: this.currentStep,
      ...data
    });
  },

  save() {
    try {
      localStorage.setItem('calorias_quiz_state', JSON.stringify({
        currentStep: this.currentStep,
        answers: this.answers
      }));
    } catch (e) {}
  },

  load() {
    try {
      const saved = localStorage.getItem('calorias_quiz_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.answers) {
          this.answers = { ...this.answers, ...parsed.answers };
        }
      }
    } catch (e) {}
  },

  reset() {
    localStorage.removeItem('calorias_quiz_state');
    this.currentStep = 1;
    this.history = [];
    this.answers = {
      primary_goal: '',
      age_range: '',
      body_perception: '',
      conditions: [],
      daily_difficulty: '',
      weight_goal: '',
      body_goal: '',
      metabolism_perception: '',
      exercise_confidence: '',
      abdominal_fat: '',
      after_40_change: '',
      additional_goals: [],
      barriers: [],
      routine: '',
      currently_exercises: '',
      exercise_frequency: '',
      solution_belief: '',
      inaction_consequence: '',
      commitment_minutes: '',
      consent_to_contact: true
    };
    renderStep();
  }
};

// --- 3. EFEITOS VISUAIS E CONFETES ---
function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 50,
      spread: 65,
      origin: { y: 0.65 },
      colors: ['#10b981', '#f97316', '#3b82f6', '#ec4899', '#fbbf24']
    });
  }
}

function createRipple(event, element) {
  const circle = document.createElement('span');
  const diameter = Math.max(element.clientWidth, element.clientHeight);
  const radius = diameter / 2;
  const rect = element.getBoundingClientRect();

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add('ripple');

  const existingRipple = element.querySelector('.ripple');
  if (existingRipple) existingRipple.remove();

  element.appendChild(circle);
}

// // --- 4. DEFINIÇÃO DETALHADA DAS 24 ETAPAS (ADAPTADAS PARA APP DE CALORIAS) ---
const stepsData = {
  // ETAPA 1
  1: {
    type: 'hero_intro',
    key: 'primary_goal',
    title: 'Ten más control sobre tu alimentación y tus calorías',
    subtitle: 'Descubre cómo Calori AI puede facilitar el seguimiento de tus comidas y simplificar tu rutina diaria.',
    promptTitle: 'PERSONALIZA TU EXPERIENCIA',
    promptSubtitle: 'Elige una opción a continuación:',
    timer: '~49 segundos',
    options: [
      {
        value: 'controlar_calorias',
        label: 'Quiero controlar mis calorías',
        desc: 'Ten mayor precisión en lo que comes y alcanza tus objetivos.',
        icon: '🔥'
      },
      {
        value: 'melhorar_alimentacao',
        label: 'Quiero mejorar mi alimentación',
        desc: 'Toma decisiones más saludables y equilibradas cada día.',
        icon: '🥗'
      },
      {
        value: 'acompanhar_refeicoes',
        label: 'Quiero registrar mis comidas',
        desc: 'Registra tus platos y visualiza todo de forma práctica.',
        icon: '📸'
      },
      {
        value: 'rotina_melhor',
        label: 'Quiero crear una mejor rutina alimentaria',
        desc: 'Construye hábitos sostenibles que se adapten a tu estilo de vida.',
        icon: '🗓️'
      }
    ],
    footnote: 'Haz este test rápido para descubrir qué funciones de la app se adaptan mejor a ti.',
    estimatedBadge: 'TIEMPO ESTIMADO: 49 SEGUNDOS'
  },

  // ETAPA 2 — AUTOAVALIAÇÃO CORPORAL
  2: {
    type: 'single',
    key: 'body_perception',
    title: '¿Cómo percibes tu cuerpo actualmente?',
    subtitle: 'Una autoevaluación sincera nos ayuda a calcular tu objetivo diario de calorías y la distribución óptima de macronutrientes.',
    timer: '⏱️ ~45 segundos',
    options: [
      {
        value: 'muito_acima',
        label: 'Muy por encima de mi peso ideal',
        desc: 'Siento el cuerpo pesado, hinchazón frecuente e incomodidad al vestirme',
        svg: '<svg viewBox="0 0 24 24" class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>'
      },
      {
        value: 'pouco_acima',
        label: 'Un poco por encima de lo que me gustaría',
        desc: 'Necesito perder algunos kilos localizados y recuperar la ligereza',
        svg: '<svg viewBox="0 0 24 24" class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2a3 3 0 100 6 3 3 0 000-6zM7 10c0 3 1.5 7 1.5 11h7c0-4 1.5-8 1.5-11-2-.8-3.5-1.5-5-1.5s-3 0.7-5 1.5z" /></svg>'
      },
      {
        value: 'falsa_magra',
        label: 'Peso normal, pero con retención y grasa localizada',
        desc: 'Quiero mejorar mi composición corporal, ganar firmeza y reducir barriga',
        svg: '<svg viewBox="0 0 24 24" class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2a3 3 0 100 6 3 3 0 000-6zM8 10c0 2 1 5 1 11h6c0-6 1-9 1-11-1.5-.6-2.5-1-4-1s-2.5.4-4 1z" /><circle cx="12" cy="14" r="2.5" stroke="#f97316" stroke-width="2" /></svg>'
      },
      {
        value: 'magra',
        label: 'Peso adecuado, enfoque en hábitos más saludables',
        desc: 'Quiero tener más constancia, comer con calidad y tener energía todo el día',
        svg: '<svg viewBox="0 0 24 24" class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2a3 3 0 100 6 3 3 0 000-6zM8.5 10c0 3 .5 8 .5 11h6c0-3 .5-8 .5-11-1.5-.5-2.5-.8-3.5-.8s-2 .3-3.5.8z" /></svg>'
      }
    ]
  },

  // ETAPA 3 — DIFICULDADES E SENSIBILIDADES ALIMENTARES
  3: {
    type: 'multiple',
    key: 'conditions',
    title: '¿Tienes alguna sensibilidad o factor que influya en tu rutina alimentaria?',
    subtitle: 'Puedes seleccionar varias opciones. La aplicación personaliza recordatorios y objetivos calóricos para tu perfil.',
    timer: '⏱️ ~42 segundos',
    options: [
      { value: 'retencao_inchaos', label: 'Retención de líquidos e hinchazón constante en el abdomen', icon: '💧' },
      { value: 'sensibilidade_digestiva', label: 'Sensibilidad digestiva, pesadez o acidez', icon: '🫄' },
      { value: 'intolerancias', label: 'Intolerancia alimentaria (lactosa, gluten u otras)', icon: '🥛' },
      { value: 'ansiedade_fome', label: 'Hambre emocional o ansiedad que afecta a mi apetito', icon: '🧠' },
      { value: 'horarios_desregulados', label: 'Horarios desordenados para comer y cenar', icon: '⏰' },
      { value: 'outros', label: 'Otras dificultades o restricciones en mi día a día', icon: '➕' },
      { value: 'nenhuma', label: 'No tengo restricciones ni sensibilidades alimentarias', icon: '💚', exclusive: true }
    ],
    footnote: '⚠️ Aviso ético: Este cuestionario tiene carácter de orientación nutricional y educativa, sin sustituir la valoración médica o nutricional.'
  },

  // ETAPA 4 — DIFICULDADE NO DIA A DIA
  4: {
    type: 'single',
    key: 'daily_difficulty',
    title: '¿Cuál es tu mayor dificultad en tu alimentación diaria?',
    subtitle: 'Identificar este patrón permite que la app automatice las partes más tediosas para ti.',
    timer: '⏱️ ~39 segundos',
    options: [
      {
        value: 'varias',
        label: 'Tengo dificultades en varias cosas',
        desc: 'No sé cuántas calorías consumo, fallo en las raciones y me cuesta organizar los menús',
        emoji: '😣'
      },
      {
        value: 'algumas',
        label: 'Tengo dificultades con ciertas cosas',
        desc: 'Suelo comer bien durante el día, pero pierdo el control por la noche o los fines de semana',
        emoji: '😐'
      },
      {
        value: 'nenhuma',
        label: 'No tengo grandes dificultades',
        desc: 'Solo busco mayor comodidad y claridad para mantener la constancia sin estrés',
        emoji: '😊'
      }
    ]
  },

  // ETAPA 5 — META PRINCIPAL DE ALIMENTAÇÃO E PESO
  5: {
    type: 'single',
    key: 'weight_goal',
    title: '¿Cuál es tu objetivo principal con el control de calorías?',
    subtitle: 'La aplicación calcula el déficit calórico ideal para tu objetivo sin necesidad de pasar hambre.',
    timer: '⏱️ ~36 segundos',
    options: [
      { value: '0-10kg', label: 'Perder peso con un déficit suave (0 a 10 kg)', desc: 'Pérdida de peso progresiva, deshinchazón y equilibrio', icon: '🎯' },
      { value: '11-15kg', label: 'Transformación moderada (11 a 15 kg)', desc: 'Cambio visible de medidas y control de raciones', icon: '🔥' },
      { value: '16-20kg', label: 'Gran transformación (16 a 20 kg o más)', desc: 'Seguimiento paso a paso con constancia diaria', icon: '⭐' },
      { value: 'controlar_porcoes', label: 'Aprender a controlar calorías y raciones', desc: 'Comer de forma consciente sin renunciar a lo que me gusta', icon: '🍽️' },
      { value: 'proteinas_tonus', label: 'Controlar proteínas para tonificación y firmeza', desc: 'Mejorar la composición corporal y evitar la flacidez', icon: '🥩' },
      { value: 'prefiro_nao_dizer', label: 'Solo crear una rutina de alimentación organizada', desc: 'Monitorizar comidas e hidratación en mi día a día', icon: '📱' }
    ]
  },

  // ETAPA 6 — PONTE DE PROVA SOCIAL
  6: {
    type: 'social_bridge',
    title: '¡Tu objetivo es totalmente alcanzable con el seguimiento adecuado!',
    subtitle: 'Comprueba cómo personas reales han simplificado su alimentación y obtenido grandes resultados usando el registro fácil por foto en nuestra aplicación:',
    timer: '⏱️ ~34 segundos',
    testimonials: [
      {
        name: 'Helena Ribeiro',
        age: '58 años',
        city: 'Madrid',
        result: '-12 kg sin pasar hambre',
        text: 'Pensaba que tenía que eliminar el arroz y el pan para adelgazar. Con esta app de calorías, solo hago una foto al plato y me calcula las raciones exactas. ¡Ya llevo 12 kg menos comiendo comida de verdad!',
        stars: 5
      },
      {
        name: 'Marisa Vasconcelos',
        age: '62 años',
        city: 'Valencia',
        result: 'Vientre plano y -8 kg',
        text: 'El control de agua y el registro de proteínas marcaron un antes y un después en mi rutina. Ya no necesito báscula ni tablas complicadas. ¡Es todo automático y comodísimo!',
        stars: 5
      },
      {
        name: 'Cláudia Fontes',
        age: '49 años',
        city: 'Sevilla',
        result: '-14 kg en 8 semanas',
        text: 'El escáner de alimentos por foto me dio la libertad que tanto buscaba. Entendí en qué me estaba pasando sin tener que hacer dietas absurdas de pasar hambre. ¡La recomiendo a todo el mundo!',
        stars: 5
      }
    ],
    nextText: 'En el siguiente paso, analizaremos tus hábitos y la sensación que deseas experimentar en tu cuerpo.'
  },

  // ETAPA 7 — META CORPORAL & BEM-ESTAR
  7: {
    type: 'single',
    key: 'body_goal',
    title: '¿Qué sensación y objetivo deseas alcanzar en tu cuerpo?',
    subtitle: 'Nuestra aplicación se enfoca en cómo te sientes ante el espejo, en tu energía diaria y en tu bienestar.',
    timer: '⏱️ ~30 segundos',
    options: [
      {
        value: 'leve_confortavel',
        label: 'Sentirme más ligera y sin hinchazón',
        desc: 'Digestión fluida, vientre deshinchado y ropa cómoda en el cuerpo',
        icon: '🍃'
      },
      {
        value: 'tonus_forca',
        label: 'Mejorar mi composición corporal',
        desc: 'Músculos nutridos con la cantidad adecuada de proteínas y menos flacidez',
        icon: '💪'
      },
      {
        value: 'controle_paz',
        label: 'Tener control absoluto y paz con la comida',
        desc: 'Saber exactamente qué estoy consumiendo sin culpa ni ansiedad',
        icon: '☀️'
      }
    ]
  },

  // ETAPA 8 — AUTOPERCEPÇÃO DO METABOLISMO
  8: {
    type: 'single',
    key: 'metabolism_perception',
    title: '¿Cómo percibes el ritmo de tu metabolismo?',
    subtitle: 'Esta autopercepción nos ayuda a estimar tu tasa metabólica basal diaria para calcular tus calorías con precisión.',
    timer: '⏱️ ~27 segundos',
    options: [
      {
        value: 'lento',
        label: 'Siento que me cuesta quemar calorías',
        desc: 'Parece que cualquier pequeño exceso me hace ganar peso con facilidad',
        icon: '🐢'
      },
      {
        value: 'acelerado',
        label: 'Creo que mi metabolismo funciona con normalidad',
        desc: 'Consigo responder bien cuando mantengo la constancia en lo que como',
        icon: '⚡'
      },
      {
        value: 'oscilante',
        label: 'No sabría decir con certeza / Parece irregular',
        desc: 'Antes me resultaba más fácil perder peso, pero hoy noto que mi ritmo es impredecible',
        icon: '🔄'
      }
    ]
  },

  // ETAPA 9 — ACOMPANHAMENTO DA ROTINA E CONSISTÊNCIA
  9: {
    type: 'single',
    key: 'exercise_confidence',
    title: '¿Te cuesta mantener la constancia en tu alimentación y en una rutina saludable?',
    subtitle: 'Más del 85% de las personas abandonan porque los métodos tradicionales exigían pesar y apuntar todo a mano.',
    timer: '⏱️ ~24 segundos',
    options: [
      {
        value: 'insegura',
        label: 'Sí, empiezo con ganas pero pierdo el hábito rápidamente',
        desc: 'La falta de tiempo y de agilidad hacen que acabe abandonando el registro',
        icon: '📱'
      },
      {
        value: 'moderada',
        label: 'Dudo si las raciones que como son las correctas',
        desc: 'Intento cuidar mi alimentación, pero no tengo certeza de cuántas calorías consumo',
        icon: '⚖️'
      },
      {
        value: 'confiante',
        label: 'No, suelo ser disciplinada cuando dispongo de un método práctico',
        desc: 'Solo busco una herramienta inteligente para automatizar mi registro diario',
        icon: '✅'
      }
    ]
  },

  // ETAPA 10 — PERCEPÇÃO CORPORAL & FOCO DO OBJETIVO
  10: {
    type: 'single',
    key: 'abdominal_fat',
    title: '¿En qué zona te gustaría notar más cambios con el control calórico?',
    subtitle: 'La aplicación personaliza tu objetivo de calorías y el aporte de fibra para acelerar tus progresos.',
    timer: '⏱️ ~22 segundos',
    options: [
      {
        value: 'barriga_principal',
        label: 'Zona abdominal y reducción de volumen en la cintura',
        desc: 'Deshinchar la barriga y quemar grasa localizada con un déficit calórico inteligente',
        svg: '<svg viewBox="0 0 24 24" class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9" /><path d="M8 12h8" stroke="#f97316" stroke-width="2.5" /></svg>'
      },
      {
        value: 'quadril_pernas',
        label: 'Caderas, muslos y glúteos',
        desc: 'Reducir retención de líquidos y celulitis mejorando la calidad nutricional',
        svg: '<svg viewBox="0 0 24 24" class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v9M7 12l2 9M17 12l-2 9" /><path d="M6 12a6 6 0 0012 0" stroke="#f97316" stroke-width="2" /></svg>'
      },
      {
        value: 'bracos_costas',
        label: 'Espalda y brazos',
        desc: 'Tonificar los brazos y eliminar grasa acumulada en la espalda',
        svg: '<svg viewBox="0 0 24 24" class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8l4 2v10h8V10l4-2-2-4H6L4 8z" /><circle cx="6" cy="9" r="1.5" fill="#f97316" /><circle cx="18" cy="9" r="1.5" fill="#f97316" /></svg>'
      },
      {
        value: 'geral',
        label: 'Sensación general de ligereza en todo el cuerpo',
        desc: 'Deshinchazón homogénea, más vitalidad y energía constante a lo largo del día',
        svg: '<svg viewBox="0 0 24 24" class="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8" stroke-dasharray="3 3" /><circle cx="12" cy="12" r="4" fill="#d1fae5" /></svg>'
      }
    ]
  },

  // ETAPA 11 — MUDANÇAS NA ROTINA E ALIMENTAÇÃO
  11: {
    type: 'single',
    key: 'after_40_change',
    title: '¿Has notado cambios en tu metabolismo o peso en los últimos años?',
    subtitle: 'Con el paso de los años, el gasto calórico basal disminuye y las dietas de siempre dejan de funcionar igual.',
    timer: '⏱️ ~19 segundos',
    options: [
      {
        value: 'sim_bastante',
        label: '¡Sí, he notado un cambio evidente!',
        desc: 'Gano peso con mayor facilidad, noto más hinchazón y las dietas de antes ya no sirven',
        icon: '📈'
      },
      {
        value: 'pouco',
        label: 'He notado algunos cambios leves',
        desc: 'Siento pequeñas variaciones en la digestión y en la facilidad para mantener mis medidas',
        icon: '📊'
      },
      {
        value: 'nao',
        label: 'No, mantengo el mismo ritmo de siempre',
        desc: 'Mis hábitos y mi respuesta física siguen siendo muy parecidos',
        icon: '⏸️'
      }
    ]
  },

  // ETAPA 12 — ANÁLISE SIMULADA 1
  12: {
    type: 'simulation_1',
    title: 'Analizando tus respuestas en tiempo real...',
    subtitle: 'Cruzando tus datos con nuestra base de cálculo calórico, objetivos de macronutrientes y alimentos habituales',
    timer: 'Espera unos instantes'
  },

  // ETAPA 13 — DIAGNÓSTICO / RESULTADO PERSONALIZADO
  13: {
    type: 'root_cause',
    title: '¡TU PERFIL ESTÁ LISTO!',
    subtitle: 'Hemos identificado el factor clave en tu situación actual:',
    timer: '⏱️ ~17 segundos',
    finding: 'Tus respuestas indican que tu mayor desafío no es la falta de fuerza de voluntad, sino la dificultad para saber qué consumes realmente cada día y mantener raciones equilibradas sin recurrir a métodos engorrosos.',
    indicators: [
      { label: 'Registro Visual Inteligente', value: 'Análisis de Platos por Foto', color: 'emerald', detail: 'Identificación instantánea de calorías sin necesidad de báscula' },
      { label: 'Estrategia Calórica Personalizada', value: 'Déficit Calórico Suave', color: 'blue', detail: 'Sin eliminar los platos que te gustan, solo ajustando las raciones' },
      { label: 'Objetivos de Saciedad y Firmeza', value: 'Equilibrio de Proteínas y Agua', color: 'orange', detail: 'Recordatorios inteligentes de hidratación y aporte proteico óptimo' }
    ]
  },

  // ETAPA 14 — OBJETIVOS ADICIONAIS
  14: {
    type: 'multiple',
    key: 'additional_goals',
    title: '¿Qué otras funciones te gustaría tener en la aplicación?',
    subtitle: 'Puedes marcar varias. La app priorizará estas herramientas en tu panel de inicio.',
    timer: '⏱️ ~15 segundos',
    options: [
      { value: 'calorias_foto', label: 'Análisis de platos por foto con Inteligencia Artificial', icon: '📸' },
      { value: 'proteinas_macros', label: 'Control de proteínas para mayor saciedad y firmeza muscular', icon: '🥩' },
      { value: 'controle_agua', label: 'Control de agua con recordatorios inteligentes de hidratación', icon: '💧' },
      { value: 'porcoes_praticas', label: 'Aprender a calcular raciones a simple vista al comer fuera', icon: '🍽️' },
      { value: 'gastos_exercicios', label: 'Seguimiento de calorías consumidas en tus actividades físicas', icon: '🏃‍♀️' },
      { value: 'lista_compras', label: 'Lista de la compra práctica e ideas de menús sencillos', icon: '🛒' }
    ]
  },

  // ETAPA 15 — IMPEDIMENTOS
  15: {
    type: 'multiple',
    key: 'barriers',
    title: '¿Qué es lo que más te impedía controlar tu alimentación hasta ahora?',
    subtitle: 'Puedes seleccionar varias opciones. Nuestra app está pensada para eliminar justamente estas trabas.',
    timer: '⏱️ ~13 segundos',
    options: [
      { value: 'tempo_pesar', label: 'Falta de tiempo para apuntar y pesar todo lo que como', icon: '⏰' },
      { value: 'nao_sei_calorias', label: 'No saber cuántas calorías y proteínas tiene cada plato', icon: '🤷‍♀️' },
      { value: 'dificuldade_porcoes', label: 'Dificultad para calcular el tamaño adecuado de las raciones', icon: '📏' },
      { value: 'comer_fora', label: 'Comer fuera de casa o con las prisas del día a día', icon: '🏢' },
      { value: 'apps_complicados', label: 'Aplicaciones demasiado complejas, en otros idiomas o con anuncios', icon: '🚫' },
      { value: 'falta_consistencia', label: 'Falta de constancia para mantener registros manuales a diario', icon: '📉' }
    ]
  },

  // ETAPA 16 — ROTINA DIÁRIA
  16: {
    type: 'single',
    key: 'routine',
    title: '¿Cómo suele ser tu rutina de comidas en el día a día?',
    subtitle: 'La aplicación ajusta los horarios de recordatorios y sugerencias para encajar con tu ritmo de vida.',
    timer: '⏱️ ~11 segundos',
    options: [
      {
        value: 'trabalho_fora',
        label: 'Trabajo fuera y tengo una rutina bastante ajetreada',
        desc: 'Como en restaurantes, de táper o pido comida a domicilio; necesito rapidez y sencillez',
        icon: '💼'
      },
      {
        value: 'trabalho_casa',
        label: 'Teletrabajo o gestiono el hogar (rutina flexible)',
        desc: 'Preparo la mayoría de comidas en casa y busco planificar menús prácticos',
        icon: '🏡'
      },
      {
        value: 'horarios_livres',
        label: 'Horarios más tranquilos o flexibles',
        desc: 'Puedo organizarme con calma y busco un método visual agradable para mi día a día',
        icon: '☕'
      }
    ]
  },

  // ETAPA 17 — PRÁTICA ATUAL DE EXERCÍCIOS
  17: {
    type: 'exercise_branch',
    key: 'currently_exercises',
    title: '¿Practicas alguna actividad física actualmente?',
    subtitle: 'La aplicación suma el gasto calórico de tus actividades para calcular con total precisión tu objetivo diario.',
    timer: '⏱️ ~9 segundos',
    options: [
      {
        value: 'sim',
        label: 'SÍ, entreno con regularidad o varias veces por semana',
        desc: 'Caminar, fuerza, pilates o deportes (la app sincronizará las calorías quemadas)',
        icon: '🏃‍♀️'
      },
      {
        value: 'nao',
        label: 'NO, no hago ejercicio en este momento',
        desc: 'La app calibrará tu plan enfocándose en un déficit calórico saludable en reposo',
        icon: '🛋️'
      }
    ]
  },

  // ETAPA 18 — SEGUNDA ANÁLISE / CONTEÚDO EDITORIAL
  18: {
    type: 'editorial_analysis',
    title: '¿Por qué el seguimiento visual de calorías funciona mucho mejor que las dietas restrictivas?',
    subtitle: 'Diversos estudios nutricionales demuestran que tener claridad visual sobre las comidas es la auténtica clave de la constancia:',
    timer: '⏱️ ~7 segundos'
  },

  // ETAPA 19 — RESULTADO E ADEQUAÇÃO DA SOLUÇÃO
  19: {
    type: 'solution_fit',
    title: 'TU PERFIL ENCAJA CON UNA EXPERIENCIA SENCILLA DE CONTROL DE CALORÍAS',
    subtitle: 'Según tus respuestas, la aplicación Calori AI es la herramienta idónea para lograr tus metas sin estrés:',
    timer: '⏱️ ~5 segundos'
  },

  // ETAPA 20 — CONFIRMAÇÃO DE INTERESSE
  20: {
    type: 'single',
    key: 'solution_belief',
    title: '¿Te gustaría tener una forma más fácil y visual de registrar tus calorías y comidas?',
    subtitle: 'Olvídate de tablas aburridas y de básculas: basta con una foto para tener control total.',
    timer: '⏱️ ~4 segundos',
    options: [
      {
        value: 'sim_certeza',
        label: '¡SÍ, QUIERO PROBARLO!',
        desc: 'Es exactamente la comodidad que me hace falta para ser constante',
        icon: '⭐'
      },
      {
        value: 'vale_teste',
        label: 'QUIERO CONOCER LA APLICACIÓN',
        desc: 'Tengo ganas de probarla en mi día a día y simplificar mi rutina',
        icon: '👍'
      }
    ]
  },

  // ETAPA 21 — CONSEQUÊNCIA DA INAÇÃO
  21: {
    type: 'single',
    key: 'inaction_consequence',
    title: 'Si continúas sin registrar lo que comes, ¿cuál es tu mayor frustración?',
    subtitle: 'Comer a ciegas muchas veces echa por tierra el esfuerzo de todo el día.',
    timer: '⏱️ ~3 segundos',
    options: [
      {
        value: 'continuar_sem_saber',
        label: 'Seguir sin saber en qué estoy fallando con las comidas',
        desc: 'Comer creyendo que lo hago bien, pero sin notar avances frente al espejo',
        icon: '🤷‍♀️'
      },
      {
        value: 'dietas_restritivas',
        label: 'Quedar atrapada en dietas estrictas de pasar hambre que no duran',
        desc: 'El círculo vicioso de empezar con restricciones severas y tirar la toalla a la primera semana',
        icon: '📉'
      },
      {
        value: 'desanimo_inchaco',
        label: 'Sentir pesadez, hinchazón frecuente y que la ropa me aprieta',
        desc: 'Ver pasar el tiempo sin lograr el bienestar y la ligereza que me merezco',
        icon: '👗'
      }
    ]
  },

  // ETAPA 22 — COMPROMISSO DE EXECUÇÃO
  22: {
    type: 'single',
    key: 'commitment_minutes',
    title: '¿Estás dispuesta a dedicar menos de 2 minutos al día para registrar tus calorías en el móvil?',
    subtitle: 'Menos tiempo del que pasas mirando redes sociales, y con total claridad sobre lo que comes.',
    timer: '⏱️ ~2 segundos',
    options: [
      {
        value: 'sim_comprometida',
        label: '¡Sí! Quiero esa claridad y transformar mi alimentación',
        desc: 'Estoy 100% lista para usar el escáner por foto y seguir mis objetivos',
        icon: '🔥'
      },
      {
        value: 'tentar',
        label: 'Quiero empezar hoy mismo',
        desc: 'Deseo dar el primer paso con una herramienta práctica y sin complicaciones',
        icon: '🌱'
      }
    ]
  },

  // ETAPA 23 — ANÁLISE FINAL COM DEPOIMENTOS E MONTAGEM DO PROTOCOLO
  23: {
    type: 'final_protocol_generation',
    title: 'Preparando tu Perfil en la App de Calorías...',
    subtitle: 'Configurando base de alimentos mediterráneos y cotidianos, detector por foto y tu objetivo calórico:',
    timer: '¡Último paso!'
  },

  // ETAPA 24 — VÍDEO & OFERTA DO APP DE CALORIAS
  24: {
    type: 'offer_and_video',
    title: '¡TU APLICACIÓN ESTÁ CONFIGURADA!',
    subtitle: 'Mira esta breve presentación para activar tu acceso promocional con todos los bonus exclusivos:',
    timer: 'Oferta Especial Desbloqueada'
  }
};

// --- 5. RENDERIZADOR PRINCIPAL ---
function renderStep() {
  const container = document.getElementById('step-content');
  const step = stepsData[QuizState.currentStep];
  if (!container || !step) return;

  const mainLayout = document.getElementById('main-layout');
  if (mainLayout) {
    if (QuizState.currentStep === 1) {
      mainLayout.className = 'flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 md:py-8 transition-all duration-300';
    } else {
      mainLayout.className = 'flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 transition-all duration-300';
    }
  }

  // Atualiza cabeçalho e progresso
  updateProgressUI();

  // Scroll suave para o topo do quiz
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Dispara evento de visualização da etapa
  QuizState.logEvent('step_view', { step_number: QuizState.currentStep });

  // Se alcançou a última etapa (24), registrar conclusão do quiz
  if (QuizState.currentStep === QuizState.totalSteps) {
    QuizTracker.trackQuizCompleted();
  }

  // Renderiza de acordo com o tipo
  let html = '';
  switch (step.type) {
    case 'hero_intro':
      html = renderHeroIntro(step);
      break;
    case 'single':
      html = renderSingleChoice(step);
      break;
    case 'multiple':
      html = renderMultipleChoice(step);
      break;
    case 'social_bridge':
      html = renderSocialBridge(step);
      break;
    case 'simulation_1':
      html = renderSimulation1(step);
      break;
    case 'root_cause':
      html = renderRootCause(step);
      break;
    case 'exercise_branch':
      html = renderExerciseBranch(step);
      break;
    case 'editorial_analysis':
      html = renderEditorialAnalysis(step);
      break;
    case 'solution_fit':
      html = renderSolutionFit(step);
      break;
    case 'final_protocol_generation':
      html = renderFinalProtocol(step);
      break;
    case 'offer_and_video':
      html = renderOfferAndVideo(step);
      break;
    default:
      html = `<div>Paso no configurado</div>`;
  }

  container.innerHTML = html;
  attachStepEvents(step);
}

// Atualiza barra de progresso, contador e botão voltar (Removido cabeçalho de todas as etapas)
function updateProgressUI() {
  // Sem cabeçalho no topo — o conteúdo de cada etapa começa diretamente pelo título/pergunta
}

// --- RENDERIZADORES DE TELAS ESPECÍFICAS ---

// Helper para renderizar ícones vetoriais modernos (estilo Linear/Heroicons), eliminando emojis grandes
function renderOptionVisual(opt) {
  if (opt.svg) {
    return `<div class="icon-container shrink-0">${opt.svg}</div>`;
  }
  
  const val = (opt.value || '').toLowerCase();
  const icon = (opt.icon || opt.emoji || '').trim();

  let svgPath = '';

  if (val.includes('caloria') || icon === '🔥') {
    // Flame
    svgPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9.879z"/>`;
  } else if (val.includes('alimentacao') || val.includes('prato') || icon === '🥗' || icon === '🍽️' || icon === '🍃') {
    // Bowl / Nutrition
    svgPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>`;
  } else if (val.includes('foto') || val.includes('refeic') || icon === '📸') {
    // Camera
    svgPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>`;
  } else if (val.includes('rotina') || val.includes('horario') || icon === '🗓️' || icon === '⏰') {
    // Calendar / Clock
    svgPath = `<rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/><line x1="16" y1="2" x2="16" y2="6" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/><line x1="8" y1="2" x2="8" y2="6" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/><line x1="3" y1="10" x2="21" y2="10" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>`;
  } else if (val.includes('agua') || val.includes('incha') || icon === '💧') {
    // Water droplet
    svgPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/>`;
  } else if (val.includes('proteina') || val.includes('tonus') || icon === '🥩' || icon === '💪') {
    // Shield / Fitness
    svgPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>`;
  } else if (val.includes('meta') || val.includes('kg') || icon === '🎯' || icon === '⭐') {
    // Target
    svgPath = `<circle cx="12" cy="12" r="9" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/><circle cx="12" cy="12" r="4" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>`;
  } else if (val.includes('exercic') || val.includes('atividade') || icon === '🏃‍♀️' || icon === '⚡') {
    // Zap / Activity
    svgPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 10V3L4 14h7v7l9-11h-7z"/>`;
  } else if (val.includes('compra') || icon === '🛒') {
    // Cart
    svgPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>`;
  } else if (val.includes('trabalho') || icon === '💼') {
    // Briefcase
    svgPath = `<rect x="2" y="7" width="20" height="14" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>`;
  } else if (val.includes('casa') || icon === '🏡') {
    // Home
    svgPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>`;
  } else if (icon === '📈' || icon === '📊' || val.includes('aumento')) {
    // Trends / Chart
    svgPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>`;
  } else if (icon === '📉' || icon === '🐢' || icon === '⏸️') {
    // Chart steady / Gauge
    svgPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>`;
  } else if (icon === '😣' || icon === '😐' || icon === '😊') {
    // Face outline / Wellness balance
    svgPath = `<circle cx="12" cy="12" r="9" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/><line x1="15" y1="9" x2="15.01" y2="9" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/>`;
  } else {
    // Default Check
    svgPath = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>`;
  }

  return `
    <div class="icon-container shrink-0">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${svgPath}
      </svg>
    </div>
  `;
}

// Helper específico para ícones dos 4 objetivos da Hero
function renderGoalIcon(val) {
  if (val === 'controlar_calorias') {
    return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9.879z"/></svg>`;
  }
  if (val === 'melhorar_alimentacao') {
    return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z"/><line x1="16" y1="8" x2="2" y2="22" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  if (val === 'acompanhar_refeicoes') {
    return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 16l2 2 4-4"/></svg>`;
  }
  return `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`;
}

// Etapa 1 — Hero Intro com Composição Fiel à Referência (2 Colunas, Foto Publicitária & Scanner IA)
function renderHeroIntro(step) {
  const selectedVal = QuizState.answers[step.key] || '';
  return `
    <div class="animate-slide-in space-y-8 sm:space-y-12">
      <!-- 1. Top Brand Header: Logo CaloriasFit & Slogan -->
      <header class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-[#e63920] flex items-center justify-center text-white shadow-xs shrink-0">
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.5 2 2 6.5 2 12c0 2.5 1 4.8 2.6 6.5L3 21l2.5-1.6C7.2 20.4 9.5 21 12 21c5.5 0 10-4.5 10-10 0-5.5-4.5-9-10-9zm-1 14.5v-3.8c-1.8.8-3.1 2.3-3.6 4.1 1.2.5 2.4.7 3.6.7v-1zm4.6-2.6c-.5-1.8-1.8-3.3-3.6-4.1v3.8c1.2 0 2.4.2 3.6.7z"/>
          </svg>
        </div>
        <div>
          <span class="font-extrabold text-[#e63920] text-lg tracking-tight block leading-tight">Calori AI</span>
          <span class="text-[11px] text-slate-500 font-medium leading-none">Calori AI • Tu app de calorías y nutrición</span>
        </div>
      </header>

      <!-- 2. Hero Principal: 2 Colunas em Desktop / Empilhado em Telas Menores -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        <!-- Coluna Esquerda: Título, Descrição e 3 Pilares -->
        <div class="lg:col-span-7 space-y-5 text-left">
          <h1 class="text-3xl sm:text-4xl lg:text-[42px] xl:text-[46px] font-extrabold text-slate-900 leading-[1.14] tracking-tight font-display">
            Ten más control sobre tu alimentación y <span class="text-[#e63920]">tus calorías</span>
          </h1>

          <p class="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-xl">
            Descubre cómo <strong class="font-bold text-[#e63920]">Calori AI</strong> puede facilitar el seguimiento de tus comidas y simplificar tu rutina diaria.
          </p>

          <!-- 3 Micro-Features com divisores finos verticais -->
          <div class="grid grid-cols-3 gap-2 sm:gap-3 pt-3 border-t border-slate-100">
            <!-- 1 -->
            <div class="space-y-1.5 pr-1">
              <div class="w-8 h-8 rounded-full bg-[#fff1ee] text-[#e63920] flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <circle cx="12" cy="13" r="3" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
                </svg>
              </div>
              <span class="text-xs font-bold text-[#e63920] leading-tight block">Analiza tus comidas por foto</span>
            </div>

            <!-- 2 -->
            <div class="space-y-1.5 border-l border-slate-200 pl-2 sm:pl-3">
              <div class="w-8 h-8 rounded-full bg-[#fff1ee] text-[#e63920] flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" stroke-width="1.8"/>
                  <circle cx="12" cy="12" r="4" stroke-width="1.8"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3v2m0 14v2m9-9h-2M5 12H3"/>
                </svg>
              </div>
              <span class="text-xs font-bold text-[#e63920] leading-tight block">Controla tus calorías con facilidad</span>
            </div>

            <!-- 3 -->
            <div class="space-y-1.5 border-l border-slate-200 pl-2 sm:pl-3">
              <div class="w-8 h-8 rounded-full bg-[#fff1ee] text-[#e63920] flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
              </div>
              <span class="text-xs font-bold text-[#e63920] leading-tight block">Entiende mejor tu alimentación</span>
            </div>
          </div>
        </div>

        <!-- Coluna Direita: Fotografia Comercial Publicitária Realista com Scanner IA -->
        <div class="lg:col-span-5 flex justify-center">
          <div class="relative w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-white">
            <img
              src="hero-meal-scan.jpg"
              alt="Persona apuntando con el móvil a una comida saludable con análisis inteligente de calorías"
              class="w-full h-auto object-cover transform hover:scale-[1.02] transition-transform duration-500"
              loading="eager"
            />
            <!-- Floating Badge: Frango grelhado 182 kcal -->
            <div class="absolute top-3 left-3 sm:top-4 sm:left-4 bg-white/95 backdrop-blur-md border border-slate-100/90 rounded-xl sm:rounded-2xl p-2 px-3 sm:px-3.5 shadow-md flex items-center gap-2.5 z-10">
              <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0d8a6e] text-white flex items-center justify-center shrink-0">
                <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                </svg>
              </div>
              <div>
                <span class="text-[11px] sm:text-xs font-bold text-slate-900 block leading-tight">Pollo a la plancha</span>
                <span class="text-[10px] sm:text-[11px] font-bold text-[#0d8a6e] leading-tight">182 kcal</span>
              </div>
              <div class="w-4 h-4 rounded-full bg-emerald-100 text-[#0d8a6e] flex items-center justify-center ml-0.5">
                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Seção do Quiz / Seleção de Objetivo (Design Fiel à Referência) -->
      <div class="pt-6 sm:pt-10 space-y-6 max-w-3xl mx-auto text-center border-t border-slate-200/80">
        <!-- Eyebrow -->
        <div class="inline-flex flex-col items-center">
          <span class="text-xs font-extrabold uppercase tracking-widest text-[#0d8a6e]">
            ${step.promptTitle || 'PERSONALIZA TU EXPERIENCIA'}
          </span>
          <div class="w-8 h-0.5 bg-[#0d8a6e] rounded-full mt-1"></div>
        </div>

        <!-- Título da Pergunta -->
        <div class="space-y-1.5">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
            ¿Cuál es tu objetivo principal con la app?
          </h2>
          <p class="text-sm text-slate-500 font-normal">
            ${step.promptSubtitle || 'Elige una opción a continuación:'}
          </p>
        </div>

        <!-- Grid 2x2 de Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-left pt-2">
          ${step.options.map(opt => {
            const isSelected = selectedVal === opt.value;
            return `
              <div
                class="quiz-card p-4 sm:p-5 rounded-2xl border bg-white flex items-center justify-between gap-3.5 cursor-pointer transition-all ${isSelected ? 'selected border-[#0d8a6e] ring-2 ring-[#0d8a6e]/20 bg-[#f0f9f5]/40' : 'border-slate-200/90 hover:border-slate-300'}"
                data-value="${opt.value}"
                data-key="${step.key}"
                role="button"
                tabindex="0"
              >
                <div class="flex items-center gap-3.5">
                  <div class="w-10 h-10 rounded-xl bg-[#eef8f4] text-[#0d8a6e] flex items-center justify-center shrink-0">
                    ${renderGoalIcon(opt.value)}
                  </div>
                  <div>
                    <h3 class="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                      ${opt.label}
                    </h3>
                    ${opt.desc ? `<p class="text-xs text-slate-500 mt-1 leading-relaxed font-normal">${opt.desc}</p>` : ''}
                  </div>
                </div>

                <div class="radio-indicator w-5 h-5 rounded-full border-2 ${isSelected ? 'border-[#0d8a6e] bg-[#0d8a6e]' : 'border-slate-300 bg-white'} flex items-center justify-center shrink-0 transition-colors">
                  ${isSelected ? '<div class="w-2 h-2 rounded-full bg-white"></div>' : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Banner de Dica / Microcompromisso -->
        <div class="bg-[#f0f9f5] border border-[#d1fae5] rounded-xl sm:rounded-2xl p-3.5 px-4 flex items-center gap-3 text-left max-w-xl mx-auto shadow-2xs">
          <div class="w-8 h-8 rounded-full bg-emerald-100/80 text-[#0d8a6e] flex items-center justify-center shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <p class="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
            ${step.footnote || 'Haz este test rápido para descubrir qué funciones de la app se adaptan mejor a ti.'}
          </p>
        </div>

        <!-- Botão Continuar -->
        <div class="pt-2 max-w-md mx-auto w-full">
          <button
            id="btn-hero-continue"
            type="button"
            onclick="advanceStep(2)"
            class="btn-nav-yellow w-full py-4 px-8 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
          >
            <span>Continuar</span>
            <span class="text-xl font-black leading-none">→</span>
          </button>
        </div>

        <!-- Estimativa de Tempo -->
        <div class="inline-flex items-center gap-1.5 text-xs text-slate-400 font-semibold tracking-wider uppercase pt-1">
          <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke-width="2"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7v5l3 3"/>
          </svg>
          <span>${step.estimatedBadge || 'TIEMPO ESTIMADO: 49 SEGUNDOS'}</span>
        </div>
      </div>
    </div>
  `;
}

// Escolha Única
function renderSingleChoice(step) {
  const selectedVal = QuizState.answers[step.key] || '';
  return `
    <div class="animate-slide-in space-y-5">
      <div class="space-y-1.5">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
          ${step.title}
        </h2>
        <p class="text-sm md:text-base text-slate-600 leading-relaxed font-normal">
          ${step.subtitle}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-2.5 pt-1">
        ${step.options.map(opt => {
          const isSelected = selectedVal === opt.value;
          return `
            <div
              class="quiz-card p-4 rounded-xl border bg-white flex items-center justify-between gap-3.5 ${isSelected ? 'selected' : 'border-slate-200'}"
              data-value="${opt.value}"
              data-key="${step.key}"
              role="button"
              tabindex="0"
            >
              <div class="flex items-center gap-3.5">
                ${renderOptionVisual(opt)}
                <div>
                  <h3 class="text-sm md:text-base font-semibold text-slate-900 leading-snug">
                    ${opt.label}
                  </h3>
                  ${opt.desc ? `<p class="text-xs text-slate-500 mt-0.5 leading-relaxed">${opt.desc}</p>` : ''}
                </div>
              </div>

              <div class="check-indicator ${isSelected ? 'selected' : ''}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Botão Continuar Amarelo Vibrante -->
      <div class="pt-3 max-w-md mx-auto w-full">
        <button
          id="btn-single-continue"
          type="button"
          onclick="advanceStep(QuizState.currentStep + 1)"
          class="btn-nav-yellow w-full py-4 px-8 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
        >
          <span>Continuar</span>
          <span class="text-xl font-black leading-none">→</span>
        </button>
      </div>

      ${step.footnote ? `
        <div class="text-center pt-2">
          <p class="text-xs text-slate-500 font-normal max-w-md mx-auto leading-relaxed">
            ${step.footnote}
          </p>
        </div>
      ` : ''}
    </div>
  `;
}

// Múltipla Escolha
function renderMultipleChoice(step) {
  const selectedArr = QuizState.answers[step.key] || [];
  return `
    <div class="animate-slide-in space-y-5">
      <div class="space-y-1.5">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
          ${step.title}
        </h2>
        <p class="text-sm md:text-base text-slate-600 leading-relaxed font-normal">
          ${step.subtitle}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-2.5 pt-1">
        ${step.options.map(opt => {
          const isSelected = selectedArr.includes(opt.value);
          return `
            <div
              class="quiz-card multi-option p-4 rounded-xl border bg-white flex items-center justify-between gap-3.5 ${isSelected ? 'selected' : 'border-slate-200'}"
              data-value="${opt.value}"
              data-key="${step.key}"
              data-exclusive="${opt.exclusive ? 'true' : 'false'}"
              role="checkbox"
              aria-checked="${isSelected}"
              tabindex="0"
            >
              <div class="flex items-center gap-3.5">
                ${renderOptionVisual(opt)}
                <h3 class="text-sm md:text-base font-semibold text-slate-900">
                  ${opt.label}
                </h3>
              </div>

              <div class="check-indicator square ${isSelected ? 'selected' : ''}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="pt-3 max-w-md mx-auto w-full">
        <button
          id="btn-multi-continue"
          type="button"
          onclick="handleMultiContinue()"
          class="btn-nav-yellow w-full py-4 px-8 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98] ${selectedArr.length === 0 ? 'disabled' : ''}"
          ${selectedArr.length === 0 ? 'disabled' : ''}
        >
          <span>Continuar</span>
          <span class="text-xs bg-black/15 text-[#1e1004] px-2 py-0.5 rounded-md font-bold">
            ${selectedArr.length} ${selectedArr.length === 1 ? 'seleccionado' : 'seleccionados'}
          </span>
          <span class="text-xl font-black leading-none">→</span>
        </button>
      </div>

      ${step.footnote ? `
        <p class="text-xs text-slate-400 text-center leading-relaxed font-normal">
          ${step.footnote}
        </p>
      ` : ''}
    </div>
  `;
}

// Etapa 6 — Ponte de Prova Social
function renderSocialBridge(step) {
  return `
    <div class="animate-slide-in space-y-6">
      <div class="text-center space-y-2">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#e63920] leading-tight tracking-tight">
          ${step.title}
        </h2>
        <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs font-bold shadow-xs">
          <svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Resultados Verificados • Comunidad Activa</span>
        </div>
        <p class="text-sm text-slate-600 font-normal">
          ${step.subtitle}
        </p>
      </div>

      <div class="space-y-3">
        ${step.testimonials.map((item) => `
          <div class="bg-white border border-slate-200/90 rounded-2xl p-4 md:p-5 shadow-md space-y-3 relative">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-extrabold text-sm shrink-0 shadow-2xs">
                  ${item.name.charAt(0)}
                </div>
                <div>
                  <h4 class="font-extrabold text-slate-900 text-sm leading-tight">${item.name}</h4>
                  <p class="text-xs text-slate-500 mt-0.5">${item.age} • ${item.city}</p>
                </div>
              </div>
              <span class="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-xs tracking-tight shrink-0">
                ${item.result}
              </span>
            </div>
            <p class="text-sm text-slate-700 leading-relaxed font-normal">
              “${item.text.replace(/^[“"']+|[”"']+$/g, '')}”
            </p>
            <div class="flex items-center gap-1.5 text-xs">
              <span class="text-[#f59e0b] font-black text-sm tracking-wider drop-shadow-xs">★★★★★</span>
              <span class="text-slate-500 font-semibold text-[11px]">• Valoración de usuaria</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div id="bridge-next-box" class="p-4 bg-[#fff1ee] rounded-2xl border-2 border-[#e63920]/40 text-center space-y-0.5 cursor-pointer hover:border-[#e63920] hover:bg-[#ffece8] transition-all shadow-sm" onclick="advanceStep(7)" role="button" tabindex="0">
        <p class="text-xs md:text-sm font-bold text-[#e63920] leading-relaxed">
          ${step.nextText}
        </p>
      </div>

      <div class="pt-2 max-w-md mx-auto w-full">
        <button
          id="btn-bridge-continue"
          type="button"
          onclick="advanceStep(7)"
          class="btn-nav-yellow w-full py-4 px-8 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
        >
          <span>Continuar</span>
          <span class="text-xl font-black leading-none">→</span>
        </button>
      </div>
    </div>
  `;
}

// Etapa 12 — Análise Simulada 1
function renderSimulation1(step) {
  setTimeout(() => {
    runSimulation(12, 13);
  }, 100);

  return `
    <div class="animate-slide-in text-center space-y-6 py-4">
      <div class="space-y-1.5">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
          ${step.title}
        </h2>
        <p class="text-sm text-slate-600 max-w-sm mx-auto font-normal">
          ${step.subtitle}
        </p>
      </div>

      <div class="relative w-32 h-32 mx-auto flex items-center justify-center">
        <!-- SVG Progress Ring Minimalista -->
        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r="60" stroke="#f1f5f9" stroke-width="8" fill="transparent" />
          <circle id="sim-circle" cx="72" cy="72" r="60" stroke="#059669" stroke-width="8" fill="transparent"
            stroke-dasharray="377" stroke-dashoffset="377" stroke-linecap="round" class="transition-all duration-300" />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span id="sim-percent" class="text-2xl font-black text-slate-900">0%</span>
          <span class="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Analizando</span>
        </div>
      </div>

      <!-- Checklist de carregamento estilo SaaS -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 md:p-5 text-left max-w-md mx-auto space-y-3 shadow-xs">
        <div id="sim-check-1" class="flex items-center gap-3 text-slate-400 transition-colors duration-300">
          <span class="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
          <span class="text-xs md:text-sm font-medium">Analizando perfil de edad e historial de comidas...</span>
        </div>
        <div id="sim-check-2" class="flex items-center gap-3 text-slate-400 transition-colors duration-300">
          <span class="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs shrink-0 font-bold">2</span>
          <span class="text-xs md:text-sm font-medium">Identificando hábitos y horarios de comidas...</span>
        </div>
        <div id="sim-check-3" class="flex items-center gap-3 text-slate-400 transition-colors duration-300">
          <span class="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs shrink-0 font-bold">3</span>
          <span class="text-xs md:text-sm font-medium">Calculando objetivo calórico diario y reparto de proteínas...</span>
        </div>
        <div id="sim-check-4" class="flex items-center gap-3 text-slate-400 transition-colors duration-300">
          <span class="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs shrink-0 font-bold">4</span>
          <span class="text-xs md:text-sm font-medium">Preparando tu experiencia personalizada en la aplicación...</span>
        </div>
      </div>

      <!-- Botão Continuar Amarelo Vibrante -->
      <div class="pt-2 max-w-md mx-auto w-full">
        <button
          id="btn-sim1-continue"
          type="button"
          onclick="advanceStep(13)"
          class="btn-nav-yellow w-full py-4 px-8 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
        >
          <span>Continuar</span>
          <span class="text-xl font-black leading-none">→</span>
        </button>
      </div>
    </div>
  `;
}

// Etapa 13 — Resultado / Perfil Identificado
function renderRootCause(step) {
  return `
    <div class="animate-slide-in space-y-5">
      <div class="bg-white border-2 border-slate-200/90 rounded-2xl p-5 md:p-6 text-center space-y-3 shadow-md">
        <h2 class="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#e63920] leading-tight tracking-tight">
          ${step.title}
        </h2>
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-extrabold shadow-sm tracking-wide uppercase">
          <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          <span>Análisis de Perfil Completado</span>
        </div>
        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          ${step.subtitle}
        </p>
        <div class="p-4 bg-slate-50 rounded-xl border border-slate-200 border-l-4 border-l-[#e63920] text-slate-700 text-sm font-medium leading-relaxed text-left shadow-2xs">
          ${step.finding}
        </div>
      </div>

      <div class="space-y-2.5">
        <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Directrices Recomendadas Para Tu Aplicación:
        </h3>
        ${step.indicators.map(ind => `
          <div class="bg-white border-2 border-emerald-100 hover:border-emerald-300 rounded-2xl p-4 shadow-sm flex items-start gap-3.5 transition-all">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 border-2 border-emerald-400 flex items-center justify-center shrink-0 font-black text-sm shadow-xs">
              ✓
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs font-extrabold uppercase tracking-wide text-slate-900">${ind.label}:</span>
                <span class="text-sm font-black text-emerald-600">${ind.value}</span>
              </div>
              <p class="text-xs text-slate-600 mt-1 font-normal">${ind.detail}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <div id="callout-cause-continue" class="p-4 bg-[#fff1ee] rounded-2xl border-2 border-[#e63920]/40 text-center cursor-pointer hover:border-[#e63920] hover:bg-[#ffece8] transition-all shadow-sm" onclick="advanceStep(14)" role="button" tabindex="0">
        <p class="text-xs md:text-sm font-extrabold text-[#e63920] leading-relaxed">
          Disponer de una herramienta visual para seguir calorías por foto sin pesar comida transforma por completo tu constancia.
        </p>
      </div>

      <div class="pt-2 max-w-md mx-auto w-full">
        <button
          id="btn-cause-continue"
          type="button"
          onclick="advanceStep(14)"
          class="btn-nav-yellow w-full py-4 px-8 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
        >
          <span>Continuar</span>
          <span class="text-xl font-black leading-none">→</span>
        </button>
      </div>
    </div>
  `;
}

// Etapa 17 — Ramo Condicional de Exercícios / Gasto Calórico
function renderExerciseBranch(step) {
  const selectedVal = QuizState.answers.currently_exercises || '';
  const freqVal = QuizState.answers.exercise_frequency || '';
  return `
    <div class="animate-slide-in space-y-5">
      <div class="space-y-1.5">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
          ${step.title}
        </h2>
        <p class="text-sm md:text-base text-slate-600 leading-relaxed font-normal">
          ${step.subtitle}
        </p>
      </div>

      <div class="grid grid-cols-1 gap-2.5">
        ${step.options.map(opt => {
          const isSelected = selectedVal === opt.value;
          return `
            <div
              class="quiz-card p-4 rounded-xl border bg-white flex items-center justify-between gap-3.5 ${isSelected ? 'selected' : 'border-slate-200'}"
              data-value="${opt.value}"
              data-key="currently_exercises"
              role="button"
              tabindex="0"
            >
              <div class="flex items-center gap-3.5">
                ${renderOptionVisual(opt)}
                <div>
                  <h3 class="text-sm md:text-base font-semibold text-slate-900">${opt.label}</h3>
                  <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">${opt.desc}</p>
                </div>
              </div>

              <div class="check-indicator ${isSelected ? 'selected' : ''}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Sub-pergunta caso tenha selecionado SIM -->
      <div id="exercise-frequency-box" class="${selectedVal === 'sim' ? '' : 'hidden'} animate-slide-in p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider">¿Con qué frecuencia sueles hacer ejercicio?</h4>
        <div class="grid grid-cols-3 gap-2">
          ${[
            { v: '1-2x', l: '1 a 2 veces/sem' },
            { v: '3-4x', l: '3 a 4 veces/sem' },
            { v: '5x+', l: '5 veces o más' }
          ].map(f => `
            <button
              type="button"
              onclick="selectFrequency('${f.v}')"
              class="freq-btn py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${freqVal === f.v ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500'}"
              data-freq="${f.v}"
            >
              ${f.l}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Botão Continuar Amarelo Vibrante -->
      <div class="pt-2 max-w-md mx-auto w-full">
        <button
          id="btn-exercise-continue"
          type="button"
          onclick="advanceStep(18)"
          class="btn-nav-yellow w-full py-4 px-8 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
        >
          <span>Continuar</span>
          <span class="text-xl font-black leading-none">→</span>
        </button>
      </div>
    </div>
  `;
}

// Etapa 18 — Análise Editorial e Respaldo
function renderEditorialAnalysis(step) {
  return `
    <div class="animate-slide-in space-y-5">
      <div class="space-y-1.5 text-center">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#e63920] leading-tight tracking-tight">
          ${step.title}
        </h2>
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
          <svg class="w-3.5 h-3.5 text-[#e63920]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Fundamentación Conductual</span>
        </div>
        <p class="text-sm text-slate-600 font-normal">
          ${step.subtitle}
        </p>
      </div>

      <!-- Quadro comparativo SaaS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        <div class="bg-red-50/50 border border-red-200 rounded-xl p-4.5 space-y-2.5">
          <div class="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wide">
            <span class="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-black">✕</span>
            Dietas Restrictivas y Pesaje Manual
          </div>
          <ul class="text-xs text-slate-600 space-y-2 font-normal">
            <li class="flex items-start gap-2">
              <span class="text-red-400 font-bold">•</span>
              Pasar hambre y suprimir hidratos provoca efecto rebote
            </li>
            <li class="flex items-start gap-2">
              <span class="text-red-400 font-bold">•</span>
              Tener que pesar cada plato en la báscula agota y hace tirar la toalla
            </li>
            <li class="flex items-start gap-2">
              <span class="text-red-400 font-bold">•</span>
              Falta de claridad real sobre el consumo diario de calorías
            </li>
          </ul>
        </div>

        <div class="bg-white border-2 border-emerald-500 rounded-xl p-4.5 space-y-2.5 shadow-sm relative ring-1 ring-emerald-500/20">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-emerald-700 font-extrabold text-xs uppercase tracking-wide">
              <span class="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black">✓</span>
              App de Calorías con Escáner por Foto
            </div>
            <span class="text-[9px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">Recomendado</span>
          </div>
          <ul class="text-xs text-slate-700 space-y-2 font-normal">
            <li class="flex items-start gap-2">
              <span class="text-emerald-600 font-bold">✓</span>
              Haz una foto al plato y comprueba calorías y raciones al instante
            </li>
            <li class="flex items-start gap-2">
              <span class="text-emerald-600 font-bold">✓</span>
              Déficit calórico suave comiendo platos reales y sabrosos
            </li>
            <li class="flex items-start gap-2">
              <span class="text-emerald-600 font-bold">✓</span>
              Control de proteínas y recordatorios de hidratación diaria
            </li>
          </ul>
        </div>
      </div>

      <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
        <p class="text-xs text-slate-600 font-normal leading-relaxed">
          Basado en evidencia conductual: el <span class="font-bold text-[#e63920]">registro visual diario</span> incrementa la <span class="font-bold text-[#e63920]">tasa de éxito</span> y el mantenimiento de los resultados a largo plazo.
        </p>
      </div>

      <div class="pt-2 max-w-md mx-auto w-full">
        <button
          id="btn-editorial-continue"
          type="button"
          onclick="advanceStep(19)"
          class="btn-nav-yellow w-full py-4 px-8 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
        >
          <span>Continuar</span>
          <span class="text-xl font-black leading-none">→</span>
        </button>
      </div>
    </div>
  `;
}

// Etapa 19 — Resultado e Adequação da Solução
function renderSolutionFit(step) {
  setTimeout(() => triggerConfetti(), 300);

  return `
    <div class="animate-slide-in space-y-5 text-center">
      <div class="space-y-1.5">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
          ${step.title}
        </h2>
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/80">
          <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>98% de Compatibilidad Identificada</span>
        </div>
        <p class="text-sm text-slate-600 font-normal">
          ${step.subtitle}
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-left pt-1">
        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div class="icon-container">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3" stroke-width="1.8"/></svg>
          </div>
          <h4 class="font-bold text-slate-900 text-sm">Escáner de Platos por Foto</h4>
          <p class="text-xs text-slate-500 leading-relaxed font-normal">
            Identificación de alimentos y conteo de calorías sin necesidad de pesar nada en la báscula.
          </p>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div class="icon-container">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <h4 class="font-bold text-slate-900 text-sm">Objetivos de Proteínas y Macros</h4>
          <p class="text-xs text-slate-500 leading-relaxed font-normal">
            Mantén la saciedad y el tono muscular con la proporción adecuada de nutrientes.
          </p>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
          <div class="icon-container">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>
          </div>
          <h4 class="font-bold text-slate-900 text-sm">Control de Agua y Rutina</h4>
          <p class="text-xs text-slate-500 leading-relaxed font-normal">
            Recordatorios inteligentes de hidratación para deshinchar el cuerpo y optimizar la digestión.
          </p>
        </div>
      </div>

      <div class="pt-3 max-w-md mx-auto w-full space-y-2.5">
        <p class="text-xs md:text-sm font-semibold text-slate-700">
          ¿Deseas tener acceso a esta práctica herramienta en tu móvil?
        </p>
        <button
          id="btn-fit-continue"
          type="button"
          onclick="advanceStep(20)"
          class="btn-nav-yellow w-full py-4 px-8 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
        >
          <span>Continuar</span>
          <span class="text-xl font-black leading-none">→</span>
        </button>
      </div>
    </div>
  `;
}

// Etapa 23 — Análise Final com Depoimentos e Montagem do Protocolo
function renderFinalProtocol(step) {
  setTimeout(() => {
    runFinalSimulation();
  }, 100);

  const age = QuizState.answers.age_range || '50+';
  const goal = QuizState.answers.weight_goal || 'Equilibrar alimentación y peso';

  return `
    <div class="animate-slide-in text-center space-y-5 py-3">
      <div class="space-y-1.5">
        <h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight tracking-tight">
          ${step.title}
        </h2>
        <p class="text-sm text-slate-600 font-normal">
          ${step.subtitle}
        </p>
      </div>

      <!-- Barra de progresso final SaaS -->
      <div class="max-w-md mx-auto space-y-2">
        <div class="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
          <div id="final-progress-bar" class="bg-emerald-600 h-full rounded-full transition-all duration-300 w-[15%]"></div>
        </div>
        <div class="flex justify-between text-xs font-semibold text-slate-500">
          <span id="final-status-text">Calculando tasa metabólica basal y déficit suave...</span>
          <span id="final-percent-text" class="text-slate-900 font-bold">15%</span>
        </div>
      </div>

      <!-- Resumo personalizado em tempo real -->
      <div class="bg-white border border-slate-200 rounded-xl p-4 md:p-5 text-left max-w-md mx-auto space-y-3 shadow-xs">
        <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Resumen de Tu Perfil Calórico:
        </h4>
        <div class="grid grid-cols-2 gap-2.5 text-xs">
          <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span class="text-slate-400 block text-[11px]">Rango de Edad:</span>
            <span class="font-bold text-slate-900 text-sm">${age} años</span>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <span class="text-slate-400 block text-[11px]">Objetivo:</span>
            <span class="font-bold text-slate-900 text-sm">${goal}</span>
          </div>
        </div>
        <div class="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>Base de alimentos calibrada con escáner de platos por foto activado.</span>
        </div>
      </div>

      <!-- Depoimentos rotativos enquanto carrega -->
      <div class="max-w-md mx-auto p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-left">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
            MA
          </div>
          <div>
            <p class="text-xs font-bold text-slate-900">Maria Aparecida (56 años)</p>
            <p class="text-[11px] text-slate-500 font-normal">“Hacer fotos del plato me facilitó la vida. ¡En 30 días me he deshinchado 6 kg sin dejar de comer lo que me gusta!”</p>
          </div>
        </div>
      </div>

      <!-- Botão Continuar Amarelo Vibrante -->
      <div class="pt-2 max-w-md mx-auto w-full">
        <button
          id="btn-sim2-continue"
          type="button"
          onclick="advanceStep(24)"
          class="btn-nav-yellow w-full py-4 px-8 rounded-xl font-extrabold text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-[0.98]"
        >
          <span>Continuar</span>
          <span class="text-xl font-black leading-none">→</span>
        </button>
      </div>
    </div>
  `;
}

// Etapa 24 — VÍDEO & PÁGINA DE OFERTA COMPLETA DO APP DE CALORIAS
function renderOfferAndVideo(step) {
  setTimeout(() => {
    triggerConfetti();
    sounds.playFanfare();
  }, 400);

  const age = QuizState.answers.age_range || '50+';
  const goal = QuizState.answers.weight_goal || 'Controlar calorías y comidas';

  return `
    <div class="animate-slide-in space-y-4 sm:space-y-6 pb-8">
      
      <!-- 1. TÍTULO ACIMA DO VÍDEO -->
      <div class="text-center pt-1 pb-1 max-w-xl mx-auto w-full px-2">
        <h1 class="vsl-header-title">
          MIRA LA PRESENTACIÓN Y LIBERA TU ACCESO A <span class="vsl-calori-highlight">CALORI AI</span>
        </h1>
      </div>

      <!-- 2. VÍDEO VSL (REPRODUÇÃO INTEGRAL EM 9:16 SEM CORTES) -->
      <div class="max-w-xs sm:max-w-sm mx-auto w-full video-mockup rounded-2xl overflow-hidden shadow-md bg-slate-950 border border-slate-700/60 relative">
        <!-- Badge Ao Vivo / Exclusivo -->
        <div class="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-white text-[11px] font-medium border border-white/10 pointer-events-none">
          <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          Demostración Oficial de la Aplicación
        </div>

        <!-- Vídeo Container com Player VSL Integrado (HTML5 MP4) -->
        <div id="video-wrapper" class="relative w-full bg-black flex items-center justify-center overflow-hidden">
          <video
            id="vsl-video-player"
            class="w-full max-w-full h-auto object-contain mx-auto"
            autoplay
            muted
            playsinline
            controls
            preload="auto"
          >
            <source src="https://yourimageshare.com/ib/ht8x6quwjd.mp4" type="video/mp4" />
            <source src="https://youuimageshare.com/ib/ht8x6quwjd.mp4" type="video/mp4" />
            <source src="vsl-video.mp4" type="video/mp4" />
            Tu navegador no soporta la reproducción de este vídeo.
          </video>
        </div>

        <!-- Botão de Desbloqueio Rápido da Oferta -->
        <div class="bg-slate-900 p-2.5 text-center border-t border-slate-800">
          <button id="btn-skip-to-offer" class="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
            ↓ Ver detalles de la oferta y precio especial
          </button>
        </div>
      </div>

      <!-- 3. INDICADORES ABAIXO DO VÍDEO (SELOS DE CONFIANÇA & PLANO PERSONALIZADO) -->
      <div class="max-w-xs sm:max-w-sm md:max-w-md mx-auto w-full bg-slate-900 rounded-2xl p-4 sm:p-5 text-center text-white shadow-lg space-y-3.5 border border-slate-800">
        
        <!-- Selos / Badges de Confiança -->
        <div class="flex flex-wrap items-center justify-center gap-2">
          <!-- 1. ✓ SEU PLANO CALCULADO (Amarelo / Dourado Vibrante) -->
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full badge-gold text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-xs">
            <span class="text-amber-400 font-black">✓</span> TU PLAN CALCULADO
          </span>

          <!-- 2. 98% COMPATÍVEL (Verde Vivo) -->
          <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full badge-green-vivid text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-xs">
            <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            98% COMPATIBLE
          </span>
        </div>

        <!-- 3. CALORI AI — Acompanhamento Inteligente -->
        <div class="space-y-0.5 pt-0.5">
          <h2 class="text-2xl sm:text-3xl font-black text-[#e63920] tracking-tight uppercase leading-none drop-shadow-xs">
            CALORI AI
          </h2>
          <p class="text-xs sm:text-sm font-extrabold text-white tracking-wide">
            Seguimiento Inteligente
          </p>
          <p class="text-[11px] text-slate-400 font-normal mt-1">
            Configuración personalizada para ${age} años • Enfoque: ${goal}
          </p>
        </div>

        <!-- Metas Personalizadas -->
        <div class="grid grid-cols-2 gap-2 text-xs pt-1">
          <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 text-center">
            <span class="text-slate-400 block text-[10px] uppercase font-semibold">Déficit Diario:</span>
            <strong class="text-xs sm:text-sm text-white font-bold">1.450 - 1.550 kcal</strong>
          </div>
          <div class="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 text-center">
            <span class="text-slate-400 block text-[10px] uppercase font-semibold">Hidratación:</span>
            <strong class="text-xs sm:text-sm text-white font-bold">2.200 ml / día</strong>
          </div>
        </div>
      </div>

      <!-- BLOCO DA OFERTA (ESTRUTURA VERTICAL MOBILE-FIRST) -->
      <div id="offer-section" class="max-w-xl mx-auto space-y-4 pt-1 w-full">
        
        <!-- 4. INFORMAÇÕES DA OFERTA -->
        <div class="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2 text-left">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-800">Oferta Especial de Lanzamiento</span>
          </div>
          <h3 class="text-base sm:text-lg font-extrabold text-slate-900">
            Acceso Completo a la Aplicación <span class="text-[#e63920] font-black">Calori AI</span>
          </h3>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            Tendrás activación inmediata de todas las funciones inteligentes en tu smartphone (Android o iPhone) para gestionar tu alimentación sin esfuerzo, sin báscula y sin dietas restrictivas.
          </p>
        </div>

        <!-- 5. PREÇO (PRICING CARD SAAS) -->
        <div class="bg-white border-2 border-amber-400 rounded-2xl p-5 sm:p-6 shadow-sm text-center space-y-3 relative">
          <div class="space-y-1">
            <span class="text-xs text-slate-400 uppercase tracking-widest font-bold">Condición Promocional de Acceso</span>
            <div class="text-xs text-slate-400 line-through">Precio habitual: US$ 297,00</div>
            <div class="text-slate-600 text-xs font-medium pt-1">Por solo:</div>
            <div class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              <span class="text-amber-600">US$ 9,90</span>
            </div>
            <div class="text-xs text-slate-500 font-normal">en un único pago con tarjeta</div>
          </div>

          <!-- Cronômetro de Vagas -->
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
            <svg class="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke-width="2"/><path stroke-width="2" d="M12 7v5l3 3"/></svg>
            <span>Condición garantizada durante: <strong id="checkout-timer" class="font-bold text-slate-900">14:59</strong></span>
          </div>
        </div>

        <!-- 6. BENEFÍCIOS -->
        <div class="space-y-3">
          <!-- Recursos inclusos no aplicativo -->
          <div class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <h3 class="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
              Funciones Incluidas en la Aplicación:
            </h3>
            
            <div class="space-y-2.5">
              <div class="flex items-start gap-2.5 text-xs text-slate-700">
                <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">✓</span>
                <span><strong>Reconocimiento de Platos por Foto:</strong> apunta la cámara y la app calcula las calorías automáticamente.</span>
              </div>
              <div class="flex items-start gap-2.5 text-xs text-slate-700">
                <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">✓</span>
                <span><strong>Objetivos Inteligentes de Proteínas y Fibra:</strong> para conservar masa muscular y prolongar la saciedad.</span>
              </div>
              <div class="flex items-start gap-2.5 text-xs text-slate-700">
                <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">✓</span>
                <span><strong>Control y Recordatorios de Agua:</strong> hidratación optimizada para combatir la retención de líquidos.</span>
              </div>
              <div class="flex items-start gap-2.5 text-xs text-slate-700">
                <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">✓</span>
                <span><strong>Amplia Base de Alimentos Cotidianos:</strong> platos caseros, cocina mediterránea y comidas habituales calibradas.</span>
              </div>
            </div>
          </div>

          <!-- 3 Bônus especiais inclusos -->
          <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-800">
                Bonus Exclusivos Incluidos:
              </span>
              <span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">100% Gratis</span>
            </div>

            <div class="space-y-2 text-xs">
              <div class="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <strong class="text-slate-900 block text-xs font-semibold">Bonus 1: Guía de Platos Saciantes Sin Pasar Hambre</strong>
                  <span class="text-slate-400 text-[10px] line-through">Precio habitual: US$ 67,00</span>
                </div>
                <span class="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded shrink-0">INCLUIDO</span>
              </div>

              <div class="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <strong class="text-slate-900 block text-xs font-semibold">Bonus 2: Tabla de Sustituciones Inteligentes</strong>
                  <span class="text-slate-400 text-[10px] line-through">Precio habitual: US$ 47,00</span>
                </div>
                <span class="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded shrink-0">INCLUIDO</span>
              </div>

              <div class="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div>
                  <strong class="text-slate-900 block text-xs font-semibold">Bonus 3: 50 Recetas Fáciles Ricas en Proteína</strong>
                  <span class="text-slate-400 text-[10px] line-through">Precio habitual: US$ 77,00</span>
                </div>
                <span class="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded shrink-0">INCLUIDO</span>
              </div>
            </div>
          </div>

          <!-- Garantia Incondicional de 7 Dias -->
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
              7D
            </div>
            <div class="text-xs text-slate-600 leading-relaxed font-normal">
              <strong class="text-slate-900 text-xs block font-bold">Garantía Incondicional de 7 Días:</strong>
              Prueba la aplicación durante 7 días completos. Si no te resulta cómodo hacer fotos de tus platos o no te convence su practicidad, solo tienes que solicitar el reembolso por correo electrónico para recibir el 100% de tu dinero.
            </div>
          </div>

          <!-- FAQ Acordeão -->
          <div class="space-y-2 pt-1">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Preguntas Frecuentes:</h3>
            
            <div class="faq-item bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <button class="faq-btn w-full p-3.5 text-left font-semibold text-xs sm:text-sm text-slate-800 flex justify-between items-center">
                <span>¿La aplicación reconoce platos y comidas habituales?</span>
                <span class="faq-icon text-slate-400 font-bold text-base">+</span>
              </button>
              <div class="faq-content hidden p-3.5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 font-normal">
                ¡Sí! Nuestra base de datos reconoce platos caseros, ensaladas, carnes, pescados, arroces, legumbres y comidas del día a día con gran precisión.
              </div>
            </div>

            <div class="faq-item bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <button class="faq-btn w-full p-3.5 text-left font-semibold text-xs sm:text-sm text-slate-800 flex justify-between items-center">
                <span>¿Tengo que pesar la comida en una báscula?</span>
                <span class="faq-icon text-slate-400 font-bold text-base">+</span>
              </button>
              <div class="faq-content hidden p-3.5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 font-normal">
                ¡No! El reconocimiento visual estima las raciones automáticamente por foto. También puedes ajustar cantidades con medidas caseras prácticas (cucharadas, piezas, platos llanos).
              </div>
            </div>

            <div class="faq-item bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <button class="faq-btn w-full p-3.5 text-left font-semibold text-xs sm:text-sm text-slate-800 flex justify-between items-center">
                <span>¿Cómo recibo el acceso a la aplicación?</span>
                <span class="faq-icon text-slate-400 font-bold text-base">+</span>
              </button>
              <div class="faq-content hidden p-3.5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 font-normal">
                En cuanto finalices tu suscripción, recibirás las instrucciones y el enlace de acceso directo en tu correo electrónico y por WhatsApp, pudiendo utilizarla de inmediato tanto en móviles Android como en iPhone.
              </div>
            </div>
          </div>
        </div>

        <!-- 7. BOTÃO PRINCIPAL DE COMPRA -->
        <div class="pt-2 space-y-3">
          <a
            href="https://pay.hotmart.com/W107967086M"
            id="btn-final-cta"
            class="btn-nav-yellow w-full py-4.5 px-6 rounded-xl font-extrabold text-base md:text-lg flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.98] transition-all block text-center"
          >
            <span>LIBERAR MI ACCESO A LA APP</span>
            <span class="text-xl font-black leading-none">→</span>
          </a>

          <!-- Selos de Confiança Minimalistas -->
          <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/80 text-[10px] text-slate-500 font-medium text-center">
            <div class="flex flex-col items-center gap-1">
              <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              <span>Garantía de 7 Días</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              <span>Pago Seguro</span>
            </div>
            <div class="flex flex-col items-center gap-1">
              <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <span>Acceso Inmediato</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

// // --- 6. SIMULAÇÕES ANIMADAS (Etapa 12 e 23) ---
let currentSimInterval = null;

function runSimulation(stepNum, nextStepNum) {
  let progress = 0;
  const circle = document.getElementById('sim-circle');
  const percent = document.getElementById('sim-percent');
  const c1 = document.getElementById('sim-check-1');
  const c2 = document.getElementById('sim-check-2');
  const c3 = document.getElementById('sim-check-3');
  const c4 = document.getElementById('sim-check-4');

  if (currentSimInterval) {
    clearInterval(currentSimInterval);
  }

  currentSimInterval = setInterval(() => {
    progress += 2;
    if (progress > 100) progress = 100;

    if (circle) {
      const offset = 390 - (390 * progress) / 100;
      circle.style.strokeDashoffset = offset;
    }
    if (percent) percent.innerText = `${progress}%`;

    // Atualiza checklists com som e cor
    if (progress >= 25 && c1 && !c1.classList.contains('text-emerald-600')) {
      c1.className = 'flex items-center gap-3 text-emerald-600 font-bold transition-all';
      c1.firstElementChild.innerHTML = '✓';
      c1.firstElementChild.className = 'w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs shrink-0';
      sounds.playPop();
    }
    if (progress >= 50 && c2 && !c2.classList.contains('text-emerald-600')) {
      c2.className = 'flex items-center gap-3 text-emerald-600 font-bold transition-all';
      c2.firstElementChild.innerHTML = '✓';
      c2.firstElementChild.className = 'w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs shrink-0';
      sounds.playPop();
    }
    if (progress >= 75 && c3 && !c3.classList.contains('text-emerald-600')) {
      c3.className = 'flex items-center gap-3 text-emerald-600 font-bold transition-all';
      c3.firstElementChild.innerHTML = '✓';
      c3.firstElementChild.className = 'w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs shrink-0';
      sounds.playPop();
    }
    if (progress >= 95 && c4 && !c4.classList.contains('text-emerald-600')) {
      c4.className = 'flex items-center gap-3 text-emerald-600 font-bold transition-all';
      c4.firstElementChild.innerHTML = '✓';
      c4.firstElementChild.className = 'w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs shrink-0';
      sounds.playPop();
    }

    if (progress >= 100) {
      clearInterval(currentSimInterval);
      currentSimInterval = null;
      sounds.playSuccess();
      setTimeout(() => {
        advanceStep(nextStepNum);
      }, 600);
    }
  }, 45);
}

function runFinalSimulation() {
  let progress = 15;
  const bar = document.getElementById('final-progress-bar');
  const percent = document.getElementById('final-percent-text');
  const status = document.getElementById('final-status-text');

  const statuses = [
    { at: 30, text: 'Calibrando lector de platos por foto con Inteligencia Artificial...' },
    { at: 55, text: 'Calculando objetivos de macronutrientes y proteínas diarias...' },
    { at: 80, text: 'Activando recordatorios de hidratación y bonus exclusivos...' },
    { at: 98, text: '¡Aplicación 100% configurada para ti!' }
  ];

  if (currentSimInterval) {
    clearInterval(currentSimInterval);
  }

  currentSimInterval = setInterval(() => {
    progress += 2;
    if (progress > 100) progress = 100;

    if (bar) bar.style.width = `${progress}%`;
    if (percent) percent.innerText = `${progress}%`;

    const currentStatus = statuses.find(s => progress >= s.at && progress < s.at + 25);
    if (currentStatus && status) status.innerText = currentStatus.text;

    if (progress >= 100) {
      clearInterval(currentSimInterval);
      currentSimInterval = null;
      sounds.playSuccess();
      setTimeout(() => {
        advanceStep(24);
      }, 600);
    }
  }, 45);
}

// --- 7. EVENTOS E INTERATIVIDADE ---
function attachStepEvents(step) {
  // Efeito Ripple e acessibilidade por teclado em todos os cards clicáveis
  document.querySelectorAll('.quiz-card').forEach(card => {
    card.addEventListener('click', (e) => {
      createRipple(e, card);
      sounds.playPop();
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });

  // Hero Intro (Etapa 1)
  if (step.type === 'hero_intro') {
    const heroContinueBtn = document.getElementById('btn-hero-continue');
    if (heroContinueBtn) {
      heroContinueBtn.onclick = (e) => {
        if (e) e.preventDefault();
        if (!QuizState.answers[step.key]) {
          const firstCard = document.querySelector('.quiz-card');
          if (firstCard) {
            const val = firstCard.getAttribute('data-value');
            QuizState.answers[step.key] = val;
            QuizState.save();
          }
        }
        sounds.playSuccess();
        advanceStep(2);
      };
    }

    document.querySelectorAll('.quiz-card').forEach(card => {
      card.onclick = (e) => {
        if (e) e.preventDefault();
        const val = card.getAttribute('data-value');
        const key = card.getAttribute('data-key');

        document.querySelectorAll('.quiz-card').forEach(c => {
          c.classList.remove('selected', 'border-[#0d8a6e]', 'ring-2', 'ring-[#0d8a6e]/20', 'bg-[#f0f9f5]/40');
          c.classList.add('border-slate-200/90');
          const radio = c.querySelector('.radio-indicator');
          if (radio) {
            radio.className = 'radio-indicator w-5 h-5 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center shrink-0 transition-colors';
            radio.innerHTML = '';
          }
        });

        card.classList.add('selected', 'border-[#0d8a6e]', 'ring-2', 'ring-[#0d8a6e]/20', 'bg-[#f0f9f5]/40');
        card.classList.remove('border-slate-200/90');
        const activeRadio = card.querySelector('.radio-indicator');
        if (activeRadio) {
          activeRadio.className = 'radio-indicator w-5 h-5 rounded-full border-2 border-[#0d8a6e] bg-[#0d8a6e] flex items-center justify-center shrink-0 transition-colors';
          activeRadio.innerHTML = '<div class="w-2 h-2 rounded-full bg-white"></div>';
        }

        QuizState.answers[key] = val;
        QuizState.save();
        QuizState.logEvent('option_selected', { key, value: val });

        setTimeout(() => {
          advanceStep(2);
        }, 320);
      };
    });
  }

  // Escolha única (Etapas 2, 4, 5, 7, 8, 9, 10, 11, 16, 20, 21, 22)
  if (step.type === 'single') {
    const singleBtn = document.getElementById('btn-single-continue');
    if (singleBtn) {
      singleBtn.onclick = (e) => {
        if (e) e.preventDefault();
        if (!QuizState.answers[step.key]) {
          const firstCard = document.querySelector('.quiz-card');
          if (firstCard) {
            const val = firstCard.getAttribute('data-value');
            QuizState.answers[step.key] = val;
            QuizState.save();
          }
        }
        sounds.playSuccess();
        advanceStep(QuizState.currentStep + 1);
      };
    }

    document.querySelectorAll('.quiz-card').forEach(card => {
      card.onclick = (e) => {
        if (e) e.preventDefault();
        const val = card.getAttribute('data-value');
        const key = card.getAttribute('data-key');

        document.querySelectorAll('.quiz-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        QuizState.answers[key] = val;
        QuizState.save();
        QuizState.logEvent('option_selected', { key, value: val });

        setTimeout(() => {
          advanceStep(QuizState.currentStep + 1);
        }, 220);
      };
    });
  }

  // Múltipla escolha (Etapas 3, 14, 15)
  if (step.type === 'multiple') {
    const continueBtn = document.getElementById('btn-multi-continue');
    const cards = document.querySelectorAll('.multi-option');

    cards.forEach(card => {
      card.onclick = (e) => {
        if (e) e.preventDefault();
        const val = card.getAttribute('data-value');
        const key = card.getAttribute('data-key');
        const isExclusive = card.getAttribute('data-exclusive') === 'true';

        let currentArr = QuizState.answers[key] || [];

        if (isExclusive) {
          // Se clicou na opção exclusiva, desmarca todas as outras
          currentArr = [val];
          cards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        } else {
          // Desmarca opção exclusiva se selecionou outra
          currentArr = currentArr.filter(item => {
            const el = document.querySelector(`.multi-option[data-value="${item}"]`);
            return el && el.getAttribute('data-exclusive') !== 'true';
          });
          const exclEl = document.querySelector('.multi-option[data-exclusive="true"]');
          if (exclEl) exclEl.classList.remove('selected');

          if (currentArr.includes(val)) {
            currentArr = currentArr.filter(item => item !== val);
            card.classList.remove('selected');
          } else {
            currentArr.push(val);
            card.classList.add('selected');
          }
        }

        QuizState.answers[key] = currentArr;
        QuizState.save();

        // Atualiza botão de continuar mantendo o estilo amarelo vibrante
        if (continueBtn) {
          if (currentArr.length > 0) {
            continueBtn.disabled = false;
            continueBtn.classList.remove('disabled');
            if (continueBtn.children && continueBtn.children[1]) {
              continueBtn.children[1].innerText = `${currentArr.length} ${currentArr.length === 1 ? 'seleccionado' : 'seleccionados'}`;
            }
          } else {
            continueBtn.disabled = true;
            continueBtn.classList.add('disabled');
            if (continueBtn.children && continueBtn.children[1]) {
              continueBtn.children[1].innerText = '0 seleccionados';
            }
          }
        }
      };
    });

    if (continueBtn) {
      continueBtn.onclick = (e) => {
        if (e) e.preventDefault();
        handleMultiContinue();
      };
    }
  }

  // Ponte social (Etapa 6)
  const bridgeBtn = document.getElementById('btn-bridge-continue');
  if (bridgeBtn) {
    bridgeBtn.onclick = (e) => {
      if (e) e.preventDefault();
      sounds.playSuccess();
      advanceStep(7);
    };
  }
  const bridgeBox = document.getElementById('bridge-next-box');
  if (bridgeBox) {
    bridgeBox.onclick = (e) => {
      if (e) e.preventDefault();
      sounds.playSuccess();
      advanceStep(7);
    };
    bridgeBox.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        sounds.playSuccess();
        advanceStep(7);
      }
    };
  }

  // Simulação 1 (Etapa 12)
  const sim1Btn = document.getElementById('btn-sim1-continue');
  if (sim1Btn) {
    sim1Btn.onclick = (e) => {
      if (e) e.preventDefault();
      sounds.playSuccess();
      advanceStep(13);
    };
  }

  // Causa raiz / Perfil (Etapa 13)
  const causeBtn = document.getElementById('btn-cause-continue');
  if (causeBtn) {
    causeBtn.onclick = (e) => {
      if (e) e.preventDefault();
      sounds.playSuccess();
      advanceStep(14);
    };
  }
  const causeCallout = document.getElementById('callout-cause-continue');
  if (causeCallout) {
    causeCallout.onclick = (e) => {
      if (e) e.preventDefault();
      sounds.playSuccess();
      advanceStep(14);
    };
    causeCallout.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        sounds.playSuccess();
        advanceStep(14);
      }
    };
  }

  // Ramo de exercícios (Etapa 17)
  if (step.type === 'exercise_branch') {
    const exBtn = document.getElementById('btn-exercise-continue');
    if (exBtn) {
      exBtn.onclick = (e) => {
        if (e) e.preventDefault();
        if (!QuizState.answers.currently_exercises) {
          QuizState.answers.currently_exercises = 'nao';
          QuizState.save();
        }
        sounds.playSuccess();
        advanceStep(18);
      };
    }

    const freqBox = document.getElementById('exercise-frequency-box');
    document.querySelectorAll('.quiz-card').forEach(card => {
      card.onclick = (e) => {
        if (e) e.preventDefault();
        const val = card.getAttribute('data-value');
        QuizState.answers.currently_exercises = val;
        QuizState.save();

        if (val === 'sim') {
          if (freqBox) freqBox.classList.remove('hidden');
        } else {
          setTimeout(() => advanceStep(18), 220);
        }
      };
    });

    document.querySelectorAll('.freq-btn').forEach(btn => {
      btn.onclick = (e) => {
        if (e) e.preventDefault();
        const freq = btn.getAttribute('data-freq');
        selectFrequency(freq);
      };
    });
  }

  // Editorial (Etapa 18)
  const editorialBtn = document.getElementById('btn-editorial-continue');
  if (editorialBtn) {
    editorialBtn.onclick = (e) => {
      if (e) e.preventDefault();
      sounds.playSuccess();
      advanceStep(19);
    };
  }

  // Compatibilidade (Etapa 19)
  const fitBtn = document.getElementById('btn-fit-continue');
  if (fitBtn) {
    fitBtn.onclick = (e) => {
      if (e) e.preventDefault();
      sounds.playSuccess();
      advanceStep(20);
    };
  }

  // Simulação 2 (Etapa 23)
  const sim2Btn = document.getElementById('btn-sim2-continue');
  if (sim2Btn) {
    sim2Btn.onclick = (e) => {
      if (e) e.preventDefault();
      sounds.playSuccess();
      advanceStep(24);
    };
  }

  // Etapa 24: Vídeo e Oferta
  if (step.type === 'offer_and_video') {
    initVideoPlayer();
    initCheckoutTimer();
    initFAQ();

    const skipBtn = document.getElementById('btn-skip-to-offer');
    if (skipBtn) {
      skipBtn.onclick = (e) => {
        if (e) e.preventDefault();
        const offer = document.getElementById('offer-section');
        if (offer) offer.scrollIntoView({ behavior: 'smooth' });
      };
    }

    const ctaBtn = document.getElementById('btn-final-cta');
    if (ctaBtn) {
      ctaBtn.onclick = (e) => {
        try {
          sounds.playFanfare();
          triggerConfetti();
        } catch (err) {}
        QuizTracker.trackCheckoutClick();
        QuizState.logEvent('cta_click', { action: 'checkout_redirect', checkout_url: 'https://pay.hotmart.com/W107967086M' });

        if (e && (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1)) {
          return true;
        }
        if (e) e.preventDefault();
        setTimeout(() => {
          window.location.href = 'https://pay.hotmart.com/W107967086M';
        }, 120);
      };
    }
  }
}

// Navegação entre etapas com proteção contra duplo clique/toque
let isNavigating = false;

function advanceStep(targetStep) {
  if (typeof targetStep !== 'number') targetStep = parseInt(targetStep, 10);
  if (isNaN(targetStep) || targetStep < 1 || targetStep > QuizState.totalSteps) return;
  if (targetStep === QuizState.currentStep) return;
  if (isNavigating) return;

  isNavigating = true;

  if (currentSimInterval) {
    clearInterval(currentSimInterval);
    currentSimInterval = null;
  }

  // RASTREAMENTO DO AVANÇO (DISPARADO ANTES DA MUDANÇA DE ETAPA)
  if (targetStep > QuizState.currentStep) {
    QuizTracker.trackStepCompleted(QuizState.currentStep);
  }

  QuizState.history.push(QuizState.currentStep);
  QuizState.currentStep = targetStep;
  QuizState.save();
  renderStep();

  // Se alcançou a última etapa (24), registrar conclusão do quiz
  if (targetStep === QuizState.totalSteps) {
    QuizTracker.trackQuizCompleted();
  }

  setTimeout(() => {
    isNavigating = false;
  }, 250);
}

function handleMultiContinue() {
  const currentStepData = stepsData[QuizState.currentStep];
  if (!currentStepData) {
    advanceStep(QuizState.currentStep + 1);
    return;
  }
  const key = currentStepData.key;
  let currentArr = QuizState.answers[key] || [];
  if (!Array.isArray(currentArr) || currentArr.length === 0) {
    if (currentStepData.options && currentStepData.options.length > 0) {
      currentArr = [currentStepData.options[0].value];
      QuizState.answers[key] = currentArr;
      QuizState.save();
    }
  }
  sounds.playSuccess();
  advanceStep(QuizState.currentStep + 1);
}

function selectFrequency(freq) {
  QuizState.answers.exercise_frequency = freq;
  QuizState.save();
  sounds.playSuccess();
  advanceStep(18);
}

function goBack() {
  if (isNavigating) return;
  isNavigating = true;

  if (currentSimInterval) {
    clearInterval(currentSimInterval);
    currentSimInterval = null;
  }

  if (QuizState.history.length > 0) {
    const prev = QuizState.history.pop();
    QuizState.currentStep = prev;
    QuizState.save();
    renderStep();
  } else if (QuizState.currentStep > 1) {
    QuizState.currentStep -= 1;
    QuizState.save();
    renderStep();
  }

  setTimeout(() => {
    isNavigating = false;
  }, 250);
}

window.advanceStep = advanceStep;
window.handleMultiContinue = handleMultiContinue;
window.selectFrequency = selectFrequency;
window.goBack = goBack;

// Inicialização e reprodução imediata do Player de Vídeo HTML5 MP4
function initVideoPlayer() {
  QuizState.logEvent('vsl_loaded', { type: 'html5_mp4', file: 'ht8x6quwjd.mp4' });

  const video = document.getElementById('vsl-video-player');
  if (!video) return;

  // Garante mute e playsinline para compatibilidade total com autoplay mobile e desktop
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');

  // Fallback suave entre as fontes caso alguma URL externa oscile
  const backupSources = [
    'https://yourimageshare.com/ib/ht8x6quwjd.mp4',
    'vsl-video.mp4',
    'https://youuimageshare.com/ib/ht8x6quwjd.mp4'
  ];
  let fallbackIdx = 0;

  video.addEventListener('error', () => {
    if (fallbackIdx < backupSources.length) {
      const nextSrc = backupSources[fallbackIdx++];
      if (video.src !== nextSrc) {
        video.src = nextSrc;
        video.load();
        video.play().catch(() => {});
      }
    }
  }, true);

  // Carrega imediatamente o player ao entrar na etapa
  if (typeof video.load === 'function') {
    video.load();
  }

  // Tenta iniciar a reprodução automaticamente
  const startAutoplay = () => {
    if (typeof video.play === 'function') {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Autoplay aguardando interação do usuário:', err);
        });
      }
    }
  };

  startAutoplay();
  setTimeout(startAutoplay, 300);
}

// Contador regressivo da oferta (14:59)
function initCheckoutTimer() {
  let timeLeft = 14 * 60 + 59;
  const timerEl = document.getElementById('checkout-timer');
  if (!timerEl) return;

  const timer = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(timer);
      timeLeft = 0;
    }
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerEl.innerText = `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, 1000);
}

// Acordeão FAQ
function initFAQ() {
  document.querySelectorAll('.faq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('.faq-icon');
      const isHidden = content.classList.contains('hidden');

      // Fecha outros
      document.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
      document.querySelectorAll('.faq-icon').forEach(i => i.innerText = '+');

      if (isHidden) {
        content.classList.remove('hidden');
        if (icon) icon.innerText = '−';
        sounds.playPop();
      }
    });
  });
}

// Notificações sociais ao vivo no rodapé
function initLiveNotification() {
  const notifications = [
    { name: 'Sandra M. (54 años)', city: 'Madrid', action: '¡acaba de registrar su comida con el escáner por foto!' },
    { name: 'Helena R. (61 años)', city: 'Barcelona', action: '¡ha completado su objetivo diario de agua en la app!' },
    { name: 'Carmen F. (58 años)', city: 'Valencia', action: '¡ha perdido sus primeros 4 kg con Calori AI!' },
    { name: 'Teresa C. (52 años)', city: 'Sevilla', action: '¡ha alcanzado su meta diaria de proteínas!' }
  ];

  let index = 0;
  setInterval(() => {
    const item = notifications[index % notifications.length];
    const toast = document.getElementById('live-social-toast');
    if (toast) {
      document.getElementById('toast-user-name').innerText = item.name;
      document.getElementById('toast-user-city').innerText = item.city;
      document.getElementById('toast-user-action').innerText = item.action;

      toast.classList.remove('translate-y-24', 'opacity-0');
      setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
      }, 5000);
    }
    index++;
  }, 16000);
}

// --- 8. INICIALIZAÇÃO GERAL AO CARREGAR A PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
  QuizState.load();

  // Botão de som
  const soundBtn = document.getElementById('sound-toggle-btn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      sounds.toggle();
    });
  }

  // Botão Voltar
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      sounds.playPop();
      goBack();
    });
  }

  // Botão Reiniciar Quiz
  const resetBtn = document.getElementById('reset-quiz-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('¿Deseas reiniciar el cuestionario desde el principio?')) {
        QuizState.reset();
      }
    });
  }

  // Inicializa sistema de rastreamento do funil e dispara quiz_started
  QuizTracker.init();
  QuizTracker.trackQuizStarted(QuizState.currentStep);

  // Renderiza etapa inicial
  renderStep();

  // Inicia notificações de prova social ao vivo
  initLiveNotification();
});

// Exposição global para debug, modais e integrações
if (typeof window !== 'undefined') {
  window.QuizState = QuizState;
  window.QuizTracker = QuizTracker;
}
