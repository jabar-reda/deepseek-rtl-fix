// ==UserScript==
// @name         DeepSeek RTL Fix - لا وميض
// @namespace    http://tampermonkey.net/
// @version      4.1
// @description  يضبط اتجاه النصوص العربية في DeepSeek فور ظهورها، بدون أي اهتزاز أو انقلاب مزعج
// @author       أنت
// @license      MIT
// @match        https://chat.deepseek.com/*
// @match        https://deepseek.com/*
// @icon         data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2310a37f'/><text x='50' y='68' font-size='45' text-anchor='middle' fill='white' font-weight='bold' font-family='Arial'>ع</text></svg>
// @icon64       data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2310a37f'/><text x='50' y='68' font-size='45' text-anchor='middle' fill='white' font-weight='bold' font-family='Arial'>ع</text></svg>
// @grant        none
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
        if (element.closest('code, pre, .code-block, .hljs')) {
            // نجبر الكود على الاتجاه اليساري حتى لا ينقلب
            element.setAttribute('dir', 'ltr');
            element.style.unicodeBidi = 'embed';
            return;
        }

        // 1.2 نتجاوز العناصر التي تحتوي على أيقونات أو أزرار (حتى لا نؤثر عليها)
        if (element.querySelector('svg, img, button')) {
            return;
        }

        // 1.3 نتجاوز الحاويات المرنة (Flex/Grid) لأن تغيير اتجاهها يقلب المحتويات
        const computedDisplay = window.getComputedStyle(element).display;
        const flexOrGrid = ['flex', 'grid', 'inline-flex', 'inline-grid'];
        if (flexOrGrid.includes(computedDisplay)) {
            return;
        }

        // ----- الخطوة 2: تحليل النص واتخاذ القرار -----

        const textContent = element.textContent || '';
        // إذا لم يكن هناك نص عربي، لا داعي للمعالجة
        if (!containsArabic(textContent)) {
            return;
        }

        // نحسب النسبة لنعرف إذا كان النص عربياً في الغالب أم لا
        const ratio = calculateArabicRatio(textContent);

        // نختار الاتجاه المناسب
        if (ratio > 0.5) {
            // أكثر من 50% عربية => اتجاه RTL صريح
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
     * الدالة الرئيسية التي تمسح الصفحة وتُصلح جميع النصوص المستهدفة.
     * - تبحث عن حاويات المحادثة المعروفة في DeepSeek.
     * - تُعالج العناصر النصية داخلها (فقرات، عناوين، قوائم، إلخ).
     * - تُعالج النص المباشر (بدون وسوم) داخل الحاويات.
     * - تُجبر عناصر الكود البرمجي على الاتجاه اليساري.
     */
    function fixPageContent() {
        // قائمة المحددات التي تحتوي على نصوص المحادثة في DeepSeek
        // (تم جمعها من هيكل الصفحة الحالي)
        const chatContainerSelectors = [
            '.ds-markdown',
            '.markdown-body',
            '.message-content',
            '[class*="message"] > div',
            '[class*="chat"] .prose'
        ];
        const containers = document.querySelectorAll(chatContainerSelectors.join(','));

        // نتعامل مع كل حاوية على حدة
        containers.forEach((container) => {
            // نتأكد أن الحاوية نفسها ليست جزءاً من كود برمجي
            if (container.closest('code, pre')) {
                return;
            }

            // --- 1. نعالج العناصر النصية الصريحة داخل الحاوية ---
            const textElementSelectors = [
                'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'span:not([class*="icon"]):not([class*="btn"])',
                'div:not([class*="flex"]):not([class*="grid"]):not([class*="icon"])'
            ];
            const targetElements = container.querySelectorAll(textElementSelectors.join(','));
            targetElements.forEach(applyFixToElement);

            // --- 2. نعالج النص المباشر (غير المغلف) داخل الحاوية ---
            // نفحص العقد النصية المباشرة (Text Nodes) التي هي أبناء مباشرون للحاوية
            const childNodes = container.childNodes;
            let hasDirectArabicText = false;
            childNodes.forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE && containsArabic(node.textContent)) {
                    hasDirectArabicText = true;
                }
            });

            // إذا وجدنا نصاً عربياً مباشراً، نطبق الإصلاح على الحاوية نفسها (مع الحرص)
            if (hasDirectArabicText && !container.closest('code, pre')) {
                const containerDisplay = window.getComputedStyle(container).display;
                // نتجنب الحاويات المرنة كما في السابق
                if (!['flex', 'grid', 'inline-flex', 'inline-grid'].includes(containerDisplay)) {
                    const text = container.textContent;
                    const ratio = calculateArabicRatio(text);
                    container.setAttribute('dir', ratio > 0.5 ? 'rtl' : 'auto');
                    container.style.unicodeBidi = 'isolate';
                }
            }
        });

        // --- 3. نُجبر كل عناصر الكود البرمجي على الاتجاه اليساري (لأمان) ---
        const codeElements = document.querySelectorAll('code, pre, .code-block, .hljs');
        codeElements.forEach((el) => {
            el.setAttribute('dir', 'ltr');
            el.style.unicodeBidi = 'embed';
        });
    }

    // --------------------- استراتيجية منع الوميض ---------------------

    /**
     * نستخدم مجموعة من التقنيات لضمان أن النصوص تظهر بالاتجاه الصحيح
     * منذ اللحظة الأولى، دون أن ينقلب النص أمام عين المستخدم.
     * 
     * 1. ننفذ المعالجة فور أن يصبح هيكل الصفحة (DOM) جاهزاً، وقبل أن
     *    يرسم المتصفح أي شيء (DOMContentLoaded).
     * 2. نراقب أي تغييرات تحدث في الصفحة (إضافة رسائل جديدة) باستخدام
     *    MutationObserver، وننفذ المعالجة في الإطار التالي (requestAnimationFrame)
     *    لضمان أن التغيير يحدث قبل الرسم.
     * 3. ننفذ معالجة إضافية بعد تحميل الصفحة بالكامل (load) للتأكد.
     */

    // الخطوة 1: نعالج فور جاهزية DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            fixPageContent();
        });
    } else {
        // إذا كان DOM قد أصبح جاهزاً بالفعل، ننفذ فوراً
        fixPageContent();
    }

    // الخطوة 2: مراقب التغييرات الديناميكية
    const observer = new MutationObserver((mutationsList) => {
        // نتحقق مما إذا كانت هناك أي تغييرات تستدعي المعالجة
        let shouldProcess = false;
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                shouldProcess = true;
                break;
            }
            if (mutation.type === 'characterData') {
                shouldProcess = true;
                break;
            }
        }

        if (shouldProcess) {
            // نستخدم requestAnimationFrame لتكون المعالجة قبل الرسم التالي
            requestAnimationFrame(() => {
                fixPageContent();
            });
        }
    });

    // نبدأ المراقبة على مستوى المستند بالكامل (لنفوت أي عقدة جديدة)
    observer.observe(document.documentElement || document.body, {
        childList: true,      // نراقب إضافة/حذف العناصر
        subtree: true,        // نراقب جميع المستويات الداخلية
        characterData: true   // نراقب تغيير النص داخل العناصر
    });

    // الخطوة 3: معالجة إضافية بعد اكتمال تحميل كل شيء (للتأكيد)
    window.addEventListener('load', () => {
        // نؤجلها قليلاً لضمان أن كل شيء قد استقر
        setTimeout(fixPageContent, 200);
    });

    // نُعلم المستخدم بأن السكربت يعمل (في وحدة التحكم)
    console.log('✅ DeepSeek RTL Fix (الإصدار الاحترافي) يعمل الآن بسلاسة.');
})();
