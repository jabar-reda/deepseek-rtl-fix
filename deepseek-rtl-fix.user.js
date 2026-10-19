// ==UserScript==
// @name         DeepSeek RTL Fix - لا وميض
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  يضبط اتجاه النصوص العربية في DeepSeek فور ظهورها، بدون أي اهتزاز أو انقلاب مزعج
// @author       jabar-reda
// @license      MIT
// @match        https://chat.deepseek.com/*
// @match        https://deepseek.com/*
// @icon         data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%234D6BFE'/><text x='50' y='68' font-size='45' text-anchor='middle' fill='white' font-weight='bold' font-family='Arial'>ع</text></svg>
// @icon64       data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%234D6BFE'/><text x='50' y='68' font-size='45' text-anchor='middle' fill='white' font-weight='bold' font-family='Arial'>ع</text></svg>
// @grant        none
// @run-at       document-start
// ==/UserScript==


/**
 * ==================================================================
 *  DeepSeek RTL Fix
 *  ---------------- 
 *  سكربت خفيف يُصلح تلقائياً اتجاه النصوص العربية في محادثات DeepSeek،
 *  بحيث تظهر من اليمين لليسار فوراً، دون حدوث أي وميض أو تشويش على الأيقونات
 *  أو الكود البرمجي.
 *
 *  يعتمد على خوارزمية بسيطة تحسب نسبة الأحرف العربية في النص،
 *  وتُطبق السمة المناسبة (dir="rtl" أو dir="auto") مع الحفاظ على
 *  استقرار باقي عناصر الصفحة.
 * ==================================================================
 */

(function () {
    'use strict';

    // --------------------- الثوابت ---------------------

    // محددات حاويات المحادثة في DeepSeek (مجمّعة من هيكل الصفحة الحالي)
    const CHAT_CONTAINER_SELECTORS = [
        '.ds-markdown',
        '.markdown-body',
        '.message-content',
        '[class*="message"] > div',
        '[class*="chat"] .prose'
    ].join(',');

    // محددات عناصر الكود البرمجي — تُجبر على الاتجاه اليساري دائماً
    const CODE_SELECTOR = 'code, pre, .code-block, .hljs';

    // عناصر لا يجوز تغيير اتجاهها (أيقونات وأزرار) لأن التغيير يكسر شكلها
    const UNTOUCHABLE_SELECTOR = 'svg, img, button';

    // التخطيطات التي يقلب تغيير اتجاهها ترتيب عناصرها، فنتركها وشأنها
    const FLEX_GRID_DISPLAYS = ['flex', 'grid', 'inline-flex', 'inline-grid'];

    // نسبة الأحرف العربية التي يجب تجاوزها لاختيار اتجاه rtl صريحاً
    const RTL_RATIO_THRESHOLD = 0.5;

    // العناصر النصية التي نفحصها داخل كل حاوية محادثة
    const TEXT_ELEMENT_SELECTORS = [
        'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'span', 'div'
    ].join(',');

    // --------------------- الأدوات المساعدة ---------------------

    /**
     * تتحقق مما إذا كان النص يحتوي على حرف عربي واحد على الأقل.
     * @param {string} text - النص المراد فحصه
     * @returns {boolean} - true إذا وجد حرف عربي، وإلا false
     */
    function containsArabic(text) {
        return /[\u0600-\u06FF]/.test(text);
    }

    /**
     * تحسب نسبة الأحرف العربية إلى إجمالي الأحرف (بدون مسافات).
     * تُستخدم لتحديد الاتجاه الأنسب في النصوص المختلطة.
     * @param {string} text - النص المراد تحليله
     * @returns {number} - نسبة مئوية (0 إلى 1)
     */
    function calculateArabicRatio(text) {
        // نستخرج جميع الأحرف العربية
        const arabicChars = text.match(/[\u0600-\u06FF]/g) || [];
        // نحسب عدد الأحرف الكلي بعد إزالة المسافات (لتجنب تضخيم النسبة)
        const totalNonSpaceChars = text.replace(/\s/g, '').length || 1;
        return arabicChars.length / totalNonSpaceChars;
    }

    /**
     * تُخرج نص العنصر كاملاً بعد إزالة أكواده البرمجية،
     * حتى لا يشوّه الكود الطويل نسبة الأحرف العربية ويخدع قاعدة الاتجاه.
     * @param {HTMLElement} element - العنصر المراد قياس نصه
     * @returns {string} - النص بدون أي كود برمجي
     */
    function getTextWithoutCode(element) {
        const clone = element.cloneNode(true);
        clone.querySelectorAll(CODE_SELECTOR).forEach((node) => node.remove());
        return clone.textContent || '';
    }

    /**
     * تتحقق مما إذا كان العنصر يستخدم تخطيط Flex أو Grid
     * (تغيير اتجاه هذه الحاويات يقلب محتوياتها رأسياً).
     * @param {HTMLElement} element - العنصر المراد فحصه
     * @returns {boolean}
     */
    function isFlexOrGrid(element) {
        const computedDisplay = window.getComputedStyle(element).display;
        return FLEX_GRID_DISPLAYS.includes(computedDisplay);
    }

    /**
     * تجبر عنصراً على الاتجاه اليساري (للكود البرمجي مثلاً).
     * @param {HTMLElement} element - العنصر المقصود
     */
    function forceLtr(element) {
        element.setAttribute('dir', 'ltr');
        element.style.unicodeBidi = 'embed';
    }

    // --------------------- منطق الإصلاح الأساسي ---------------------

    /**
     * تُطبّق الإصلاحات المناسبة على عنصر معين بناءً على محتواه النصي.
     * - تتجاهل العناصر التي تحتوي على أكواد برمجية، أيقونات، أو أزرار.
     * - تتجاهل الحاويات التي تستخدم Flexbox أو Grid حتى لا نعطل التخطيط.
     * - تحدد الاتجاه (rtl أو auto) بناءً على نسبة الأحرف العربية.
     * @param {HTMLElement} element - العنصر المراد معالجته
     */
    function applyFixToElement(element) {
        // ----- الخطوة 1: استبعاد العناصر غير المرغوب فيها -----

        // 1.1 نتأكد أن العنصر ليس جزءاً من كود برمجي
        if (element.closest(CODE_SELECTOR)) {
            forceLtr(element);
            return;
        }

        // 1.2 نتجاوز العناصر التي تحتوي على أيقونات أو أزرار (حتى لا نؤثر عليها)
        if (element.querySelector(UNTOUCHABLE_SELECTOR)) {
            return;
        }

        // 1.3 نتجاوز الحاويات المرنة (Flex/Grid) لأن تغيير اتجاهها يقلب المحتويات
        // (نعتمد على التخطيط المحسوب فعلياً، لا على أسماء الكلاسات لأنها تكذب)
        if (isFlexOrGrid(element)) {
            return;
        }

        // ----- الخطوة 2: تحليل النص واتخاذ القرار -----

        // نقيس النص بدون الأكواد البرمجية حتى لا يشوّه الكود القراءة
        const textContent = getTextWithoutCode(element);
        // إذا لم يكن هناك نص عربي، لا داعي للمعالجة
        if (!containsArabic(textContent)) {
            return;
        }

        // نحسب النسبة لنعرف إذا كان النص عربياً في الغالب أم لا
        const ratio = calculateArabicRatio(textContent);

        // نختار الاتجاه المناسب
        if (ratio > RTL_RATIO_THRESHOLD) {
            // أكثر من النصف عربية => اتجاه RTL صريح
            element.setAttribute('dir', 'rtl');
        } else {
            // النص مختلط بكثرة (أرقام أو إنجليزي) => نترك المتصفح يختار تلقائياً
            element.setAttribute('dir', 'auto');
        }

        // نعزل النص عن باقي العناصر المجاورة (لتحسين التعامل مع النصوص المختلطة)
        element.style.unicodeBidi = 'isolate';
    }

    // --------------------- معالجة الصفحة ---------------------

    /**
     * يعالج حاوية محادثة واحدة: عناصرها النصية، نصوصها المباشرة،
     * وأكوادها البرمجية داخلها.
     * @param {HTMLElement} container - حاوية المحادثة المراد معالجتها
     */
    function fixContainer(container) {
        // نتأكد أن الحاوية نفسها ليست جزءاً من كود برمجي
        if (container.closest(CODE_SELECTOR)) {
            return;
        }

        // --- 1. نعالج العناصر النصية الصريحة داخل الحاوية ---
        const targetElements = container.querySelectorAll(TEXT_ELEMENT_SELECTORS);
        targetElements.forEach(applyFixToElement);

        // --- 2. نعالج النص المباشر (غير المغلف) داخل الحاوية ---
        const childNodes = container.childNodes;
        let hasDirectArabicText = false;
        childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE && containsArabic(node.textContent)) {
                hasDirectArabicText = true;
            }
        });

        // إذا وجدنا نصاً عربياً مباشراً، نطبق الإصلاح على الحاوية نفسها (مع الحرص)
        if (hasDirectArabicText && !isFlexOrGrid(container)) {
            const text = getTextWithoutCode(container);
            const ratio = calculateArabicRatio(text);
            container.setAttribute('dir', ratio > RTL_RATIO_THRESHOLD ? 'rtl' : 'auto');
            container.style.unicodeBidi = 'isolate';
        }

        // --- 3. نُجبر أكواد الكود البرمجي داخل الحاوية على الاتجاه اليساري ---
        container.querySelectorAll(CODE_SELECTOR).forEach(forceLtr);
    }

    /**
     * الدالة الرئيسية التي تمسح الصفحة كاملة وتُصلح جميع النصوص.
     * تُستخدم عند أول تشغيل وبعد اكتمال تحميل الصفحة؛
     * أما التحديثات اللاحقة فتمر عبر المراقب بعدة حاويات فقط (أسرع).
     */
    function fixPageContent() {
        document.querySelectorAll(CHAT_CONTAINER_SELECTORS).forEach(fixContainer);
        // نجبر كل عناصر الكود البرمجي في الصفحة على الاتجاه اليساري (لأمان)
        document.querySelectorAll(CODE_SELECTOR).forEach(forceLtr);
    }

    // --------------------- استراتيجية منع الوميض ---------------------

    /**
     * بدلاً من مسح الصفحة كاملة مع كل تغيير صغير (حتى حرف واحد)،
     * نجمع الحاويات المتأثرة في مجموعة واحدة، ثم نعالجها مرة واحدة
     * في الإطار التالي (requestAnimationFrame) قبل أن يرسم المتصفح.
     * والعلامة isFrameScheduled تمنع تعدد الجدولة في نفس الإطار.
     */
    const pendingContainers = new Set();
    let hasPendingCode = false;
    let isFrameScheduled = false;

    /**
     * تحدد الحاويات التي تأثرت بتغيير في DOM وتضيفها إلى قائمة الانتظار.
     * @param {Node} node - العقدة المتغيّرة (عنصر أو عقدة نصية)
     */
    function scheduleFixForNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) {
            return;
        }

        // العقدة النصية نعود لأبها للوصول إلى الحاوية
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!element) return;

        // الحاوية التي ينتمي إليها العنصر (أو العنصر نفسه إن كان حاوية)
        const ownContainer = element.closest(CHAT_CONTAINER_SELECTORS);
        if (ownContainer) {
            pendingContainers.add(ownContainer);
        }

        // العنصر قد يحتوي على حاويات جديدة أُضيفت دفعة واحدة
        // (مثال: رسالة محادثة كاملة تدخل الصفحة في عقدة واحدة)
        element.querySelectorAll(CHAT_CONTAINER_SELECTORS).forEach((container) => {
            pendingContainers.add(container);
        });

        // كود برمجي خارج المحادثة (مثل محرر الإدخال) يحتاج فرض الاتجاه اليساري
        if (!ownContainer && element.closest(CODE_SELECTOR)) {
            hasPendingCode = true;
        }
    }

    /**
     * تُنفّذ كل الإصلاحات المتأخرة مرة واحدة ثم تُفرغ قائمة الانتظار.
     */
    function processPendingFixes() {
        isFrameScheduled = false;
        const containers = Array.from(pendingContainers);
        pendingContainers.clear();
        containers.forEach(fixContainer);

        if (hasPendingCode) {
            hasPendingCode = false;
            document.querySelectorAll(CODE_SELECTOR).forEach(forceLtr);
        }
    }

    /**
     * تجدول معالجة في الإطار التالي إن لم تكن هناك معالجة مجدولة بالفعل.
     */
    function scheduleFrame() {
        if (isFrameScheduled) return;
        isFrameScheduled = true;
        requestAnimationFrame(processPendingFixes);
    }

    /**
     * يحول عقدة DOM متأثرة إلى حاويات محادثة ويجدول معالجتها.
     * @param {Node} node - العقدة المتغيّرة
     */
    function scheduleFixForNodeAndUpdateFrame(node) {
        scheduleFixForNode(node);
        if (pendingContainers.size > 0 || hasPendingCode) {
            scheduleFrame();
        }
    }

    // الخطوة 1: نعالج فور جاهزية DOM (ونبدأ من document-start حتى نسبق أول رسم)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            fixPageContent();
        });
    } else {
        // إذا كان DOM قد أصبح جاهزاً بالفعل، ننفذ فوراً
        fixPageContent();
    }

    // الخطوة 2: مراقب التغييرات الديناميكية
    // نراقب على مستوى document (وليس documentElement) لأن السكربت
    // يعمل عند document-start وقد لا يكون documentElement جاهزاً بعد
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'characterData') {
                scheduleFixForNodeAndUpdateFrame(mutation.target);
            } else if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(scheduleFixForNodeAndUpdateFrame);
            }
        }
    });

    observer.observe(document, {
        childList: true,      // نراقب إضافة العناصر
        subtree: true,        // نراقب جميع المستويات الداخلية
        characterData: true   // نراقب تغيير النص داخل العناصر
    });

    // الخطوة 3: معالجة إضافية بعد اكتمال تحميل كل شيء (للتأكيد)
    window.addEventListener('load', () => {
        // نؤجلها قليلاً لضمان أن كل شيء قد استقر
        setTimeout(fixPageContent, 200);
    });

    // نُعلم المستخدم بأن السكربت يعمل (في وحدة التحكم)
    console.log('✅ DeepSeek RTL Fix v4.2 يعمل الآن بسلاسة.');
})();
