# DeepSeek RTL Fix

سكربت [Tampermonkey](https://www.tampermonkey.net/) يُصلح اتجاه النصوص العربية في موقع DeepSeek فور ظهورها — من اليمين لليسار، بدون وميض أو انقلاب مزعج.

![Version](https://img.shields.io/badge/version-4.3-4D6BFE)
![License](https://img.shields.io/github/license/jabar-reda/deepseek-rtl-fix)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-compatible-ff6a00?logo=tampermonkey&logoColor=white)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

## المميزات

- **فوري وبدون وميض** — يعمل من `document-start` قبل أن يرسم المتصفح الصفحة.
- **ذكي** — يحسب نسبة الأحرف العربية ويختار `dir="rtl"` أو `dir="auto"` تلقائياً.
- **آمن على الكود** — الأكواد البرمجية تبقى يساراً (`ltr`) مهما كان محتواها.
- **آمن على التخطيط** — يتجاهل حاويات Flex وGrid والأيقونات والأزرار فلا يعكسها.
- **خفيف** — يعالج الحاويات المتغيّرة فقط بدل مسح الصفحة كاملة مع كل تغيير.
- **يتابع المحادثة** — يراقب الرسائل الجديدة ويصلحها قبل الرسم التالي.

## التثبيت

1. ثبّت إضافة [Tampermonkey](https://www.tampermonkey.net/).
2. افتح [ملف السكربت](https://raw.githubusercontent.com/jabar-reda/deepseek-rtl-fix/main/deepseek-rtl-fix.user.js).
3. اضغط **Install** في صفحة التثبيت.

## كيف يعمل؟

1. يمسح حاويات المحادثة (`.ds-markdown`، `.markdown-body`، وغيرها).
2. لكل عنصر نصي يحسب نسبة الأحرف العربية بعد استبعاد الأكواد البرمجية.
3. يطبّق `dir="rtl"` إذا كانت العربية هي الغالب، أو `dir="auto"` للنصوص المختلطة، مع عزل النص بـ `unicode-bidi: isolate`.
4. يعيد المعالجة عبر `MutationObserver` عند أي رسالة جديدة — لكن على الحاوية المتغيّرة فقط.

## المساهمة

نرحّب بالمساهمات واقتراحات التحسين عبر [Issues](https://github.com/jabar-reda/deepseek-rtl-fix/issues) وطلبات السحب.

- تقسيم كل تغيير في فرع خاص به وطلب سحب واحد لكل فكرة.
- رسائل الالتزامات تتبع [Conventional Commits](https://www.conventionalcommits.org/).

## الترخيص

هذا المشروع مرخص بموجب [رخصة MIT](LICENSE).
