import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// AI High Thinking Endpoint for Al-Aseel Consultant
app.post('/api/gemini/thinking-consultant', async (req, res) => {
  try {
    const { prompt, mode = 'event_planner', details = {} } = req.body;

    if (!prompt && !details.guestsCount) {
      return res.status(400).json({ error: 'يرجى تقديم تفاصيل أو استفسار للبدء' });
    }

    if (!ai) {
      // Return comprehensive, highly realistic local calculation and advice
      const fallbackResponse = generateLocalConsultantAdvice(prompt, mode, details);
      return res.json({
        success: true,
        text: fallbackResponse,
        model: 'local-expert-sohag-engine',
        thinkingLevel: 'HIGH_FALLBACK',
      });
    }

    const systemInstruction = `أنت "مستشار حلواني الأصيل بسوهاج الفائق والمستشار المالي للمشروعات والحلويات في صعيد مصر".
تستخدم التفكير العميق والحسابات الهندسية الدقيقة لتقديم أفضل النصائح والتقديرات لأهل محافظة سوهاج والصعيد.
خبرتك تمتد لأكثر من 20 عاماً في:
1. تخطيط وضيافة المناسبات الكبرى (أفراح سوهاج، العزومات العائلية، ليالي المولد، مواسم الأعياد، مؤتمرات الشركات) وحساب الكميات بالجرام والقطعة وتوزيع الأصناف بين الشرقي (بسبوسة بالسمن البلدي، كنافة، بقلاوة، بسبوسة مكسرات) والغربي (جاتوه سوبريه، تورت، ساليزونات) والمخبوزات.
2. التقييم المالي ودراسات الجدوى لتأسيس وتطوير منصات ومحلات الحلويات في مصر وسوهاج (تكاليف التطوير البرمجي، أجهزة الكاشير والـ POS، خطوط الإنتاج، التوصيل، وحساب هوامش الربح ونقاط التعادل بالجنيه المصري EGP).
3. تقديم اقتراحات محسوبة وواضحة جداً بالأرقام والجنيه المصري، بلغة راقية تجمع بين الاحترافية الفندقية وروح الكرم السوهاجي الأصيل.

قواعد الإجابة:
- قسّم إجابتك بطريقة احترافية:
  1. تحليل الطلب والميزانية
  2. التوصيات التفصيلية بالكميات والأسعار التقديرية بالجنيه المصري (EGP)
  3. جدول الأصناف المقترحة (الشرقي والغربي)
  4. نصائح ذهبية لضمان الطزاجة والتقديم المشرف.
- اذكر فروع حلواني الأصيل بسوهاج (فرع شارع الجمهورية بجوار الجامعة القديمة، وفرع طريق أسيوط أمام مجمع المدارس).`;

    const userMessage = `طلب المستخدم:
النوع: ${mode}
التفاصيل المدخلة: ${JSON.stringify(details, null, 2)}
الاستفسار أو الملاحظة الإضافية: ${prompt || 'احسب التشكيلة والكمية والميزانية المثالية'}`;

    // Call Gemini 3.1 Pro Preview with HIGH thinking mode as required
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: userMessage,
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
      },
    });

    const responseText = response.text || 'عذراً، لم نتمكن من الحصول على رد مفصل حالياً.';

    res.json({
      success: true,
      text: responseText,
      model: 'gemini-3.1-pro-preview',
      thinkingLevel: 'HIGH',
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    // Graceful fallback to rich expert calculator
    const fallbackResponse = generateLocalConsultantAdvice(
      req.body.prompt || '',
      req.body.mode || 'event_planner',
      req.body.details || {}
    );
    res.json({
      success: true,
      text: fallbackResponse,
      model: 'local-expert-sohag-engine',
      notice: 'تم تقديم الاستشارة عبر المحرك الحسابي المتخصص لحلواني الأصيل بسوهاج',
    });
  }
});

// Fallback Expert Calculation Engine tailored for Sohag market
function generateLocalConsultantAdvice(prompt: string, mode: string, details: any): string {
  const guests = Number(details?.guestsCount) || 50;
  const budget = Number(details?.budget) || 0;
  const eventType = details?.eventType || 'مناسبة عائلية';

  if (mode === 'market_feasibility') {
    return `### 📊 دراسة الجدوى والتقدير المالي الاستشاري لحلواني ومتاجر الحلويات بسوهاج

بناءً على واقع السوق المصري بمحافظة سوهاج لعام 2026:

1. **تكاليف البنية الرقمية والتطبيق (Digital Stack):**
   - منصة متجر متكاملة وسلة واتساب سريعة: 22,000 - 38,000 ج.م
   - نظام ربط الفروع ونقاط البيع السحابية (POS): 15,000 - 25,000 ج.م
   - استضافة سحابية سنوية مع سيرفرات فائقة السرعة ونطاق SSL: 4,500 - 7,000 ج.م سنوياً.

2. **التكاليف التشغيلية للمعدات والخامات (فرع سوهاج):**
   - أفران كونفكشن حلواني إيطالي 4-6 صواني: 120,000 - 190,000 ج.م
   - عجانات ومضارب ومفردات عجين هيدروليكية: 85,000 - 140,000 ج.م
   - ثلاجات عرض ستانلس ستيل تبريد إيطالي للجاتوه والتورت: 90,000 - 160,000 ج.م
   - صواني نحاس ورخام ومعدات الشيرة والسمن البلدي: 35,000 ج.م

3. **معدلات استهلاك السمن البلدي والخامات الأولية:**
   - السمن البلدي الطبيعي (جاموسي/بقري صعيدي): يمثل 28% إلى 34% من تكلفة إنتاج الشرقي الفاخر.
   - المكسرات الفاخرة (فستق حلبي، لوز، بندق إيطالي): تمثل 22% إلى 28%.

4. **نقطة التعادل وهوامش الربح المتوقعة:**
   - هامش الربح الإجمالي على الحلويات الشرقية الفاخرة: 42% - 48%.
   - هامش الربح الإجمالي على التورت والجاتوه الغربي: 50% - 58%.
   - فترة استرداد رأس المال التشغيلي المقدرة: 14 إلى 18 شهراً مع خطة تسويقية نشطة بسوهاج والمراكز المجاورة (أخميم، المراغة، المنشأة، طهطا).`;
  }

  // Event Planner calculation
  const gramsPerGuest = 160; // 160g of mixed sweets per person average
  const totalKilos = ((guests * gramsPerGuest) / 1000).toFixed(1);
  const easternKilos = (Number(totalKilos) * 0.65).toFixed(1);
  const westernPieces = Math.ceil(guests * 1.25);
  const estimatedCost = Math.round(Number(totalKilos) * 230);

  return `### 👑 توصية مستشار "حلواني الأصيل بسوهاج" لضيافة ${eventType} (${guests} ضيف)

مرحباً بك! لتقديم ضيافة تليق بك وبضيوفك الكرام في سوهاج وتعكس كرم الضيافة وأصالة السمن البلدي:

1. **الكميات الإجمالية الموصى بها علمياً وعملياً:**
   - **إجمالي الحلويات الشرقية:** حوالي **${easternKilos} كجم** مشكل فاخر.
   - **إجمالي الحلويات الغربية والجاتوه:** حوالي **${westernPieces} قطعة** سوبريه وسواريه فاخر.
   - **معدل الضيافة المحسوب:** 150 - 180 جرام لكل ضيف (وهي الحصة الكريمة المعتمدة لأفراح وعزومات سوهاج).

2. **التشكيلة الملكية المقترحة من الأصيل:**
   - **بسبوسة الأصيل بالسمن البلدي الصافي ومكسرات البندق:** 35% من الكمية الشرقية.
   - **كنافة أساور بالفستق الحلبي ونابلسية بالقشطة الطازجة:** 35% من الكمية.
   - **مشكل بقلاوة إسطنبولي وأصابع لوتس وبورما:** 30% من الكمية.
   - **ميني جاتوه متنوع (شوكولاتة روشيه، لوتس، ريد فيلفيت، تشيز كيك توت):** ${westernPieces} قطعة.

3. **التكلفة التقديرية بالجنيه المصري:**
   - التكلفة التقديرية: **حوالي ${estimatedCost.toLocaleString()} - ${(estimatedCost * 1.15).toFixed(0).toLocaleString()} ج.م**
   ${budget ? `- الميزانية المحددة من طرفكم (${budget.toLocaleString()} ج.م): ${budget >= estimatedCost ? '✅ تكفي بامتياز وتغطي أجود أنواع المكسرات والسمن البلدي الملكي!' : '💡 تكفي مع تنسيق باقة اقتصادية مميزة تجمع بين البسبوسة السادة ومكسرات الفول السوداني المحمص والكنافة العسلية.'}` : ''}

4. **نصيحة الأصيل الذهبية لخدمة ضيوفك:**
   - يُفضل استلام طلبيات الأفراح قبل موعد التقديم بساعتين كحد أقصى للحفاظ على قرمشة الجلاش وبرودة الجاتوه.
   - التوصيل مجاني للكميات الكبيرة إلى قاعات أفراح سوهاج والنوادي (شارع الجمهورية وكورنيش النيل).`;
}

// Development and Production setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
